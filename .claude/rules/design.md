# rules/design.md — Quy tắc thiết kế UI

> Mọi UI mới phải follow các rule này. Đây là design system của dự án.

---

## Nguyên tắc chung

- **Ngôn ngữ:** Tiếng Việt toàn bộ — labels, messages, placeholders, error text
- **Target device:** Mobile-first (nhân viên dùng iPhone)
- **Không dùng** Tailwind `className` cho inline styles — dự án dùng `style={}` objects hoàn toàn
- **Không dùng** component library ngoài — tự build từ HTML elements + framer-motion

---

## Màu sắc thương hiệu

```
Navy (primary bg):    #0c1a2e
Navy mid (header):    #1e3a5f
Gold (accent):        #c9a55a
White:                #ffffff
Gray text:            #94a3b8

FT staff blue bg:     #eff6ff
FT staff group:       #bfdbfe
PT staff orange bg:   #fff7ed
PT staff group:       #fde68a

Success green:        #10b981
Warning amber:        #f59e0b
Error red:            #dc2626
Info blue:            #0ea5e9
```

---

## Theming

Dự án có light/dark mode qua `useTheme()` hook. Dùng CSS variables:
```
var(--bg-base)        — background chính
var(--bg-card)        — card background
var(--text-primary)   — text chính
var(--text-muted)     — text phụ
var(--border)         — border
var(--border-subtle)  — border nhạt
```

Để lấy theme colors trong component:
```typescript
import { useTheme } from "@/hooks/useTheme";
const t = useTheme();
// t.cardBg, t.cardBorder, t.cardShadowLg, t.rowHover, t.iconBtnBg, t.isLight
```

---

## Typography

- Font chính: `Calibri` (Excel), system-ui (web)
- Montserrat: heading lớn (`var(--font-montserrat)`)
- Font size scale: 8px, 9px, 10px, 11px, 12px, 13px, 14px, 16px, 18px, 21px, 28px
- Letter spacing: headings dùng `0.06em`, labels dùng `0.04em`

---

## Spacing & Layout

- Border radius: 8px (button nhỏ), 12px (input), 16px (card), 20px (modal), 24px (large card)
- Padding: 4px 8px (chip), 8px 16px (button), 12px 20px (card section), 20px 24px (card)
- Gap: 4px, 6px, 8px, 10px, 12px, 14px, 16px

---

## Components patterns

### Card
```typescript
style={{
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  boxShadow: t.cardShadowLg,
  overflow: "hidden",
}}
```

### Button primary (gold)
```typescript
style={{
  padding: "8px 20px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #C9A55A 0%, #d4a84b 60%, #b8913e 100%)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 3px 12px rgba(201,165,90,0.4)",
}}
```

### Button danger (red)
```typescript
style={{
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  color: "#fff",
}}
```

### Input
```typescript
className="input-glow"
style={{ flex: 1, padding: "7px 11px", fontSize: 16 }}
```
Font size 16px trên mobile để tránh iOS auto-zoom.

### Modal — PHẢI dùng wrapper pattern
```typescript
// SAI — framer-motion ghi đè transform: translate(-50%, -50%)
<motion.div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>

// ĐÚNG — wrapper div flex center
<div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 301, pointerEvents: "none", padding: "0 24px" }}>
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 16 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.97, y: 8 }}
    style={{ pointerEvents: "auto", width: "100%", maxWidth: 380 }}
  >
    {/* content */}
  </motion.div>
</div>
```

### Overlay
```typescript
<motion.div
  key="overlay"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={() => setOpen(false)}
  style={{
    position: "fixed", inset: 0, zIndex: 300,
    background: "rgba(0,0,0,0.60)",
    backdropFilter: "blur(6px)",
  }}
/>
```

---

## Animation

Dùng framer-motion. Các preset hay dùng:
```typescript
// Card enter
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}

// Modal
initial={{ opacity: 0, scale: 0.95, y: 16 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.97, y: 8 }}
transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}

// Button tap
whileTap={{ scale: 0.96 }}
whileHover={{ scale: 1.02 }}
```

Khi user tắt animation (setting `uiAnimations: false`), check trước khi dùng.

---

## Mobile UX rules

- Touch target tối thiểu: 44x44px
- Font size input: **16px** (tránh iOS zoom)
- Scrollable containers: `overflowY: "auto"`, tránh `overflow: hidden` trên scroll area
- Bottom nav trên mobile: fixed bottom, height 56px + safe area
- `minHeight: "100dvh"` thay vì `100vh` (tránh iOS address bar issue)
- Tap highlight: `WebkitTapHighlightColor: "transparent"`

---

## Error & empty states

```typescript
// Empty state
<div style={{ padding: "32px", textAlign: "center" }}>
  <Icon size={32} style={{ color: "#94a3b8", margin: "0 auto 12px" }} />
  <p style={{ fontSize: 13, color: "#64748b" }}>Không có dữ liệu</p>
</div>

// Error inline
<p style={{ fontSize: 9, color: "#dc2626", marginTop: 3, fontWeight: 600 }}>
  {errorMessage}
</p>

// Success feedback
setSaved(true);
setTimeout(() => setSaved(false), 1400);
```

---

## Icons

Dùng `lucide-react`. Import đúng tên:
```typescript
import { User, Phone, Mail, Hash, Check, X, ChevronDown, ... } from "lucide-react";
```

Size thường dùng: 9, 10, 11, 12, 13, 14, 16, 18, 22, 24px
