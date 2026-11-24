#!/usr/bin/env python3
"""Count explicit narration and report sourced read duration without changing files."""

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
import wave


START_MARKER = "<!-- narration:start -->"
END_MARKER = "<!-- narration:end -->"
WORD = re.compile(r"[^\W_]+(?:['’\-][^\W_]+)*", re.UNICODE)
NON_NARRATION = re.compile(
    r"^\s*(?:#{1,6}\s|```|~~~|<!--|---\s*$|[-*+]\s|\d+[.)]\s|"
    r"\[[^\]]+\]\s*$|(?:status|scene(?:\s+id)?|title|word\s+count|"
    r"words|duration|measured\s+duration|narrator)\s*:)",
    re.IGNORECASE,
)


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def narration_text(raw, input_format):
    """Select exactly the explicitly spoken text; do not guess away headings."""
    if input_format == "marked":
        if raw.count(START_MARKER) != 1 or raw.count(END_MARKER) != 1:
            raise ValueError("Marked input needs exactly one narration:start and narration:end pair")
        start = raw.index(START_MARKER) + len(START_MARKER)
        end = raw.index(END_MARKER)
        if start >= end:
            raise ValueError("Narration markers must enclose text in start/end order")
        raw = raw[start:end]
    elif input_format != "plain":
        raise ValueError("Unknown narration input format")
    text = raw.strip()
    for line in text.splitlines():
        if NON_NARRATION.search(line):
            raise ValueError("Narration contains a header, direction, or Markdown; use spoken text only")
    if re.search(r"\[[^\]]*\]\([^)]*\)", text) or "<!--" in text:
        raise ValueError("Narration contains markup; use spoken text only")
    if not WORD.search(text):
        raise ValueError("Narration must contain spoken words")
    return text


def finite_number(value, name, positive=False):
    try:
        result = float(value)
    except (ValueError, TypeError, OverflowError) as error:
        raise ValueError(name + " must be a finite number") from error
    if not math.isfinite(result) or result < 0 or (positive and result == 0):
        qualifier = "positive" if positive else "nonnegative"
        raise ValueError(name + " must be a finite " + qualifier + " number")
    return result


def recording_duration(path):
    """Read PCM WAV locally, otherwise probe the first audio stream with ffprobe."""
    try:
        with wave.open(str(path), "rb") as recording:
            duration = recording.getnframes() / recording.getframerate()
        return finite_number(duration, "Recording duration", positive=True), "wave_frames"
    except (wave.Error, EOFError):
        pass
    executable = shutil.which("ffprobe")
    if executable is None:
        raise ValueError("This recording needs ffprobe; use an existing installation or a PCM WAV export")
    try:
        result = subprocess.run(
            [executable, "-v", "error", "-show_entries",
             "format=duration:stream=codec_type,duration", "-of", "json", str(path)],
            capture_output=True, text=True, check=False, timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ValueError("ffprobe could not inspect this recording: " + str(error)) from error
    if result.returncode:
        raise ValueError("ffprobe could not read the recording: " + result.stderr.strip()[:400])
    try:
        data = json.loads(result.stdout)
        audio = next(stream for stream in data.get("streams", []) if stream.get("codec_type") == "audio")
    except (ValueError, TypeError, AttributeError, StopIteration) as error:
        raise ValueError("ffprobe returned no usable audio stream") from error
    # Some containers omit stream duration. Retain the less precise fallback's identity.
    try:
        return finite_number(audio.get("duration"), "Audio duration", positive=True), "ffprobe_audio_stream"
    except ValueError:
        try:
            duration = data.get("format", {}).get("duration")
            return finite_number(duration, "Container duration", positive=True), "ffprobe_container_fallback"
        except (ValueError, AttributeError) as error:
            raise ValueError("ffprobe returned no finite positive duration") from error


def build_receipt(args):
    script = Path(args.narration).expanduser().resolve()
    if not script.is_file():
        raise ValueError("Narration file does not exist: " + str(script))
    raw_bytes = script.read_bytes()
    try:
        text = narration_text(raw_bytes.decode("utf-8-sig"), args.format)
    except UnicodeError as error:
        raise ValueError("Narration must be UTF-8 text") from error
    receipt = {
        "schema_version": 1,
        "narration": {
            "path": str(script),
            "file_sha256": hashlib.sha256(raw_bytes).hexdigest(),
            "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "input_format": args.format,
            "word_count": len(WORD.findall(text)),
            "count_method": "unicode_alphanumeric_runs_with_internal_apostrophes_and_hyphens",
        },
        "measurement": None,
        "timing_status": "not_yet_measured",
        "current_script_duration_seconds": None,
        "read_matches_script_asserted": bool(args.read_matches_script),
        "estimate": None,
    }
    if not args.recording and (args.start is not None or args.end is not None):
        raise ValueError("A source window requires --recording")
    if args.recording:
        if args.observation:
            raise ValueError("--observation belongs to a stopwatch read, not --recording")
        source = Path(args.recording).expanduser().resolve()
        if not source.is_file():
            raise ValueError("Recording file does not exist: " + str(source))
        duration, method = recording_duration(source)
        start = finite_number(args.start if args.start is not None else 0, "Start")
        end = finite_number(args.end if args.end is not None else duration, "End")
        if end <= start:
            raise ValueError("End must be after start")
        if start >= duration or end > duration:
            raise ValueError("Source window exceeds the recording duration")
        receipt["measurement"] = {
            "source": "recording",
            "path": str(source),
            "sha256": sha256_file(source),
            "method": method,
            "source_duration_seconds": duration,
            "start_seconds": start,
            "end_seconds": end,
            "duration_seconds": end - start,
        }
    elif args.seconds is not None:
        if not args.observation or not args.observation.strip():
            raise ValueError("An actual stopwatch read requires --observation identifying the timed read")
        receipt["measurement"] = {
            "source": "reported_stopwatch",
            "observation": args.observation.strip(),
            "duration_seconds": finite_number(args.seconds, "Observed duration", positive=True),
        }
    elif args.observation:
        raise ValueError("--observation requires --seconds from an actual timed read")
    if receipt["measurement"] is not None:
        if args.read_matches_script:
            receipt["timing_status"] = "measured_matching_read"
            receipt["current_script_duration_seconds"] = receipt["measurement"]["duration_seconds"]
        else:
            receipt["timing_status"] = "reference_only_matching_read_not_confirmed"
    elif args.read_matches_script:
        raise ValueError("--read-matches-script requires a recording or actual stopwatch observation")
    if args.pace_wpm is not None:
        pace = finite_number(args.pace_wpm, "Pace", positive=True)
        estimate_seconds = finite_number(
            receipt["narration"]["word_count"] * 60 / pace,
            "Estimated duration", positive=True,
        )
        receipt["estimate"] = {
            "source": "word_count_divided_by_assumed_pace",
            "assumed_words_per_minute": pace,
            "duration_seconds": estimate_seconds,
        }
    return receipt


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--narration", required=True, help="UTF-8 spoken text, with no title or scene directions")
    parser.add_argument("--format", choices=("plain", "marked"), default="plain")
    sources = parser.add_mutually_exclusive_group()
    sources.add_argument("--recording", help="Existing recording; WAV or a format supported by installed ffprobe")
    sources.add_argument("--seconds", help="Actual observed stopwatch duration, never an estimate")
    parser.add_argument("--observation", help="Who/what/when identifies the actual timed read")
    parser.add_argument("--start", help="Selected take start in source seconds (default: 0)")
    parser.add_argument("--end", help="Selected take end in source seconds (default: recording duration)")
    parser.add_argument("--read-matches-script", action="store_true", help="Assert editorial review confirmed this read matches the delivered wording")
    parser.add_argument("--pace-wpm", help="Optional assumed pace for a separately labeled estimate")
    args = parser.parse_args(argv)
    try:
        receipt = build_receipt(args)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    print(json.dumps(receipt, indent=2, ensure_ascii=False, allow_nan=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
