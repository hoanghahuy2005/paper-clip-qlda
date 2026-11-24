---
name: vpd-closeout
description: >
  Dùng khi CEO đã duyệt video cuối ở cổng G3: bàn giao, đối soát kế hoạch với thực tế, ghi
  bài học và đề xuất sửa quy trình. Không dùng khi G3 chưa được duyệt.
---

# Tổng kết dự án

1. Xác nhận Paperclip đã ghi nhận CEO duyệt đúng phiên bản video cuối và QA đã hoàn tất checklist G3.
2. Dùng [mẫu tổng kết](references/closeout.md). Đối chiếu timeline, chi phí và đầu ra thực tế với Kế hoạch gốc và Kế hoạch sau các CH# đã áp dụng. Đối soát chi phí theo cách của `vpd-ceo-reporting`.
3. Ghi các điểm chênh lệch có căn cứ, bài học cụ thể và đề xuất sửa quy trình hoặc sửa skill. Mỗi việc theo dõi có người phụ trách và hạn.
4. Lưu báo cáo vào task dự án, ghi bài học vào bộ nhớ dài hạn (`para-memory-files`) để dùng cho dự án sau. Gửi CEO bằng `send_chat_message`. Còn khoản chưa đối soát thì ghi người đối soát và mốc cập nhật. Chỉ đóng dự án khi có đủ số liệu.
