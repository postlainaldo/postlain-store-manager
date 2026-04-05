import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";
import getDb from "@/lib/database";

const SHIFT_CODES: Record<string, string> = {
  "07:30-15:30": "A",
  "14:00-22:00": "B",
  "12:00-20:00": "C",
  "07:30-11:30": "A1",
  "09:00-13:00": "A2",
  "11:00-15:00": "A3",
  "12:00-16:00": "A4",
  "15:00-19:00": "B1",
  "17:00-21:00": "B2",
  "18:00-22:00": "B3",
};

function getShiftCode(start: string, end: string): string {
  const key = `${start.slice(0, 5)}-${end.slice(0, 5)}`;
  return SHIFT_CODES[key] ?? `${start.slice(0, 5)}-${end.slice(0, 5)}`;
}

const DAYS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                   "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

type StaffRow = { id: string; name: string; role: string };
type SlotRow  = { id: string; date: string; name: string; startTime: string; endTime: string };
type RegRow   = { slotId: string; userId: string };

async function fetchData(dateFrom: string, dateTo: string) {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const [staffRes, slotsRes, regsRes] = await Promise.all([
      sb.from("users").select("id, name, role").eq("active", true).order("role").order("name"),
      sb.from("shift_slots").select("id, date, name, startTime, endTime")
        .gte("date", dateFrom).lte("date", dateTo).order("date").order("startTime"),
      sb.from("shift_registrations").select("slotId, userId").eq("status", "approved"),
    ]);
    const slots = (slotsRes.data ?? []) as SlotRow[];
    const slotIds = new Set(slots.map(s => s.id));
    const regs = ((regsRes.data ?? []) as RegRow[]).filter(r => slotIds.has(r.slotId));
    return { staff: (staffRes.data ?? []) as StaffRow[], slots, regs };
  } else {
    const db = getDb();
    const staff = db.prepare(
      "SELECT id, name, role FROM users WHERE active = 1 ORDER BY role, name"
    ).all() as StaffRow[];
    const slots = db.prepare(
      "SELECT id, date, name, startTime, endTime FROM shift_slots WHERE date >= ? AND date <= ? ORDER BY date, startTime"
    ).all(dateFrom, dateTo) as SlotRow[];
    const regs = db.prepare(
      `SELECT r.slotId, r.userId FROM shift_registrations r
       JOIN shift_slots s ON s.id = r.slotId
       WHERE s.date >= ? AND s.date <= ? AND r.status = 'approved'`
    ).all(dateFrom, dateTo) as RegRow[];
    return { staff, slots, regs };
  }
}

// ── Style helpers ─────────────────────────────────────────────────────────────

type FillArg   = { type: "pattern"; pattern: "solid"; fgColor: { argb: string } };
type FontArg   = Partial<ExcelJS.Font>;
type AlignArg  = Partial<ExcelJS.Alignment>;
type BorderArg = Partial<ExcelJS.Borders>;

function solidFill(argb: string): FillArg {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function thinBorder(argb = "FFD1D5DB"): BorderArg {
  const s = { style: "thin" as const, color: { argb } };
  return { top: s, bottom: s, left: s, right: s };
}

function applyCell(
  cell: ExcelJS.Cell,
  value: string | number,
  opts: {
    bold?: boolean; italic?: boolean; fontSize?: number; fontName?: string;
    fontArgb?: string; fillArgb?: string;
    hAlign?: ExcelJS.Alignment["horizontal"];
    vAlign?: ExcelJS.Alignment["vertical"];
    border?: boolean; borderArgb?: string; wrapText?: boolean;
  } = {}
) {
  cell.value = value;

  const font: FontArg = {
    name: opts.fontName ?? "Calibri",
    size: opts.fontSize ?? 10,
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
  };
  if (opts.fontArgb) font.color = { argb: opts.fontArgb };
  cell.font = font as ExcelJS.Font;

  if (opts.fillArgb) cell.fill = solidFill(opts.fillArgb) as ExcelJS.Fill;

  const align: AlignArg = {
    horizontal: opts.hAlign ?? "center",
    vertical:   opts.vAlign ?? "middle",
    wrapText:   opts.wrapText ?? false,
  };
  cell.alignment = align as ExcelJS.Alignment;

  if (opts.border !== false) {
    cell.border = thinBorder(opts.borderArgb) as ExcelJS.Borders;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo   = searchParams.get("dateTo");
  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo required" }, { status: 400 });
  }

  const { staff, slots, regs } = await fetchData(dateFrom, dateTo);

  // Danh sách ngày
  const dates: string[] = [];
  const cur = new Date(dateFrom + "T00:00:00Z");
  const end = new Date(dateTo   + "T00:00:00Z");
  while (cur <= end) { dates.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }

  const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

  // userId → date → mã ca
  const regMap: Record<string, Record<string, string[]>> = {};
  for (const reg of regs) {
    const slot = slots.find(s => s.id === reg.slotId);
    if (!slot) continue;
    const code = getShiftCode(slot.startTime, slot.endTime);
    if (!regMap[reg.userId])            regMap[reg.userId] = {};
    if (!regMap[reg.userId][slot.date]) regMap[reg.userId][slot.date] = [];
    regMap[reg.userId][slot.date].push(code);
  }

  const ftStaff = staff.filter(u => !["admin","manager","staff_pt"].includes(u.role));
  const ptStaff = staff.filter(u => u.role === "staff_pt");

  // ── Workbook ──────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = "Postlain Store Manager";
  wb.created  = new Date();

  const ws = wb.addWorksheet("Lịch Làm Việc", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", xSplit: 2, ySplit: 4 }], // freeze tên + 4 header rows
  });

  // ── Màu sắc ───────────────────────────────────────────────────────────────
  const C = {
    navy:     "FF0C1A2E",
    navyMid:  "FF1E3A5F",
    gold:     "FFC9A55A",
    white:    "FFFFFFFF",
    ftBg:     "FFEFF6FF",
    ptBg:     "FFFFF7ED",
    ftGroup:  "FFdbeafe",
    ptGroup:  "FFFDE68A",
    dayHeader:"FFBFDBFE",
    today:    "FFDBEAFE",
    todayTxt: "FF1D4ED8",
    shiftFT:  "FFDCFCE7",
    shiftFTtxt:"FF166534",
    shiftPT:  "FFFED7AA",
    shiftPTtxt:"FF9A3412",
    shiftOth: "FFFFF9C2",
    shiftOthtxt:"FF92400E",
    gray:     "FF94A3B8",
    border:   "FFD1D5DB",
    lightGray:"FFF8FAFC",
    greenTxt: "FF16A34A",
    separator:"FFE0F2FE",
  };

  // ── Labo cột ──────────────────────────────────────────────────────────────
  const FIXED_COLS = 4; // STT | Họ tên | Vị trí | Tổng ca
  const totalCols  = FIXED_COLS + dates.length;

  ws.columns = [
    { key: "stt",   width: 5  },
    { key: "name",  width: 22 },
    { key: "pos",   width: 8  },
    { key: "total", width: 9  },
    ...dates.map(d => ({ key: d, width: 7.5 })),
  ];

  // ── ROW 1: Tiêu đề ────────────────────────────────────────────────────────
  const d0  = new Date(dateFrom + "T00:00:00Z");
  const dN  = new Date(dateTo   + "T00:00:00Z");
  const monthLabel = d0.getUTCMonth() === dN.getUTCMonth()
    ? `${MONTHS_VI[d0.getUTCMonth()]} ${d0.getUTCFullYear()}`
    : `${MONTHS_VI[d0.getUTCMonth()]} – ${MONTHS_VI[dN.getUTCMonth()]} ${dN.getUTCFullYear()}`;

  const titleRow = ws.addRow([`LỊCH LÀM VIỆC · POSTLAIN · ${monthLabel.toUpperCase()}`]);
  titleRow.height = 36;
  ws.mergeCells(1, 1, 1, totalCols);
  applyCell(titleRow.getCell(1), `LỊCH LÀM VIỆC · POSTLAIN · ${monthLabel.toUpperCase()}`, {
    bold: true, fontSize: 14, fontArgb: C.gold, fillArgb: C.navy, hAlign: "center", border: false,
  });

  // ── ROW 2: Sub-header cột ─────────────────────────────────────────────────
  const subRow = ws.addRow([]);
  subRow.height = 22;
  applyCell(subRow.getCell(1), "STT",     { bold: true, fontArgb: C.white, fillArgb: C.navy });
  applyCell(subRow.getCell(2), "HỌ TÊN",  { bold: true, fontArgb: C.white, fillArgb: C.navy, hAlign: "left" });
  applyCell(subRow.getCell(3), "VỊ TRÍ",  { bold: true, fontArgb: C.white, fillArgb: C.navy });
  applyCell(subRow.getCell(4), "TỔNG CA", { bold: true, fontArgb: C.white, fillArgb: C.navy });
  dates.forEach((d, i) => {
    const isToday = d === todayStr;
    const dow = DAYS_VI[new Date(d + "T00:00:00Z").getUTCDay()];
    applyCell(subRow.getCell(FIXED_COLS + 1 + i), dow, {
      bold: true,
      fontArgb: isToday ? C.todayTxt : C.white,
      fillArgb: isToday ? C.today    : C.navyMid,
    });
  });

  // ── ROW 3: Ngày DD/MM ────────────────────────────────────────────────────
  const dateRow = ws.addRow([]);
  dateRow.height = 16;
  const weekRangeLabel = `${dateFrom.slice(8)}/${dateFrom.slice(5,7)} – ${dateTo.slice(8)}/${dateTo.slice(5,7)}`;
  applyCell(dateRow.getCell(1), "",              { fillArgb: C.ftBg, fontSize: 8 });
  applyCell(dateRow.getCell(2), weekRangeLabel,  { fillArgb: C.ftBg, fontSize: 8, fontArgb: C.gray, hAlign: "left" });
  applyCell(dateRow.getCell(3), "",              { fillArgb: C.ftBg, fontSize: 8 });
  applyCell(dateRow.getCell(4), "",              { fillArgb: C.ftBg, fontSize: 8 });
  dates.forEach((d, i) => {
    const isToday = d === todayStr;
    applyCell(dateRow.getCell(FIXED_COLS + 1 + i), `${d.slice(8)}/${d.slice(5,7)}`, {
      fontSize: 8, bold: isToday,
      fontArgb: isToday ? C.todayTxt : C.gray,
      fillArgb: isToday ? C.today    : C.ftBg,
    });
  });

  // ── ROW 4: Số người mỗi ngày ─────────────────────────────────────────────
  const cntRow = ws.addRow([]);
  cntRow.height = 16;
  applyCell(cntRow.getCell(1), "",             { fillArgb: C.ftBg, fontSize: 8 });
  applyCell(cntRow.getCell(2), "Số người làm", { fillArgb: C.ftBg, fontSize: 8, fontArgb: C.gray, hAlign: "left", italic: true });
  applyCell(cntRow.getCell(3), "",             { fillArgb: C.ftBg, fontSize: 8 });
  applyCell(cntRow.getCell(4), "",             { fillArgb: C.ftBg, fontSize: 8 });
  dates.forEach((d, i) => {
    const cnt = regs.filter(r => slots.find(s => s.id === r.slotId)?.date === d).length;
    applyCell(cntRow.getCell(FIXED_COLS + 1 + i), cnt > 0 ? cnt : "—", {
      fontSize: 9, bold: cnt > 0,
      fontArgb: cnt >= 3 ? C.navyMid : C.gray,
      fillArgb: C.ftBg,
    });
  });

  // ── Helper render nhóm nhân viên ──────────────────────────────────────────
  let sttIdx = 0;

  function renderGroup(label: string, groupStaff: StaffRow[], rowFill: string, groupFill: string) {
    if (groupStaff.length === 0) return;

    // Nhãn nhóm
    const gRow = ws.addRow([]);
    gRow.height = 18;
    ws.mergeCells(gRow.number, 1, gRow.number, totalCols);
    applyCell(gRow.getCell(1), label, {
      bold: true, fontSize: 9, fontArgb: C.navy, fillArgb: groupFill,
      hAlign: "left", border: false,
    });
    // vẽ border riêng cho merged cell
    for (let c = 1; c <= totalCols; c++) {
      const cell = gRow.getCell(c);
      cell.border = thinBorder(C.border) as ExcelJS.Borders;
    }

    groupStaff.forEach(u => {
      sttIdx++;
      const pos = u.role === "staff_pt" ? "PT" : u.role === "staff_ft" ? "FT" : "SA";
      const totalShifts = Object.values(regMap[u.id] ?? {}).reduce((s, arr) => s + arr.length, 0);

      const row = ws.addRow([]);
      row.height = 20;

      applyCell(row.getCell(1), sttIdx,  { fillArgb: rowFill, fontArgb: C.gray, fontSize: 9 });
      applyCell(row.getCell(2), u.name,  { fillArgb: rowFill, hAlign: "left", bold: false });
      applyCell(row.getCell(3), pos,     {
        fillArgb: rowFill, bold: true, fontSize: 9,
        fontArgb: pos === "PT" ? C.shiftPTtxt : C.navyMid,
      });
      applyCell(row.getCell(4), totalShifts > 0 ? totalShifts : "—", {
        fillArgb: rowFill, bold: totalShifts > 0,
        fontArgb: totalShifts >= 5 ? C.greenTxt : totalShifts >= 3 ? C.navyMid : C.gray,
      });

      dates.forEach((d, i) => {
        const codes = regMap[u.id]?.[d] ?? [];
        const code  = codes.join("/");
        const isToday = d === todayStr;
        const isFT = ["A","B","C"].includes(code);
        const isPT = code && !isFT;

        applyCell(row.getCell(FIXED_COLS + 1 + i), code || "", {
          bold: !!code,
          fillArgb: code
            ? (isFT ? C.shiftFT : isPT ? C.shiftPT : C.shiftOth)
            : (isToday ? C.today : rowFill),
          fontArgb: code
            ? (isFT ? C.shiftFTtxt : isPT ? C.shiftPTtxt : C.shiftOthtxt)
            : C.gray,
        });
      });
    });
  }

  renderGroup("▸  FULL TIME", ftStaff, C.ftBg, C.ftGroup);
  renderGroup("▸  PART TIME", ptStaff, C.ptBg, C.ptGroup);

  // ── Dòng trống ───────────────────────────────────────────────────────────
  ws.addRow([]).height = 8;

  // ── Bảng chú thích ───────────────────────────────────────────────────────
  const legendHeader = ws.addRow([]);
  legendHeader.height = 18;
  applyCell(legendHeader.getCell(1), "MÃ CA",      { bold: true, fontArgb: C.white, fillArgb: C.navy });
  applyCell(legendHeader.getCell(2), "KHUNG GIỜ",  { bold: true, fontArgb: C.white, fillArgb: C.navy, hAlign: "left" });
  applyCell(legendHeader.getCell(3), "LOẠI",       { bold: true, fontArgb: C.white, fillArgb: C.navy });
  applyCell(legendHeader.getCell(4), "GHI CHÚ",   { bold: true, fontArgb: C.white, fillArgb: C.navy, hAlign: "left" });
  for (let c = 5; c <= totalCols; c++) applyCell(legendHeader.getCell(c), "", { fillArgb: C.navy, border: true });

  const legends = [
    ["A",  "07:30 – 15:30", "Full Time", "Ca sáng FT"],
    ["B",  "14:00 – 22:00", "Full Time", "Ca chiều FT"],
    ["C",  "12:00 – 20:00", "Full Time", "Ca trưa FT"],
    ["A1", "07:30 – 11:30", "Part Time", ""],
    ["A2", "09:00 – 13:00", "Part Time", ""],
    ["A3", "11:00 – 15:00", "Part Time", ""],
    ["A4", "12:00 – 16:00", "Part Time", ""],
    ["B1", "15:00 – 19:00", "Part Time", ""],
    ["B2", "17:00 – 21:00", "Part Time", ""],
    ["B3", "18:00 – 22:00", "Part Time", ""],
  ];

  for (const [code, time, type, note] of legends) {
    const isFT = type === "Full Time";
    const lRow = ws.addRow([]);
    lRow.height = 17;
    applyCell(lRow.getCell(1), code, { bold: true, fillArgb: isFT ? C.shiftFT  : C.shiftPT,  fontArgb: isFT ? C.shiftFTtxt  : C.shiftPTtxt });
    applyCell(lRow.getCell(2), time, { fillArgb: isFT ? C.shiftFT  : C.shiftPT,  fontArgb: isFT ? C.shiftFTtxt  : C.shiftPTtxt, hAlign: "left" });
    applyCell(lRow.getCell(3), type, { fillArgb: isFT ? C.shiftFT  : C.shiftPT,  fontArgb: isFT ? C.shiftFTtxt  : C.shiftPTtxt });
    applyCell(lRow.getCell(4), note, { fillArgb: isFT ? C.shiftFT  : C.shiftPT,  fontArgb: C.gray, hAlign: "left", italic: true });
    for (let c = 5; c <= totalCols; c++) applyCell(lRow.getCell(c), "", { fillArgb: C.lightGray });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  const weekLabel = `${dateFrom}_${dateTo}`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lich_lam_viec_${weekLabel}.xlsx"`,
    },
  });
}
