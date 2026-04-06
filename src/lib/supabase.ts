/**
 * Supabase client — server-side only (uses service role key for full access)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Active store context ─────────────────────────────────────────────────────

let _activeStoreId = process.env.STORE_ID ?? "postlain";

export function setActiveStore(id: string) {
  _activeStoreId = id;
}

export function getActiveStoreId(): string {
  return _activeStoreId;
}

// ─── Client factory ───────────────────────────────────────────────────────────

const _url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const _key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function getSupabase(): SupabaseClient {
  if (!_url || !_key) throw new Error("Supabase credentials not set");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(_url, _key, { auth: { persistSession: false } }) as any;
}

export function getIsSupabase(): boolean {
  return !!(_url && _key);
}

export const IS_SUPABASE = !!(_url && _key);
