import { NextRequest, NextResponse } from "next/server";
import { dbGetCustomers, dbSearchCustomers, dbGetPosOrders } from "@/lib/dbAdapter";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const limit = parseInt(searchParams.get("limit") ?? "200");

  try {
    if (customerId) {
      // Get customer orders history
      const orders = await dbGetPosOrders({ customerId, limit: 50 });
      return NextResponse.json({ ok: true, orders });
    }

    if (q.trim().length >= 2) {
      const customers = await dbSearchCustomers(q.trim());
      return NextResponse.json({ ok: true, customers });
    }

    const customers = await dbGetCustomers(limit);
    return NextResponse.json({ ok: true, customers });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
