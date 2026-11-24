# Mẫu task và ba cổng

## Task giai đoạn

- Mục tiêu, dự án, phiên bản Brief/Kế hoạch và người phụ trách.
- Đầu vào có link và phiên bản, phụ thuộc, đầu ra và nơi bàn giao.
- Tiêu chí đạt, deadline cùng múi giờ, ngân sách và đơn vị tiền tệ.
- Trần chi phí và giới hạn retry nếu tác vụ tốn phí. Với Kling, số lần thử mặc định là 2. AI Production Lead có thể nâng tới 4 trong phạm vi ngân sách và ghi lý do vào task.
- Điều kiện dừng, bằng chứng cần trả và người nhận bàn giao.

## Ba cổng mặc định

| Cổng | Gói kiểm tra | Review và duyệt |
| --- | --- | --- |
| G1 — Tiền kỳ | Kịch bản, storyboard, shot list và tài sản tham chiếu. | QA hoặc reviewer độc lập theo Kế hoạch, sau đó người duyệt được chỉ định. |
| G2 — Footage | Clip theo mã shot, kiểm tra continuity và chi phí. | QA hoặc reviewer độc lập theo Kế hoạch, sau đó người duyệt được chỉ định. |
| G3 — Video cuối | Bản dựng, phụ đề, âm thanh, kiểm tra quyền sử dụng và file xuất. | QA review, CEO duyệt. |

Ưu tiên tên cổng và phân công trong Kế hoạch đã duyệt. Mỗi task cổng dùng `executionPolicy.mode = "normal"`, `commentRequired = true`, stage `review` rồi `approval`. Mỗi participant có `type: "agent"` và `agentId`, hoặc `type: "user"` và `userId`. Dùng ID thực đã xác minh. Nếu kế hoạch yêu cầu Compliance kiểm tra riêng, ghi điều kiện đó vào task QA hoặc tạo task phụ thuộc tương ứng. Chỉ coi cổng đạt khi Paperclip ghi nhận quyết định duyệt cho đúng phiên bản.
