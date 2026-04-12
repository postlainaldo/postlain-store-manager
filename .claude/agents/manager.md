# agents/manager.md — Agent: Quản lý / Admin

> Mô tả hành vi, quyền hạn, và logic nghiệp vụ liên quan đến role admin và manager.

---

## Định nghĩa role

```
admin   → Toàn quyền hệ thống
manager → Gần như toàn quyền, không quản lý được admin user
```

Cả hai đều được gộp vào kiểm tra `["admin", "manager"].includes(role)`.

---

## Những gì admin/manager có thể làm

### Quản lý nhân viên (admin only với admin accounts)
- Tạo, sửa, xóa tài khoản nhân viên
- Đổi password bất kỳ user
- Set role: `admin | manager | staff_ft | staff_pt`
- Deactivate (không xóa hẳn): `active = 0`
- API: `PUT/DELETE /api/auth`

### Quản lý lịch làm việc
- Tạo shift templates và slots
- **Duyệt/từ chối** shift registration của nhân viên
- Edit note/status của BẤT KỲ request (kể cả đã approved)
- Toggle `regClosed` để đóng/mở đăng ký ca
- Xuất Excel lịch làm việc (`/api/shifts/export`)
- API: `POST /api/shifts`, `POST /api/shifts/requests`

### Quản lý sản phẩm
- Thêm, sửa, xóa sản phẩm
- Import hàng loạt từ Excel
- Sync từ Odoo
- API: `POST/PUT/DELETE /api/products`, `POST /api/products/bulk`

### Quản lý thông báo
- Tạo, xóa, pin thông báo
- Gửi push notification
- API: `POST/DELETE/PATCH /api/notifications`

### Báo cáo
- Xem báo cáo doanh số, traffic
- Xem leaderboard nhân viên
- API: `GET /api/reports`, `GET /api/daily-report`

### Cài đặt cửa hàng
- Tên, địa chỉ, SĐT, email cửa hàng
- KPI targets (tổng và per-user)
- API: `POST /api/settings`

---

## Logic nghiệp vụ quan trọng

### Duyệt ca làm việc
```
Nhân viên đăng ký → status: "pending"
Admin xem danh sách pending → Duyệt/Từ chối
Duyệt → status: "approved"
Từ chối → status: "rejected"

Admin CÓ THỂ sửa bất kỳ request (kể cả approved)
Admin CÓ THỂ thêm ghi chú (note) vào request
```

### KPI Targets
```
storeTarget: số doanh thu tổng cả cửa hàng (VNĐ)
individualTargets: Record<userId, number> — target per nhân viên

Hiển thị trong /profile → tab "Hồ Sơ" → StatChips
So sánh với doanh số thực từ Odoo POS
```

### Kiểm soát đăng ký ca
```
settings.regClosed = true  → Tất cả nhân viên không đăng ký được
settings.regClosed = false → Nhân viên đăng ký tự do

Toggle trong /schedule page, chỉ admin/manager thấy
```

---

## UI features chỉ admin/manager thấy

Kiểm tra bằng:
```typescript
const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";
```

- Nút "Tạo slot ca" trong schedule
- Panel duyệt request trong schedule
- Nút xóa sản phẩm
- Tab "Cài Đặt" trong profile
- Nút tạo/xóa thông báo
- Tab users management
- Nút sync Odoo
- Export Excel button (hoặc tất cả đều thấy tùy setting)

---

## Tài khoản admin mặc định

```
username: admin
password: Aldo@123
role: admin
name: ALDO GO! ĐÀ LẠT (cần sửa lại)
employeeCode: admin (cần sửa lại)
```

Tài khoản này cần được điền đủ `fullName`, `phone`, `email`, `employeeCode` thật trước khi dùng production.

---

## Authorization header pattern

Client gửi `x-user-id` header với mọi request cần auth:
```typescript
const userId = currentUser?.id;
fetch("/api/products", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-user-id": userId ?? "",
  },
  body: JSON.stringify(product),
});
```

API check:
```typescript
const userId = req.headers.get("x-user-id");
const role = await dbGetUserRole(userId ?? "");
if (!["admin", "manager"].includes(role ?? "")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```
