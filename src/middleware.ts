import { NextRequest, NextResponse } from "next/server";

/**
 * Multi-tenant middleware
 *
 * Đọc storeId từ cookie "plsm_store_id" và forward vào header "x-store-id"
 * để các API route có thể lấy đúng DB mà không cần đọc cookie thủ công.
 *
 * Nếu STORE_ID env var được set (single-tenant Coolify deploy), dùng luôn giá trị đó.
 */
export function middleware(req: NextRequest) {
  // Single-tenant mode (env var override)
  const envStoreId = process.env.STORE_ID;
  if (envStoreId) {
    const res = NextResponse.next();
    res.headers.set("x-store-id", envStoreId);
    return res;
  }

  // Multi-tenant: lấy từ cookie
  const cookieStoreId = req.cookies.get("plsm_store_id")?.value;
  const storeId = cookieStoreId || "postlain";

  // Chỉ apply cho API routes — pages tự xử lý via client-side localStorage
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.set("x-store-id", storeId);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
