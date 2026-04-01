import { NextRequest, NextResponse } from "next/server";
import { dbGetMovements, dbInsertMovement } from "@/lib/dbAdapter";

// GET /api/movements?limit=20
export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 100);
  const rows = await dbGetMovements(limit);
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
  });
}

// POST /api/movements — log a movement
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productId, productName, variant, type, fromLoc, toLoc, qty, byUser } = body;
  if (!productName || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const id = `mv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await dbInsertMovement({
    id, productId: productId ?? null, productName, variant: variant ?? "",
    type, fromLoc: fromLoc ?? null, toLoc: toLoc ?? null,
    qty: qty ?? 0, byUser: byUser ?? "", createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id });
}
