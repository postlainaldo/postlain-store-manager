import { NextRequest, NextResponse } from "next/server";
import { dbGetProducts, dbGetProductBySku, dbUpsertProduct, dbDeleteProduct, dbDeleteProducts, dbGetUserRole } from "@/lib/dbAdapter";
import type { Product } from "@/types";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

// GET is public — needed for visual board, scan, etc.
export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const sku = req.nextUrl.searchParams.get("sku");
  if (sku) {
    const product = await dbGetProductBySku(sku);
    if (!product) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(product);
  }
  return NextResponse.json(await dbGetProducts());
}

async function requireManagerOrAbove(req: NextRequest): Promise<{ error: NextResponse } | null> {
  const userId = req.headers.get("x-user-id");
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = await dbGetUserRole(userId);
  if (!role || !["admin", "manager"].includes(role)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return null;
}

export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const auth = await requireManagerOrAbove(req);
  if (auth) return auth.error;
  const product: Product = await req.json();
  const saved = await dbUpsertProduct(product);
  return NextResponse.json(saved, { status: 201 });
}

export async function PUT(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const auth = await requireManagerOrAbove(req);
  if (auth) return auth.error;
  const updated: Product = await req.json();
  updated.updatedAt = new Date().toISOString();
  const result = await dbUpsertProduct(updated);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const auth = await requireManagerOrAbove(req);
  if (auth) return auth.error;
  const body = await req.json();
  if (Array.isArray(body.ids)) {
    await dbDeleteProducts(body.ids);
    return NextResponse.json({ deleted: body.ids.length });
  }
  await dbDeleteProduct(body.id);
  return NextResponse.json({ success: true });
}
