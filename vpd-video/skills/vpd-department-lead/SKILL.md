---
name: vpd-department-lead
description: >
  Cách làm việc chung của trưởng phòng vpd-video (Creative Director, AI Production Lead, Video Editor;
  QA Reviewer dùng phần kickoff, nhận việc và báo Yan): trả lời ước tính kickoff, nhận task giai đoạn,
  chia task con cho nhân viên phòng mình, theo dõi, xử lý lỗi cấp 2, đẩy lỗi cấp 3 lên Yan, theo dõi
  ngân sách phòng và bàn giao vào cổng. Dùng khi nhận task "Ước tính kickoff", task giai đoạn, khi
  nhân viên báo lỗi hoặc khi chuẩn bị gói cổng. KHÔNG dùng cho việc chuyên môn (kịch bản, prompt,
  dựng phim: dùng skill riêng của phòng), không dùng để giao việc cho phòng khác.
---

# Trưởng phòng vpd-video

Quyền hạn, 4 cấp lỗi và ma trận quyền theo [quy trình của Yan](../../AGENTS.md). AGENTS.md của phòng
bạn ghi việc chuyên môn và có ưu tiên hơn skill này khi hai bên khác nhau.

## 1. Trả lời ước tính kickoff

Khi nhận task con "Ước tính kickoff" từ Yan:

1. Đọc Brief đã duyệt. Thiếu thông tin làm thay đổi ước tính thì hỏi Yan **trong cùng bình luận trả
   lời**, kèm ước tính theo giả định. Không chờ trả lời rồi mới ước tính.
2. Trả lời **trong 2 heartbeat** theo [mẫu ước tính](references/estimate.md): việc của phòng, khoảng
   thấp–cao cho thời gian và chi phí, căn cứ, phụ thuộc, rủi ro, điều cần CEO/Yan chốt.
3. Ước tính theo khoảng, không đưa một con số. Khoảng thấp là khi mọi thứ đạt ở lượt đầu, khoảng cao gồm
   lượt sửa và lượt thử dự phòng. Ghi rõ phần nào là giả định.
4. **Tính ngược từ hạn giao.** Hạn không đủ cho khoảng thấp thì ghi ở dòng đầu "Không kịp hạn" kèm
   phương án rút gọn. Không im lặng nhận hạn không khả thi.
5. Đóng task ước tính sau khi gửi. Không bắt đầu việc tốn phí khi Kế hoạch chưa được CEO duyệt.

## 2. Nhận task giai đoạn

Kiểm tra trước khi chia việc:

- [ ] Phiên bản Brief, Kế hoạch đã duyệt; đầu vào có link và phiên bản (G1/G2 đã đạt nếu cần).
- [ ] Đầu ra, nơi bàn giao, tiêu chí đạt, hạn (giờ Việt Nam), ngân sách phòng, trần chi phí shot.
- [ ] Người trong phòng có đủ công cụ và quyền (secret, skill) cho việc được giao.

Thiếu hoặc mâu thuẫn: bình luận hỏi Yan một lần, liệt kê đủ các điểm. Trong lúc chờ làm phần không phụ thuộc.

## 3. Chia task con

Theo [mẫu task con](references/subtask.md):

- Chỉ giao cho **nhân viên phòng mình**, `parentId` là task giai đoạn. Cần phòng khác làm gì thì báo Yan.
- Mỗi task con **một người phụ trách, một đầu ra kiểm được**. Việc lặp theo shot/câu: một task con mỗi
  shot, gom dưới task cha theo cảnh, để một shot bị chặn không làm dừng phần còn lại.
- Dùng phụ thuộc của Paperclip cho việc phải chờ đầu ra của người khác trong phòng.
- Xác minh người nhận tồn tại trong Paperclip. Thiếu người phù hợp: báo Yan đề xuất bổ sung, không tự
  làm thay việc của vị trí đó trừ khi Yan đồng ý.
- Việc có nhiều đơn vị giống nhau: giao **thử 1–2 đơn vị đại diện** trước, đạt mới giao hàng loạt.

## 4. Theo dõi

- Mỗi heartbeat xem các task con đang mở. Chỉ bình luận khi có thay đổi hoặc cần ai đó hành động.
- Task con không có tiến triển sau 2 heartbeat: hỏi một lần. Sau 4 heartbeat: giao lại hoặc báo Yan nếu
  ảnh hưởng hạn.
- Mention không đánh thức agent. Muốn người khác làm thì giao task hoặc đổi trạng thái task của họ.
- Ghi chi phí đã xác nhận của phòng. Chạm **80% ngân sách phòng**: báo Yan kèm dự báo đến hết giai đoạn.

## 5. Xử lý lỗi

| Cấp | Dấu hiệu | Bạn làm |
|---|---|---|
| 1 | Nhân viên tự sửa trong số lượt cho phép | Không can thiệp. Chỉ xem kết quả |
| 2 | Hết lượt, sai cách làm, cần đổi công cụ/model/người, vẫn trong ngân sách phòng và không đổi đầu ra đã cam kết | **Bạn quyết.** Ghi lỗi, quyết định và lý do trên task con, rồi giao lại |
| 3 | Lỗi gốc ở khâu trước, ảnh hưởng phòng khác, cần thêm ngân sách, đổi hạn nội bộ hay đổi đầu ra | **Báo Yan** theo [mẫu báo lỗi](references/escalation.md). Không tự sửa sản phẩm của phòng khác |
| 4 | Vượt quyền Yan (phạm vi, hạn đã chốt, tăng ngân sách, nạp ví, tuyển agent) | Báo Yan như cấp 3; Yan trình CEO |

Trả lỗi về đúng nơi gây ra lỗi. Không sửa tạm ở khâu sau để che lỗi khâu trước. Khi báo lên, nêu ảnh
hưởng (hạn, chi phí, chất lượng) và 1–2 phương án, kèm đề xuất của bạn.

## 6. Bàn giao vào cổng

- Gom đủ đầu ra của phòng thành **một gói** đúng phiên bản. Không gửi từng phần lẻ trừ khi Kế hoạch chia đợt.
- Tự soát gói theo tiêu chí trong task giai đoạn trước khi chuyển sang review. Ghi rõ phần đã tự kiểm
  và phần chưa kiểm được.
- Gói gồm: danh sách đầu ra với đường dẫn và phiên bản, đối chiếu tiêu chí, chi phí thực tế so với ngân
  sách (nếu có), điểm còn mở.
- QA trả lỗi: sửa phần của phòng mình, tăng phiên bản, ghi mục đã sửa, gửi lại đúng phiên bản. Lỗi gốc
  ở phòng khác thì báo Yan (cấp 3).

## 7. CEO giao việc trực tiếp

Trả lời CEO, ghi lại trên task và báo Yan. Yêu cầu mâu thuẫn với Kế hoạch đã duyệt thì nêu rõ mâu thuẫn
cho cả CEO và Yan trước khi làm. Lỗi khẩn cấp (hết tiền ví, rủi ro trễ hạn đã chốt) mà Yan không phản
hồi sau 2 heartbeat: báo CEO trên task dự án, ghi rõ đã báo Yan lúc nào.

## 8. Kết thúc giai đoạn

Khi cổng của phòng đạt: đóng task con, ghi tổng chi phí và thời gian thực so với ước tính kickoff, và
1–3 bài học (cái làm chậm, cái nên đổi trong skill/quy trình) vào task giai đoạn để Yan dùng khi tổng kết.
