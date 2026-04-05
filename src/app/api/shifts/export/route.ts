import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";
import getDb from "@/lib/database";

// Map giờ bắt đầu–kết thúc → mã ca
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

function getShiftCode(startTime: string, endTime: string): string {
  const key = `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
  return SHIFT_CODES[key] ?? `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
}

const DAYS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

type StaffRow = { id: string; name: string; role: string };
type SlotRow  = { id: string; date: string; name: string; startTime: string; endTime: string; staffType: string | null };
type RegRow   = { slotId: string; userId: string; userName: string };

async function fetchData(dateFrom: string, dateTo: string): Promise<{ staff: StaffRow[]; slots: SlotRow[]; regs: RegRow[] }> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const [staffRes, slotsRes, regsRes] = await Promise.all([
      sb.from("users").select("id, name, role").eq("active", true).order("role").order("name"),
      sb.from("shift_slots").select("id, date, name, startTime, endTime, staffType")
        .gte("date", dateFrom).lte("date", dateTo).order("date").order("startTime"),
      sb.from("shift_registrations").select("slotId, userId, userName").eq("status", "approved"),
    ]);
    const slots = (slotsRes.data ?? []) as SlotRow[];
    const slotIds = new Set(slots.map(s => s.id));
    const regs = ((regsRes.data ?? []) as RegRow[]).filter(r => slotIds.has(r.slotId));
    return { staff: (staffRes.data ?? []) as StaffRow[], slots, regs };
  } else {
    const db = getDb();
    const staff = db.prepare("SELECT id, name, role FROM users WHERE active = 1 ORDER BY role, name").all() as StaffRow[];
    const slots = db.prepare(
      "SELECT id, date, name, startTime, endTime, staffType FROM shift_slots WHERE date >= ? AND date <= ? ORDER BY date, startTime"
    ).all(dateFrom, dateTo) as SlotRow[];
    const regs = db.prepare(
      `SELECT r.slotId, r.userId, r.userName FROM shift_registrations r
       JOIN shift_slots s ON s.id = r.slotId
       WHERE s.date >= ? AND s.date <= ? AND r.status = 'approved'`
    ).all(dateFrom, dateTo) as RegRow[];
    return { staff, slots, regs };
  }
}

// ── Cell style helpers ────────────────────────────────────────────────────────

function hex2argb(hex: string) {
  return "FF" + hex.replace("#", "").toUpperCase().padStart(6, "0");
}

const DARK_NAVY  = hex2argb("#0C1A2E");
const GOLD       = hex2argb("#C9A55A");
const WHITE      = hex2argb("#FFFFFF");
const LIGHT_BLUE = hex2argb("#EFF6FF");
const BLUE_HEADER= hex2argb("#1E3A5F");
const FT_BG      = hex2argb("#F0F9FF");
const PT_BG      = hex2argb("#FFF7ED");
const SEPARATOR  = hex2argb("#E2E8F0");
const TODAY_BG   = hex2argb("#DBEAFE");
const SHIFT_A_BG = hex2argb("#DCFCE7");
const SHIFT_B_BG = hex2argb("#FEF9C3");
const SHIFT_PT_BG= hex2argb("#FFF7ED");
const GRAY_TEXT  = hex2argb("#64748B");

function cell(
  value: string | number,
  opts: {
    bold?: boolean; italic?: boolean; fontSize?: number;
    fgColor?: string; fontColor?: string;
    hAlign?: "center" | "left" | "right";
    vAlign?: "center" | "top" | "bottom";
    border?: boolean; borderColor?: string;
    wrapText?: boolean; numFmt?: string;
  } = {}
): XLSX.CellObject {
  const c: XLSX.CellObject = {
    v: value,
    t: typeof value === "number" ? "n" : "s",
  };
  if (opts.numFmt) c.z = opts.numFmt;

  const font: Record<string, unknown> = { name: "Calibri", sz: opts.fontSize ?? 10 };
  if (opts.bold)      font.bold = true;
  if (opts.italic)    font.italic = true;
  if (opts.fontColor) font.color = { rgb: opts.fontColor };

  const fill = opts.fgColor ? { patternType: "solid", fgColor: { rgb: opts.fgColor } } : undefined;

  const alignment: Record<string, unknown> = {
    horizontal: opts.hAlign ?? "center",
    vertical:   opts.vAlign ?? "center",
    wrapText:   opts.wrapText ?? false,
  };

  const borderSide = opts.border
    ? { style: "thin", color: { rgb: opts.borderColor ?? SEPARATOR } }
    : undefined;
  const border = borderSide
    ? { top: borderSide, bottom: borderSide, left: borderSide, right: borderSide }
    : undefined;

  c.s = { font, fill, alignment, border };
  return c;
}

function emptyCell(fgColor?: string): XLSX.CellObject {
  return cell("", { fgColor, border: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo   = searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo required" }, { status: 400 });
  }

  const { staff, slots, regs } = await fetchData(dateFrom, dateTo);

  // Danh sách ngày trong tuần
  const dates: string[] = [];
  const cur = new Date(dateFrom + "T00:00:00Z");
  const end = new Date(dateTo   + "T00:00:00Z");
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

  // Build lookup: userId → date → mã ca[]
  const regMap: Record<string, Record<string, string[]>> = {};
  for (const reg of regs) {
    const slot = slots.find(s => s.id === reg.slotId);
    if (!slot) continue;
    const code = getShiftCode(slot.startTime, slot.endTime);
    if (!regMap[reg.userId])          regMap[reg.userId] = {};
    if (!regMap[reg.userId][slot.date]) regMap[reg.userId][slot.date] = [];
    regMap[reg.userId][slot.date].push(code);
  }

  // Nhân viên: FT trước, PT sau, bỏ admin/manager
  const ftStaff = staff.filter(u => !["admin","manager","staff_pt"].includes(u.role));
  const ptStaff = staff.filter(u => u.role === "staff_pt");

  // Thống kê: tổng ca mỗi người
  function countShifts(userId: string) {
    return Object.values(regMap[userId] ?? {}).reduce((s, arr) => s + arr.length, 0);
  }

  // Thống kê: số người mỗi ngày
  const dailyCount: Record<string, number> = {};
  for (const d of dates) {
    dailyCount[d] = regs.filter(r => {
      const s = slots.find(sl => sl.id === r.slotId);
      return s?.date === d;
    }).length;
  }

  // ── Xây dựng worksheet ────────────────────────────────────────────────────

  const wb  = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};
  const rows: XLSX.CellObject[][] = [];

  const dateStart = new Date(dateFrom + "T00:00:00Z");
  const dateEnd   = new Date(dateTo   + "T00:00:00Z");
  const monthLabel = dateStart.getUTCMonth() === dateEnd.getUTCMonth()
    ? `${MONTHS_VI[dateStart.getUTCMonth()]} ${dateStart.getUTCFullYear()}`
    : `${MONTHS_VI[dateStart.getUTCMonth()]}–${MONTHS_VI[dateEnd.getUTCMonth()]} ${dateEnd.getUTCFullYear()}`;

  const NUM_FIXED = 4; // STT | Họ tên | Vị trí | Tổng ca
  const totalCols = NUM_FIXED + dates.length;

  // ── ROW 0: Tiêu đề lớn ───────────────────────────────────────────────────
  const titleRow: XLSX.CellObject[] = [
    cell(`LỊCH LÀM VIỆC POSTLAIN · ${monthLabel.toUpperCase()}`, {
      bold: true, fontSize: 14, fontColor: GOLD,
      fgColor: DARK_NAVY, hAlign: "center", vAlign: "center",
    }),
  ];
  for (let i = 1; i < totalCols; i++) titleRow.push(emptyCell(DARK_NAVY));
  rows.push(titleRow);

  // ── ROW 1: Header cột ────────────────────────────────────────────────────
  const headerRow: XLSX.CellObject[] = [
    cell("STT",     { bold: true, fgColor: BLUE_HEADER, fontColor: WHITE, border: true }),
    cell("HỌ TÊN",  { bold: true, fgColor: BLUE_HEADER, fontColor: WHITE, border: true }),
    cell("VỊ TRÍ",  { bold: true, fgColor: BLUE_HEADER, fontColor: WHITE, border: true }),
    cell("TỔNG CA", { bold: true, fgColor: BLUE_HEADER, fontColor: WHITE, border: true }),
  ];
  for (const d of dates) {
    const isToday = d === todayStr;
    headerRow.push(cell(DAYS_VI[new Date(d + "T00:00:00Z").getUTCDay()], {
      bold: true,
      fgColor: isToday ? TODAY_BG : BLUE_HEADER,
      fontColor: isToday ? DARK_NAVY : WHITE,
      border: true,
    }));
  }
  rows.push(headerRow);

  // ── ROW 2: Ngày (DD/MM) ──────────────────────────────────────────────────
  const dateRow: XLSX.CellObject[] = [
    emptyCell(LIGHT_BLUE),
    cell("TUẦN: " + dateFrom.slice(8) + "/" + dateFrom.slice(5,7) + " – " + dateTo.slice(8) + "/" + dateTo.slice(5,7), {
      bold: true, fontSize: 9, fgColor: LIGHT_BLUE, hAlign: "left", border: true,
    }),
    emptyCell(LIGHT_BLUE),
    emptyCell(LIGHT_BLUE),
  ];
  for (const d of dates) {
    const isToday = d === todayStr;
    const label = d.slice(8) + "/" + d.slice(5, 7);
    dateRow.push(cell(label, {
      bold: isToday, fontSize: 9,
      fgColor: isToday ? TODAY_BG : LIGHT_BLUE,
      fontColor: isToday ? BLUE_HEADER : GRAY_TEXT,
      border: true,
    }));
  }
  rows.push(dateRow);

  // ── ROW 3: Số người trong ngày ───────────────────────────────────────────
  const countRow: XLSX.CellObject[] = [
    emptyCell(LIGHT_BLUE),
    cell("Số người làm", { italic: true, fontSize: 9, fgColor: LIGHT_BLUE, hAlign: "left", border: true }),
    emptyCell(LIGHT_BLUE),
    emptyCell(LIGHT_BLUE),
  ];
  for (const d of dates) {
    const cnt = dailyCount[d] ?? 0;
    countRow.push(cell(cnt > 0 ? String(cnt) : "—", {
      fontSize: 9, fgColor: LIGHT_BLUE,
      fontColor: cnt > 0 ? BLUE_HEADER : GRAY_TEXT,
      bold: cnt > 0, border: true,
    }));
  }
  rows.push(countRow);

  // ── Helper: render một nhóm nhân viên ────────────────────────────────────
  function renderGroup(label: string, groupStaff: StaffRow[], bgRow: string, bgShift: string, startIdx: number) {
    if (groupStaff.length === 0) return startIdx;

    // Nhãn nhóm
    const groupLabelRow: XLSX.CellObject[] = [
      cell(label, { bold: true, fontSize: 9, fgColor: bgShift, fontColor: DARK_NAVY, hAlign: "left", border: true }),
    ];
    for (let i = 1; i < totalCols; i++) groupLabelRow.push(emptyCell(bgShift));
    rows.push(groupLabelRow);

    groupStaff.forEach((u, i) => {
      const pos = u.role === "staff_pt" ? "PT" : u.role === "staff_ft" ? "FT" : "SA";
      const total = countShifts(u.id);
      const staffRow: XLSX.CellObject[] = [
        cell(startIdx + i + 1, { fgColor: bgRow, border: true }),
        cell(u.name,           { fgColor: bgRow, hAlign: "left", border: true, bold: false }),
        cell(pos,              { fgColor: bgRow, border: true, fontColor: pos === "PT" ? hex2argb("#EA580C") : DARK_NAVY }),
        cell(total > 0 ? total : "—", {
          fgColor: bgRow, border: true, bold: total > 0,
          fontColor: total >= 5 ? hex2argb("#16A34A") : total >= 3 ? DARK_NAVY : GRAY_TEXT,
        }),
      ];
      for (const d of dates) {
        const codes = regMap[u.id]?.[d];
        const code  = codes ? codes.join("/") : "";
        const isToday = d === todayStr;
        const isFT = code === "A" || code === "B" || code === "C";
        const hasPT = code && !isFT;
        staffRow.push(cell(code, {
          bold: !!code,
          fgColor: code
            ? (isFT ? SHIFT_A_BG : hasPT ? SHIFT_PT_BG : SHIFT_B_BG)
            : (isToday ? TODAY_BG : bgRow),
          fontColor: code
            ? (isFT ? hex2argb("#166534") : hex2argb("#9A3412"))
            : GRAY_TEXT,
          border: true,
          hAlign: "center",
        }));
      }
      rows.push(staffRow);
    });

    return startIdx + groupStaff.length;
  }

  let idx = 0;
  idx = renderGroup("▸ FULL TIME", ftStaff, FT_BG, hex2argb("#BFDBFE"), idx);
  idx = renderGroup("▸ PART TIME", ptStaff, PT_BG, hex2argb("#FED7AA"), idx);

  // ── Dòng trống ───────────────────────────────────────────────────────────
  rows.push(Array(totalCols).fill(emptyCell()));

  // ── Chú thích ca ─────────────────────────────────────────────────────────
  const legend = [
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

  // Header chú thích
  rows.push([
    cell("CHÚ THÍCH CA LÀM", { bold: true, fontSize: 9, fgColor: BLUE_HEADER, fontColor: WHITE, border: true }),
    cell("KHUNG GIỜ",          { bold: true, fontSize: 9, fgColor: BLUE_HEADER, fontColor: WHITE, border: true }),
    cell("LOẠI",               { bold: true, fontSize: 9, fgColor: BLUE_HEADER, fontColor: WHITE, border: true }),
    ...Array(totalCols - 3).fill(emptyCell()),
  ]);

  for (const [code, time, type] of legend) {
    const isFT = type === "Full Time";
    rows.push([
      cell(code, { bold: true, fgColor: isFT ? SHIFT_A_BG : SHIFT_PT_BG, fontColor: isFT ? hex2argb("#166534") : hex2argb("#9A3412"), border: true }),
      cell(time, { fgColor: isFT ? SHIFT_A_BG : SHIFT_PT_BG, hAlign: "left", border: true }),
      cell(type, { fgColor: isFT ? SHIFT_A_BG : SHIFT_PT_BG, fontColor: isFT ? hex2argb("#166534") : hex2argb("#9A3412"), border: true }),
      ...Array(totalCols - 3).fill(emptyCell()),
    ]);
  }

  // ── Ghi dữ liệu vào sheet ────────────────────────────────────────────────
  rows.forEach((row, r) => {
    row.forEach((cellObj, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      ws[addr] = cellObj;
    });
  });

  // Range
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: totalCols - 1 } });

  // Merge tiêu đề lớn (row 0)
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
  ];

  // Column widths
  ws["!cols"] = [
    { wch: 5  },  // STT
    { wch: 22 },  // Họ tên
    { wch: 7  },  // Vị trí
    { wch: 8  },  // Tổng ca
    ...dates.map(() => ({ wch: 7 })),
  ];

  // Row heights
  ws["!rows"] = [
    { hpt: 32 }, // title
    { hpt: 20 }, // header
    { hpt: 16 }, // date row
    { hpt: 16 }, // count row
    ...Array(rows.length - 4).fill({ hpt: 18 }),
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Lịch Làm Việc");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const weekLabel = `${dateFrom}_${dateTo}`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lich_lam_viec_${weekLabel}.xlsx"`,
    },
  });
}
