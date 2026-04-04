import { NextRequest, NextResponse } from "next/server";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function getStoreContext(): Promise<string> {
  if (!IS_SUPABASE) return "";

  try {
    const sb = getSupabase();
    const now = new Date();
    const todayVN = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dayStart = new Date(todayVN + "T00:00:00+07:00").toISOString();
    const dayEnd = new Date(todayVN + "T23:59:59+07:00").toISOString();

    const [ordersRes, lowStockRes, totalProductsRes, shiftsRes] = await Promise.all([
      sb.from("pos_orders").select("total_amount").gte("created_at", dayStart).lte("created_at", dayEnd),
      sb.from("products").select("name, quantity").lt("quantity", 5).gt("quantity", 0).limit(10),
      sb.from("products").select("*", { count: "exact", head: true }),
      sb.from("shift_slots").select("date, startTime, endTime, staffName, staffType").eq("date", todayVN),
    ]);

    const revenue = ordersRes.data?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;
    const billCount = ordersRes.data?.length ?? 0;
    const lowStock = lowStockRes.data ?? [];
    const totalProducts = totalProductsRes.count ?? 0;
    const shifts = shiftsRes.data ?? [];

    return `
## DỮ LIỆU THỰC TẾ HÔM NAY (${todayVN})

### Doanh thu
- Tổng doanh thu: ${revenue.toLocaleString("vi-VN")}đ
- Số hóa đơn: ${billCount}
- AOV: ${billCount > 0 ? (revenue / billCount).toLocaleString("vi-VN") : 0}đ

### Kho hàng
- Tổng sản phẩm: ${totalProducts}
- Sắp hết hàng (dưới 5 cái): ${lowStock.length > 0 ? lowStock.map(p => `${p.name} (còn ${p.quantity})`).join(", ") : "Không có"}

### Ca làm việc hôm nay
${shifts.length > 0 ? shifts.map(s => `- ${s.startTime}-${s.endTime}: ${s.staffName ?? "Chưa có"} (${s.staffType ?? ""})`).join("\n") : "- Chưa có ca nào được xếp"}
`;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY chưa được cấu hình trong environment variables" }, { status: 500 });
  }

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  // Lấy data thực tế từ Supabase
  const storeContext = await getStoreContext();

  const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của cửa hàng POSTLAIN tại Đà Lạt. Bạn hỗ trợ admin và nhân viên quản lý cửa hàng.

Nhiệm vụ:
- Trả lời câu hỏi về vận hành, lịch làm việc, kho hàng, doanh thu
- Phân tích số liệu và đưa ra gợi ý thực tế
- Nhắc nhở task quan trọng
- Trả lời bằng tiếng Việt, ngắn gọn, thực tế

Quy tắc:
- Dùng dữ liệu thực tế bên dưới để trả lời — không bịa số liệu
- Nếu câu hỏi ngoài phạm vi dữ liệu, hướng dẫn kiểm tra trong app
- Thân thiện, chuyên nghiệp
${storeContext ? `\n${storeContext}` : ""}`;

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
    console.error("Gemini error:", res.status, err);
    return NextResponse.json({ error: `Gemini ${res.status}: ${err.slice(0, 200)}` }, { status: 502 });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Xin lỗi, tôi không thể trả lời lúc này.";

  return NextResponse.json({ reply: text });
}
