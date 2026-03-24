/**
 * GET /api/state
 *
 * Returns the full DB-backed app state needed to hydrate the UI:
 *  - products[]
 *  - warehouseShelves[] (matching WarehouseShelf shape from @/types)
 *  - displayPlacements  (productId per slot, nested by sectionId/subsectionId/row/col)
 *
 * Uses dbAdapter so it works with both Supabase (Vercel) and SQLite (local dev).
 */

import { NextResponse } from "next/server";
import {
  dbGetProducts,
  dbGetWarehouseShelvesForState,
  dbGetDisplayPlacements,
  ensureSupabaseSchema,
} from "@/lib/dbAdapter";

export async function GET() {
  await ensureSupabaseSchema();

  const [products, warehouseShelves, displayPlacements] = await Promise.all([
    dbGetProducts(),
    dbGetWarehouseShelvesForState(),
    dbGetDisplayPlacements(),
  ]);

  return NextResponse.json({ products, warehouseShelves, displayPlacements });
}
