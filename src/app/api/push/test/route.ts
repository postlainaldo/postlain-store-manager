/**
 * GET  /api/push/test  — debug: show subscriptions + VAPID config
 * POST /api/push/test  — send a test push to all subscribed devices
 */
import { NextRequest, NextResponse } from "next/server";
import { dbGetPushSubs } from "@/lib/dbAdapter";
import { sendPushToAll } from "@/lib/push";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function GET() {
  const subs = await dbGetPushSubs();
  return NextResponse.json({
    vapidPublic:  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "✓ set" : "✗ missing",
    vapidPrivate: process.env.VAPID_PRIVATE_KEY            ? "✓ set" : "✗ missing",
    vapidEmail:   process.env.VAPID_EMAIL                  ?? "✗ missing",
    subscriptions: subs.length,
    endpoints: subs.map(s => ({
      userId:   s.userId,
      endpoint: s.endpoint.slice(0, 60) + "…",
    })),
  });
}

export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const body = await req.json().catch(() => ({}));
  const title = body.title ?? "Test Push";
  const message = body.body ?? "Thông báo kiểm tra từ Postlain";

  const subs = await dbGetPushSubs();
  if (!subs.length) {
    return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
  }

  const results = await sendPushToAll({ title, body: message, type: "info", url: "/" });
  return NextResponse.json({ sent: subs.length, results: results?.length });
}
