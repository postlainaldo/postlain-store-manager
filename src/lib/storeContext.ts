import { NextRequest, headers } from "next/headers";

/**
 * Lấy storeId từ request hiện tại.
 * Dùng trong API route handlers để route đúng DB.
 *
 * Thứ tự ưu tiên:
 *   1. STORE_ID env var (single-tenant Coolify deploy)
 *   2. x-store-id header (set bởi middleware từ cookie)
 *   3. Fallback "postlain"
 */
export function getStoreId(req?: NextRequest): string {
  if (process.env.STORE_ID) return process.env.STORE_ID;

  if (req) {
    return req.headers.get("x-store-id") || "postlain";
  }

  // Server Component context (no req object)
  try {
    const hdrs = headers();
    return (hdrs as unknown as Headers).get("x-store-id") || "postlain";
  } catch {
    return "postlain";
  }
}
