"use client";

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Hash, Megaphone, Plus, Trash2,
  Crown, UserCheck, User, Circle, X, Check,
  Smile, ChevronLeft, Paperclip,
  File as FileIcon, Download, Reply, Pencil, Info,
  Pin, Search, Image as ImageIcon, Users,
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
  mediaType?: string | null;
  replyToId?: string | null;
  reactions?: string | null;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
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

function formatDateSep(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Hôm nay";
  if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function highlightText(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(201,165,90,0.35)", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
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
        <img src={msg.mediaUrl} alt="media"
          style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 10, display: "block", border: isMe ? "none" : "1px solid #e0f2fe" }}
        />
      </div>
    );
  }
  const filename = msg.mediaUrl.split("/").pop() ?? "file";
  return (
    <a href={msg.mediaUrl} download
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

function MsgBubble({ msg, isMe, showHeader, members, onDelete, onReply, onReact, onEdit, onPin, canDelete, replyTo, roomColor, searchQuery, isPinned }: {
  msg: Message; isMe: boolean; showHeader: boolean;
  members: Member[]; canDelete: boolean; isPinned?: boolean;
  replyTo?: Message | null; roomColor?: string | null; searchQuery?: string;
  isAdmin?: boolean;
  onDelete: (id: string) => void;
  onReply: (msg: Message) => void;
  onReact: (msgId: string, emoji: string) => void;
  onEdit: (msg: Message) => void;
  onPin: (msg: Message) => void;
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

  const hasReactions = Object.keys(reactions).some(k => reactions[k].length > 0);

  const ActionBar = () => (
    <AnimatePresence>
      {hover && !isDeleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
          style={{ display: "flex", alignItems: "center", gap: 3, alignSelf: "flex-end", marginBottom: 2 }}
        >
          <button onClick={() => onReply(msg)} style={iconBtn} title="Trả lời"><Reply size={10} style={{ color: "#64748b" }} /></button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowReact(v => !v)} style={iconBtn}><Smile size={10} style={{ color: "#94a3b8" }} /></button>
            <AnimatePresence>
              {showReact && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    position: "absolute", [isMe ? "right" : "left"]: 0, bottom: "calc(100% + 4px)",
                    background: "#fff", border: "1px solid #e0f2fe", borderRadius: 20, padding: "5px 8px",
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
          {canDelete && (
            <>
              <button onClick={() => { onEdit(msg); setHover(false); }} style={iconBtn}><Pencil size={10} style={{ color: "#64748b" }} /></button>
              <button onClick={() => { onPin(msg); setHover(false); }} style={iconBtn} title={isPinned ? "Bỏ ghim" : "Ghim"}>
                <Pin size={10} style={{ color: isPinned ? "#C9A55A" : "#64748b" }} />
              </button>
              <button onClick={() => { onDelete(msg.id); setHover(false); }} style={{ ...iconBtn, background: "#fff5f5", borderColor: "#fecaca" }}>
                <Trash2 size={10} style={{ color: "#ef4444" }} />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const ReplyPreview = () => replyTo && !isDeleted ? (
    <div style={{ borderLeft: `2px solid ${isMe ? "rgba(255,255,255,0.5)" : "#0ea5e9"}`, paddingLeft: 8, marginBottom: 6, opacity: 0.75 }}>
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
            style={{ display: "flex", alignItems: "center", gap: 3, background: "#f0f9ff", border: "1px solid #e0f2fe", borderRadius: 12, padding: "1px 6px", cursor: "pointer", fontSize: 11, lineHeight: 1.4 }}>
            {emoji} <span style={{ fontSize: 9, color: "#64748b" }}>{users.length}</span>
          </button>
        )
      )}
    </div>
  ) : null;

  const contentEl = msg.content ? (
    <p style={textStyle(isMe, isDeleted)}>
      {searchQuery ? highlightText(msg.content, searchQuery) : msg.content}
    </p>
  ) : null;

  if (isMe) return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 2 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowReact(false); }}>
      <ActionBar />
      <div style={{ maxWidth: "min(74%, 520px)" }}>
        {showHeader && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 8, color: "#b0c4d8" }}>{formatTime(msg.createdAt)}</span>
            {msg.editedAt && <span style={{ fontSize: 7.5, color: "#94a3b8", fontStyle: "italic" }}>đã chỉnh sửa</span>}
            {isPinned && <Pin size={8} style={{ color: "#C9A55A" }} />}
          </div>
        )}
        <div style={bubbleStyle(true, isDeleted)}>
          <ReplyPreview />
          {contentEl}
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
      <div style={{ maxWidth: "min(74%, 520px)" }}>
        {showHeader && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#0c1a2e" }}>{msg.userName}</span>
            <RIcon size={8} style={{ color: rcfg.color }} />
            <span style={{ fontSize: 8, color: "#b0c4d8" }}>{formatTime(msg.createdAt)}</span>
            {msg.editedAt && <span style={{ fontSize: 7.5, color: "#94a3b8", fontStyle: "italic" }}>đã chỉnh sửa</span>}
            {isPinned && <Pin size={8} style={{ color: "#C9A55A" }} />}
          </div>
        )}
        <div style={bubbleStyle(false, isDeleted)}>
          <ReplyPreview />
          {contentEl}
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0 2px 38px" }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: "#94a3b8",
            animation: `typingBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 9.5, color: "#94a3b8" }}>{name} đang nhập...</span>
    </div>
  );
}

// ─── Upload Preview ───────────────────────────────────────────────────────────

function UploadPreview({ file, onCancel }: { file: File; onCancel: () => void }) {
  const isImage = file.type.startsWith("image/");
  const url = isImage ? URL.createObjectURL(file) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", marginBottom: 6 }}>
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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");

  // New state for Zalo features
  const [mobileView, setMobileView] = useState<"rooms" | "chat">("rooms");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [infoPanelMedia, setInfoPanelMedia] = useState<Message[]>([]);

  // Room settings (embedded in info panel)
  const [roomSettingsName, setRoomSettingsName] = useState("");
  const [roomSettingsIcon, setRoomSettingsIcon] = useState("");
  const [roomSettingsColor, setRoomSettingsColor] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const activeRoomRef = useRef<Room | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load pinned messages when room changes
  useEffect(() => {
    if (!activeRoom) return;
    fetch(`/api/chat?roomId=${activeRoom.id}&pinned=1`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPinnedMessages(d); })
      .catch(() => {});
  }, [activeRoom?.id]);

  // SSE per active room
  const connectSSE = useCallback((room: Room) => {
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
    setMessages([]);
    setReplyTo(null);
    setTypingUsers([]);

    fetch(`/api/chat?roomId=${room.id}`)
      .then(r => r.json())
      .then(msgs => {
        if (Array.isArray(msgs)) {
          setMessages(msgs);
          setReadCounts(prev => ({ ...prev, [room.id]: room.messageCount ?? msgs.length }));
          // Collect media from messages for info panel
          setInfoPanelMedia(msgs.filter(m => m.mediaType === "image" && !m.deletedAt));
        }
      }).catch(() => {});

    const since = encodeURIComponent(new Date(Date.now() - 3000).toISOString());
    const es = new EventSource(`/api/chat/stream?roomId=${room.id}&since=${since}`);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onmessage = e => {
      try {
        const payload = JSON.parse(e.data as string) as { type: string; data: unknown };
        if (payload.type === "messages") {
          const newMsgs = payload.data as Message[];
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id));
            const fresh = newMsgs.filter(m => !ids.has(m.id));
            if (fresh.length > 0) {
              setInfoPanelMedia(im => [...im, ...fresh.filter(m => m.mediaType === "image" && !m.deletedAt)]);
            }
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
        if (payload.type === "rooms") setRooms(payload.data as Room[]);
        if (payload.type === "typing") {
          const names = payload.data as string[];
          const myName = currentUser?.name ?? "";
          setTypingUsers(names.filter(n => n !== myName));
        }
      } catch {/**/}
    };
    es.onerror = () => {
      setConnected(false);
      setTimeout(() => { if (activeRoomRef.current?.id === room.id) connectSSE(room); }, 3000);
    };
  }, [currentUser?.name]);

  useEffect(() => {
    if (!activeRoom) return;
    connectSSE(activeRoom);
    return () => { esRef.current?.close(); };
  }, [activeRoom?.id]);

  useEffect(() => () => { esRef.current?.close(); }, []);

  useEffect(() => {
    if (searchResults === null) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, searchResults]);

  // Search debounce
  useEffect(() => {
    if (!showSearch) { setSearchResults(null); setSearchQuery(""); return; }
    if (!searchQuery.trim() || !activeRoom) { setSearchResults(null); return; }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/chat?roomId=${activeRoom.id}&search=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json())
        .then(d => { setSearchResults(Array.isArray(d) ? d : []); setSearchLoading(false); })
        .catch(() => setSearchLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch, activeRoom?.id]);

  const unreadCounts: Record<string, number> = {};
  rooms.forEach(r => {
    if (r.id !== activeRoom?.id) {
      const read = readCounts[r.id] ?? 0;
      unreadCounts[r.id] = Math.max(0, (r.messageCount ?? 0) - read);
    }
  });

  // Typing broadcast
  const sendTyping = useCallback(() => {
    if (!activeRoom || !currentUser) return;
    fetch(`/api/chat?typing=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: activeRoom.id, userId: currentUser.id, userName: currentUser.name }),
    }).catch(() => {});
  }, [activeRoom?.id, currentUser?.id]);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    sendTyping();
    typingTimerRef.current = setTimeout(() => setTypingUsers([]), 4000);
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || !activeRoom || !currentUser || sending) return;
    if (activeRoom.type === "announce" && !isAdmin) return;
    setSending(true);

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

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
      } catch {/* ignore upload error */}
      setUploading(false);
      setPendingFile(null);
    }

    const content = input.trim();
    setInput("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; }

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoom.id, userId: currentUser.id, userName: currentUser.name,
          content, mediaUrl, mediaType,
          replyToId: replyTo?.id ?? null,
        }),
      });
    } catch {/* optimistic — message will appear via SSE */}
    setSending(false);
    setReplyTo(null);
  };

  const handleDeleteMsg = async (msgId: string) => {
    if (!currentUser) return;
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, content: "[Tin nhắn đã bị xóa]", deletedAt: new Date().toISOString() } : m
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
      try { r = JSON.parse(m.reactions ?? "{}"); } catch {/**/}
      const arr = r[emoji] ?? [];
      r[emoji] = arr.includes(currentUser.id) ? arr.filter(id => id !== currentUser.id) : [...arr, currentUser.id];
      return { ...m, reactions: JSON.stringify(r) };
    }));
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgId, userId: currentUser.id, action: "react",
        reactions: (() => {
          const msg = messages.find(m => m.id === msgId);
          let r: Record<string, string[]> = {};
          try { r = JSON.parse(msg?.reactions ?? "{}"); } catch {/**/}
          const arr = r[emoji] ?? [];
          r[emoji] = arr.includes(currentUser.id) ? arr.filter(id => id !== currentUser.id) : [...arr, currentUser.id];
          return r;
        })(),
      }),
    }).catch(() => {});
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !currentUser) return;
    const res = await fetch("/api/chat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoomName.trim(), type: "channel", createdBy: currentUser.id }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { id: string };
      const newR: Room = { id: data.id, name: newRoomName.trim(), type: "channel", lastMessage: null, messageCount: 0 };
      setRooms(prev => [...prev, newR]);
      setActiveRoom(newR);
    }
    setNewRoom(false);
    setNewRoomName("");
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

  const handleEditMsg = (msg: Message) => {
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

  const handlePin = async (msg: Message) => {
    if (!currentUser || !isAdmin) return;
    const isNowPinned = !msg.pinnedAt;
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, pinnedAt: isNowPinned ? new Date().toISOString() : null, pinnedBy: isNowPinned ? currentUser.id : null } : m
    ));
    if (isNowPinned) {
      setPinnedMessages(prev => [...prev.filter(m => m.id !== msg.id), { ...msg, pinnedAt: new Date().toISOString(), pinnedBy: currentUser.id }]);
    } else {
      setPinnedMessages(prev => prev.filter(m => m.id !== msg.id));
    }
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgId: msg.id, userId: currentUser.id, action: "pin", pin: isNowPinned }),
    }).catch(() => {});
  };

  const handleSaveRoomSettings = async () => {
    if (!activeRoom || !currentUser) return;
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: activeRoom.id, userId: currentUser.id, action: "updateRoom",
        name: roomSettingsName.trim() || activeRoom.name,
        icon: roomSettingsIcon, color: roomSettingsColor,
      }),
    }).catch(() => {});
    const updated = {
      name: roomSettingsName.trim() || activeRoom.name,
      icon: roomSettingsIcon, color: roomSettingsColor,
    };
    setActiveRoom(prev => prev ? { ...prev, ...updated } : null);
    setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, ...updated } : r));
  };

  const openInfoPanel = () => {
    if (!activeRoom) return;
    setRoomSettingsName(activeRoom.name);
    setRoomSettingsIcon(activeRoom.icon ?? "");
    setRoomSettingsColor(activeRoom.color ?? "");
    setShowInfoPanel(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  const onlineMembers = members.filter(m => m.status === "online" || m.status === "busy");
  const isReadOnly = activeRoom?.type === "announce" && !isAdmin;
  const msgMap = new Map(messages.map(m => [m.id, m]));
  const pinnedSet = new Set(messages.filter(m => m.pinnedAt).map(m => m.id));

  // Date-grouped messages with separators
  const displayMessages = useMemo(() => {
    const src = searchResults !== null ? searchResults : messages;
    const result: Array<{ type: "date"; date: string } | { type: "message"; msg: Message; showHeader: boolean }> = [];
    src.forEach((msg, i) => {
      const prev = src[i - 1];
      const prevDate = prev ? new Date(prev.createdAt).toDateString() : null;
      const curDate = new Date(msg.createdAt).toDateString();
      if (curDate !== prevDate) {
        result.push({ type: "date", date: formatDateSep(msg.createdAt) });
      }
      const showHeader = !prev || prev.userId !== msg.userId || curDate !== prevDate
        || (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) > 5 * 60000;
      result.push({ type: "message", msg, showHeader });
    });
    return result;
  }, [messages, searchResults]);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const selectRoom = (room: Room) => {
    setActiveRoom(room);
    setReadCounts(prev => ({ ...prev, [room.id]: room.messageCount ?? 0 }));
    if (isMobile) setMobileView("chat");
    setShowSearch(false);
    setSearchResults(null);
    setSearchQuery("");
    setShowInfoPanel(false);
  };

  // On desktop auto-open sidebar
  useEffect(() => {
    if (!isMobile) setSidebarOpen(true);
  }, [isMobile]);

  const latestPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  const roomListEl = (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      ...(isMobile ? { flex: 1 } : { width: 220, flexShrink: 0, borderRight: "1px solid #e0f2fe", background: "#f8fafc" }),
    }}>
      {/* Sidebar header */}
      <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 8.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.2em" }}>KÊNH CHAT</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Circle size={6} style={{ color: connected ? "#10b981" : "#f59e0b", fill: connected ? "#10b981" : "#f59e0b" }} />
          <span style={{ fontSize: 7.5, color: "#94a3b8" }}>{connected ? "live" : "..."}</span>
        </div>
      </div>

      {/* Room list */}
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
              onClick={() => selectRoom(room)}
              style={{
                padding: isMobile ? "10px 14px" : "7px 12px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: isMobile ? 10 : 7,
                background: isActive && !isMobile ? "rgba(14,165,233,0.08)" : "transparent",
                borderLeft: `2px solid ${isActive && !isMobile ? "#0ea5e9" : "transparent"}`,
              }}
              onMouseEnter={e => { if (!isActive || isMobile) e.currentTarget.style.background = "#f0f9ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = isActive && !isMobile ? "rgba(14,165,233,0.08)" : "transparent"; }}
            >
              {isMobile
                ? <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#e0f2fe,#bae6fd)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {room.icon
                      ? <span style={{ fontSize: 20 }}>{room.icon}</span>
                      : <Icon size={18} style={{ color: "#0ea5e9" }} />
                    }
                  </div>
                : <Icon size={11} style={{ color: isActive ? "#0ea5e9" : "#94a3b8", flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: isMobile ? 13 : 11, color: isActive && !isMobile ? "#0c1a2e" : "#475569", fontWeight: isActive || unread > 0 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {room.name}
                </p>
                {lastContent && (
                  <p style={{ fontSize: isMobile ? 11 : 8, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                    {lastContent.startsWith("[Tin nhắn") ? "Đã xóa" : lastContent}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {room.lastMessage && (
                  <span style={{ fontSize: 8, color: "#b0c4d8", whiteSpace: "nowrap" }}>
                    {formatTime(room.lastMessage.createdAt)}
                  </span>
                )}
                {unread > 0 && (
                  <div style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                    <span style={{ fontSize: 7.5, fontWeight: 700, color: "#fff" }}>{unread > 99 ? "99+" : unread}</span>
                  </div>
                )}
              </div>
              {isAdmin && !isMobile && room.id !== "room_general" && room.id !== "room_announce" && (
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
          <div style={{ padding: isMobile ? "6px 14px" : "4px 12px" }}>
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
      {!isMobile && onlineMembers.length > 0 && (
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
    </div>
  );

  const chatMainEl = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
      {/* Header */}
      <div style={{ height: 50, padding: "0 12px 0 10px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {isMobile ? (
          <button onClick={() => setMobileView("rooms")} style={{ ...iconBtn, flexShrink: 0 }}>
            <ChevronLeft size={14} style={{ color: "#64748b" }} />
          </button>
        ) : (
          <button onClick={() => setSidebarOpen(v => !v)} style={{ ...iconBtn, flexShrink: 0 }}>
            <ChevronLeft size={13} style={{ color: "#64748b", transition: "transform 0.18s", transform: sidebarOpen ? "rotate(0deg)" : "rotate(180deg)" }} />
          </button>
        )}

        {activeRoom ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {activeRoom.icon
                  ? <span style={{ fontSize: 16 }}>{activeRoom.icon}</span>
                  : activeRoom.type === "announce"
                    ? <Megaphone size={13} style={{ color: "#C9A55A" }} />
                    : <Hash size={13} style={{ color: "#0ea5e9" }} />
                }
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeRoom.name}</p>
                {activeRoom.type === "announce" && (
                  <span style={{ fontSize: 7.5, color: "#C9A55A", background: "rgba(201,165,90,0.1)", padding: "1px 7px", borderRadius: 10, fontWeight: 700, whiteSpace: "nowrap" }}>THÔNG BÁO</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <Circle size={6} style={{ color: "#10b981", fill: "#10b981" }} />
              <span style={{ fontSize: 8.5, color: "#64748b", whiteSpace: "nowrap" }}>{onlineMembers.length} online</span>
              <button onClick={() => { setShowSearch(v => !v); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                style={{ ...iconBtn, background: showSearch ? "rgba(14,165,233,0.08)" : "#f8fafc", borderColor: showSearch ? "#bae6fd" : "#e0f2fe" }}
                title="Tìm kiếm">
                <Search size={11} style={{ color: showSearch ? "#0ea5e9" : "#64748b" }} />
              </button>
              <button onClick={openInfoPanel}
                style={{ ...iconBtn, background: showInfoPanel ? "rgba(14,165,233,0.08)" : "#f8fafc", borderColor: showInfoPanel ? "#bae6fd" : "#e0f2fe" }}
                title="Thông tin nhóm">
                <Info size={11} style={{ color: showInfoPanel ? "#0ea5e9" : "#64748b" }} />
              </button>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: "#94a3b8" }}>Chọn kênh để bắt đầu</p>
        )}
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 44, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden", borderBottom: "1px solid #e0f2fe", background: "#f8fafc", flexShrink: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", height: 44 }}>
              <Search size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") { setShowSearch(false); } }}
                placeholder="Tìm kiếm trong kênh..."
                style={{ flex: 1, fontSize: 12, color: "#0c1a2e", fontFamily: "inherit", background: "transparent", border: "none", outline: "none" }}
              />
              {searchLoading && <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #0ea5e9", borderTopColor: "transparent", animation: "spin 0.6s linear infinite", flexShrink: 0 }} />}
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={11} style={{ color: "#94a3b8" }} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned banner */}
      {latestPinned && !showSearch && (
        <div style={{ borderBottom: "1px solid #e0f2fe", background: "rgba(201,165,90,0.04)", padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Pin size={10} style={{ color: "#C9A55A", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: "#C9A55A" }}>Tin nhắn đã ghim · </span>
            <span style={{ fontSize: 8.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{latestPinned.content}</span>
          </div>
          {pinnedMessages.length > 1 && (
            <span style={{ fontSize: 8, color: "#94a3b8", whiteSpace: "nowrap" }}>+{pinnedMessages.length - 1}</span>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column" }}>
        {searchResults !== null && searchResults.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0.5 }}>
            <Search size={24} style={{ color: "#bae6fd" }} strokeWidth={1} />
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Không tìm thấy tin nhắn nào</p>
          </div>
        )}
        {displayMessages.length === 0 && searchResults === null && activeRoom && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0.5, marginTop: "auto", marginBottom: "auto" }}>
            <Hash size={28} style={{ color: "#bae6fd" }} strokeWidth={1} />
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Chưa có tin nhắn trong #{activeRoom.name}</p>
          </div>
        )}

        {displayMessages.map((item, i) => {
          if (item.type === "date") {
            return (
              <div key={`date-${item.date}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 6px" }}>
                <div style={{ flex: 1, height: 1, background: "#e0f2fe" }} />
                <span style={{ fontSize: 8.5, color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap", padding: "0 4px" }}>{item.date}</span>
                <div style={{ flex: 1, height: 1, background: "#e0f2fe" }} />
              </div>
            );
          }
          const { msg, showHeader } = item;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14 }}
              style={{ marginTop: showHeader && i > 0 ? 10 : 2 }}
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
                onPin={handlePin}
                canDelete={msg.userId === currentUser?.id || isAdmin}
                replyTo={msg.replyToId ? (msgMap.get(msg.replyToId) ?? null) : null}
                roomColor={activeRoom?.color}
                searchQuery={searchResults !== null ? searchQuery : undefined}
                isPinned={pinnedSet.has(msg.id)}
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
            <button onClick={() => { setEditingMsg(null); setEditContent(""); }} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}>
              <X size={11} style={{ color: "#94a3b8" }} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <textarea
              autoFocus value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                if (e.key === "Escape") { setEditingMsg(null); setEditContent(""); }
              }}
              rows={1}
              style={{ flex: 1, fontSize: 12, color: "#0c1a2e", fontFamily: "inherit", background: "#fff", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 12px", outline: "none", resize: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" }}
              onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 100) + "px"; }}
            />
            <button onClick={handleSaveEdit} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
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
            {replyTo && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8, marginBottom: 6, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)" }}>
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
            {pendingFile && <UploadPreview file={pendingFile} onCancel={() => setPendingFile(null)} />}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <Avatar src={null} name={currentUser?.name ?? "?"} size={28} />
              <div style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, padding: "8px 10px 8px 12px", display: "flex", alignItems: "flex-end", gap: 6 }}>
                <button onClick={() => fileInputRef.current?.click()} disabled={!activeRoom} title="Đính kèm file/ảnh" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", flexShrink: 0 }}>
                  <Paperclip size={14} style={{ color: "#94a3b8" }} />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={activeRoom ? `Nhắn vào #${activeRoom.name}...` : "Chọn kênh..."}
                  disabled={!activeRoom}
                  rows={1}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0c1a2e", fontFamily: "inherit", resize: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }}
                  onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !pendingFile) || sending || uploading || !activeRoom}
                  style={{ width: 32, height: 32, borderRadius: 10, border: "none", flexShrink: 0, background: (input.trim() || pendingFile) && activeRoom ? "#0ea5e9" : "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", cursor: (input.trim() || pendingFile) && activeRoom ? "pointer" : "default", transition: "background 0.12s" }}
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

      {/* Group Info Panel (slide-in from right) */}
      <AnimatePresence>
        {showInfoPanel && activeRoom && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: Math.min(300, typeof window !== "undefined" ? window.innerWidth : 300),
              background: "#fff", borderLeft: "1px solid #e0f2fe", zIndex: 30,
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Panel header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e0f2fe", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e" }}>Thông Tin Nhóm</p>
              </div>
              <button onClick={() => setShowInfoPanel(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={14} style={{ color: "#94a3b8" }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Room avatar + name */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 14px", borderBottom: "1px solid #f0f9ff" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: activeRoom.color ? activeRoom.color + "22" : "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, border: "2px solid #e0f2fe" }}>
                  {activeRoom.icon
                    ? <span style={{ fontSize: 28 }}>{activeRoom.icon}</span>
                    : activeRoom.type === "announce"
                      ? <Megaphone size={26} style={{ color: "#C9A55A" }} />
                      : <Hash size={26} style={{ color: "#0ea5e9" }} />
                  }
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#0c1a2e" }}>{activeRoom.name}</p>
                <p style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 2 }}>{members.length} thành viên · {onlineMembers.length} online</p>
              </div>

              {/* Room settings (admin only) */}
              {isAdmin && (
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f9ff" }}>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", marginBottom: 10 }}>CÀI ĐẶT KÊNH</p>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 9, color: "#94a3b8", marginBottom: 4 }}>Tên kênh</p>
                    <input value={roomSettingsName} onChange={e => setRoomSettingsName(e.target.value)}
                      style={{ width: "100%", fontSize: 11, color: "#0c1a2e", fontFamily: "inherit", background: "#f8fafc", border: "1px solid #e0f2fe", borderRadius: 7, padding: "6px 10px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 9, color: "#94a3b8", marginBottom: 4 }}>Icon (emoji)</p>
                    <input value={roomSettingsIcon} onChange={e => setRoomSettingsIcon(e.target.value)} maxLength={4}
                      placeholder="💬" style={{ width: "100%", fontSize: 16, fontFamily: "inherit", background: "#f8fafc", border: "1px solid #e0f2fe", borderRadius: 7, padding: "6px 10px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 9, color: "#94a3b8", marginBottom: 6 }}>Màu nền (tin nhắn admin)</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#0c1a2e"].map(c => (
                        <button key={c || "none"} onClick={() => setRoomSettingsColor(c)}
                          style={{ width: 24, height: 24, borderRadius: "50%", border: roomSettingsColor === c ? "2.5px solid #0c1a2e" : "1.5px solid #e0f2fe", background: c || "#f1f5f9", cursor: "pointer", flexShrink: 0 }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSaveRoomSettings}
                    style={{ width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "#0ea5e9", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                    Lưu thay đổi
                  </button>
                </div>
              )}

              {/* Members */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f9ff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Users size={12} style={{ color: "#94a3b8" }} />
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em" }}>THÀNH VIÊN · {members.length}</p>
                </div>
                {members.map(m => {
                  const rcfg = ROLE_CFG[m.role] ?? ROLE_CFG.staff;
                  const RoleIcon = rcfg.icon;
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                      <Avatar src={m.avatar} name={m.name} size={28} status={m.status} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: "#0c1a2e", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <RoleIcon size={8} style={{ color: rcfg.color }} />
                          <span style={{ fontSize: 8.5, color: "#94a3b8" }}>{m.role}</span>
                        </div>
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[m.status] ?? "#cbd5e1", flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>

              {/* Shared images */}
              {infoPanelMedia.length > 0 && (
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f9ff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <ImageIcon size={12} style={{ color: "#94a3b8" }} />
                    <p style={{ fontSize: 8.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em" }}>ẢNH · {infoPanelMedia.length}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                    {infoPanelMedia.slice(-12).map(m => (
                      <a key={m.id} href={m.mediaUrl!} target="_blank" rel="noreferrer">
                        <img src={m.mediaUrl!} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, display: "block" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Pinned messages */}
              {pinnedMessages.length > 0 && (
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Pin size={12} style={{ color: "#C9A55A" }} />
                    <p style={{ fontSize: 8.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em" }}>ĐÃ GHIM · {pinnedMessages.length}</p>
                  </div>
                  {pinnedMessages.map(m => (
                    <div key={m.id} style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(201,165,90,0.05)", border: "1px solid rgba(201,165,90,0.15)", marginBottom: 6 }}>
                      <p style={{ fontSize: 9.5, fontWeight: 600, color: "#92712a", marginBottom: 2 }}>{m.userName}</p>
                      <p style={{ fontSize: 10.5, color: "#0c1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.mediaType === "image" ? "📷 Ảnh" : m.mediaType === "file" ? "📎 File" : m.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%" }}>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <input ref={fileInputRef} type="file" style={{ display: "none" }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={handleFileSelect}
      />

      <div style={{
        display: "flex", flex: 1, minHeight: 0, height: "100%",
        borderRadius: 16, overflow: "hidden",
        border: "1px solid #bae6fd", background: "#fff",
        boxShadow: "0 2px 16px rgba(12,26,46,0.07)",
      }}>
        {isMobile ? (
          // Mobile: full-screen toggle between rooms and chat
          mobileView === "rooms" ? roomListEl : chatMainEl
        ) : (
          // Desktop: sidebar + chat
          <>
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  style={{ flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
                >
                  {roomListEl}
                </motion.div>
              )}
            </AnimatePresence>
            {chatMainEl}
          </>
        )}
      </div>
    </div>
  );
}
