import { NextRequest } from "next/server";
import getDb from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Message = {
  id: string; roomId: string; userId: string;
  userName: string; content: string; createdAt: string;
};

// GET /api/chat/stream?roomId=xxx&since=iso
// Returns SSE stream — sends new messages as they arrive (polls DB every 1s)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const roomId = searchParams.get("roomId");
  if (!roomId) {
    return new Response("Missing roomId", { status: 400 });
  }

  let since = searchParams.get("since") ?? new Date(Date.now() - 5000).toISOString();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(": connected\n\n"));

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream closed
        }
      };

      const poll = () => {
        try {
          const db = getDb();
          const msgs = db.prepare(
            "SELECT * FROM chat_messages WHERE roomId=? AND createdAt > ? ORDER BY createdAt ASC LIMIT 50"
          ).all(roomId, since) as Message[];

          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            since = last.createdAt;
            send({ type: "messages", data: msgs });
          } else {
            // Heartbeat every 15s to keep connection alive
            send({ type: "ping" });
          }
        } catch {
          // DB error — keep polling
        }
      };

      // Poll every 800ms for near-instant updates
      const interval = setInterval(poll, 800);

      // Also send room list updates every 5s
      const roomInterval = setInterval(() => {
        try {
          const db = getDb();
          const rooms = db.prepare("SELECT * FROM chat_rooms ORDER BY createdAt").all();
          const result = (rooms as Record<string, unknown>[]).map((r) => {
            const last = db.prepare(
              "SELECT content, userName, createdAt FROM chat_messages WHERE roomId=? ORDER BY createdAt DESC LIMIT 1"
            ).get(r.id as string) as { content: string; userName: string; createdAt: string } | undefined;
            return { ...r, lastMessage: last ?? null };
          });
          send({ type: "rooms", data: result });
        } catch {/**/}
      }, 5000);

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(roomInterval);
        try { controller.close(); } catch {/**/}
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
