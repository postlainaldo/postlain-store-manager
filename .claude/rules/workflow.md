# rules/workflow.md — Quy trình làm việc

> Áp dụng cho mọi task, mọi lúc. Đây là cách Claude làm việc trong dự án này.

---

## Trước khi code

1. **Đọc file liên quan trước** — không suggest thay đổi code chưa đọc
2. **Hiểu flow hiện tại** — trace từ UI → API → DB trước khi fix
3. **Xác định phạm vi** — chỉ thay đổi đúng thứ được yêu cầu, không refactor thêm

---

## Khi code

### Không làm những điều này
- Không thêm error handling cho những tình huống không thể xảy ra
- Không thêm feature flags / backward-compat shim
- Không tạo helper/utility cho operation chỉ dùng 1 lần
- Không thêm comment cho code tự giải thích được
- Không thêm type annotation cho code không được sửa
- Không refactor code xung quanh khi fix bug

### Luôn làm những điều này
- Dùng `sel` selectors cho mọi Zustand access
- `setActiveStore(getStoreId(req))` ở đầu mọi API handler
- Filter `store_id` trong mọi Supabase query
- `.eq("active", 1)` — không phải `.eq("active", true)`
- Dùng `dbAdapter.ts` functions thay vì gọi DB trực tiếp

---

## Sau khi code

### Luôn commit và push ngay
```bash
git add [specific files]  # Không dùng git add -A hay git add .
git commit -m "fix/feat/chore: mô tả ngắn gọn"
git push  # Coolify tự deploy
```

Commit message format:
- `fix: mô tả lỗi đã sửa`
- `feat: tính năng mới`
- `chore: cập nhật config/deps`
- `debug: thêm log tạm (cần xóa sau)`

**Xóa debug log trước khi push production** — next.config.mjs đã config `removeConsole` cho production build.

---

## Khi debug

1. Thêm `console.log("[tên-route]", ...)` có prefix
2. Push lên Coolify
3. Xem log trong Coolify → Container logs
4. Fix xong → xóa debug log → push lại

Không giữ debug log lâu trong code.

---

## Khi gặp lỗi Supabase

Checklist:
- [ ] `setActiveStore(getStoreId(req))` đã gọi chưa?
- [ ] Query có filter `.eq("store_id", getActiveStoreId())` chưa?
- [ ] Cột `active` dùng `.eq("active", 1)` không phải `true`?
- [ ] Tên cột có đúng camelCase không? (`startTime` không phải `start_time`)
- [ ] Column có tồn tại trong Supabase không? (có thể cần thêm thủ công)

---

## Khi gặp lỗi build

- OOM (exit code 255): kiểm tra `NODE_OPTIONS=--max-old-space-size=512` trong build script
- TypeScript error: đọc error message cẩn thận, fix đúng type
- Module not found: kiểm tra `serverExternalPackages` trong `next.config.mjs` cho native modules

---

## Deploy workflow

```
Code → git push main → Coolify detect → Build (3-5 phút) → Deploy → Live
```

Khi Coolify build fail:
1. Xem build log trong Coolify
2. Fix locally
3. Test `npm run build` local nếu cần
4. Push lại

---

## Quy tắc an toàn

- **Không force-push main** — bao giờ
- **Không xóa file** mà không chắc nó không dùng nữa
- **Không sửa schema Supabase** qua code (dùng SQL Editor thủ công)
- **Kiểm tra trước khi xóa** — ngay cả code có vẻ không dùng cũng có thể referenced ở đâu đó
- **Backup trước khi migrate data** — dùng `/api/backup`
