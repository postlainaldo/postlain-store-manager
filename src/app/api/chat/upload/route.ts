import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, extname } from "path";

const ALLOWED_IMAGES = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const ALLOWED_FILES  = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".zip"];
const MAX_MB = 20;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File quá lớn (tối đa ${MAX_MB}MB)` }, { status: 413 });
  }

  const ext = extname(file.name).toLowerCase();
  const isImage = ALLOWED_IMAGES.includes(ext);
  const isFile  = ALLOWED_FILES.includes(ext);
  if (!isImage && !isFile) {
    return NextResponse.json({ error: "Loại file không được hỗ trợ" }, { status: 415 });
  }

  const dir = join(process.cwd(), "public", "chat");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filename = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
  const filepath = join(dir, filename);
  writeFileSync(filepath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    url: `/chat/${filename}`,
    name: file.name,
    mediaType: isImage ? "image" : "file",
    size: file.size,
  });
}
