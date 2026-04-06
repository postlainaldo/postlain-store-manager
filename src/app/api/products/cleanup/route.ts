import { NextResponse } from "next/server";
import { dbDeleteBadOdooProducts } from "@/lib/dbAdapter";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export const dynamic = "force-dynamic";

// POST /api/products/cleanup
// Removes Odoo products with category "Khác" or price null/0
export async function POST() {
  try {
    const deleted = await dbDeleteBadOdooProducts();
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
