import { NextRequest, NextResponse } from "next/server";
import { buildMorningReport, buildEveningReport, buildOverviewReport } from "@/lib/odooReports";
import { getPalexyTraffic } from "@/lib/palexy";

export const dynamic = "force-dynamic";

/**
 * GET /api/daily-report?type=morning&date=2026-03-24
 * GET /api/daily-report?type=evening&date=2026-03-24
 * GET /api/daily-report?type=overview&from=2026-03-18&to=2026-03-24
 */
export async function GET(req: NextRequest) {
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
        return NextResponse.json({ ok: true, report });
      }

      const report = await buildEveningReport(date);
      return NextResponse.json({ ok: true, report });
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

      // Fetch traffic for all dates in parallel
      const trafficEntries = await Promise.all(
        dates.map(async d => [d, await getPalexyTraffic(d).catch(() => null)] as [string, number | null])
      );
      const trafficMap = new Map<string, number | null>(trafficEntries);

      const result = await buildOverviewReport(dates, trafficMap);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: false, error: "type must be morning, evening, or overview" }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
