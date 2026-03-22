import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/database";

type Movement = {
  id: string;
  productId: string | null;
  productName: string;
  variant: string;
  type: string;
  fromLoc: string | null;
  toLoc: string | null;
  qty: number;
  byUser: string;
  createdAt: string;
};

// GET /api/movements?limit=20
export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 100);
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM movements ORDER BY createdAt DESC LIMIT ?"
  ).all(limit) as Movement[];
  return NextResponse.json(rows);
}

// POST /api/movements — log a movement
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productId, productName, variant, type, fromLoc, toLoc, qty, byUser } = body;
  if (!productName || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const db = getDb();
  const id = `mv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(
    "INSERT INTO movements (id, productId, productName, variant, type, fromLoc, toLoc, qty, byUser, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).run(id, productId ?? null, productName, variant ?? "", type, fromLoc ?? null, toLoc ?? null, qty ?? 0, byUser ?? "", new Date().toISOString());

  return NextResponse.json({ ok: true, id });
}
