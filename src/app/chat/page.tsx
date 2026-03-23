"use client";

import {
  useState, useEffect, useRef, useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Hash, Megaphone, Plus, Trash2,
  Crown, UserCheck, User, Circle, X, Check,
  Smile, ChevronLeft, Paperclip, Image as ImageIcon,
  File as FileIcon, Download, Reply, Pencil, Settings2,
} from "lucide-react";
import { useStore } from "@/store/useStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Room = {
  id: string; name: string; type: string;
  icon?: string | null; color?: string | null;
  lastMessage: { content: string; userName: string; createdAt: string; mediaType?: string } | null;
  messageCount: number;
};
type Message = {
  id: string; roomId: string; userId: string;
  userName: string; content: string; createdAt: string;
  deletedAt?: string | null;
  editedAt?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;  // "image" | "file"
  replyToId?: string | null;
  reactions?: string | null;  // JSON: { emoji: userId[] }
};
type Member = {
  id: string; name: string; avatar: string | null;
  status: string; role: string;
};

const ROLE_CFG: Record<string, { color: string; icon: typeof User }> = {
  admin:   { color: "#C9A55A", icon: Crown },
  manager: { color: "#0ea5e9", icon: UserCheck },
  staff:   { color: "#64748b", icon: User },
};
const STATUS_COLOR: Record<string, string> = {
  online: "#10b981", busy: "#f59e0b", away: "#94a3b8", offline: "#cbd5e1",
};
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "👏", "🔥", "😢", "🎉"];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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

const iconBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 7, border: "1px solid #e0f2fe",
  background: "#f8fafc", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};

// ─── Media Bubble ─────────────────────────────────────────────────────────────

function MediaContent({ msg, isMe }: { msg: Message; isMe: boolean }) {
  if (!msg.mediaUrl) return null;

  if (msg.mediaType === "image") {
    return (
      <div style={{ marginTop: msg.content ? 6 : 0 }}>
        <img
          src={msg.mediaUrl}
          alt="media"
          style={{
            maxWidth: "100%", maxHeight: 240, borderRadius: 10, display: "block",
            border: isMe ? "none" : "1px solid #e0f2fe",
          }}
        />
      </div>
    );
  }

  // File
  const filename = msg.mediaUrl.split("/").pop() ?? "file";
  return (
    <a
      href={msg.mediaUrl}
      download
      style={{
        marginTop: msg.content ? 6 : 0,
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px", borderRadius: 10,
        background: isMe ? "rgba(255,255,255,0.15)" : "#e0f2fe",
        border: isMe ? "none" : "1px solid #bae6fd",
        textDecoration: "none", cursor: "pointer",
      }}
    >
      <FileIcon size={14} style={{ color: isMe ? "#fff" : "#0ea5e9", flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: isMe ? "#fff" : "#0c1a2e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {filename.replace(/^chat_\d+_[a-z0-9]+/, "").replace(/^_/, "") || filename}
      </span>
      <Download size={11} style={{ color: isMe ? "rgba(255,255,255,0.7)" : "#64748b", flexShrink: 0 }} />
    </a>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MsgBubble({ msg, isMe, showHeader, members, onDelete, onReply, onReact, onEdit, canDelete, replyTo, roomColor }: {
  msg: Message; isMe: boolean; showHeader: boolean;
  members: Member[]; canDelete: boolean;
  replyTo?: Message | null;
  roomColor?: string | null;
  onDelete: (id: string) => void;
  onReply: (msg: Message) => void;
  onReact: (msgId: string, emoji: string) => void;
  onEdit: (msg: Message) => void;
}) {
  const [hover, setHover] = useState(false);
  const [showReact, setShowReact] = useState(false);
  const member = members.find(m => m.id === msg.userId);
  const rcfg = ROLE_CFG[member?.role ?? "staff"] ?? ROLE_CFG.staff;
  const RIcon = rcfg.icon;
  const isDeleted = !!msg.deletedAt;

  let reactions: Record<string, string[]> = {};
  try { if (msg.reactions) reactions = JSON.parse(msg.reactions); } catch { /* */ }

  const senderRole = members.find(m => m.id === msg.userId)?.role ?? "staff";
  const isAdminSender = senderRole === "admin" || senderRole === "manager";

  const bubbleStyle = (own: boolean, deleted: boolean): React.CSSProperties => ({
    background: deleted
      ? "rgba(100,116,139,0.07)"
      : own
        ? (roomColor && isAdminSender ? roomColor : "#0ea5e9")
        : "#f0f9ff",
    border: deleted ? "1px solid rgba(100,116,139,0.18)" : own ? "none" : "1px solid #e0f2fe",
    borderRadius: own ? "14px 14px 2px 14px" : "2px 14px 14px 14px",
    padding: "9px 13px",
  });

  const textStyle = (own: boolean, deleted: boolean): React.CSSProperties => ({
    fontSize: 12, lineHeight: 1.5, wordBreak: "break-word",
    color: deleted ? "#94a3b8" : own ? "#fff" : "#0c1a2e",
    fontStyle: deleted ? "italic" : "normal",
  });

  const hasReactions = Object.keys(reactions).length > 0;

  const ActionBar = () => (
    <AnimatePresence>
      {hover && !isDeleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
          style={{ display: "flex", alignItems: "center", gap: 3, alignSelf: "flex-end", marginBottom: 2 }}
        >
          {/* Reply */}
          <button onClick={() => onReply(msg)} style={iconBtn} title="Trả lời">
            <Reply size={10} style={{ color: "#64748b" }} />
          </button>

          {/* React */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowReact(v => !v)} style={iconBtn}>
              <Smile size={10} style={{ color: "#94a3b8" }} />
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
                    borderRadius: 20, padding: "5px 8px",
                    display: "flex", flexWrap: "wrap", gap: 2, maxWidth: 200,
                    boxShadow: "0 4px 16px rgba(12,26,46,0.12)", zIndex: 20,
                  }}
                >
                  {QUICK_REACTIONS.map(e => (
                    <button key={e} onClick={() => { onReact(msg.id, e); setShowReact(false); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 3px", borderRadius: 6, lineHeight: 1 }}
                    >{e}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Edit (own message or admin, not deleted) */}
          {canDelete && (
            <button onClick={() => { onEdit(msg); setHover(false); }}
              style={{ ...iconBtn }}>
              <Pencil size={10} style={{ color: "#64748b" }} />
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button onClick={() => { onDelete(msg.id); setHover(false); }}
              style={{ ...iconBtn, background: "#fff5f5", borderColor: "#fecaca" }}>
              <Trash2 size={10} style={{ color: "#ef4444" }} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const ReplyPreview = () => replyTo && !isDeleted ? (
    <div style={{
      borderLeft: `2px solid ${isMe ? "rgba(255,255,255,0.5)" : "#0ea5e9"}`,
      paddingLeft: 8, marginBottom: 6,
      opacity: 0.75,
    }}>
      <p style={{ fontSize: 9, fontWeight: 600, color: isMe ? "rgba(255,255,255,0.8)" : "#0ea5e9" }}>{replyTo.userName}</p>
      <p style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.7)" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
        {replyTo.mediaType === "image" ? "📷 Ảnh" : replyTo.mediaType === "file" ? "📎 File" : replyTo.content}
      </p>
    </div>
  ) : null;

  const ReactionBar = () => hasReactions ? (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
      {Object.entries(reactions).map(([emoji, users]) =>
        users.length > 0 && (
          <button key={emoji} onClick={() => onReact(msg.id, emoji)}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: "#f0f9ff", border: "1px solid #e0f2fe",
              borderRadius: 12, padding: "1px 6px",
              cursor: "pointer", fontSize: 11, lineHeight: 1.4,
            }}>
            {emoji} <span style={{ fontSize: 9, color: "#64748b" }}>{users.length}</span>
          </button>
        )
      )}
    </div>
  ) : null;

  if (isMe) return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 2 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowReact(false); }}>
      <ActionBar />
      <div style={{ maxWidth: "74%" }}>
        {showHeader && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 8, color: "#b0c4d8" }}>{formatTime(msg.createdAt)}</span>
            {msg.editedAt && <span style={{ fontSize: 7.5, color: "#94a3b8", fontStyle: "italic" }}>đã chỉnh sửa</span>}
          </div>
        )}
        <div style={bubbleStyle(true, isDeleted)}>
          <ReplyPreview />
          {msg.content && <p style={textStyle(true, isDeleted)}>{msg.content}</p>}
          <MediaContent msg={msg} isMe />
        </div>
        <ReactionBar />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 2, alignItems: "flex-start" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowReact(false); }}>
      {showHeader
        ? <Avatar src={member?.avatar} name={msg.userName} size={30} />
        : <div style={{ width: 30, flexShrink: 0 }} />
      }
      <div style={{ maxWidth: "74%" }}>
        {showHeader && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#0c1a2e" }}>{msg.userName}</span>
            <RIcon size={8} style={{ color: rcfg.color }} />
            <span style={{ fontSize: 8, color: "#b0c4d8" }}>{formatTime(msg.createdAt)}</span>
            {msg.editedAt && <span style={{ fontSize: 7.5, color: "#94a3b8", fontStyle: "italic" }}>đã chỉnh sửa</span>}
          </div>
        )}
        <div style={bubbleStyle(false, isDeleted)}>
          <ReplyPreview />
          {msg.content && <p style={textStyle(false, isDeleted)}>{msg.content}</p>}
          <MediaContent msg={msg} isMe={false} />
        </div>
        <ReactionBar />
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

// ─── Upload preview ───────────────────────────────────────────────────────────

function UploadPreview({ file, onCancel }: { file: File; onCancel: () => void }) {
  const isImage = file.type.startsWith("image/");
  const url = isImage ? URL.createObjectURL(file) : null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 10px", borderRadius: 10,
      background: "#f0f9ff", border: "1px solid #bae6fd",
      marginBottom: 6,
    }}>
      {url
        ? <img src={url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
        : <FileIcon size={18} style={{ color: "#0ea5e9", flexShrink: 0 }} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, color: "#0c1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
        <p style={{ fontSize: 8.5, color: "#94a3b8" }}>{fmtSize(file.size)}</p>
      </div>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer" }}>
        <X size={13} style={{ color: "#94a3b8" }} />
      </button>
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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [roomSettingsIcon, setRoomSettingsIcon] = useState("");
  const [roomSettingsColor, setRoomSettingsColor] = useState("");
  const [roomSettingsName, setRoomSettingsName] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    setReplyTo(null);

    fetch(`/api/chat?roomId=${room.id}`)
      .then(r => r.json())
      .then(msgs => {
        if (Array.isArray(msgs)) {
          setMessages(msgs);
          setReadCounts(prev => ({ ...prev, [room.id]: room.messageCount ?? msgs.length }));
        }
      }).catch(() => {});

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
        if (payload.type === "rooms") setRooms(payload.data as Room[]);
      } catch {/**/}
    };
    es.onerror = () => {
      setConnected(false);
      setTimeout(() => { if (activeRoomRef.current?.id === room.id) connectSSE(room); }, 3000);
    };
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    connectSSE(activeRoom);
    return () => { esRef.current?.close(); };
  }, [activeRoom?.id]);

  useEffect(() => () => { esRef.current?.close(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const unreadCounts: Record<string, number> = {};
  rooms.forEach(r => {
    if (r.id !== activeRoom?.id) {
      const read = readCounts[r.id] ?? 0;
      unreadCounts[r.id] = Math.max(0, (r.messageCount ?? 0) - read);
    }
  });

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || !activeRoom || !currentUser || sending) return;
    if (activeRoom.type === "announce" && !isAdmin) return;
    setSending(true);

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Upload file first if present
    if (pendingFile) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", pendingFile);
      try {
        const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json() as { url: string; mediaType: string };
          mediaUrl = data.url;
          mediaType = data.mediaType;
        }
      } catch { /* upload failed, send text only */ }
      setUploading(false);
      setPendingFile(null);
    }

    const content = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const optId = `opt_${Date.now()}`;
    const optimistic: Message = {
      id: optId,
      roomId: activeRoom.id,
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      createdAt: new Date().toISOString(),
      mediaUrl, mediaType,
      replyToId: replyTo?.id ?? null,
    };
    setMessages(prev => [...prev, optimistic]);
    setReplyTo(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoom.id,
          userId: currentUser.id,
          userName: currentUser.name,
          content,
          mediaUrl, mediaType,
          replyToId: replyTo?.id ?? null,
        }),
      });
      if (res.ok) {
        const { id: realId, createdAt } = await res.json() as { id: string; createdAt: string };
        // Replace optimistic message with real ID so SSE dedup works correctly
        setMessages(prev => prev.map(m =>
          m.id === optId ? { ...m, id: realId, createdAt } : m
        ));
      }
    } catch { /* keep optimistic */ }

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

  const handleReact = async (msgId: string, emoji: string) => {
    if (!currentUser) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      let r: Record<string, string[]> = {};
      try { if (m.reactions) r = JSON.parse(m.reactions); } catch { /* */ }
      const users = r[emoji] ?? [];
      const myIdx = users.indexOf(currentUser.id);
      if (myIdx >= 0) users.splice(myIdx, 1); else users.push(currentUser.id);
      r[emoji] = users;
      return { ...m, reactions: JSON.stringify(r) };
    }));
    const updated = messages.find(m => m.id === msgId);
    let r: Record<string, string[]> = {};
    try { if (updated?.reactions) r = JSON.parse(updated.reactions); } catch { /* */ }
    const users = r[emoji] ?? [];
    const myIdx = users.indexOf(currentUser.id);
    if (myIdx >= 0) users.splice(myIdx, 1); else users.push(currentUser.id);
    r[emoji] = users;
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgId, userId: currentUser.id, action: "react", reactions: r }),
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

  const handleEditMsg = async (msg: Message) => {
    setEditingMsg(msg);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMsg || !currentUser || !editContent.trim()) return;
    const trimmed = editContent.trim();
    setMessages(prev => prev.map(m =>
      m.id === editingMsg.id ? { ...m, content: trimmed, editedAt: new Date().toISOString() } : m
    ));
    setEditingMsg(null);
    setEditContent("");
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgId: editingMsg.id, userId: currentUser.id, action: "edit", content: trimmed }),
    }).catch(() => {});
  };

  const handleOpenRoomSettings = () => {
    if (!activeRoom) return;
    setRoomSettingsName(activeRoom.name);
    setRoomSettingsIcon(activeRoom.icon ?? "");
    setRoomSettingsColor(activeRoom.color ?? "");
    setRoomSettingsOpen(true);
  };

  const handleSaveRoomSettings = async () => {
    if (!activeRoom || !currentUser) return;
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: activeRoom.id,
        userId: currentUser.id,
        action: "updateRoom",
        name: roomSettingsName.trim() || activeRoom.name,
        icon: roomSettingsIcon,
        color: roomSettingsColor,
      }),
    }).catch(() => {});
    setActiveRoom(prev => prev ? {
      ...prev,
      name: roomSettingsName.trim() || prev.name,
      icon: roomSettingsIcon,
      color: roomSettingsColor,
    } : null);
    setRooms(prev => prev.map(r => r.id === activeRoom.id ? {
      ...r,
      name: roomSettingsName.trim() || r.name,
      icon: roomSettingsIcon,
      color: roomSettingsColor,
    } : r));
    setRoomSettingsOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  const onlineMembers = members.filter(m => m.status === "online" || m.status === "busy");
  const isReadOnly = activeRoom?.type === "announce" && !isAdmin;
  const msgMap = new Map(messages.map(m => [m.id, m]));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%" }}>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" style={{ display: "none" }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={handleFileSelect}
      />

      <div style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        height: "100%",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #bae6fd",
        background: "#fff",
        boxShadow: "0 2px 16px rgba(12,26,46,0.07)",
      }}>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              style={{
                flexShrink: 0, overflow: "hidden",
                borderRight: "1px solid #e0f2fe",
                display: "flex", flexDirection: "column",
                background: "#f8fafc",
              }}
            >
              {/* Sidebar header */}
              <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 8.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em", whiteSpace: "nowrap" }}>KÊNH CHAT</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Circle size={6} style={{ color: connected ? "#10b981" : "#f59e0b", fill: connected ? "#10b981" : "#f59e0b" }} />
                  <span style={{ fontSize: 7.5, color: "#94a3b8", whiteSpace: "nowrap" }}>{connected ? "live" : "..."}</span>
                </div>
              </div>

              {/* Rooms list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
                {rooms.map(room => {
                  const isActive = activeRoom?.id === room.id;
                  const Icon = room.type === "announce" ? Megaphone : Hash;
                  const unread = unreadCounts[room.id] ?? 0;
                  const lastContent = room.lastMessage?.mediaType === "image" ? "📷 Ảnh"
                    : room.lastMessage?.mediaType === "file" ? "📎 File"
                    : (room.lastMessage?.content ?? "");
                  return (
                    <div key={room.id}
                      onClick={() => {
                        setActiveRoom(room);
                        setReadCounts(prev => ({ ...prev, [room.id]: room.messageCount ?? 0 }));
                      }}
                      style={{
                        padding: "7px 12px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 7,
                        background: isActive ? "rgba(14,165,233,0.08)" : "transparent",
                        borderLeft: `2px solid ${isActive ? "#0ea5e9" : "transparent"}`,
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f0f9ff"; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <Icon size={11} style={{ color: isActive ? "#0ea5e9" : "#94a3b8", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: isActive ? "#0c1a2e" : "#475569", fontWeight: isActive || unread > 0 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {room.name}
                        </p>
                        {lastContent && (
                          <p style={{ fontSize: 8, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                            {lastContent.startsWith("[Tin nhắn") ? "Đã xóa" : lastContent}
                          </p>
                        )}
                      </div>
                      {unread > 0 && !isActive && (
                        <div style={{ minWidth: 16, height: 16, borderRadius: 8, background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                          <span style={{ fontSize: 7.5, fontWeight: 700, color: "#fff" }}>{unread > 99 ? "99+" : unread}</span>
                        </div>
                      )}
                      {isAdmin && room.id !== "room_general" && room.id !== "room_announce" && (
                        <button onClick={e => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                          style={{ ...iconBtn, width: 18, height: 18, opacity: 0, transition: "opacity 0.1s" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                        >
                          <X size={8} style={{ color: "#dc2626" }} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {isAdmin && (
                  <div style={{ padding: "4px 12px" }}>
                    {!newRoom ? (
                      <button onClick={() => setNewRoom(true)}
                        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#0ea5e9")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                      >
                        <Plus size={10} /> Thêm kênh
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} autoFocus
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
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.15em", padding: "0 12px 4px" }}>ONLINE · {onlineMembers.length}</p>
                  {onlineMembers.slice(0, 5).map(m => (
                    <div key={m.id} style={{ padding: "3px 12px", display: "flex", alignItems: "center", gap: 7 }}>
                      <Avatar src={m.avatar} name={m.name} size={20} status={m.status} />
                      <span style={{ fontSize: 9.5, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat main ────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Header */}
          <div style={{ height: 50, padding: "0 16px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ChevronLeft size={13} style={{ color: "#64748b", transition: "transform 0.18s", transform: sidebarOpen ? "rotate(0deg)" : "rotate(180deg)" }} />
            </button>

            {activeRoom ? (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {activeRoom.type === "announce"
                      ? <Megaphone size={13} style={{ color: "#C9A55A" }} />
                      : <Hash size={13} style={{ color: "#0ea5e9" }} />}
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeRoom.name}</p>
                    {activeRoom.type === "announce" && (
                      <span style={{ fontSize: 7.5, color: "#C9A55A", background: "rgba(201,165,90,0.1)", padding: "1px 7px", borderRadius: 10, fontWeight: 700, whiteSpace: "nowrap" }}>THÔNG BÁO</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <Circle size={6} style={{ color: "#10b981", fill: "#10b981" }} />
                  <span style={{ fontSize: 8.5, color: "#64748b", whiteSpace: "nowrap" }}>{onlineMembers.length} online</span>
                  {isAdmin && (
                    <button onClick={handleOpenRoomSettings}
                      style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e0f2fe", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      title="Cài đặt kênh"
                    >
                      <Settings2 size={11} style={{ color: "#64748b" }} />
                    </button>
                  )}
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
                  style={{ marginTop: showHeader && i > 0 ? 14 : 3 }}
                >
                  <MsgBubble
                    msg={msg}
                    isMe={msg.userId === currentUser?.id}
                    showHeader={showHeader}
                    members={members}
                    onDelete={handleDeleteMsg}
                    onReply={setReplyTo}
                    onReact={handleReact}
                    onEdit={handleEditMsg}
                    canDelete={msg.userId === currentUser?.id || isAdmin}
                    replyTo={msg.replyToId ? (msgMap.get(msg.replyToId) ?? null) : null}
                    roomColor={activeRoom?.color}
                  />
                </motion.div>
              );
            })}

            {typingUsers.length > 0 && <TypingDots name={typingUsers[0]} />}
            <div ref={bottomRef} />
          </div>

          {/* Edit message bar */}
          {editingMsg && (
            <div style={{ padding: "8px 16px", borderTop: "1px solid #e0f2fe", background: "rgba(14,165,233,0.04)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Pencil size={10} style={{ color: "#0ea5e9" }} />
                <span style={{ fontSize: 9, color: "#0ea5e9", fontWeight: 600 }}>Chỉnh sửa tin nhắn</span>
                <button onClick={() => { setEditingMsg(null); setEditContent(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}>
                  <X size={11} style={{ color: "#94a3b8" }} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <textarea
                  autoFocus
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                    if (e.key === "Escape") { setEditingMsg(null); setEditContent(""); }
                  }}
                  rows={1}
                  style={{
                    flex: 1, fontSize: 12, color: "#0c1a2e", fontFamily: "inherit",
                    background: "#fff", border: "1px solid #bae6fd", borderRadius: 10,
                    padding: "8px 12px", outline: "none", resize: "none", lineHeight: 1.5,
                    maxHeight: 100, overflowY: "auto",
                  }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 100) + "px";
                  }}
                />
                <button onClick={handleSaveEdit}
                  style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Check size={13} style={{ color: "#fff" }} />
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div style={{ padding: "8px 16px 12px", borderTop: editingMsg ? "none" : "1px solid #e0f2fe", flexShrink: 0 }}>
            {isReadOnly ? (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(201,165,90,0.06)", border: "1px solid rgba(201,165,90,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                <Megaphone size={12} style={{ color: "#C9A55A" }} />
                <span style={{ fontSize: 10, color: "#92712a" }}>Kênh thông báo — chỉ Admin/Quản Lý có thể đăng tin</span>
              </div>
            ) : (
              <>
                {/* Reply preview */}
                {replyTo && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 10px", borderRadius: 8, marginBottom: 6,
                    background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)",
                  }}>
                    <Reply size={10} style={{ color: "#0ea5e9", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#0ea5e9" }}>{replyTo.userName}</span>
                      <p style={{ fontSize: 9.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {replyTo.mediaType === "image" ? "📷 Ảnh" : replyTo.mediaType === "file" ? "📎 File" : replyTo.content}
                      </p>
                    </div>
                    <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                      <X size={11} style={{ color: "#94a3b8" }} />
                    </button>
                  </div>
                )}

                {/* File preview */}
                {pendingFile && <UploadPreview file={pendingFile} onCancel={() => setPendingFile(null)} />}

                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <Avatar src={null} name={currentUser?.name ?? "?"} size={28} />
                  <div style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, padding: "8px 10px 8px 12px", display: "flex", alignItems: "flex-end", gap: 6 }}>
                    {/* Attach file button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!activeRoom}
                      title="Đính kèm file/ảnh"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", flexShrink: 0 }}
                    >
                      <Paperclip size={14} style={{ color: "#94a3b8" }} />
                    </button>

                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={activeRoom ? `Nhắn vào #${activeRoom.name}... (Enter gửi, Shift+Enter xuống dòng)` : "Chọn kênh..."}
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
                      disabled={(!input.trim() && !pendingFile) || sending || uploading || !activeRoom}
                      style={{
                        width: 32, height: 32, borderRadius: 10, border: "none", flexShrink: 0,
                        background: (input.trim() || pendingFile) && activeRoom ? "#0ea5e9" : "#e0f2fe",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: (input.trim() || pendingFile) && activeRoom ? "pointer" : "default",
                        transition: "background 0.12s",
                      }}
                    >
                      {uploading
                        ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
                        : <Send size={13} style={{ color: (input.trim() || pendingFile) && activeRoom ? "#fff" : "#94a3b8" }} />
                      }
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Room settings modal */}
      <AnimatePresence>
        {roomSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(12,26,46,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
            }}
            onClick={() => setRoomSettingsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#fff", borderRadius: 16, padding: "24px 24px 20px",
                width: 340, boxShadow: "0 8px 40px rgba(12,26,46,0.18)",
                border: "1px solid #e0f2fe",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0c1a2e" }}>Cài đặt kênh</p>
                <button onClick={() => setRoomSettingsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={14} style={{ color: "#94a3b8" }} />
                </button>
              </div>

              {/* Name */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", marginBottom: 6 }}>TÊN KÊNH</p>
                <input
                  value={roomSettingsName}
                  onChange={e => setRoomSettingsName(e.target.value)}
                  placeholder="Tên kênh..."
                  style={{ width: "100%", fontSize: 12, color: "#0c1a2e", fontFamily: "inherit", background: "#f8fafc", border: "1px solid #e0f2fe", borderRadius: 8, padding: "8px 12px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Icon */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", marginBottom: 6 }}>ICON (emoji)</p>
                <input
                  value={roomSettingsIcon}
                  onChange={e => setRoomSettingsIcon(e.target.value)}
                  placeholder="Nhập emoji, ví dụ: 💬 🔔 📢"
                  maxLength={4}
                  style={{ width: "100%", fontSize: 18, fontFamily: "inherit", background: "#f8fafc", border: "1px solid #e0f2fe", borderRadius: 8, padding: "8px 12px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Color */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", marginBottom: 8 }}>MÀU NỀN (tin nhắn admin)</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {["", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#0c1a2e"].map(c => (
                    <button key={c || "none"} onClick={() => setRoomSettingsColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: "50%", border: roomSettingsColor === c ? "2.5px solid #0c1a2e" : "1.5px solid #e0f2fe",
                        background: c || "#f1f5f9", cursor: "pointer", flexShrink: 0,
                      }}
                      title={c || "Mặc định"}
                    />
                  ))}
                </div>
                {roomSettingsColor && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: roomSettingsColor, border: "1px solid #e0f2fe" }} />
                    <span style={{ fontSize: 10, color: "#64748b" }}>{roomSettingsColor}</span>
                    <button onClick={() => setRoomSettingsColor("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: "#94a3b8" }}>Xóa</button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setRoomSettingsOpen(false)}
                  style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid #e0f2fe", background: "#f8fafc", fontSize: 11, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}>
                  Hủy
                </button>
                <button onClick={handleSaveRoomSettings}
                  style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#0ea5e9", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                  Lưu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
