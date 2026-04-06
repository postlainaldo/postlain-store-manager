/**
 * Supabase client — server-side only (uses service role key for full access)
 * Used for persistent data storage (Supabase PostgreSQL).
 *
 * Multi-tenant: dùng chung 1 Supabase project, phân tách bằng cột store_id.
 * Dùng getSupabaseForStore(storeId) để lấy client đã set default filter.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var __supabase: SupabaseClient | undefined;
}

export function getSupabase(): SupabaseClient {
  if (globalThis.__supabase) return globalThis.__supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.__supabase = createClient(url, key, { auth: { persistSession: false } }) as any;
  return globalThis.__supabase!;
}

/** Returns true when Supabase env vars are configured */
export const IS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

/**
 * Active storeId được set bởi API route trước khi gọi dbAdapter.
 * Pattern: setActiveStore(storeId) → dbAdapter functions → reset.
 *
 * Dùng AsyncLocalStorage trong tương lai nếu concurrency là vấn đề.
 * Hiện tại Next.js route handlers là sequential per-request nên safe.
 */
let _activeStoreId = process.env.STORE_ID ?? "postlain";

export function setActiveStore(id: string) {
  _activeStoreId = id;
}

export function getActiveStoreId(): string {
  return _activeStoreId;
}
