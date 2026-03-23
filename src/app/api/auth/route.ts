import { NextRequest, NextResponse } from "next/server";
import {
  dbGetUsers, dbGetUserByCredentials, dbGetUserById,
  dbCreateUser, dbUpdateUser, dbDeleteUser,
} from "@/lib/dbAdapter";

// POST /api/auth — login
export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const user = await dbGetUserByCredentials(username, password);
  if (!user || !user.active) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  return NextResponse.json({ id: user.id, name: user.name, username: user.username, role: user.role });
}

// GET /api/auth — list users (no passwords)
export async function GET() {
  const users = await dbGetUsers();
  return NextResponse.json(users);
}

// PUT /api/auth — add or update user
export async function PUT(req: NextRequest) {
  const { id, name, username, password, role, active } = await req.json();
  const now = new Date().toISOString();

  if (id) {
    await dbUpdateUser(id, {
      name, username,
      ...(password ? { password } : {}),
      role, active: active ? 1 : 0,
    });
  } else {
    if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });
    const newId = `user_${Date.now()}`;
    await dbCreateUser({ id: newId, name, username, password, role, createdAt: now });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/auth — remove user
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (id === "user_admin") return NextResponse.json({ error: "Cannot delete admin" }, { status: 400 });
  await dbDeleteUser(id);
  return NextResponse.json({ ok: true });
}

// PATCH /api/auth — validate session (check user still exists)
export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const user = await dbGetUserById(id);
  if (!user || !user.active) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: user.id, name: user.name, role: user.role });
}
