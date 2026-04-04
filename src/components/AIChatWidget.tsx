"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, Loader2, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatWidgetProps {
  currentUser?: { id: string; name: string; role: string } | null;
}

const WELCOME = "Xin chào! Tôi là trợ lý AI của POSTLAIN. Tôi có thể giúp bạn về lịch ca, kho hàng, doanh thu và vận hành cửa hàng. Bạn cần hỗ trợ gì?";

export default function AIChatWidget({ currentUser }: AIChatWidgetProps) {
  const [open, setOpen]         = useState(false);
  const [peeking, setPeeking]   = useState(false); // button partially visible
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: WELCOME }]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);
  const hideTimerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-peek on mount, hide after 5s
  useEffect(() => {
    setPeeking(true);
    hideTimerRef.current = setTimeout(() => setPeeking(false), 5000);
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setPeeking(true);
    hideTimerRef.current = setTimeout(() => setPeeking(false), 5000);
  }, []);

  useEffect(() => {
    if (open) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 120);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply ?? "Không nhận được phản hồi" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi kết nối";
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([{ role: "assistant", content: WELCOME }]);
    setInput("");
  }

  if (!currentUser) return null;

  const btnVisible = open || peeking;

  return (
    <>
      {/* ── Floating trigger button — LEFT side, partially hidden ── */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
          left: 0,
          zIndex: 48,
          transform: open ? "translateX(0)" : btnVisible ? "translateX(-8px)" : "translateX(-38px)",
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s",
          opacity: open ? 0 : btnVisible ? 0.55 : 0.18,
        }}
        onMouseEnter={resetHideTimer}
      >
        <button
          onClick={() => { setOpen(true); setPeeking(false); }}
          title="Trợ lý AI POSTLAIN"
          style={{
            width: 48, height: 48,
            borderRadius: "0 24px 24px 0",
            border: "1.5px solid rgba(201,165,90,0.45)",
            borderLeft: "none",
            background: "linear-gradient(135deg, #0c1a2e 0%, #1a2e4a 100%)",
            boxShadow: "2px 4px 16px rgba(0,0,0,0.40)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Sparkles size={18} style={{ color: "#C9A55A", filter: "drop-shadow(0 0 5px rgba(201,165,90,0.5))" }} />
        </button>
      </div>

      {/* ── Chat panel ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
            left: 12,
            zIndex: 49,
            display: "flex",
            flexDirection: "column",
            borderRadius: 20,
            overflow: "hidden",
            width: "min(360px, calc(100vw - 24px))",
            height: "min(500px, calc(100dvh - 160px))",
            background: "linear-gradient(180deg, #0a0f1e 0%, #0c1220 100%)",
            border: "1px solid rgba(201,165,90,0.20)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(201,165,90,0.12)",
            animation: "slideInLeft 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          }}
          className="md:bottom-6 md:left-6"
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: "1px solid rgba(201,165,90,0.12)",
            background: "rgba(201,165,90,0.04)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, #1a2e4a, #0c1a2e)",
                border: "1.5px solid rgba(201,165,90,0.40)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={14} style={{ color: "#C9A55A" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e8d5a3" }}>Trợ lý AI</div>
                <div style={{ fontSize: 9, color: "rgba(201,165,90,0.55)", marginTop: 1 }}>
                  POSTLAIN · {loading ? "Đang trả lời..." : "Sẵn sàng"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={reset} title="Đặt lại"
                style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.45)" }}>
                <RotateCcw size={12} />
              </button>
              <button onClick={() => { setOpen(false); resetHideTimer(); }}
                style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.45)" }}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 9, scrollbarWidth: "none" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #1a2e4a, #0c1a2e)", border: "1px solid rgba(201,165,90,0.35)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
                    <Sparkles size={10} style={{ color: "#C9A55A" }} />
                  </div>
                )}
                <div style={{
                  maxWidth: "78%", padding: "8px 12px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  ...(msg.role === "user"
                    ? { background: "linear-gradient(135deg,#1a3050,#0f2040)", color: "#d4e8ff", border: "1px solid rgba(100,160,255,0.20)" }
                    : { background: "rgba(201,165,90,0.07)", color: "rgba(255,255,255,0.88)", border: "1px solid rgba(201,165,90,0.14)" }),
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#1a2e4a,#0c1a2e)", border: "1px solid rgba(201,165,90,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={10} style={{ color: "#C9A55A" }} />
                </div>
                <div style={{ padding: "9px 13px", borderRadius: "14px 14px 14px 4px", background: "rgba(201,165,90,0.07)", border: "1px solid rgba(201,165,90,0.14)", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(201,165,90,0.60)", animation: `dotBounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "9px 11px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", flexShrink: 0, display: "flex", alignItems: "center", gap: 7 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Nhập câu hỏi..."
              disabled={loading}
              style={{ flex: 1, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "8px 12px", color: "rgba(255,255,255,0.88)", outline: "none" }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(201,165,90,0.40)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ width: 35, height: 35, borderRadius: "50%", flexShrink: 0, background: input.trim() && !loading ? "linear-gradient(135deg,#C9A55A,#a07830)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(201,165,90,0.25)", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", opacity: input.trim() && !loading ? 1 : 0.4 }}>
              {loading
                ? <Loader2 size={14} style={{ color: "#C9A55A", animation: "spin 1s linear infinite" }} />
                : <Send size={13} style={{ color: input.trim() ? "#0c1a2e" : "rgba(255,255,255,0.4)" }} />
              }
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.5} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideInLeft { from{transform:translateX(-40px);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </>
  );
}
