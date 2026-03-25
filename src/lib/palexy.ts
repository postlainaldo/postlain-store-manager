/**
 * Palexy Analytics API client
 * Fetches daily traffic (footfall) data for the store.
 *
 * Auth: session cookie via POST /api/login
 * Traffic endpoint: GET /api/v2/report/getStoreReport
 */

const PALEXY_URL = process.env.PALEXY_URL ?? "https://ica.palexy.com";
const PALEXY_EMAIL = process.env.PALEXY_EMAIL ?? "";
const PALEXY_PASSWORD = process.env.PALEXY_PASSWORD ?? "";
const PALEXY_STORE_ID = process.env.PALEXY_STORE_ID ?? "";

// Cache session cookie for 1 hour
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

  // Extract session cookie from set-cookie header
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/(?:JSESSIONID|remember-me)=([^;]+)/);
  if (!match) throw new Error("Palexy login: no session cookie in response");

  // Build cookie string from all set-cookie values
  const allCookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [setCookie];
  cachedCookie = allCookies
    .map(c => c.split(";")[0])
    .join("; ");
  cookieExpiry = now + 55 * 60 * 1000; // 55 minutes

  return cachedCookie;
}

/**
 * Get list of stores accessible by this account.
 * Use this to find the storeId for ALDO Đà Lạt.
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

  // Date format for Palexy: YYYYMMDD
  const palexyDate = date.replace(/-/g, "");
  const storeId = PALEXY_STORE_ID;

  const cookie = await getSessionCookie();
  const params = new URLSearchParams({
    fromDate: palexyDate,
    toDate: palexyDate,
    dimensions: "store_id,day",
    metrics: "visits",
  });
  if (storeId) params.set("storeIds", storeId);

  const res = await fetch(`${PALEXY_URL}/api/v2/report/getStoreReport?${params}`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Palexy report failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    rows?: { dimensionValues: string[]; metricValues: (number | null)[] }[];
  };

  if (!data.rows?.length) return null;

  // metricValues[0] = visits
  const visits = data.rows[0].metricValues[0];
  return visits != null ? Math.round(visits) : null;
}
