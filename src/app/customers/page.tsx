"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Users, Search, Phone, Mail, MapPin, ShoppingBag, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  odooId: number | null;
  name: string;
  phone: string | null;
  email: string | null;
  street: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
};

type PosOrder = {
  id: string;
  name: string;
  amountTotal: number;
  lineCount: number;
  createdAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orderHistory, setOrderHistory] = useState<Record<string, PosOrder[]>>({});
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const loadCustomers = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q.trim().length >= 2
        ? `/api/customers?q=${encodeURIComponent(q)}`
        : "/api/customers?limit=200";
      const res = await fetch(url).then(r => r.json());
      if (res.ok) setCustomers(res.customers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadCustomers(val), 400);
  };

  const toggleCustomer = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!orderHistory[id]) {
      const res = await fetch(`/api/customers?customerId=${id}`).then(r => r.json());
      if (res.ok) setOrderHistory(prev => ({ ...prev, [id]: res.orders ?? [] }));
    }
  };

  return (
    <div style={{ padding: "24px 16px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/sales" style={{ color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={22} color="#0ea5e9" /> Khách hàng
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
              {customers.length} khách hàng
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Tìm theo tên, số điện thoại..."
          style={{
            width: "100%", padding: "10px 12px 10px 36px",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, color: "#fff", fontSize: 14, outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 60 }}>Đang tải...</div>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: 60 }}>
          Chưa có khách hàng. Sync POS để tải dữ liệu.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {customers.map(c => (
            <div key={c.id} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, overflow: "hidden",
            }}>
              {/* Customer row */}
              <div
                onClick={() => toggleCustomer(c.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12, padding: "12px 14px",
                  cursor: "pointer", alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                    {c.name}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {c.phone && (
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Phone size={11} /> {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Mail size={11} /> {c.email}
                      </span>
                    )}
                    {c.street && (
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={11} /> {c.street}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A55A" }}>
                      {fmt(c.totalSpent)} ₫
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                      {c.totalOrders} đơn
                    </div>
                  </div>
                  {expanded === c.id ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
                </div>
              </div>

              {/* Order history */}
              {expanded === c.id && (
                <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 8, paddingTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShoppingBag size={12} /> Lịch sử mua hàng
                  </div>
                  {(orderHistory[c.id] ?? []).length === 0 ? (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Chưa có đơn hàng</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {(orderHistory[c.id] ?? []).map(o => (
                        <div key={o.id} style={{
                          display: "grid", gridTemplateColumns: "1fr auto auto",
                          gap: 12, alignItems: "center",
                          padding: "6px 10px", borderRadius: 6,
                          background: "rgba(255,255,255,0.03)",
                        }}>
                          <span style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{o.name}</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            {o.lineCount} SP • {fmtDate(o.createdAt)}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A55A" }}>
                            {fmt(o.amountTotal)} ₫
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
