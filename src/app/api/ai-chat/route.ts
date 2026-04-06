import { NextRequest, NextResponse } from "next/server";
import { IS_SUPABASE, getSupabase, getActiveStoreId } from "@/lib/supabase";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// gemini-2.0-flash: latest stable, replaces deprecated gemini-2.0-flash-lite
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function getStoreContext(): Promise<string> {
  if (!IS_SUPABASE) return "";

  try {
    const sb = getSupabase();
    const sid = getActiveStoreId();
    const now = new Date();
    const todayVN = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dayStart = new Date(todayVN + "T00:00:00+07:00").toISOString();
    const dayEnd = new Date(todayVN + "T23:59:59+07:00").toISOString();

    const [ordersRes, lowStockRes, totalProductsRes, shiftsRes] = await Promise.all([
      sb.from("pos_orders").select("amountTotal").eq("store_id", sid).gte("createdAt", dayStart).lte("createdAt", dayEnd),
      sb.from("products").select("name, quantity").eq("store_id", sid).lt("quantity", 5).gt("quantity", 0).limit(10),
      sb.from("products").select("*", { count: "exact", head: true }).eq("store_id", sid),
      sb.from("shift_slots").select("date, startTime, endTime").eq("store_id", sid).eq("date", todayVN),
    ]);

    const revenue = ordersRes.data?.reduce((sum, o) => sum + (o.amountTotal ?? 0), 0) ?? 0;
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
${shifts.length > 0 ? shifts.map(s => `- ${s.startTime}-${s.endTime}`).join("\n") : "- Chưa có ca nào được xếp"}
`;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
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
    console.error(`Gemini [${GEMINI_MODEL}] error:`, res.status, err);
    let friendly = `Lỗi Gemini ${res.status}`;
    if (res.status === 404) friendly = `Model ${GEMINI_MODEL} không tồn tại hoặc chưa được kích hoạt`;
    else if (res.status === 429) friendly = "Đã vượt quota Gemini, thử lại sau ít phút";
    else if (res.status === 400) friendly = "Yêu cầu không hợp lệ — kiểm tra nội dung tin nhắn";
    return NextResponse.json({ error: friendly }, { status: 502 });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Xin lỗi, tôi không thể trả lời lúc này.";

  return NextResponse.json({ reply: text });
}
