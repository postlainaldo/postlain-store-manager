/**
 * Palexy Analytics API client
 * Fetches daily traffic (footfall) data for the store.
 *
 * Auth: session cookie via POST /api/login
 * Traffic endpoint: GET /api/v2/report/getStoreReport
 * Date format: YYYY-MM-DD
 * Response: { rows: [{ store_id, visits, day }] }
 */

const PALEXY_URL = process.env.PALEXY_URL ?? "https://ica.palexy.com";
const PALEXY_EMAIL = process.env.PALEXY_EMAIL ?? "";
const PALEXY_PASSWORD = process.env.PALEXY_PASSWORD ?? "";
const PALEXY_STORE_ID = process.env.PALEXY_STORE_ID ?? "1207"; // ALDO Go! Đà Lạt

// Cache session cookie for 55 minutes
let cachedCookie: string | null = null;
let cookieExpiry = 0;

async function getSessionCookie(): Promise<string> {
  const now = Date.now();
  if (cachedCookie && now < cookieExpiry) return cachedCookie;

  const form = new FormData();
  form.append("username", PALEXY_EMAIL);
  form.append("password", PALEXY_PASSWORD);
  form.append("remember-me", "true");

  const res = await fetch(`${PALEXY_URL}/api/login`, {
    method: "POST",
    headers: { "PAL-STABLE-ID": "550e8400-e29b-41d4-a716-446655440001" },
    body: form,
    redirect: "manual",
  });

  if (res.status !== 200 && res.status !== 302) {
    const body = await res.text().catch(() => "");
    throw new Error(`Palexy login failed (${res.status}): ${body.slice(0, 200)}`);
  }

  // Build cookie string from all set-cookie values
  const setCookie = res.headers.get("set-cookie") ?? "";
  const allCookies = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [setCookie];
  cachedCookie = allCookies.map(c => c.split(";")[0]).join("; ");
  if (!cachedCookie) throw new Error("Palexy login: no session cookie in response");

  cookieExpiry = now + 55 * 60 * 1000;
  return cachedCookie;
}

/**
 * Get list of stores accessible by this account.
 */
export async function getPalexyStores(): Promise<{ id: number; name: string; code: string }[]> {
  const cookie = await getSessionCookie();
  const res = await fetch(`${PALEXY_URL}/api/v2/model/stores?pageIndex=0&pageSize=100`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) throw new Error(`Palexy stores failed (${res.status})`);
  const data = await res.json() as { stores?: { id: number; name: string; code: string }[] };
  return data.stores ?? [];
}

/**
 * Get daily traffic (visit count) for a specific date.
 * @param date YYYY-MM-DD
 * @returns visitor count or null if not available
 */
export async function getPalexyTraffic(date: string): Promise<number | null> {
  if (!PALEXY_EMAIL || !PALEXY_PASSWORD) return null;

  const cookie = await getSessionCookie();
  const params = new URLSearchParams({
    fromDate: date,
    toDate: date,
    dimensions: "store_id,day",
    metrics: "visits",
    storeIds: PALEXY_STORE_ID,
  });

  const res = await fetch(`${PALEXY_URL}/api/v2/report/getStoreReport?${params}`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Palexy report failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    rows?: { store_id: string; visits: string | number | null; day: string }[];
  };

  if (!data.rows?.length) return null;
  const visits = data.rows[0].visits;
  return visits != null ? Math.round(Number(visits)) : null;
}

/**
 * Get daily traffic for a date range in a single API call.
 * @param fromDate YYYY-MM-DD
 * @param toDate   YYYY-MM-DD
 * @returns Map of date string → visitor count (missing dates have null)
 */
export async function getPalexyTrafficRange(
  fromDate: string,
  toDate: string,
): Promise<Map<string, number | null>> {
  if (!PALEXY_EMAIL || !PALEXY_PASSWORD) return new Map();

  const cookie = await getSessionCookie();
  const params = new URLSearchParams({
    fromDate,
    toDate,
    dimensions: "store_id,day",
    metrics: "visits",
    storeIds: PALEXY_STORE_ID,
  });

  const res = await fetch(`${PALEXY_URL}/api/v2/report/getStoreReport?${params}`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Palexy report failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    rows?: { store_id: string; visits: string | number | null; day: string }[];
  };

  const result = new Map<string, number | null>();
  for (const row of data.rows ?? []) {
    const visits = row.visits != null ? Math.round(Number(row.visits)) : null;
    result.set(row.day, visits);
  }
  return result;
}
