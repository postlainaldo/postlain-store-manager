import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/database";

type Room = { id: string; name: string; type: string; createdBy: string; createdAt: string };
type Message = { id: string; roomId: string; userId: string; userName: string; content: string; createdAt: string };

// GET /api/chat?rooms=1  — list rooms
// GET /api/chat?roomId=xxx&since=iso  — messages in room
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = req.nextUrl;

  if (searchParams.get("rooms")) {
    const rooms = db.prepare("SELECT * FROM chat_rooms ORDER BY createdAt").all() as Room[];
    // Attach last message + unread count per room
    const result = rooms.map(r => {
      const last = db.prepare(
        "SELECT content, userName, createdAt FROM chat_messages WHERE roomId=? ORDER BY createdAt DESC LIMIT 1"
      ).get(r.id) as { content: string; userName: string; createdAt: string } | undefined;
      return { ...r, lastMessage: last ?? null };
    });
    return NextResponse.json(result);
  }

  const roomId = searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 });

  const since = searchParams.get("since");
  const msgs = since
    ? db.prepare("SELECT * FROM chat_messages WHERE roomId=? AND createdAt > ? ORDER BY createdAt ASC LIMIT 100").all(roomId, since) as Message[]
    : db.prepare("SELECT * FROM chat_messages WHERE roomId=? ORDER BY createdAt ASC LIMIT 100").all(roomId) as Message[];

  return NextResponse.json(msgs);
}

// POST /api/chat — send message
export async function POST(req: NextRequest) {
  const { roomId, userId, userName, content } = await req.json();
  if (!roomId || !userId || !content?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const db = getDb();
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO chat_messages (id, roomId, userId, userName, content, createdAt) VALUES (?,?,?,?,?,?)")
    .run(id, roomId, userId, userName, content.trim(), now);

  // Also post to activity feed if room_general
  if (roomId === "room_general") {
    db.prepare("INSERT INTO activity (id, userId, userName, type, content, createdAt) VALUES (?,?,?,?,?,?)")
      .run(`act_${id}`, userId, userName, "message", content.trim(), now);
  }

  return NextResponse.json({ ok: true, id, createdAt: now });
}

// PUT /api/chat — create room
export async function PUT(req: NextRequest) {
  const { name, type, createdBy } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  const db = getDb();
  const id = `room_${Date.now()}`;
  db.prepare("INSERT INTO chat_rooms (id, name, type, createdBy, createdAt) VALUES (?,?,?,?,?)")
    .run(id, name.trim(), type ?? "channel", createdBy, new Date().toISOString());
  return NextResponse.json({ ok: true, id });
}

// DELETE /api/chat — delete room (not default ones)
export async function DELETE(req: NextRequest) {
  const { roomId } = await req.json();
  if (roomId === "room_general" || roomId === "room_announce") {
    return NextResponse.json({ error: "Cannot delete default rooms" }, { status: 400 });
  }
  const db = getDb();
  db.prepare("DELETE FROM chat_rooms WHERE id=?").run(roomId);
  return NextResponse.json({ ok: true });
}
