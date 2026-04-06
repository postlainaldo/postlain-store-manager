import { NextRequest, NextResponse } from "next/server";
import { dbGetUserById, dbGetUsers, dbUpdateUser } from "@/lib/dbAdapter";
import { IS_SUPABASE } from "@/lib/supabase";
import { getSupabase } from "@/lib/supabase";
import getDb from "@/lib/database";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

// GET /api/profile?id=xxx — get single user
// GET /api/profile       — all users (team view)
export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const user = await dbGetUserById(id);
    if (!user || !user.active) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
  }
  const users = await dbGetUsers();
  return NextResponse.json(users);
}

// PUT /api/profile — update profile fields
export async function PUT(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { id, name, fullName, bio, phone, avatar, status } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await dbUpdateUser(id, {
    name: name ?? "",
    fullName: fullName ?? "",
    bio: bio ?? "",
    phone: phone ?? "",
    avatar: avatar ?? null,
    status: status ?? "online",
  });

  // Log activity
  try {
    const actId = `act_${Date.now()}`;
    const now = new Date().toISOString();
    if (IS_SUPABASE) {
      const user = await dbGetUserById(id);
      await getSupabase().from("activity").insert({
        id: actId, userId: id, userName: user?.name ?? "Unknown",
        type: "profile_update", content: "đã cập nhật hồ sơ cá nhân", createdAt: now,
      });
    } else {
      const db = getDb();
      const user = db.prepare("SELECT name FROM users WHERE id=?").get(id) as { name: string } | undefined;
      db.prepare(
        "INSERT INTO activity (id, userId, userName, type, content, createdAt) VALUES (?,?,?,?,?,?)"
      ).run(actId, id, user?.name ?? "Unknown", "profile_update", "đã cập nhật hồ sơ cá nhân", now);
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true });
}
