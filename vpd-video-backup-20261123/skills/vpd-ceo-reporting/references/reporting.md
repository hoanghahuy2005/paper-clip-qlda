# Bốn mẫu báo cáo và đối soát chi phí

| Loại | Các mục cần có |
| --- | --- |
| Định kỳ hoặc theo yêu cầu | Trạng thái, đã hoàn thành, việc tiếp theo, hạn, ngân sách và blocker. |
| Sau cổng | Cổng, phiên bản đầu ra, kết quả review và duyệt, điều kiện còn mở, việc được mở tiếp. |
| Cảnh báo | Sự cố hoặc ngưỡng, thời điểm, tác động, hành động đang làm, người phụ trách và lần cập nhật tiếp theo. |
| Xin quyết định | Quyết định cần chốt, các phương án, đề xuất, hạn trả lời và mã CH# nếu áp dụng. |

Bảng chi phí ghi nguồn, phạm vi, mốc chốt, thực chi, cam kết và dự báo. Dùng `totalVND` từ kết quả `kling spend` khi xác nhận đúng thư mục và ledger. Job còn chạy có thể chưa nằm trong số đó. Khi thiếu ledger hoặc chưa đối soát được, ghi chưa xác nhận, trừ khi đã có bằng chứng dự án chưa chạy Kling. Nếu phải quy đổi, ghi tỷ giá, nguồn và thời điểm. Giữ số gốc để đối soát. Kiểm tra phạm vi báo cáo Paperclip trước khi cộng chi phí Kling. Tỷ lệ 80% lấy thực chi đã xác nhận chia ngân sách được duyệt cùng phạm vi và đơn vị.
