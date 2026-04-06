import { NextRequest, NextResponse } from "next/server";
import { dbUpdateUser } from "@/lib/dbAdapter";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

// PATCH /api/auth/profile — self-update name, phone, employeeCode
export async function PATCH(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { id, name, phone, employeeCode } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await dbUpdateUser(id, {
    ...(name         !== undefined ? { name }         : {}),
    ...(phone        !== undefined ? { phone }        : {}),
    ...(employeeCode !== undefined ? { employeeCode } : {}),
  });

  return NextResponse.json({ ok: true });
}
