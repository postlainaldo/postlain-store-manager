import { NextRequest, NextResponse } from "next/server";
import { dbUpsertProduct } from "@/lib/dbAdapter";
import type { Product } from "@/types";

export async function POST(req: NextRequest) {
  const rows: Product[] = await req.json();
  const now = new Date().toISOString();
  const upserted = await Promise.all(
    rows.map(p => dbUpsertProduct({ ...p, updatedAt: p.updatedAt || now, createdAt: p.createdAt || now }))
  );
  return NextResponse.json({ products: upserted }, { status: 200 });
}
