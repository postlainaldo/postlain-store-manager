/**
 * Supabase client — server-side only (uses service role key for full access)
 * Used for persistent data storage (Supabase PostgreSQL).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// We use a loose type so we don't need to run supabase gen types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = Record<string, { Row: any; Insert: any; Update: any }>;

declare global {
  // eslint-disable-next-line no-var
  var __supabase: SupabaseClient | undefined;
}

export function getSupabase(): SupabaseClient {
  if (globalThis.__supabase) return globalThis.__supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  // Cast to any to bypass strict table typing (we manage schema manually)
  globalThis.__supabase = createClient(url, key, {
    auth: { persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  return globalThis.__supabase!;
}

/** Returns true when Supabase env vars are configured */
export const IS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);
