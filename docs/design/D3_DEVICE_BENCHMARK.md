# D3-05 — phép đo trên thiết bị tham chiếu

Trạng thái: **CHƯA ĐO** trên GPU desktop và điện thoại thật. Kết quả SwiftShader trong `PROJECT_PROGRESS.md` chỉ là chẩn đoán.

1. Khởi động host test theo `D2_MVP_GATE_REPORT.md`, mở `http://127.0.0.1:3101/OFFAA/office` trên Chrome/Edge Windows với tăng tốc phần cứng; trên điện thoại thật, mở URL LAN của cùng host test. Không dùng device emulation. Xác nhận 12/12 agent, WebGL và 9 clip. Ghi model CPU/GPU/RAM, browser/version, màn hình, `devicePixelRatio` và `WEBGL_debug_renderer_info` (nếu có). Chụp `chrome://gpu` để phân biệt GPU thật và software renderer.
2. Trong DevTools Performance, ghi 30 giây khi ít nhất hai agent thật di chuyển, chuyển camera và mở hồ sơ. Xuất trace. Báo FPS trung vị, frame time p50/p95 và số frame trên 16,7 ms (desktop) hoặc 33,3 ms (mobile). Lặp lại ba lần. Ghi canvas `data-render-stats` (draw calls, triangles, DPR, shadow) bằng lệnh bên dưới.
3. Trong DevTools Memory, đo peak JS heap/GPU memory nếu browser cung cấp; sau ba vòng đổi company và reconnect, đo heap sau GC. Trong Network, ghi transfer size của GLB và tổng asset. Với polling 5 giây, ghi latency p50/p95 của snapshot trong Network. Không dùng số heap sau GC làm số peak.
4. Lưu model thiết bị, raw trace, ảnh `chrome://gpu`, bảng ba lần đo và URL/commit SHA của build vào báo cáo. Mục tiêu thiết kế v1.0: desktop GPU tích hợp **60 FPS**, mobile tầm trung **30 FPS**. Nếu thiếu thiết bị hoặc trace, giữ `NOT VERIFIED`.

```js
const c = document.querySelector('canvas');
const gl = c?.getContext('webgl2');
const ext = gl?.getExtension('WEBGL_debug_renderer_info');
console.log({ stats: c?.dataset.renderStats, dpr: devicePixelRatio,
  gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable' });
```

Chỉ dùng fixture test, không chạy trên production. Gửi trace và bảng số liệu để đối chiếu checkpoint; không tự coi một ảnh hoặc FPS overlay là đủ bằng chứng.
