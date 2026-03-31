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
  Pin, Search, Image as ImageIcon, Users, MessageCircle,
  RotateCcw, Eye, ZoomIn,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { playSound } from "@/hooks/useSFX";


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
  revokedAt?: string | null;
};
type ReadReceipt = { userId: string; lastReadAt: string };
type Member = {
  id: string; name: string; avatar: string | null;
  status: string; role: string;
};
type ChatToast = { id: string; roomName: string; msgPreview: string };

const ROLE_CFG: Record<string, { color: string; icon: typeof User }> = {
  admin:   { color: "#C9A55A", icon: Crown },
  manager: { color: "#0ea5e9", icon: UserCheck },
  staff:   { color: "#64748b", icon: User },
};
const STATUS_COLOR: Record<string, string> = {
  online: "#10b981", busy: "#f59e0b", away: "#94a3b8", offline: "#cbd5e1",
  working: "#10b981", off_shift: "#94a3b8", day_off: "#e2e8f0",
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
      <mark style={{ background: "rgba(99,102,241,0.18)", borderRadius: 2, padding: "0 1px" }}>
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
        background: src ? "transparent" : "linear-gradient(135deg,#6366f1,#818cf8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", border: "1.5px solid #e0e7ff",
      }}>
        {src
          ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#fff" }}>{name.slice(0, 1).toUpperCase()}</span>
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
  width: 26, height: 26, borderRadius: 7, border: "1px solid #e0e7ff",
  background: "#f8f9ff", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
        <img src={src} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 8px 48px rgba(0,0,0,0.6)", display: "block" }} />
        <button onClick={onClose} style={{ position: "absolute", top: -14, right: -14, width: 32, height: 32, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          <X size={16} style={{ color: "#0c1a2e" }} />
        </button>
        <a href={src} download target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ position: "absolute", bottom: -14, right: -14, width: 32, height: 32, borderRadius: "50%", background: "#6366f1", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(99,102,241,0.4)", textDecoration: "none" }}>
          <Download size={14} style={{ color: "#fff" }} />
        </a>
      </div>
    </div>
  );
}

// ─── Media Bubble ─────────────────────────────────────────────────────────────

function MediaContent({ msg, isMe, onOpenLightbox }: { msg: Message; isMe: boolean; onOpenLightbox?: (url: string) => void }) {
  if (!msg.mediaUrl) return null;
  if (msg.mediaType === "image") {
    return (
      <div style={{ marginTop: msg.content ? 6 : 0, position: "relative", display: "inline-block" }}>
        <img src={msg.mediaUrl} alt="media"
          onClick={() => onOpenLightbox?.(msg.mediaUrl!)}
          style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 10, display: "block", border: "1px solid #e0e7ff", cursor: "zoom-in" }}
        />
        <div onClick={() => onOpenLightbox?.(msg.mediaUrl!)}
          style={{ position: "absolute", inset: 0, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0)", transition: "background 0.15s", cursor: "zoom-in" }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.18)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0)"; }}
        >
          <ZoomIn size={20} style={{ color: "#fff", opacity: 0, transition: "opacity 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as SVGSVGElement).style.opacity = "1"; }}
            onMouseLeave={e => { (e.currentTarget as SVGSVGElement).style.opacity = "0"; }}
          />
        </div>
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
        background: "#f0f4ff",
        border: "1px solid #e0e7ff",
        textDecoration: "none", cursor: "pointer",
      }}
    >
      <FileIcon size={14} style={{ color: "#6366f1", flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: "#0c1a2e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {filename.replace(/^chat_\d+_[a-z0-9]+/, "").replace(/^_/, "") || filename}
      </span>
      <Download size={11} style={{ color: "#94a3b8", flexShrink: 0 }} />
    </a>
  );
}

// ─── Discord-style Message Row ────────────────────────────────────────────────

function MsgBubble({ msg, isMe, showHeader, members, onDelete, onRevoke, onReply, onReact, onEdit, onPin, canDelete, replyTo, searchQuery, isPinned, onOpenLightbox, readBy }: {
  msg: Message; isMe: boolean; showHeader: boolean;
  members: Member[]; canDelete: boolean; isPinned?: boolean;
  replyTo?: Message | null; roomColor?: string | null; searchQuery?: string;
  isAdmin?: boolean;
  readBy?: Member[];
  onDelete: (id: string) => void;
  onRevoke: (msg: Message) => void;
  onReply: (msg: Message) => void;
  onReact: (msgId: string, emoji: string) => void;
  onEdit: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onOpenLightbox: (url: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const [showReact, setShowReact] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const member = members.find(m => m.id === msg.userId);
  const rcfg = ROLE_CFG[member?.role ?? "staff"] ?? ROLE_CFG.staff;
  const RIcon = rcfg.icon;
  const isDeleted = !!msg.deletedAt;
  const isRevoked = !!msg.revokedAt;

  let reactions: Record<string, string[]> = {};
  try { if (msg.reactions) reactions = JSON.parse(msg.reactions); } catch { /* */ }
  const hasReactions = Object.keys(reactions).some(k => reactions[k].length > 0);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setShowReact(false); }}
      style={{
        display: "flex", gap: 14, padding: "2px 16px 2px 16px",
        background: hover ? "rgba(99,102,241,0.04)" : "transparent",
        borderRadius: 4, position: "relative", marginTop: showHeader ? 16 : 0,
        transition: "background 0.05s",
      }}
    >
      {/* Avatar or spacer */}
      <div style={{ width: 40, flexShrink: 0, paddingTop: showHeader ? 2 : 0 }}>
        {showHeader
          ? <Avatar src={member?.avatar} name={msg.userName} size={40} />
          : hover
            ? <span style={{ fontSize: 8, color: "#94a3b8", lineHeight: "20px", display: "block", textAlign: "right", paddingRight: 4 }}>{formatTime(msg.createdAt).slice(0, 5)}</span>
            : null
        }
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Reply preview */}
        {replyTo && !isDeleted && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, opacity: 0.75 }}>
            <div style={{ width: 20, height: 10, borderTop: "2px solid #94a3b8", borderLeft: "2px solid #94a3b8", borderRadius: "4px 0 0 0", marginLeft: 4, flexShrink: 0 }} />
            <Avatar src={members.find(m => m.id === replyTo.userId)?.avatar} name={replyTo.userName} size={16} />
            <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>{replyTo.userName}</span>
            <span style={{ fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {replyTo.mediaType === "image" ? "📷 Ảnh" : replyTo.mediaType === "file" ? "📎 File" : replyTo.content}
            </span>
          </div>
        )}

        {/* Name + timestamp header */}
        {showHeader && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: isMe ? "#6366f1" : rcfg.color }}>{msg.userName}</span>
            <RIcon size={9} style={{ color: rcfg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 9.5, color: "#94a3b8" }}>{formatTime(msg.createdAt)}</span>
            {msg.editedAt && <span style={{ fontSize: 9, color: "#94a3b8", fontStyle: "italic" }}>đã sửa</span>}
            {isPinned && <Pin size={9} style={{ color: "#6366f1" }} />}
          </div>
        )}

        {/* Text */}
        {msg.content && (
          <p style={{
            fontSize: 13, lineHeight: 1.5, wordBreak: "break-word",
            color: (isDeleted || isRevoked) ? "#94a3b8" : "#1e293b",
            fontStyle: (isDeleted || isRevoked) ? "italic" : "normal",
          }}>
            {isRevoked
              ? <><RotateCcw size={10} style={{ color: "#94a3b8", marginRight: 4, verticalAlign: "middle", display: "inline" }} />{msg.content}</>
              : searchQuery ? highlightText(msg.content, searchQuery) : msg.content
            }
          </p>
        )}

        {/* Media (hidden if revoked) */}
        {!isRevoked && <MediaContent msg={msg} isMe={isMe} onOpenLightbox={onOpenLightbox} />}

        {/* Reactions */}
        {hasReactions && !isRevoked && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
            {Object.entries(reactions).map(([emoji, userIds]) =>
              userIds.length > 0 && (
                <div key={emoji} style={{ position: "relative", display: "inline-block" }}>
                  <button onClick={() => onReact(msg.id, emoji)}
                    onMouseEnter={() => setHoveredReaction(emoji)}
                    onMouseLeave={() => setHoveredReaction(null)}
                    style={{ display: "flex", alignItems: "center", gap: 3, background: "#f0f4ff", border: "1px solid #e0e7ff", borderRadius: 12, padding: "2px 7px", cursor: "pointer", fontSize: 12, lineHeight: 1.4 }}>
                    {emoji} <span style={{ fontSize: 9.5, color: "#64748b" }}>{userIds.length}</span>
                  </button>
                  {hoveredReaction === emoji && (
                    <div style={{
                      position: "absolute", bottom: "calc(100% + 4px)", left: 0,
                      background: "#0c1a2e", color: "#fff", borderRadius: 8, padding: "5px 8px",
                      fontSize: 9.5, whiteSpace: "nowrap", zIndex: 20,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      pointerEvents: "none",
                    }}>
                      {userIds.map(uid => members.find(m => m.id === uid)?.name ?? uid).join(", ")}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* Read receipts (show who has seen this message — only show on last message) */}
        {readBy && readBy.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 3 }}>
            <Eye size={8} style={{ color: "#10b981" }} />
            <div style={{ display: "flex", gap: 1 }}>
              {readBy.slice(0, 5).map(m => (
                <div key={m.id} title={m.name} style={{ width: 12, height: 12, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#34d399)", border: "1px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {m.avatar
                    ? <img src={m.avatar} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 6, color: "#fff", fontWeight: 700 }}>{m.name[0]}</span>
                  }
                </div>
              ))}
              {readBy.length > 5 && <span style={{ fontSize: 8, color: "#94a3b8" }}>+{readBy.length - 5}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Floating action toolbar (Discord hover bar) */}
      <AnimatePresence>
        {hover && !isDeleted && !isRevoked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -2 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.08 }}
            style={{
              position: "absolute", top: -14, right: 16,
              display: "flex", alignItems: "center", gap: 2,
              background: "#fff", border: "1px solid #e0e7ff", borderRadius: 10,
              padding: "3px 5px",
              boxShadow: "0 4px 16px rgba(99,102,241,0.10)",
              zIndex: 10,
            }}
          >
            {/* Emoji picker */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowReact(v => !v)} title="Thêm cảm xúc"
                style={{ ...iconBtn, width: 26, height: 26 }}>
                <Smile size={12} style={{ color: "#64748b" }} />
              </button>
              <AnimatePresence>
                {showReact && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      position: "absolute", right: 0, bottom: "calc(100% + 4px)",
                      background: "#fff", border: "1px solid #e0e7ff", borderRadius: 20, padding: "6px 10px",
                      display: "flex", flexWrap: "wrap", gap: 2, width: 200,
                      boxShadow: "0 4px 20px rgba(99,102,241,0.12)", zIndex: 30,
                    }}
                  >
                    {QUICK_REACTIONS.map(e => (
                      <button key={e} onClick={() => { onReact(msg.id, e); setShowReact(false); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "3px 4px", borderRadius: 6, lineHeight: 1 }}
                        onMouseEnter={el => (el.currentTarget.style.background = "#f0f4ff")}
                        onMouseLeave={el => (el.currentTarget.style.background = "none")}
                      >{e}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => onReply(msg)} title="Trả lời" style={{ ...iconBtn, width: 26, height: 26 }}>
              <Reply size={12} style={{ color: "#64748b" }} />
            </button>
            {canDelete && (
              <>
                {isMe && (
                  <button onClick={() => { onRevoke(msg); setHover(false); }} title="Thu hồi tin nhắn"
                    style={{ ...iconBtn, width: 26, height: 26 }}
                    onMouseEnter={el => (el.currentTarget.style.background = "#fff7ed")}
                    onMouseLeave={el => (el.currentTarget.style.background = "#f8f9ff")}
                  >
                    <RotateCcw size={12} style={{ color: "#f59e0b" }} />
                  </button>
                )}
                <button onClick={() => { onEdit(msg); setHover(false); }} title="Chỉnh sửa" style={{ ...iconBtn, width: 26, height: 26 }}>
                  <Pencil size={12} style={{ color: "#64748b" }} />
                </button>
                <button onClick={() => { onPin(msg); setHover(false); }} title={isPinned ? "Bỏ ghim" : "Ghim"} style={{ ...iconBtn, width: 26, height: 26 }}>
                  <Pin size={12} style={{ color: isPinned ? "#6366f1" : "#64748b" }} />
                </button>
                <button onClick={() => { onDelete(msg.id); setHover(false); }} title="Xóa"
                  style={{ ...iconBtn, width: 26, height: 26, borderColor: "#fecaca" }}
                  onMouseEnter={el => (el.currentTarget.style.background = "#fff5f5")}
                  onMouseLeave={el => (el.currentTarget.style.background = "#f8f9ff")}
                >
                  <Trash2 size={12} style={{ color: "#ef4444" }} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, background: "#f0f4ff", border: "1px solid #e0e7ff", marginBottom: 6 }}>
      {url
        ? <img src={url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
        : <FileIcon size={18} style={{ color: "#6366f1", flexShrink: 0 }} />
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
  const cardBg = "rgba(255,255,255,0.88)";
  const cardBorder = "rgba(186,230,253,0.55)";

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

  // Image lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Read receipts
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<ChatToast[]>([]);

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
    let fetchedMembers: Member[] = [];
    fetch("/api/profile").then(r => r.json()).then(d => {
      fetchedMembers = Array.isArray(d) ? d : [];
      setMembers(fetchedMembers);
    }).catch(() => {});
    fetch("/api/chat?rooms=1").then(r => r.json()).then(async (d) => {
      if (Array.isArray(d)) {
        let roomList: Room[] = d;
        // Admin/manager: auto-create DM rooms for each active non-admin staff
        if (isAdmin && currentUser) {
          const activeStaff = fetchedMembers.filter(m => m.status !== "deleted");
          for (const m of activeStaff) {
            if (m.id === currentUser.id) continue;
            const dmId = `dm_${m.id}`;
            const exists = d.find((r: Room) => r.id === dmId);
            if (!exists) {
              const res = await fetch("/api/chat", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: dmId, name: m.name, type: "direct", createdBy: currentUser.id }),
              }).catch(() => null);
              if (res?.ok) {
                const newR: Room = { id: dmId, name: m.name, type: "direct", lastMessage: null, messageCount: 0 };
                if (!roomList.find(r => r.id === dmId)) roomList = [...roomList, newR];
              }
            }
          }
        }
        setRooms(roomList);
        if (!activeRoomRef.current && roomList.length > 0) setActiveRoom(roomList[0]);
      }
    }).catch(() => {});
  }, []);

  // Load pinned + read receipts when room changes; mark as read
  useEffect(() => {
    if (!activeRoom) return;
    fetch(`/api/chat?roomId=${activeRoom.id}&pinned=1`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPinnedMessages(d); })
      .catch(() => {});
    fetch(`/api/chat?roomId=${activeRoom.id}&receipts=1`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setReadReceipts(d); })
      .catch(() => {});
    if (currentUser) {
      fetch(`/api/chat?markRead=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: activeRoom.id, userId: currentUser.id }),
      }).catch(() => {});
    }
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
              // Mark room as read for new messages in active room
              const roomId = activeRoomRef.current?.id;
              const uid = currentUser?.id;
              if (roomId && uid) {
                fetch(`/api/chat?markRead=1`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ roomId, userId: uid }),
                }).then(() =>
                  fetch(`/api/chat?roomId=${roomId}&receipts=1`).then(r => r.json()).then(d => {
                    if (Array.isArray(d)) setReadReceipts(d);
                  })
                ).catch(() => {});
              }
            }
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
        if (payload.type === "rooms") {
          const incoming = payload.data as Room[];
          setRooms(prev => {
            // Check for new messages in non-active rooms → toast
            incoming.forEach(r => {
              if (r.id === activeRoomRef.current?.id) return;
              const old = prev.find(p => p.id === r.id);
              if (!old) return;
              if ((r.messageCount ?? 0) > (old.messageCount ?? 0) && r.lastMessage) {
                const preview = r.lastMessage.mediaType === "image" ? "📷 Ảnh"
                  : r.lastMessage.mediaType === "file" ? "📎 File"
                  : (r.lastMessage.content ?? "").slice(0, 50);
                const toast: ChatToast = { id: `${r.id}_${Date.now()}`, roomName: r.name, msgPreview: `${r.lastMessage.userName}: ${preview}` };
                setToasts(t => [...t.slice(-2), toast]);
                setTimeout(() => setToasts(t => t.filter(x => x.id !== toast.id)), 4000);
              }
            });
            return incoming;
          });
        }
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

  // Periodic refresh to pick up revoked/edited messages from other users
  useEffect(() => {
    if (!activeRoom) return;
    const timer = setInterval(() => {
      fetch(`/api/chat?roomId=${activeRoom.id}`)
        .then(r => r.json())
        .then(msgs => {
          if (Array.isArray(msgs)) {
            setMessages(msgs);
          }
        }).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [activeRoom?.id]);

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
    // SSE will push updated list; only clear own name locally if no update arrives
    typingTimerRef.current = setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== (currentUser?.name ?? ""))), 5000);
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || !activeRoom || !currentUser || sending) return;
    if (activeRoom.type === "announce" && !isAdmin) return;
    playSound("tap");
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
    playSound("destroy");
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, content: "[Tin nhắn đã bị xóa]", deletedAt: new Date().toISOString() } : m
    ));
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgId, userId: currentUser.id }),
    }).catch(() => {});
  };

  const handleRevokeMsg = async (msg: Message) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, content: "[Tin nhắn đã được thu hồi]", revokedAt: now, mediaUrl: null } : m
    ));
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgId: msg.id, userId: currentUser.id, action: "revoke" }),
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
    playSound("save");
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

  const handleClearRoom = async () => {
    if (!activeRoom || !currentUser) return;
    if (!window.confirm(`Xóa toàn bộ tin nhắn trong #${activeRoom.name}? Hành động này không thể hoàn tác.`)) return;
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: activeRoom.id, userId: currentUser.id, action: "clearRoom" }),
    }).catch(() => {});
    setMessages([]);
    setPinnedMessages([]);
    setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, lastMessage: null, messageCount: 0 } : r));
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
  const msgMap = useMemo(() => new Map(messages.map(m => [m.id, m])), [messages]);
  const pinnedSet = new Set(messages.filter(m => m.pinnedAt).map(m => m.id));

  // Compute which members have read up to which message (for read receipt display)
  // For each member, find the last message they've seen (createdAt <= lastReadAt)
  const readReceiptsByMsg = useMemo(() => {
    const map = new Map<string, Member[]>();
    if (!messages.length || !readReceipts.length) return map;
    readReceipts.forEach(rr => {
      if (rr.userId === currentUser?.id) return; // don't show self
      const m = members.find(mb => mb.id === rr.userId);
      if (!m) return;
      // Find last message this user has read
      let lastIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].createdAt <= rr.lastReadAt) { lastIdx = i; break; }
      }
      if (lastIdx === -1) return;
      const msgId = messages[lastIdx].id;
      const existing = map.get(msgId) ?? [];
      map.set(msgId, [...existing, m]);
    });
    return map;
  }, [messages, readReceipts, members, currentUser?.id]);

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
      ...(isMobile
        ? { flex: 1, background: "rgba(240,244,255,0.92)" }
        : { width: 232, flexShrink: 0, borderRight: `1px solid ${cardBorder}`, background: "rgba(240,244,255,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }),
    }}>
      {/* Server header */}
      <div style={{
        padding: "0 12px", height: 48, borderBottom: `1px solid ${cardBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        background: cardBg,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 1px 0 rgba(99,102,241,0.06)",
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>POSTLAIN</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#23a55a" : "#f0b232", boxShadow: connected ? "0 0 6px #23a55a" : "none" }} />
        </div>
      </div>

      {/* Channel / DM list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {(() => {
          const channelRooms = rooms.filter(r => r.type !== "direct");
          const dmRooms = isAdmin ? rooms.filter(r => r.type === "direct") : [];
          const sections: Array<{ label: string; items: Room[]; canAdd?: boolean }> = [
            { label: "KÊNH CHAT", items: channelRooms, canAdd: isAdmin },
            ...(dmRooms.length > 0 ? [{ label: "TIN NHẮN RIÊNG", items: dmRooms }] : []),
          ];
          return sections.map(({ label, items, canAdd }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              {/* Category label */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 4px 8px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", letterSpacing: "0.04em" }}>{label}</span>
                {canAdd && (
                  <button onClick={() => setNewRoom(true)} title="Thêm kênh"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#4f46e5")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#6366f1")}
                  >
                    <Plus size={14} style={{ color: "#6366f1" }} />
                  </button>
                )}
              </div>

              {/* New room input */}
              {canAdd && newRoom && (
                <div style={{ margin: "2px 8px 6px", display: "flex", gap: 4 }}>
                  <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === "Enter") handleCreateRoom(); if (e.key === "Escape") { setNewRoom(false); setNewRoomName(""); } }}
                    placeholder="tên-kênh..."
                    style={{ flex: 1, fontSize: 11, background: "#fff", border: "1px solid #e0e7ff", borderRadius: 4, padding: "5px 8px", outline: "none", fontFamily: "inherit", color: "#0c1a2e" }}
                  />
                  <button onClick={handleCreateRoom} style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>
                    <Check size={11} style={{ color: "#fff" }} />
                  </button>
                </div>
              )}

              {/* Room items */}
              {items.map(room => {
                const isActive = activeRoom?.id === room.id;
                const isDM = room.type === "direct";
                const Icon = room.type === "announce" ? Megaphone : isDM ? MessageCircle : Hash;
                const unread = unreadCounts[room.id] ?? 0;
                const canDelete = isAdmin && room.id !== "room_general" && room.id !== "room_announce";
                return (
                  <div key={room.id}
                    onClick={() => selectRoom(room)}
                    style={{
                      margin: "1px 8px", padding: isMobile ? "10px 10px" : "6px 8px",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      borderRadius: 6,
                      background: isActive ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))" : "transparent",
                      borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
                      transition: "background 0.1s, border-color 0.1s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))" : "transparent"; }}
                  >
                    {isMobile
                      ? <div style={{ width: 38, height: 38, borderRadius: "50%", background: isDM ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {room.icon ? <span style={{ fontSize: 18 }}>{room.icon}</span> : <Icon size={17} style={{ color: isDM ? "#fff" : "#6366f1" }} />}
                        </div>
                      : <>
                          {room.icon
                            ? <span style={{ fontSize: 14, flexShrink: 0 }}>{room.icon}</span>
                            : <Icon size={16} style={{ color: isActive ? "#6366f1" : "#94a3b8", flexShrink: 0 }} />
                          }
                        </>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: isActive ? "#0c1a2e" : "#64748b", fontWeight: isActive || unread > 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.1s" }}>
                        {room.name}
                      </p>
                    </div>
                    {unread > 0 && (
                      <div style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", flexShrink: 0 }}>
                        <span style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>{unread > 99 ? "99+" : unread}</span>
                      </div>
                    )}
                    {canDelete && (
                      <button onClick={e => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                        title="Xóa kênh"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 3, flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <X size={12} style={{ color: "#ef4444" }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>

      {/* Self user bar */}
      {!isMobile && currentUser && (
        <div style={{
          height: 52, borderTop: "1px solid rgba(186,230,253,0.45)",
          display: "flex", alignItems: "center", padding: "0 8px", gap: 8, flexShrink: 0,
          background: "rgba(240,244,255,0.85)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        }}>
          <Avatar src={null} name={currentUser.name} size={32} status="online" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#0c1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</p>
            <p style={{ fontSize: 10, color: "#64748b" }}>{currentUser.role === "admin" ? "Admin" : currentUser.role === "manager" ? "Quản Lý" : "Nhân viên"}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Circle size={7} style={{ color: "#23a55a", fill: "#23a55a" }} />
            <span style={{ fontSize: 9, color: "#64748b" }}>{onlineMembers.length}</span>
          </div>
        </div>
      )}
    </div>
  );

  const chatMainEl = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", background: "rgba(250,251,255,0.92)" }}>
      {/* Header */}
      <div style={{
        height: 48, padding: "0 16px 0 12px", borderBottom: `1px solid ${cardBorder}`,
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        background: cardBg,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 1px 0 rgba(99,102,241,0.06)",
      }}>
        {isMobile ? (
          <button onClick={() => setMobileView("rooms")} style={{ ...iconBtn, background: "transparent", border: "none", flexShrink: 0 }}>
            <ChevronLeft size={16} style={{ color: "#64748b" }} />
          </button>
        ) : (
          <button onClick={() => setSidebarOpen(v => !v)} style={{ ...iconBtn, background: "transparent", border: "none", flexShrink: 0 }}>
            <ChevronLeft size={15} style={{ color: "#64748b", transition: "transform 0.18s", transform: sidebarOpen ? "rotate(0deg)" : "rotate(180deg)" }} />
          </button>
        )}

        {activeRoom ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              {activeRoom.icon
                ? <span style={{ fontSize: 18 }}>{activeRoom.icon}</span>
                : activeRoom.type === "announce"
                  ? <Megaphone size={16} style={{ color: "#6366f1" }} />
                  : activeRoom.type === "direct"
                    ? <MessageCircle size={16} style={{ color: "#6366f1" }} />
                    : <Hash size={16} style={{ color: "#6366f1" }} />
              }
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0c1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeRoom.name}</p>
              {activeRoom.type === "announce" && (
                <span style={{ fontSize: 9, color: "#fff", background: "#f59e0b", padding: "1px 7px", borderRadius: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>THÔNG BÁO</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <button onClick={() => { setShowSearch(v => !v); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                title="Tìm kiếm (Ctrl+F)"
                style={{ ...iconBtn, background: showSearch ? "#eef0fd" : "transparent", border: showSearch ? "1px solid #c7d2fe" : "1px solid transparent", width: 32, height: 32 }}>
                <Search size={14} style={{ color: showSearch ? "#6366f1" : "#64748b" }} />
              </button>
              <button onClick={openInfoPanel}
                title="Thành viên & cài đặt"
                style={{ ...iconBtn, background: showInfoPanel ? "#eef0fd" : "transparent", border: showInfoPanel ? "1px solid #c7d2fe" : "1px solid transparent", width: 32, height: 32 }}>
                <Users size={14} style={{ color: showInfoPanel ? "#6366f1" : "#64748b" }} />
              </button>
              <div style={{ width: 1, height: 20, background: "#e0e7ff", margin: "0 2px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Circle size={7} style={{ color: "#23a55a", fill: "#23a55a" }} />
                <span style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }}>{onlineMembers.length} online</span>
              </div>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>Chọn kênh để bắt đầu</p>
        )}
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 44, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden", borderBottom: "1px solid #e0e7ff", background: "#f8f9ff", flexShrink: 0 }}
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
              {searchLoading && <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #6366f1", borderTopColor: "transparent", animation: "spin 0.6s linear infinite", flexShrink: 0 }} />}
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
        <div style={{ borderBottom: "1px solid #e0e7ff", background: "rgba(99,102,241,0.05)", padding: "6px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Pin size={11} style={{ color: "#6366f1", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#6366f1", whiteSpace: "nowrap" }}>Tin nhắn đã ghim</span>
            <span style={{ fontSize: 9.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{latestPinned.content}</span>
          </div>
          {pinnedMessages.length > 1 && (
            <span style={{ fontSize: 9, color: "#6366f1", whiteSpace: "nowrap", background: "#eef0fd", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>+{pinnedMessages.length - 1}</span>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 4px", display: "flex", flexDirection: "column" }}>
        {searchResults !== null && searchResults.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.5 }}>
            <Search size={32} style={{ color: "#94a3b8" }} strokeWidth={1} />
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Không tìm thấy tin nhắn nào</p>
          </div>
        )}
        {displayMessages.length === 0 && searchResults === null && activeRoom && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24 }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#eef0fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activeRoom.icon ? <span style={{ fontSize: 32 }}>{activeRoom.icon}</span> : <Hash size={32} style={{ color: "#6366f1" }} strokeWidth={1.5} />}
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#0c1a2e" }}>Chào mừng đến #{activeRoom.name}!</p>
            <p style={{ fontSize: 13, color: "#64748b", textAlign: "center" }}>Đây là phần đầu của kênh <strong>#{activeRoom.name}</strong>. Gửi tin nhắn để bắt đầu cuộc trò chuyện.</p>
          </div>
        )}

        {displayMessages.map((item, i) => {
          if (item.type === "date") {
            return (
              <div key={`date-${item.date}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 16px 8px" }}>
                <div style={{ flex: 1, height: 1, background: "#e0e7ff" }} />
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, whiteSpace: "nowrap", padding: "0 8px", background: "#fafbff", borderRadius: 20, border: "1px solid #e0e7ff" }}>{item.date}</span>
                <div style={{ flex: 1, height: 1, background: "#e0e7ff" }} />
              </div>
            );
          }
          const { msg, showHeader } = item;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.1 }}
            >
              <MsgBubble
                msg={msg}
                isMe={msg.userId === currentUser?.id}
                showHeader={showHeader}
                members={members}
                onDelete={handleDeleteMsg}
                onRevoke={handleRevokeMsg}
                onReply={setReplyTo}
                onReact={handleReact}
                onEdit={handleEditMsg}
                onPin={handlePin}
                canDelete={msg.userId === currentUser?.id || isAdmin}
                replyTo={msg.replyToId ? (msgMap.get(msg.replyToId) ?? null) : null}
                roomColor={activeRoom?.color}
                searchQuery={searchResults !== null ? searchQuery : undefined}
                isPinned={pinnedSet.has(msg.id)}
                onOpenLightbox={url => setLightboxSrc(url)}
                readBy={readReceiptsByMsg.get(msg.id)}
              />
            </motion.div>
          );
        })}

        {typingUsers.length > 0 && <div style={{ paddingLeft: 16 }}><TypingDots name={typingUsers[0]} /></div>}
        <div ref={bottomRef} />
      </div>

      {/* Edit message bar */}
      {editingMsg && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid #e0e7ff", background: "#f0f4ff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Pencil size={11} style={{ color: "#6366f1" }} />
            <span style={{ fontSize: 10, color: "#6366f1", fontWeight: 600 }}>Đang chỉnh sửa tin nhắn</span>
            <span style={{ fontSize: 9.5, color: "#64748b", marginLeft: 4 }}>· ESC để hủy · Enter để lưu</span>
            <button onClick={() => { setEditingMsg(null); setEditContent(""); }} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}>
              <X size={13} style={{ color: "#64748b" }} />
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
              style={{ flex: 1, fontSize: 13, color: "#0c1a2e", fontFamily: "inherit", background: "#fff", border: "1px solid #e0e7ff", borderRadius: 8, padding: "8px 12px", outline: "none", resize: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" }}
              onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 100) + "px"; }}
            />
            <button onClick={handleSaveEdit} style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Check size={14} style={{ color: "#fff" }} />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
        {isReadOnly ? (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", gap: 10 }}>
            <Megaphone size={14} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: 12, color: "#92400e" }}>Kênh thông báo — chỉ Admin/Quản Lý có thể đăng tin</span>
          </div>
        ) : (
          <div style={{
            background: cardBg,
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            borderRadius: 12, overflow: "hidden",
            border: `1px solid ${cardBorder}`,
            boxShadow: "0 2px 12px rgba(12,26,46,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}>
            {replyTo && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0f4ff", borderBottom: "1px solid #e0e7ff" }}>
                <Reply size={11} style={{ color: "#6366f1", flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1" }}>Trả lời</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#0c1a2e" }}>{replyTo.userName}</span>
                <span style={{ fontSize: 10, color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {replyTo.mediaType === "image" ? "📷 Ảnh" : replyTo.mediaType === "file" ? "📎 File" : replyTo.content}
                </span>
                <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={13} style={{ color: "#64748b" }} />
                </button>
              </div>
            )}
            {pendingFile && (
              <div style={{ padding: "6px 12px 0" }}>
                <UploadPreview file={pendingFile} onCancel={() => setPendingFile(null)} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", padding: "4px 8px 4px 12px", gap: 4 }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={!activeRoom} title="Đính kèm"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", flexShrink: 0, borderRadius: 6 }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <Paperclip size={18} style={{ color: "#94a3b8" }} />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={activeRoom ? `Nhắn vào #${activeRoom.name}` : "Chọn kênh..."}
                disabled={!activeRoom}
                rows={1}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#0c1a2e", fontFamily: "inherit", resize: "none", lineHeight: 1.5, maxHeight: 140, overflowY: "auto", padding: "8px 4px" }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; }}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !pendingFile) || sending || uploading || !activeRoom}
                title="Gửi (Enter)"
                style={{ width: 34, height: 34, borderRadius: 7, border: "none", flexShrink: 0, marginBottom: 2, background: (input.trim() || pendingFile) && activeRoom ? "linear-gradient(135deg,#6366f1,#818cf8)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: (input.trim() || pendingFile) && activeRoom ? "pointer" : "default", transition: "background 0.1s" }}
              >
                {uploading
                  ? <div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
                  : <Send size={15} style={{ color: (input.trim() || pendingFile) && activeRoom ? "#fff" : "#94a3b8" }} />
                }
              </button>
            </div>
          </div>
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
              background: "#fff", borderLeft: "1px solid #e0e7ff", zIndex: 30,
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Panel header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e0e7ff", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0c1a2e" }}>Thông Tin Nhóm</p>
              </div>
              <button onClick={() => setShowInfoPanel(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={14} style={{ color: "#94a3b8" }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Room avatar + name */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 14px", borderBottom: "1px solid #e0e7ff" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: activeRoom.color ? activeRoom.color + "22" : "#eef0fd", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, border: "2px solid #e0e7ff" }}>
                  {activeRoom.icon
                    ? <span style={{ fontSize: 28 }}>{activeRoom.icon}</span>
                    : activeRoom.type === "announce"
                      ? <Megaphone size={26} style={{ color: "#C9A55A" }} />
                      : <Hash size={26} style={{ color: "#6366f1" }} />
                  }
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#0c1a2e" }}>{activeRoom.name}</p>
                <p style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 2 }}>{members.length} thành viên · {onlineMembers.length} online</p>
              </div>

              {/* Room settings (admin only) */}
              {isAdmin && (
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #e0e7ff", background: "#f0f4ff" }}>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: "#6366f1", letterSpacing: "0.12em", marginBottom: 10 }}>CÀI ĐẶT KÊNH</p>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 9, color: "#94a3b8", marginBottom: 4 }}>Tên kênh</p>
                    <input value={roomSettingsName} onChange={e => setRoomSettingsName(e.target.value)}
                      style={{ width: "100%", fontSize: 11, color: "#0c1a2e", fontFamily: "inherit", background: "#fff", border: "1px solid #e0e7ff", borderRadius: 7, padding: "6px 10px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 9, color: "#94a3b8", marginBottom: 4 }}>Icon (emoji)</p>
                    <input value={roomSettingsIcon} onChange={e => setRoomSettingsIcon(e.target.value)} maxLength={4}
                      placeholder="💬" style={{ width: "100%", fontSize: 16, fontFamily: "inherit", background: "#fff", border: "1px solid #e0e7ff", borderRadius: 7, padding: "6px 10px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 9, color: "#94a3b8", marginBottom: 6 }}>Màu nền (tin nhắn admin)</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#0c1a2e"].map(c => (
                        <button key={c || "none"} onClick={() => setRoomSettingsColor(c)}
                          style={{ width: 24, height: 24, borderRadius: "50%", border: roomSettingsColor === c ? "2.5px solid #6366f1" : "1.5px solid #e0e7ff", background: c || "#f1f5f9", cursor: "pointer", flexShrink: 0 }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSaveRoomSettings}
                    style={{ width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#818cf8)", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                    Lưu thay đổi
                  </button>
                  <button onClick={handleClearRoom}
                    style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 8, border: "1px solid #fca5a5", background: "rgba(239,68,68,0.06)", fontSize: 11, color: "#dc2626", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Trash2 size={12} /> Xóa tất cả tin nhắn
                  </button>
                </div>
              )}

              {/* Members */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #e0e7ff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Users size={12} style={{ color: "#94a3b8" }} />
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: "#6366f1", letterSpacing: "0.12em" }}>THÀNH VIÊN · {members.length}</p>
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
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #e0e7ff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <ImageIcon size={12} style={{ color: "#94a3b8" }} />
                    <p style={{ fontSize: 8.5, fontWeight: 700, color: "#6366f1", letterSpacing: "0.12em" }}>ẢNH · {infoPanelMedia.length}</p>
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
                    <Pin size={12} style={{ color: "#6366f1" }} />
                    <p style={{ fontSize: 8.5, fontWeight: 700, color: "#6366f1", letterSpacing: "0.12em" }}>ĐÃ GHIM · {pinnedMessages.length}</p>
                  </div>
                  {pinnedMessages.map(m => (
                    <div key={m.id} style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)", marginBottom: 6 }}>
                      <p style={{ fontSize: 9.5, fontWeight: 600, color: "#6366f1", marginBottom: 2 }}>{m.userName}</p>
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
        @keyframes toastIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-8px); } }
      `}</style>

      {/* Image Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Toast notifications */}
      <div style={{ position: "fixed", bottom: 80, right: 16, zIndex: 500, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", pointerEvents: "none" }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              style={{
                background: "rgba(255,255,255,0.94)",
                backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                border: `1px solid ${cardBorder}`, borderRadius: 14,
                padding: "10px 14px", maxWidth: 260,
                boxShadow: "0 8px 32px rgba(12,26,46,0.14), inset 0 1px 0 rgba(255,255,255,0.8)",
                pointerEvents: "auto",
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", marginBottom: 2 }}>#{t.roomName}</p>
              <p style={{ fontSize: 11, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.msgPreview}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <input ref={fileInputRef} type="file" style={{ display: "none" }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={handleFileSelect}
      />

      <div style={{
        display: "flex", flex: 1, minHeight: 0, height: "100%",
        borderRadius: 14, overflow: "hidden",
        border: `1px solid ${cardBorder}`,
        boxShadow: "0 4px 28px rgba(12,26,46,0.10), 0 1px 6px rgba(12,26,46,0.05), inset 0 1px 0 rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
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
