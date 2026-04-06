import { NextRequest, NextResponse } from "next/server";
import { dbGetProducts, dbBulkUpsertProducts, dbDeleteProducts, type DBProduct } from "@/lib/dbAdapter";
import { sendPushToAll } from "@/lib/push";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const rows: DBProduct[] = await req.json();
  if (!rows.length) return NextResponse.json({ products: [], inserted: 0, updated: 0, deleted: 0 });

  const now = new Date().toISOString();

  // Get all existing products from DB (one query)
  const existing = await dbGetProducts();
  const existingById  = new Map(existing.map(p => [p.id,  p]));
  const existingBySku = new Map(existing.filter(p => p.sku).map(p => [p.sku!, p]));

  // Build set of SKUs in import file
  const importSkus = new Set(rows.filter(r => r.sku).map(r => r.sku!));

  const toUpsert: DBProduct[] = [];
  let insertedCount = 0;
  let updatedCount  = 0;

  for (const row of rows) {
    if (row.sku && existingBySku.has(row.sku)) {
      // Existing by SKU — update qty only, keep other fields
      const ex = existingBySku.get(row.sku)!;
      toUpsert.push({ ...ex, quantity: row.quantity ?? ex.quantity, updatedAt: now });
      updatedCount++;
    } else if (existingById.has(row.id)) {
      // Existing by id — full update
      toUpsert.push({ ...row, updatedAt: now });
      updatedCount++;
    } else {
      // New product
      toUpsert.push({ ...row, updatedAt: now, createdAt: row.createdAt || now });
      insertedCount++;
    }
  }

  // Batch upsert — one round-trip instead of N
  await dbBulkUpsertProducts(toUpsert);

  // Delete products whose SKU is not in the import (only SKU-bearing products)
  const toDelete = existing
    .filter(p => p.sku && !importSkus.has(p.sku))
    .map(p => p.id);
  if (toDelete.length > 0) await dbDeleteProducts(toDelete);

  // Push notification to all subscribed devices
  const pushBody = [
    insertedCount > 0 && `+${insertedCount} mới`,
    updatedCount  > 0 && `${updatedCount} cập nhật`,
    toDelete.length > 0 && `${toDelete.length} đã xóa`,
  ].filter(Boolean).join(" · ");

  if (pushBody) {
    sendPushToAll({
      title: "Import hoàn tất",
      body: pushBody,
      type: "import",
      url: "/inventory",
    }).catch(() => {});
  }

  return NextResponse.json({
    products: toUpsert,
    inserted: insertedCount,
    updated:  updatedCount,
    deleted:  toDelete.length,
  }, { status: 200 });
}
