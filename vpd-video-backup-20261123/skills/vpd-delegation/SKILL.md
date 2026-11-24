---
name: vpd-delegation
description: Chuyển Kế hoạch vpd-video đã duyệt thành task có người phụ trách, phụ thuộc, ngân sách và Execution Policy cho ba cổng.
---

# Giao việc theo Kế hoạch

1. Đối chiếu phiên bản Kế hoạch và quyết định CEO. Tìm task đã có theo dự án, giai đoạn và đầu ra để tránh tạo trùng khi chạy lại.
2. Tạo task cho từng trưởng phòng và QA theo [mẫu task và cổng](references/task-and-gates.md). Mỗi task có một người phụ trách. Dùng quan hệ phụ thuộc của Paperclip để chặn việc cần đầu vào hoặc cổng chưa đạt.
3. Gắn `executionPolicy` vào từng task cổng. Đọc lại policy đã lưu, xác minh người review và người duyệt đúng với kế hoạch và khác người thực hiện. Nếu thiếu người hoặc quyền cấu hình, ghi rõ cổng đang chặn và báo người có quyền xử lý.
4. Bàn giao bằng link task, đầu vào đã duyệt và thời điểm cần phản hồi. Mở công việc downstream khi điều kiện đã đạt.
