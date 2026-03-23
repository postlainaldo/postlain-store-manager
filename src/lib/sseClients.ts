/**
 * Shared SSE client registry.
 * Kept outside route files so Next.js route type checking doesn't
 * complain about non-handler exports.
 */

declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Set<ReadableStreamDefaultController<Uint8Array>> | undefined;
}

// Use globalThis so the singleton survives Next.js hot-reloads
if (!globalThis.__sseClients) {
  globalThis.__sseClients = new Set();
}

export const sseClients = globalThis.__sseClients;

export function notifyClients(data: unknown) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  const enc = new TextEncoder();
  for (const ctrl of sseClients) {
    try { ctrl.enqueue(enc.encode(msg)); } catch { sseClients.delete(ctrl); }
  }
}
