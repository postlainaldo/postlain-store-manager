import { NextRequest, NextResponse } from "next/server";
import { fetchOdooProducts, testOdooConnection } from "@/lib/odoo";
import { dbBulkUpsertProducts, dbDeleteAllOdooProducts } from "@/lib/dbAdapter";
import type { DBProduct } from "@/lib/dbAdapter";
import { resolveCategory } from "@/lib/categoryMapping";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — Vercel Pro/Hobby max

// ─── Helpers ──────────────────────────────────────────────────────────────────

type OdooSyncProduct = Awaited<ReturnType<typeof fetchOdooProducts>>[number];

/** Map Odoo product → Postlain DBProduct */
function mapProduct(op: OdooSyncProduct): DBProduct {
  const now = new Date().toISOString();

  // SKU: use default_code if set, else fallback to "ODOO-{id}"
  const sku = op.default_code ? String(op.default_code).trim() : `ODOO-${op.id}`;

  // Category: try resolving from SKU (MC code) first, then Odoo category name
  let category = "Khác";
  let productType: string | undefined;

  const fromSku = sku ? resolveCategory(sku) : null;
  if (fromSku && fromSku.category !== sku) {
    // resolveCategory returned a known mapping
    category = fromSku.category;
    productType = fromSku.productType;
  } else if (op.categ_id) {
    // fallback: use Odoo category name
    const catName = op.categ_id[1] ?? "";
    category = catName || "Khác";
  }

  // Price: Odoo list_price is in VND for ALDO VN
  const price = op.list_price > 0 ? op.list_price : undefined;

  // Stable ID: use "odoo-{id}" so re-syncing upserts correctly
  const id = `odoo-${op.id}`;

  return {
    id,
    name: op.name,
    sku,
    category,
    productType: productType ?? null,
    quantity: op.qty_47gdl ?? 0,
    price: price ?? null,
    markdownPrice: null,
    color: null,
    size: null,
    imagePath: null,
    notes: op.description_sale ? String(op.description_sale) : null,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── GET /api/odoo/sync — test connection ─────────────────────────────────────

export async function GET() {
  try {
    if (!process.env.ODOO_URL) {
      return NextResponse.json(
        { ok: false, error: "ODOO_URL env var not set" },
        { status: 400 }
      );
    }
    const info = await testOdooConnection();
    return NextResponse.json({ ok: true, ...info });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 502 }
    );
  }
}

// ─── POST /api/odoo/sync — run full sync ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ODOO_URL) {
      return NextResponse.json(
        { ok: false, error: "ODOO_URL env var not set" },
        { status: 400 }
      );
    }

    // Optional body: { dryRun: true, limit: 50 }
    let dryRun = false;
    let limit = 0;
    try {
      const body = await req.json();
      dryRun = !!body?.dryRun;
      if (typeof body?.limit === "number") limit = body.limit;
    } catch { /* no body — that's fine */ }

    const odooProducts = await fetchOdooProducts(limit);
    const mapped = odooProducts.map(mapProduct);

    let deleted = 0;
    if (!dryRun) {
      deleted = await dbDeleteAllOdooProducts();
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
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 502 }
    );
  }
}
