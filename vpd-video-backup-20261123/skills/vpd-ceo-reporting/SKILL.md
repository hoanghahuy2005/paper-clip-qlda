---
name: vpd-ceo-reporting
description: Báo cáo cho CEO sau mỗi cổng, khi có cảnh báo hoặc theo yêu cầu, đối soát chi phí LLM Paperclip và chi phí Kling.
---

# Báo cáo CEO

1. Chọn một trong bốn mẫu trong [mẫu báo cáo và đối soát](references/reporting.md). Đưa blocker, ảnh hưởng và quyết định cần CEO lên đầu. Gắn số quan trọng với link và thời điểm chốt.
2. Lấy chi phí LLM từ Paperclip trong phạm vi task hoặc run của dự án. Đọc chi phí video bằng `node <đường-dẫn-kling.mjs> spend --project-dir "<thư-mục-dự-án>"` trên thư mục chứa ledger của dự án. Nếu Yan không truy cập được, yêu cầu phòng Sản xuất AI cung cấp kết quả lệnh kèm mốc chốt.
3. Báo thực chi đã ghi nhận, cam kết cho job còn chạy và dự báo riêng. Chỉ cộng số liệu cùng đơn vị tiền tệ và cùng phạm vi. Báo rõ nguồn thiếu, khả năng ghi trùng và các khoản chưa ghi nhận.
4. Cảnh báo khi chi phí đã xác nhận đạt 80% ngân sách được duyệt. Nêu dấu hiệu dự báo vượt trần ngay khi thấy và chuyển phần vượt quyền sang `vpd-decisions`.
