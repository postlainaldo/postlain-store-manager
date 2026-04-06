/**
 * GET  /api/placements — full warehouse + display map
 * POST /api/placements — move a product to/from a slot
 *
 * POST body:
 *   {
 *     shelfId: string,
 *     shelfName?: string,
 *     tier: number,        // warehouse: tier 0-3 | display: rowIndex
 *     position: number,    // warehouse: 0-24    | display: slotIndex
 *     label?: string,      // display only: subsectionId
 *     productId: string | null,
 *   }
 *
 * Uses dbAdapter so it works with both Supabase (Vercel) and SQLite (local dev).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  dbGetWarehouseMap,
  dbGetDisplayMap,
  dbUpsertShelf,
  dbDeleteShelf,
  dbGetAllShelves,
  dbGetOrCreateSlot,
  dbSetPlacement,
  ensureSupabaseSchema,
} from "@/lib/dbAdapter";
import { notifyClients } from "@/lib/sseClients";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function GET() {
  await ensureSupabaseSchema();
  const [warehouse, display] = await Promise.all([dbGetWarehouseMap(), dbGetDisplayMap()]);
  return NextResponse.json({ warehouse, display });
}

export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  await ensureSupabaseSchema();

  const body = await req.json() as {
    shelfId: string;
    shelfName?: string;
    shelfType?: string;
    tier: number;
    position: number;
    label?: string;
    productId: string | null;
    _createShelfOnly?: boolean;
  };

  const { shelfId, shelfName, shelfType, tier, position, label = "", productId, _createShelfOnly } = body;

  if (!shelfId) {
    return NextResponse.json({ error: "Missing shelfId" }, { status: 400 });
  }

  // Auto-create shelf record if it doesn't exist yet
  const shelves = await dbGetAllShelves();
  const shelfExists = shelves.find(s => s.id === shelfId);
  if (!shelfExists) {
    const isDisplay = label !== "";
    await dbUpsertShelf({
      id: shelfId,
      name: shelfName ?? shelfId,
      type: isDisplay ? "DISPLAY" : "WAREHOUSE",
      subType: shelfType ?? null,
      sortOrder: 0,
    });
  }

  // If just creating the shelf record (no placement), return early
  if (_createShelfOnly) {
    notifyClients({ type: "placement", shelfId, tier: -1, position: -1, label: "", productId: null, slotId: "" });
    return NextResponse.json({ ok: true, shelfCreated: true });
  }

  if (tier === undefined || position === undefined) {
    return NextResponse.json({ error: "Missing tier/position" }, { status: 400 });
  }

  const slotId = await dbGetOrCreateSlot(shelfId, tier, position, label);
  await dbSetPlacement(slotId, productId);

  // Notify all SSE clients so every browser tab / device refreshes instantly
  notifyClients({ type: "placement", shelfId, tier, position, label, productId, slotId });

  return NextResponse.json({ ok: true, slotId });
}

export async function DELETE(req: NextRequest) {
  setActiveStore(getStoreId(req));
  await ensureSupabaseSchema();
  const { shelfId } = await req.json() as { shelfId: string };
  if (!shelfId) return NextResponse.json({ error: "Missing shelfId" }, { status: 400 });
  await dbDeleteShelf(shelfId);
  notifyClients({ type: "placement", shelfId, tier: -1, position: -1, label: "", productId: null, slotId: "" });
  return NextResponse.json({ ok: true });
}
