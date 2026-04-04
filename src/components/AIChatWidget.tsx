"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, ChevronDown } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatWidgetProps {
  currentUser?: { id: string; name: string; role: string } | null;
}

export default function AIChatWidget({ currentUser }: AIChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Xin chào! Tôi là trợ lý AI của POSTLAIN. Tôi có thể giúp bạn quản lý lịch ca, kho hàng, hoặc trả lời câu hỏi về vận hành cửa hàng. Bạn cần hỗ trợ gì?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

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
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Xin lỗi, có lỗi xảy ra." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối. Vui lòng thử lại." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white text-sm font-medium"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          title="Chat với AI"
        >
          <Bot size={20} />
          <span className="hidden md:inline">Trợ lý AI</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: "min(360px, calc(100vw - 32px))",
            height: "min(500px, calc(100dvh - 160px))",
            background: "var(--bg-card, #fff)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <span className="font-semibold text-sm">Trợ lý AI POSTLAIN</span>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ fontSize: 13 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl leading-relaxed whitespace-pre-wrap"
                  style={
                    msg.role === "user"
                      ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", borderBottomRightRadius: 4 }
                      : { background: "rgba(99,102,241,0.08)", color: "var(--text-primary, #1a1a1a)", borderBottomLeftRadius: 4 }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  <Bot size={12} className="text-white" />
                </div>
                <div className="px-3 py-2 rounded-2xl" style={{ background: "rgba(99,102,241,0.08)", borderBottomLeftRadius: 4 }}>
                  <Loader2 size={14} className="animate-spin text-indigo-500" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Nhập câu hỏi..."
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "var(--text-primary, #1a1a1a)" }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
