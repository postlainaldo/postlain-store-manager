/**
 * GET /api/placements/stream
 * Server-Sent Events endpoint for realtime placement updates.
 * Any client connected here receives a "refresh" event whenever
 * a placement changes (POST /api/placements calls notifyClients()).
 */

import { NextResponse } from "next/server";
import { sseClients } from "@/lib/sseClients";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      sseClients.add(ctrl);
      // Initial heartbeat
      ctrl.enqueue(encoder.encode(": connected\n\n"));

      // Keep-alive ping every 25s
      const ping = setInterval(() => {
        try { ctrl.enqueue(encoder.encode(": ping\n\n")); }
        catch { clearInterval(ping); sseClients.delete(ctrl); }
      }, 25_000);
    },
    cancel(ctrl) {
      sseClients.delete(ctrl as unknown as ReadableStreamDefaultController<Uint8Array>);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
