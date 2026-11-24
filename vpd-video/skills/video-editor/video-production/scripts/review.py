#!/usr/bin/env python3
"""Validate and bundle local video auditions. Python stdlib + ffprobe only."""

import argparse
import copy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import mimetypes
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import unquote, urlsplit


TEMPLATE = Path(__file__).resolve().parents[1] / "assets" / "review.html"
ASPECTS = {"16:9": 16 / 9, "9:16": 9 / 16}
TIMELINE_TOLERANCE = 0.1


def nonempty(value, field):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field}: expected a nonempty string")
    return value


def number(value, field):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{field}: expected a finite number")
    return value


def local_file(root, value, field):
    nonempty(value, field)
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts or "\\" in value or urlsplit(value).scheme:
        raise ValueError(f"{field}: use a local relative path inside the manifest directory")
    resolved = (root / relative).resolve()
    if not resolved.is_relative_to(root):
        raise ValueError(f"{field}: path escapes the manifest directory")
    if not resolved.is_file():
        raise ValueError(f"{field}: missing file: {value}")
    return resolved


def probe(path, executable):
    result = subprocess.run(
        [executable, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode:
        raise ValueError(f"cannot inspect {path.name}: {result.stderr.strip()}")
    data = json.loads(result.stdout)
    video = [s for s in data.get("streams", []) if s.get("codec_type") == "video"]
    audio = [s for s in data.get("streams", []) if s.get("codec_type") == "audio"]
    if path.suffix.lower() != ".mp4" or "mp4" not in data.get("format", {}).get("format_name", "").split(","):
        raise ValueError(f"{path.name}: provide an MP4 file")
    if len(video) != 1 or video[0].get("codec_name") != "h264" or video[0].get("pix_fmt") != "yuv420p":
        raise ValueError(f"{path.name}: require one H.264 video stream with yuv420p pixels")
    if len(audio) > 1 or any(s.get("codec_name") != "aac" for s in audio):
        raise ValueError(f"{path.name}: use at most one premixed AAC audio stream")
    stream = video[0]
    if stream.get("sample_aspect_ratio", "1:1") not in ("1:1", "N/A"):
        raise ValueError(f"{path.name}: export square pixels before review")
    rotations = [s.get("rotation", 0) for s in stream.get("side_data_list", [])]
    rotations.append(stream.get("tags", {}).get("rotate", 0))
    if any(float(rotation) % 360 for rotation in rotations):
        raise ValueError(f"{path.name}: bake rotation into the export before review")
    duration = float(stream.get("duration", data["format"].get("duration", "nan")))
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError(f"{path.name}: missing positive duration")
    return {"duration": duration, "width": stream["width"], "height": stream["height"],
            "video_codec": "h264", "audio_codec": "aac" if audio else None}


def read_vtt(path, duration):
    text = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
    blocks = re.split(r"\n[ \t]*\n", text.strip())
    if not blocks or not re.fullmatch(r"WEBVTT(?:[ \t].*)?", blocks[0].splitlines()[0]):
        raise ValueError(f"{path.name}: captions must have a WEBVTT header")
    if len(blocks[0].splitlines()) != 1:
        raise ValueError(f"{path.name}: put a blank line after the WEBVTT header")
    timestamp = r"(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})"
    pattern = re.compile(rf"^{timestamp}\s+-->\s+{timestamp}(?:[ \t]+.*)?$")
    previous = -1
    count = 0
    for block in blocks[1:]:
        lines = block.splitlines()
        if re.match(r"^(NOTE(?:\s|$)|STYLE$|REGION$)", lines[0]):
            continue
        timing = 0 if "-->" in lines[0] else 1
        match = pattern.fullmatch(lines[timing]) if len(lines) > timing else None
        if not match or len(lines) <= timing + 1 or not "".join(lines[timing + 1:]).strip():
            raise ValueError(f"{path.name}: invalid or empty caption cue")
        parts = match.groups()
        def seconds(fields):
            hours, minutes, seconds_, millis = fields
            return int(hours or 0) * 3600 + int(minutes) * 60 + int(seconds_) + int(millis) / 1000
        start, end = seconds(parts[:4]), seconds(parts[4:])
        if start < previous or end <= start or end > duration + 0.001:
            raise ValueError(f"{path.name}: caption times must be ordered, positive intervals inside the video")
        previous = start
        count += 1
    if not count:
        raise ValueError(f"{path.name}: captions contain no timed cues")
    return text


def validate(manifest, executable="ffprobe"):
    manifest = Path(manifest).resolve()
    root = manifest.parent
    data = json.loads(manifest.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        raise ValueError("schema_version must be 1")
    nonempty(data.get("title"), "title")
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise ValueError("candidates: provide at least one candidate")
    ids, choices, timelines, inputs = set(), set(), {}, {}
    clean = {"schema_version": 1, "title": data["title"], "candidates": []}
    for index, entry in enumerate(candidates):
        field = f"candidates[{index}]"
        if not isinstance(entry, dict):
            raise ValueError(f"{field}: expected an object")
        for key in ("id", "label", "music", "aspect", "timeline", "revision", "path"):
            nonempty(entry.get(key), f"{field}.{key}")
        if entry["id"] in ids:
            raise ValueError(f"{field}.id: duplicate candidate id {entry['id']}")
        ids.add(entry["id"])
        if entry["aspect"] not in ASPECTS:
            raise ValueError(f"{field}.aspect: expected 16:9 or 9:16")
        choice = tuple(entry[key] for key in ("timeline", "revision", "music", "aspect"))
        if choice in choices:
            raise ValueError(f"{field}: ambiguous duplicate timeline/revision/music/aspect choice")
        choices.add(choice)
        source = local_file(root, entry["path"], f"{field}.path")
        media = probe(source, executable)
        ratio = media["width"] / media["height"]
        if abs(ratio / ASPECTS[entry["aspect"]] - 1) > 0.01:
            raise ValueError(f"{field}: {media['width']}x{media['height']} does not match {entry['aspect']}")
        timelines.setdefault(entry["timeline"], []).append(media["duration"])
        candidate = {key: entry[key] for key in ("id", "label", "music", "aspect", "timeline", "revision", "path")}
        candidate["media"] = media
        source_files = {"path": source}
        if "captions" in entry:
            captions = entry["captions"]
            if not isinstance(captions, dict):
                raise ValueError(f"{field}.captions: expected an object")
            path = local_file(root, captions.get("path"), f"{field}.captions.path")
            if path.suffix.lower() != ".vtt":
                raise ValueError(f"{field}.captions.path: use a WebVTT .vtt sidecar")
            read_vtt(path, media["duration"])
            candidate["captions"] = {"path": captions["path"], "label": captions.get("label", "Captions"),
                                     "language": captions.get("language", "en")}
            nonempty(candidate["captions"]["label"], f"{field}.captions.label")
            language = nonempty(candidate["captions"]["language"], f"{field}.captions.language")
            if not re.fullmatch(r"[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*", language):
                raise ValueError(f"{field}.captions.language: expected a language tag such as en or en-US")
            source_files["captions"] = path
        chapters = entry.get("chapters", [])
        if not isinstance(chapters, list):
            raise ValueError(f"{field}.chapters: expected an array")
        candidate["chapters"] = []
        chapter_ids, previous = set(), -1
        for chapter in chapters:
            if not isinstance(chapter, dict):
                raise ValueError(f"{field}.chapters: expected chapter objects")
            for key in ("id", "label"):
                nonempty(chapter.get(key), f"{field}.chapters.{key}")
            start = number(chapter.get("start"), f"{field}.chapters.start")
            if chapter["id"] in chapter_ids or start <= previous or not 0 <= start < media["duration"]:
                raise ValueError(f"{field}.chapters: require unique ids and ordered start times inside the video")
            chapter_ids.add(chapter["id"])
            previous = start
            candidate["chapters"].append({key: chapter[key] for key in ("id", "label", "start")})
        clean["candidates"].append(candidate)
        inputs[entry["id"]] = source_files
    for timeline, durations in timelines.items():
        if max(durations) - min(durations) > TIMELINE_TOLERANCE + 1e-9:
            raise ValueError(f"timeline {timeline}: durations differ by more than {TIMELINE_TOLERANCE}s; use a distinct timeline for a different edit")
    selected = data.get("selected", candidates[0]["id"])
    if not isinstance(selected, str) or selected not in ids:
        raise ValueError("selected: must identify an existing candidate")
    clean["selected"] = selected
    return clean, inputs


def build(manifest, destination, executable):
    data, inputs = validate(manifest, executable)
    destination = Path(destination).absolute()
    if destination.exists() or destination.is_symlink():
        raise ValueError(f"Refusing to overwrite existing destination: {destination}")
    destination.mkdir(parents=True, exist_ok=False)
    try:
        (destination / "media").mkdir()
        (destination / "captions").mkdir()
        for index, candidate in enumerate(data["candidates"], 1):
            candidate["path"] = f"media/{index:03d}.mp4"
            shutil.copyfile(inputs[candidate["id"]]["path"], destination / candidate["path"])
            if "captions" in candidate:
                candidate["captions"]["path"] = f"captions/{index:03d}.vtt"
                shutil.copyfile(inputs[candidate["id"]]["captions"], destination / candidate["captions"]["path"])
        (destination / "review.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        embedded = copy.deepcopy(data)
        for candidate in embedded["candidates"]:
            if "captions" in candidate:
                candidate["captions"]["text"] = read_vtt(destination / candidate["captions"]["path"], candidate["media"]["duration"])
        # A JSON script element is still parsed as HTML: never leave a literal </script> or HTML delimiter.
        payload = json.dumps(embedded, ensure_ascii=True).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
        html = TEMPLATE.read_text(encoding="utf-8").replace("__REVIEW_MANIFEST__", payload)
        (destination / "index.html").write_text(html, encoding="utf-8")
    except Exception:
        shutil.rmtree(destination)
        raise
    print(f"Built {len(data['candidates'])} candidate(s): {destination / 'index.html'}")
    print("Copy the whole bundle to move it. Same-timeline duration checks do not establish story or audio equivalence.")


def serve(bundle, port, executable):
    root = Path(bundle).resolve()
    data, inputs = validate(root / "review.json", executable)
    if not (root / "index.html").is_file():
        raise ValueError("Bundle is missing index.html; run build first")
    allowed = {"/": root / "index.html", "/index.html": root / "index.html", "/review.json": root / "review.json"}
    for candidate in data["candidates"]:
        allowed["/" + candidate["path"]] = inputs[candidate["id"]]["path"]
        if "captions" in candidate:
            allowed["/" + candidate["captions"]["path"]] = inputs[candidate["id"]]["captions"]

    class Handler(BaseHTTPRequestHandler):
        def do_HEAD(self):
            self.send_file(head=True)

        def do_GET(self):
            self.send_file(head=False)

        def send_file(self, head):
            path = allowed.get(unquote(urlsplit(self.path).path))
            if path is None:
                self.send_error(404)
                return
            size = path.stat().st_size
            start, end, status = 0, size - 1, 200
            requested = self.headers.get("Range")
            if requested:
                match = re.fullmatch(r"bytes=(\d*)-(\d*)", requested)
                if match and any(match.groups()):
                    first, last = match.groups()
                    if first:
                        start = int(first)
                        end = min(int(last), end) if last else end
                    else:
                        start = max(0, size - int(last))
                    status = 206
                if not match or not any(match.groups()) or start > end or start >= size:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
            self.send_response(status)
            self.send_header("Content-Type", mimetypes.guess_type(path.name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            if status == 206:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            if not head:
                with path.open("rb") as source:
                    source.seek(start)
                    remaining = end - start + 1
                    while remaining:
                        chunk = source.read(min(65536, remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Local review: http://127.0.0.1:{server.server_port}/ (Ctrl-C to stop; not reachable from another device)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffprobe", default="ffprobe", help="Path to ffprobe")
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("check", help="Read-only validation of review.json and its media")
    check.add_argument("manifest", type=Path)
    make = commands.add_parser("build", help="Copy portable media and generate an offline HTML player")
    make.add_argument("manifest", type=Path)
    make.add_argument("destination", type=Path)
    server = commands.add_parser("serve", help="Serve only a built bundle on loopback with byte ranges")
    server.add_argument("bundle", type=Path)
    server.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    try:
        if args.command == "check":
            data, _ = validate(args.manifest, args.ffprobe)
            print(f"Review verified: {len(data['candidates'])} candidate(s); H.264/AAC compatibility and timeline durations checked.")
            print("Still review playback, sound, story, captions and the actual target device. Silent candidates are permitted.")
        elif args.command == "build":
            build(args.manifest, args.destination, args.ffprobe)
        else:
            serve(args.bundle, args.port, args.ffprobe)
    except (ValueError, OSError, KeyError, TypeError, subprocess.SubprocessError) as exc:
        print(f"Review error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
