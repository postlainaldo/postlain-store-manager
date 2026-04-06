# CLAUDE.md — Postlain Store Manager

Quick-start brain dump for Claude Code. Read this before touching anything.

---

## What This Is

Next.js 14 App Router PWA — internal store management system for **POSTLAIN** (clothing store, Đà Lạt, Vietnam).
Deployed on **Coolify** (self-hosted). All UI text is Vietnamese.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| UI | Tailwind CSS (no component library) |
| State | Zustand with `persist` middleware |
| DB (prod) | Supabase PostgreSQL |
| DB (dev) | SQLite via `better-sqlite3` |
| Auth | Custom PIN-based (no NextAuth) |
| Excel export | `exceljs` (NOT xlsx — xlsx ignores styles) |
| AI chat | Gemini API (`gemini-2.0-flash`) |
| PWA | `@ducanh2912/next-pwa` with custom SW at `src/sw/index.ts` |

---

## Zustand Selectors — Always Use `sel`

```typescript
// WRONG — causes re-render on any store change
const { products, currentUser } = useStore();

// CORRECT — granular subscription
const products    = useStore(sel.products);
const currentUser = useStore(sel.currentUser);
```

`sel` object is exported from `src/store/useStore.ts` line ~770. Add new selectors there if needed.

**Zustand persist rehydration is async.** For fields that need to be in sync with persisted state (like KPI targets), use `useEffect` to sync local state after rehydration:

```typescript
useEffect(() => {
  if (storeTarget > 0) setLocalInput(fmt(storeTarget));
}, [storeTarget]);
```

---

## Roles

```
admin       → full access
manager     → almost full
staff_ft    → full-time staff
staff_pt    → part-time staff
staff       → legacy (treat as staff_ft)
```

---

## Pages

| Route | Type | Notes |
|---|---|---|
| `/` | Client | Dashboard / POS hybrid |
| `/inventory` | Server → Client | `page.tsx` is RSC, `InventoryClient.tsx` is `"use client"` |
| `/schedule` | Client | Shift scheduling + chat widget |
| `/profile` | Client | KPI targets, user profile |
| `/report` | Client | Sales reports |
| `/sales` | Client | Sales/orders view |
| `/settings` | Client | Store settings |
| `/chat` | Client | Staff chat |
| `/visual-board` | Client | Store layout visual |
| `/collections` | Client | Product collections |

---

## DB Types — source of truth (`src/lib/dbAdapter.ts`)

### DBUser
```typescript
{ id, name, username, passwordHash, role, active: number,
  createdAt, avatar?, status?, bio?, phone?, fullName?,
  employeeCode?, email? }
```
- `username` = login name (readonly after create)
- `email` = separate field for admin contact info (NOT same as username)
- `employeeCode` = mã nhân viên (HR code)
- `active`: 1 = active, 0 = disabled

### DBProduct
```typescript
{ id, name, sku?, category, productType?, quantity, price?,
  markdownPrice?, color?, size?, imagePath?, notes?,
  createdAt, updatedAt }
```

### DBShiftSlot
```typescript
{ id, templateId, date, name, startTime, endTime,
  color, maxStaff, note?, createdAt, updatedAt, staffType? }
```

### DBShiftRegistration
```typescript
{ id, slotId, userId, userName, status, note?, createdAt, updatedAt }
// status: "pending" | "approved" | "rejected"
```

### DBShiftRequest (admin-managed)
```typescript
{ id, slotId, userId, userName, status, note?, createdAt, updatedAt }
```

### DBMessage
```typescript
{ id, roomId, userId, userName, content, createdAt,
  deletedAt?, editedAt?, mediaUrl?, mediaType?,
  replyToId?, reactions?, pinnedAt?, pinnedBy?, revokedAt? }
```

### DBMovement
```typescript
{ id, productId?, productName, variant, type,
  fromLoc?, toLoc?, qty, byUser, createdAt }
```

---

## API Routes — Key Contracts

### Auth
- `POST /api/auth` — `{ username, password }` → `{ id, name, role, ... }` or 401
- `GET /api/auth/profile?id=xxx` — get profile

### Profile
- `GET /api/profile?id=xxx` — single user
- `GET /api/profile` — all users (team view), filters `active=1`
- `PUT /api/profile` — `{ id, name, fullName, bio, phone, email, employeeCode, avatar, status }`

### Shifts
- `GET /api/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD` — slots + registrations
- `POST /api/shifts` — create slot
- `PUT /api/shifts` — update slot
- `DELETE /api/shifts?id=xxx` — delete slot
- `GET /api/shifts/register` — get registrations
- `POST /api/shifts/register` — `{ slotId, userId, userName }` → register (status: pending)
- `PUT /api/shifts/register` — `{ id, status, note }` → approve/reject
- `DELETE /api/shifts/register?id=xxx` — cancel registration
- `GET /api/shifts/export?from=&to=` — Excel file

### Stores
- `GET /api/stores` — list active stores (reads STORES_JSON env → stores.json → DEFAULT_STORES)
- Store list config: `data/stores.json`

---

## Inventory Page — RSC Split

`src/app/inventory/page.tsx` = Server Component (async, reads DB directly)
`src/app/inventory/InventoryClient.tsx` = `"use client"`, all interactive logic

Filters use **URL Search Params** (not useState):
- params: `q`, `cat`, `color`, `size`, `stock`, `loc`, `sort`, `dir`
- `router.replace(url, { scroll: false })` to update without scroll jump
- `<ListView>` wrapped in `<Suspense fallback={null}>` because `useSearchParams()` requires it

---

## Schedule Page — Key Logic

`src/app/schedule/page.tsx` — all in one client component (~2000 lines).

**Slot label format:** `{DAYS_VI[d.getDay()]} · {s.name}` — NO date number in middle.

**Polling fix pattern** — prevent interval leak:
```typescript
const openRef = useRef(open);
useEffect(() => { openRef.current = open; }, [open]);
const fetchMsgs = useCallback(async () => {
  if (!openRef.current) return; // uses ref, not state
}, []); // stable deps = no interval recreation
```

**Shift registration:**
- `regClosed` = boolean in store settings — admin toggles manually
- No time-window restriction (removed)
- No role-type restriction (removed) — any staff can register any slot
- `canUserRegister(slot)`: only checks `regClosed`

**Shift request flow:**
- Staff registers → `status: "pending"`
- Admin approves → `status: "approved"`
- Admin can edit note/status on ANY request (not just pending)

**Optimistic updates:** all register/cancel/approve/reject actions update `registrations` state directly via `setRegistrations()` — only call `load()` on error. No full reload on action.

---

## Profile Page — Key Logic

`src/app/profile/page.tsx` — single client component (~2250 lines).

**Form fields (THÔNG TIN CƠ BẢN):**
- Họ và Tên = `fullName`
- Số điện thoại = `phone`
- Email = `email` (admin contact, NOT login username)
- Mã nhân viên = `employeeCode`

**Read-only display (not editable):**
- Tên đăng nhập = `username` (login name, readonly)

**Tab Nhóm:** shows each member's `phone`, `email`, `employeeCode`.

---

## Excel Export (`/api/shifts/export`)

Uses **ExcelJS** (not xlsx). xlsx 0.18.5 free silently ignores all cell styles.

Key details:
- Query fetches `status IN ('approved', 'pending')` — approved overwrites pending in regMap
- 5 fixed columns: STT | HỌ TÊN | VT | MÃ NV | SỐ ĐT, then date columns
- Groups: FT staff (blue bg) first, PT staff (orange bg) second
- Shift codes: A/B/C = FT (green cells), A1–B3 = PT (orange cells)
- Today column highlighted blue
- Freeze panes: xSplit=5, ySplit=3
- Legend table at bottom
- Export: `Buffer.from(await wb.xlsx.writeBuffer())` — NOT `buf as Buffer` (TypeScript incompatibility)

---

## AI Chat (`/api/ai-chat`)

- Model: `gemini-2.0-flash` (NOT `gemini-2.0-flash-lite` — deprecated)
- Fetches live store context from Supabase (revenue, low stock, today's shifts)
- Requires `GEMINI_API_KEY` env var

---

## Git / Deploy Rules

- **After finishing any task, commit and push to trigger Coolify auto-deploy.**
- Branch: `main`
- Git user: POSTLAIN
- Coolify watches `main` and redeploys automatically on push.
- Use descriptive commit messages in Vietnamese or English.
- Never `--no-verify` or force-push main.

---

## Multi-Tenant Architecture

Single active store: **postlain**. Roy Villa đã bị xóa.

**User flow:**
```
/ → store-select (chọn store) → /login?store=xxx → dashboard
```

**Config stores:** `data/stores.json` — chỉ có `postlain`. Để thêm store mới: thêm entry vào đây.
**API:** `GET /api/stores` đọc theo thứ tự: `STORES_JSON` env → `data/stores.json` → DEFAULT_STORES fallback.

**storeId routing:**
- Middleware (`src/middleware.ts`) đọc cookie `plsm_store_id` → set header `x-store-id` trên mọi API request
- Mỗi API route gọi `setActiveStore(getStoreId(req))` ở đầu handler
- `getStoreId(req)` ưu tiên: `STORE_ID` env var → `x-store-id` header → `"postlain"` fallback

**SQLite:** mỗi store = file riêng `data/{storeId}.db`
**Supabase:** 1 project dùng chung, phân tách bằng cột `store_id` trong mọi bảng.

**Single-tenant Coolify deploy:** set env var `STORE_ID=postlain` → bypass multi-tenant.

---

## Dual-DB Pattern — CRITICAL

```typescript
import { getIsSupabase, getSupabase, getActiveStoreId } from "@/lib/supabase";
import getDb from "@/lib/database";

if (getIsSupabase()) {
  const sb = getSupabase();
  // Supabase — filter .eq("store_id", getActiveStoreId())
} else {
  const db = getDb(getActiveStoreId());
  // SQLite
}
```

- `getIsSupabase()` = function (NOT constant) — returns true when Supabase env vars set
- `IS_SUPABASE` also exported as constant for backward compat
- All DB functions in `src/lib/dbAdapter.ts` — use `getStoreDb()` helper inside adapter
- `dbAdapter.ts` imports: `import { getIsSupabase as IS_SUPABASE, ... }` then calls `IS_SUPABASE()` as function
- Native modules (`better-sqlite3`, `exceljs`) must stay in `serverExternalPackages` in `next.config.mjs`

---

## Login Page — Portal Pattern

`src/app/login/page.tsx` — `perspective: 900` on container creates stacking context.
Footer modals use `createPortal(content, document.body)` to escape it.
Pattern:
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);

{mounted && createPortal(
  <AnimatePresence>
    {active && <>...</>}
  </AnimatePresence>,
  document.body
)}
```
`AnimatePresence` must be INSIDE the portal, not outside.

---

## Server RAM / Build

Server: 8GB RAM, typically 87%+ used by Coolify stack.
Build uses `NODE_OPTIONS='--max-old-space-size=512'` in package.json build script to prevent OOM kill.

---

## Common Pitfalls

1. **xlsx styles don't work** — always use `exceljs` for styled exports.
2. **Supabase column names** use camelCase (e.g., `startTime`, `slotId`) — match exactly.
3. **Shift registrations stay `pending`** until admin approves — export must include both statuses.
4. **`better-sqlite3` and `exceljs`** must be in `serverExternalPackages` in `next.config.mjs`.
5. **`useSearchParams()`** in a client component rendered from RSC needs a `<Suspense>` wrapper.
6. **Zustand `skipHydration: true`** — call `useStore.persist.rehydrate()` manually on mount if needed.
7. **Multi-tenant API routes** — mọi route handler phải gọi `setActiveStore(getStoreId(req))` ở đầu.
8. **`getIsSupabase()` là function** — gọi `IS_SUPABASE()` không phải `IS_SUPABASE`.
9. **`email` ≠ `username`** — email là field riêng cho admin nắm thông tin NV, username là login name.
10. **Footer modals on login** — dùng portal + mounted state, AnimatePresence bên TRONG portal.
11. **stores.json bị Coolify volume đè** — API đọc từ `STORES_JSON` env var trước, fallback file, fallback DEFAULT_STORES. Đừng hardcode store vào DEFAULT_STORES.
