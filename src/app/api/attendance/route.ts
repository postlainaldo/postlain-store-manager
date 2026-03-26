import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/database";
import { nanoid } from "nanoid";

// GET /api/attendance?userId=&date=YYYY-MM-DD&limit=50
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const date   = searchParams.get("date");   // e.g. "2026-03-26"
  const limit  = parseInt(searchParams.get("limit") ?? "100");

  let query = `SELECT * FROM attendance`;
  const params: (string | number)[] = [];
  const conds: string[] = [];

  if (userId) { conds.push(`userId = ?`); params.push(userId); }
  if (date)   { conds.push(`checkIn LIKE ?`); params.push(`${date}%`); }

  if (conds.length) query += ` WHERE ${conds.join(" AND ")}`;
  query += ` ORDER BY checkIn DESC LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

// POST /api/attendance — check in
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { userId, userName, note = "" } = body;

  if (!userId || !userName) {
    return NextResponse.json({ error: "userId và userName là bắt buộc" }, { status: 400 });
  }

  // Check if already checked in today without checkout
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare(
    `SELECT id FROM attendance WHERE userId = ? AND checkIn LIKE ? AND checkOut IS NULL`
  ).get(userId, `${today}%`);

  if (existing) {
    return NextResponse.json({ error: "Bạn chưa check out ca trước" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const id  = `att_${nanoid(10)}`;

  db.prepare(
    `INSERT INTO attendance (id, userId, userName, checkIn, note, createdAt) VALUES (?,?,?,?,?,?)`
  ).run(id, userId, userName, now, note, now);

  const row = db.prepare(`SELECT * FROM attendance WHERE id = ?`).get(id);
  return NextResponse.json(row, { status: 201 });
}

// PATCH /api/attendance — check out
export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { userId, note } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId là bắt buộc" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const record = db.prepare(
    `SELECT * FROM attendance WHERE userId = ? AND checkIn LIKE ? AND checkOut IS NULL ORDER BY checkIn DESC LIMIT 1`
  ).get(userId, `${today}%`) as { id: string } | undefined;

  if (!record) {
    return NextResponse.json({ error: "Không tìm thấy ca đang mở" }, { status: 404 });
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE attendance SET checkOut = ?, note = COALESCE(?, note) WHERE id = ?`
  ).run(now, note ?? null, record.id);

  const updated = db.prepare(`SELECT * FROM attendance WHERE id = ?`).get(record.id);
  return NextResponse.json(updated);
}
