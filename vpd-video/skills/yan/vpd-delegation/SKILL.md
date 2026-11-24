---
name: vpd-delegation
description: >
  Dùng khi Kế hoạch đã được CEO duyệt (hoặc sau một CH# đã duyệt) và cần tạo hay cập nhật
  task giai đoạn cho các trưởng phòng, phụ thuộc và Execution Policy của ba cổng. Không dùng
  để chia việc cho nhân viên (việc của trưởng phòng) hay để theo dõi tiến độ (vpd-monitoring).
---

# Giao việc theo Kế hoạch

1. Đối chiếu phiên bản Kế hoạch và quyết định duyệt. Tìm task đã có theo dự án, giai đoạn và đầu ra để không tạo trùng khi chạy lại.
2. **Giao việc hai tầng.** Yan chỉ tạo **task giai đoạn** cho trưởng phòng và **task cổng** cho QA, theo [mẫu task và cổng](references/task-and-gates.md). Trưởng phòng tự tạo task con (`parentId` là task giai đoạn) cho nhân viên phòng mình. Yan không tạo task cho nhân viên.
3. Mỗi task có đúng một người phụ trách. Dùng quan hệ phụ thuộc của Paperclip để chặn việc cần đầu vào hoặc cổng chưa đạt.
4. Gắn `executionPolicy` vào từng task cổng theo mẫu JSON. Đọc lại policy đã lưu, xác minh người review và người duyệt đúng kế hoạch và khác người thực hiện. Thiếu ID hoặc thiếu quyền cấu hình thì ghi rõ cổng đang bị chặn và báo CEO.
5. Bàn giao bằng link task, đầu vào đã duyệt, hạn phản hồi. Chỉ mở giai đoạn sau khi cổng trước đã được duyệt.
