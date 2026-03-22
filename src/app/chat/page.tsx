"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Hash, Megaphone, Plus, X, Crown, UserCheck, User, Circle, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Room = { id: string; name: string; type: string; lastMessage: { content: string; userName: string; createdAt: string } | null };
type Message = { id: string; roomId: string; userId: string; userName: string; content: string; createdAt: string };
type Member = { id: string; name: string; avatar: string | null; status: string; role: string };

const ROLE_CFG: Record<string, { color: string; icon: typeof User }> = {
  admin:   { color: "#C9A55A", icon: Crown },
  manager: { color: "#0ea5e9", icon: UserCheck },
  staff:   { color: "#64748b", icon: User },
};

const STATUS_COLOR: Record<string, string> = {
  online: "#10b981", busy: "#f59e0b", away: "#94a3b8", offline: "#cbd5e1",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m}ph`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}g`;
  return `${Math.floor(h / 24)}ng`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 32, status }: { src?: string | null; name: string; size?: number; status?: string }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: src ? "transparent" : "linear-gradient(135deg,#0c1a2e,#1e3a5f)",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {src
          ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#C9A55A" }}>{name.slice(0,1).toUpperCase()}</span>
        }
      </div>
      {status && (
        <div style={{ position: "absolute", bottom: -1, right: -1, width: size * 0.3, height: size * 0.3, borderRadius: "50%", background: STATUS_COLOR[status] ?? "#cbd5e1", border: "1.5px solid #fff" }} />
      )}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MsgBubble({ msg, isMe, showAvatar, members }: { msg: Message; isMe: boolean; showAvatar: boolean; members: Member[] }) {
  const member = members.find(m => m.id === msg.userId);
  const rcfg = ROLE_CFG[member?.role ?? "staff"];
  const RIcon = rcfg?.icon ?? User;

  if (isMe) return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 2 }}>
      <div style={{ maxWidth: "70%" }}>
        {showAvatar && <p style={{ fontSize: 8, color: "#94a3b8", textAlign: "right", marginBottom: 2 }}>{formatTime(msg.createdAt)}</p>}
        <div style={{ background: "#0ea5e9", borderRadius: "12px 12px 2px 12px", padding: "8px 12px" }}>
          <p style={{ fontSize: 12, color: "#fff", lineHeight: 1.5, wordBreak: "break-word" }}>{msg.content}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 2, alignItems: "flex-end" }}>
      {showAvatar ? <Avatar src={member?.avatar} name={msg.userName} size={30} /> : <div style={{ width: 30, flexShrink: 0 }} />}
      <div style={{ maxWidth: "70%" }}>
        {showAvatar && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#0c1a2e" }}>{msg.userName}</span>
            <RIcon size={8} style={{ color: rcfg?.color }} />
            <span style={{ fontSize: 8, color: "#b0c4d8" }}>{formatTime(msg.createdAt)}</span>
          </div>
        )}
        <div style={{ background: "#f0f9ff", border: "1px solid #e0f2fe", borderRadius: "2px 12px 12px 12px", padding: "8px 12px" }}>
          <p style={{ fontSize: 12, color: "#0c1a2e", lineHeight: 1.5, wordBreak: "break-word" }}>{msg.content}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMsgId = useRef<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRooms = useCallback(async () => {
    const r = await fetch("/api/chat?rooms=1").then(res => res.json()).catch(() => []);
    setRooms(Array.isArray(r) ? r : []);
  }, []);

  const loadMessages = useCallback(async (roomId: string, append = false) => {
    const since = append && lastMsgId.current ? `&since=${encodeURIComponent(lastMsgId.current)}` : "";
    const msgs = await fetch(`/api/chat?roomId=${roomId}${since}`).then(r => r.json()).catch(() => []);
    if (!Array.isArray(msgs) || msgs.length === 0) return;
    if (append) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = msgs.filter((m: Message) => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        return [...prev, ...newMsgs];
      });
    } else {
      setMessages(msgs);
    }
    const last = msgs[msgs.length - 1];
    if (last) lastMsgId.current = last.createdAt;
  }, []);

  // Load team members
  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => setMembers(Array.isArray(data) ? data : [])).catch(() => {});
    loadRooms();
  }, [loadRooms]);

  // Switch room
  useEffect(() => {
    if (!activeRoom) return;
    lastMsgId.current = "";
    setMessages([]);
    loadMessages(activeRoom.id);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(activeRoom.id, true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeRoom, loadMessages]);

  // Auto-select first room
  useEffect(() => {
    if (rooms.length > 0 && !activeRoom) setActiveRoom(rooms[0]);
  }, [rooms, activeRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeRoom || !currentUser || sending) return;
    // Announce room: only admin/manager
    if (activeRoom.type === "announce" && !isAdmin) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    const optimisticMsg: Message = {
      id: `opt_${Date.now()}`, roomId: activeRoom.id,
      userId: currentUser.id, userName: currentUser.name,
      content, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: activeRoom.id, userId: currentUser.id, userName: currentUser.name, content }),
    });
    await loadMessages(activeRoom.id, true);
    await loadRooms();
    setSending(false);
    inputRef.current?.focus();
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !currentUser) return;
    await fetch("/api/chat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoomName.trim(), type: "channel", createdBy: currentUser.id }),
    });
    setNewRoomName(""); setNewRoom(false);
    await loadRooms();
  };

  const handleDeleteRoom = async (roomId: string) => {
    await fetch("/api/chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) });
    if (activeRoom?.id === roomId) setActiveRoom(null);
    await loadRooms();
  };

  const canType = activeRoom && (activeRoom.type !== "announce" || isAdmin);
  const isReadOnly = activeRoom?.type === "announce" && !isAdmin;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px - 56px)", borderRadius: 16, overflow: "hidden", border: "1px solid #bae6fd", background: "#fff" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 240 : 0, flexShrink: 0, overflow: "hidden",
        transition: "width 0.2s", borderRight: "1px solid #e0f2fe",
        display: "flex", flexDirection: "column", background: "#f8fafc",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #e0f2fe" }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>KÊNH NHÓM</p>
        </div>

        {/* Room list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {rooms.map(room => {
            const isActive = activeRoom?.id === room.id;
            const Icon = room.type === "announce" ? Megaphone : Hash;
            return (
              <div key={room.id}
                onClick={() => setActiveRoom(room)}
                style={{
                  padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  background: isActive ? "rgba(14,165,233,0.08)" : "transparent",
                  borderLeft: `2px solid ${isActive ? "#0ea5e9" : "transparent"}`,
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f0f9ff"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={12} style={{ color: isActive ? "#0ea5e9" : "#94a3b8", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: isActive ? "#0c1a2e" : "#475569", fontWeight: isActive ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</p>
                  {room.lastMessage && (
                    <p style={{ fontSize: 8, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                      {room.lastMessage.userName}: {room.lastMessage.content}
                    </p>
                  )}
                </div>
                {isAdmin && room.id !== "room_general" && room.id !== "room_announce" && (
                  <button onClick={e => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "none", padding: 2 }}
                    onMouseEnter={e => (e.currentTarget.style.display = "flex")}
                  >
                    <Trash2 size={9} style={{ color: "#dc2626" }} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add room */}
          {isAdmin && (
            <div style={{ padding: "6px 14px" }}>
              {!newRoom ? (
                <button onClick={() => setNewRoom(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                  <Plus size={11} /> Thêm kênh
                </button>
              ) : (
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleCreateRoom(); if (e.key === "Escape") { setNewRoom(false); setNewRoomName(""); } }}
                    autoFocus placeholder="Tên kênh..."
                    style={{ flex: 1, fontSize: 10, background: "#fff", border: "1px solid #bae6fd", borderRadius: 6, padding: "4px 8px", outline: "none", fontFamily: "inherit", color: "#0c1a2e" }} />
                  <button onClick={handleCreateRoom} style={{ background: "#0ea5e9", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer" }}>
                    <Check size={9} style={{ color: "#fff" }} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Online members */}
        <div style={{ borderTop: "1px solid #e0f2fe", padding: "8px 0" }}>
          <p style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.15em", padding: "0 14px 6px" }}>THÀNH VIÊN</p>
          {members.filter(m => m.status === "online" || m.status === "busy").map(m => {
            const rcfg = ROLE_CFG[m.role] ?? ROLE_CFG.staff;
            const RIcon = rcfg.icon;
            return (
              <div key={m.id} style={{ padding: "4px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar src={m.avatar} name={m.name} size={22} status={m.status} />
                <span style={{ fontSize: 10, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                <RIcon size={9} style={{ color: rcfg.color, flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Chat header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", gap: 10, background: "#fff" }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Hash size={12} style={{ color: "#64748b" }} />
          </button>
          {activeRoom && (
            <>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {activeRoom.type === "announce"
                    ? <Megaphone size={13} style={{ color: "#C9A55A" }} />
                    : <Hash size={13} style={{ color: "#0ea5e9" }} />}
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e" }}>{activeRoom.name}</p>
                </div>
                {activeRoom.type === "announce" && (
                  <p style={{ fontSize: 8, color: "#94a3b8" }}>Chỉ Admin/Quản Lý có thể đăng</p>
                )}
              </div>
              {/* Online count */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                <Circle size={7} style={{ color: "#10b981", fill: "#10b981" }} />
                <span style={{ fontSize: 9, color: "#64748b" }}>{members.filter(m => m.status === "online").length} online</span>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {!activeRoom && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Chọn kênh để bắt đầu</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.userId === currentUser?.id;
            const prevMsg = messages[i - 1];
            const showAvatar = !prevMsg || prevMsg.userId !== msg.userId ||
              (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 5 * 60000;
            return (
              <div key={msg.id} style={{ marginTop: showAvatar && i > 0 ? 12 : 0 }}>
                <MsgBubble msg={msg} isMe={isMe} showAvatar={showAvatar} members={members} />
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #e0f2fe", background: "#fff" }}>
          {isReadOnly ? (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(201,165,90,0.06)", border: "1px solid rgba(201,165,90,0.25)", fontSize: 10, color: "#92712a", display: "flex", alignItems: "center", gap: 8 }}>
              <Megaphone size={12} style={{ color: "#C9A55A" }} />
              Kênh thông báo — chỉ Admin/Quản Lý có thể đăng tin
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <Avatar src={null} name={currentUser?.name ?? "?"} size={28} />
              <div style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "flex-end", gap: 8 }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Nhắn tin vào #${activeRoom?.name ?? "..."} (Enter để gửi)`}
                  rows={1}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontSize: 12, color: "#0c1a2e", fontFamily: "inherit", resize: "none",
                    maxHeight: 100, overflowY: "auto", lineHeight: 1.5,
                  }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 100) + "px";
                  }}
                />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: "none", flexShrink: 0,
                    background: input.trim() ? "#0ea5e9" : "#e0f2fe",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: input.trim() ? "pointer" : "default", transition: "background 0.15s",
                  }}>
                  <Send size={13} style={{ color: input.trim() ? "#fff" : "#94a3b8" }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Missing import fix
function Check({ size, style }: { size: number; style?: React.CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="20 6 9 17 4 12" /></svg>;
}
