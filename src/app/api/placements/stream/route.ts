/**
 * GET /api/placements/stream
 * Server-Sent Events endpoint for realtime placement updates.
 * Any client connected here receives a "refresh" event whenever
 * a placement changes (POST /api/placements calls notifyClients()).
 */

import { NextResponse } from "next/server";

// Global set of active SSE writers
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();

export function notifyClients(data: unknown) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  const enc = new TextEncoder();
  for (const ctrl of clients) {
    try { ctrl.enqueue(enc.encode(msg)); } catch { clients.delete(ctrl); }
  }
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      clients.add(ctrl);
      // Initial heartbeat
      ctrl.enqueue(encoder.encode(": connected\n\n"));

      // Keep-alive ping every 25s
      const ping = setInterval(() => {
        try { ctrl.enqueue(encoder.encode(": ping\n\n")); }
        catch { clearInterval(ping); clients.delete(ctrl); }
      }, 25_000);
    },
    cancel(ctrl) {
      clients.delete(ctrl as unknown as ReadableStreamDefaultController<Uint8Array>);
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
