import { NextRequest, NextResponse } from "next/server";
import {
  dbGetShiftTemplates, dbUpsertShiftTemplate, dbDeleteShiftTemplate,
  dbGetShiftSlots, dbUpsertShiftSlot, dbDeleteShiftSlot,
  dbGetShiftRegistrations,
  ensureSupabaseSchema,
  DBShiftTemplate, DBShiftSlot,
} from "@/lib/dbAdapter";

// GET /api/shifts?dateFrom=2026-03-24&dateTo=2026-03-30
// Returns: { templates, slots, registrations }
export async function GET(req: NextRequest) {
  try {
    await ensureSupabaseSchema();
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom") ?? new Date().toISOString().slice(0, 10);
    const dateTo   = searchParams.get("dateTo")   ?? new Date().toISOString().slice(0, 10);

    const [templates, slots] = await Promise.all([
      dbGetShiftTemplates(),
      dbGetShiftSlots(dateFrom, dateTo),
    ]);
    const slotIds = slots.map(s => s.id);
    const registrations = await dbGetShiftRegistrations(slotIds);

    return NextResponse.json({ templates, slots, registrations });
  } catch (err) {
    console.error("[GET /api/shifts] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// POST /api/shifts  — create/update template or slot
// body: { kind: "template"|"slot", data: {...} }
export async function POST(req: NextRequest) {
  try {
    const { kind, data } = await req.json() as { kind: "template" | "slot"; data: DBShiftTemplate | DBShiftSlot };
    const now = new Date().toISOString();
    if (kind === "template") {
      const t = data as DBShiftTemplate;
      if (!t.id) t.id = `tmpl_${Date.now()}`;
      if (!t.createdAt) t.createdAt = now;
      await dbUpsertShiftTemplate(t);
      return NextResponse.json({ ok: true, id: t.id });
    }
    // slot
    const s = data as DBShiftSlot;
    if (!s.id) s.id = `slot_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
    if (!s.createdAt) s.createdAt = now;
    if (!s.updatedAt) s.updatedAt = now;
    await dbUpsertShiftSlot(s);
    return NextResponse.json({ ok: true, id: s.id });
  } catch (err) {
    console.error("[POST /api/shifts] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// DELETE /api/shifts?kind=template&id=xxx  or  kind=slot
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind");
    const id   = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (kind === "template") await dbDeleteShiftTemplate(id);
    else await dbDeleteShiftSlot(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/shifts] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
