import { NextRequest, NextResponse } from "next/server";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";
import { extname } from "path";

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

  const filename = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (IS_SUPABASE) {
    // Upload to Supabase Storage (persistent)
    const sb = getSupabase();
    const { error } = await sb.storage
      .from("chat-media")
      .upload(filename, buffer, {
        contentType: file.type || (isImage ? "image/jpeg" : "application/octet-stream"),
        upsert: false,
      });

    if (error) {
      // Bucket may not exist yet — try creating it
      await sb.storage.createBucket("chat-media", { public: true });
      const { error: err2 } = await sb.storage
        .from("chat-media")
        .upload(filename, buffer, {
          contentType: file.type || (isImage ? "image/jpeg" : "application/octet-stream"),
          upsert: false,
        });
      if (err2) {
        return NextResponse.json({ error: "Upload thất bại: " + err2.message }, { status: 500 });
      }
    }

    const { data: { publicUrl } } = sb.storage.from("chat-media").getPublicUrl(filename);

    return NextResponse.json({
      url: publicUrl,
      name: file.name,
      mediaType: isImage ? "image" : "file",
      size: file.size,
    });
  }

  // Local dev: write to public/chat/
  const { writeFileSync, mkdirSync, existsSync } = await import("fs");
  const { join } = await import("path");
  const dir = join(process.cwd(), "public", "chat");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), buffer);

  return NextResponse.json({
    url: `/chat/${filename}`,
    name: file.name,
    mediaType: isImage ? "image" : "file",
    size: file.size,
  });
}
