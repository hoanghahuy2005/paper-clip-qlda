---
name: kling-video-generate
description: >
  Tạo clip video AI cho một shot bằng Kling (qua Klinggiare API): báo giá, tạo video từ ảnh
  hoặc từ chữ, chờ kết quả, tải MP4 về thư mục dự án, ghi chi phí và số lần thử.
  Dùng khi bạn là Visual Generator (hoặc AI Production Lead) và được giao task tạo footage cho
  shot đã có prompt và thông số. KHÔNG dùng để viết prompt (đó là việc của AI Production Lead),
  không dùng để dựng phim, không dùng khi task chưa ghi ngân sách tối đa cho shot.
---

# Tạo video bằng Kling

Script: `scripts/kling.mjs` trong thư mục của skill này. Chạy bằng `node`.
Mọi lệnh in ra JSON. Đọc trường `ok` và mã thoát để biết kết quả.

## Luật bắt buộc

1. **Không bao giờ in, chép hay ghi API key** vào task, bình luận, file hay log. Key nằm sẵn
   trong biến môi trường `KLING_API_KEY`. Nếu báo `MISSING_KLING_API_KEY` thì chuyển task
   sang `blocked` và báo trưởng phòng. Không tự tìm key ở chỗ khác.
2. **Luôn chạy `--dry-run` trước** để xem giá. Chỉ tạo thật khi giá ≤ ngân sách của shot ghi trong task.
3. **`--max-cost` lấy đúng ngân sách shot ghi trong task.** Không tự nâng.
4. **`--max-attempts` mặc định là 2.** Chỉ AI Production Lead được nâng, tối đa 4, và phải ghi lý do vào task.
5. **Một shot = một lệnh `generate`.** Không gọi lặp lại cùng một shot ngoài số lần thử cho phép.
6. Video được lưu tại `renders/video/<SHOT>_v<lần thử>.mp4`. Không đổi tên, không ghi đè.

## Đầu vào cần có trong task

| Thông tin | Tham số |
|---|---|
| Thư mục dự án | `--project-dir` |
| Mã shot (ví dụ `SC01_SH03`) | `--shot` |
| Prompt (ưu tiên file, viết bằng tiếng Anh) | `--prompt-file` hoặc `--prompt` |
| Ảnh đầu, ảnh cuối (nếu có) | `--image`, `--end-image` |
| Tỉ lệ, thời lượng | `--aspect` (`16:9`, `9:16`, `1:1`), `--duration` (giây) |
| Model, độ phân giải (nếu khác mặc định `2.6`, `720p`) | `--model`, `--resolution` |
| Ngân sách tối đa cho shot (VND) | `--max-cost` |

Thiếu thông tin thì **hỏi lại người giao task** bằng bình luận, đừng tự đoán.
Không có ảnh đầu nghĩa là tạo từ chữ (text-to-video). Với nhân vật cần đồng nhất,
**luôn dùng ảnh tham chiếu** do Character & Consistency cung cấp.

## Các bước

```bash
K="node <thư mục skill>/scripts/kling.mjs"

# 1. Xem giá trước
$K generate --project-dir ./proj --shot SC01_SH03 --prompt-file prompts/SC01_SH03.txt \
  --image characters/an_front.png --aspect 16:9 --duration 5 --max-cost 2000 --dry-run

# 2. Tạo thật (bỏ --dry-run)
$K generate --project-dir ./proj --shot SC01_SH03 --prompt-file prompts/SC01_SH03.txt \
  --image characters/an_front.png --aspect 16:9 --duration 5 --max-cost 2000

# Nếu job còn chạy quá thời gian chờ (mã 6): chạy tiếp ở heartbeat sau
$K resume --project-dir ./proj --job <jobId>

# Tổng chi phí dự án (dùng khi báo cáo)
$K spend --project-dir ./proj
```

Lệnh tra cứu: `prices` (bảng giá các model), `wallet` (số dư ví), `system` (tình trạng bảo trì).

## Xử lý theo mã thoát

| Mã | Ý nghĩa | Bạn làm gì |
|---|---|---|
| 0 | Thành công | Xem nhanh video, ghi bình luận theo mẫu bên dưới, chuyển task sang review |
| 2 | Sai hoặc thiếu tham số | Sửa lệnh. Thiếu thông tin thì hỏi người giao task |
| 3 | Hết lượt thử của shot | **Dừng.** Chuyển `blocked`, báo AI Production Lead (lỗi cấp 2) |
| 4 | Hệ thống Kling đang bảo trì | Ghi bình luận, thử lại ở heartbeat sau |
| 5 | Giá vượt ngân sách shot | **Dừng.** Báo AI Production Lead kèm giá báo |
| 6 | Job còn đang chạy | Ghi `jobId` vào task, dùng `resume` ở heartbeat sau |
| 7 | Job thất bại | Xem `advice` ở bảng dưới |
| 8 | Lỗi API (mạng, số dư…) | `INSUFFICIENT_BALANCE`: chuyển `blocked` và báo lên, vì việc nạp tiền thuộc quyền CEO. Lỗi khác: thử lại một lần, vẫn lỗi thì báo trưởng phòng kèm `requestId` |

Khi job thất bại (mã 7), trường `advice` cho biết hướng xử lý:

| `advice` | Làm gì |
|---|---|
| `retry_allowed` | Lỗi phía hệ thống. Chạy lại cùng lệnh nếu còn lượt |
| `fix_prompt_or_image` | Nội dung bị từ chối. **Không chạy lại nguyên lệnh.** Báo AI Production Lead sửa prompt hoặc ảnh. `chargedVND` > 0 nghĩa là bị mất phí |
| `fix_input_media` | Ảnh hoặc video đầu vào không phù hợp. Báo trưởng phòng |
| `wait_do_not_recreate` | Chưa rõ kết quả. **Không tạo lại.** Chạy `resume` sau |

## Mẫu bình luận sau mỗi lần chạy

```
**SC01_SH03 — lần thử 1/2: ✅ Thành công**
- File: renders/video/SC01_SH03_v1.mp4
- Chi phí: 150 VND (ngân sách shot: 2000 VND)
- Thông số: 2.6 · 720p · 16:9 · 5s · image-to-video
- Ghi chú: <nhận xét nhanh: chuyển động, nhân vật có đúng tham chiếu không>
```

Khi thất bại, thay dòng File bằng `Lỗi: <errorCode> → <advice>` và ghi rõ việc tiếp theo.
Mọi chi phí và lần thử đã được script ghi tự động vào `production/kling-ledger.jsonl`.
