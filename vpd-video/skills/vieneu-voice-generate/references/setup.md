# Cài VieNeu-TTS trong Docker (cho người quản trị, agent không tự cài)

Image Paperclip (`node:24-trixie-slim`) không có Python. Gợi ý thêm vào `Dockerfile.vpd`:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv python3-pip ffmpeg libsndfile1 espeak-ng \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/vieneu \
    && /opt/vieneu/bin/pip install --no-cache-dir vieneu soundfile numpy
# Tải sẵn model khi build để agent không phải tải lúc chạy
ENV HF_HOME=/opt/hf-cache
RUN /opt/vieneu/bin/python -c "from vieneu import Vieneu; Vieneu()"
ENV VIENEU_PYTHON=/opt/vieneu/bin/python
```

- `espeak-ng` chỉ cần cho một số phiên bản cũ. Có thể bỏ nếu `check` chạy được mà không có nó.
- Máy có GPU NVIDIA: dùng `pip install "vieneu[cuda]"` và chạy container với `--gpus all`. Không có GPU
  thì bản mặc định chạy bằng CPU (ONNX), một câu ngắn mất vài giây.
- Cần chọn chế độ model khác mặc định thì đặt `VIENEU_MODE` (ví dụ `v3turbo`, `v3nano`).
- Nên gắn `HF_HOME` vào volume để không tải lại model mỗi lần dựng lại image.

Kiểm tra sau khi dựng image:

```bash
$VIENEU_PYTHON <skill>/scripts/vieneu_tts.py check --project-dir /paperclip/projects/<mã>
```

Kết quả cần có `"ok": true` và `presetCount` > 0. `soundfile: true` giúp đo lặng đầu/cuối chính xác
với mọi định dạng WAV; không có thì script dùng `wave`/`ffprobe`.

Giấy phép: SDK và model v3 Turbo theo Apache 2.0. Bản v4 là bản độc quyền, chỉ có qua API trả phí,
không dùng trong skill này.
