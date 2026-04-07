import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { IS_SUPABASE, getSupabase, getActiveStoreId } from "@/lib/supabase";
import getDb from "@/lib/database";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

// ── Mã ca từ giờ ─────────────────────────────────────────────────────────────
const SHIFT_CODES: Record<string, string> = {
  "07:30-15:30": "A",  "14:00-22:00": "B",  "12:00-20:00": "C",
  "07:30-11:30": "A1", "09:00-13:00": "A2", "11:00-15:00": "A3",
  "12:00-16:00": "A4", "15:00-19:00": "B1", "17:00-21:00": "B2",
  "18:00-22:00": "B3",
};
function getShiftCode(start: string, end: string): string {
  const key = `${start.slice(0, 5)}-${end.slice(0, 5)}`;
  return SHIFT_CODES[key] ?? `${start.slice(0, 5)}-${end.slice(0, 5)}`;
}

const DAYS_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAYS_VI = ["CN",  "T2",  "T3",  "T4",  "T5",  "T6",  "T7"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                   "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

type StaffRow = { id: string; name: string; fullName?: string | null; role: string; username: string; phone: string | null };
type SlotRow  = { id: string; date: string; startTime: string; endTime: string };
type RegRow   = { slotId: string; userId: string; status: string };

async function fetchData(dateFrom: string, dateTo: string) {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const sid = getActiveStoreId();
    const [staffRes, slotsRes, regsRes] = await Promise.all([
      sb.from("users").select("id, name, fullName, role, username, phone")
        .eq("active", 1).eq("store_id", sid).order("role").order("name"),
      sb.from("shift_slots").select("id, date, startTime, endTime")
        .eq("store_id", sid).gte("date", dateFrom).lte("date", dateTo).order("date").order("startTime"),
      sb.from("shift_registrations").select("slotId, userId, status")
        .eq("store_id", sid).in("status", ["approved", "pending"]),
    ]);
    const slots = (slotsRes.data ?? []) as SlotRow[];
    const slotIds = new Set(slots.map(s => s.id));
    const regs = ((regsRes.data ?? []) as RegRow[]).filter(r => slotIds.has(r.slotId));
    return { staff: (staffRes.data ?? []) as StaffRow[], slots, regs };
  } else {
    const db = getDb(getActiveStoreId());
    const staff = db.prepare(
      "SELECT id, name, fullName, role, username, phone FROM users WHERE active = 1 ORDER BY role, name"
    ).all() as StaffRow[];
    const slots = db.prepare(
      "SELECT id, date, startTime, endTime FROM shift_slots WHERE date >= ? AND date <= ? ORDER BY date, startTime"
    ).all(dateFrom, dateTo) as SlotRow[];
    const regs = db.prepare(
      `SELECT r.slotId, r.userId, r.status FROM shift_registrations r
       JOIN shift_slots s ON s.id = r.slotId
       WHERE s.date >= ? AND s.date <= ? AND r.status IN ('approved','pending')`
    ).all(dateFrom, dateTo) as RegRow[];
    return { staff, slots, regs };
  }
}

// ── ExcelJS style helpers ─────────────────────────────────────────────────────
type FillSolid = { type: "pattern"; pattern: "solid"; fgColor: { argb: string } };
function fill(argb: string): FillSolid {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}
function border(argb = "FFD1D5DB"): Partial<ExcelJS.Borders> {
  const s = { style: "thin" as const, color: { argb } };
  return { top: s, bottom: s, left: s, right: s };
}
function styleCell(
  c: ExcelJS.Cell, v: string | number,
  o: {
    bold?: boolean; italic?: boolean; sz?: number;
    fc?: string; fill?: string;
    ha?: ExcelJS.Alignment["horizontal"];
    wrap?: boolean; brd?: boolean;
  } = {}
) {
  c.value = v;
  c.font  = { name: "Calibri", size: o.sz ?? 10, bold: !!o.bold, italic: !!o.italic,
               ...(o.fc ? { color: { argb: o.fc } } : {}) };
  if (o.fill) c.fill = fill(o.fill) as ExcelJS.Fill;
  c.alignment = { horizontal: o.ha ?? "center", vertical: "middle", wrapText: !!o.wrap };
  if (o.brd !== false) c.border = border() as ExcelJS.Borders;
}

export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo   = searchParams.get("dateTo");
  if (!dateFrom || !dateTo)
    return NextResponse.json({ error: "dateFrom and dateTo required" }, { status: 400 });

  const { staff, slots, regs } = await fetchData(dateFrom, dateTo);

  // Danh sách ngày
  const dates: string[] = [];
  const cur = new Date(dateFrom + "T00:00:00Z");
  const end = new Date(dateTo   + "T00:00:00Z");
  while (cur <= end) { dates.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }

  const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

  // userId → date → mã ca (approved ưu tiên hơn pending)
  const regMap: Record<string, Record<string, string>> = {};
  // Process pending first, then approved overwrites
  for (const status of ["pending", "approved"] as const) {
    for (const reg of regs.filter(r => r.status === status)) {
      const slot = slots.find(s => s.id === reg.slotId);
      if (!slot) continue;
      const code = getShiftCode(slot.startTime, slot.endTime);
      if (!regMap[reg.userId]) regMap[reg.userId] = {};
      regMap[reg.userId][slot.date] = code;
    }
  }

  // FT trước, PT sau — bao gồm tất cả active users (admin/manager cũng có lịch)
  const ptStaff  = staff.filter(u => u.role === "staff_pt");
  const ftStaff  = staff.filter(u => u.role !== "staff_pt");
  const allStaff = [...ftStaff, ...ptStaff];

  // ── Màu ──────────────────────────────────────────────────────────────────────
  const C = {
    navy:    "FF0C1A2E", navyMid: "FF1E3A5F", gold: "FFC9A55A",
    white:   "FFFFFFFF", gray:    "FF94A3B8",
    ftBg:    "FFEFF6FF", ftGrp:   "FFBFDBFE",
    ptBg:    "FFFFF7ED", ptGrp:   "FFFDE68A",
    today:   "FFDBEAFE", todayTxt:"FF1D4ED8",
    shFT:    "FFDCFCE7", shFTtxt: "FF166534",
    shPT:    "FFFED7AA", shPTtxt: "FF9A3412",
    offBg:   "FFFFF9C2", offTxt:  "FF92400E",
    hdr:     "FFE0F2FE",
  };

  // ── Workbook ──────────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Postlain Store Manager";

  const d0  = new Date(dateFrom + "T00:00:00Z");
  const dN  = new Date(dateTo   + "T00:00:00Z");
  const monthLabel = d0.getUTCMonth() === dN.getUTCMonth()
    ? `${MONTHS_VI[d0.getUTCMonth()]} ${d0.getUTCFullYear()}`
    : `${MONTHS_VI[d0.getUTCMonth()]}–${MONTHS_VI[dN.getUTCMonth()]} ${dN.getUTCFullYear()}`;

  // Số cột cố định: STT | HỌ TÊN | VỊ TRÍ | MÃ NV | SỐ ĐT
  const FIXED = 5;
  const TOTAL = FIXED + dates.length;

  const ws = wb.addWorksheet("Lịch Làm Việc", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", xSplit: FIXED, ySplit: 3 }],
  });

  ws.columns = [
    { key: "stt",   width: 5  },
    { key: "name",  width: 22 },
    { key: "pos",   width: 6  },
    { key: "code",  width: 12 },
    { key: "phone", width: 13 },
    ...dates.map(d => ({ key: d, width: 7 })),
  ];

  // ── Row 1: Tiêu đề ──────────────────────────────────────────────────────────
  const rTitle = ws.addRow([]);
  rTitle.height = 34;
  ws.mergeCells(1, 1, 1, TOTAL);
  styleCell(rTitle.getCell(1), `LỊCH LÀM VIỆC · POSTLAIN · ${monthLabel.toUpperCase()}`, {
    bold: true, sz: 14, fc: C.gold, fill: C.navy, ha: "center", brd: false,
  });

  // ── Row 2: Tên ngày ─────────────────────────────────────────────────────────
  const rDow = ws.addRow([]);
  rDow.height = 20;
  styleCell(rDow.getCell(1), "STT",    { bold: true, fc: C.white, fill: C.navyMid });
  styleCell(rDow.getCell(2), "HỌ TÊN", { bold: true, fc: C.white, fill: C.navyMid, ha: "left" });
  styleCell(rDow.getCell(3), "VT",     { bold: true, fc: C.white, fill: C.navyMid });
  styleCell(rDow.getCell(4), "MÃ NV",  { bold: true, fc: C.white, fill: C.navyMid });
  styleCell(rDow.getCell(5), "SỐ ĐT",  { bold: true, fc: C.white, fill: C.navyMid });
  dates.forEach((d, i) => {
    const isToday = d === todayStr;
    styleCell(rDow.getCell(FIXED + 1 + i), DAYS_VI[new Date(d + "T00:00:00Z").getUTCDay()], {
      bold: true,
      fc:   isToday ? C.todayTxt : C.white,
      fill: isToday ? C.today    : C.navyMid,
    });
  });

  // ── Row 3: Ngày DD/MM ───────────────────────────────────────────────────────
  const rDate = ws.addRow([]);
  rDate.height = 16;
  const rangeLabel = `${dateFrom.slice(8)}/${dateFrom.slice(5,7)} – ${dateTo.slice(8)}/${dateTo.slice(5,7)}`;
  styleCell(rDate.getCell(1), "",           { fill: C.hdr, sz: 8 });
  styleCell(rDate.getCell(2), rangeLabel,   { fill: C.hdr, sz: 8, fc: C.gray, ha: "left" });
  styleCell(rDate.getCell(3), "",           { fill: C.hdr, sz: 8 });
  styleCell(rDate.getCell(4), "",           { fill: C.hdr, sz: 8 });
  styleCell(rDate.getCell(5), "",           { fill: C.hdr, sz: 8 });
  dates.forEach((d, i) => {
    const isToday = d === todayStr;
    styleCell(rDate.getCell(FIXED + 1 + i), `${d.slice(8)}/${d.slice(5, 7)}`, {
      sz: 8, bold: isToday,
      fc:   isToday ? C.todayTxt : C.gray,
      fill: isToday ? C.today    : C.hdr,
    });
  });

  // ── Nhân viên ────────────────────────────────────────────────────────────────
  let stt = 0;

  function renderGroup(label: string, group: StaffRow[], rowFill: string, grpFill: string) {
    if (group.length === 0) return;

    // Dòng nhãn nhóm
    const rGrp = ws.addRow([]);
    rGrp.height = 16;
    ws.mergeCells(rGrp.number, 1, rGrp.number, TOTAL);
    const gc = rGrp.getCell(1);
    styleCell(gc, `  ${label}`, { bold: true, sz: 9, fc: C.navy, fill: grpFill, ha: "left", brd: false });
    for (let c = 1; c <= TOTAL; c++) rGrp.getCell(c).border = border() as ExcelJS.Borders;

    group.forEach(u => {
      stt++;
      const pos   = u.role === "staff_pt" ? "PT"
                  : u.role === "staff_ft" ? "FT"
                  : u.role === "admin"    ? "SL"
                  : u.role === "manager"  ? "SL"
                  : u.role === "staff"    ? "FT"
                  : "SA";
      const rRow  = ws.addRow([]);
      rRow.height = 20;

      styleCell(rRow.getCell(1), stt,                 { fill: rowFill, fc: C.gray, sz: 9 });
      styleCell(rRow.getCell(2), u.fullName || u.name, { fill: rowFill, ha: "left" });
      styleCell(rRow.getCell(3), pos,                 { fill: rowFill, bold: true, sz: 9,
                                                        fc: pos === "PT" ? C.shPTtxt : C.navyMid });
      styleCell(rRow.getCell(4), u.username ?? "",    { fill: rowFill, sz: 9, fc: C.gray });
      styleCell(rRow.getCell(5), u.phone ?? "",       { fill: rowFill, sz: 9, fc: C.gray });

      dates.forEach((d, i) => {
        const code    = regMap[u.id]?.[d] ?? "";
        const isToday = d === todayStr;
        const isFT    = ["A","B","C"].includes(code);
        const isPT    = !!code && !isFT;

        styleCell(rRow.getCell(FIXED + 1 + i), code, {
          bold: !!code, sz: 10,
          fill: code    ? (isFT ? C.shFT : isPT ? C.shPT : C.offBg)
                        : (isToday ? C.today : rowFill),
          fc:   code    ? (isFT ? C.shFTtxt : isPT ? C.shPTtxt : C.offTxt)
                        : C.gray,
        });
      });
    });
  }

  renderGroup("FULL TIME", ftStaff, C.ftBg, C.ftGrp);
  renderGroup("PART TIME", ptStaff, C.ptBg, C.ptGrp);

  // ── Dòng tổng số người mỗi ngày ─────────────────────────────────────────────
  ws.addRow([]).height = 6;
  const rCount = ws.addRow([]);
  rCount.height = 16;
  styleCell(rCount.getCell(1), "",              { fill: C.hdr, sz: 8 });
  styleCell(rCount.getCell(2), "Số người / ngày",{ fill: C.hdr, sz: 8, fc: C.gray, ha: "left", italic: true });
  styleCell(rCount.getCell(3), "",              { fill: C.hdr, sz: 8 });
  styleCell(rCount.getCell(4), "",              { fill: C.hdr, sz: 8 });
  styleCell(rCount.getCell(5), "",              { fill: C.hdr, sz: 8 });
  dates.forEach((d, i) => {
    const cnt = allStaff.filter(u => !!regMap[u.id]?.[d]).length;
    styleCell(rCount.getCell(FIXED + 1 + i), cnt > 0 ? cnt : "—", {
      sz: 9, bold: cnt > 0, fill: C.hdr,
      fc: cnt >= 3 ? C.navyMid : C.gray,
    });
  });

  // ── Bảng chú thích ───────────────────────────────────────────────────────────
  ws.addRow([]).height = 8;
  const rLegHdr = ws.addRow([]);
  rLegHdr.height = 18;
  styleCell(rLegHdr.getCell(1), "MÃ CA",     { bold: true, fc: C.white, fill: C.navyMid });
  styleCell(rLegHdr.getCell(2), "KHUNG GIỜ", { bold: true, fc: C.white, fill: C.navyMid, ha: "left" });
  styleCell(rLegHdr.getCell(3), "LOẠI",      { bold: true, fc: C.white, fill: C.navyMid });
  for (let c = 4; c <= TOTAL; c++) styleCell(rLegHdr.getCell(c), "", { fill: C.navyMid });

  const LEGENDS = [
    ["A",  "07:30 – 15:30", "Full Time"],
    ["B",  "14:00 – 22:00", "Full Time"],
    ["C",  "12:00 – 20:00", "Full Time"],
    ["A1", "07:30 – 11:30", "Part Time"],
    ["A2", "09:00 – 13:00", "Part Time"],
    ["A3", "11:00 – 15:00", "Part Time"],
    ["A4", "12:00 – 16:00", "Part Time"],
    ["B1", "15:00 – 19:00", "Part Time"],
    ["B2", "17:00 – 21:00", "Part Time"],
    ["B3", "18:00 – 22:00", "Part Time"],
  ];
  for (const [code, time, type] of LEGENDS) {
    const isFT = type === "Full Time";
    const bg   = isFT ? C.shFT  : C.shPT;
    const fc   = isFT ? C.shFTtxt : C.shPTtxt;
    const rL   = ws.addRow([]);
    rL.height  = 17;
    styleCell(rL.getCell(1), code, { bold: true, fill: bg, fc });
    styleCell(rL.getCell(2), time, { fill: bg, fc, ha: "left" });
    styleCell(rL.getCell(3), type, { fill: bg, fc });
    for (let c = 4; c <= TOTAL; c++) styleCell(rL.getCell(c), "", { fill: "FFF8FAFC" });
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const weekLabel = `${dateFrom}_${dateTo}`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lich_lam_viec_${weekLabel}.xlsx"`,
    },
  });
}
