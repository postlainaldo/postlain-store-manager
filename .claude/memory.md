# memory.md — Bộ nhớ cá nhân của Claude

> Ghi lại những quyết định, bài học, và context không có trong code. Cập nhật sau mỗi session quan trọng.

---

## Người dùng

- Owner/dev duy nhất của dự án
- Không rành về sự khác biệt giữa các framework (ví dụ: hỏi "move Next.js sang WordPress")
- Thích giải thích ngắn gọn, trực tiếp — không cần lý thuyết dài
- Làm việc chủ yếu trên Windows 10, dùng Chrome DevTools để debug mobile
- Ngôn ngữ: hỏi tiếng Việt, nhận trả lời tiếng Việt
- Quan tâm đến UX mobile (nhân viên dùng iPhone)

---

## Quyết định kiến trúc đã chốt

### Store selection
- **Roy Villa (royvilla) đã bị xóa vĩnh viễn** — không thêm lại
- `currentStoreId` mặc định `"postlain"` trong Zustand → không cần màn store-select
- `DEFAULT_STORES` trong `src/app/api/stores/route.ts` chỉ còn `postlain`
- `readStores()` filter `royvilla` khỏi `STORES_JSON` env var phòng Coolify cũ
- Commit: `18126a5`

### Supabase `active` column
- Là **integer** (0/1), không phải boolean
- Luôn dùng `.eq("active", 1)` — KHÔNG `.eq("active", true)`
- Lỗi gặp: `invalid input syntax for type integer: "true"` — commit `ff10526`

### Excel export
- Include **tất cả** active users kể cả admin/manager
- Pos label: admin/manager → `SL`, staff_ft/staff → `FT`, staff_pt → `PT`
- Dùng `fullName` nếu có, fallback `name`
- Commit: `e60953a`

### Modal login center
- framer-motion ghi đè `transform: translate(-50%, -50%)`
- Fix: wrapper `div` fixed full-screen flex center, modal animate `scale`+`y` only
- Commit: `0884bbc`

### Profile bắt buộc
- 4 trường bắt buộc: `fullName`, `phone`, `email`, `employeeCode`
- Validation: SĐT format `0xxxxxxxxx`, email format `x@x.x`
- Modal hiển thị checklist đỏ/xanh per field
- Cột `email` trong users cần thêm thủ công vào Supabase:
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';`
- Commit: `b95a03f`

---

## Patterns đã dùng và hoạt động tốt

### Notification dismissed — localStorage sync sau rehydration
```typescript
const [dismissed, setDismissed] = useState<Set<string>>(() => {
  if (typeof window === "undefined" || !currentUser) return new Set();
  try {
    const key = `notif_dismissed_${currentUser.id}`;
    const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (Array.isArray(saved)) return new Set(saved);
  } catch {}
  return new Set();
});
```

### Chat readCounts persistence per user
```typescript
const chatReadKey = currentUser ? `chat_read_${currentUser.id}` : null;
useEffect(() => {
  if (!chatReadKey) return;
  const saved = JSON.parse(localStorage.getItem(chatReadKey) ?? "{}");
  if (saved && typeof saved === "object") setReadCounts(saved);
}, [chatReadKey]);
useEffect(() => {
  if (!chatReadKey) return;
  localStorage.setItem(chatReadKey, JSON.stringify(readCounts));
}, [readCounts, chatReadKey]);
```

### AuthGuard auto-select single store
```typescript
if (!isPublic && !currentStoreId) {
  fetch("/api/stores").then(r => r.json()).then((stores) => {
    if (stores.length === 1) {
      useStore.getState().setCurrentStoreId(stores[0].id);
    } else {
      router.replace("/store-select");
    }
  });
}
```

---

## Vấn đề chưa giải quyết

- [ ] **Schedule page crash trên mobile** — error boundary đã thêm (`src/app/schedule/error.tsx`) nhưng chưa reproduce được lỗi cụ thể
- [ ] **Cột `email` trong Supabase** — cần chạy SQL thủ công: `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';`

---

## Lịch sử revert

- **2026-04-07**: Full revert về 2 ngày trước do mobile crash + code không đồng bộ
- Commit revert đến: khoảng `d68658d`
- Sau revert: Roy Villa quay lại, các fix bị mất → phải làm lại
- AuthGuard fix: `0dc8d4d`
- Batch re-fix: `18126a5`

---

## Coolify specifics

- Coolify inject env vars khi build và runtime
- Thay đổi env var trong Coolify UI không apply cho container đang chạy → cần redeploy
- `STORES_JSON` env var cũ có Roy Villa → code filter `royvilla` khỏi parsed result
- Build command: `NODE_OPTIONS=--max-old-space-size=512 next build`
- RAM server: 8GB, thực tế available ~5GB + 4GB swap → không vấn đề
- Disk: ~80% đầy, có thể giải phóng ~40GB bằng `docker image prune -a -f && docker builder prune -a -f`
