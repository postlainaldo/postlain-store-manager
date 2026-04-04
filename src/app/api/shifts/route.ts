import { NextRequest, NextResponse } from "next/server";
import {
  dbGetShiftTemplates, dbUpsertShiftTemplate, dbDeleteShiftTemplate,
  dbGetShiftSlots, dbUpsertShiftSlot, dbDeleteShiftSlot,
  dbGetShiftRegistrations,
  ensureSupabaseSchema,
  DBShiftTemplate, DBShiftSlot,
} from "@/lib/dbAdapter";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";
import getDb from "@/lib/database";

const REG_CLOSED_KEY = "regClosed";

async function getRegClosed(): Promise<boolean> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("app_settings").select("value").eq("key", REG_CLOSED_KEY).single();
    return (data as { value: string } | null)?.value === "1";
  }
  const db = getDb();
  db.prepare("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')").run();
  const row = db.prepare("SELECT value FROM app_settings WHERE key=?").get(REG_CLOSED_KEY) as { value: string } | undefined;
  return row?.value === "1";
}

async function setRegClosed(closed: boolean): Promise<void> {
  const value = closed ? "1" : "0";
  if (IS_SUPABASE) {
    await getSupabase().from("app_settings").upsert({ key: REG_CLOSED_KEY, value }, { onConflict: "key" });
    return;
  }
  const db = getDb();
  db.prepare("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')").run();
  db.prepare("INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(REG_CLOSED_KEY, value);
}

// GET /api/shifts?dateFrom=2026-03-24&dateTo=2026-03-30
// Returns: { templates, slots, registrations }
export async function GET(req: NextRequest) {
  try {
    await ensureSupabaseSchema();
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom") ?? new Date().toISOString().slice(0, 10);
    const dateTo   = searchParams.get("dateTo")   ?? new Date().toISOString().slice(0, 10);

    const [templates, slots, regClosed] = await Promise.all([
      dbGetShiftTemplates(),
      dbGetShiftSlots(dateFrom, dateTo),
      getRegClosed(),
    ]);
    const slotIds = slots.map(s => s.id);
    const registrations = await dbGetShiftRegistrations(slotIds);

    return NextResponse.json({ templates, slots, registrations, regClosed });
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

// PATCH /api/shifts  — update settings (e.g. regClosed)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { regClosed?: boolean };
    if (typeof body.regClosed === "boolean") {
      await setRegClosed(body.regClosed);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/shifts] error:", err);
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
