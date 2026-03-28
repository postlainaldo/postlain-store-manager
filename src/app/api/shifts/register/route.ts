import { NextRequest, NextResponse } from "next/server";
import {
  dbUpsertShiftRegistrationBySlotUser,
  dbDeleteShiftRegistration,
  dbGetShiftRegistrations,
  DBShiftRegistration,
} from "@/lib/dbAdapter";

// POST /api/shifts/register — register, cancel, approve/reject, or assign (admin direct)
// body: { action: "register"|"cancel"|"approve"|"reject"|"assign"|"unassign", slotId, userId, userName, registrationId?, note? }
export async function POST(req: NextRequest) {
  const { action, slotId, userId, userName, registrationId, note } =
    await req.json() as {
      action: "register" | "cancel" | "approve" | "reject" | "assign" | "unassign";
      slotId: string; userId: string; userName: string;
      registrationId?: string; note?: string;
    };

  const now = new Date().toISOString();

  if (action === "register") {
    const reg: DBShiftRegistration = {
      id: registrationId ?? `reg_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      slotId, userId, userName,
      status: "pending",
      note: note ?? null,
      createdAt: now, updatedAt: now,
    };
    await dbUpsertShiftRegistrationBySlotUser(reg);
    return NextResponse.json({ ok: true, id: reg.id });
  }

  if (action === "cancel") {
    if (!registrationId) return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });
    await dbDeleteShiftRegistration(registrationId);
    return NextResponse.json({ ok: true });
  }

  if (action === "approve" || action === "reject") {
    if (!registrationId) return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });
    // Fetch the registration first to get its slotId for re-upsert
    const regs = await dbGetShiftRegistrations([slotId]);
    const existing = regs.find(r => r.id === registrationId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated: DBShiftRegistration = {
      ...existing,
      status: action === "approve" ? "approved" : "rejected",
      note: note ?? existing.note,
      updatedAt: now,
    };
    await dbUpsertShiftRegistrationBySlotUser(updated);
    return NextResponse.json({ ok: true });
  }

  // Admin directly assigns a user to a slot (status = approved immediately)
  if (action === "assign") {
    const reg: DBShiftRegistration = {
      id: registrationId ?? `reg_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      slotId, userId, userName,
      status: "approved",
      note: note ?? null,
      createdAt: now, updatedAt: now,
    };
    await dbUpsertShiftRegistrationBySlotUser(reg);
    return NextResponse.json({ ok: true, id: reg.id });
  }

  // Admin removes a direct assignment
  if (action === "unassign") {
    const regs = await dbGetShiftRegistrations([slotId]);
    const existing = regs.find(r => r.userId === userId);
    if (existing) await dbDeleteShiftRegistration(existing.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
