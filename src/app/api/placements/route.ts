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
import { getWarehouseMap, getDisplayMap, getOrCreateSlot, setPlacement, getAllPlacements, upsertShelf } from "@/lib/repo";
import { notifyClients } from "@/lib/sseClients";
import getDb from "@/lib/database";

export async function GET() {
  const warehouse = getWarehouseMap();
  const display   = getDisplayMap();
  const raw       = getAllPlacements();
  return NextResponse.json({ warehouse, display, placements: raw });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    shelfId: string;
    shelfName?: string;
    tier: number;
    position: number;
    label?: string;
    productId: string | null;
  };

  const { shelfId, shelfName, tier, position, label = "", productId } = body;

  if (!shelfId || tier === undefined || position === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Auto-create shelf record if it doesn't exist yet (display sections are
  // defined in client state but may not be seeded in the DB shelves table)
  const db = getDb();
  const shelfExists = db.prepare("SELECT id FROM shelves WHERE id = ?").get(shelfId);
  if (!shelfExists) {
    const isDisplay = label !== "";  // display placements always carry a subsectionId label
    upsertShelf({
      id: shelfId,
      name: shelfName ?? shelfId,
      type: isDisplay ? "DISPLAY" : "WAREHOUSE",
      subType: null,
      sortOrder: 0,
    });
  }

  const slotId = getOrCreateSlot(shelfId, tier, position, label);
  setPlacement(slotId, productId);

  // Notify all SSE clients so every browser tab / device refreshes instantly
  notifyClients({ type: "placement", shelfId, tier, position, label, productId, slotId });

  return NextResponse.json({ ok: true, slotId });
}
