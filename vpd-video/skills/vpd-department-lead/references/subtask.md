# Mẫu task con

```
Tiêu đề: <Mã dự án> · <đầu ra> · <mã shot/câu nếu có>
parentId: <task giai đoạn hoặc task cha theo cảnh>
Người phụ trách: <agent trong phòng, ID đã xác minh>

Mục tiêu: <một câu>
Đầu vào: <đường dẫn + phiên bản> (Brief v<n>, Kế hoạch v<n>, G<n> đã duyệt)
Đầu ra: <file/đường dẫn bàn giao, quy tắc tên>
Tiêu chí đạt: <kiểm được, tối đa 5 dòng>
Công cụ/skill: <tên skill>, trần chi phí <VND> nếu tốn phí, lượt thử <n>
Hạn: <giờ, ngày, giờ Việt Nam>
Báo lại: bình luận khi xong (mẫu trong skill công cụ) hoặc khi gặp lỗi vượt cấp 1
```

## Việc thường giao theo phòng

| Phòng | Nhân viên | Task con điển hình | Skill |
|---|---|---|---|
| Sáng tạo | Scriptwriter | `preprod/script.md` có mã câu `TH`/`LD` | video-scriptwriter |
| | Shot Planner | `preprod/shot-list.md` | vpd-shot-planner |
| Sản xuất AI | Character & Consistency | Bộ tham chiếu `refs/`, khung đầu (khi có công cụ), soát đồng nhất | (chưa có) |
| | Visual Generator | Một shot một task: chạy gói `prompts/<SHOT>.json` | kling-video-generate |
| | Voice & Audio | Gán giọng + giọng mẫu; tạo toàn bộ câu + `timing.md` | vieneu-voice-generate |
| Hậu kỳ | Motion & Subtitle | Phụ đề, chữ động theo timeline v<n> | (chưa có) |
| | Color & Sound Mix | Cân màu, cân/phối âm theo timeline v<n> | (chưa có) |

Ô "(chưa có)": giao kèm tiêu chí chi tiết hơn trong task, và báo Yan nếu thiếu công cụ.
