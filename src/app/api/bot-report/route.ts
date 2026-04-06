import { NextRequest, NextResponse } from "next/server";
import { IS_SUPABASE, getSupabase } from "@/lib/supabase";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export const dynamic = "force-dynamic";

// Secret token để bảo vệ endpoint này
const BOT_SECRET = process.env.BOT_REPORT_SECRET ?? "postlain-bot-2026";

/**
 * GET /api/bot-report?secret=xxx&type=daily
 * Trả về báo cáo dạng text đơn giản cho bot Telegram đọc
 */
export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const type = searchParams.get("type") ?? "daily";

  if (secret !== BOT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!IS_SUPABASE) {
    return NextResponse.json({ ok: false, error: "Chỉ hoạt động với Supabase" }, { status: 503 });
  }

  const sb = getSupabase();
  const now = new Date();
  const todayVN = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dayStart = new Date(todayVN + "T00:00:00+07:00").toISOString();
  const dayEnd = new Date(todayVN + "T23:59:59+07:00").toISOString();

  try {
    if (type === "daily") {
      // Lấy doanh thu hôm nay từ POS orders
      const { data: orders } = await sb
        .from("pos_orders")
        .select("total_amount, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      const revenue = orders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;
      const billCount = orders?.length ?? 0;

      // Lấy tồn kho
      const { data: products } = await sb
        .from("products")
        .select("id, name, quantity")
        .lt("quantity", 5)
        .gt("quantity", 0)
        .order("quantity", { ascending: true })
        .limit(5);

      const { count: totalProducts } = await sb
        .from("products")
        .select("*", { count: "exact", head: true });

      // Lấy lịch ca hôm nay
      const { data: slots } = await sb
        .from("shift_slots")
        .select("id, startTime, endTime, staffName, staffType")
        .eq("date", todayVN);

      const report = `📊 *BÁO CÁO NGÀY ${todayVN}*

💰 *Doanh thu hôm nay*
• Tổng: ${revenue.toLocaleString("vi-VN")}đ
• Số hóa đơn: ${billCount}
• AOV: ${billCount > 0 ? (revenue / billCount).toLocaleString("vi-VN") : 0}đ

📦 *Tồn kho*
• Tổng sản phẩm: ${totalProducts ?? 0}
${products && products.length > 0
  ? `• Sắp hết hàng:\n${products.map(p => `  - ${p.name}: còn ${p.quantity}`).join("\n")}`
  : "• Không có sản phẩm sắp hết hàng ✅"}

👥 *Ca làm việc hôm nay*
${slots && slots.length > 0
  ? slots.map(s => `• ${s.startTime}-${s.endTime}: ${s.staffName ?? "Chưa có"} (${s.staffType ?? ""})`).join("\n")
  : "• Chưa có ca nào được xếp"}`;

      return NextResponse.json({ ok: true, report, date: todayVN });
    }

    if (type === "shifts") {
      // Lịch ca tuần này
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monStr = monday.toISOString().slice(0, 10);
      const sunStr = sunday.toISOString().slice(0, 10);

      const { data: slots } = await sb
        .from("shift_slots")
        .select("date, startTime, endTime, staffName, staffType")
        .gte("date", monStr)
        .lte("date", sunStr)
        .order("date", { ascending: true });

      const grouped = (slots ?? []).reduce((acc, s) => {
        if (!acc[s.date]) acc[s.date] = [];
        acc[s.date].push(`${s.startTime}-${s.endTime}: ${s.staffName ?? "Trống"}`);
        return acc;
      }, {} as Record<string, string[]>);

      const report = `📅 *LỊCH CA TUẦN ${monStr} → ${sunStr}*\n\n` +
        Object.entries(grouped).map(([date, shifts]) =>
          `*${date}*\n${shifts.map(s => `  • ${s}`).join("\n")}`
        ).join("\n\n");

      return NextResponse.json({ ok: true, report });
    }

    return NextResponse.json({ ok: false, error: "type phải là daily hoặc shifts" }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
