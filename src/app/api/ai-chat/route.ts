import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của cửa hàng POSTLAIN. Bạn hỗ trợ admin và nhân viên quản lý cửa hàng.

Nhiệm vụ của bạn:
- Trả lời câu hỏi về vận hành cửa hàng, lịch làm việc, quản lý kho, sản phẩm
- Nhắc nhở các task quan trọng theo yêu cầu
- Gợi ý xếp lịch thông minh dựa trên nhu cầu
- Hỗ trợ phân tích doanh thu, báo cáo đơn giản
- Trả lời bằng tiếng Việt, ngắn gọn, thực tế

Quy tắc:
- Luôn thân thiện, chuyên nghiệp
- Nếu không biết dữ liệu cụ thể, hướng dẫn người dùng kiểm tra trong app
- Không bịa đặt số liệu
- Ưu tiên câu trả lời ngắn gọn, dễ hiểu`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key chưa được cấu hình" }, { status: 500 });
  }

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  // Build contents array for Gemini
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "Lỗi kết nối AI" }, { status: 502 });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Xin lỗi, tôi không thể trả lời lúc này.";

  return NextResponse.json({ reply: text });
}
