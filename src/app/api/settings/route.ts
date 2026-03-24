import { NextRequest, NextResponse } from "next/server";
import { dbGetAppSettings, dbSetAppSettings, ensureSupabaseSchema } from "@/lib/dbAdapter";

export async function GET() {
  await ensureSupabaseSchema();
  const settings = await dbGetAppSettings();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  await ensureSupabaseSchema();
  const body = await req.json();
  await dbSetAppSettings(body);
  return NextResponse.json({ ok: true });
}
