import { NextRequest, NextResponse } from "next/server";
import { dbSetSectionRowOverride } from "@/lib/dbAdapter";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { secId, subId, rowCount } = await req.json() as { secId: string; subId: string; rowCount: number };
  if (!secId || !subId || typeof rowCount !== "number") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  await dbSetSectionRowOverride(secId, subId, rowCount);
  return NextResponse.json({ ok: true });
}
