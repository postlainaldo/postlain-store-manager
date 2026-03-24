import { NextRequest, NextResponse } from "next/server";
import { dbGetDailyReports, dbGetDailyReportByDate, dbUpsertDailyReport, DBDailyReport } from "@/lib/dbAdapter";
import { dbGetPosSummary, dbGetTopProducts } from "@/lib/dbAdapter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const shift = searchParams.get("shift");

  // Get a specific report
  if (date && shift) {
    const report = await dbGetDailyReportByDate(date, shift);
    return NextResponse.json({ ok: true, report });
  }

  // Get prefill data from POS for a given date
  if (date && searchParams.get("action") === "prefill") {
    const dayStart = new Date(date + "T00:00:00").toISOString();
    const dayEnd   = new Date(date + "T23:59:59").toISOString();
    try {
      const [summary, topProducts] = await Promise.all([
        dbGetPosSummary(dayStart, dayEnd),
        dbGetTopProducts(dayStart, 10, dayEnd),
      ]);
      return NextResponse.json({ ok: true, summary, topProducts });
    } catch {
      return NextResponse.json({ ok: true, summary: null, topProducts: [] });
    }
  }

  // List recent reports
  const reports = await dbGetDailyReports(60);
  return NextResponse.json({ ok: true, reports });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<DBDailyReport>;
    if (!body.date || !body.shift) {
      return NextResponse.json({ ok: false, error: "date and shift required" }, { status: 400 });
    }
    const now = new Date().toISOString();
    // Use date+shift as stable ID (one report per shift per day)
    const id = `report-${body.date}-${body.shift}`;
    const report: DBDailyReport = {
      id,
      date: body.date,
      shift: body.shift as "start" | "end",
      revTotal:    body.revTotal    ?? 0,
      revCash:     body.revCash     ?? 0,
      revCard:     body.revCard     ?? 0,
      revTransfer: body.revTransfer ?? 0,
      revVnpay:    body.revVnpay    ?? 0,
      revMomo:     body.revMomo     ?? 0,
      revUrbox:    body.revUrbox    ?? 0,
      revNinja:    body.revNinja    ?? 0,
      revOther:    body.revOther    ?? 0,
      revHB:       body.revHB       ?? 0,
      revSC:       body.revSC       ?? 0,
      revACC:      body.revACC      ?? 0,
      traffic:     body.traffic     ?? 0,
      bills:       body.bills       ?? 0,
      qtyTotal:    body.qtyTotal    ?? 0,
      conversion:  body.conversion  ?? 0,
      aov:         body.aov         ?? 0,
      ipt:         body.ipt         ?? 0,
      targetDay:   body.targetDay   ?? 0,
      note:        body.note        ?? "",
      preparedBy:  body.preparedBy  ?? "",
      createdAt:   body.createdAt   ?? now,
      updatedAt:   now,
    };
    await dbUpsertDailyReport(report);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
