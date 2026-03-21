import { NextRequest, NextResponse } from "next/server";
import { readProducts, writeProducts } from "@/lib/db";
import { Product } from "@/types";

// Upsert logic: match by SKU (if exists) then by exact name+category
// If matched → update price, markdownPrice, quantity; else → insert new
export async function POST(req: NextRequest) {
  const incoming: Product[] = await req.json();
  const existing = readProducts();

  const result: Product[] = [...existing];
  const updated: Product[] = [];
  const inserted: Product[] = [];

  for (const item of incoming) {
    const skuMatch = item.sku
      ? result.findIndex(p => p.sku && p.sku.toLowerCase() === item.sku!.toLowerCase())
      : -1;
    const nameMatch =
      skuMatch === -1
        ? result.findIndex(
            p =>
              p.name.toLowerCase() === item.name.toLowerCase() &&
              p.category === item.category
          )
        : -1;

    const idx = skuMatch !== -1 ? skuMatch : nameMatch;

    if (idx !== -1) {
      // Update existing: refresh price, markdownPrice, quantity only
      result[idx] = {
        ...result[idx],
        price: item.price ?? result[idx].price,
        markdownPrice: item.markdownPrice ?? result[idx].markdownPrice,
        quantity: item.quantity ?? result[idx].quantity,
        updatedAt: item.updatedAt,
      };
      updated.push(result[idx]);
    } else {
      result.push(item);
      inserted.push(item);
    }
  }

  writeProducts(result);
  return NextResponse.json({ updated: updated.length, inserted: inserted.length, products: [...updated, ...inserted] }, { status: 201 });
}
