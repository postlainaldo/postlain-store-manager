import { NextRequest, NextResponse } from "next/server";
import {
  dbGetRooms, dbGetMessages, dbInsertMessage, dbRoomExists,
  dbCreateRoom, dbDeleteRoom, dbSoftDeleteMessage,
  dbGetMessageSender, dbUpdateReactions, dbGetUserRole,
} from "@/lib/dbAdapter";

// GET /api/chat?rooms=1            — list rooms with last message + count
// GET /api/chat?roomId=xxx         — messages in room (latest 80)
// GET /api/chat?roomId=xxx&since=iso — messages after timestamp
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  if (searchParams.get("rooms")) {
    const result = await dbGetRooms();
    return NextResponse.json(result);
  }

  const roomId = searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 });

  const since = searchParams.get("since") ?? undefined;
  const msgs = await dbGetMessages(roomId, since);
  return NextResponse.json(msgs);
}

// POST /api/chat — send message (text or media)
export async function POST(req: NextRequest) {
  const { roomId, userId, userName, content, mediaUrl, mediaType, replyToId } = await req.json();
  if (!roomId || !userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!content?.trim() && !mediaUrl) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const exists = await dbRoomExists(roomId);
  if (!exists) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  await dbInsertMessage({
    id, roomId, userId, userName,
    content: (content ?? "").trim(),
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
    replyToId: replyToId ?? null,
    createdAt: now,
  });

  return NextResponse.json({ ok: true, id, createdAt: now });
}

// PUT /api/chat — create room
export async function PUT(req: NextRequest) {
  const { name, type, createdBy } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  const id = `room_${Date.now()}`;
  const now = new Date().toISOString();
  await dbCreateRoom(id, name.trim(), type ?? "channel", createdBy ?? "user_admin", now);
  return NextResponse.json({ ok: true, id });
}

// PATCH /api/chat — soft delete a message OR update reactions
export async function PATCH(req: NextRequest) {
  const { msgId, userId, action, reactions } = await req.json();
  if (!msgId) return NextResponse.json({ error: "Missing msgId" }, { status: 400 });

  if (action === "react" && reactions !== undefined) {
    await dbUpdateReactions(msgId, JSON.stringify(reactions));
    return NextResponse.json({ ok: true });
  }

  // Soft delete — check ownership or admin
  const msg = await dbGetMessageSender(msgId);
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = await dbGetUserRole(userId);
  const isAdmin = role === "admin" || role === "manager";
  if (msg.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { found } = await dbSoftDeleteMessage(msgId, new Date().toISOString());
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/chat — delete room (not default ones)
export async function DELETE(req: NextRequest) {
  const { roomId } = await req.json();
  if (roomId === "room_general" || roomId === "room_announce") {
    return NextResponse.json({ error: "Cannot delete default rooms" }, { status: 400 });
  }
  await dbDeleteRoom(roomId);
  return NextResponse.json({ ok: true });
}
