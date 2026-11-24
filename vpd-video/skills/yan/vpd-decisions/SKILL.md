---
name: vpd-decisions
description: >
  Dùng khi việc vượt ma trận quyền của Yan trong AGENTS.md, hoặc cần đổi phạm vi, ngân sách,
  hạn giao hay tiêu chí nghiệm thu đã duyệt: lập yêu cầu quyết định cho CEO và quản lý thay đổi
  bằng mã CH#. Không dùng cho việc nằm trong quyền của Yan (tự quyết và ghi vào task).
---

# Quyết định và thay đổi

1. Đối chiếu AGENTS.md và phiên bản Kế hoạch được duyệt. Tách phần Yan tự xử lý được khỏi phần cần CEO quyết.
2. Tra sổ quyết định của dự án. Dùng lại mã CH# nếu đã có yêu cầu cho cùng thay đổi, hoặc cấp mã kế tiếp. Dùng [mẫu quyết định](references/decision.md).
3. Trình CEO 2–3 phương án khả thi, tác động định lượng khi có căn cứ, phương án đề xuất, hạn cần trả lời và hệ quả nếu trả lời chậm. Gửi bằng interaction `request_confirmation` trên task liên quan (lựa chọn giữa nhiều phương án thì dùng `ask_user_questions`), kèm `send_chat_message` nếu gấp.
4. Trong lúc chờ, tiếp tục việc không bị ảnh hưởng. Ghi quyết định và link bằng chứng vào sổ. Chỉ cập nhật phạm vi, ngân sách, lịch, task hoặc cổng sau khi có quyết định hợp lệ. Thông báo các trưởng phòng bị ảnh hưởng.
