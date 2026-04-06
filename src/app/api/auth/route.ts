import { NextRequest, NextResponse } from "next/server";
import {
  dbGetUsers, dbGetUserByCredentials, dbGetUserById,
  dbCreateUser, dbUpdateUser, dbDeleteUser,
} from "@/lib/dbAdapter";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

// POST /api/auth — login
export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const user = await dbGetUserByCredentials(username, password);
  if (!user || !user.active) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  return NextResponse.json({ id: user.id, name: user.name, username: user.username ?? username.trim(), role: user.role, phone: user.phone ?? null, employeeCode: user.employeeCode ?? null });
}

// GET /api/auth — list users (no passwords)
export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const usedKey = svcKey ? "service_role" : anonKey ? "anon" : "none";
  console.log("[auth/GET] url=", url?.slice(0, 30), "key=", usedKey);
  const users = await dbGetUsers();
  console.log("[auth/GET] users count=", users.length);
  return NextResponse.json(users);
}

// PUT /api/auth — add or update user
export async function PUT(req: NextRequest) {
  setActiveStore(getStoreId(req));
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
  setActiveStore(getStoreId(req));
  const { id } = await req.json();
  if (id === "user_admin") return NextResponse.json({ error: "Cannot delete admin" }, { status: 400 });
  await dbDeleteUser(id);
  return NextResponse.json({ ok: true });
}

// PATCH /api/auth — validate session (check user still exists)
export async function PATCH(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const user = await dbGetUserById(id);
  if (!user || !user.active) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: user.id, name: user.name, role: user.role });
}
