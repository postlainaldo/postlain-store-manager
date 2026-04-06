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

## Inventory Page — RSC Split

`src/app/inventory/page.tsx` = Server Component (async, reads DB directly)
`src/app/inventory/InventoryClient.tsx` = `"use client"`, all interactive logic

Filters use **URL Search Params** (not useState):
- params: `q`, `cat`, `color`, `size`, `stock`, `loc`, `sort`, `dir`
- `router.replace(url, { scroll: false })` to update without scroll jump
- `<ListView>` wrapped in `<Suspense fallback={null}>` because `useSearchParams()` requires it

---

## Schedule Page — Key Logic

`src/app/schedule/page.tsx` — all in one client component (large file).

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

## Multi-Tenant Architecture — CRITICAL

Hệ thống hỗ trợ nhiều cửa hàng trên cùng 1 deployment.

**User flow:**
```
/ → store-select (chọn store) → /login?store=xxx → dashboard
```

**Config stores:** `data/stores.json` — thêm store mới vào đây, set `active: true`.
**API:** `GET /api/stores` trả danh sách active stores (public, không cần auth).

**storeId routing:**
- Middleware (`src/middleware.ts`) đọc cookie `plsm_store_id` → set header `x-store-id` trên mọi API request
- Mỗi API route gọi `setActiveStore(getStoreId(req))` ở đầu handler
- `getStoreId(req)` ưu tiên: `STORE_ID` env var → `x-store-id` header → `"postlain"` fallback

**SQLite:** mỗi store = file riêng `data/{storeId}.db` — `getDb(storeId)` tự tạo nếu chưa có.
**Supabase:** 1 project dùng chung, phân tách bằng cột `store_id` trong mọi bảng chính (users, products, shift_slots, movements, pos_orders...). Data cũ mặc định `store_id = 'postlain'`.

**Single-tenant Coolify deploy:** set env var `STORE_ID=postlain` → bypass multi-tenant hoàn toàn.

**Helpers:**
```typescript
// src/lib/storeContext.ts
import { getStoreId } from "@/lib/storeContext";
import { setActiveStore } from "@/lib/supabase";

// Đầu mỗi API route handler:
setActiveStore(getStoreId(req));
```

**Zustand:** `currentStoreId` trong store, `sel.currentStoreId` / `sel.setCurrentStoreId`.
Set storeId khi chọn store → tự write localStorage + cookie.

---

## Dual-DB Pattern — CRITICAL

Every data access must branch on `IS_SUPABASE`:

```typescript
import { IS_SUPABASE, getSupabase, getActiveStoreId } from "@/lib/supabase";
import getDb from "@/lib/database";

if (IS_SUPABASE) {
  const sb = getSupabase();
  // Supabase query — luôn filter .eq("store_id", getActiveStoreId())
} else {
  const db = getDb(getActiveStoreId()); // SQLite — file theo storeId
  // SQLite query
}
```

- All DB functions are in `src/lib/dbAdapter.ts` — dùng `getStoreDb()` helper, không gọi `getDb()` trực tiếp.
- `IS_SUPABASE = true` when `NEXT_PUBLIC_SUPABASE_URL` env var is set.
- Native modules (`better-sqlite3`, `exceljs`) must stay in `serverExternalPackages` in `next.config.mjs`.

---

## Common Pitfalls

1. **xlsx styles don't work** — always use `exceljs` for styled exports.
2. **Supabase column names** use camelCase (e.g., `startTime`, `slotId`) — match exactly.
3. **Shift registrations stay `pending`** until admin approves — export must include both statuses.
4. **`better-sqlite3` and `exceljs`** must be in `serverExternalPackages` in `next.config.mjs`.
5. **`useSearchParams()`** in a client component rendered from RSC needs a `<Suspense>` wrapper.
6. **Zustand `skipHydration: true`** — call `useStore.persist.rehydrate()` manually on mount if needed.
7. **Multi-tenant API routes** — mọi route handler phải gọi `setActiveStore(getStoreId(req))` ở đầu.
8. **Thêm store mới** — chỉ cần thêm entry vào `data/stores.json`. SQLite tự tạo DB mới. Supabase dùng `store_id` filter.
