# File câu `prompts/voice-lines.json`

Voice & Audio lập file này từ `preprod/script.md` và `preprod/shot-list.md` đã duyệt ở G1. Mỗi câu
thoại (`TH..`) hoặc lời dẫn (`LD..`) là một dòng. Mã câu lấy đúng như kịch bản, không đặt mã mới.

```json
{
  "script": "preprod/script.md v2",
  "shotList": "preprod/shot-list.md v2",
  "lines": [
    {
      "id": "TH01",
      "speaker": "AN",
      "shot": "SC01_SH02",
      "display": "Cốc Lowtech 350ml, trắng sữa!",
      "spoken": "Cốc Lâu-tếch ba trăm năm mươi mi-li-lít, trắng sữa!",
      "maxSec": 3
    },
    {
      "id": "LD01",
      "speaker": "NGUOI_DAN",
      "shot": null,
      "display": "Đơn giản là đủ.",
      "spoken": "Đơn giản, là đủ."
    }
  ]
}
```

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `id` | có | Mã câu trong kịch bản (`TH01`, `LD01`) |
| `speaker` | có | Mã người nói, trùng mã NV trong bảng Tham chiếu. Người dẫn dùng `NGUOI_DAN` hoặc mã Kế hoạch ghi |
| `display` | nên có | Lời đúng như kịch bản, dùng cho phụ đề. Không sửa |
| `spoken` | có | Lời đưa vào TTS. Chỉ khác `display` ở cách viết để đọc đúng, **không khác nghĩa** |
| `shot` | nên có | Shot chứa câu này. `null` nếu là lời dẫn phủ nhiều shot |
| `maxSec` | nên có | Thời lượng tối đa câu được chiếm, thường là Giây dựng của shot có thoại trên hình |

## Viết `spoken` để đọc đúng

- Số, ngày, đơn vị viết thành chữ: `350ml` → `ba trăm năm mươi mi-li-lít`, `24/11` → `hai mươi tư tháng mười một`.
- Tên nước ngoài, tên sản phẩm: thử để nguyên trước (VieNeu đọc được lẫn tiếng Anh). Đọc sai thì viết
  lại theo âm tiếng Việt và ghi cách đọc đã chốt vào task để dùng thống nhất.
- Viết tắt viết đầy đủ: `TP.HCM` → `Thành phố Hồ Chí Minh`.
- Câu dài: thêm dấu phẩy ở chỗ cần ngắt hơi. Câu vẫn quá dài so với `maxSec` thì báo trưởng phòng,
  không tự cắt chữ.
- Mỗi lần đổi `spoken` sau khi đã tạo, tạo lại bằng `--only <mã> --redo`. Phiên bản cũ vẫn được giữ.
