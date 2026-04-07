"use client";

import { useEffect } from "react";

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Schedule Error]", error);
  }, [error]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", gap: 16, padding: 24,
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>Lỗi trang lịch làm việc</p>
      <p style={{ fontSize: 12, color: "#64748b", maxWidth: 320, textAlign: "center" }}>
        {error.message || "Đã xảy ra lỗi không xác định."}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "#0ea5e9", color: "#fff", border: "none", cursor: "pointer",
        }}
      >
        Thử lại
      </button>
    </div>
  );
}
