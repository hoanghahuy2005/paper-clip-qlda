---
name: vieneu-voice-generate
description: >
  Tạo giọng đọc tiếng Việt (lời thoại, lời dẫn) cho vpd-video bằng VieNeu-TTS chạy offline trong
  container: gán giọng cố định cho từng nhân vật, tạo giọng mẫu để duyệt, tạo file giọng theo mã câu,
  đo thời lượng và lập bảng thời lượng cho Sản xuất AI và Hậu kỳ. Dùng khi bạn là Voice & Audio
  (hoặc AI Production Lead kiểm tra) và được giao task giọng cho dự án đã qua G1. KHÔNG dùng để sửa
  lời thoại (việc của Scriptwriter), không dùng để tạo nhạc hay hiệu ứng âm thanh, không dùng để
  cân/phối âm (việc của Color & Sound Mix).
---

# Tạo giọng bằng VieNeu-TTS

Script: `scripts/vieneu_tts.py` trong thư mục skill này. Chạy bằng Python của môi trường VieNeu
(biến `VIENEU_PYTHON`, mặc định `python3`). Mọi lệnh in một dòng JSON. Đọc trường `ok` và mã thoát.
Công cụ chạy offline, **không tốn tiền theo lượt**, nhưng vẫn giới hạn lượt thử để không lặp vô hạn.

## Luật bắt buộc

1. **Một nhân vật = một giọng cố định cho cả dự án.** Giọng được ghi trong `refs/voices/cast.json`.
   Đổi giọng đã gán cần AI Production Lead đồng ý; khi đó dùng `--replace --reason`.
2. **Chỉ tạo câu sau khi giọng mẫu của nhân vật đã được AI Production Lead duyệt** trên task.
3. **Không sửa nghĩa lời thoại.** Bạn chỉ được sửa trường `spoken` (cách đọc) để phát âm đúng:
   viết số thành chữ, viết lại tên nước ngoài theo cách đọc, thêm dấu phẩy để ngắt hơi. Trường
   `display` (chữ dùng cho phụ đề) giữ nguyên như kịch bản. Lời sai hoặc quá dài thì báo trưởng phòng.
4. **Nhân bản giọng chỉ từ đoạn mẫu có nguồn rõ và người nói đã đồng ý** (`--consent` bắt buộc).
   Không nhân bản giọng người nổi tiếng hay người không đồng ý, kể cả khi video chỉ dùng nội bộ.
5. **Mặc định 3 lượt mỗi câu**, tính cộng dồn trong `production/tts-ledger.jsonl`. Chỉ AI Production
   Lead được nâng, tối đa 5, và phải ghi lý do vào task.
6. **Không xóa, không ghi đè, không đổi tên file đã tạo.** File giọng lưu tại
   `renders/audio/voice/<MÃ CÂU>_v<n>.wav`. Không chỉnh tốc độ, cắt hay xử lý âm sau khi tạo; việc đó
   thuộc Hậu kỳ.

## Đầu vào cần có trong task

| Thông tin | Ở đâu |
|---|---|
| Thư mục dự án | `--project-dir` |
| Kịch bản đã duyệt G1 và phiên bản | `preprod/script.md` (mã `TH..`, `LD..`, người nói) |
| Shot list (shot nào có câu nào, Giây dựng) | `preprod/shot-list.md` |
| Mô tả giọng từng nhân vật (giới tính, tuổi, vùng miền, tính cách) | Bảng Tham chiếu hoặc Kế hoạch |
| Đoạn giọng mẫu để nhân bản (nếu có) + ai đồng ý | File do CEO/Lead cung cấp |
| Câu cần làm (nếu không phải toàn bộ) | Danh sách mã câu |

Thiếu thông tin thì hỏi người giao task bằng bình luận, không tự đoán.

## Các bước

```bash
T="${VIENEU_PYTHON:-python3} <thư mục skill>/scripts/vieneu_tts.py"
P=./projects/<mã>

# 0. Kiểm tra môi trường (lần đầu mỗi dự án)
$T check --project-dir $P
$T voices                          # danh sách giọng có sẵn: label + id

# 1. Lập file câu: prompts/voice-lines.json (mẫu ở references/voice-lines.md)

# 2. Gán giọng cho từng người nói
$T cast --project-dir $P --char AN --preset <id> --note "nữ trẻ miền Bắc, tươi"
$T cast --project-dir $P --char NGUOI_DAN --ref-audio refs/voices/incoming/dan.wav \
   --consent "CEO cung cấp, giọng anh X đã đồng ý, 24/11"

# 3. Tạo giọng mẫu → gửi AI Production Lead duyệt
$T sample --project-dir $P --char AN

# 4. Sau khi giọng được duyệt: tạo toàn bộ câu
$T synth --project-dir $P --dry-run    # xem sẽ tạo câu nào
$T synth --project-dir $P              # câu đã có sẽ được bỏ qua
$T synth --project-dir $P --only TH03 --redo   # tạo thêm phiên bản cho một câu

# 5. Nghe, chọn phiên bản, in bảng thời lượng
$T select --project-dir $P --line TH03 --version 2 --reason "nhấn đúng chữ 'trắng'"
$T timing --project-dir $P
```

Bảng `renders/audio/voice/timing.md` ghi với mỗi câu: phiên bản được chọn, tổng thời lượng file,
**thời lượng có tiếng** (bỏ lặng đầu/cuối) và lặng đầu. AI Production Lead dùng "có tiếng" để đặt
thời gian nói trong prompt Kling; Video Editor dùng để khớp thời gian nói.

## Kiểm tra mỗi file trước khi chọn

Nghe hoặc tự kiểm tra (nếu không nghe được thì ghi rõ "chưa nghe, chỉ kiểm số đo"):

- Đọc đủ chữ, đúng thứ tự, không lặp, không nuốt chữ cuối.
- Đúng thanh điệu, tên riêng và tên sản phẩm đọc đúng cách đã thống nhất.
- Cùng chất giọng với giọng mẫu đã duyệt.
- `clipping: false`. Lặng đầu dưới khoảng 0,5 giây.
- Có trường `maxSec` trong file câu: `speechSec` không vượt `maxSec` quá 10%. Nếu có `warning`, báo
  trưởng phòng (Hậu kỳ chỉ được chỉnh tốc độ tối đa ±10%).

## Xử lý theo mã thoát

| Mã | Ý nghĩa | Bạn làm gì |
|---|---|---|
| 0 | Thành công | Kiểm tra file, chọn phiên bản, ghi bình luận theo mẫu |
| 2 | Sai/thiếu tham số hoặc file câu lỗi | Sửa lệnh hoặc file câu. Thiếu thông tin thì hỏi người giao task |
| 3 | Câu hết lượt thử (các câu khác vẫn đã chạy) | **Dừng câu đó.** Báo AI Production Lead (lỗi cấp 2) kèm mã câu, lỗi nghe thấy |
| 4 | Thiếu VieNeu, model lỗi, không ghi được thư mục | Chuyển task `blocked`, báo AI Production Lead kèm `detail`. Không tự cài thư viện |
| 5 | Người nói chưa có giọng, hoặc file giọng mẫu bị đổi | Gán giọng (bước 2). `REF_AUDIO_CHANGED`: báo trưởng phòng, không gán lại tùy ý |
| 7 | Tạo giọng thất bại | Câu khác vẫn được ghi. Thử lại câu lỗi một lần; vẫn lỗi thì thử tách câu hoặc sửa `spoken`, rồi báo nếu còn lỗi |
| 9 | Nhân vật đã có giọng | Không gán lại. Cần đổi giọng thì xin AI Production Lead |

## Mẫu bình luận

```
**Giọng — đợt 1: ✅ 12/13 câu**
- Bảng thời lượng: renders/audio/voice/timing.md
- Giọng: AN = preset "Bắc (Nữ)", NGUOI_DAN = nhân bản (nguồn: CEO, 24/11)
- Cần lưu ý: TH07 có tiếng 3,4s, vượt Giây dựng 3s của SC02_SH04 → đề xuất cắt sang người nghe
- Hết lượt: TH09 (đọc sai "Lowtech" cả 3 lần) → cần quyết cách đọc
- Kiểm tra: đã nghe 12 câu / chỉ kiểm số đo
```

Chi tiết file câu: [references/voice-lines.md](references/voice-lines.md). Cài đặt trong Docker:
[references/setup.md](references/setup.md).
