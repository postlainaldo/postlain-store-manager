import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, insertProduct, updateProduct, deleteProduct, deleteProducts } from "@/lib/repo";
import getDb from "@/lib/database";
import type { Product } from "@/types";

export async function GET(req: NextRequest) {
  const sku = req.nextUrl.searchParams.get("sku");
  if (sku) {
    const db = getDb();
    const product = db.prepare("SELECT * FROM products WHERE sku = ? COLLATE NOCASE").get(sku.trim()) as Product | undefined;
    if (!product) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(product);
  }
  return NextResponse.json(getAllProducts());
}

export async function POST(req: NextRequest) {
  const product: Product = await req.json();
  const saved = insertProduct(product);
  return NextResponse.json(saved, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const updated: Product = await req.json();
  const result = updateProduct(updated);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  if (Array.isArray(body.ids)) {
    deleteProducts(body.ids);
    return NextResponse.json({ deleted: body.ids.length });
  }
  deleteProduct(body.id);
  return NextResponse.json({ success: true });
}
