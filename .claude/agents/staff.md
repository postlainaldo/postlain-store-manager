# agents/staff.md — Agent: Nhân viên

> Mô tả hành vi, quyền hạn, và UX flow từ góc độ nhân viên (staff_ft, staff_pt).

---

## Định nghĩa role

```
staff_ft  → Full-time, mã ca A/B/C, màu xanh trong Excel
staff_pt  → Part-time, mã ca A1–B3, màu cam trong Excel
staff     → Legacy, xử lý như staff_ft
```

Mọi check "là nhân viên" (không phải admin/manager):
```typescript
const isStaff = !["admin", "manager"].includes(currentUser?.role ?? "");
```

---

## Những gì nhân viên có thể làm

### Hồ sơ cá nhân
- Xem và sửa thông tin cá nhân: `fullName`, `phone`, `email`, `employeeCode`
- Đổi password của chính mình
- Set trạng thái hoạt động: working, off_shift, day_off, AL, SL, ...
- Xem KPI cá nhân và xếp hạng
- Xem thành viên team

### Lịch làm việc (`/schedule`)
- Xem các shift slots trong tuần
- **Đăng ký ca**: click slot → POST `/api/shifts/register`
  - Chỉ hoạt động khi `regClosed = false`
  - Registration tạo ra với `status: "pending"`
- Xem trạng thái đăng ký (pending / approved / rejected)
- Xem lịch tổng của team

### Chat (`/chat`)
- Tham gia room general và các room được invite
- Gửi tin nhắn text, ảnh, file
- Reply, react emoji
- Xem pinned messages
- Direct message với manager

### Thông báo
- Xem thông báo từ admin/manager
- Dismiss per-user (lưu localStorage key `notif_dismissed_{userId}`)
- Nhận push notification

### Inventory
- Chỉ xem — không thêm/sửa/xóa

---

## UX Flow đăng nhập lần đầu

```
1. store.postlain.com → redirect /login
2. Nhập username + password
3. Load profile → kiểm tra 4 trường bắt buộc
4. Nếu thiếu → modal "Hoàn thiện hồ sơ"
   - Checklist 4 trường (tick đỏ/xanh)
   - Không đóng được đến khi điền đủ
5. Điền đủ + save → modal tắt → vào app
```

---

## Shift registration logic

```
Điều kiện đăng ký được:
  1. regClosed === false
  2. Chưa đăng ký slot đó

Không có: time window, role restriction, giới hạn số slot

Kết quả:
  pending  → chờ admin duyệt (màu vàng)
  approved → được duyệt (màu xanh)
  rejected → bị từ chối (màu đỏ)
```

---

## Thông tin bắt buộc

| Field | Validation |
|---|---|
| `fullName` | Không trống |
| `phone` | `^(0\|\+84)[0-9]{8,10}$` |
| `email` | `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| `employeeCode` | Không trống |

Hiển thị `"Chưa điền ⚠"` màu đỏ khi trống ở view mode.

---

## Màu trong Excel export

```
FT (staff_ft / staff / admin / manager):
  Row bg: #eff6ff | Group: #bfdbfe | Cell: #dcfce7 / #166534

PT (staff_pt):
  Row bg: #fff7ed | Group: #fde68a | Cell: #fed7aa / #9a3412

Pos label: admin/manager → SL | staff/staff_ft → FT | staff_pt → PT
```

---

## Trạng thái nhân viên

```typescript
type Status =
  "working" | "off_shift" | "day_off"   // tự động từ shift schedule
  | "AL" | "SL" | "MAL" | "PCU" | "UL" | "OIL" | "BT"
  | "MML" | "CSL" | "CML" | "CL" | "PX" | "NDF" | "PHC" | "Xmas" | "MS"
```

Status compute tự động từ shift data. Nhân viên có thể override thủ công bằng leave codes.
