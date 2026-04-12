# skills/thong_tin.md — Skill: Quản lý thông tin cá nhân

> Logic, validation, API, và UX liên quan đến hồ sơ nhân viên.

---

## 4 trường bắt buộc

Mọi user (kể cả admin) phải điền đủ trước khi dùng app:

| Field DB | Tên hiển thị | Validation rule |
|---|---|---|
| `fullName` | Họ và tên | Không được trống |
| `phone` | Số điện thoại | `/^(0\|\+84)[0-9]{8,10}$/` (sau khi bỏ spaces) |
| `email` | Email | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `employeeCode` | Mã nhân viên | Không được trống |

---

## Kiểm tra và hiển thị

### Khi load profile (`/profile` page)
```typescript
const load = async () => {
  const p = await fetch(`/api/profile?id=${currentUser.id}`).then(r => r.json());
  setForm({
    fullName: p.fullName ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    employeeCode: p.employeeCode ?? "",
    // ...
  });

  const missing = !p.fullName?.trim() || !p.phone?.trim()
               || !p.email?.trim()    || !p.employeeCode?.trim();
  if (missing) setShowProfileRequired(true);
};
```

### Modal "Hoàn thiện hồ sơ"
- Hiển thị khi `showProfileRequired = true`
- `position: fixed, inset: 0, zIndex: 800` — chặn toàn bộ UI
- Checklist 4 trường — tick xanh nếu đã điền, đỏ nếu chưa
- Nút "Điền thông tin ngay" → `setShowProfileRequired(false); setEditing(true)`
- Modal tắt tự động sau khi save đủ 4 trường

### View mode (không edit)
```typescript
// Trường chưa điền hiển thị:
"Chưa điền ⚠"  // màu đỏ #ef4444, fontStyle: italic
```

### Edit mode
- Input có border đỏ khi validation fail
- Error message dưới input: `fontSize: 9, color: "#dc2626"`
- Clear error khi user bắt đầu gõ

---

## Validation function

```typescript
const validateForm = () => {
  const errs: Record<string, string> = {};
  if (!form.fullName.trim())
    errs.fullName = "Bắt buộc";
  if (!form.phone.trim())
    errs.phone = "Bắt buộc";
  else if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.replace(/\s/g, "")))
    errs.phone = "Sai định dạng (vd: 0901234567)";
  if (!form.email.trim())
    errs.email = "Bắt buộc";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errs.email = "Sai định dạng email";
  if (!form.employeeCode.trim())
    errs.employeeCode = "Bắt buộc";
  setFormErrors(errs);
  return Object.keys(errs).length === 0;
};
```

---

## API

### GET /api/profile?id={userId}
Trả về profile đầy đủ của user:
```typescript
{
  id, name, username, role, active,
  fullName, phone, email, employeeCode,
  avatar, status, bio, createdAt
}
```

### GET /api/profile (không có id)
Trả về danh sách tất cả users (TeamMember list):
```typescript
TeamMember[] // { id, name, fullName, username, role, active, avatar, status, bio, phone, createdAt }
```

### PUT /api/profile
Cập nhật profile:
```typescript
// Request body
{
  id: string,
  name?: string,
  fullName?: string,
  phone?: string,
  email?: string,
  employeeCode?: string,
  bio?: string,
  avatar?: string,
  status?: string,
}
// Response
{ ok: true }
```

---

## Database

### Columns trong `users` table

**Supabase (camelCase):**
```
id, name, username, passwordHash, role, active (integer 0/1),
createdAt, avatar, status, bio, phone, email, fullName, employeeCode, store_id
```

**SQLite schema** (`src/lib/dbAdapter.ts`):
```sql
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  username     TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'staff',
  active       INTEGER NOT NULL DEFAULT 1,
  createdAt    TEXT NOT NULL,
  avatar       TEXT,
  status       TEXT,
  bio          TEXT,
  phone        TEXT DEFAULT '',
  email        TEXT DEFAULT '',
  fullName     TEXT DEFAULT '',
  employeeCode TEXT DEFAULT ''
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employeeCode TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
```

**Supabase cần chạy thủ công** (SQL Editor):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
```

### dbUpdateUser
```typescript
await dbUpdateUser(userId, {
  fullName: "Nguyễn Văn A",
  phone: "0901234567",
  email: "a@example.com",
  employeeCode: "NTH260001",
});
```

---

## Các trường khác trong form

Ngoài 4 trường bắt buộc, form còn có:
- `name` — display name (username-style, ngắn)
- `bio` — mô tả ngắn về bản thân
- `status` — trạng thái hoạt động (working, AL, SL, ...)

Mã nhân viên (`employeeCode`) dùng để:
- Hiển thị trong Excel export (cột MÃ NV)
- Tra cứu nhân viên từ hệ thống Odoo
- Format thường gặp: `NTH260001`, `NTH260020`

---

## Avatar

- Upload avatar → lưu URL vào `users.avatar`
- Hiển thị trên profile header và team list
- Nếu không có avatar → hiển thị chữ cái đầu của `name`

---

## KPI trong profile

Tab "Hồ Sơ" hiển thị 4 StatChips:
```
Thành viên: số active members
Doanh số:   từ Odoo POS (odooStats.sales)
IPT:        từ Odoo POS (odooStats.ipt)
Xếp hạng:  từ Odoo POS (odooStats.rank)
```

Chỉ admin/manager mới set được KPI target (tab "Cài Đặt"):
- Store target: `kpiStoreTarget` trong Zustand (persisted)
- Individual target per user: `kpiIndividualTargets[userId]`
