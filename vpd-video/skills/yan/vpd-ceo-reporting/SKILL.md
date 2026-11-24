---
name: vpd-ceo-reporting
description: >
  Dùng khi cần báo cáo cho CEO: sau mỗi cổng, báo cáo định kỳ, khi chạm ngưỡng cảnh báo
  hoặc khi CEO hỏi. Đối soát chi phí LLM từ Paperclip và chi phí Kling. Không dùng để xin
  quyết định (vpd-decisions) hay ghi chú theo dõi nội bộ (vpd-monitoring).
---

# Báo cáo CEO

1. Chọn một trong bốn loại trong [mẫu báo cáo](references/reporting.md). Mở đầu bằng trạng thái **Xanh / Vàng / Đỏ kèm lý do**, rồi tới blocker và quyết định cần CEO. Gắn số liệu quan trọng với link và thời điểm chốt.
2. Chi phí LLM: lấy từ Paperclip theo dự án (`costs/by-project`). Chi phí video: chạy `node <thư mục skill kling-video-generate>/scripts/kling.mjs spend --project-dir "<thư mục dự án>"`. Lệnh này chỉ đọc sổ ghi, không cần API key. Không chạy được thì yêu cầu AI Production Lead gửi kết quả kèm mốc chốt.
3. Báo riêng thực chi, cam kết cho job còn chạy và dự báo. Chỉ cộng số liệu cùng đơn vị VND và cùng phạm vi. Ghi rõ nguồn còn thiếu.
4. Báo cáo định kỳ: một lần mỗi ngày làm việc khi dự án kéo dài trên 2 ngày, ngoài các báo cáo sau cổng. Cảnh báo thì gửi ngay, không chờ lịch.
5. Gửi báo cáo bằng bình luận trên task dự án và `send_chat_message`. Phần vượt quyền chuyển sang `vpd-decisions`.
