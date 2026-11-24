# Gói thông số shot

## `prompts/<SHOT>.json`

Một file cho mỗi shot `kling`. Visual Generator chỉ đọc file này để chạy, không phải hỏi lại.

```json
{
  "shot": "SC01_SH02",
  "status": "ready",
  "sources": { "shotList": "preprod/shot-list.md v2", "script": "preprod/script.md v2" },
  "mode": "image_to_video",
  "promptFile": "prompts/SC01_SH02.txt",
  "promptVersion": 1,
  "image": "refs/AN_front_v2.png",
  "frameSource": "reference",
  "endImage": null,
  "aspect": "9:16",
  "durationSec": 5,
  "editSec": 3,
  "keep": "giây 1–4: An nhấc cốc, nhấp một ngụm",
  "model": "2.6",
  "resolution": "720p",
  "quotedVND": 150,
  "maxCostVND": 300,
  "maxAttempts": 2,
  "attemptsReason": "",
  "characters": ["AN"],
  "setting": "NHA_BEP",
  "dialogue": { "line": "TH01", "speechSec": 1.8, "mouthWindow": "0.5–2.3s" },
  "notes": ""
}
```

| Trường | Ghi chú |
|---|---|
| `status` | `draft` (đang viết) → `ready` (giao được) → `blocked` (chờ đầu vào/quyết định) |
| `mode` | `image_to_video` hoặc `text_to_video`. Có `endImage` thì vẫn là image_to_video |
| `frameSource` | `reference` (ảnh tham chiếu/ảnh thật), `generated` (khung đầu tạo riêng, đã duyệt), `prev_shot` (khung cuối shot trước) |
| `durationSec` / `editSec` | Giây nguồn tạo clip / Giây dựng dùng trên timeline |
| `keep` | Phần hình cần giữ khi Video Editor cắt |
| `maxAttempts` | Mặc định 2, tối đa 4 (cộng dồn trên shot). Nâng thì ghi `attemptsReason` |
| `dialogue` | `null` nếu shot không có thoại trên hình |

Ánh xạ sang lệnh `kling.mjs generate`:

| Gói | Tham số |
|---|---|
| `shot` | `--shot` |
| `promptFile` | `--prompt-file` |
| `image`, `endImage` | `--image`, `--end-image` |
| `aspect`, `durationSec` | `--aspect`, `--duration` |
| `model`, `resolution` | `--model`, `--resolution` |
| `maxCostVND` | `--max-cost` |
| `maxAttempts` | `--max-attempts` |

## `prompts/shot-specs.md`

Bảng tổng để Yan, QA và Video Editor xem nhanh. Cập nhật mỗi khi gói đổi.

```markdown
# Shot specs — v<n> (Shot list v<n>, Kế hoạch v<n>) · giá tra ngày <dd/mm>

## Từ vựng dự án
- Ánh sáng bếp: warm late-afternoon window light
- Chủ thể: "the woman" (AN), "the white matte cup" (CUP)

| Mã | Chế độ | Ảnh đầu | Ảnh cuối | Nguồn/Dựng (s) | Model | Giá báo | Trần | Lượt | Thoại | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|
| SC01_SH01 | t2v | — | — | 5/3 | 2.6 720p | 150 | 300 | 2 | — | ready |
| SC01_SH02 | i2v | refs/AN_front_v2.png | — | 5/3 | 2.6 720p | 150 | 300 | 2 | TH01 1,8s | ready |

Tổng giá báo: <...> VND · Tổng trần: <...> VND · Ngân sách phòng còn: <...> VND
```
