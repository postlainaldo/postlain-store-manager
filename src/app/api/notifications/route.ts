import { NextRequest, NextResponse } from "next/server";
import { dbGetNotifications, dbInsertNotification, dbDeleteNotification, dbInsertMessage } from "@/lib/dbAdapter";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";
import getDb from "@/lib/database";
import { sendPushToAll } from "@/lib/push";

// GET /api/notifications
export async function GET() {
  const rows = await dbGetNotifications();
  return NextResponse.json(rows);
}

// POST /api/notifications — create notification
export async function POST(req: NextRequest) {
  const { title, body, type, createdBy, pinned } = await req.json();
  if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const id = `notif_${Date.now()}`;
  const now = new Date().toISOString();

  await dbInsertNotification({
    id, title: title.trim(), body: body.trim(),
    type: type ?? "info", createdBy: createdBy ?? "user_admin",
    createdAt: now, pinned: pinned ? 1 : 0,
  });

  // Also post to announce room
  const announceMsg = `📢 ${title}: ${body}`;
  const msgId = `msg_${Date.now()}`;
  await dbInsertMessage({
    id: msgId, roomId: "room_announce",
    userId: createdBy ?? "user_admin", userName: "Admin",
    content: announceMsg, createdAt: now,
  });

  // Send web push to all subscribed devices
  sendPushToAll({ title, body, type: type ?? "info", url: "/chat" }).catch(() => {});

  return NextResponse.json({ ok: true, id });
}

// DELETE /api/notifications
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await dbDeleteNotification(id);
  return NextResponse.json({ ok: true });
}

// PATCH /api/notifications — toggle pin
export async function PATCH(req: NextRequest) {
  const { id, pinned } = await req.json();
  if (IS_SUPABASE) {
    await getSupabase().from("notifications").update({ pinned: pinned ? 1 : 0 }).eq("id", id);
  } else {
    getDb().prepare("UPDATE notifications SET pinned=? WHERE id=?").run(pinned ? 1 : 0, id);
  }
  return NextResponse.json({ ok: true });
}
