#!/usr/bin/env python3
"""vieneu_tts.py — tạo giọng đọc tiếng Việt cho vpd-video bằng VieNeu-TTS (chạy offline).

Lệnh:
  check    Kiểm tra môi trường (thư viện, model, giọng có sẵn)
  voices   Liệt kê giọng có sẵn (preset)
  cast     Gán giọng cố định cho một nhân vật / người dẫn
  sample   Tạo câu mẫu cho một giọng đã gán (để duyệt giọng)
  synth    Tạo file giọng cho các câu trong prompts/voice-lines.json
  select   Chọn phiên bản dùng cho một câu
  timing   In lại bảng thời lượng từ các phiên bản đã chọn

Mọi lệnh in một dòng JSON ra stdout. Mã thoát:
  0 OK · 2 sai/thiếu tham số · 3 hết lượt thử · 4 lỗi môi trường/model
  5 nhân vật chưa được gán giọng · 7 tạo giọng thất bại · 9 đã có, cần --replace
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import subprocess
import sys
import wave

EXIT_OK, EXIT_ARGS, EXIT_ATTEMPTS, EXIT_ENV, EXIT_NOCAST, EXIT_SYNTH, EXIT_EXISTS = 0, 2, 3, 4, 5, 7, 9
DEFAULT_MAX_ATTEMPTS = 3
HARD_MAX_ATTEMPTS = 5
SAMPLE_TEXT = "Xin chào, đây là giọng mẫu dùng cho dự án video của công ty."


class Fail(Exception):
    def __init__(self, code, error, **extra):
        super().__init__(error)
        self.code, self.error, self.extra = code, error, extra


def out(obj, code=EXIT_OK):
    print(json.dumps(obj, ensure_ascii=False))
    sys.exit(code)


def now():
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)


class Paths:
    def __init__(self, project_dir):
        p = os.path.abspath(project_dir)
        if not os.path.isdir(p):
            raise Fail(EXIT_ARGS, "PROJECT_DIR_NOT_FOUND", projectDir=project_dir)
        self.root = p
        self.voices = os.path.join(p, "refs", "voices")
        self.cast = os.path.join(self.voices, "cast.json")
        self.samples = os.path.join(self.voices, "samples")
        self.lines = os.path.join(p, "prompts", "voice-lines.json")
        self.out = os.path.join(p, "renders", "audio", "voice")
        self.timing_json = os.path.join(self.out, "timing.json")
        self.timing_md = os.path.join(self.out, "timing.md")
        self.ledger = os.path.join(p, "production", "tts-ledger.jsonl")

    def rel(self, path):
        return os.path.relpath(path, self.root).replace(os.sep, "/")


def ledger(paths, entry):
    os.makedirs(os.path.dirname(paths.ledger), exist_ok=True)
    entry = {"at": now(), **entry}
    with open(paths.ledger, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def attempts_used(paths, line_id):
    n = 0
    if os.path.exists(paths.ledger):
        with open(paths.ledger, encoding="utf-8") as f:
            for raw in f:
                try:
                    e = json.loads(raw)
                except ValueError:
                    continue
                if e.get("event") == "synth" and e.get("line") == line_id:
                    n += 1
    return n


# ---------------------------------------------------------------- engine ---

_ENGINE = None


def engine(mode=None):
    global _ENGINE
    if _ENGINE is not None:
        return _ENGINE
    try:
        from vieneu import Vieneu  # noqa
    except Exception as e:  # pragma: no cover - phụ thuộc môi trường
        raise Fail(EXIT_ENV, "VIENEU_NOT_INSTALLED", detail=str(e))
    mode = mode or os.environ.get("VIENEU_MODE") or None
    try:
        _ENGINE = Vieneu(mode=mode) if mode else Vieneu()
    except Exception as e:
        raise Fail(EXIT_ENV, "VIENEU_INIT_FAILED", detail=str(e), mode=mode)
    return _ENGINE


def preset_list(tts):
    try:
        raw = tts.list_preset_voices()
    except Exception as e:
        raise Fail(EXIT_ENV, "LIST_PRESETS_FAILED", detail=str(e))
    res = []
    for item in raw or []:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            res.append({"label": str(item[0]), "id": str(item[1])})
        else:
            res.append({"label": str(item), "id": str(item)})
    return res


def synth_to(tts, voice_entry, paths, text, dest):
    """Tạo giọng cho `text` bằng giọng đã gán, ghi ra `dest` (wav)."""
    kwargs = {"text": text}
    if voice_entry["kind"] == "preset":
        pid = voice_entry["presetId"]
        getter = getattr(tts, "get_preset_voice", None)
        kwargs["voice"] = getter(pid) if getter else pid
    else:
        ref = os.path.join(paths.root, voice_entry["refAudio"])
        if not os.path.exists(ref):
            raise Fail(EXIT_NOCAST, "REF_AUDIO_MISSING", refAudio=voice_entry["refAudio"])
        if sha256(ref) != voice_entry.get("refSha256"):
            raise Fail(EXIT_NOCAST, "REF_AUDIO_CHANGED", refAudio=voice_entry["refAudio"],
                       advice="File giọng mẫu đã bị thay đổi sau khi gán. Báo AI Production Lead.")
        kwargs["ref_audio"] = ref
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        audio = tts.infer(**kwargs)
        tts.save(audio, dest)
    except Fail:
        raise
    except Exception as e:
        raise Fail(EXIT_SYNTH, "SYNTH_FAILED", detail=str(e))
    if not os.path.exists(dest) or os.path.getsize(dest) < 100:
        raise Fail(EXIT_SYNTH, "EMPTY_OUTPUT")


# --------------------------------------------------------------- analysis ---

def analyse(path):
    """Đo thời lượng file, đỉnh âm và đoạn lặng đầu/cuối."""
    info = {"durationSec": None, "sampleRate": None}
    samples, sr = None, None
    try:
        import numpy as np  # noqa
        try:
            import soundfile as sf
            data, sr = sf.read(path, dtype="float32", always_2d=True)
            samples = data.mean(axis=1)
        except ImportError:
            with wave.open(path, "rb") as w:
                sr, n, width, ch = w.getframerate(), w.getnframes(), w.getsampwidth(), w.getnchannels()
                raw = w.readframes(n)
            if width == 2:
                arr = np.frombuffer(raw, dtype="<i2").astype("float32") / 32768.0
            elif width == 4:
                arr = np.frombuffer(raw, dtype="<i4").astype("float32") / 2147483648.0
            else:
                arr = None
            if arr is not None:
                samples = arr.reshape(-1, ch).mean(axis=1)
    except Exception:
        samples = None

    if samples is not None and sr:
        import numpy as np
        info["sampleRate"] = int(sr)
        info["durationSec"] = round(len(samples) / sr, 3)
        peak = float(np.max(np.abs(samples))) if len(samples) else 0.0
        info["peakDbfs"] = round(20 * np.log10(peak), 1) if peak > 0 else None
        info["clipping"] = bool(peak >= 0.999)
        frame = max(1, int(sr * 0.02))
        nfr = len(samples) // frame
        if nfr:
            rms = np.sqrt(np.mean(samples[: nfr * frame].reshape(nfr, frame) ** 2, axis=1))
            thr = max(peak * 0.05, 1e-4)
            voiced = np.where(rms > thr)[0]
            if len(voiced):
                info["speechStartSec"] = round(voiced[0] * frame / sr, 3)
                info["speechEndSec"] = round((voiced[-1] + 1) * frame / sr, 3)
                info["speechSec"] = round(info["speechEndSec"] - info["speechStartSec"], 3)
        return info

    # Không đọc được mẫu: lấy thời lượng bằng ffprobe nếu có
    if shutil.which("ffprobe"):
        try:
            r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, timeout=30)
            info["durationSec"] = round(float(r.stdout.strip()), 3)
        except Exception:
            pass
    return info


# ----------------------------------------------------------------- timing ---

def write_timing(paths, timing, lines_by_id):
    write_json(paths.timing_json, timing)
    rows = ["# Thời lượng giọng — tự động tạo, không sửa tay", "",
            f"Cập nhật: {now()}", "",
            "| Mã câu | Người nói | Shot | Phiên bản chọn | File | Tổng (s) | Có tiếng (s) | Lặng đầu (s) | Ghi chú |",
            "|---|---|---|---|---|---|---|---|---|"]
    for lid in sorted(timing):
        t = timing[lid]
        sel = t.get("selected")
        v = next((x for x in t.get("versions", []) if x["version"] == sel), None)
        ln = lines_by_id.get(lid, {})
        note = []
        if v and v.get("clipping"):
            note.append("đỉnh chạm 0 dBFS")
        if sel is None:
            note.append("chưa chọn")
        rows.append("| {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
            lid, ln.get("speaker", t.get("speaker", "")), ln.get("shot", t.get("shot", "")) or "—",
            f"v{sel}" if sel else "—", v["file"] if v else "—",
            v.get("durationSec") if v else "—", v.get("speechSec", "—") if v else "—",
            v.get("speechStartSec", "—") if v else "—", "; ".join(note)))
    os.makedirs(paths.out, exist_ok=True)
    with open(paths.timing_md, "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")


def load_lines(paths, path=None):
    p = path or paths.lines
    if not os.path.exists(p):
        raise Fail(EXIT_ARGS, "LINES_FILE_NOT_FOUND", lines=paths.rel(p) if path is None else path)
    data = read_json(p, None)
    items = data.get("lines") if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise Fail(EXIT_ARGS, "LINES_FILE_INVALID")
    seen, problems = set(), []
    for i, ln in enumerate(items):
        lid = ln.get("id")
        if not lid or not ln.get("speaker") or not (ln.get("spoken") or ln.get("text")):
            problems.append(f"dòng {i + 1}: cần id, speaker và spoken")
        if lid in seen:
            problems.append(f"mã {lid} bị trùng")
        seen.add(lid)
    if problems:
        raise Fail(EXIT_ARGS, "LINES_FILE_INVALID", problems=problems)
    return items


# --------------------------------------------------------------- commands ---

def cmd_check(a):
    res = {"ok": True, "python": sys.version.split()[0]}
    try:
        import vieneu
        res["vieneuVersion"] = getattr(vieneu, "__version__", "unknown")
    except Exception as e:
        raise Fail(EXIT_ENV, "VIENEU_NOT_INSTALLED", detail=str(e))
    tts = engine(a.mode)
    res["mode"] = a.mode or os.environ.get("VIENEU_MODE") or "default"
    res["presetCount"] = len(preset_list(tts))
    res["ffprobe"] = bool(shutil.which("ffprobe"))
    try:
        import soundfile  # noqa
        res["soundfile"] = True
    except ImportError:
        res["soundfile"] = False
    if a.project_dir:
        paths = Paths(a.project_dir)
        test = os.path.join(paths.root, "production", ".tts-check")
        try:
            os.makedirs(os.path.dirname(test), exist_ok=True)
            open(test, "w").close()
            os.remove(test)
            res["projectWritable"] = True
        except OSError as e:
            raise Fail(EXIT_ENV, "PROJECT_NOT_WRITABLE", detail=str(e))
    return res


def cmd_voices(a):
    return {"ok": True, "voices": preset_list(engine(a.mode))}


def cmd_cast(a):
    paths = Paths(a.project_dir)
    if bool(a.preset) == bool(a.ref_audio):
        raise Fail(EXIT_ARGS, "NEED_PRESET_OR_REF_AUDIO", advice="Dùng đúng một trong --preset hoặc --ref-audio")
    cast = read_json(paths.cast, {"voices": {}})
    char = a.char.upper()
    if char in cast["voices"] and not a.replace:
        raise Fail(EXIT_EXISTS, "VOICE_ALREADY_CAST", char=char, current=cast["voices"][char],
                   advice="Đổi giọng đã gán cần AI Production Lead đồng ý. Khi được duyệt, chạy lại với --replace --reason")
    if a.replace and not a.reason:
        raise Fail(EXIT_ARGS, "REPLACE_NEEDS_REASON")
    entry = {"char": char, "createdAt": now(), "note": a.note or ""}
    if a.preset:
        ids = {v["id"]: v["label"] for v in preset_list(engine(a.mode))}
        if a.preset not in ids:
            raise Fail(EXIT_ARGS, "UNKNOWN_PRESET", preset=a.preset, available=list(ids)[:50])
        entry.update(kind="preset", presetId=a.preset, presetLabel=ids[a.preset])
    else:
        src = os.path.abspath(a.ref_audio)
        if not os.path.exists(src):
            raise Fail(EXIT_ARGS, "REF_AUDIO_NOT_FOUND", refAudio=a.ref_audio)
        if not a.consent:
            raise Fail(EXIT_ARGS, "CONSENT_REQUIRED",
                       advice="Ghi nguồn giọng mẫu và người đã đồng ý bằng --consent \"<ai, khi nào, ở đâu>\"")
        ext = os.path.splitext(src)[1].lower() or ".wav"
        dest = os.path.join(paths.voices, f"{char}_ref{ext}")
        if os.path.exists(dest) and not a.replace:
            raise Fail(EXIT_EXISTS, "REF_FILE_EXISTS", file=paths.rel(dest))
        os.makedirs(paths.voices, exist_ok=True)
        if os.path.abspath(dest) != src:
            if os.path.exists(dest):
                os.replace(dest, dest + f".old-{dt.datetime.now():%Y%m%d%H%M%S}")
            shutil.copy2(src, dest)
        info = analyse(dest)
        dur = info.get("durationSec")
        warn = None
        if dur is not None and not (3.0 <= dur <= 8.0):
            warn = f"Giọng mẫu dài {dur}s; VieNeu khuyến nghị 3–8s"
        entry.update(kind="clone", refAudio=paths.rel(dest), refSha256=sha256(dest),
                     refDurationSec=dur, consent=a.consent, source=a.ref_audio)
        if warn:
            entry["warning"] = warn
    if a.replace:
        entry["replaces"] = cast["voices"].get(char)
        entry["replaceReason"] = a.reason
    cast["voices"][char] = entry
    write_json(paths.cast, cast)
    ledger(paths, {"event": "cast", "char": char, "kind": entry["kind"], "replace": bool(a.replace)})
    return {"ok": True, "cast": entry, "file": paths.rel(paths.cast)}


def voice_for(paths, char):
    cast = read_json(paths.cast, {"voices": {}})
    v = cast["voices"].get(char.upper())
    if not v:
        raise Fail(EXIT_NOCAST, "VOICE_NOT_CAST", char=char.upper(),
                   advice="Chạy lệnh cast cho nhân vật này, hoặc báo AI Production Lead")
    return v


def next_version(directory, prefix):
    n = 1
    while os.path.exists(os.path.join(directory, f"{prefix}_v{n}.wav")):
        n += 1
    return n


def cmd_sample(a):
    paths = Paths(a.project_dir)
    v = voice_for(paths, a.char)
    char = a.char.upper()
    n = next_version(paths.samples, char)
    dest = os.path.join(paths.samples, f"{char}_v{n}.wav")
    synth_to(engine(a.mode), v, paths, a.text or SAMPLE_TEXT, dest)
    info = analyse(dest)
    ledger(paths, {"event": "sample", "char": char, "file": paths.rel(dest)})
    return {"ok": True, "char": char, "file": paths.rel(dest), **info}


def cmd_synth(a):
    paths = Paths(a.project_dir)
    lines = load_lines(paths, a.lines)
    by_id = {ln["id"]: ln for ln in lines}
    only = [x.strip() for x in a.only.split(",")] if a.only else None
    if only:
        missing = [x for x in only if x not in by_id]
        if missing:
            raise Fail(EXIT_ARGS, "UNKNOWN_LINE_ID", ids=missing)
    targets = [by_id[x] for x in only] if only else lines
    max_att = a.max_attempts
    if max_att > HARD_MAX_ATTEMPTS:
        raise Fail(EXIT_ARGS, "MAX_ATTEMPTS_TOO_HIGH", limit=HARD_MAX_ATTEMPTS)

    # Kiểm tra trước: mọi người nói đã có giọng, còn lượt thử
    speakers = sorted({ln["speaker"].upper() for ln in targets})
    cast = read_json(paths.cast, {"voices": {}})["voices"]
    uncast = [s for s in speakers if s not in cast]
    if uncast:
        raise Fail(EXIT_NOCAST, "VOICE_NOT_CAST", chars=uncast,
                   advice="Gán giọng (cast) và duyệt giọng mẫu trước khi tạo câu")
    timing = read_json(paths.timing_json, {})
    skipped = []
    if not a.redo:
        done = {lid for lid, t in timing.items() if t.get("versions")}
        skipped = [ln["id"] for ln in targets if ln["id"] in done]
        targets = [ln for ln in targets if ln["id"] not in done]
    exhausted = [ln["id"] for ln in targets if attempts_used(paths, ln["id"]) >= max_att]
    targets = [ln for ln in targets if ln["id"] not in exhausted]
    if exhausted and not targets:
        raise Fail(EXIT_ATTEMPTS, "ATTEMPTS_EXHAUSTED", lines=exhausted, maxAttempts=max_att,
                   advice="Dừng. Báo AI Production Lead (lỗi cấp 2)")
    if a.dry_run:
        return {"ok": True, "dryRun": True, "willSynth": [ln["id"] for ln in targets],
                "exhausted": exhausted, "skippedAlreadyDone": skipped, "speakers": speakers}

    tts = engine(a.mode) if targets else None
    results, failed = [], []
    for ln in targets:
        lid = ln["id"]
        spoken = ln.get("spoken") or ln["text"]
        n = next_version(paths.out, lid)
        dest = os.path.join(paths.out, f"{lid}_v{n}.wav")
        attempt = attempts_used(paths, lid) + 1
        try:
            synth_to(tts, cast[ln["speaker"].upper()], paths, spoken, dest)
        except Fail as f:
            if os.path.exists(dest):
                os.replace(dest, dest + ".failed")
            ledger(paths, {"event": "synth", "line": lid, "attempt": attempt, "ok": False, "error": f.error})
            failed.append({"line": lid, "error": f.error, **f.extra})
            continue
        info = analyse(dest)
        ledger(paths, {"event": "synth", "line": lid, "attempt": attempt, "ok": True,
                       "file": paths.rel(dest), "durationSec": info.get("durationSec")})
        t = timing.setdefault(lid, {"speaker": ln["speaker"].upper(), "shot": ln.get("shot"), "versions": []})
        t["speaker"], t["shot"] = ln["speaker"].upper(), ln.get("shot")
        t["versions"].append({"version": n, "file": paths.rel(dest), "spoken": spoken,
                              "createdAt": now(), **info})
        if t.get("selected") is None:
            t["selected"] = n
        res = {"line": lid, "version": n, "attempt": f"{attempt}/{max_att}", "file": paths.rel(dest), **info}
        if ln.get("maxSec") and info.get("speechSec") and info["speechSec"] > float(ln["maxSec"]) * 1.1:
            res["warning"] = f"Câu dài {info['speechSec']}s, vượt {ln['maxSec']}s + 10%"
        results.append(res)
        write_timing(paths, timing, by_id)
    write_timing(paths, timing, by_id)
    body = {"done": results, "failed": failed, "exhausted": exhausted, "skippedAlreadyDone": skipped,
            "timing": paths.rel(paths.timing_md)}
    if failed:
        raise Fail(EXIT_SYNTH, "SOME_LINES_FAILED", **body)
    if exhausted:
        raise Fail(EXIT_ATTEMPTS, "ATTEMPTS_EXHAUSTED", maxAttempts=max_att,
                   advice="Các câu khác đã chạy. Câu hết lượt: báo AI Production Lead (lỗi cấp 2)", **body)
    return {"ok": True, **body}


def cmd_select(a):
    paths = Paths(a.project_dir)
    timing = read_json(paths.timing_json, {})
    t = timing.get(a.line)
    if not t:
        raise Fail(EXIT_ARGS, "UNKNOWN_LINE_ID", ids=[a.line])
    if a.version not in [v["version"] for v in t["versions"]]:
        raise Fail(EXIT_ARGS, "UNKNOWN_VERSION", available=[v["version"] for v in t["versions"]])
    t["selected"] = a.version
    t["selectedReason"] = a.reason or ""
    by_id = {}
    if os.path.exists(paths.lines):
        try:
            by_id = {ln["id"]: ln for ln in load_lines(paths)}
        except Fail:
            pass
    write_timing(paths, timing, by_id)
    ledger(paths, {"event": "select", "line": a.line, "version": a.version, "reason": a.reason or ""})
    return {"ok": True, "line": a.line, "selected": a.version, "timing": paths.rel(paths.timing_md)}


def cmd_timing(a):
    paths = Paths(a.project_dir)
    timing = read_json(paths.timing_json, {})
    by_id = {}
    if os.path.exists(paths.lines):
        by_id = {ln["id"]: ln for ln in load_lines(paths)}
    write_timing(paths, timing, by_id)
    missing = sorted(set(by_id) - {k for k, v in timing.items() if v.get("selected")})
    total = 0.0
    for t in timing.values():
        v = next((x for x in t["versions"] if x["version"] == t.get("selected")), None)
        if v and v.get("durationSec"):
            total += v["durationSec"]
    return {"ok": True, "timing": paths.rel(paths.timing_md), "lines": len(timing),
            "missing": missing, "totalVoiceSec": round(total, 3)}


def main():
    p = argparse.ArgumentParser(description="VieNeu-TTS cho vpd-video")
    p.add_argument("--mode", help="Chế độ model VieNeu (mặc định lấy VIENEU_MODE hoặc mặc định của thư viện)")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("check"); s.add_argument("--project-dir")
    sub.add_parser("voices")

    s = sub.add_parser("cast")
    s.add_argument("--project-dir", required=True); s.add_argument("--char", required=True)
    s.add_argument("--preset"); s.add_argument("--ref-audio"); s.add_argument("--consent")
    s.add_argument("--note"); s.add_argument("--replace", action="store_true"); s.add_argument("--reason")

    s = sub.add_parser("sample")
    s.add_argument("--project-dir", required=True); s.add_argument("--char", required=True); s.add_argument("--text")

    s = sub.add_parser("synth")
    s.add_argument("--project-dir", required=True); s.add_argument("--lines")
    s.add_argument("--only", help="Mã câu, phân tách bằng dấu phẩy")
    s.add_argument("--redo", action="store_true", help="Tạo thêm phiên bản cho câu đã có")
    s.add_argument("--max-attempts", type=int, default=DEFAULT_MAX_ATTEMPTS)
    s.add_argument("--dry-run", action="store_true")

    s = sub.add_parser("select")
    s.add_argument("--project-dir", required=True); s.add_argument("--line", required=True)
    s.add_argument("--version", type=int, required=True); s.add_argument("--reason")

    s = sub.add_parser("timing"); s.add_argument("--project-dir", required=True)

    a = p.parse_args()
    handlers = {"check": cmd_check, "voices": cmd_voices, "cast": cmd_cast, "sample": cmd_sample,
                "synth": cmd_synth, "select": cmd_select, "timing": cmd_timing}
    try:
        out(handlers[a.cmd](a))
    except Fail as f:
        out({"ok": False, "error": f.error, **f.extra}, f.code)


if __name__ == "__main__":
    main()
