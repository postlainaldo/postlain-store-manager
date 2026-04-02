/**
 * GET /api/shifts/test
 * Diagnostic endpoint — tests every shift DB operation step by step.
 * Remove after debugging.
 */
import { NextResponse } from "next/server";
import { IS_SUPABASE } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const log: string[] = [];
  let passed = 0;
  let failed = 0;

  async function step(name: string, fn: () => Promise<unknown>) {
    try {
      const result = await fn();
      log.push(`✓ ${name}: ${JSON.stringify(result).slice(0, 120)}`);
      passed++;
      return result;
    } catch (err) {
      log.push(`✗ ${name}: ${String(err)}`);
      failed++;
      return null;
    }
  }

  log.push(`mode: ${IS_SUPABASE ? "supabase" : "sqlite"}`);
  log.push(`DATA_DIR: ${process.env.DATA_DIR ?? "(not set)"}`);
  log.push(`NODE_ENV: ${process.env.NODE_ENV}`);

  // Check actual Supabase columns
  if (IS_SUPABASE) {
    await step("supabase: shift_templates columns", async () => {
      const { getSupabase } = await import("@/lib/supabase");
      const { data, error } = await getSupabase().from("shift_templates").select("*").limit(1);
      if (error) return "ERROR: " + error.message;
      if (!data?.length) return "table exists but empty — cannot inspect columns";
      return "columns: " + Object.keys(data[0]).join(", ");
    });
    await step("supabase: shift_slots columns", async () => {
      const { getSupabase } = await import("@/lib/supabase");
      const { data, error } = await getSupabase().from("shift_slots").select("*").limit(1);
      if (error) return "ERROR: " + error.message;
      if (!data?.length) return "table exists but empty — cannot inspect columns";
      return "columns: " + Object.keys(data[0]).join(", ");
    });
  }

  if (!IS_SUPABASE) {
    // Test SQLite connection
    await step("sqlite connect", async () => {
      const getDb = (await import("@/lib/database")).default;
      const db = getDb();
      return db.prepare("SELECT sqlite_version() as v").get();
    });

    // Test ensureShiftTables
    await step("ensureShiftTables", async () => {
      const { dbGetShiftTemplates } = await import("@/lib/dbAdapter");
      await dbGetShiftTemplates(); // triggers ensureShiftTables internally
      return "ok";
    });

    // Check columns
    await step("shift_templates columns", async () => {
      const getDb = (await import("@/lib/database")).default;
      const db = getDb();
      return (db.prepare("PRAGMA table_info(shift_templates)").all() as {name:string}[]).map(c => c.name);
    });

    await step("shift_slots columns", async () => {
      const getDb = (await import("@/lib/database")).default;
      const db = getDb();
      return (db.prepare("PRAGMA table_info(shift_slots)").all() as {name:string}[]).map(c => c.name);
    });

    await step("shift_registrations columns", async () => {
      const getDb = (await import("@/lib/database")).default;
      const db = getDb();
      return (db.prepare("PRAGMA table_info(shift_registrations)").all() as {name:string}[]).map(c => c.name);
    });
  }

  // Test get templates
  await step("dbGetShiftTemplates", async () => {
    const { dbGetShiftTemplates } = await import("@/lib/dbAdapter");
    const r = await dbGetShiftTemplates();
    return `${r.length} templates`;
  });

  // Test insert template
  const tmplId = `tmpl_test_${Date.now()}`;
  await step("dbUpsertShiftTemplate", async () => {
    const { dbUpsertShiftTemplate } = await import("@/lib/dbAdapter");
    await dbUpsertShiftTemplate({
      id: tmplId,
      name: "Test Ca",
      startTime: "08:00",
      endTime: "14:00",
      color: "#0ea5e9",
      maxStaff: 2,
      createdAt: new Date().toISOString(),
      staffType: "ALL",
    });
    return "inserted";
  });

  // Test get it back — query directly from Supabase to see raw row
  await step("dbGetShiftTemplates after insert", async () => {
    const { IS_SUPABASE, getSupabase } = await import("@/lib/supabase");
    if (IS_SUPABASE) {
      const { data, error } = await getSupabase().from("shift_templates").select("*").eq("id", tmplId).maybeSingle();
      if (error) return "SUPABASE ERROR: " + error.message;
      if (!data) return "NOT FOUND in Supabase";
      return "found raw: " + JSON.stringify(data);
    }
    const { dbGetShiftTemplates } = await import("@/lib/dbAdapter");
    const r = await dbGetShiftTemplates();
    const found = r.find(t => t.id === tmplId);
    return found ? `found: ${found.name}` : `NOT FOUND (total=${r.length})`;
  });

  // Test insert slot
  const slotId = `slot_test_${Date.now()}`;
  await step("dbUpsertShiftSlot", async () => {
    const { dbUpsertShiftSlot } = await import("@/lib/dbAdapter");
    await dbUpsertShiftSlot({
      id: slotId,
      templateId: tmplId,
      date: new Date().toISOString().slice(0, 10),
      name: "Test Slot",
      startTime: "08:00",
      endTime: "14:00",
      color: "#0ea5e9",
      maxStaff: 2,
      note: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      staffType: "ALL",
    });
    return "inserted";
  });

  // Test insert registration
  const regId = `reg_test_${Date.now()}`;
  await step("dbUpsertShiftRegistrationBySlotUser", async () => {
    const { dbUpsertShiftRegistrationBySlotUser } = await import("@/lib/dbAdapter");
    await dbUpsertShiftRegistrationBySlotUser({
      id: regId,
      slotId,
      userId: "user_admin",
      userName: "Admin",
      status: "approved",
      note: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return "inserted";
  });

  // Test get registrations
  await step("dbGetShiftRegistrations", async () => {
    const { dbGetShiftRegistrations } = await import("@/lib/dbAdapter");
    const r = await dbGetShiftRegistrations([slotId]);
    return `${r.length} registrations${r[0] ? `: userId=${r[0].userId} status=${r[0].status}` : ""}`;
  });

  // Cleanup
  await step("cleanup: delete registration", async () => {
    const { dbDeleteShiftRegistration } = await import("@/lib/dbAdapter");
    await dbDeleteShiftRegistration(regId);
    return "deleted";
  });

  await step("cleanup: delete slot", async () => {
    const { dbDeleteShiftSlot } = await import("@/lib/dbAdapter");
    await dbDeleteShiftSlot(slotId);
    return "deleted";
  });

  await step("cleanup: delete template", async () => {
    const { dbDeleteShiftTemplate } = await import("@/lib/dbAdapter");
    await dbDeleteShiftTemplate(tmplId);
    return "deleted";
  });

  return NextResponse.json({ passed, failed, log });
}
