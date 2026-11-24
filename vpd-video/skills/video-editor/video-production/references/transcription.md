# Local transcription and vocabulary

Reuse compatible existing transcripts first. Otherwise transcribe locally with a runner suited to the machine. MacWhisper is optional; do not silently move to cloud transcription when local setup fails. Inspect installed capabilities before downloading anything.

[Parakeet TDT v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3) has downloadable CC BY 4.0 weights and direct inference instructions. [parakeet-mlx](https://github.com/senstella/parakeet-mlx) is an Apache-2.0 runner for Apple Silicon; its CLI needs FFmpeg. NeMo is another route documented by NVIDIA. Follow the current installation instructions for the selected version in an isolated environment. Record runtime version and model checkpoint separately. Installing this skill does not install these tools or download model weights. Local ASR avoids cloud transcription processing; sending its text to a hosted writing agent still consumes context.

## Reuse and run helper

Resolve the skill directory from the loaded skill's actual path; commands work from any current directory. The helper uses Python 3.9+ and FFprobe. `run` additionally needs FFmpeg and an installed `parakeet-mlx` executable. It never installs tools or calls cloud transcription.

```sh
python3 "$video_skill_dir/scripts/transcribe.py" import /path/to/recording.m4a \
  --transcript /path/to/export.json --engine macwhisper-parakeet \
  --model parakeet-v3 --engine-version unknown --model-revision unknown \
  --output /path/to/project/edit/transcripts

python3 "$video_skill_dir/scripts/transcribe.py" run /path/to/recording.m4a \
  --model mlx-community/parakeet-tdt-0.6b-v3 \
  --engine-version VERSION --model-revision CHECKPOINT \
  --output /path/to/project/edit/transcripts
```

Use actual version/checkpoint identifiers. These are declared provenance, not automatic version verification or revision pinning; inspect the installed runner/model when recording them. `unknown` makes missing provenance explicit on imported legacy exports; it is not proof of reproducibility. Model/runtime updates invalidate reuse: provide updated identifiers. Direct model loading may download/cache weights on first use. No audio upload is needed. The runner uses its version's defaults; the helper removes `PARAKEET_*` option overrides except the model-cache location so ambient decoding settings cannot silently alter an existing cache identity.

Imports accept raw TXT or JSON: MacWhisper `transcripts` use milliseconds; MLX `sentences` use seconds; generic `segments` require explicit `--time-unit seconds|milliseconds`. For a transcript of an extracted source passage, pass `--offset` in source seconds. Apply an offset only once; exports already timed to the original source need zero. TXT has no timing and cannot establish caption timing or measured read duration. Retain SRT/VTT exports separately; this helper does not import them.

`run --start S --end S` extracts a 16 kHz mono PCM derivative, normalizes returned timestamps back to the original source and preserves originals. Default is the complete source. Cache identity includes source bytes, source window, model/runtime identifiers and relevant settings; imported transcript bytes are also part of identity. Output is a hash directory with untouched raw export, normalized text/JSON and a completion receipt. No editorial corrections are applied. Same inputs reuse the entry; changed/corrupt cache files are reported instead of overwritten. Copy the normalized transcript to a separate working file for corrections. Different wrappers may produce different recognition: compare a real sample before switching an established project.

Point timestamps on individual ASR tokens are preserved; they are not valid duration-bearing caption cues by themselves. Negative relative timestamps or data outside the source window fail validation. If a runner finishes but normalization fails, its raw export is saved with a failure receipt and later identical calls stop for review instead of transcribing again. Inspect that saved export and import a separately corrected derivative when appropriate; never edit the raw cache in place.

## Lossy text requires judgment

Read recognized text—including dictated chat messages—in context. Use the vocabulary file to resolve names and terms before they reach a script, caption or screen. Never propagate a known recognition mistake. Do not blindly replace every alias: the same spelling may be a legitimate name elsewhere. Ask only if unresolved ambiguity changes the meaning. Preserve intended ad-libs that keep the meaning; a tense or factual change may need review.

Keep `vocabulary.json` with the current handoff. A useful shape:

```json
{
  "terms": [{
    "canonical": "Clearpath",
    "variants": ["clear path", "Clearpass"],
    "context": "The project name; ordinary navigation directions may still say clear path.",
    "pronunciation": "clear-path"
  }]
}
```

A vocabulary guides editorial decisions; helpers deliberately do not replace words automatically. Keep raw text, corrected working text and selected source windows distinct. Automatic speaker labels and word boundaries need review. Transcripts can omit repeated attempts, invent words in silence, or miss an initial consonant. Inspect suspicious audio passages instead of treating a fluent transcript as a complete record.

For long recordings, use a take/section index and retrieve relevant passages. Judge the full selected script once, then focus subsequent edits on changes with surrounding context. Reuse the source transcript after picture/music edits; recompute caption timing through changed cut windows. Save complete output receipts so stale pending notes do not cause another ASR run. Signal checks and transcripts do not establish a listening review.
