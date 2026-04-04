"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, ChevronDown, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatWidgetProps {
  currentUser?: { id: string; name: string; role: string } | null;
}

const WELCOME = "Xin chào! Tôi là trợ lý AI của POSTLAIN. Tôi có thể giúp bạn về lịch ca, kho hàng, doanh thu và vận hành cửa hàng. Bạn cần hỗ trợ gì?";

export default function AIChatWidget({ currentUser }: AIChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
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
    setError(null);

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

      if (!res.ok) {
        throw new Error(data.error || `Lỗi ${res.status}`);
      }

      if (!data.reply) {
        throw new Error("Không nhận được phản hồi từ AI");
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi kết nối";
      setError(msg);
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([{ role: "assistant", content: WELCOME }]);
    setError(null);
    setInput("");
  }

  if (!currentUser) return null;

  return (
    <>
      {/* ── Floating button ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Trợ lý AI POSTLAIN"
          style={{
            position: "fixed",
            bottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
            right: 16,
            zIndex: 48,
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "1.5px solid rgba(201,165,90,0.45)",
            background: "linear-gradient(135deg, #0c1a2e 0%, #1a2e4a 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,165,90,0.12), inset 0 1px 0 rgba(201,165,90,0.15)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          className="md:bottom-6 md:right-6"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(0,0,0,0.55), 0 0 0 2px rgba(201,165,90,0.25), inset 0 1px 0 rgba(201,165,90,0.20)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,165,90,0.12), inset 0 1px 0 rgba(201,165,90,0.15)";
          }}
        >
          <Sparkles size={20} style={{ color: "#C9A55A", filter: "drop-shadow(0 0 6px rgba(201,165,90,0.6))" }} />
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
            right: 16,
            zIndex: 48,
            display: "flex",
            flexDirection: "column",
            borderRadius: 20,
            overflow: "hidden",
            width: "min(380px, calc(100vw - 32px))",
            height: "min(520px, calc(100dvh - 160px))",
            background: "linear-gradient(180deg, #0a0f1e 0%, #0c1220 100%)",
            border: "1px solid rgba(201,165,90,0.20)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(201,165,90,0.12)",
          }}
          className="md:bottom-6 md:right-6"
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(201,165,90,0.12)",
            background: "rgba(201,165,90,0.04)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #1a2e4a, #0c1a2e)",
                border: "1.5px solid rgba(201,165,90,0.40)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(201,165,90,0.15)",
              }}>
                <Sparkles size={15} style={{ color: "#C9A55A" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8d5a3", letterSpacing: "0.02em" }}>
                  Trợ lý AI
                </div>
                <div style={{ fontSize: 10, color: "rgba(201,165,90,0.55)", marginTop: 1 }}>
                  POSTLAIN · {loading ? "Đang trả lời..." : "Sẵn sàng"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={reset}
                title="Đặt lại cuộc trò chuyện"
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(255,255,255,0.45)",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(255,255,255,0.45)",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}
              >
                <ChevronDown size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            scrollbarWidth: "none",
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: 8,
              }}>
                {msg.role === "assistant" && (
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #1a2e4a, #0c1a2e)",
                    border: "1px solid rgba(201,165,90,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 2,
                  }}>
                    <Sparkles size={11} style={{ color: "#C9A55A" }} />
                  </div>
                )}
                <div style={{
                  maxWidth: "78%",
                  padding: "9px 13px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  ...(msg.role === "user" ? {
                    background: "linear-gradient(135deg, #1a3050, #0f2040)",
                    color: "#d4e8ff",
                    border: "1px solid rgba(100,160,255,0.20)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.30)",
                  } : {
                    background: "rgba(201,165,90,0.07)",
                    color: "rgba(255,255,255,0.88)",
                    border: "1px solid rgba(201,165,90,0.14)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.20)",
                  }),
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #1a2e4a, #0c1a2e)",
                  border: "1px solid rgba(201,165,90,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sparkles size={11} style={{ color: "#C9A55A" }} />
                </div>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  background: "rgba(201,165,90,0.07)",
                  border: "1px solid rgba(201,165,90,0.14)",
                  display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "rgba(201,165,90,0.60)",
                      animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Nhập câu hỏi..."
              disabled={loading}
              style={{
                flex: 1,
                fontSize: 13,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 12,
                padding: "9px 13px",
                color: "rgba(255,255,255,0.88)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(201,165,90,0.40)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #C9A55A, #a07830)"
                  : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(201,165,90,0.25)",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s, transform 0.1s",
                opacity: input.trim() && !loading ? 1 : 0.4,
              }}
            >
              {loading
                ? <Loader2 size={16} style={{ color: "#C9A55A", animation: "spin 1s linear infinite" }} />
                : <Send size={15} style={{ color: input.trim() ? "#0c1a2e" : "rgba(255,255,255,0.4)" }} />
              }
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
