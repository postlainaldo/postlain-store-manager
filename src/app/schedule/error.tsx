"use client";

import { useEffect } from "react";

export default function ScheduleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[schedule] client error:", error);
  }, [error]);

  return (
    <div style={{ padding: 32, fontFamily: "monospace", fontSize: 13 }}>
      <p style={{ color: "#dc2626", fontWeight: 700, marginBottom: 8 }}>Lỗi trang Lịch làm</p>
      <pre style={{ background: "#fef2f2", padding: 12, borderRadius: 8, overflowX: "auto", color: "#7f1d1d", fontSize: 11 }}>
        {error.message}
        {"\n"}
        {error.stack}
      </pre>
      <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
        Thử lại
      </button>
    </div>
  );
}
