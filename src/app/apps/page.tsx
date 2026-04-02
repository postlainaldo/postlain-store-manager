"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { ExternalLink } from "lucide-react";

const APPS = [
  {
    id: "outlook",
    name: "Outlook",
    desc: "Email & lịch",
    url: "https://outlook.cloud.microsoft/mail/inbox/id/AAQkADE5MmNjMDdiLThhMzgtNDZjNC1iZmQ4LTI3ZjU5OTg1M2Y5ZQAQALFR%2FihtXxlItG1hdm0M10A%3D",
    icon: "/icons/outlook.png",
    color: "#0078D4",
    gradient: "linear-gradient(135deg,#0078D4,#106EBE)",
  },
  {
    id: "teams",
    name: "Teams",
    desc: "Họp & chat nội bộ",
    url: "https://teams.cloud.microsoft/",
    icon: "/icons/teams.png",
    color: "#5059C9",
    gradient: "linear-gradient(135deg,#5059C9,#7B83EB)",
  },
  {
    id: "palexy",
    name: "Palexy",
    desc: "Phân tích traffic cửa hàng",
    url: "https://ica.palexy.com/overview/report/stores",
    icon: "/icons/palexy.png",
    color: "#6366f1",
    gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
  },
  {
    id: "vnpay",
    name: "VNPay",
    desc: "Quản lý giao dịch",
    url: "https://doitac.vnpay.vn/transaction/list",
    icon: "/icons/vnpay.png",
    color: "#0066CC",
    gradient: "linear-gradient(135deg,#0066CC,#0EA5E9)",
  },
  {
    id: "momo",
    name: "MoMo",
    desc: "Cổng thanh toán",
    url: "https://business.momo.vn/portal/login",
    icon: "/icons/momo.png",
    color: "#A50064",
    gradient: "linear-gradient(135deg,#A50064,#D4006A)",
  },
  {
    id: "cadena",
    name: "Cadena HRS",
    desc: "Quản lý nhân sự",
    url: "https://hrs.vtijs.com/Login.aspx",
    icon: "/icons/cadena.png",
    color: "#10b981",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
  },
];

// Fallback letter avatar when no icon image
function AppIcon({ app }: { app: typeof APPS[0] }) {
  return (
    <div style={{
      width: 56, height: 56,
      borderRadius: 16,
      background: app.gradient,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      boxShadow: `0 4px 16px ${app.color}40`,
    }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
        {app.name[0]}
      </span>
    </div>
  );
}

export default function AppsPage() {
  const router = useRouter();
  const currentUser = useStore(s => s.currentUser);

  // Admin-only
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin" && currentUser.role !== "manager") {
      router.replace("/");
    }
  }, [currentUser, router]);

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "manager")) {
    return null;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.2em", marginBottom: 4 }}>
          CÔNG CỤ · POSTLAIN
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0c1a2e", margin: 0 }}>Ứng Dụng</h1>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
          Truy cập nhanh các công cụ quản lý
        </p>
      </div>

      {/* App grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {APPS.map(app => (
          <button
            key={app.id}
            onClick={() => window.open(app.url, "_blank", "noopener,noreferrer")}
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "14px 16px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.9)",
              border: "1.5px solid rgba(226,232,240,0.8)",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              fontFamily: "inherit",
              boxShadow: "0 2px 8px rgba(12,26,46,0.06)",
              transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${app.color}20, 0 2px 8px rgba(12,26,46,0.08)`;
              (e.currentTarget as HTMLElement).style.borderColor = `${app.color}50`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(12,26,46,0.06)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(226,232,240,0.8)";
            }}
          >
            <AppIcon app={app} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0c1a2e", margin: 0 }}>{app.name}</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>{app.desc}</p>
            </div>

            <div style={{
              width: 32, height: 32,
              borderRadius: 10,
              background: `${app.color}12`,
              border: `1px solid ${app.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <ExternalLink size={14} style={{ color: app.color }} />
            </div>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <p style={{ fontSize: 10, color: "#cbd5e1", textAlign: "center", marginTop: 24 }}>
        Các ứng dụng mở trong tab mới · Chỉ Admin & Quản lý
      </p>
    </div>
  );
}
