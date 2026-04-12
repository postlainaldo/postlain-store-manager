# CLAUDE.md — Bộ Não Dự Án Postlain Store Manager

> Đọc file này trước khi làm bất cứ điều gì. Đây là nguồn sự thật duy nhất.

---

## Bản chất dự án

Next.js 15 App Router PWA — hệ thống quản lý nội bộ cho **ALDO GO! ĐÀ LẠT** (cửa hàng thời trang POSTLAIN, Đà Lạt). Deploy trên **Coolify** (self-hosted). Mọi UI text là tiếng Việt. Nhân viên dùng hàng ngày trên mobile.

**Domain production:** `store.postlain.com`  
**Branch deploy:** `main` — push là Coolify tự build và deploy.

---

## Stack kỹ thuật

| Layer | Công nghệ |
|---|---|
| Framework | Next.js 15.1.0 App Router (TypeScript) |
| UI | Tailwind CSS (không dùng component library) |
| State | Zustand 5 với `persist` middleware |
| DB prod | Supabase PostgreSQL |
| DB dev | SQLite (`better-sqlite3`) |
| Auth | Custom PIN — không có NextAuth |
| Excel | ExcelJS 4 — **KHÔNG dùng xlsx** (xlsx bỏ qua styles) |
| AI | Gemini API `gemini-2.0-flash` |
| PWA | `@ducanh2912/next-pwa` + custom SW tại `src/sw/index.ts` |
| Motion | Framer Motion 11 |

---

## Cấu trúc thư mục quan trọng

```
src/
  app/                    — Pages (App Router)
    api/                  — API routes
    inventory/            — RSC split: page.tsx (server) + InventoryClient.tsx (client)
    schedule/             — Lịch làm việc + chat widget
    profile/              — Hồ sơ + KPI
    login/                — Đăng nhập PIN
    store-select/         — Chọn store (multi-tenant)
  components/             — Shared components
  lib/                    — Helpers: supabase.ts, database.ts, dbAdapter.ts, storeContext.ts
  store/                  — Zustand: useStore.ts
  types/                  — TypeScript types
data/
  stores.json             — Config danh sách stores
  postlain.db             — SQLite (dev only)
.claude/                  — Bộ não Claude
```

---

## Zustand — Luật bất di bất dịch

```typescript
// SAI — gây re-render toàn bộ khi bất kỳ state nào thay đổi
const { products, currentUser } = useStore();

// ĐÚNG — chỉ re-render khi selector thay đổi
const products    = useStore(sel.products);
const currentUser = useStore(sel.currentUser);
```

`sel` export từ `src/store/useStore.ts` dòng ~800. Thêm selector mới vào đó.

**Zustand persist rehydration là async.** Dùng `useEffect` để sync local state sau rehydration:
```typescript
useEffect(() => {
  if (storeTarget > 0) setLocalInput(fmt(storeTarget));
}, [storeTarget]);
```

### Các selector chính

```typescript
sel.currentStoreId / sel.setCurrentStoreId
sel.currentUser / sel.users / sel.login / sel.logout
sel.products / sel.fetchProducts / sel.addProduct / sel.updateProduct / sel.deleteProduct
sel.storeName / sel.storeAddress / sel.storePhone / sel.storeEmail / sel.setStoreSetting
sel.theme / sel.setTheme
sel.kpiStoreTarget / sel.kpiIndividualTargets / sel.setKpiStoreTarget / sel.setKpiIndividualTarget
sel.storeSections / sel.warehouseShelves / sel.fetchDbState
sel.lowStockThreshold / sel.setLowStockThreshold
```

---

## Dual-DB Pattern — Bắt buộc mọi nơi

Mọi data access phải rẽ nhánh theo `IS_SUPABASE`:

```typescript
import { IS_SUPABASE, getSupabase, getActiveStoreId } from "@/lib/supabase";
import getDb from "@/lib/database";

if (IS_SUPABASE) {
  const sb = getSupabase();
  // Query Supabase — luôn filter .eq("store_id", getActiveStoreId())
  // Cột active dùng integer: .eq("active", 1) — KHÔNG dùng true
} else {
  const db = getDb(getActiveStoreId());
  // SQLite query
}
```

Ưu tiên dùng hàm trong `src/lib/dbAdapter.ts` thay vì gọi thẳng. Hàm dbAdapter tự xử lý rẽ nhánh.

**Quan trọng về Supabase:**
- Cột `active` là **integer** (0/1), không phải boolean → `.eq("active", 1)` không phải `.eq("active", true)`
- Tên cột là **camelCase**: `startTime`, `endTime`, `slotId`, `fullName`, `employeeCode`, `store_id`

---

## Multi-Tenant Architecture

**Single store hiện tại:** `postlain` (ALDO GO! ĐÀ LẠT)

```
Flow: / → store-select → /login?store=postlain → dashboard
```

**Tuy nhiên** — `currentStoreId` mặc định là `"postlain"` trong Zustand, nên người dùng không thấy store-select nữa.

```typescript
// src/lib/storeContext.ts — getStoreId() priority:
// 1. STORE_ID env var (Coolify single-tenant)
// 2. x-store-id header (set bởi middleware từ cookie)
// 3. "postlain" fallback
```

**Mọi API route handler phải bắt đầu bằng:**
```typescript
setActiveStore(getStoreId(req));
```

**Thêm store mới:** chỉ cần thêm entry vào `data/stores.json`. SQLite tự tạo DB mới. Supabase dùng `store_id` filter.

---

## Roles

```
admin      → toàn quyền (user mgmt, settings, reports)
manager    → gần như toàn quyền (không quản lý admin)
staff_ft   → full-time (đăng ký ca, chat)
staff_pt   → part-time (đăng ký ca, chat)
staff      → legacy, xử lý như staff_ft
```

**Authorization trong API:**
```typescript
const userId = req.headers.get("x-user-id");
const role = await dbGetUserRole(userId);
if (!["admin", "manager"].includes(role)) return 403;
```

---

## Pages — Tóm tắt nhanh

| Route | Loại | Ghi chú |
|---|---|---|
| `/` | Client | Dashboard + POS hybrid |
| `/inventory` | Server→Client | RSC header + InventoryClient |
| `/schedule` | Client | Lịch làm việc + chat widget lớn |
| `/profile` | Client | Hồ sơ, KPI, cài đặt |
| `/report` | Client | Báo cáo doanh số |
| `/sales` | Client | Quản lý đơn hàng |
| `/settings` | Client | Cài đặt cửa hàng |
| `/chat` | Client | Chat nội bộ (Zalo-style) |
| `/visual-board` | Client | Bản đồ trưng bày 2D |
| `/collections` | Client | Bộ sưu tập sản phẩm |

### Inventory — RSC Split
- `page.tsx` = Server Component, fetch stats từ DB
- `InventoryClient.tsx` = `"use client"`, xử lý filter/sort
- Filter qua **URL Search Params**: `q`, `cat`, `color`, `size`, `stock`, `loc`, `sort`, `dir`
- `router.replace(url, { scroll: false })` để không scroll khi filter
- `<ListView>` bọc trong `<Suspense fallback={null}>` vì `useSearchParams()`

---

## Schedule — Logic quan trọng

- `regClosed` = boolean trong settings → admin toggle thủ công
- Không có time-window restriction, không có role restriction
- `canUserRegister(slot)`: chỉ check `regClosed`
- Shift flow: Staff đăng ký → `status: "pending"` → Admin duyệt → `status: "approved"`
- Admin có thể edit note/status của BẤT KỲ request nào (không chỉ pending)

**Polling anti-leak pattern:**
```typescript
const openRef = useRef(open);
useEffect(() => { openRef.current = open; }, [open]);
const fetchMsgs = useCallback(async () => {
  if (!openRef.current) return;
}, []); // stable deps → không recreate interval
```

---

## Excel Export (`/api/shifts/export`)

- Dùng **ExcelJS** — không bao giờ dùng xlsx cho styled output
- 5 cột cố định: STT | HỌ TÊN | VT | MÃ NV | SỐ ĐT → rồi cột ngày
- FT staff (blue bg) trước, PT staff (orange bg) sau
- Shift codes: A/B/C = FT (green cells), A1–B3 = PT (orange cells)
- Cột hôm nay highlight xanh dương
- Freeze panes: `xSplit=5, ySplit=3`
- Bảng chú thích ở cuối
- Export: `Buffer.from(await wb.xlsx.writeBuffer())` — không dùng `buf as Buffer`
- **Tất cả active users xuất hiện** (kể cả admin/manager) — pos label: SL/FT/PT/SA
- Dùng `fullName` nếu có, fallback về `name`

---

## AI Chat (`/api/ai-chat`)

- Model: `gemini-2.0-flash` (không dùng `gemini-2.0-flash-lite` — deprecated)
- Fetch live context từ Supabase: doanh thu, hàng sắp hết, ca hôm nay
- Cần env var: `GEMINI_API_KEY`

---

## Profile — Thông tin bắt buộc

User phải điền đủ 4 trường trước khi dùng app:
1. **Họ và tên** (`fullName`)
2. **Số điện thoại** (`phone`) — format: `0xxxxxxxxx` hoặc `+84xxxxxxxxx`
3. **Email** (`email`) — format: `x@x.x`
4. **Mã nhân viên** (`employeeCode`)

Validation ở `handleSave()` trong `src/app/profile/page.tsx`. Modal `showProfileRequired` hiển thị khi thiếu. Không đóng được nếu chưa điền đủ.

---

## Git & Deploy

```bash
# Sau mỗi task — LUÔN LUÔN
git add [files]
git commit -m "fix/feat/chore: mô tả rõ ràng"
git push  # → Coolify tự deploy
```

- Branch: `main`
- Git user: `POSTLAIN`
- **Không** `--no-verify`, **không** force-push main
- Commit message: tiếng Việt hoặc tiếng Anh đều được, miễn là mô tả rõ

---

## Các lỗi hay gặp — Tra cứu nhanh

| Triệu chứng | Nguyên nhân | Fix |
|---|---|---|
| Excel không có style | Dùng xlsx | Đổi sang exceljs |
| `.eq("active", true)` lỗi Supabase | `active` là integer | Dùng `.eq("active", 1)` |
| Modal không center mobile | framer-motion ghi đè transform | Dùng wrapper div flex center |
| Notification unread sai | useState init khi currentUser=null | Dùng useEffect để sync sau rehydration |
| Store-select vẫn hiện | localStorage cũ / DEFAULT_STORES | currentStoreId default "postlain" |
| Build OOM | Node heap limit | `NODE_OPTIONS=--max-old-space-size=512` |
| useSearchParams() crash | Thiếu Suspense | Bọc component trong `<Suspense>` |
| Staff thiếu trong Excel | Filter admin/manager | Include tất cả, chỉ filter theo staff_pt |
