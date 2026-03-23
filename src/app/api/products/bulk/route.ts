import { NextRequest, NextResponse } from "next/server";
import { dbGetProducts, dbUpsertProduct, dbDeleteProducts, type DBProduct } from "@/lib/dbAdapter";

export async function POST(req: NextRequest) {
  const rows: DBProduct[] = await req.json();
  const now = new Date().toISOString();

  // Get all existing products from DB
  const existing = await dbGetProducts();
  const existingBySku = new Map(existing.filter(p => p.sku).map(p => [p.sku!, p]));

  // Build set of SKUs in import file
  const importSkus = new Set(rows.filter(r => r.sku).map(r => r.sku!));

  const upserted: DBProduct[] = [];
  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku && existingBySku.has(row.sku)) {
      // Existing product — update qty only, keep other fields intact
      const ex = existingBySku.get(row.sku)!;
      const updated = await dbUpsertProduct({
        ...ex,
        quantity: row.quantity ?? ex.quantity,
        updatedAt: now,
      });
      upserted.push(updated);
      updatedCount++;
    } else {
      // New product — insert
      const inserted = await dbUpsertProduct({
        ...row,
        updatedAt: now,
        createdAt: row.createdAt || now,
      });
      upserted.push(inserted);
      insertedCount++;
    }
  }

  // Delete products that are no longer in the import file (by SKU)
  // Only delete products that have SKUs AND whose SKU is not in the import
  const toDelete = existing
    .filter(p => p.sku && !importSkus.has(p.sku))
    .map(p => p.id);

  if (toDelete.length > 0) {
    await dbDeleteProducts(toDelete);
  }

  return NextResponse.json({ products: upserted, inserted: insertedCount, updated: updatedCount, deleted: toDelete.length }, { status: 200 });
}
