import { NextRequest, NextResponse } from "next/server";
import {
  dbGetRooms, dbGetMessages, dbInsertMessage, dbRoomExists,
  dbCreateRoom, dbDeleteRoom, dbSoftDeleteMessage,
  dbGetMessageSender, dbUpdateReactions, dbGetUserRole,
  dbPinMessage, dbGetPinnedMessages, dbSearchMessages,
  dbClearRoomMessages, dbRevokeMessage, dbMarkRead, dbGetReadReceipts,
  dbUpdateRoomMembers,
} from "@/lib/dbAdapter";

// GET /api/chat?rooms=1             — list rooms with last message + count
// GET /api/chat?roomId=xxx          — messages in room (latest 80)
// GET /api/chat?roomId=xxx&since=iso — messages after timestamp
// GET /api/chat?roomId=xxx&search=q — search messages by content
// GET /api/chat?roomId=xxx&pinned=1 — pinned messages in room
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  if (searchParams.get("rooms")) {
    const result = await dbGetRooms();
    return NextResponse.json(result);
  }

  const roomId = searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 });

  if (searchParams.get("pinned")) {
    const msgs = await dbGetPinnedMessages(roomId);
    return NextResponse.json(msgs);
  }

  if (searchParams.get("receipts")) {
    const receipts = await dbGetReadReceipts(roomId);
    return NextResponse.json(receipts);
  }

  const search = searchParams.get("search");
  if (search?.trim()) {
    const msgs = await dbSearchMessages(roomId, search.trim());
    return NextResponse.json(msgs);
  }

  const since = searchParams.get("since") ?? undefined;
  const msgs = await dbGetMessages(roomId, since);
  return NextResponse.json(msgs);
}

// POST /api/chat — send message (text or media)
// POST /api/chat/typing — broadcast typing indicator (handled inline below via ?typing=1)
export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // ── Mark room as read ────────────────────────────────────────────────────────
  if (searchParams.get("markRead")) {
    const { roomId, userId } = await req.json();
    if (!roomId || !userId) return NextResponse.json({ ok: false });
    await dbMarkRead(roomId, userId);
    return NextResponse.json({ ok: true });
  }

  // ── Typing indicator ────────────────────────────────────────────────────────
  if (searchParams.get("typing")) {
    const { roomId, userId, userName } = await req.json();
    if (!roomId || !userId) return NextResponse.json({ ok: false });
    // Store typing event in a transient global map (process-local; good enough for same-instance SSE)
    const key = `${roomId}:${userId}`;
    const typingMap = (globalThis as Record<string, unknown>).__typingMap as Map<string, { userName: string; expires: number }> | undefined;
    const map = typingMap ?? new Map<string, { userName: string; expires: number }>();
    (globalThis as Record<string, unknown>).__typingMap = map;
    map.set(key, { userName, expires: Date.now() + 4000 });
    return NextResponse.json({ ok: true });
  }

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

// PUT /api/chat — create room (optionally with explicit id for idempotent upsert)
export async function PUT(req: NextRequest) {
  const { name, type, createdBy, id: requestedId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  const id = requestedId?.trim() || `room_${Date.now()}`;
  const now = new Date().toISOString();
  // Check if room already exists (idempotent)
  const exists = await dbRoomExists(id);
  if (!exists) {
    await dbCreateRoom(id, name.trim(), type ?? "channel", createdBy ?? "user_admin", now);
  }
  return NextResponse.json({ ok: true, id });
}

// PATCH /api/chat — soft delete / edit message / update reactions / update room / pin
export async function PATCH(req: NextRequest) {
  const { msgId, roomId, userId, action, reactions, content, icon, color, name, pin, memberIds } = await req.json();

  // ── Clear all messages in room (admin only) ──────────────────────────────
  if (roomId && action === "clearRoom") {
    const role = await dbGetUserRole(userId);
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await dbClearRoomMessages(roomId);
    return NextResponse.json({ ok: true });
  }

  // ── Room customization (admin only) ──────────────────────────────────────
  if (roomId && action === "updateRoom") {
    const role = await dbGetUserRole(userId);
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { IS_SUPABASE, getSupabase } = await import("@/lib/supabase");
    const getDb = (await import("@/lib/database")).default;
    if (IS_SUPABASE) {
      const upd: Record<string, string> = {};
      if (name !== undefined) upd.name = name;
      if (icon !== undefined) upd.icon = icon;
      if (color !== undefined) upd.color = color;
      await getSupabase().from("chat_rooms").update(upd).eq("id", roomId);
    } else {
      const db = getDb();
      if (name !== undefined) db.prepare("UPDATE chat_rooms SET name=? WHERE id=?").run(name, roomId);
      if (icon !== undefined) db.prepare("UPDATE chat_rooms SET icon=? WHERE id=?").run(icon, roomId);
      if (color !== undefined) db.prepare("UPDATE chat_rooms SET color=? WHERE id=?").run(color, roomId);
    }
    return NextResponse.json({ ok: true });
  }

  // ── Update room members (admin only) ─────────────────────────────────────
  if (roomId && action === "updateRoomMembers") {
    const role = await dbGetUserRole(userId);
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // memberIds: string[] | null — null means open to all
    await dbUpdateRoomMembers(roomId, Array.isArray(memberIds) ? memberIds : null);
    return NextResponse.json({ ok: true });
  }

  if (!msgId) return NextResponse.json({ error: "Missing msgId" }, { status: 400 });

  if (action === "react" && reactions !== undefined) {
    await dbUpdateReactions(msgId, JSON.stringify(reactions));
    return NextResponse.json({ ok: true });
  }

  // ── Pin / unpin (admin/manager only) ──────────────────────────────────────
  if (action === "pin") {
    const role = await dbGetUserRole(userId);
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await dbPinMessage(msgId, userId, pin === true);
    return NextResponse.json({ ok: true });
  }

  // ── Revoke message (show "thu hồi" text, keep visible, own messages only within 15 min) ──
  if (action === "revoke") {
    const msg = await dbGetMessageSender(msgId);
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const role = await dbGetUserRole(userId);
    const isAdmin = role === "admin" || role === "manager";
    if (msg.userId !== userId && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { found } = await dbRevokeMessage(msgId, new Date().toISOString());
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // ── Edit message ──────────────────────────────────────────────────────────
  if (action === "edit" && content !== undefined) {
    const msg = await dbGetMessageSender(msgId);
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const role = await dbGetUserRole(userId);
    const isAdmin = role === "admin" || role === "manager";
    if (msg.userId !== userId && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { IS_SUPABASE, getSupabase } = await import("@/lib/supabase");
    const getDb = (await import("@/lib/database")).default;
    const now = new Date().toISOString();
    if (IS_SUPABASE) {
      await getSupabase().from("chat_messages").update({ content: content.trim(), editedAt: now }).eq("id", msgId);
    } else {
      getDb().prepare("UPDATE chat_messages SET content=?, editedAt=? WHERE id=?").run(content.trim(), now, msgId);
    }
    return NextResponse.json({ ok: true });
  }

  // ── Soft delete ───────────────────────────────────────────────────────────
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
