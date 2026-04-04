import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getDb } from "@/lib/db";

// Shift code mapping from time range
const SHIFT_CODES: Record<string, string> = {
  "07:30-15:30": "A",
  "07:30-15:30:00": "A",
  "14:00-22:00": "B",
  "14:00-22:00:00": "B",
  "12:00-20:00": "C",
  "12:00-20:00:00": "C",
  "07:30-11:30": "A1",
  "07:30-11:30:00": "A1",
  "09:00-13:00": "A2",
  "09:00-13:00:00": "A2",
  "11:00-15:00": "A3",
  "11:00-15:00:00": "A3",
  "12:00-16:00": "A4",
  "12:00-16:00:00": "A4",
  "15:00-19:00": "B1",
  "15:00-19:00:00": "B1",
  "17:00-21:00": "B2",
  "17:00-21:00:00": "B2",
  "18:00-22:00": "B3",
  "18:00-22:00:00": "B3",
};

function getShiftCode(startTime: string, endTime: string): string {
  const key = `${startTime.slice(0,5)}-${endTime.slice(0,5)}`;
  return SHIFT_CODES[key] ?? `${startTime.slice(0,5)}-${endTime.slice(0,5)}`;
}

// Excel serial date from YYYY-MM-DD
function toExcelDate(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.round((d.getTime() / 86400000) + 25569);
}

const DAYS_EN = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo   = searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo required" }, { status: 400 });
  }

  const db = getDb();

  // Load all staff
  const staff = db.prepare("SELECT id, name, role FROM users WHERE active = 1 ORDER BY role, name").all() as
    { id: string; name: string; role: string }[];

  // Load slots in range
  const slots = db.prepare(
    "SELECT * FROM shift_slots WHERE date >= ? AND date <= ? ORDER BY date, startTime"
  ).all(dateFrom, dateTo) as {
    id: string; date: string; name: string; startTime: string; endTime: string;
    staffType: string | null;
  }[];

  // Load approved registrations
  const regs = db.prepare(
    `SELECT r.* FROM shift_registrations r
     JOIN shift_slots s ON s.id = r.slotId
     WHERE s.date >= ? AND s.date <= ? AND r.status = 'approved'`
  ).all(dateFrom, dateTo) as { slotId: string; userId: string }[];

  // Build date list
  const dates: string[] = [];
  const cur = new Date(dateFrom + "T00:00:00Z");
  const end = new Date(dateTo + "T00:00:00Z");
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  // Build lookup: userId → date → shift codes
  const regMap: Record<string, Record<string, string[]>> = {};
  for (const reg of regs) {
    const slot = slots.find(s => s.id === reg.slotId);
    if (!slot) continue;
    const code = getShiftCode(slot.startTime, slot.endTime);
    if (!regMap[reg.userId]) regMap[reg.userId] = {};
    if (!regMap[reg.userId][slot.date]) regMap[reg.userId][slot.date] = [];
    regMap[reg.userId][slot.date].push(code);
  }

  // ── Build worksheet data ──────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const wsData: (string | number)[][] = [];

  // Row 0: title
  wsData.push(["ALDO GO DA LAT"]);

  // Row 1: blank
  wsData.push([]);

  // Row 2: day-of-week headers
  const dow2 = [1207, "", "", "", ""];
  for (const d of dates) {
    const day = new Date(d + "T00:00:00Z").getUTCDay();
    dow2.push(DAYS_EN[day]);
  }
  wsData.push(dow2);

  // Row 3: date serial headers
  const dateRow: (string | number)[] = ["STT", "NAME", "POS", "MÃ NV", "SỐ ĐIỆN THOẠI"];
  for (const d of dates) dateRow.push(toExcelDate(d));
  wsData.push(dateRow);

  // Staff rows (FT first, then PT)
  const ftStaff = staff.filter(u => u.role !== "staff_pt" && u.role !== "admin" && u.role !== "manager");
  const ptStaff = staff.filter(u => u.role === "staff_pt");
  const orderedStaff = [...ftStaff, ...ptStaff];

  orderedStaff.forEach((u, idx) => {
    const pos = u.role === "staff_pt" ? "PT" : u.role === "staff_ft" ? "SL" : "SA";
    const row: (string | number)[] = [idx + 1, u.name, pos, "", ""];
    for (const d of dates) {
      const codes = regMap[u.id]?.[d];
      row.push(codes ? codes.join("/") : "");
    }
    wsData.push(row);
  });

  // Blank row
  wsData.push([]);

  // Shift legend
  wsData.push(["GIỜ LÀM VIỆC", "7:30 - 15:30",  "A",   "FULL TIME"]);
  wsData.push(["",              "14:00 - 22:00", "B",   "FULL TIME"]);
  wsData.push(["",              "12:00 - 20:00", "C",   "FULL TIME"]);
  wsData.push(["",              "7:30 - 11:30",  "A1",  "PART TIME"]);
  wsData.push(["",              "9:00 - 13:00",  "A2",  "PART TIME"]);
  wsData.push(["",              "11:00 - 15:00", "A3",  "PART TIME"]);
  wsData.push(["",              "12:00 - 16:00", "A4",  "PART TIME"]);
  wsData.push(["",              "15:00 - 19:00", "B1",  "PART TIME"]);
  wsData.push(["",              "17:00 - 21:00", "B2",  "PART TIME"]);
  wsData.push(["",              "18:00 - 22:00", "B3",  "PART TIME"]);
  wsData.push(["",              "Unpaid Leave",  "UL",  "PART TIME"]);
  wsData.push(["",              "Annual Leave",  "AL",  "PART TIME"]);
  wsData.push(["",              "Nghỉ phép",     "OFF", ""]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "SCHEDULE");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const weekLabel = `${dateFrom}_${dateTo}`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="duty_roster_${weekLabel}.xlsx"`,
    },
  });
}
