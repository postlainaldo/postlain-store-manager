# skills/xep_lich.md — Skill: Quản lý lịch làm việc

> Tất cả logic, API, và data flow liên quan đến xếp lịch ca làm việc.

---

## Các khái niệm

```
ShiftTemplate → Mẫu ca (tên + giờ bắt đầu/kết thúc)
ShiftSlot     → Ca cụ thể của một ngày cụ thể (từ template)
Registration  → Nhân viên đăng ký vào một slot
```

---

## Mã ca — Shift Codes

| Mã | Giờ | Loại |
|---|---|---|
| A | 07:30 – 15:30 | Full Time |
| B | 14:00 – 22:00 | Full Time |
| C | 12:00 – 20:00 | Full Time |
| A1 | 07:30 – 11:30 | Part Time |
| A2 | 09:00 – 13:00 | Part Time |
| A3 | 11:00 – 15:00 | Part Time |
| A4 | 12:00 – 16:00 | Part Time |
| B1 | 15:00 – 19:00 | Part Time |
| B2 | 17:00 – 21:00 | Part Time |
| B3 | 18:00 – 22:00 | Part Time |

Map trong export route:
```typescript
const SHIFT_CODES: Record<string, string> = {
  "07:30-15:30": "A",  "14:00-22:00": "B",  "12:00-20:00": "C",
  "07:30-11:30": "A1", "09:00-13:00": "A2", "11:00-15:00": "A3",
  "12:00-16:00": "A4", "15:00-19:00": "B1", "17:00-21:00": "B2",
  "18:00-22:00": "B3",
};
```

---

## API Endpoints

### GET /api/shifts?dateFrom=&dateTo=
Trả về dữ liệu lịch cho khoảng ngày:
```typescript
{
  templates: DBShiftTemplate[],
  slots: DBShiftSlot[],
  registrations: DBShiftRegistration[],
  regClosed: boolean,
}
```

### POST /api/shifts
Tạo template hoặc slot:
```typescript
{ kind: "template", data: { name, startTime, endTime } }
{ kind: "slot", data: { templateId, date, startTime, endTime, maxStaff? } }
```

### POST /api/shifts/register
Nhân viên đăng ký ca:
```typescript
// Request
{ slotId: string, userId: string }
// Response
{ ok: true, id: registrationId }
// Lỗi nếu regClosed
{ error: "Đăng ký ca đã đóng" }
```

### POST /api/shifts/requests
Admin duyệt/từ chối:
```typescript
{ requestId: string, status: "approved" | "rejected", note?: string }
```

### GET /api/shifts/export?dateFrom=&dateTo=
Xuất Excel. Trả về binary buffer.

---

## Data Types

```typescript
type DBShiftTemplate = {
  id: string;
  name: string;
  startTime: string;   // "07:30"
  endTime: string;     // "15:30"
  roles?: string[];
  createdAt: string;
};

type DBShiftSlot = {
  id: string;
  templateId: string;
  date: string;        // "2026-04-07"
  startTime: string;
  endTime: string;
  maxStaff?: number;
  createdAt: string;
};

type DBShiftRegistration = {
  id: string;
  slotId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## Excel Export — Chi tiết kỹ thuật

File: `src/app/api/shifts/export/route.ts`

### Cấu trúc file Excel
```
Row 1: Tiêu đề "LỊCH LÀM VIỆC · POSTLAIN · THÁNG X YYYY" — navy bg, gold text
Row 2: STT | HỌ TÊN | VT | MÃ NV | SỐ ĐT | T2 | T3 | T4 | ... CN — navy mid bg
Row 3: (trống) | DD/MM – DD/MM | ... | 06/04 | 07/04 | ... — xanh nhạt bg
Row 4+: Group header "FULL TIME" → nhân viên FT → Group header "PART TIME" → nhân viên PT
Cuối: Dòng "Số người / ngày" → Bảng chú thích mã ca
```

### Freeze panes
```typescript
views: [{ state: "frozen", xSplit: 5, ySplit: 3 }]
```

### Logic lấy staff
```typescript
// Tất cả active users, phân nhóm theo role
const ptStaff  = staff.filter(u => u.role === "staff_pt");
const ftStaff  = staff.filter(u => u.role !== "staff_pt"); // kể cả admin/manager
const allStaff = [...ftStaff, ...ptStaff];
```

### Logic lấy mã ca
```typescript
// approved ghi đè pending
for (const status of ["pending", "approved"]) {
  for (const reg of regs.filter(r => r.status === status)) {
    const slot = slots.find(s => s.id === reg.slotId);
    regMap[reg.userId][slot.date] = getShiftCode(slot.startTime, slot.endTime);
  }
}
```

### Cột hôm nay
```typescript
const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); // UTC+7
// → highlight màu today (#dbeafe) cho cả row header và data cells
```

---

## Polling pattern trong schedule page

Tránh memory leak khi interval recreate:
```typescript
const openRef = useRef(open);
useEffect(() => { openRef.current = open; }, [open]);

const fetchMsgs = useCallback(async () => {
  if (!openRef.current) return; // dùng ref, không phải state
  // fetch...
}, []); // stable deps → interval không bị recreate

useEffect(() => {
  const id = setInterval(fetchMsgs, 5000);
  return () => clearInterval(id);
}, [fetchMsgs]);
```

---

## Trạng thái UI của slot

| Trạng thái | Màu | Ý nghĩa |
|---|---|---|
| Chưa đăng ký | Xám / trống | Slot available |
| Pending | Vàng | Đã đăng ký, chờ duyệt |
| Approved | Xanh lá | Được duyệt |
| Rejected | Đỏ | Bị từ chối |
| Đầy (maxStaff) | Xám tối | Không còn chỗ |
| regClosed | Lock icon | Admin đã đóng đăng ký |

---

## regClosed toggle

Lưu trong app settings:
```typescript
// Lấy
const { regClosed } = await dbGetAppSettings();

// Set (admin only)
await dbSetAppSettings({ regClosed: true });
```

Không có time-window tự động — admin toggle thủ công khi cần.

---

## Error boundary

File: `src/app/schedule/error.tsx`

Bắt lỗi crash trên mobile, hiển thị message + nút "Thử lại". Nhân viên không thấy màn trắng nữa.
