import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/database";

type Notif = { id: string; title: string; body: string; type: string; createdBy: string; createdAt: string; pinned: number };

// GET /api/notifications
export async function GET() {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM notifications ORDER BY pinned DESC, createdAt DESC LIMIT 50"
  ).all() as Notif[];
  return NextResponse.json(rows);
}

// POST /api/notifications — admin tạo thông báo
export async function POST(req: NextRequest) {
  const { title, body, type, createdBy, pinned } = await req.json();
  if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const db = getDb();
  const id = `notif_${Date.now()}`;
  db.prepare("INSERT INTO notifications (id, title, body, type, createdBy, createdAt, pinned) VALUES (?,?,?,?,?,?,?)")
    .run(id, title.trim(), body.trim(), type ?? "info", createdBy ?? "user_admin", new Date().toISOString(), pinned ? 1 : 0);

  // Also post to announce room
  const announceMsg = `📢 ${title}: ${body}`;
  const msgId = `msg_${Date.now()}`;
  db.prepare("INSERT INTO chat_messages (id, roomId, userId, userName, content, createdAt) VALUES (?,?,?,?,?,?)")
    .run(msgId, "room_announce", createdBy ?? "user_admin", "Admin", announceMsg, new Date().toISOString());

  return NextResponse.json({ ok: true, id });
}

// DELETE /api/notifications
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const db = getDb();
  db.prepare("DELETE FROM notifications WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}

// PATCH /api/notifications — toggle pin
export async function PATCH(req: NextRequest) {
  const { id, pinned } = await req.json();
  const db = getDb();
  db.prepare("UPDATE notifications SET pinned=? WHERE id=?").run(pinned ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}
