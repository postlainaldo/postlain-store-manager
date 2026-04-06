import { NextRequest, NextResponse } from "next/server";
import { IS_SUPABASE, getSupabase, getActiveStoreId, setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

type ActivityRow = { id: string; userId: string; userName: string; type: string; content: string; createdAt: string };

// GET /api/activity — recent activity feed
export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));

  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("activity")
      .select("id, userId:user_id, userName:user_name, type, content, createdAt:created_at")
      .eq("store_id", getActiveStoreId())
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      // Table may not exist yet — return empty array gracefully
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } else {
    const getDb = (await import("@/lib/database")).default;
    const db = getDb(getActiveStoreId());
    const rows = db.prepare(
      "SELECT id, userId, userName, type, content, createdAt FROM activity ORDER BY createdAt DESC LIMIT 50"
    ).all() as ActivityRow[];
    return NextResponse.json(rows);
  }
}

// POST /api/activity — post a message/status
export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { userId, userName, type, content } = await req.json();
  if (!userId || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { error } = await sb.from("activity").insert({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      store_id: getActiveStoreId(),
      user_id: userId,
      user_name: userName,
      type: type ?? "message",
      content,
      created_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } else {
    const getDb = (await import("@/lib/database")).default;
    const db = getDb(getActiveStoreId());
    db.prepare(
      "INSERT INTO activity (id, userId, userName, type, content, createdAt) VALUES (?,?,?,?,?,?)"
    ).run(`act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, userId, userName, type ?? "message", content, new Date().toISOString());
    return NextResponse.json({ ok: true });
  }
}
