# VPD OFFICE 3D — ART DIRECTION & VISUAL PRODUCTION BIBLE

> **Tên hiển thị giai đoạn D4:** LowTech Office. Giữ nguyên package ID, route, mặt bằng R3 và phong cách Stylized Tycoon Office. Nền gạch tối ngoài đế, đế có viền sáng ấm, nội thất sáng hơn nền; nhãn phòng lấy số agent runtime. Chất lượng hình ảnh và asset nhân vật cuối vẫn cần CEO duyệt, không coi bản D4 hiện tại là chuẩn production.

> **Tên tài liệu:** `ART_DIRECTION.md`  
> **Phiên bản:** 1.0 — 25/11/2026  
> **Phong cách CEO đã chọn:** **C — Stylized Tycoon Office**  
> **Sản phẩm:** plugin **Office** của Paperclip, ưu tiên công ty **VPD-Video**  
> **Tính chất:** tài liệu chỉ đạo mỹ thuật và đặc tả giao nhận cho Codex/3D artist; **không phải lệnh triển khai ngay**  
> **Tài liệu nền:** `Thiết kế VPD Office 3D (plugin Paperclip).md`, `VPD_Office_3D_Thiet_ke_chi_tiet_v1.0.md`, `VPD_Office_3D_Codex_Quy_trinh_va_Prompts.md`.  
> **Ảnh chọn phong cách:** ảnh do CEO gửi trong cuộc trò chuyện ngày 25/11/2026, thẻ **“C. Stylized Tycoon Office”**. Có thể lưu bản sao làm ảnh tham khảo trong `docs/design/references/`; không sao chép logo, nhân vật, không gian hoặc asset của sản phẩm trong ảnh.

---

## 0. CÁCH ĐỌC VÀ THỨ TỰ QUYẾT ĐỊNH

Tài liệu này **bổ sung lớp mỹ thuật** cho bản thiết kế kỹ thuật v1.0; không thay thế kiến trúc plugin, dữ liệu Paperclip hoặc các quyết định đã chốt.

| Nhãn | Ý nghĩa | Cách Codex xử lý |
|---|---|---|
| **[CEO-LOCKED]** | CEO đã quyết trong đặc tả nền hoặc đã chọn trực tiếp trong cuộc trò chuyện | Bắt buộc giữ; không tự ý sửa |
| **[SOURCE-BASELINE]** | Chi tiết xuất phát từ tài liệu nền, chưa có bằng chứng được CEO duyệt riêng | Kế thừa mặc định; nêu rõ nếu điều chỉnh |
| **[AI-DESIGN]** | Quy chuẩn mỹ thuật/kỹ thuật do AI đề xuất để vận hành nhất quán | Codex được tối ưu trong giới hạn, phải có bằng chứng |
| **[CEO-PENDING]** | Hạng mục cần duyệt sản phẩm mẫu trước khi coi là final | Không khẳng định đã được duyệt; dùng placeholder có đánh dấu |
| **[VERIFY-FORK]** | Chi tiết phụ thuộc SDK/loader/renderer trong fork Paperclip thực tế | Kiểm tra source và runtime trước khi triển khai |

### 0.1. Các quyết định bất biến

1. **[CEO-LOCKED]** Office là **plugin Paperclip** có trang và mục sidebar riêng; không phải phần mềm quản lý độc lập.
2. **[CEO-LOCKED]** Office **chỉ quan sát**. Duyệt, giao việc và cập nhật issue thực hiện trong Paperclip.
3. **[CEO-LOCKED]** **GLB low-poly có animation từ đầu**. 2D chỉ dùng fallback.
4. **[CEO-LOCKED]** Có **phòng CEO** (ghế CEO trống, **không có avatar CEO**), phòng PM và **khu nghỉ chung**; không dựng trạm công cụ hoặc kho tài sản.
5. **[CEO-LOCKED]** Yan mang hồ sơ lên phòng CEO, đặt khay, rồi về bàn. Hồ sơ ở lại đến khi Paperclip có quyết định.
6. **[CEO-LOCKED]** Hai người: tin nhắn hoặc đứng sát tùy ngữ cảnh; ba người **cùng phòng**: họp tại phòng ban; ba người **khác phòng**: họp tại phòng họp. Chỉ mô phỏng cuộc họp khi có dữ liệu workflow đủ xác thực.
7. **[CEO-LOCKED]** Agent di chuyển vì sự kiện thật của Paperclip; ngoại lệ duy nhất là nghỉ khi rảnh; plugin tắt không ảnh hưởng công việc.
8. **[CEO-LOCKED — lựa chọn mới]** Hướng mỹ thuật cuối cùng ở cấp **concept** là **Stylized Tycoon Office**: văn phòng game mô phỏng thu nhỏ, nhân vật dễ thương đầu hơi lớn, cử chỉ biểu cảm dễ đọc, màu ấm và nội thất cách điệu.

### 0.2. Phạm vi quyền tự thiết kế của AI

- **Được đề xuất và tối ưu:** palette HEX, vật liệu, đèn, phối cảnh, tỷ lệ đồ vật, chi tiết bàn ghế, phân bổ đồ trang trí, silhouette, rig-compatible props, easing/animation blending, layout đồ họa trạng thái, tổ chức file asset.
- **Chưa được tự coi là chốt:** bảng màu/ngoại hình sản xuất cuối của **12 nhân vật**, mẫu 3D hoàn chỉnh, 5 phút để nghỉ, nhắc hồ sơ sau 2 heartbeat, mô hình nhiều công ty. Các mục này vẫn theo nhãn **[CEO-PENDING]** của tài liệu nền.
- **Không được tự ý:** thay đổi bảy phòng, thêm khu chức năng đã loại bỏ, đổi số/vai trò agent, tạo hành vi giả trên Paperclip, thay đổi cơ chế phê duyệt hoặc quy trình PM.

### 0.3. Vị trí trong workflow

- **G0:** khảo sát plugin SDK và khả năng tải GLB — theo playbook kỹ thuật.
- **G0.5 — Visual Approval:** xây moodboard, concept, character board, room board và sample render theo tài liệu này; **dừng trình CEO duyệt** trước khi coi tài sản mỹ thuật là production-ready.
- **G1:** dựng layout + asset 3D theo artwork đã duyệt.
- **G2–G5:** kết nối dữ liệu, hành vi/animation, UI/QA, tích hợp sản phẩm. **Art Direction không được vượt quyền workflow kỹ thuật.**

---

## 1. TẦM NHÌN MỸ THUẬT (CREATIVE NORTH STAR)

### 1.1. One-sentence vision

> **Một văn phòng công ty sản xuất video AI thu nhỏ như game quản lý Tycoon: ấm áp, vui mắt, có cá tính, nhưng đủ gọn và rõ để CEO nhận biết tình trạng dự án trong vài giây.**

### 1.2. Năm tính từ phải luôn đúng

1. **Tycoon-like:** gợi cảm giác quản trị một công ty đang hoạt động.
2. **Miniature:** mô hình sa bàn cắt lớp, nhìn toàn cảnh được cả phòng và người.
3. **Warm:** ánh sáng ấm dịu, gỗ sáng, nội thất thân thiện.
4. **Readable:** chức năng phòng, nhân vật và trạng thái dễ phân biệt từ camera tổng.
5. **Alive but truthful:** có nhịp sống qua animation có dữ liệu; **không di chuyển ngẫu nhiên để làm cảnh**.

### 1.3. Thước đo cảm xúc

| Thuộc tính | Mục tiêu | Tránh |
|---|---|---|
| Sự đáng yêu | Vừa phải, nhân vật gần gũi | Chibi quá mức, biểu cảm trẻ con |
| Chuyên nghiệp | Có phân cấp CEO/PM/phòng ban | Cảm giác văn phòng đồ chơi không nghiêm túc |
| Mật độ chi tiết | Có props đặc trưng theo nghề | Vật dụng bày kín mặt bàn, clutter |
| Tương phản | Nhìn rõ trạng thái, text, mặt nhân vật | Hiệu ứng phát sáng át thông tin |
| Chuyển động | Cử chỉ ngắn, có ý nghĩa | Nhảy múa, chạy vòng, teleport tùy tiện |

### 1.4. Phân tích ảnh tham khảo CEO chọn

- Cảm giác chủ đạo: **văn phòng 3D ấm kiểu game tycoon, góc nhìn chéo từ trên, nhiều khu làm việc trong một sa bàn**, đèn bàn và gỗ tạo chiều sâu.
- Điểm nên học: **tỷ lệ nhân vật dễ đọc**, bố cục bàn làm việc rõ nghề, màu sắc khác nhau nhưng có nền chung, ánh sáng tạo sự gần gũi.
- Điểm **không** sao chép: logo/chữ trong ảnh, thiết kế nhân vật cụ thể, cách bài trí và đồ họa độc quyền. Concept phải phát triển nhận diện **VPD-Video độc lập**.
- Ảnh chỉ dùng làm **visual mood reference**, không thay các bản vẽ kỹ thuật, thông số màu hay hợp đồng GLB.

---

## 2. NGÔN NGỮ HÌNH KHỐI (SHAPE LANGUAGE)

### 2.1. Kiểu hình học

- **[AI-DESIGN]** Low-poly stylized, silhouette chắc, ít mặt phẳng vụn, bo cạnh bằng bevel nhỏ hoặc cách tạo khối hợp lý.
- Ưu tiên khối **hộp bo góc, trụ ngắn, hình thang mềm, góc vát**; tránh cạnh siêu sắc kiểu kiến trúc thực tế.
- Các khối đặc trưng (màn hình, tablet, hồ sơ, ghế) được **phóng đại nhẹ vì tính dễ nhìn**, không biến thành caricature quá mức.
- Silhouette phải phân biệt được khi render nhỏ ở camera tổng; chi tiết nhỏ phụ trợ, không mang thông tin bắt buộc.

### 2.2. Tỷ lệ khởi đầu (chưa phải thông số asset đã duyệt)

| Thành phần | Tỷ lệ/đặc điểm **[AI-DESIGN]** |
|---|---|
| Nhân vật | Đầu chiếm khoảng **20–24% tổng chiều cao**; tỷ lệ đầu : thân khoảng **1 : 4,5 đến 1 : 5** |
| Nhân vật Yan | Có thể cao hơn nhân viên 0–5%; ưu tiên vest/clipboard và điểm nhấn silhouette thay vì tăng kích cỡ |
| Bàn | Mặt bàn dày và cạnh bo rõ hơn thực tế một chút |
| Màn hình | Tăng kích cỡ thị giác khoảng 10–20% nếu cần nhìn thấy task/status |
| Ghế | Backrest/armrest cách điệu, điểm đặt hip/pelvis rõ để rig ngồi đúng |
| Cốc, clipboard, tai nghe | To hơn tỷ lệ thực tế vừa đủ để nhận ra ở góc nhìn tổng |
| Cây, kệ, tủ | Càng xa vùng tương tác chính càng có thể nhiều chi tiết hơn |

**Chốt cuối tỷ lệ bằng render thực ở 1366×768 và 390×844, không chốt chỉ bằng hình phóng to.**

### 2.3. Những điều cấm về phong cách

- Không photorealistic/PBR bóng loáng, không cyberpunk/neon, không anime hoặc chibi cực đoan.
- Không outline đen dày toàn cảnh nếu làm rối không gian; viền tối mảnh chỉ khi tăng khả năng đọc.
- Không hình ảnh thương hiệu/bảng hiệu có bản quyền từ ảnh tham khảo.
- Không sáng tạo thêm nhân vật CEO hoặc NPC đi lang thang.

---

## 3. HỆ THỐNG MÀU (COLOR TOKENS)

> **Tất cả HEX dưới đây là [AI-DESIGN]** cho concept Stylized Tycoon Office. CEO đã duyệt **hướng mỹ thuật**, **chưa duyệt từng mã HEX** hoặc bảng nhân vật cuối.

### 3.1. Màu không gian chung

| Token | HEX | Dùng cho |
|---|---|---|
| `vpd.cream` | `#F8F6ED` | Nền chung của sa bàn, vùng sàn trung tính |
| `vpd.ivory` | `#F2EEE5` | Tường, background UI |
| `vpd.beige` | `#E7DCC8` | Sàn phụ, cạnh tường, vật liệu vải trung tính |
| `vpd.woodLight` | `#C99B69` | Bàn, kệ gỗ và khu CEO |
| `vpd.warmAmber` | `#FFCA80` | Điểm nhấn ánh sáng/đạo cụ ấm |
| `vpd.mint` | `#8ED3C5` | Điểm nhấn thân thiện, cây và lounge |
| `vpd.lavender` | `#9279CF` | Điểm nhấn hậu kỳ |
| `vpd.charcoal` | `#39465C` | Chữ, chi tiết, phần tối silhouette |
| `vpd.steel` | `#8D8578` | Phụ kiện kim loại matte, khung màn hình |

### 3.2. Màu nhận diện tổ chức — kế thừa **họ màu** từ tài liệu nguồn

| Phòng/nhóm | Nhận diện trong nguồn | Token HEX **[AI-DESIGN]** | Phạm vi sử dụng |
|---|---|---|---|
| CEO | Không quy định màu áo, không có avatar | `#B9814A` — nâu hổ phách | Viền thảm, khay hồ sơ, bảng chữ **không** dùng màu đỏ thông thường |
| PM/Yan | Xám than | `#596574` | Vest Yan, dải nhận diện phòng PM |
| Sáng tạo | Vàng mù tạt | `#E2B45C` | Áo 3 agent, viền phòng, bảng storyboard |
| Sản xuất AI | **Xanh dương** | `#5A98D0` | Áo 4 agent, viền sàn, màn hình phụ |
| Hậu kỳ | **Tím** | `#947ED0` | Áo 3 agent, viền sàn, bảng timeline |
| QA | **Xanh ngọc** | `#4DA9A0` | Áo QA, viền phòng, checklist |
| Khu nghỉ | Trung tính | `#9BBF91` | Sofa, chậu cây, gối và vật liệu mềm |

**Quy tắc:** Màu nhận diện phòng ban **không** được dùng thay thế thông tin `working/error/paused`. AI Production vẫn thuộc họ **xanh dương**, QA vẫn thuộc họ **xanh ngọc**, không đảo màu chỉ vì ảnh tham khảo.

### 3.3. Màu trạng thái nghiệp vụ

| State | Màu **[AI-DESIGN]** | Bắt buộc thêm |
|---|---|---|
| `idle` | `#99A0AA` (xám) | Biểu tượng rảnh hoặc text trong panel |
| `working` | `#43B7EE` (xanh trời) | Icon làm việc + mã task |
| `meeting` | `#5E70C9` (chàm) | Icon hội thoại + issue/session |
| `error` | `#D94C4C` (đỏ) | Icon cảnh báo + nguyên nhân từ run |
| `paused` | `#7C828B` (xám có gạch chéo) | Icon pause, màn hình tắt |
| `approval_pending` | `#D94C4C` (đỏ) | Áp dụng **riêng** khay/bảng hồ sơ CEO, không biến Yan thành `error` |
| `unknown/stale` | `#BF963D` (vàng hổ phách) | Banner `Chưa đồng bộ/Mất kết nối` |

**[SOURCE-BASELINE]** Màu **đỏ dành cho lỗi và hồ sơ chờ CEO**. Không dùng đỏ để trang trí bàn ghế, nhấn hover thông thường hoặc báo agent bận.

### 3.4. Luật phối màu tổng thể

- **70/20/10 [AI-DESIGN]:** ~70% nền trung tính (cream/ivory/beige), ~20% vật liệu gỗ/sàn/vải, ~10% điểm nhấn phòng ban và tương tác.
- Màu áo agent cần tương phản với sàn phòng; tên agent và vòng trạng thái phải đọc được ở camera tổng.
- Không dùng glow lớn liên tục; chỉ pulse nhẹ cho trạng thái cần chú ý và có tùy chọn giảm chuyển động.
- Text overlay sử dụng màu có đủ tương phản; không dựa duy nhất vào màu để hiểu trạng thái.

---

## 4. VẬT LIỆU, TEXTURE VÀ CHIẾU SÁNG

### 4.1. Vật liệu chủ đạo

- **Matte** hoặc bán mờ; không dùng sàn gương.
- Gỗ: tông vàng nâu sáng, vân rất nhẹ, tránh texture chụp ảnh.
- Kim loại: xám ấm ít phản chiếu; màn hình có lớp kính tối giản.
- Vải: sofa/ghế texture đơn giản hoặc color blocks, không dệt siêu chi tiết.
- Plastic/game props: màu phẳng, roughness cao, bevel rõ.
- Không gian có thống nhất **visual roughness** để nhân vật và nội thất có cảm giác chung một bộ asset.

### 4.2. Ánh sáng

| Yếu tố | Tiêu chuẩn đề xuất **[AI-DESIGN]** |
|---|---|
| Key light | Directional rộng, ấm nhẹ, hướng đổ bóng dễ đọc |
| Fill/ambient | Đủ mạnh để mặt nhân vật không chìm tối |
| Color temperature | Cảm giác ánh sáng ban ngày ấm; không ép Kelvin khi renderer chưa kiểm chứng |
| Shadow | Mềm, vừa phải; ưu tiên contact shadow/ambient occlusion nhẹ |
| Màn hình | Chỉ sáng vừa đủ nhận diện trạng thái, tránh bloom mạnh |
| Đèn phòng | Accent thấp, không lấn át vòng trạng thái |
| Mobile | Có preset ít/tắt bóng, vẫn giữ nhận diện nhân vật |

**Không để ánh sáng tạo thành dữ liệu giả:** đèn dự án CEO xanh/vàng/đỏ phải lấy từ báo cáo Yan có nguồn; khi chưa có báo cáo, hiển thị `unknown`, không dùng màu xanh mặc định.

### 4.3. Pipeline hiển thị

- Chọn quy ước màu sRGB/linear nhất quán trong engine; không tự áp nhiều lớp tone mapping/Color Grading làm sai bảng màu.
- Lưu ảnh kiểm chứng trên thiết bị với một preset màu thống nhất. Chi tiết output color space, exposure và tone mapping phải được kiểm bằng render thật trước khi khóa.
- Texture tối ưu bằng atlas và format tương thích; material quá nhiều variant làm tăng draw calls.

---

## 5. MẶT BẰNG VÀ BỐ CỤC VĂN PHÒNG

### 5.1. Không gian nguồn phải giữ

**[SOURCE-BASELINE]** Sàn **34 × 24 m**; **7 phòng** + **khu nghỉ chung**. Tọa độ thiết kế kỹ thuật dùng **X/Z là mặt phẳng**, Y là chiều cao, sàn x = −17…17, z = −12…12; bố cục cụ thể lấy từ bản thiết kế v1.0. **Không đổi vị trí và số lượng phòng trong bước Art Direction.**

| Khu | Kích thước theo tài liệu kỹ thuật | Mục tiêu đọc được từ camera tổng |
|---|---|---|
| Phòng họp | 10 × 7 m, dãy trên bên trái | Bàn tròn + ghế, thấy ngay vị trí họp |
| Sáng tạo | 12 × 7 m, dãy trên giữa | 3 workstation, storyboard, sắc vàng mù tạt |
| Sản xuất AI | 12 × 7 m, dãy trên phải | 4 workstation, sắc xanh dương |
| CEO | 6 × 7 m, dãy dưới bên trái | Ghế trống, khay hồ sơ, bảng chờ, đèn dự án |
| PM | 6 × 7 m, dãy dưới cạnh CEO | Bàn Yan rõ và dễ focus |
| Hậu kỳ | 12 × 7 m, dãy dưới giữa | 3 workstation, màn hình timeline, sắc tím |
| QA | 10 × 7 m, dãy dưới phải | 1 workstation, checklist, sắc xanh ngọc |
| Khu nghỉ | 10 × 4 m ở giữa | 2 sofa, bàn tròn, máy cà phê, cây xanh |

### 5.2. Quy tắc kiến trúc isometric tycoon

- Sa bàn mở từ trên xuống với **tường thấp/ẩn theo camera**, nội thất nhìn xuyên được.
- Dùng sàn/gờ chân tường nhận diện khu vực; không phủ toàn bộ phòng bằng màu bão hòa.
- Cửa mở ra hành lang; giữ đường đi thông thoáng. Không có hoạt ảnh đi xuyên vật thể.
- Camera tổng phải đọc được **CEO / PM / Creative / AI Production / Post / QA / Meeting / Lounge** trước khi zoom.
- **Waypoints/collider/door anchors** là ràng buộc kỹ thuật, artist không được đặt chậu cây hoặc nội thất chắn đường đi.
- Không tự thêm cửa phụ, cầu thang, tầng mới, trạm công cụ hay kho asset.

### 5.3. Mật độ chi tiết

**[AI-DESIGN]** Mỗi phòng dùng: 1–2 props nhận diện nghề nghiệp nổi bật; 2–4 props phụ trang trí; không bắt buộc tái hiện mọi vật dụng văn phòng thật. Ưu tiên khoảng trống cho agent làm việc, đứng và họp. Những chi tiết nhỏ không nhìn thấy ở camera tổng được gộp vào texture/normal hoặc lược bỏ.

---

## 6. DESIGN SHEETS — TỪNG PHÒNG

### 6.1. CEO Office — nơi ra quyết định

- **Mood:** quản trị, ấm, tin cậy, hơi cao cấp hơn các khu khác; không biến thành phòng xa hoa tách rời concept.
- **Bắt buộc:** bàn CEO lớn vừa phải, ghế trống, khay hồ sơ, bảng chờ duyệt, đèn trạng thái theo báo cáo Yan.
- **Hero props:** **khay hồ sơ** và **bảng tường**, phải rõ kể cả khi các props phụ bị tắt ở preset Performance.
- **Animation anchor:** vị trí Yan dừng, động tác đưa hồ sơ, lối về bàn PM; không có NPC CEO.
- **Hồ sơ 3D:** tờ giấy đơn giản; text chi tiết xuất hiện ở **panel 2D** khi click, tránh chữ nhỏ trên mặt giấy 3D.
- **Không dùng:** nhạc nền riêng, đèn đỏ decorative, nút duyệt trực tiếp trong 3D.

### 6.2. PM Office — Yan

- Bàn điều phối, một hoặc hai màn hình, kẹp hồ sơ, bảng tiến độ nhỏ có thể trang trí bằng dữ liệu không nhạy cảm.
- Yan ở vị trí dễ nhận ra nhờ **vest xám than, clipboard và posture**, không chỉ vì kích thước.
- Đường sang phòng CEO và phòng họp không bị bàn/kệ chắn.
- Tránh bố trí như “trưởng phòng lớn” để làm lu mờ vai trò CEO: đây là **đầu mối điều phối**.

### 6.3. Creative Department — 3 agent

- **Màu nhận diện:** vàng mù tạt.
- **Props nghề:** bảng storyboard, sổ ghi chú, thẻ ý tưởng, khung ngắm hình ảnh.
- **Bàn làm việc:** 3 workstation; khu đứng họp nhỏ rõ ràng không chắn hành lang.
- **Cảm giác:** nhiều ý tưởng nhưng gọn; mỗi góc có một điểm nhấn công năng.

### 6.4. AI Production Department — 4 agent

- **Màu nhận diện:** xanh dương.
- **Props nghề:** màn hình hiển thị preview, drawing tablet, headsets, microphone tại bàn Voice & Audio.
- 4 workstation và điểm họp nội bộ; tỷ lệ màn hình phóng đại nhẹ nhưng không che nhân vật.
- **Không cần dựng server rack lớn**, vì sẽ làm người xem nhầm đây là data center.

### 6.5. Post-Production Department — 3 agent

- **Màu nhận diện:** tím.
- **Props nghề:** timeline edit trên màn hình, panel màu, waveform audio/monitoring, icon motion.
- 3 workstation + điểm họp sau picture lock; các màn hình dùng đồ họa trạng thái **không chứa dữ liệu giả trông giống task thật**.
- Đảm bảo nhận diện từng người bằng silhouette và props cá nhân dù cùng mặc màu tím.

### 6.6. QA Department — 1 agent

- **Màu nhận diện:** xanh ngọc.
- Props: clipboard/checklist, kính lúp hoặc biểu tượng kiểm tra chất lượng.
- Thiết kế gọn và rõ, không “ngồi trong phòng giám sát tối”.
- Không thể hiện chữ `PASS`/`FAIL` trên vật phẩm nếu chưa có dữ liệu thật; icon trang trí nên trung tính.

### 6.7. Meeting Room

- Bàn tròn 8 ghế, tối đa 4 vị trí đứng dự phòng **[AI-DESIGN]** theo thiết kế kỹ thuật.
- Bảng trình bày chỉ phản ánh sự kiện/issue được xác minh; nếu không có dữ liệu thì dùng mặt bảng trung tính.
- Khi nhiều người họp, camera tổng nhìn rõ được các vòng trạng thái mà không chồng nhãn.
- Không tự cho agent vào họp từ 3 comment liên tiếp; đó là trách nhiệm Business State Engine, không phải artist.

### 6.8. Lounge

- Hai sofa mềm cách điệu, bàn tròn, cây, máy cà phê; không gian ấm sáng, có đủ anchor cho tối đa 12 agent đứng/ngồi theo thiết kế.
- **Chỉ agent rảnh đủ điều kiện** mới đi tới lounge, không tạo hoạt ảnh tán gẫu giả.
- Chỗ ngồi và đứng phải tránh giao nhau; đồ trang trí có thể ẩn ở mobile.

---

## 7. CHARACTER BIBLE — 12 AGENT

### 7.1. Hướng thiết kế chung

- **Một base body + một bộ rig** dùng lại cho 12 nhân vật. Khác biệt qua color block, trang phục nhẹ, phụ kiện, tóc/tư thế và label.
- 3D **stylized cute, trưởng thành vừa đủ**: mắt/chân mày/miệng tối giản, không cần facial rig phức tạp trong MVP.
- Mỗi người nhận diện được khi **ẩn label ở góc nhìn gần** bằng ít nhất hai tín hiệu: màu phòng ban + silhouette/phụ kiện.
- Phụ kiện **không cản clip `typing`, `sit_idle`, `walk`, `give_document`**; không làm xung đột xương tay.
- **Không tạo CEO avatar**. Chữ trên nhãn phải dùng tên role thật từ Paperclip; tên trong bảng chỉ là cấu hình tham khảo.

### 7.2. Bảng nhận diện và phụ kiện — **SOURCE-BASELINE + AI-DESIGN**

| # | Agent | Nhóm/màu áo theo nguồn | Điểm nhận diện đề xuất | Pose mặc định |
|---:|---|---|---|---|
| 01 | **Yan (PM)** | Xám than | Vest gọn, clipboard, hơi cao hơn tối đa 5% | Đứng/ngồi tự tin; đưa hồ sơ |
| 02 | **Creative Director** | Vàng mù tạt | Thẻ trưởng phòng trắng, áo khoác ngắn | Duyệt storyboard |
| 03 | **Scriptwriter** | Vàng mù tạt | Sổ tay/sticky notes gần bàn | Gõ kịch bản |
| 04 | **Shot Planner** | Vàng mù tạt | Khung ngắm/camera framing card | Xem shot board |
| 05 | **AI Production Lead** | Xanh dương | Thẻ trưởng phòng trắng | Điều phối workstation |
| 06 | **Character & Consistency** | Xanh dương | Bảng vẽ/palette board | Xem character references |
| 07 | **Visual Generator** | Xanh dương | Tai nghe nhẹ | Xem preview |
| 08 | **Voice & Audio** | Xanh dương | Micro tại bàn, mic icon phụ kiện | Xử lý audio |
| 09 | **Video Editor** | Tím | Thẻ trưởng phòng trắng | Điều phối edit timeline |
| 10 | **Motion & Subtitle** | Tím | Bút trình chiếu/stylus | Gõ và xem motion |
| 11 | **Color & Sound Mix** | Tím | Tai nghe lớn | Mix âm thanh |
| 12 | **QA Reviewer** | Xanh ngọc | Kính lúp và clipboard | Kiểm checklist |

**[CEO-PENDING]** Bảng này **chưa thay thế Character Sheet cuối cùng**. Nếu CEO duyệt concept nhưng không duyệt từng outfit/prop, artist dùng bảng làm bản nháp có ghi `PROPOSED`.

### 7.3. Rig & transform contract

| Trường | Quy ước **[AI-DESIGN]** |
|---|---|
| Format | `.glb` (glTF 2.0) |
| Skeleton | Một skeleton hierarchy thống nhất, tên xương không đổi giữa biến thể |
| Origin | Gốc ở mặt đất, giữa hai chân, `y=0` khi đứng |
| Up axis | `+Y`; chiều nhìn về phía trước chọn một quy ước duy nhất rồi lưu trong manifest |
| Scale | 1 world unit = 1 m **trong scene**, chiều cao character test theo bàn/ghế thực |
| Skinning | Không weight lỗi, không xuyên áo/tóc khi làm việc |
| Anchor | `headAnchor`, `handRightAnchor`, `seatAnchor` khi cần; vị trí do code tính hoặc khai báo rõ |
| Clip names | Dùng đúng 9 tên trong bảng animation bên dưới |
| Avatar copy | Dùng clone phù hợp skinned mesh, không nhân bản rig sai khiến animation cùng lúc |

### 7.4. Nhận diện Yan

Yan là **đầu mối PM**, nên được nhận ra nhanh bằng vest xám than, clipboard và dáng đứng tự tin; **không** dùng vương miện, hào quang, vai trò CEO hoặc tỷ lệ quá lớn so với đồng nghiệp.

---

## 8. ANIMATION BIBLE

### 8.1. Chín trạng thái hoạt ảnh trong thiết kế nguồn

| ID | Clip khuyến nghị | Công dụng | Loop | Visual rule |
|---|---|---|---|---|
| A01 | `idle_stand` | Đứng cạnh bàn/đang chờ họp | Có | Chuyển động nhẹ, không xoay lung tung |
| A02 | `walk` | Di chuyển theo sự kiện | Có khi di chuyển | Không trượt chân, đi đúng waypoint |
| A03 | `typing` | Active run tại bàn | Có | Tay khớp bàn phím |
| A04 | `sit_idle` | Có task mở, không active run | Có | Không xuyên ghế/mặt bàn |
| A05 | `talk` | Comment/họp có nguồn | Ngắn | Không tự lip-sync hay giả audio người thật |
| A06 | `give_document` | Yan nộp hồ sơ, handoff hợp lệ | Một lần | Hồ sơ xuất hiện/được đặt đúng frame |
| A07 | `nod` | Đã duyệt hoặc nhận bàn giao | Một lần | Gật rõ ở camera gần, không kích hoạt giả |
| A08 | `error_reaction` | Run failed/hết ngân sách theo state | Một lần + hold | Không loop ôm đầu liên tục |
| A09 | `rest` | Agent đủ điều kiện nghỉ | Có | Ngồi nghỉ/uống cà phê vừa phải |

### 8.2. Transition chuẩn

- Khi rời ghế: **sit → stand → walk**; khi về bàn: **walk → stand/sit → typing/sit_idle**.
- Khi bị ngắt bởi sự kiện ưu tiên cao: hoàn thành hoặc ngắt động tác ở keyframe an toàn; **không teleport trừ trường hợp reconcile/reconnect**.
- Khi Yan đưa hồ sơ: prop có lifecycle `attached-to-hand → placed-on-tray → persistent-paper`. Hồ sơ đã được quyết trước khi animation xong thì hủy hành động thừa.
- `talk` chỉ là cử chỉ có nguồn, **không tạo âm thanh hoặc nội dung nói mới**.
- Khi sự kiện dồn: giữ **trạng thái cuối đúng** và có thể rút ngắn/bỏ animation trung gian; không được bỏ approval/error thực.

### 8.3. Nhịp điệu Tycoon **[AI-DESIGN]**

- Dùng easing mềm, chuyển động tự nhiên theo đồ họa game mô phỏng, không quá chậm/điệu.
- Cử chỉ truyền thông tin nên kéo dài đủ để đọc ở camera tổng; thông số thời lượng là biến cấu hình cần test.
- Không thêm nhảy, vẫy tay ngẫu nhiên, thổi bong bóng hoặc giao lưu vô căn cứ.
- Hỗ trợ `prefers-reduced-motion`: giảm hiệu ứng rung/pulse và camera easing nhưng **không che trạng thái**.

### 8.4. Thứ tự hiển thị tham khảo

`state error/paused` > `approval delivery xác thực` > `meeting/review xác thực` > `working/typing` > `idle/lounging`.

**Quan trọng:** Danh sách trên chỉ định ưu tiên **phản ứng hình ảnh**; source of truth của Business State Engine và quy tắc meeting trong đặc tả kỹ thuật vẫn là chuẩn. Không ghi trực tiếp một trạng thái làm việc mới chỉ vì animation vừa chạy.

---

## 9. CAMERA, BỐ CỤC VÀ TƯƠNG TÁC

### 9.1. Camera tổng

- **Orthographic isometric/top-down angled**, góc quan sát từ trên xuống khoảng **35–45° so với mặt sàn** **[AI-DESIGN]**.
- Toàn cảnh phải thấy 7 phòng + lounge; giữ bố cục sa bàn cân đối.
- Không tự bay camera theo mọi comment/run; chỉ focus khi người dùng chọn hoặc sau hành động navigation rõ ràng.
- Zoom có min/max tránh nhìn xuyên sàn hay mất khái niệm công ty.
- Tường phía camera có thể giảm alpha/cutaway khi che nhân vật, nhưng không làm sai collider/waypoint.

### 9.2. Các điểm nhìn cần dựng và chụp nghiệm thu

| ID | Camera | Yêu cầu |
|---|---|---|
| CAM-01 | Isometric toàn văn phòng | Nhận ra 7 phòng + lounge, đúng bố cục |
| CAM-02 | Focus phòng CEO | Khay giấy, ghế trống, bảng chờ rõ |
| CAM-03 | Focus Yan/PM | Nhận ra Yan, bàn, đường sang CEO |
| CAM-04 | Focus Creative | Ba agent, 3 bàn và storyboard |
| CAM-05 | Focus AI Production | Bốn agent và workstation |
| CAM-06 | Focus Post | Ba agent + ký hiệu timeline/audio |
| CAM-07 | Focus meeting | Không xuyên bàn/ghế, dễ đọc participant |
| CAM-08 | Mobile overview | Có thể pan/zoom, status không bị UI che hoàn toàn |

### 9.3. Điều khiển UX

- Hover/click agent: highlight nhẹ + thẻ trạng thái, không bắt đầu một tác vụ nghiệp vụ.
- Click phòng: camera focus + danh sách agent.
- Click khay hồ sơ: mở panel hồ sơ hoặc điều hướng trang duyệt **Paperclip thật**, không có nút duyệt trong Office.
- Nút: **Reset View**, Focus Room, Focus Agent, Focus Approvals; UI panel mở/đóng được.
- Trên mobile, camera gesture cần tránh xung đột với thao tác mở bottom sheet.

---

## 10. 2D OVERLAY — PHẢI ĐỒNG BỘ VỚI 3D

### 10.1. Phong cách UI

**[AI-DESIGN]** UI game quản lý sáng ấm: card bo 12–18 px, border mềm, bóng nhẹ, nền cream; font sans rõ và cỡ chữ đủ đọc. Không dùng UI neon cyberpunk hoặc chrome dashboard quá lạnh.

### 10.2. Bố cục dữ liệu

| Thành phần | Desktop | Mobile |
|---|---|---|
| Thanh tổng | Trên trái: số working/idle/error/paused, meeting, pending approvals | Thanh ngang cuộn |
| Hồ sơ CEO | Panel phải ưu tiên cao | Bottom sheet ưu tiên khi có pending |
| Thẻ agent | Panel phải ~340 px | Bottom sheet |
| Nhật ký sự kiện | Có thể thu gọn | Mở khi yêu cầu |
| Camera controls | Góc phải vùng 3D | Button chạm khoảng ≥44 px |
| Mất kết nối | Banner vàng + timestamp | Banner đầu trang |

### 10.3. Bố cục trạng thái agent

- **Vòng dưới chân** = màu `workState`, kèm icon glyph/shape, không dùng màu áo để biểu đạt.
- **Màn hình workstation** = working bật sáng, idle tối, paused tắt, error có tín hiệu rõ và text trạng thái trong panel.
- **Tên agent** = label dễ đọc và có chống chồng chữ; trên mobile chỉ hiển thị label khi chọn hoặc có sự kiện cần đọc.
- **Speech bubble** = nội dung comment thật đã sanitize, giới hạn độ dài nhìn thấy; không tự sáng tác lời thoại.
- **Unknown** khác **Idle**: dữ liệu chưa tải/mất kết nối không được hiển thị như agent rảnh.

### 10.4. Accessibility

- Thông điệp trạng thái phải có **ít nhất hai kênh**: màu + icon hoặc text.
- Không để hiệu ứng nhấp nháy mạnh khi error; hỗ trợ reduced motion.
- Label quan trọng vẫn đọc được khi bóng và đồ trang trí bị tắt.
- Text 3D trên bảng CEO chỉ hiển thị tiêu đề ngắn; chi tiết đọc ở panel HTML của Paperclip/plugin.

---

## 11. ASSET INVENTORY — NHỮNG THỨ CẦN THIẾT KẾ

### 11.1. Danh sách tối thiểu

| Nhóm asset | Số lượng mục tiêu | Ghi chú |
|---|---:|---|
| Base character GLB có rig | 1 | Chia sẻ cho 12 variants |
| Outfit/material/prop variants | 12 cấu hình | Phân biệt 12 agent; thiết kế không phá skeleton |
| Animation clips | 9 | Dùng chung và có transition |
| Workstation | 12 | 3 Creative + 4 AI + 1 PM + 3 Post + 1 QA |
| Bộ bàn/ghế CEO | 1 | Ghế **trống** |
| Bàn họp + ghế | 1 + 8 | Có slot đứng dự phòng nếu cần |
| Bộ lounge | 1 | 2 sofa, bàn tròn, cà phê, cây |
| Bộ hồ sơ CEO | 1 hệ | Tray + paper variants + wall board + indicator |
| Tường/sàn/cửa | Sinh từ layout/config | Không cần 1 GLB sàn cố định nếu khó chỉnh |
| Props phòng ban | 1–3 hero props/phòng | Ưu tiên silhouette dễ nhận diện |
| Status/UI sprites | 5 state + approval + unknown | Nhất quán với bảng màu |

### 11.2. Kiến nghị cấu trúc asset — **đề xuất**, chưa khẳng định repo hiện tại

```text
<plugin-root>/
  assets/
    characters/
      office_base.glb
      variants/
        yan.json
        creative_director.json
        ...
    animations/
      office_actions.glb
    furniture/
      workstation.glb
      ceo_desk.glb
      meeting_set.glb
      lounge_set.glb
    props/
      paper_tray.glb
      board.glb
      ...
    textures/
      palettes.ktx2
    manifests/
      asset-register.json
  config/
    art-tokens.json
    company-layout.json
```

Không tạo đường dẫn cố định trong repository trước khi G0 xác nhận cấu trúc plugin và bundler.

### 11.3. Asset manifest bắt buộc

Mỗi asset phải ghi: `assetId`, `file`, `purpose`, `sourceUrl`, `author`, `license`, `licenseUrl`, `attributionRequired`, `redistributionAllowed`, `modified`, `version`, `polyCount`, `textureBytes`, `checkedBy`, `status`.

**Không mặc định** Quaternius/Kenney/Mixamo hoặc asset tìm trên internet đều có thể đóng gói và phân phối lại. Nếu giấy phép chưa rõ, đánh dấu `HOLD-LICENSE`; dùng placeholder tự dựng khối cơ bản cho prototype.

---

## 12. QUY CHUẨN HIỆU NĂNG — MỤC TIÊU, CHƯA LÀ KẾT QUẢ

Các giá trị sau là **mục tiêu thử nghiệm kế thừa/tối ưu**, không được báo `PASS` nếu chưa đo trên thiết bị thật.

| Chỉ tiêu | Mục tiêu giai đoạn đầu | Đo như thế nào |
|---|---|---|
| Agent | 12 có rig/animation | Có 12 avatar không lỗi rig |
| FPS desktop | Hướng tới 60 FPS máy GPU tích hợp | FPS trung vị, p95 frame time, thiết bị ghi rõ |
| FPS mobile | Hướng tới 30 FPS điện thoại tầm trung | Đo thiết bị thật hoặc môi trường thử nghiệm công khai |
| Payload GLB/texture ban đầu | Thử nghiệm hướng tới <8 MB compressed | Kích thước tải network, không nhầm bundle size và GPU memory |
| Startup visual | Hiển thị trạng thái tải và cảnh sớm | Đo time-to-first-meaningful-scene |
| UI state freshness | Mục tiêu ≤2 giây khi đang kết nối ổn | So event timestamp và render timestamp ở Live Mode |
| Idle performance | Không render liên tục khi không có chuyển động/đổi state | Profiler + CPU/GPU hoạt động |
| Reconnect | Đồng bộ từ snapshot thật, không phát lại lịch sử | AT reconnect có logs |
| Mất WebGL | Fallback 2D đúng trạng thái | Test disable WebGL |

### 12.1. Biện pháp tối ưu ưu tiên

- Reuse skeleton/geometry/materials; dùng instancing cho furniture tĩnh lặp.
- Dùng texture atlas, KTX2/Basis hoặc Meshopt/Draco **chỉ khi toolchain hỗ trợ**.
- Thử preset chất lượng `High` / `Balanced` / `Performance`; preset Performance giảm bóng và props trang trí, **không được ẩn trạng thái công việc/hồ sơ**.
- Tạm ngừng/vòng lặp render tối thiểu khi tab bị ẩn; vẫn cập nhật lại snapshot đúng khi trở lại.
- Giảm mật độ label/speech bubbles khi zoom xa; danh sách issue vẫn đọc được trong panel.

---

## 13. VISUAL DESIGN SYSTEM CONFIG — JSON MẪU

> **Đây là cấu hình tham khảo [AI-DESIGN], không phải schema đã xác minh trong fork.** Codex có thể ánh xạ vào token/theme hiện có sau G0.

```json
{
  "schemaVersion": "1.0",
  "themeId": "vpd-stylized-tycoon-warm",
  "status": "concept-approved-tokens-proposed",
  "style": "Stylized Tycoon Office",
  "camera": {
    "mode": "orthographic",
    "elevationDeg": 40,
    "allowOrbit": true,
    "allowFocusRoom": true,
    "autoFocusOnEvents": false
  },
  "colors": {
    "background": "#F8F6ED",
    "wall": "#F2EEE5",
    "floorSecondary": "#E7DCC8",
    "wood": "#C99B69",
    "text": "#39465C",
    "departments": {
      "ceo": "#B9814A",
      "pm": "#596574",
      "creative": "#E2B45C",
      "aiProduction": "#5A98D0",
      "postProduction": "#947ED0",
      "qa": "#4DA9A0"
    },
    "states": {
      "idle": "#99A0AA",
      "working": "#43B7EE",
      "meeting": "#5E70C9",
      "error": "#D94C4C",
      "paused": "#7C828B",
      "approvalPending": "#D94C4C",
      "unknown": "#BF963D"
    }
  },
  "characters": {
    "baseRig": "office_base",
    "headRatioRange": [0.20, 0.24],
    "allowRandomAmbientWalking": false,
    "ceoAvatarEnabled": false
  },
  "ui": {
    "cardRadiusPx": 16,
    "defaultPanelWidthPx": 340,
    "useStateIcons": true,
    "useReducedMotion": true
  },
  "production": {
    "assetPayloadTargetMB": 8,
    "desktopFpsTarget": 60,
    "mobileFpsTarget": 30,
    "measured": false
  }
}
```

---

## 14. QUY TRÌNH ART PRODUCTION — TỪ CONCEPT TỚI ASSET

### G0.5-A — Moodboard & style frames

**Đầu vào:** file này + ảnh concept C do CEO chọn + bản thiết kế kỹ thuật v1.0.  
**Đầu ra cần giao:**

1. Moodboard 6–12 ảnh có nguồn/giấy phép rõ; mỗi ảnh ghi điều học hỏi, không dùng làm asset.
2. Một **overview style frame** 34 × 24 m với 7 phòng + lounge, camera isometric.
3. Một **CEO office style frame**, thấy rõ ghế trống, khay hồ sơ và điểm Yan đứng.
4. Một **character style frame** có Yan và 3 agent khác phòng ban, cùng một ngôn ngữ hình khối.
5. Palette sử dụng token tài liệu này, ghi phần nào là `AI-DESIGN`.

**Gate:** tất cả frame giữ đặc trưng Stylized Tycoon; không có CEO avatar; các phòng nhận diện được; chưa ép triển khai full asset trước CEO duyệt.

### G0.5-B — Character Sheet & Props Sheet

**Đầu ra:**

- Character sheet **12 agent** (front/side/isometric silhouette; màu phòng; props cá nhân; label đầy đủ).
- Một sample rig/animation `typing → stand → walk → give_document` để kiểm khả năng sử dụng chung skeleton (trong prototype nếu G0 xác nhận được import).
- Props sheet 7 phòng + lounge; list vật phẩm nào cần mô hình riêng, vật phẩm nào nên dựng primitive.

**Gate:** CEO duyệt **ngoại hình/ màu/ phụ kiện cuối** trước khi đánh dấu production-ready; nếu chưa duyệt thì chỉ `PROPOSED`.

### G0.5-C — Camera & readability checks

**Đầu ra:** ảnh ở CAM-01…CAM-08, ít nhất desktop 1920×1080, 1366×768 và mobile 390×844.  
**Gate:** phòng ban không lẫn nhau, Yan nhận diện được, status không lẫn màu phòng, khay hồ sơ không bị tường che, label không chồng không thể đọc.

### G1 — Asset production sau phê duyệt

1. Dựng base character/rig + 9 clips, xuất GLB hợp lệ.
2. Dựng nội thất/props theo danh sách đã duyệt, giữ collider/anchor.
3. Build scene bằng layout config, không hard-code logic nghiệp vụ vào GLB.
4. Chạy visual tests + performance tests; chỉ kiểm nhận nhiệm vụ theo bằng chứng.

### Quy tắc dừng

- Nếu CEO chưa duyệt board nhân vật, chỉ được tiếp tục **prototype/placeholder** (không báo `FINAL`).
- Nếu thiếu quyền phân phối asset, **dừng đưa asset đó vào bản build** và cung cấp phương án thay thế.
- Nếu phải đổi layout/đường đi/đặc tả đã khóa để đạt style, nêu rõ tradeoff và xin CEO quyết.

---

## 15. VISUAL ACCEPTANCE TESTS — CHECKLIST NGHIỆM THU

| ID | Kiểm thử | Tiêu chí PASS |
|---|---|---|
| V-01 | Đúng concept | Render như sa bàn quản lý tycoon ấm, không thành sci-fi/photoreal |
| V-02 | Tổng thể | 7 phòng + lounge nhận diện ở camera tổng |
| V-03 | CEO | Ghế CEO trống, khay và bảng hồ sơ rõ; không có avatar CEO |
| V-04 | PM | Yan có vest, clipboard, không nhầm CEO |
| V-05 | Nhân sự | Đủ 12 agent, đúng phòng/tên/nhóm màu theo baseline |
| V-06 | Màu trạng thái | Working/idle/meeting/error/paused có màu **và** icon khác nhau |
| V-07 | Red semantic | Không dùng đỏ decorative gây nhầm error/pending CEO |
| V-08 | Clarity | Character/props chính rõ ở 1366×768; không phải zoom mới hiểu toàn cảnh |
| V-09 | Mobile | Điều hướng được ở 390×844, không có panel che hết scene |
| V-10 | Rig | 12 variant dùng cùng animation không rách mesh hoặc vặn khớp |
| V-11 | Sit/typing | Không xuyên ghế/bàn; bàn tay khớp bàn phím |
| V-12 | Walk/path | Đi qua cửa/waypoint, không xuyên tường/nội thất |
| V-13 | Document handoff | Yan tới CEO, đặt hồ sơ, quay về bàn; không giữ ở phòng CEO |
| V-14 | No fictional events | Không tự đi họp/đi lại ngẫu nhiên, chuyển động có event hợp lệ |
| V-15 | Conference room | Họp hợp lệ của nhiều phòng ở phòng họp, cùng phòng ở khu phòng ban |
| V-16 | Read-only | Click vào giấy chỉ điều hướng Paperclip; không duyệt trực tiếp |
| V-17 | Overlay | Label, comment, approval hiển thị dễ đọc, không làm nhầm dữ liệu giả |
| V-18 | Responsiveness | Render trong điều kiện đo chuẩn, lưu FPS/p95 frame time/asset size |
| V-19 | Graceful failure | Asset/WebGL lỗi có fallback phù hợp và báo trạng thái, không bịa agent idle |
| V-20 | License | Mọi asset production có record nguồn, license và quyền phân phối |

**Cách báo cáo:** `PASS / FAIL / NOT VERIFIED` + screenshot hoặc video + file asset/log + cấu hình thiết bị. **Mock Mode không chứng minh hành vi Live Mode.**

---

## 16. NHỮNG SAI LẦM PHẢI TRÁNH KHI GIAO CODEX

1. **Không** yêu cầu Codex sinh ngay hàng chục GLB rồi mới chọn style.
2. **Không** xem ảnh AI render là mô hình GLB có rig hoặc asset sẵn dùng.
3. **Không** dùng screenshot tham khảo để copy nhân vật, poster/logo, UI game hiện hữu.
4. **Không** đổi nhận diện **AI Production từ xanh dương sang xanh ngọc** hoặc **QA từ xanh ngọc sang xanh đậm** mà không ghi rõ là thay đổi cần CEO duyệt.
5. **Không** làm phòng CEO thành một giao diện phê duyệt thứ hai trong Office.
6. **Không** dùng `random idle wander` hoặc agent nào cũng nói chuyện để tạo cảm giác sống động.
7. **Không** dựng chữ nhỏ trong GLB để thay panel Paperclip.
8. **Không** tuyên bố 60 FPS, 8 MB hoặc tương thích SDK khi chưa đo/test.
9. **Không** tự chạy chỉnh code core host chỉ vì cần một effect 3D đẹp hơn.
10. **Không** tự duyệt các phần `CEO-PENDING`.

---

## 17. PROMPT CODEx — CHỈ KHỞI ĐỘNG BƯỚC ART DIRECTION

> **Prompt sau chỉ dùng để yêu cầu Codex đọc, phân tích và lập kế hoạch G0.5, không cho phép sửa code hay generate asset production ngay.** Có thể sao chép nguyên văn vào Codex sau khi đã đặt tài liệu vào `docs/design/`.

```text
Bạn là 3D Art Director, Stylized Environment Artist, Character Technical Artist và Senior Frontend 3D Engineer.

WORKSPACE: D:\Code Part Two\qlda
ĐỌC BẮT BUỘC:
- docs/design/VPD_Office_3D_Thiet_ke_chi_tiet_v1.0.md
- docs/design/ART_DIRECTION.md
- docs/design/VPD_Office_3D_Codex_Quy_trinh_va_Prompts.md

CEO ĐÃ CHỌN: C — Stylized Tycoon Office.
Đừng chọn lại Minimal/Cozy/Neo-Tech. Chỉ phát triển cách thể hiện cụ thể bên trong phong cách Tycoon.

NHIỆM VỤ LẦN NÀY: CHỈ PHÂN TÍCH VÀ LẬP KẾ HOẠCH G0.5 — CHƯA VIẾT CODE, CHƯA TẠO MODEL, CHƯA CÀI DEPENDENCY.

1. Đọc ba tài liệu và trích xuất CEO-LOCKED, SOURCE-BASELINE, AI-DESIGN, CEO-PENDING và VERIFY-FORK.
2. Kiểm tra phạm vi G0.5: moodboard, overview style frame, CEO room frame, 12-agent character board, props/room sheets và camera readability shots.
3. Đề xuất thứ tự làm art concepts và những file cần tạo trong phạm vi plugin/doc, không thay đổi Paperclip Core.
4. Lập danh sách asset có thể tự dựng primitive và asset cần tìm nguồn; ghi cách kiểm license và nguồn tham khảo.
5. Đưa ra quality gates và cách chứng minh: image review / visual snapshots / GLB validator / animation tests / mobile readability.
6. Tách phần có thể dựng placeholder khỏi những thiết kế cuối cần CEO duyệt.
7. Báo rủi ro thiếu SDK/import GLB, giấy phép, thời gian và các quyết định đang chờ.

ĐẦU RA TRONG CHAT:
- Danh sách CEO-LOCKED và CEO-PENDING được bảo toàn.
- G0.5 Art Production Plan theo từng deliverable.
- Asset register đề xuất.
- Bảng Visual Acceptance Test.
- Rủi ro và blocker.
- Kết luận READY / NEEDS CLARIFICATION / BLOCKED.

DỪNG sau báo cáo. Không tự triển khai giai đoạn kế hoặc tạo asset/modify source trước khi tôi phê duyệt.
```

---

## 18. QUẢN TRỊ THAY ĐỔI VÀ PHÊ DUYỆT

### 18.1. Sổ phê duyệt mỹ thuật

| Quyết định | Trạng thái tại 25/11/2026 | Người quyết |
|---|---|---|
| Chọn hướng **Stylized Tycoon Office (C)** | **APPROVED — CEO-LOCKED** | CEO |
| Giữ plugin/read-only/GLB + 7 phòng/lounging/luật họp | **APPROVED — CEO-LOCKED** | CEO |
| Palette HEX trong tài liệu này | **PROPOSED** | CEO duyệt bản render trước production |
| Ngoại hình/màu/phụ kiện 12 agent bản cuối | **PENDING** | CEO |
| Phong cách nội thất chi tiết/bố trí props | **AI-DESIGN** | Có thể tối ưu trong giới hạn layout |
| Ngưỡng 5 phút mới đi nghỉ | **PENDING** | CEO |
| Yan quay lại nhắc hồ sơ sau 2 heartbeat | **PENDING** | CEO |
| Mỗi công ty một mặt bằng hay một tòa nhà nhiều tầng | **PENDING** | CEO |

### 18.2. Quy tắc thay đổi khi Codex phát hiện xung đột

1. Dẫn đúng đoạn yêu cầu và ảnh/clip thể hiện vấn đề.
2. Trình tối đa 2–3 phương án, tác động đến chất lượng, tiến độ, quyền và tính đúng của Paperclip.
3. Nếu ảnh hưởng **CEO-LOCKED**, cấp quyền, ngân sách, bảo mật hoặc source nghiệp vụ: **dừng và xin quyết định**.
4. Nếu chỉ là chỉnh lighting, camera framing, bevel, props không ảnh hưởng tính đúng: Codex được tối ưu và ghi changelog.

---

## 19. ĐỊNH NGHĨA “HOÀN THÀNH ART DIRECTION”

G0.5 chỉ có thể coi là hoàn thành khi:

- [ ] Có style frames thực tế đúng phong cách C, không phải chỉ là lời mô tả.
- [ ] Có bản bố cục tổng 7 phòng + lounge và phòng CEO/PM nhìn rõ.
- [ ] Có character board đủ 12 agent, phân biệt roles và visual props.
- [ ] Có bảng màu, vật liệu, lighting và tiêu chí camera rõ ràng.
- [ ] Có asset list + provenance/license plan và quy chuẩn GLB/animation.
- [ ] Có ảnh/đo kiểm trên các kích cỡ màn hình mục tiêu.
- [ ] Các vấn đề `CEO-PENDING` chưa duyệt vẫn ghi PENDING, không bị Codex chuyển thành final.
- [ ] Có biên bản **CEO phê duyệt Character Sheet/Style Frames** trước khi sản xuất asset chính thức.

### Kết luận chỉ đạo mỹ thuật

**VPD Office 3D = Stylized Tycoon Office có kỷ luật dữ liệu.** Cảm giác sống động đến từ chất lượng mô hình, các cử chỉ có lý do và quy trình vận hành thật; không đến từ các hành động giả lập không có chứng cứ. Mục tiêu thiết kế là **đẹp, dễ đọc, dễ kiểm soát, tái sử dụng được cho nhiều công ty** mà vẫn trung thành với cơ chế Paperclip.
