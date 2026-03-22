/**
 * GET  /api/placements — full warehouse + display map
 * POST /api/placements — move a product to/from a slot
 *
 * POST body:
 *   {
 *     shelfId: string,
 *     tier: number,        // warehouse: tier 0-3 | display: rowIndex
 *     position: number,    // warehouse: 0-24    | display: slotIndex
 *     label?: string,      // display only: subsectionId
 *     productId: string | null,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { getWarehouseMap, getDisplayMap, getOrCreateSlot, setPlacement, getAllPlacements } from "@/lib/repo";

export async function GET() {
  const warehouse = getWarehouseMap();
  const display   = getDisplayMap();
  const raw       = getAllPlacements();
  return NextResponse.json({ warehouse, display, placements: raw });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    shelfId: string;
    tier: number;
    position: number;
    label?: string;
    productId: string | null;
  };

  const { shelfId, tier, position, label = "", productId } = body;

  if (!shelfId || tier === undefined || position === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const slotId = getOrCreateSlot(shelfId, tier, position, label);
  setPlacement(slotId, productId);

  return NextResponse.json({ ok: true, slotId });
}
