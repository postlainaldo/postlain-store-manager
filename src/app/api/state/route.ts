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

import { NextRequest, NextResponse } from "next/server";
import {
  dbGetProducts,
  dbGetWarehouseShelvesForState,
  dbGetDisplayPlacements,
  dbGetSectionRowOverrides,
  ensureSupabaseSchema,
} from "@/lib/dbAdapter";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  await ensureSupabaseSchema();

  const [products, warehouseShelves, displayPlacements, sectionRowOverrides] = await Promise.all([
    dbGetProducts(),
    dbGetWarehouseShelvesForState(),
    dbGetDisplayPlacements(),
    dbGetSectionRowOverrides(),
  ]);

  return NextResponse.json({ products, warehouseShelves, displayPlacements, sectionRowOverrides });
}
