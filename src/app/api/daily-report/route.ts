import { NextRequest, NextResponse } from "next/server";
import { buildMorningReport, buildEveningReport, buildOverviewReport } from "@/lib/odooReports";
import { getPalexyTraffic, getPalexyTrafficRange } from "@/lib/palexy";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel: allow up to 60s for Odoo calls

/**
 * GET /api/daily-report?type=morning&date=2026-03-24
 * GET /api/daily-report?type=evening&date=2026-03-24
 * GET /api/daily-report?type=overview&from=2026-03-18&to=2026-03-24
 */
export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "morning";
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  try {
    if (type === "morning" || type === "evening") {
      if (!date) return NextResponse.json({ ok: false, error: "date required" }, { status: 400 });

      if (type === "morning") {
        const traffic = await getPalexyTraffic(date).catch(() => null);
        const report = await buildMorningReport(date, traffic);
        const today = new Date().toISOString().slice(0, 10);
        const maxAge = date < today ? 3600 : 300;
        return NextResponse.json({ ok: true, report }, {
          headers: { "Cache-Control": `s-maxage=${maxAge}, stale-while-revalidate=600` },
        });
      }

      const report = await buildEveningReport(date);
      const today = new Date().toISOString().slice(0, 10);
      const maxAge = date < today ? 3600 : 300;
      return NextResponse.json({ ok: true, report }, {
        headers: { "Cache-Control": `s-maxage=${maxAge}, stale-while-revalidate=600` },
      });
    }

    if (type === "overview") {
      const fromDate = from ?? date ?? "";
      const toDate   = to   ?? date ?? fromDate;
      if (!fromDate) return NextResponse.json({ ok: false, error: "from or date required" }, { status: 400 });

      // Build date range
      const dates: string[] = [];
      const cur = new Date(fromDate + "T12:00:00");
      const end = new Date(toDate + "T12:00:00");
      while (cur <= end) {
        dates.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
      if (dates.length > 31) return NextResponse.json({ ok: false, error: "max 31 days" }, { status: 400 });

      // Fetch traffic for the whole range in ONE API call instead of N parallel calls
      const trafficMap = await getPalexyTrafficRange(fromDate, toDate).catch(() => new Map<string, number | null>());

      const result = await buildOverviewReport(dates, trafficMap);
      const todayStr = new Date().toISOString().slice(0, 10);
      const rangeIsPast = toDate < todayStr;
      return NextResponse.json({ ok: true, ...result }, {
        headers: {
          "Cache-Control": rangeIsPast
            ? "s-maxage=7200, stale-while-revalidate=3600"   // past range: cache 2h
            : "s-maxage=300, stale-while-revalidate=600",     // includes today: 5min
        },
      });
    }

    return NextResponse.json({ ok: false, error: "type must be morning, evening, or overview" }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
