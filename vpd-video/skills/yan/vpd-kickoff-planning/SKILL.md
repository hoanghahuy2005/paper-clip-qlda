---
name: vpd-kickoff-planning
description: >
  Dùng khi Brief đã được CEO duyệt và cần lập hoặc sửa Kế hoạch dự án: họp kickoff với các
  trưởng phòng, thu ước tính theo khoảng và rủi ro, rồi trình CEO. Không dùng khi Brief chưa
  được duyệt (vpd-project-intake) hoặc khi Kế hoạch đã duyệt và cần giao việc (vpd-delegation).
---

# Lập kế hoạch kickoff

1. Mở hoặc tiếp tục task kickoff, gắn link Brief đã duyệt. Tạo **một task con "Ước tính kickoff"** cho mỗi người: Creative Director, AI Production Lead, Video Editor và QA Reviewer (mention không đánh thức agent, phải giao task). Hạn phản hồi: 2 heartbeat.
2. Mỗi trưởng phòng báo: việc phòng mình làm, khoảng thấp–cao cho thời gian và chi phí, căn cứ, phụ thuộc, rủi ro. AI Production Lead xác nhận tính khả thi kỹ thuật (model, thời lượng shot, chi phí Kling ước tính). QA báo thời gian review mỗi cổng.
3. **Không chờ mãi.** Quá 2 heartbeat chưa có phản hồi thì nhắc một lần. Quá 4 heartbeat thì lập kế hoạch với ước tính giả định cho phòng đó, ghi rõ "chưa xác nhận" và đưa vào mục rủi ro.
4. Dùng [mẫu Kế hoạch](references/plan.md). Lập lịch ngược từ hạn đã chốt, tính thời gian duyệt và vòng sửa. Ghi ngân sách từng phòng, dự phòng chưa phân bổ và tổng, cùng đơn vị VND.
5. Nếu không đáp ứng được ràng buộc, trình 2–3 phương án đánh đổi qua `vpd-decisions`. Lưu Kế hoạch thành document `plan` trên task dự án và tạo `request_confirmation` gắn với phiên bản mới nhất. Chỉ giao việc hoặc cam kết chi phí sau khi CEO chấp nhận.
