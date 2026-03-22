import { NextRequest, NextResponse } from "next/server";
import { bulkUpsertProducts } from "@/lib/repo";
import type { Product } from "@/types";

export async function POST(req: NextRequest) {
  const rows: Product[] = await req.json();
  const result = bulkUpsertProducts(rows);
  return NextResponse.json(result, { status: 200 });
}
