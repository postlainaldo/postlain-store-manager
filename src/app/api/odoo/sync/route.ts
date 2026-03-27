import { NextRequest, NextResponse } from "next/server";
import { fetchOdooProducts, testOdooConnection } from "@/lib/odoo";
import { dbBulkUpsertProducts, dbDeleteAllProducts } from "@/lib/dbAdapter";
import type { DBProduct } from "@/lib/dbAdapter";
import { MC_MAP } from "@/lib/categoryMapping";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Odoo name parser ─────────────────────────────────────────────────────────
//
// Odoo product name format examples:
//   "[747544361470] ETIENE (MC14003) SS26 (6-)"   → barcode, name, mc, season, size
//   "NATHANIEL (MC14021) FW25"                     → name, mc, season (no barcode, no size)
//   "REGEAN (MC14064) FW25"
//
// Pattern: optional [barcode]  PRODUCTNAME  (MCxxxxx)  SEASON  optional (size)

interface ParsedOdooName {
  cleanName: string;   // Just the product name e.g. "ETIENE"
  mc: string | null;   // e.g. "MC14003"
  season: string | null; // e.g. "SS26", "FW25"
  size: string | null;   // e.g. "6-", "38", "M"
}

function parseOdooName(raw: string): ParsedOdooName {
  const s = raw.trim();
  // Remove leading [barcode]
  const withoutBarcode = s.replace(/^\[\d+\]\s*/, "");
  // Match: NAME (MCxxxxx) SEASON optional (size)
  const m = withoutBarcode.match(
    /^(.+?)\s+\(MC(\d+)\)\s+([A-Z]{2}\d{2})(?:\s+\(([^)]+)\))?/
  );
  if (m) {
    return {
      cleanName: m[1].trim(),
      mc: `MC${m[2]}`,
      season: m[3],
      size: m[4] ?? null,
    };
  }
  // Fallback: no MC in name
  return { cleanName: withoutBarcode.trim(), mc: null, season: null, size: null };
}

// ─── Color extraction from barcode ────────────────────────────────────────────
//
// ALDO barcode (12 digits): [brand 4] [cat 2] [color 3] [sizeVariant 3]
// e.g. 055804696959 → color = "696"
// Works for barcodes starting with 0558 or 8558

function extractColorCode(barcode: string | null | false): string | null {
  if (!barcode) return null;
  const b = String(barcode).replace(/\D/g, ""); // digits only
  if (b.length === 12) return b.slice(6, 9);
  if (b.length === 13) return b.slice(7, 10); // 13-digit with leading check digit
  return null;
}

// ─── Map MC → Vietnamese category ─────────────────────────────────────────────

function mcToCategory(mc: string | null): { category: string; productType?: string } {
  if (!mc) return { category: "Khác" };
  const entry = MC_MAP[mc];
  if (entry) return { category: entry.category, productType: entry.productType };
  return { category: "Khác" };
}

// ─── Map Odoo product → DBProduct ─────────────────────────────────────────────

type OdooSyncProduct = Awaited<ReturnType<typeof fetchOdooProducts>>[number];

function mapProduct(op: OdooSyncProduct): DBProduct {
  const now = new Date().toISOString();

  const parsed = parseOdooName(op.name);
  const mc = parsed.mc;
  const { category, productType } = mcToCategory(mc);

  // EAN barcode on physical label (what a scanner reads) — separate from default_code
  const ean = op.barcode ? String(op.barcode).trim() : null;

  // Color: prefer EAN barcode (12/13-digit), fallback to default_code
  const colorCode = extractColorCode(ean) ?? extractColorCode(op.default_code);

  // Size from parsed Odoo name
  const size = parsed.size;

  // SKU = EAN barcode if available (scanner-readable), else default_code, else ODOO-{id}
  const sku = ean ?? (op.default_code ? String(op.default_code).trim() : `ODOO-${op.id}`);

  // Price in VND
  const price = op.list_price > 0 ? op.list_price : undefined;

  return {
    id: `odoo-${op.id}`,
    name: parsed.cleanName,   // clean name e.g. "ETIENE" not "[747544361470] ETIENE (MC14003) SS26 (6-)"
    sku,
    category,
    productType: productType ?? null,
    quantity: op.qty_47gdl ?? 0,
    price: price ?? null,
    markdownPrice: null,
    color: colorCode,          // 3-digit color code e.g. "696"
    size: size,                // shoe size e.g. "6-", "38"
    imagePath: null,
    notes: [
      mc ? `MC: ${mc}` : null,
      parsed.season ? `Season: ${parsed.season}` : null,
      // Store internal reference so it remains searchable even if sku = EAN
      op.default_code ? `Ref: ${String(op.default_code).trim()}` : null,
      op.description_sale ? String(op.description_sale) : null,
    ].filter(Boolean).join(" | ") || null,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── GET /api/odoo/sync — test connection ─────────────────────────────────────

export async function GET() {
  try {
    if (!process.env.ODOO_URL) {
      return NextResponse.json({ ok: false, error: "ODOO_URL env var not set" }, { status: 400 });
    }
    const info = await testOdooConnection();
    return NextResponse.json({ ok: true, ...info });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}

// ─── POST /api/odoo/sync — run full sync ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ODOO_URL) {
      return NextResponse.json({ ok: false, error: "ODOO_URL env var not set" }, { status: 400 });
    }

    let dryRun = false;
    let limit = 0;
    try {
      const body = await req.json();
      dryRun = !!body?.dryRun;
      if (typeof body?.limit === "number") limit = body.limit;
    } catch { /* no body */ }

    const odooProducts = await fetchOdooProducts(limit);
    const mapped = odooProducts
      .map(mapProduct)
      .filter(p => p.category !== "Khác"); // keep all products with known category, price=0 is valid (accessories, bundles)

    let deleted = 0;
    if (!dryRun) {
      deleted = await dbDeleteAllProducts();
      await dbBulkUpsertProducts(mapped);
    }

    return NextResponse.json({
      ok: true,
      synced: mapped.length,
      deleted,
      dryRun,
      preview: dryRun ? mapped.slice(0, 5) : undefined,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[odoo/sync] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
