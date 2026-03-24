import { NextRequest, NextResponse } from "next/server";
import { dbGetPosOrders, dbGetPosOrderLines, dbGetPosSummary, dbGetTopProducts } from "@/lib/dbAdapter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "orders";
  const customerId = searchParams.get("customerId") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "100");
  const orderId = searchParams.get("orderId") ?? undefined;

  // Date helpers
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    if (action === "lines" && orderId) {
      const lines = await dbGetPosOrderLines(orderId);
      return NextResponse.json({ ok: true, lines });
    }

    if (action === "summary") {
      const [today, week, month] = await Promise.all([
        dbGetPosSummary(todayStart),
        dbGetPosSummary(weekStart),
        dbGetPosSummary(monthStart),
      ]);
      return NextResponse.json({ ok: true, today, week, month });
    }

    if (action === "top-products") {
      const period = searchParams.get("period") ?? "month";
      const dateFrom = period === "today" ? todayStart : period === "week" ? weekStart : monthStart;
      const topProducts = await dbGetTopProducts(dateFrom, 20);
      return NextResponse.json({ ok: true, topProducts });
    }

    // Default: orders list
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const orders = await dbGetPosOrders({ limit, customerId, dateFrom });
    return NextResponse.json({ ok: true, orders });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
