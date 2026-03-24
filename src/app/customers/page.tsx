"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Users, Search, Phone, Mail, ShoppingBag, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Customer = {
  id: string; name: string; phone: string | null; email: string | null;
  totalOrders: number; totalSpent: number; lastOrderAt: string | null;
};
type PosOrder = { id: string; name: string; amountTotal: number; lineCount: number; createdAt: string };

function fmt(n: number) { return new Intl.NumberFormat("vi-VN").format(Math.round(n)); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orderHistory, setOrderHistory] = useState<Record<string, PosOrder[]>>({});
  const timer = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q.trim().length >= 2
        ? `/api/customers?q=${encodeURIComponent(q)}`
        : "/api/customers?limit=200";
      const res = await fetch(url).then(r => r.json());
      if (res.ok) setCustomers(res.customers ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(val), 400);
  };

  const toggleCustomer = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!orderHistory[id]) {
      const res = await fetch(`/api/customers?customerId=${id}`).then(r => r.json());
      if (res.ok) setOrderHistory(p => ({ ...p, [id]: res.orders ?? [] }));
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0c1a2e 0%, #0f2035 100%)",
      padding: "24px 16px 80px",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Link href="/sales" style={{ color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} color="#38bdf8" />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Khách hàng</h1>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              {customers.length} khách hàng
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Tìm theo tên, số điện thoại..."
            style={{
              width: "100%", padding: "9px 12px 9px 34px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#fff", fontSize: 13, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: 60 }}>Đang tải...</div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", padding: 60, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            Chưa có dữ liệu — sync POS để tải khách hàng
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {customers.map(c => (
              <div key={c.id} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10, overflow: "hidden",
              }}>
                <div onClick={() => toggleCustomer(c.id)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", cursor: "pointer", gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{c.name}</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {c.phone && (
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Phone size={10} /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Mail size={10} /> {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A55A" }}>{fmt(c.totalSpent)} ₫</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{c.totalOrders} đơn</div>
                    </div>
                    {expanded === c.id ? <ChevronUp size={13} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={13} color="rgba(255,255,255,0.3)" />}
                  </div>
                </div>

                {expanded === c.id && (
                  <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, paddingTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                      <ShoppingBag size={11} /> Lịch sử mua hàng
                    </div>
                    {(orderHistory[c.id] ?? []).length === 0 ? (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Không có đơn hàng</div>
                    ) : (orderHistory[c.id] ?? []).map(o => (
                      <div key={o.id} style={{
                        display: "grid", gridTemplateColumns: "1fr auto auto",
                        gap: 12, padding: "5px 8px", borderRadius: 6,
                        background: "rgba(255,255,255,0.03)", marginBottom: 3,
                      }}>
                        <span style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{o.name}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{o.lineCount} SP • {fmtDate(o.createdAt)}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A55A" }}>{fmt(o.amountTotal)} ₫</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
