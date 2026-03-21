import { NextRequest, NextResponse } from "next/server";
import { readProducts, writeProducts } from "@/lib/db";
import { Product } from "@/types";

export async function GET() {
  return NextResponse.json(readProducts());
}

export async function POST(req: NextRequest) {
  const product: Product = await req.json();
  const products = readProducts();
  products.push(product);
  writeProducts(products);
  return NextResponse.json(product, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const updated: Product = await req.json();
  const products = readProducts();
  const idx = products.findIndex((p) => p.id === updated.id);
  if (idx === -1)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  products[idx] = { ...products[idx], ...updated, updatedAt: new Date().toISOString() };
  writeProducts(products);
  return NextResponse.json(products[idx]);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  // Bulk delete: { ids: string[] }
  if (Array.isArray(body.ids)) {
    const idSet = new Set<string>(body.ids);
    const products = readProducts().filter((p) => !idSet.has(p.id));
    writeProducts(products);
    return NextResponse.json({ deleted: body.ids.length });
  }
  // Single delete: { id: string }
  const products = readProducts().filter((p) => p.id !== body.id);
  writeProducts(products);
  return NextResponse.json({ success: true });
}
