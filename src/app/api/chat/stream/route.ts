import { NextRequest } from "next/server";
import { dbGetMessages, dbGetRooms } from "@/lib/dbAdapter";

export const dynamic = "force-dynamic";

// GET /api/chat/stream?roomId=xxx&since=iso
// Returns SSE stream — polls DB every 1s for new messages
export async function GET(req: NextRequest) {
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
