# Sửa theo lỗi nhìn thấy trên clip

Xem clip và vài khung hình trích ra trước khi quyết định. Mỗi lần chỉ đổi **một** yếu tố, để biết yếu tố
nào có tác dụng. Ghi lỗi, cách sửa và kết quả vào task của shot.

| Lỗi | Nguyên nhân hay gặp | Sửa lần 1 | Vẫn lỗi |
|---|---|---|---|
| Mặt, tóc, áo nhân vật đổi giữa clip | Prompt tả lại nhân vật; quay đầu, xoay người mạnh; cảnh xa mặt nhỏ | Bỏ mô tả ngoại hình khỏi prompt, thêm "face and outfit stay the same"; giảm động tác quay | Đổi ảnh đầu sang góc gần với hướng nhìn cuối hành động; báo Character & Consistency nếu ảnh tham chiếu chưa đủ góc |
| Nhân vật khác shot trước | Ảnh đầu khác phiên bản tham chiếu; ánh sáng mô tả khác | Dùng đúng ảnh tham chiếu đã duyệt, cùng cụm từ ánh sáng | Dùng khung cuối shot trước làm ảnh đầu (nếu liền mạch) |
| Chữ/logo trên sản phẩm méo, đổi | Kling vẽ lại chữ khi vật xoay hoặc máy di chuyển nhiều | Giảm chuyển động máy, giữ vật gần như đứng yên, thêm "printed text stays exactly the same" | Chuyển sang shot tĩnh + chèn chữ ở hậu kỳ (báo Yan nếu đổi shot list) |
| Làm thừa hành động, hành động sai | Prompt nhiều động từ; thời lượng dài so với hành động | Còn một động từ chính, thêm "then stays still" | Rút Giây nguồn về 5s nếu đang 10s |
| Không chuyển động / gần như ảnh tĩnh | Prompt quá chung, toàn ràng buộc | Thêm động từ cụ thể và tốc độ ("slowly lifts") | Thêm chuyển động máy nhẹ (slow dolly in) |
| Chuyển động máy sai hướng | Tả máy mơ hồ | Dùng đúng cụm trong bảng từ vựng máy quay, một chuyển động | Static camera, để chuyển động ở chủ thể |
| Xuất hiện người/vật lạ | Bối cảnh mô tả rộng | Thêm "no other people appear", tả bối cảnh hẹp lại | Đổi ảnh đầu có bối cảnh trống hơn |
| Tay, ngón tay biến dạng | Tương tác tay phức tạp | Đơn giản hóa động tác tay, cỡ cảnh xa hơn một bậc | Cắt sang shot không thấy tay khi dựng (báo Video Editor qua Yan) |
| Miệng cử động sai lúc (shot thoại) | Không nêu thời điểm nói | "speaks at the start of the clip for about N seconds, then closes his mouth" | Để Video Editor khớp bằng cắt cảnh theo luật thoại; không tốn thêm lượt |
| Bị từ chối (`fix_prompt_or_image`) | Từ ngữ hoặc ảnh bị bộ lọc chặn | Viết lại câu trung tính, bỏ từ nhạy cảm; kiểm tra ảnh | Báo Yan nếu nội dung bắt buộc theo Brief |

## Khi nào dừng

- Đã dùng hết 4 lượt cộng dồn của shot mà chưa đạt: báo Yan (cấp 3) kèm các phiên bản, lỗi còn lại và
  đề xuất (đổi shot, chấp nhận phiên bản tốt nhất, chuyển hậu kỳ xử lý).
- Lỗi do shot list hoặc tham chiếu (hành động không vừa 5–10s, mô tả nhân vật thiếu): báo Yan ngay, không
  tiêu thêm lượt.
- Sửa làm đổi đầu ra đã cam kết (tỉ lệ, độ phân giải, thời lượng tổng): báo Yan trước.
