/**
 * Supabase client — server-side only (uses service role key for full access)
 *
 * Multi-tenant: mỗi store có Supabase project riêng.
 * Dùng getSupabase() để lấy client đúng store đang active.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Per-store Supabase credentials ──────────────────────────────────────────

type StoreCredentials = {
  url: string;
  key: string;
};

const STORE_CREDENTIALS: Record<string, StoreCredentials> = {
  postlain: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  royvilla: {
    url: process.env.ROYVILLA_SUPABASE_URL ?? "https://owidlhxqawukduqvlikd.supabase.co",
    key: process.env.ROYVILLA_SUPABASE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93aWRsaHhxYXd1a2R1cXZsaWtkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ4MTkyOSwiZXhwIjoyMDkxMDU3OTI5fQ.GL9OBUEmPUI2z57RWIQ6K9ViuU7WSgPGdh7rEIw7msI",
  },
};

// ─── Active store context ─────────────────────────────────────────────────────

let _activeStoreId = process.env.STORE_ID ?? "postlain";

export function setActiveStore(id: string) {
  _activeStoreId = id;
}

export function getActiveStoreId(): string {
  return _activeStoreId;
}

// ─── Client factory ───────────────────────────────────────────────────────────

export function getSupabase(): SupabaseClient {
  const storeId = _activeStoreId;
  const creds = STORE_CREDENTIALS[storeId] ?? STORE_CREDENTIALS["postlain"];
  const { url, key } = creds;
  if (!url || !key) throw new Error(`Supabase credentials not set for store: ${storeId}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(url, key, { auth: { persistSession: false } }) as any;
}

/** Returns true when current active store has Supabase credentials */
export function getIsSupabase(): boolean {
  const storeId = _activeStoreId;
  const creds = STORE_CREDENTIALS[storeId] ?? STORE_CREDENTIALS["postlain"];
  return !!(creds.url && creds.key);
}

/** Legacy constant — true when postlain Supabase env vars are set OR royvilla is active */
export const IS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);
