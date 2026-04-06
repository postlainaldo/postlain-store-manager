import { NextRequest, NextResponse } from "next/server";
import { dbUpsertPushSub, dbDeletePushSub } from "@/lib/dbAdapter";
import { randomUUID } from "crypto";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { userId, subscription } = await req.json();
  if (!userId || !subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  await dbUpsertPushSub({
    id: randomUUID(),
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys?.p256dh ?? "",
    auth: subscription.keys?.auth ?? "",
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await dbDeletePushSub(endpoint);
  return NextResponse.json({ success: true });
}
