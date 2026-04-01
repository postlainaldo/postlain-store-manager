import { NextRequest, NextResponse } from "next/server";
import { getPalexyTraffic, getPalexyStores } from "@/lib/palexy";

export const dynamic = "force-dynamic";

// GET /api/palexy?date=2026-03-24          → returns { traffic: 123 }
// GET /api/palexy?action=stores            → returns list of stores (for setup)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const action = searchParams.get("action");

  if (action === "stores") {
    try {
      const stores = await getPalexyStores();
      return NextResponse.json({ ok: true, stores });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  if (date) {
    try {
      const traffic = await getPalexyTraffic(date);
      // Cache past dates for 6h, today for 30min (data won't change retroactively)
      const today = new Date().toISOString().slice(0, 10);
      const maxAge = date < today ? 21600 : 1800;
      return NextResponse.json({ ok: true, date, traffic }, {
        headers: { "Cache-Control": `s-maxage=${maxAge}, stale-while-revalidate=3600` },
      });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "date or action=stores required" }, { status: 400 });
}
