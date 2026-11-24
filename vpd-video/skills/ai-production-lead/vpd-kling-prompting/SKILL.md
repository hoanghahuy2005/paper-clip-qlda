---
name: vpd-kling-prompting
description: >
  Viết prompt và lập gói thông số tạo clip Kling cho từng shot của vpd-video: chọn chế độ
  (image-to-video, text-to-video, có ảnh cuối), viết prompt chuyển động tiếng Anh, prompt ảnh khung
  đầu (khi có công cụ tạo ảnh), ghi prompts/shot-specs.md và prompts/<SHOT>.json để giao Visual
  Generator, rồi sửa prompt theo lỗi nhìn thấy trên clip. Dùng khi bạn là AI Production Lead và G1 đã
  được duyệt. KHÔNG dùng để chạy Kling (kling-video-generate), không dùng để viết kịch bản hay shot
  list (phòng Sáng tạo), không dùng cho shot có Renderer là remotion.
---

# Viết prompt Kling và gói thông số shot

## Đầu vào

- `preprod/shot-list.md` và `preprod/script.md` đúng phiên bản đã duyệt ở G1, bảng Tham chiếu NV/BC.
- Kế hoạch đã duyệt: model, độ phân giải, tỉ lệ, ngân sách phòng, trần chi phí mỗi shot.
- Bảng giá hiện hành (`kling.mjs prices`), tra trong ngày làm việc.
- Ảnh tham chiếu đã chuẩn hóa từ Character & Consistency (`refs/`), ảnh thật sản phẩm nếu có.
- Shot có thoại: `renders/audio/voice/timing.md` (cột "Có tiếng") từ Voice & Audio.

Thiếu một đầu vào làm thay đổi cách tạo shot thì hỏi người giao trên task. Đầu vào sai so với G1
(shot list mâu thuẫn kịch bản, tham chiếu thiếu mô tả) là lỗi gốc tiền kỳ: báo Yan, không tự sửa.

## Quy trình

1. **Chọn chế độ cho từng shot** theo bảng dưới.
2. **Viết prompt chuyển động** theo [mẫu prompt](references/prompt-patterns.md). Lưu mỗi shot một file
   `prompts/<SHOT>.txt` (tiếng Anh, một đoạn).
3. **Ghi gói shot** `prompts/<SHOT>.json` và một dòng trong `prompts/shot-specs.md` theo
   [mẫu gói shot](references/shot-package.md). Chạy `generate --dry-run` để lấy giá báo, ghi vào gói.
4. **Kiểm tra trước khi giao** theo danh sách cuối file này.
5. **Chạy thử 1–2 shot đại diện** (nhân vật chính, bối cảnh chính) trước khi giao hàng loạt.
6. Clip chưa đạt: sửa theo [bảng sửa theo lỗi](references/fix-by-symptom.md). Mỗi lần sửa tăng
   `promptVersion` trong gói, giữ file prompt cũ dạng `prompts/<SHOT>.p<n>.txt`.

## Chọn chế độ

| Tình huống | Chế độ | Ảnh đầu vào |
|---|---|---|
| Shot có nhân vật cố định (mã NV) | image-to-video | Khung đầu có đúng nhân vật: ảnh tham chiếu đã chuẩn hóa, hoặc khung đầu tạo từ bộ `CHAR_` khi có công cụ |
| Shot sản phẩm, có chữ/logo trên vật | image-to-video | **Ảnh thật** của sản phẩm. Không bao giờ nhờ Kling vẽ chữ |
| Shot nối liền mạch với shot trước | image-to-video | Khung cuối của clip shot trước (đã được chọn), trích bằng ffmpeg |
| Cần dừng ở một bố cục chính xác | image-to-video + ảnh cuối | Ảnh đầu và ảnh cuối. Chỉ dùng khi `prices` có dòng `tailImage` cho cấu hình đó |
| Cảnh vật, không khí, không có nhân vật hay vật cố định | text-to-video | Không cần |

Mặc định ưu tiên image-to-video: hình ổn định hơn, ít phải tạo lại. Text-to-video chỉ dùng khi không có
gì cần giống nhau giữa các shot.

## Luật viết prompt

- **Tiếng Anh, một đoạn, khoảng 40–90 từ.** Thứ tự cố định: chủ thể → hành động chính → chuyển động
  máy → bối cảnh và ánh sáng → nhịp, không khí → ràng buộc giữ nguyên.
- **Image-to-video chỉ tả cái thay đổi.** Không tả lại khuôn mặt, quần áo, màu sắc đã có trong ảnh. Mô
  tả lệch với ảnh làm Kling sửa nhân vật. Chỉ nhắc chủ thể bằng một cụm ngắn ("the woman", "the white cup").
- **Một hành động chính, tối đa một chuyển động máy** mỗi shot (theo shot list). Ghi rõ "static camera"
  nếu máy đứng yên.
- **Ràng buộc viết dạng khẳng định** (script không có negative prompt): "the cup keeps its exact shape
  and printed text", "her face and outfit stay the same", "no new people enter the frame".
- **Hành động vừa thời lượng nguồn.** Clip 5s chỉ chứa một động tác ngắn. Hành động dài thì báo Creative
  Director qua Yan để chia shot, không nhồi vào một prompt.
- **Shot có thoại trên hình:** "says one short sentence, then closes her mouth and listens". Thời gian
  nói lấy cột "Có tiếng" trong `timing.md`. Ghi trong gói `speechSec` và `mouthWindow` dự kiến
  (ví dụ 0,5–2,3s) để Video Editor đối chiếu. Tránh cận mặt khi đang nói nếu shot list không ghi khác.
- **Giữ từ vựng nhất quán** giữa các shot của cùng nhân vật, bối cảnh: cùng một cụm cho ánh sáng
  ("warm late-afternoon window light"), cùng tên gọi chủ thể. Ghi các cụm dùng chung ở đầu
  `prompts/shot-specs.md` mục "Từ vựng dự án".

## Prompt ảnh khung đầu (chỉ khi dự án có công cụ tạo ảnh)

Viết `prompts/<SHOT>.frame.txt` cho Character & Consistency: bối cảnh, cỡ cảnh, góc máy, tư thế bắt đầu
của hành động, ánh sáng, tỉ lệ khung hình, mã `CHAR_` và mã BC cần dùng. Tả **tư thế đầu shot**, không
tả cả hành động. Bạn duyệt khung đầu trước khi giao Visual Generator. Dự án chưa có công cụ tạo ảnh thì
dùng ảnh tham chiếu hoặc ảnh thật sẵn có và ghi `frameSource: "reference"` trong gói.

## Kiểm tra trước khi giao Visual Generator

- [ ] Mọi dòng `kling` trong shot list có gói JSON và file prompt. Dòng "bỏ" không có gói.
- [ ] Giây nguồn thuộc mốc đã xác nhận trong `prices` cho đúng model, chế độ, độ phân giải, tỉ lệ.
- [ ] Ảnh đầu/cuối tồn tại, đúng tỉ lệ, là phiên bản đã duyệt.
- [ ] Giá báo `--dry-run` ≤ trần shot. Tổng trần các shot sắp chạy ≤ số dư `wallet` và ngân sách phòng.
- [ ] Prompt không có chữ cần Kling vẽ, không tả lại nhân vật ở image-to-video, có một hành động chính.
- [ ] Shot thoại có `speechSec` lấy từ file giọng thật (nếu Voice & Audio đã giao).
- [ ] Số lượt thử ghi trong gói (mặc định 2; nâng tới 4 thì ghi lý do).

Giao mỗi shot một task con cho Visual Generator, gom theo cảnh, ghi đường dẫn gói `prompts/<SHOT>.json`.
