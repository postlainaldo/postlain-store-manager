import { NextRequest, NextResponse } from "next/server";
import { dbGetDailyReports, dbGetDailyReportByDate, dbUpsertDailyReport, DBDailyReport } from "@/lib/dbAdapter";
import { dbGetPosSummary, dbGetTopProducts, dbGetPosOrders } from "@/lib/dbAdapter";
import { getPalexyTraffic } from "@/lib/palexy";

export const dynamic = "force-dynamic";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");        // YYYY-MM-DD
  const shift = searchParams.get("shift");
  const action = searchParams.get("action");

  // /api/reports?date=2026-03-24&action=daily
  // Returns the full auto-generated daily dashboard from Odoo data
  if (date && action === "daily") {
    // Vietnam is UTC+7 — convert local date to UTC range
    const dayStart = new Date(date + "T00:00:00+07:00").toISOString();
    const dayEnd   = new Date(date + "T23:59:59+07:00").toISOString();

    if (!process.env.ODOO_URL) {
      return NextResponse.json({ ok: false, error: "ODOO_URL chưa được cấu hình trên server. Vui lòng thêm env var ODOO_URL." }, { status: 503 });
    }

    try {
      const [summary, topProducts, orders, savedReport, palexyTraffic] = await Promise.all([
        dbGetPosSummary(dayStart, dayEnd),
        dbGetTopProducts(dayStart, 20, dayEnd),
        dbGetPosOrders({ dateFrom: dayStart, limit: 200 }),
        date ? dbGetDailyReportByDate(date, "end") : Promise.resolve(null),
        getPalexyTraffic(date).catch(() => null),
      ]);

      // Filter orders to just this day
      const dayOrders = orders.filter(o => o.createdAt >= dayStart && o.createdAt <= dayEnd);

      return NextResponse.json({
        ok: true,
        date,
        odoo: {
          revTotal:   summary.totalRevenue,
          bills:      summary.orderCount,
          qtyTotal:   summary.qtyTotal,
          aov:        summary.avgOrderValue,
          ipt:        summary.orderCount > 0 ? summary.qtyTotal / summary.orderCount : 0,
        },
        topProducts,
        orders: dayOrders.map(o => ({
          id: o.id,
          name: o.name,
          customerName: o.customerName,
          amountTotal: o.amountTotal,
          lineCount: o.lineCount,
          createdAt: o.createdAt,
        })),
        // Saved manual data (traffic, target, HB/SC/ACC override)
        saved: savedReport,
        // Auto traffic from Palexy (null if not configured or unavailable)
        palexyTraffic,
      });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  // Get a specific saved report
  if (date && shift) {
    const report = await dbGetDailyReportByDate(date, shift);
    return NextResponse.json({ ok: true, report });
  }

  // List recent saved reports
  const reports = await dbGetDailyReports(60);
  return NextResponse.json({ ok: true, reports });
}

// ─── POST — save manual fields (traffic, target, HB/SC/ACC notes) ────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<DBDailyReport>;
    if (!body.date || !body.shift) {
      return NextResponse.json({ ok: false, error: "date and shift required" }, { status: 400 });
    }
    const now = new Date().toISOString();
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
