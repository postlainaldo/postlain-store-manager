"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, Users, Bell, X, Hash, ArrowRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { playSound } from "@/hooks/useSFX";

type Result = {
  id: string;
  type: "product" | "user" | "notification" | "page";
  title: string;
  subtitle?: string;
  href: string;
  color?: string;
};

const PAGES: Result[] = [
  { id: "page-home",     type: "page", title: "Tổng Quan",  subtitle: "Dashboard",      href: "/" },
  { id: "page-visual",   type: "page", title: "Trưng Bày",  subtitle: "Visual Board",   href: "/visual-board" },
  { id: "page-inventory",type: "page", title: "Kho Hàng",   subtitle: "Inventory",      href: "/inventory" },
  { id: "page-chat",     type: "page", title: "Chat",       subtitle: "Nhắn tin",       href: "/chat" },
  { id: "page-settings", type: "page", title: "Cài Đặt",    subtitle: "Settings",       href: "/settings" },
];

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(14,165,233,0.2)", color: "#0ea5e9", borderRadius: 3, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const products = useStore(s => s.products);
  const users = useStore(s => s.users);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build results from query
  const buildResults = useCallback((q: string): Result[] => {
    const lq = q.toLowerCase().trim();
    if (!lq) return PAGES;

    const out: Result[] = [];

    // Pages
    PAGES.forEach(p => {
      if (p.title.toLowerCase().includes(lq) || (p.subtitle ?? "").toLowerCase().includes(lq)) {
        out.push(p);
      }
    });

    // Products
    products.forEach(p => {
      if (
        p.name.toLowerCase().includes(lq) ||
        (p.sku ?? "").toLowerCase().includes(lq) ||
        p.category.toLowerCase().includes(lq)
      ) {
        out.push({
          id: `product-${p.id}`,
          type: "product",
          title: p.name,
          subtitle: [p.category, p.sku ? `SKU: ${p.sku}` : "", `Tồn: ${p.quantity}`].filter(Boolean).join(" · "),
          href: `/inventory`,
          color: p.color,
        });
      }
    });

    // Users
    users.forEach(u => {
      if (
        u.name.toLowerCase().includes(lq) ||
        (u.email ?? "").toLowerCase().includes(lq)
      ) {
        out.push({
          id: `user-${u.id}`,
          type: "user",
          title: u.name,
          subtitle: u.role === "admin" ? "Admin" : u.role === "manager" ? "Quản lý" : "Nhân viên",
          href: "/settings",
        });
      }
    });

    return out.slice(0, 12);
  }, [products, users]);

  useEffect(() => {
    setResults(buildResults(query));
    setSelected(0);
  }, [query, buildResults]);

  const navigate = (r: Result) => {
    playSound("navigate");
    router.push(r.href);
    setOpen(false);
  };

  // Keyboard navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(v => Math.min(v + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(v => Math.max(v - 1, 0)); }
    else if (e.key === "Enter" && results[selected]) navigate(results[selected]);
  };

  const iconFor = (type: Result["type"]) => {
    if (type === "product")      return <Package size={12} style={{ color: "#0ea5e9" }} />;
    if (type === "user")         return <Users size={12} style={{ color: "#16a34a" }} />;
    if (type === "notification") return <Bell size={12} style={{ color: "#C9A55A" }} />;
    return <Hash size={12} style={{ color: "#94a3b8" }} />;
  };

  return (
    <>
      {/* Trigger button — shown in TopNav */}
      <button
        onClick={() => { playSound("modalOpen"); setOpen(true); }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 12px", borderRadius: 9,
          background: "rgba(14,165,233,0.06)",
          border: "1px solid rgba(14,165,233,0.18)",
          cursor: "pointer", fontSize: 10, color: "#64748b",
          fontFamily: "inherit", minWidth: 160,
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,165,233,0.10)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.30)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,165,233,0.06)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.18)";
        }}
      >
        <Search size={11} style={{ color: "#94a3b8" }} strokeWidth={1.5} />
        <span style={{ flex: 1, textAlign: "left" }}>Tìm kiếm...</span>
        <span style={{ fontSize: 8.5, background: "rgba(14,165,233,0.12)", borderRadius: 4, padding: "1px 5px", color: "#0ea5e9", fontWeight: 600 }}>
          Ctrl K
        </span>
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(12,26,46,0.5)", backdropFilter: "blur(4px)", padding: "10vh 16px 0" }}
            onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #bae6fd", boxShadow: "0 32px 80px rgba(12,26,46,0.2)", width: "100%", maxWidth: 560, margin: "0 auto", overflow: "hidden" }}
            >
              {/* Search input */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #e0f2fe" }}>
                <Search size={14} style={{ color: "#0ea5e9", flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Tìm sản phẩm, người dùng, trang..."
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0c1a2e", fontFamily: "inherit", background: "transparent" }}
                />
                {query && (
                  <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <X size={13} style={{ color: "#94a3b8" }} />
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: "#94a3b8", fontFamily: "inherit" }}>
                  ESC
                </button>
              </div>

              {/* Results */}
              <div style={{ maxHeight: 380, overflowY: "auto", padding: "6px 8px 8px" }}>
                {results.length === 0 ? (
                  <p style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
                    Không tìm thấy kết quả
                  </p>
                ) : (
                  <>
                    {!query && <p style={{ fontSize: 9, color: "#94a3b8", padding: "4px 8px 2px", letterSpacing: "0.1em" }}>ĐIỀU HƯỚNG NHANH</p>}
                    {results.map((r, i) => (
                      <button
                        key={r.id}
                        onClick={() => navigate(r)}
                        onMouseEnter={() => setSelected(i)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer",
                          fontFamily: "inherit", textAlign: "left",
                          background: selected === i ? "rgba(14,165,233,0.07)" : "transparent",
                          transition: "background 0.1s",
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                          background: selected === i ? "rgba(14,165,233,0.12)" : "#f0f9ff",
                          border: "1px solid #e0f2fe",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {r.color
                            ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color, border: "1px solid rgba(0,0,0,0.1)" }} />
                            : iconFor(r.type)
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: "#0c1a2e" }}>
                            {highlight(r.title, query)}
                          </p>
                          {r.subtitle && (
                            <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>
                              {highlight(r.subtitle, query)}
                            </p>
                          )}
                        </div>
                        {selected === i && <ArrowRight size={11} style={{ color: "#0ea5e9", flexShrink: 0 }} />}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div style={{ borderTop: "1px solid #e0f2fe", padding: "7px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                {[["↑↓", "Di chuyển"], ["↵", "Chọn"], ["Esc", "Đóng"]].map(([k, v]) => (
                  <span key={k} style={{ fontSize: 9, color: "#94a3b8", display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ background: "#f0f9ff", border: "1px solid #e0f2fe", borderRadius: 4, padding: "1px 5px", fontSize: 8.5, fontWeight: 600, color: "#64748b" }}>{k}</span>
                    {v}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
