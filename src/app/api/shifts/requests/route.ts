import { NextRequest, NextResponse } from "next/server";
import { dbGetShiftRequests, dbInsertShiftRequest, dbUpdateShiftRequest } from "@/lib/dbAdapter";

// GET /api/shifts/requests?userId=xxx  — staff: own requests
// GET /api/shifts/requests             — admin: all requests
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
    const data = await dbGetShiftRequests(userId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/shifts/requests — submit new request
export async function POST(req: NextRequest) {
  try {
    const { userId, userName, type, content, targetDate } = await req.json();
    if (!userId || !content?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const id = `sreq_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    await dbInsertShiftRequest({
      id, userId, userName: userName ?? "Nhân viên",
      type: type ?? "other",
      status: "pending",
      content: content.trim(),
      adminNote: null,
      targetDate: targetDate ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/shifts/requests — admin approve/reject
export async function PATCH(req: NextRequest) {
  try {
    const { id, status, adminNote } = await req.json();
    if (!id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
    }
    await dbUpdateShiftRequest(id, { status, adminNote, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
