"use client";

import {
  useState, useEffect, useRef, useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Hash, Megaphone, Plus, Trash2,
  Crown, UserCheck, User, Circle, X, Check,
  Smile, ChevronLeft,
} from "lucide-react";
import { useStore } from "@/store/useStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Room = {
  id: string; name: string; type: string;
  lastMessage: { content: string; userName: string; createdAt: string } | null;
  messageCount: number;
};
type Message = {
  id: string; roomId: string; userId: string;
  userName: string; content: string; createdAt: string;
  deletedAt?: string | null;
};
type Member = {
  id: string; name: string; avatar: string | null;
  status: string; role: string;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<string, { color: string; icon: typeof User }> = {
  admin:   { color: "#C9A55A", icon: Crown },
  manager: { color: "#0ea5e9", icon: UserCheck },
  staff:   { color: "#64748b", icon: User },
};
const STATUS_COLOR: Record<string, string> = {
  online: "#10b981", busy: "#f59e0b", away: "#94a3b8", offline: "#cbd5e1",
};
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "👏", "🔥"];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 32, status }: { src?: string | null; name: string; size?: number; status?: string }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: src ? "transparent" : "linear-gradient(135deg,#0c1a2e,#1e3a5f)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", border: "1.5px solid #e0f2fe",
      }}>
        {src
          ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#C9A55A" }}>{name.slice(0, 1).toUpperCase()}</span>
        }
      </div>
      {status && (
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28),
          borderRadius: "50%", background: STATUS_COLOR[status] ?? "#cbd5e1",
          border: "1.5px solid #fff",
        }} />
      )}
    </div>
  );
}

// ─── Icon button style ────────────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 6, border: "1px solid #e0f2fe",
  background: "#f8fafc", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};

// ─── Message bubble ───────────────────────────────────────────────────────────

function MsgBubble({ msg, isMe, showHeader, members, onDelete, canDelete }: {
  msg: Message; isMe: boolean; showHeader: boolean;
  members: Member[]; onDelete: (id: string) => void; canDelete: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [showReact, setShowReact] = useState(false);
  const member = members.find(m => m.id === msg.userId);
  const rcfg = ROLE_CFG[member?.role ?? "staff"] ?? ROLE_CFG.staff;
  const RIcon = rcfg.icon;
  const isDeleted = !!msg.deletedAt;

  const bubbleStyle = (own: boolean, deleted: boolean): React.CSSProperties => ({
    background: deleted ? "rgba(100,116,139,0.07)" : own ? "#0ea5e9" : "#f0f9ff",
    border: deleted ? "1px solid rgba(100,116,139,0.18)" : own ? "none" : "1px solid #e0f2fe",
    borderRadius: own ? "14px 14px 2px 14px" : "2px 14px 14px 14px",
    padding: deleted ? "6px 10px" : "9px 13px",
  });

  const textStyle = (own: boolean, deleted: boolean): React.CSSProperties => ({
    fontSize: 12, lineHeight: 1.5, wordBreak: "break-word",
    color: deleted ? "#94a3b8" : own ? "#fff" : "#0c1a2e",
    fontStyle: deleted ? "italic" : "normal",
  });

  const ActionBar = () => (
    <AnimatePresence>
      {hover && !isDeleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          style={{ display: "flex", alignItems: "center", gap: 3, alignSelf: "flex-end", marginBottom: 2 }}
        >
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowReact(v => !v)} style={iconBtn}>
              <Smile size={11} style={{ color: "#94a3b8" }} />
            </button>
            <AnimatePresence>
              {showReact && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    [isMe ? "right" : "left"]: 0,
                    bottom: "calc(100% + 4px)",
                    background: "#fff", border: "1px solid #e0f2fe",
                    borderRadius: 20, padding: "4px 8px",
                    display: "flex", gap: 2,
                    boxShadow: "0 4px 16px rgba(12,26,46,0.12)",
                    zIndex: 20, whiteSpace: "nowrap",
                  }}
                >
                  {QUICK_REACTIONS.map(e => (
                    <button key={e} onClick={() => setShowReact(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 3px", borderRadius: 6, lineHeight: 1 }}
                      onMouseEnter={el => (el.currentTarget.style.background = "#f0f9ff")}
                      onMouseLeave={el => (el.currentTarget.style.background = "none")}
                    >{e}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {canDelete && (
            <button
              onClick={() => { onDelete(msg.id); setHover(false); }}
              style={{ ...iconBtn, background: "#fff5f5", borderColor: "#fecaca" }}
            >
              <Trash2 size={10} style={{ color: "#ef4444" }} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isMe) return (
    <div
      style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 2, position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setShowReact(false); }}
    >
      <ActionBar />
      <div style={{ maxWidth: "72%" }}>
        {showHeader && <p style={{ fontSize: 8, color: "#94a3b8", textAlign: "right", marginBottom: 2 }}>{formatTime(msg.createdAt)}</p>}
        <div style={bubbleStyle(true, isDeleted)}>
          <p style={textStyle(true, isDeleted)}>{msg.content}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{ display: "flex", gap: 8, marginBottom: 2, alignItems: "flex-end", position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setShowReact(false); }}
    >
      {showHeader ? <Avatar src={member?.avatar} name={msg.userName} size={30} /> : <div style={{ width: 30, flexShrink: 0 }} />}
      <div style={{ maxWidth: "72%" }}>
        {showHeader && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#0c1a2e" }}>{msg.userName}</span>
            <RIcon size={8} style={{ color: rcfg.color }} />
            <span style={{ fontSize: 8, color: "#b0c4d8" }}>{formatTime(msg.createdAt)}</span>
          </div>
        )}
        <div style={bubbleStyle(false, isDeleted)}>
          <p style={textStyle(false, isDeleted)}>{msg.content}</p>
        </div>
      </div>
      <ActionBar />
    </div>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots({ name }: { name: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: "#94a3b8",
            animation: `typingBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 9, color: "#94a3b8" }}>{name} đang nhập...</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { currentUser } = useStore();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";

  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [newRoom, setNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [connected, setConnected] = useState(false);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [typingUsers] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const activeRoomRef = useRef<Room | null>(null);

  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  // Initial data
  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => setMembers(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/chat?rooms=1").then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setRooms(d);
        if (!activeRoomRef.current && d.length > 0) setActiveRoom(d[0]);
      }
    }).catch(() => {});
  }, []);

  // SSE per active room
  const connectSSE = useCallback((room: Room) => {
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
    setMessages([]);

    // Load history
    fetch(`/api/chat?roomId=${room.id}`)
      .then(r => r.json())
      .then(msgs => {
        if (Array.isArray(msgs)) {
          setMessages(msgs);
          setReadCounts(prev => ({ ...prev, [room.id]: room.messageCount ?? msgs.length }));
        }
      })
      .catch(() => {});

    // Stream new messages
    const since = encodeURIComponent(new Date(Date.now() - 3000).toISOString());
    const es = new EventSource(`/api/chat/stream?roomId=${room.id}&since=${since}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = e => {
      try {
        const payload = JSON.parse(e.data as string) as { type: string; data: Message[] | Room[] };
        if (payload.type === "messages") {
          const newMsgs = payload.data as Message[];
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id));
            const fresh = newMsgs.filter(m => !ids.has(m.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
        if (payload.type === "rooms") {
          setRooms(payload.data as Room[]);
        }
      } catch {/**/}
    };

    es.onerror = () => {
      setConnected(false);
      setTimeout(() => {
        if (activeRoomRef.current?.id === room.id) connectSSE(room);
      }, 3000);
    };
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    connectSSE(activeRoom);
    return () => { esRef.current?.close(); };
  }, [activeRoom?.id]);

  useEffect(() => () => { esRef.current?.close(); }, []);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Unread counts
  const unreadCounts: Record<string, number> = {};
  rooms.forEach(r => {
    if (r.id !== activeRoom?.id) {
      const read = readCounts[r.id] ?? 0;
      unreadCounts[r.id] = Math.max(0, (r.messageCount ?? 0) - read);
    }
  });

  const handleSend = async () => {
    if (!input.trim() || !activeRoom || !currentUser || sending) return;
    if (activeRoom.type === "announce" && !isAdmin) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    // Optimistic
    const optimistic: Message = {
      id: `opt_${Date.now()}`,
      roomId: activeRoom.id,
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: activeRoom.id, userId: currentUser.id, userName: currentUser.name, content }),
    }).catch(() => {});

    setSending(false);
    inputRef.current?.focus();
  };

  const handleDeleteMsg = async (msgId: string) => {
    if (!currentUser) return;
    setMessages(prev => prev.map(m => m.id === msgId
      ? { ...m, content: "[Tin nhắn đã bị xóa]", deletedAt: new Date().toISOString() }
      : m
    ));
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgId, userId: currentUser.id }),
    }).catch(() => {});
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !currentUser) return;
    await fetch("/api/chat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoomName.trim(), type: "channel", createdBy: currentUser.id }),
    });
    setNewRoomName(""); setNewRoom(false);
    const d = await fetch("/api/chat?rooms=1").then(r => r.json()).catch(() => []);
    if (Array.isArray(d)) setRooms(d);
  };

  const handleDeleteRoom = async (roomId: string) => {
    await fetch("/api/chat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    if (activeRoom?.id === roomId) setActiveRoom(rooms.find(r => r.id !== roomId) ?? null);
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const onlineMembers = members.filter(m => m.status === "online" || m.status === "busy");
  const isReadOnly = activeRoom?.type === "announce" && !isAdmin;

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      <div style={{
        display: "flex",
        height: "calc(100vh - 52px - 36px)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #bae6fd",
        background: "#fff",
        boxShadow: "0 2px 16px rgba(12,26,46,0.07)",
      }}>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div style={{
          width: sidebarOpen ? 220 : 0,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 0.18s cubic-bezier(0.4,0,0.2,1)",
          borderRight: "1px solid #e0f2fe",
          display: "flex",
          flexDirection: "column",
          background: "#f8fafc",
        }}>
          {/* Header */}
          <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 8.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>KÊNH CHAT</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Circle size={6} style={{ color: connected ? "#10b981" : "#f59e0b", fill: connected ? "#10b981" : "#f59e0b" }} />
              <span style={{ fontSize: 7.5, color: "#94a3b8" }}>{connected ? "live" : "kết nối..."}</span>
            </div>
          </div>

          {/* Rooms */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {rooms.map(room => {
              const isActive = activeRoom?.id === room.id;
              const Icon = room.type === "announce" ? Megaphone : Hash;
              const unread = unreadCounts[room.id] ?? 0;
              return (
                <div
                  key={room.id}
                  onClick={() => {
                    setActiveRoom(room);
                    setReadCounts(prev => ({ ...prev, [room.id]: room.messageCount ?? 0 }));
                  }}
                  style={{
                    padding: "7px 12px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    background: isActive ? "rgba(14,165,233,0.08)" : "transparent",
                    borderLeft: `2px solid ${isActive ? "#0ea5e9" : "transparent"}`,
                    transition: "all 0.1s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f0f9ff"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={11} style={{ color: isActive ? "#0ea5e9" : "#94a3b8", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 11,
                      color: isActive ? "#0c1a2e" : "#475569",
                      fontWeight: isActive || unread > 0 ? 700 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{room.name}</p>
                    {room.lastMessage && (
                      <p style={{ fontSize: 8, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                        {room.lastMessage.content.startsWith("[Tin nhắn") ? "Đã xóa" : room.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {unread > 0 && !isActive && (
                    <div style={{ minWidth: 16, height: 16, borderRadius: 8, background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                      <span style={{ fontSize: 7.5, fontWeight: 700, color: "#fff" }}>{unread > 99 ? "99+" : unread}</span>
                    </div>
                  )}
                  {isAdmin && room.id !== "room_general" && room.id !== "room_announce" && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                      style={{ ...iconBtn, width: 18, height: 18, opacity: 0, transition: "opacity 0.1s" }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "0"; }}
                    >
                      <X size={8} style={{ color: "#dc2626" }} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add room */}
            {isAdmin && (
              <div style={{ padding: "4px 12px" }}>
                {!newRoom ? (
                  <button
                    onClick={() => setNewRoom(true)}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 0", transition: "color 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#0ea5e9")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                  >
                    <Plus size={10} /> Thêm kênh
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      value={newRoomName} onChange={e => setNewRoomName(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === "Enter") handleCreateRoom(); if (e.key === "Escape") { setNewRoom(false); setNewRoomName(""); } }}
                      placeholder="Tên kênh..."
                      style={{ flex: 1, fontSize: 10, background: "#fff", border: "1px solid #bae6fd", borderRadius: 6, padding: "4px 8px", outline: "none", fontFamily: "inherit", color: "#0c1a2e" }}
                    />
                    <button onClick={handleCreateRoom} style={{ background: "#0ea5e9", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer" }}>
                      <Check size={9} style={{ color: "#fff" }} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Online members */}
          {onlineMembers.length > 0 && (
            <div style={{ borderTop: "1px solid #e0f2fe", padding: "6px 0" }}>
              <p style={{ fontSize: 7.5, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.15em", padding: "0 12px 4px" }}>
                ONLINE · {onlineMembers.length}
              </p>
              {onlineMembers.slice(0, 6).map(m => {
                const rcfg = ROLE_CFG[m.role] ?? ROLE_CFG.staff;
                const RIcon = rcfg.icon;
                return (
                  <div key={m.id} style={{ padding: "3px 12px", display: "flex", alignItems: "center", gap: 7 }}>
                    <Avatar src={m.avatar} name={m.name} size={20} status={m.status} />
                    <span style={{ fontSize: 9.5, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                    <RIcon size={8} style={{ color: rcfg.color, flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Chat main ────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Header */}
          <div style={{ height: 50, padding: "0 16px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <ChevronLeft size={13} style={{ color: "#64748b", transition: "transform 0.18s", transform: sidebarOpen ? "rotate(0deg)" : "rotate(180deg)" }} />
            </button>

            {activeRoom ? (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {activeRoom.type === "announce"
                      ? <Megaphone size={13} style={{ color: "#C9A55A" }} />
                      : <Hash size={13} style={{ color: "#0ea5e9" }} />}
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e" }}>{activeRoom.name}</p>
                    {activeRoom.type === "announce" && (
                      <span style={{ fontSize: 7.5, color: "#C9A55A", background: "rgba(201,165,90,0.1)", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>THÔNG BÁO</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Circle size={6} style={{ color: "#10b981", fill: "#10b981" }} />
                  <span style={{ fontSize: 8.5, color: "#64748b" }}>{onlineMembers.length} online</span>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Chọn kênh để bắt đầu</p>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column" }}>
            {messages.length === 0 && activeRoom && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0.5, marginTop: "auto", marginBottom: "auto" }}>
                <Hash size={28} style={{ color: "#bae6fd" }} strokeWidth={1} />
                <p style={{ fontSize: 12, color: "#94a3b8" }}>Chưa có tin nhắn trong #{activeRoom.name}</p>
                <p style={{ fontSize: 10, color: "#b0c4d8" }}>Hãy là người đầu tiên nhắn tin!</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showHeader = !prev
                || prev.userId !== msg.userId
                || (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) > 5 * 60000;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.14 }}
                  style={{ marginTop: showHeader && i > 0 ? 14 : 2 }}
                >
                  <MsgBubble
                    msg={msg}
                    isMe={msg.userId === currentUser?.id}
                    showHeader={showHeader}
                    members={members}
                    onDelete={handleDeleteMsg}
                    canDelete={msg.userId === currentUser?.id || isAdmin}
                  />
                </motion.div>
              );
            })}

            {typingUsers.length > 0 && <TypingDots name={typingUsers[0]} />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 16px 12px", borderTop: "1px solid #e0f2fe", flexShrink: 0 }}>
            {isReadOnly ? (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(201,165,90,0.06)", border: "1px solid rgba(201,165,90,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                <Megaphone size={12} style={{ color: "#C9A55A" }} />
                <span style={{ fontSize: 10, color: "#92712a" }}>Kênh thông báo — chỉ Admin/Quản Lý có thể đăng tin</span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <Avatar src={null} name={currentUser?.name ?? "?"} size={28} />
                  <div style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, padding: "8px 10px 8px 14px", display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={activeRoom ? `Nhắn vào #${activeRoom.name}...` : "Chọn kênh..."}
                      disabled={!activeRoom}
                      rows={1}
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0c1a2e", fontFamily: "inherit", resize: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }}
                      onInput={e => {
                        const t = e.currentTarget;
                        t.style.height = "auto";
                        t.style.height = Math.min(t.scrollHeight, 120) + "px";
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending || !activeRoom}
                      style={{
                        width: 32, height: 32, borderRadius: 10, border: "none", flexShrink: 0,
                        background: input.trim() && activeRoom ? "#0ea5e9" : "#e0f2fe",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: input.trim() && activeRoom ? "pointer" : "default",
                        transition: "background 0.12s",
                      }}
                    >
                      <Send size={13} style={{ color: input.trim() && activeRoom ? "#fff" : "#94a3b8" }} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 8, color: "#b0c4d8", marginTop: 4, paddingLeft: 36 }}>Enter để gửi · Shift+Enter xuống dòng</p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
