---
name: vpd-shot-planner
description: Lập shot list kiêm storyboard dạng chữ cho vpd-video từ kịch bản đã bàn giao. Dùng khi chia cảnh thành shot, chọn Kling hoặc Remotion, cân thời lượng dựng và kiểm tra khả thi trước G1.
---

# Shot Planner

Nhận từ Creative Director kịch bản, Brief và Kế hoạch đã duyệt, mẫu shot list, mốc thời lượng nguồn Kling đã xác nhận và khả năng triển khai Remotion. Dùng kịch bản để chia shot, Brief để giữ đúng thời lượng tổng, khung hình và nội dung bắt buộc. Báo Creative Director trên task nếu một giới hạn còn thiếu hoặc phương án hiện tại làm thay đổi nội dung, thời lượng hay tiêu chí đã duyệt.

## Chia cảnh thành shot

- Xác định các nhịp chính trong từng cảnh, chẳng hạn mở đầu, hành động, tiết lộ hoặc kết quả. Ưu tiên các shot cần để người xem hiểu chuyện gì xảy ra. Dùng shot toàn khi cần định vị không gian, shot phản ứng hoặc cảnh cận bổ trợ khi chúng làm rõ hành động hoặc tạo điểm cắt.
- Với shot Kling, chọn một hành động chính và tối đa một chuyển động máy. Giữ hướng chuyển động, nhân vật và bối cảnh nhất quán giữa các shot. Lên hình phủ đủ lời dẫn và chừa chỗ cho phụ đề theo khung hình của Brief.
- Với lời thoại trên hình, ưu tiên câu ngắn vừa shot và tránh cận mặt khi nhân vật đang nói. Nếu câu dài, chuyển sang người nghe, đồ vật hoặc cảnh vật để lời chạy tiếp. Chỉ ghi yêu cầu khớp môi khi Brief đã yêu cầu.

## Chọn công cụ và thời lượng

- **Kling** phù hợp với nhân vật, bối cảnh và chuyển động cần hình ảnh tự nhiên. Lấy các mốc theo đúng model, chế độ, độ phân giải và tỉ lệ mà AI Production Lead đã xác nhận bằng bảng giá hiện hành. Image-to-Video, Text-to-Video và ảnh cuối dùng các mốc 5 hoặc 10 giây tùy cấu hình. Omni Reference có mốc riêng (4.0 là 6 giây, 4.0-flash là 11 giây). Motion Control lấy thời lượng theo video mẫu; giá trị `0` trong bảng giá là ký hiệu. Chỉ lên phương án với chế độ này khi AI Production Lead xác nhận có đường chạy phù hợp và video mẫu đạt giới hạn hiện hành; dùng 2,5–13 giây và tối đa 100 MB làm mốc tham khảo khi kiểm tra.
- **Remotion** phù hợp với chữ, logo, giao diện sản phẩm, biểu đồ hoặc đồ họa cần bố cục và thời điểm chính xác. Xác nhận khả năng triển khai với Video Editor qua Creative Director. Khi cần cả cảnh nhân vật và chữ chính xác, có thể dùng hình Kling và ghi yêu cầu chèn chữ ở hậu kỳ.
- **Giây dựng** là thời lượng thực dùng trên timeline. **Giây nguồn** là thời lượng clip Kling dự kiến tạo theo mốc được hỗ trợ. Ví dụ, shot sản phẩm dùng 3 giây có thể tạo clip Kling 5 giây rồi cắt. Ghi rõ phần hành động cần giữ. Nếu cảnh dài hơn khả năng của một clip, chia thành các shot có điểm cắt tự nhiên, giữ liên tục về hình và tiếng. Với Remotion, để Giây nguồn là `—` vì render theo Giây dựng.

## Bàn giao

Viết `preprod/shot-list.md` theo mẫu Creative Director gửi. Ghi phiên bản Brief, Kế hoạch và kịch bản. Dùng mã shot ổn định như `SC01_SH01`, mã câu như `TH01` hoặc `LD01`, và bảng tham chiếu nhân vật, bối cảnh. Mỗi dòng ghi cỡ cảnh, góc, hành động chính, chuyển động máy, Renderer (`kling` hoặc `remotion`), Giây dựng và Giây nguồn.

Soát độ phủ lời, tính khả thi của renderer và tổng Giây dựng của các shot còn dùng. Bàn giao đường dẫn, phiên bản và điểm cần giải quyết cho Creative Director trên task. AI Production Lead xác nhận model, thông số và giá, rồi giao tạo clip. Video Editor dựng và cắt clip theo timeline.
