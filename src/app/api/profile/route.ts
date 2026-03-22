import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/database";

type UserRow = {
  id: string; name: string; fullName: string; username: string;
  role: string; active: number; avatar: string | null;
  status: string; bio: string; phone: string; createdAt: string;
};

// GET /api/profile?id=xxx
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const db = getDb();
  if (id) {
    const user = db.prepare(
      "SELECT id, name, fullName, username, role, active, avatar, status, bio, phone, createdAt FROM users WHERE id = ?"
    ).get(id) as UserRow | undefined;
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
  }
  // All users (for team view)
  const users = db.prepare(
    "SELECT id, name, fullName, username, role, active, avatar, status, bio, phone, createdAt FROM users ORDER BY createdAt"
  ).all() as UserRow[];
  return NextResponse.json(users);
}

// PUT /api/profile — update profile
export async function PUT(req: NextRequest) {
  const { id, name, fullName, bio, phone, avatar, status } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = getDb();
  db.prepare(
    "UPDATE users SET name=?, fullName=?, bio=?, phone=?, avatar=?, status=? WHERE id=?"
  ).run(
    name ?? "",
    fullName ?? "",
    bio ?? "",
    phone ?? "",
    avatar ?? null,
    status ?? "online",
    id
  );

  // Log activity
  const user = db.prepare("SELECT name FROM users WHERE id=?").get(id) as { name: string } | undefined;
  db.prepare(
    "INSERT INTO activity (id, userId, userName, type, content, createdAt) VALUES (?,?,?,?,?,?)"
  ).run(
    `act_${Date.now()}`,
    id,
    user?.name ?? "Unknown",
    "profile_update",
    "đã cập nhật hồ sơ cá nhân",
    new Date().toISOString()
  );

  return NextResponse.json({ ok: true });
}
