---
name: vpd-project-intake
description: >
  Dùng khi CEO giao một yêu cầu video mới hoặc sửa Brief đang chờ duyệt: làm rõ yêu cầu
  trong một lượt hỏi và lập Brief dự án để CEO duyệt. Không dùng khi Brief đã được duyệt
  (chuyển sang vpd-kickoff-planning) hoặc khi chỉ cần báo cáo tiến độ (vpd-ceo-reporting).
---

# Tiếp nhận yêu cầu video

1. Chỉ chạy skill này trên task dự án. Nếu yêu cầu đang ở trong chat, làm theo AGENTS.md (đề xuất task bằng `suggest_tasks`) và dừng skill tại đây. Đọc yêu cầu, tài liệu đi kèm và mọi câu CEO đã trả lời (cả trong chat). Tìm task hoặc Brief cùng dự án để không mở hồ sơ trùng.
2. Đối chiếu với [mẫu Brief](references/brief.md). Mục nào CEO không nói thì dùng **mặc định của công ty** trong mẫu và ghi là giả định. Chỉ hỏi những mục không có mặc định, hoặc mục mà mặc định có thể sai với yêu cầu.
3. Gom mọi câu hỏi thành **một lượt** trong một interaction `ask_user_questions` trên task dự án, mỗi câu kèm phương án đề xuất. Báo CEO bằng `send_chat_message` kèm link. Không hỏi lại điều đã được trả lời. Không hỏi từng câu một.
4. Khi đủ thông tin, lưu Brief thành document `brief` trên task dự án, có số phiên bản (v1, v2…), rồi tạo `request_confirmation` gắn với phiên bản đó.
5. CEO yêu cầu sửa thì cập nhật document, tăng phiên bản và tạo confirmation mới. Chỉ chuyển sang `vpd-kickoff-planning` khi CEO đã chấp nhận.
