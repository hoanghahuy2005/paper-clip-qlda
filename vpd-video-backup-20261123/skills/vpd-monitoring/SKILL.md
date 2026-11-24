---
name: vpd-monitoring
description: Theo dõi dự án vpd-video theo heartbeat, xử lý task trễ, blocker, lỗi cấp 3 và rủi ro chi phí.
---

# Theo dõi và xử lý lỗi cấp 3

1. Đọc trạng thái dự án, các thay đổi từ lần kiểm tra trước, hạn và phụ thuộc. Ưu tiên cổng đang chặn, việc trên đường găng, chi phí và lỗi mới được đẩy lên.
2. Với lỗi cấp 3 theo quy trình dự án, dùng bằng chứng để xác định phòng gây lỗi hoặc người có thể kiểm chứng nguyên nhân. Trả việc về đúng phòng, ghi người phụ trách, hành động sửa, hạn phản hồi, tiêu chí QA kiểm lại và ảnh hưởng downstream.
3. Gỡ xung đột giữa phòng bằng phiên bản đầu vào, đầu ra và tiêu chí đã duyệt. Chuyển vấn đề vượt quyền sang `vpd-decisions`.
4. Dùng [mẫu theo dõi](references/checkpoint.md) để ghi thay đổi và lần kiểm tra kế tiếp. Cảnh báo theo AGENTS.md và dùng `vpd-ceo-reporting` khi cần báo CEO.
