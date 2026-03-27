import { NextRequest, NextResponse } from "next/server";
import { dbSetSectionRowOverride } from "@/lib/dbAdapter";

export async function POST(req: NextRequest) {
  const { secId, subId, rowCount } = await req.json() as { secId: string; subId: string; rowCount: number };
  if (!secId || !subId || typeof rowCount !== "number") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  await dbSetSectionRowOverride(secId, subId, rowCount);
  return NextResponse.json({ ok: true });
}
