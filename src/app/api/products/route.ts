import { NextRequest, NextResponse } from "next/server";
import { dbGetProducts, dbGetProductBySku, dbUpsertProduct, dbDeleteProduct, dbDeleteProducts } from "@/lib/dbAdapter";
import type { Product } from "@/types";

export async function GET(req: NextRequest) {
  const sku = req.nextUrl.searchParams.get("sku");
  if (sku) {
    const product = await dbGetProductBySku(sku);
    if (!product) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(product);
  }
  return NextResponse.json(await dbGetProducts());
}

export async function POST(req: NextRequest) {
  const product: Product = await req.json();
  const saved = await dbUpsertProduct(product);
  return NextResponse.json(saved, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const updated: Product = await req.json();
  updated.updatedAt = new Date().toISOString();
  const result = await dbUpsertProduct(updated);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  if (Array.isArray(body.ids)) {
    await dbDeleteProducts(body.ids);
    return NextResponse.json({ deleted: body.ids.length });
  }
  await dbDeleteProduct(body.id);
  return NextResponse.json({ success: true });
}
