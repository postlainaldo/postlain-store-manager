# rules/tech-defaults.md — Defaults kỹ thuật

> Các lựa chọn kỹ thuật mặc định. Khi không có chỉ định cụ thể, dùng những thứ này.

---

## Database

### Mặc định dùng dbAdapter
```typescript
import { dbGetUsers, dbUpdateUser, dbGetProducts, ... } from "@/lib/dbAdapter";
// Không gọi getDb() hay getSupabase() trực tiếp trừ khi cần query phức tạp
```

### Khi phải gọi trực tiếp
```typescript
import { IS_SUPABASE, getSupabase, getActiveStoreId } from "@/lib/supabase";
import getDb from "@/lib/database";

if (IS_SUPABASE) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("table_name")
    .select("col1, col2, col3")          // list cụ thể, không dùng "*"
    .eq("store_id", getActiveStoreId())  // LUÔN filter store
    .eq("active", 1)                     // integer, không phải boolean
    .order("createdAt", { ascending: false });
  if (error) console.error("[route-name]", error);
  return data ?? [];
} else {
  const db = getDb(getActiveStoreId());
  return db.prepare("SELECT ... FROM ... WHERE ... ORDER BY ...").all(...) as Type[];
}
```

### Supabase column names (camelCase)
```
users:               id, name, username, passwordHash, role, active, createdAt, avatar, status, bio, phone, email, fullName, employeeCode, store_id
products:            id, name, sku, category, productType, quantity, price, markdownPrice, color, size, imagePath, notes, createdAt, updatedAt, store_id
shift_slots:         id, templateId, date, startTime, endTime, maxStaff, createdAt, store_id
shift_registrations: id, slotId, userId, status, note, createdAt, updatedAt, store_id
messages:            id, roomId, userId, userName, content, createdAt, deletedAt, editedAt, mediaUrl, mediaType, replyToId, reactions, pinnedAt, pinnedBy, revokedAt
notifications:       id, title, body, type, createdBy, createdAt, pinned, store_id
movements:           id, productId, productName, variant, type, fromLoc, toLoc, qty, byUser, createdAt, store_id
```

---

## API Routes

### Template chuẩn cho mọi route
```typescript
import { NextRequest, NextResponse } from "next/server";
import { setActiveStore, getActiveStoreId } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export async function GET(req: NextRequest) {
  setActiveStore(getStoreId(req));  // Luôn ở đầu
  
  try {
    const data = await dbGetXxx();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/route-name GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

### Auth check
```typescript
const userId = req.headers.get("x-user-id");
const role = await dbGetUserRole(userId ?? "");
if (!["admin", "manager"].includes(role ?? "")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

## State Management

### Component state vs Zustand
- **Zustand:** global state (user, products, settings, theme, KPI)
- **useState:** local UI state (modal open, form values, loading)
- **URL params:** filter state trên inventory page

### Form pattern
```typescript
const [form, setForm] = useState({ field1: "", field2: "" });
const [errors, setErrors] = useState<Record<string, string>>({});

const validate = () => {
  const errs: Record<string, string> = {};
  if (!form.field1.trim()) errs.field1 = "Bắt buộc";
  setErrors(errs);
  return Object.keys(errs).length === 0;
};

const handleSave = async () => {
  if (!validate()) return;
  // save...
};
```

---

## Excel (ExcelJS)

```typescript
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
wb.creator = "Postlain Store Manager";

const ws = wb.addWorksheet("Sheet Name", {
  pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  views: [{ state: "frozen", xSplit: 5, ySplit: 3 }],
});

// Cell styling
function styleCell(c: ExcelJS.Cell, value: string | number, opts = {}) {
  c.value = value;
  c.font = { name: "Calibri", size: 10, bold: opts.bold };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  c.alignment = { horizontal: "center", vertical: "middle" };
  c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
}

// Export — ĐÚNG
const buf = Buffer.from(await wb.xlsx.writeBuffer());
return new NextResponse(buf, {
  headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="file.xlsx"`,
  },
});
// SAI — không dùng `buf as Buffer`
```

---

## Server External Packages

Các package native phải khai báo trong `next.config.mjs`:
```javascript
serverExternalPackages: ["better-sqlite3", "exceljs"]
```

Nếu thêm native package mới → thêm vào đây.

---

## Error Handling

### API routes
- Log lỗi với prefix: `console.error("[api/route-name ACTION]", error)`
- Return `{ error: "message" }` với status code phù hợp
- Không expose internal error details cho client

### Client components
- Try-catch cho fetch calls
- Fallback về empty array: `.catch(() => [])`
- Loading state: `const [loading, setLoading] = useState(false)`

---

## TypeScript

- Không dùng `any` — dùng `unknown` rồi narrow type
- Interface cho objects có nhiều field
- Type alias cho unions: `type Status = "pending" | "approved" | "rejected"`
- `as const` cho object/array literal dùng làm lookup
- Không cần explicit return type annotation cho functions đơn giản

---

## Performance

- `useCallback` cho functions truyền vào dependency array
- `useMemo` cho computed values phức tạp
- Không memoize đơn giản — chỉ khi có vấn đề thực sự
- `key` prop phải stable và unique (dùng `id`, không dùng index nếu list có thể reorder)
- Image lazy loading: `loading="lazy"` attribute

---

## PWA / Mobile

- Service worker tại `src/sw/index.ts`
- Cache strategy: network-first cho API, cache-first cho static
- Push notification: dùng `src/lib/push.ts`
- Offline support: hiển thị indicator khi mất mạng

---

## Các package quan trọng và cách dùng

| Package | Dùng cho | Ghi chú |
|---|---|---|
| `exceljs` | Export Excel có style | Server only, trong serverExternalPackages |
| `better-sqlite3` | SQLite dev | Server only, trong serverExternalPackages |
| `@supabase/supabase-js` | PostgreSQL prod | Client + server |
| `zustand` | Global state | Với persist middleware |
| `framer-motion` | Animation | Dùng AnimatePresence cho exit animation |
| `lucide-react` | Icons | Tree-shakeable |
| `jsQR` / `@zxing/library` | Barcode scan | Client only |
| `web-push` | Push notification | Server only |
| `xlsx` | **Read** Excel (import) | Không dùng để write (style bị mất) |
