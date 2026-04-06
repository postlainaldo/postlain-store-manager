import { NextRequest } from "next/server";
import { dbGetMessages, dbGetRooms } from "@/lib/dbAdapter";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export const dynamic = "force-dynamic";

// GET /api/chat/stream?roomId=xxx&since=iso
// Returns SSE stream — polls DB every 1s for new messages
export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { searchParams } = req.nextUrl;
  const roomId = searchParams.get("roomId");
  if (!roomId) return new Response("Missing roomId", { status: 400 });

  let since = searchParams.get("since") ?? new Date(Date.now() - 5000).toISOString();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* stream closed */ }
      };

      let stopped = false;

      const poll = async () => {
        if (stopped) return;
        try {
          const msgs = await dbGetMessages(roomId, since);
          if (msgs.length > 0) {
            since = msgs[msgs.length - 1].createdAt;
            send({ type: "messages", data: msgs });
          } else {
            send({ type: "ping" });
          }
          // Broadcast typing indicators from global map
          const typingMap = (globalThis as Record<string, unknown>).__typingMap as Map<string, { userName: string; expires: number }> | undefined;
          if (typingMap) {
            const now = Date.now();
            const active: string[] = [];
            for (const [key, val] of typingMap) {
              if (key.startsWith(`${roomId}:`) && val.expires > now) {
                active.push(val.userName);
              } else if (val.expires <= now) {
                typingMap.delete(key);
              }
            }
            send({ type: "typing", data: active });
          }
        } catch { /* DB error — keep polling */ }
      };

      const roomPoll = async () => {
        if (stopped) return;
        try {
          const rooms = await dbGetRooms();
          send({ type: "rooms", data: rooms });
        } catch { /* ignore */ }
      };

      const interval = setInterval(poll, 1000);
      const roomInterval = setInterval(roomPoll, 6000);

      req.signal.addEventListener("abort", () => {
        stopped = true;
        clearInterval(interval);
        clearInterval(roomInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
