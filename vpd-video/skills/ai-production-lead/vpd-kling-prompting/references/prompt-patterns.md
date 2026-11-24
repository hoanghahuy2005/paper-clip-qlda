# Mẫu prompt chuyển động

Khung chung (một đoạn tiếng Anh):

```
<chủ thể ngắn> <hành động chính, động từ cụ thể, tốc độ>. <chuyển động máy hoặc "Static camera">.
<bối cảnh, ánh sáng dùng từ vựng dự án>. <nhịp, không khí>. <ràng buộc giữ nguyên>.
```

## Từ vựng máy quay (shot list tiếng Việt → prompt)

| Shot list | Prompt |
|---|---|
| Tĩnh | static camera, locked-off shot |
| Đẩy chậm vào / kéo ra | slow dolly in / slow dolly out |
| Lia trái/phải | slow pan left / pan right |
| Nghiêng lên/xuống | tilt up / tilt down |
| Xoay quanh chủ thể | slow orbit around the subject, 30 degrees |
| Theo sau nhân vật | tracking shot following from behind |
| Cầm tay nhẹ | subtle handheld movement |
| Toàn / trung / cận / đặc tả | wide shot / medium shot / close-up / extreme close-up |
| Ngang mắt / từ thấp / từ cao | eye level / low angle / high angle |

Tốc độ: slowly, gently, gradually (an toàn); quickly chỉ khi shot list yêu cầu.

## Theo loại shot

**Sản phẩm (image-to-video, ảnh thật)**
```
The white matte cup sits on a light oak table. Soft steam rises slowly from the coffee inside.
Slow dolly in toward the cup. Warm late-afternoon window light, gentle shadows. Calm, clean
commercial look. The cup keeps its exact shape, color and printed text; nothing else moves.
```

**Nhân vật hành động ngắn (image-to-video, ảnh có nhân vật)**
```
The woman picks up the cup with both hands and takes a small sip, then smiles softly.
Static camera, medium shot at eye level. Same kitchen and warm window light as the image.
Natural, relaxed pace. Her face, hair and outfit stay exactly the same; no other people appear.
```

**Nhân vật nói (thoại trên hình, chỉ khớp thời gian)**
```
The man looks at the cup and says one short sentence, then closes his mouth and listens.
Static camera, medium shot from a slight side angle. Same living room lighting as the image.
He speaks for about two seconds at the start of the clip. His face and clothes stay the same.
```

**Nối liền mạch (ảnh đầu = khung cuối shot trước)**
```
Continuing the same motion, the woman sets the cup down on the table and steps back.
Static camera. Lighting and framing continue exactly from the image. Her appearance stays the same.
```

**Cảnh vật (text-to-video)**
```
Wide shot of a quiet city street at early morning, light mist, a few cyclists passing in the
distance. Slow pan right. Soft blue-gold dawn light. Peaceful, slow rhythm. No readable signs or text.
```

## Tránh

- Tả lại nhân vật ở image-to-video ("a young woman with short black hair wearing a green sweater").
- Hai hành động nối nhau trong clip 5s ("walks in, sits down, opens the laptop and types").
- Chữ cần đọc được trên hình ("the cup says LOWTECH"). Chữ do ảnh thật hoặc hậu kỳ đảm nhận.
- Từ cảm tính không có hình ("amazing", "beautiful", "8k masterpiece").
- Xoay người 180°, đi ra khỏi khung rồi quay lại, nhiều nhân vật tương tác bằng tay.
- Đổi cách gọi chủ thể giữa các shot ("the cup" / "the mug" / "the glass").
