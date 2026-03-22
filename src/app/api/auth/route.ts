import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/database";

// POST /api/auth — login
export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const db = getDb();
  const user = db.prepare(
    "SELECT id, name, username, role, active FROM users WHERE username = ? AND passwordHash = ? COLLATE NOCASE"
  ).get(username.trim().toLowerCase(), password) as { id: string; name: string; username: string; role: string; active: number } | undefined;

  if (!user || !user.active) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  return NextResponse.json({ id: user.id, name: user.name, username: user.username, role: user.role });
}

// GET /api/auth — list users (admin only, no passwords)
export async function GET() {
  const db = getDb();
  const users = db.prepare("SELECT id, name, username, role, active, createdAt FROM users ORDER BY createdAt").all();
  return NextResponse.json(users);
}

// PUT /api/auth — add or update user
export async function PUT(req: NextRequest) {
  const { id, name, username, password, role, active } = await req.json();
  const db = getDb();
  const now = new Date().toISOString();

  if (id) {
    // Update existing
    if (password) {
      db.prepare("UPDATE users SET name=?, username=?, passwordHash=?, role=?, active=? WHERE id=?")
        .run(name, username.toLowerCase(), password, role, active ? 1 : 0, id);
    } else {
      db.prepare("UPDATE users SET name=?, username=?, role=?, active=? WHERE id=?")
        .run(name, username.toLowerCase(), role, active ? 1 : 0, id);
    }
  } else {
    // Insert new
    const newId = `user_${Date.now()}`;
    db.prepare("INSERT INTO users (id, name, username, passwordHash, role, active, createdAt) VALUES (?,?,?,?,?,?,?)")
      .run(newId, name, username.toLowerCase(), password, role, 1, now);
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/auth — remove user
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (id === "user_admin") return NextResponse.json({ error: "Cannot delete admin" }, { status: 400 });
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
