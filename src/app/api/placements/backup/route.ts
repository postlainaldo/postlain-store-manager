/**
 * GET  /api/placements/backup  — download all placements as JSON
 * POST /api/placements/backup  — restore placements from JSON
 *
 * Works with both Supabase (production) and SQLite (local dev).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  dbGetAllShelves,
  dbGetOrCreateSlot,
  dbSetPlacement,
  ensureSupabaseSchema,
} from "@/lib/dbAdapter";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";
import getDb from "@/lib/database";

export const dynamic = "force-dynamic";

// ── GET — export all shelves + slots + placements ─────────────────────────────
export async function GET() {
  await ensureSupabaseSchema();

  const shelves = await dbGetAllShelves();
  const shelfIds = shelves.map(s => s.id);

  if (!shelfIds.length) {
    const body = JSON.stringify({ shelves: [], slots: [], placements: [] }, null, 2);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="placements-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  let slots: unknown[] = [];
  let placements: unknown[] = [];

  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data: slotsData } = await sb.from("slots").select("*").in("shelfId", shelfIds);
    slots = slotsData ?? [];
    const slotIds = slots.map((s: unknown) => (s as { id: string }).id);
    if (slotIds.length) {
      const { data: placementsData } = await sb.from("placements").select("*").in("slotId", slotIds);
      placements = placementsData ?? [];
    }
  } else {
    const db = getDb();
    const ph = shelfIds.map(() => "?").join(",");
    slots = db.prepare(`SELECT * FROM slots WHERE "shelfId" IN (${ph})`).all(...shelfIds);
    const slotIds = (slots as { id: string }[]).map(s => s.id);
    if (slotIds.length) {
      const sph = slotIds.map(() => "?").join(",");
      placements = db.prepare(`SELECT * FROM placements WHERE "slotId" IN (${sph})`).all(...slotIds);
    }
  }

  const body = JSON.stringify({ shelves, slots, placements }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="placements-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

// ── POST — restore placements from JSON ───────────────────────────────────────
export async function POST(req: NextRequest) {
  await ensureSupabaseSchema();

  let data: {
    slots: { id: string; shelfId: string; tier: number; position: number; label?: string }[];
    placements: { slotId: string; productId: string }[];
  };

  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!data.placements?.length) return NextResponse.json({ ok: true, restored: 0 });

  // Build lookup: backup slotId → slot info (shelfId/tier/position/label)
  const slotById = new Map<string, { shelfId: string; tier: number; position: number; label: string }>();
  for (const s of (data.slots ?? [])) {
    slotById.set(s.id, { shelfId: s.shelfId, tier: s.tier, position: s.position, label: s.label ?? "" });
  }

  let restored = 0;
  for (const p of data.placements) {
    if (!p.slotId || !p.productId) continue;
    const slot = slotById.get(p.slotId);
    if (!slot) continue;
    try {
      const currentSlotId = await dbGetOrCreateSlot(slot.shelfId, slot.tier, slot.position, slot.label);
      await dbSetPlacement(currentSlotId, p.productId);
      restored++;
    } catch { /* skip invalid */ }
  }

  return NextResponse.json({ ok: true, restored });
}
