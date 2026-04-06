import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/database";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

type ActivityRow = { id: string; userId: string; userName: string; type: string; content: string; createdAt: string };

// GET /api/activity — recent activity feed
export async function GET() {
  const db = getDb();
  const rows = db.prepare(
    "SELECT id, userId, userName, type, content, createdAt FROM activity ORDER BY createdAt DESC LIMIT 50"
  ).all() as ActivityRow[];
  return NextResponse.json(rows);
}

// POST /api/activity — post a message/status
export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { userId, userName, type, content } = await req.json();
  if (!userId || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = getDb();
  db.prepare(
    "INSERT INTO activity (id, userId, userName, type, content, createdAt) VALUES (?,?,?,?,?,?)"
  ).run(`act_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, userId, userName, type ?? "message", content, new Date().toISOString());
  return NextResponse.json({ ok: true });
}
