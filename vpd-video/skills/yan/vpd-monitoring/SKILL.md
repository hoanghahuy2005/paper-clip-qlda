---
name: vpd-monitoring
description: >
  Dùng ở mỗi heartbeat khi dự án đang chạy: kiểm tra task trễ, blocker, lỗi được đẩy lên
  cấp 3, job Kling chưa rõ kết quả và chi phí. Không dùng để xin quyết định CEO
  (vpd-decisions) hay viết báo cáo cho CEO (vpd-ceo-reporting).
---

# Theo dõi và xử lý lỗi cấp 3

1. Đọc trạng thái dự án và các thay đổi từ lần kiểm tra trước theo [mẫu theo dõi](references/checkpoint.md). Ưu tiên: cổng đang chặn, việc trên đường găng, lỗi mới đẩy lên, chi phí.
2. **Không có thay đổi hay việc cần làm thì không bình luận.** Mỗi bình luận làm agent khác thức dậy và tốn token.
3. Lỗi cấp 3 (theo AGENTS.md): dùng bằng chứng xác định phòng gây lỗi. Trả việc về đúng phòng, ghi người phụ trách, việc cần sửa, hạn phản hồi, tiêu chí QA kiểm lại và ảnh hưởng tới các phòng sau. Lỗi cấp 1–2 chưa hết lượt thì để trưởng phòng xử lý, không can thiệp.
4. Gỡ xung đột giữa phòng bằng phiên bản đầu vào, đầu ra và tiêu chí đã duyệt. Việc vượt quyền chuyển sang `vpd-decisions`.
5. Chạm ngưỡng cảnh báo trong AGENTS.md (80% ngân sách, dự báo trễ hạn) thì dùng `vpd-ceo-reporting` gửi cảnh báo ngay.
