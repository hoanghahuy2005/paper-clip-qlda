# Bốn mẫu báo cáo

Mọi báo cáo mở đầu bằng: **Trạng thái: Xanh / Vàng / Đỏ — lý do một câu**.

| Loại | Các mục cần có |
| --- | --- |
| Định kỳ hoặc theo yêu cầu | Giai đoạn hiện tại, đã xong, việc tiếp theo, dự kiến hoàn thành, chi phí so với ngân sách, tối đa 3 rủi ro lớn nhất, việc chờ CEO. |
| Sau cổng | Cổng, phiên bản đầu ra, link xem trước, kết quả review và duyệt, điều kiện còn mở, giai đoạn được mở tiếp. |
| Cảnh báo | Sự cố hoặc ngưỡng chạm, thời điểm, tác động, việc đang làm, người phụ trách, lần cập nhật tiếp theo. |
| Xin quyết định | Dùng mẫu của `vpd-decisions`. |

Màu trạng thái: **Xanh** đúng hạn và trong ngân sách. **Vàng** có rủi ro trễ hoặc chi phí đã quá 80% nhưng còn xử lý được trong quyền của Yan. **Đỏ** đã hoặc chắc chắn sẽ trễ hạn, vượt ngân sách, hoặc cần CEO quyết mới đi tiếp.

## Bảng chi phí

| Nguồn | Phạm vi | Mốc chốt | Thực chi | Cam kết | Dự báo |
| --- | --- | --- | --- | --- | --- |
| LLM (Paperclip) | | | | | |
| Kling (`spend`) | | | | | |
| Tổng | | | | | |

Dùng `totalVND` từ lệnh `spend` khi đã xác nhận đúng thư mục dự án. Job còn chạy chưa nằm trong số đó, ghi vào cột cam kết. Chưa có sổ ghi thì ghi "chưa xác nhận", trừ khi chắc chắn dự án chưa chạy Kling. Paperclip có thể báo chi phí bằng USD: ghi tỷ giá, nguồn và thời điểm khi quy đổi, giữ số gốc. Tỷ lệ 80% = thực chi đã xác nhận ÷ ngân sách được duyệt, cùng phạm vi và đơn vị.
