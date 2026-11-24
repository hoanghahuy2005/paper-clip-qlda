#!/usr/bin/env python3
"""Preserve and normalize local ASR exports; optionally run installed parakeet-mlx.

No cloud calls or vocabulary substitution. Cache entries are content addressed.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def number(value, label):
    if isinstance(value, bool):
        raise ValueError(f'{label}: expected a finite number')
    result = float(value)
    if not math.isfinite(result):
        raise ValueError(f'{label}: expected a finite number')
    return result


def duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                             'format=duration', '-of', 'json', str(path)],
                            capture_output=True, text=True, timeout=60, check=True)
    value = number(json.loads(result.stdout)['format']['duration'], 'duration')
    if value <= 0:
        raise ValueError('source has no positive duration')
    return value


def normalize(path, unit, offset, source_duration):
    if path.suffix.lower() == '.txt':
        text = path.read_text(encoding='utf-8-sig').strip()
        if not text:
            raise ValueError('transcript is empty')
        return {'text': text, 'segments': [], 'timing': 'unavailable'}
    if path.suffix.lower() != '.json':
        raise ValueError('import expects JSON or plain TXT; preserve subtitle exports separately')
    data = json.loads(path.read_text(encoding='utf-8-sig'))
    if not isinstance(data, dict):
        raise ValueError('transcript JSON must be an object')
    if 'transcripts' in data:
        rows, detected_unit = data['transcripts'], 'milliseconds'  # MacWhisper project export
    elif 'sentences' in data:
        rows, detected_unit = data['sentences'], 'seconds'  # parakeet-mlx
    elif 'segments' in data:
        rows, detected_unit = data['segments'], None
    else:
        raise ValueError('JSON needs transcripts, sentences, or segments')
    unit = unit or detected_unit
    if unit not in ('seconds', 'milliseconds'):
        raise ValueError('ambiguous timestamp units: pass --time-unit seconds or milliseconds')
    if not isinstance(rows, list) or not rows:
        raise ValueError('transcript has no segments')
    factor = 0.001 if unit == 'milliseconds' else 1
    segments = []

    def window(row, point_allowed=False):
        relative_start = number(row.get('start', row.get('startTime')), 'start') * factor
        relative_end = number(row.get('end', row.get('endTime')), 'end') * factor
        start, end = relative_start + offset, relative_end + offset
        if relative_start < 0 or end < start or (end == start and not point_allowed) or end > source_duration + .02:
            raise ValueError(f'timestamp outside source or empty: {start}–{end}')
        return start, end

    for index, row in enumerate(rows):
        if not isinstance(row, dict) or not isinstance(row.get('text'), str) or not row['text'].strip():
            raise ValueError(f'segment {index}: nonempty text required')
        start, end = window(row)
        if segments and start < segments[-1]['start']:
            raise ValueError('segment starts must be ordered')
        out = {'source_segment': index, 'start': start, 'end': end, 'text': row['text']}
        words = row.get('words', row.get('tokens', []))
        if not isinstance(words, list):
            raise ValueError('words/tokens must be a list')
        if words:
            out['words'] = []
        for word in words:
            if not isinstance(word, dict) or not isinstance(word.get('text'), str):
                raise ValueError('word needs text and timestamps')
            a, b = window(word, point_allowed=True)
            if a < start - .02 or b > end + .02:
                raise ValueError('word timestamp extends outside its segment')
            if out['words'] and a < out['words'][-1]['start']:
                raise ValueError('word starts must be ordered')
            out['words'].append({'text': word['text'], 'start': a, 'end': b})
        # Speaker identification is unverified metadata; preserve it only in raw.json.
        segments.append(out)
    return {'text': '\n'.join(x['text'] for x in segments), 'segments': segments,
            'timing': 'source-seconds', 'applied_offset_seconds': offset}


def cached(entry, identity):
    if not entry.exists():
        return None
    receipt = json.loads((entry / 'receipt.json').read_text())
    if receipt.get('identity') != identity:
        raise ValueError('cache identity mismatch')
    for name, expected in receipt['outputs'].items():
        if digest(entry / name) != expected:
            raise ValueError(f'cached {name} changed; keep corrections in a separate working copy')
    if receipt.get('state') != 'transcribed-unreviewed':
        raise ValueError(f'previous runner output needs normalization review; raw export preserved in {entry}')
    return {'status': 'reused', 'directory': str(entry), 'receipt': str(entry / 'receipt.json')}


def execute(args):
    source = Path(args.source).expanduser().resolve(strict=True)
    if not source.is_file():
        raise ValueError('source must be a file')
    source_duration = duration(source)
    identity = {'schema_version': 1, 'source_sha256': digest(source),
                'engine': args.engine if args.command == 'import' else 'parakeet-mlx',
                'model': args.model, 'engine_version': args.engine_version,
                'model_revision': args.model_revision}
    raw = None
    if args.command == 'import':
        raw = Path(args.transcript).expanduser().resolve(strict=True)
        offset = number(args.offset, 'offset')
        if offset < 0 or offset >= source_duration:
            raise ValueError('offset must be inside the source')
        identity.update({'raw_sha256': digest(raw), 'offset': offset, 'time_unit': args.time_unit})
    else:
        start = number(args.start, 'start')
        end = source_duration if args.end is None else number(args.end, 'end')
        if start < 0 or end <= start or end > source_duration:
            raise ValueError('run window must be nonempty and inside the source')
        runner = shutil.which(args.runner)
        if not runner:
            raise ValueError('parakeet-mlx runner unavailable; install locally or import an existing export')
        identity.update({'start': start, 'end': end, 'runner_sha256': digest(Path(runner)),
                         'runner_settings': {'output_format': 'json', 'input': '16kHz mono PCM',
                                             'options': 'version defaults; PARAKEET_* overrides removed'}})
        offset = start
    key = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    base = Path(args.output).expanduser().resolve()
    entry = base / key
    hit = cached(entry, identity)
    if hit:
        return hit
    # Validate imported content before creating anything in the requested output.
    normalized = normalize(raw, args.time_unit, offset, source_duration) if raw else None
    base.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.asr-', dir=base) as scratch:
        work = Path(scratch)
        if raw is None:
            media = work / 'input.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(source), '-ss', str(start),
                            '-t', str(end-start), '-vn', '-ar', '16000', '-ac', '1', str(media)],
                           capture_output=True, text=True, timeout=300, check=True)
            outputs = work / 'runner-output'
            outputs.mkdir()
            runner_env = {k: v for k, v in os.environ.items()
                          if not k.startswith('PARAKEET_') or k == 'PARAKEET_CACHE_DIR'}
            subprocess.run([runner, str(media), '--model', args.model, '--output-format', 'json',
                            '--output-dir', str(outputs), '--output-template', 'input'],
                           capture_output=True, text=True, env=runner_env,
                           timeout=args.timeout, check=True)
            matches = list(outputs.glob('*.json'))
            if len(matches) != 1:
                raise ValueError('runner must produce exactly one JSON export')
            raw = matches[0]
            try:
                normalized = normalize(raw, 'seconds', offset, source_duration)
                for segment in normalized['segments']:
                    if segment['start'] < start or segment['end'] > end + .02:
                        raise ValueError('runner timestamps extend outside requested source window')
            except (ValueError, TypeError, KeyError) as error:
                failed = work / 'failed'
                failed.mkdir()
                shutil.copyfile(raw, failed / 'raw.json')
                receipt = {'identity': identity, 'source': str(source),
                           'state': 'normalization-failed', 'error': str(error),
                           'raw_preserved': True, 'recognition_reviewed': False,
                           'listening_reviewed': False, 'outputs': {'raw.json': digest(raw)}}
                (failed / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
                failed.rename(entry)
                raise ValueError(f'{error}; raw runner export preserved for review in {entry}') from error
        result = work / 'result'
        result.mkdir()
        raw_name = 'raw' + raw.suffix.lower()
        shutil.copyfile(raw, result / raw_name)
        (result / 'transcript.json').write_text(json.dumps(normalized, indent=2, ensure_ascii=False) + '\n')
        (result / 'transcript.txt').write_text(normalized['text'] + '\n')
        receipt = {'identity': identity, 'source': str(source), 'source_duration_seconds': source_duration,
                   'state': 'transcribed-unreviewed', 'raw_preserved': True,
                   'recognition_reviewed': False, 'listening_reviewed': False,
                   'outputs': {p.name: digest(p) for p in result.iterdir()}}
        (result / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        if entry.exists():
            return cached(entry, identity)
        result.rename(entry)
    return {'status': 'created', 'directory': str(entry), 'receipt': str(entry / 'receipt.json')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for command in ('import', 'run'):
        p = commands.add_parser(command)
        p.add_argument('source')
        p.add_argument('--output', required=True, help='local content-addressed cache directory')
        p.add_argument('--model', required=True)
        p.add_argument('--engine-version', required=True, help='record installed version, or unknown for an existing export')
        p.add_argument('--model-revision', required=True, help='model revision/checkpoint, or unknown for an existing export')
        if command == 'import':
            p.add_argument('--transcript', required=True)
            p.add_argument('--engine', required=True)
            p.add_argument('--time-unit', choices=('seconds', 'milliseconds'))
            p.add_argument('--offset', type=float, default=0)
        else:
            p.add_argument('--runner', default='parakeet-mlx')
            p.add_argument('--start', type=float, default=0)
            p.add_argument('--end', type=float)
            p.add_argument('--timeout', type=int, default=1800)
    args = parser.parse_args()
    try:
        print(json.dumps(execute(args), indent=2))
    except (ValueError, OSError, KeyError, TypeError, subprocess.SubprocessError) as error:
        print(f'transcription: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
