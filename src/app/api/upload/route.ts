import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, extname } from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const dir = join(process.cwd(), "public", "assets");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const ext = extname(file.name) || ".jpg";
  const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
  const filepath = join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(filepath, buffer);

  return NextResponse.json({ path: `/assets/${filename}` });
}
