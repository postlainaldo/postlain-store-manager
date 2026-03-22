import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/database";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { userId, subscription } = await req.json();
  if (!userId || !subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO push_subs (id, userId, endpoint, p256dh, auth, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET userId=excluded.userId, p256dh=excluded.p256dh, auth=excluded.auth
  `).run(
    randomUUID(),
    userId,
    subscription.endpoint,
    subscription.keys?.p256dh ?? "",
    subscription.keys?.auth ?? "",
    now
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  getDb().prepare("DELETE FROM push_subs WHERE endpoint = ?").run(endpoint);
  return NextResponse.json({ success: true });
}
