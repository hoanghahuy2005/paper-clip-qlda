# Spoken narration and timing

Start the draft → speak → transcribe → revise loop with the first full draft. A rehearsal can become the production take when it is suitable; the person does not need to reproduce an awkward sentence just because it was written first.

## Listen for writing problems

- Catch breathless clauses, stumbling points, repeated words or meanings, tense changes, and competing endings. A second closing slogan can weaken the first.
- Compare the actual read with the draft. Preserve intentional ad-libs that keep the meaning; distinguish these from recognition errors. Reconcile captions and exact screen copy with the selected performance.
- Run the cold-viewer test: can someone name the category, what the thing is, where it lives, what changed, and who benefits? Use only questions relevant to the story.
- Check the traveling fact at every step, then audit the truth independently. Pictures can make unsupported claims even when the narration is correct.
- Run the creator's chosen style checks. Do not universalize one creator's punctuation, humor, pacing, or recording preferences.

Use saved transcripts and timestamps before transcribing again. A compatible local engine such as Parakeet can supply recognition; MacWhisper is an optional interface, not a prerequisite. Keep raw output unchanged, use contextual corrections in a working copy, and inspect the actual audio where meaning or timing is uncertain. Local recognition does not eliminate the tokens used in later editorial review.

## Count and measure

Run commands from the installed skill folder, or resolve the helper's absolute path. It is self-contained and needs Python 3.9+; WAV measurement uses the standard library. Other recording formats require an existing `ffprobe` executable. The helper downloads nothing and writes only JSON to stdout.

```bash
python3 scripts/measure.py --narration /project/writing/narration.txt
python3 scripts/measure.py --narration /project/writing/narration.txt --recording /project/sources/read.wav --start 12.5 --end 93.2 --read-matches-script
python3 scripts/measure.py --narration /project/writing/narration.txt --seconds 80.7 --observation "Creator timed the complete current read with a stopwatch today" --read-matches-script
```

Use `--read-matches-script` only after checking that the selected recording or observed timed read matches the delivered words. Without it, a recording's elapsed time is reported as **reference-only**, and the current script's duration stays unknown. A stopwatch value must come from an actual observed read; the receipt identifies it as reported rather than tool-probed. `--pace-wpm 150` adds a separately labeled estimate, never a measurement.

The default input is **plain narration only**: no title, status, scene labels, directions, or measurement receipt. Obvious Markdown and status headers are rejected. To count a Markdown writing file, use `--format marked` and put exactly one spoken passage between these delimiters:

```text
Status: CURRENT
<!-- narration:start -->
Spoken words go here.
<!-- narration:end -->
Word count and production notes go outside the delimiters.
```

The counter treats Unicode letter/number runs as words, keeps internal apostrophes and hyphens together, and treats other punctuation as boundaries. Counts are reproducible orthographic counts, not a pronunciation model; spell out numbers and symbols in the script as they will actually be said if the distinction matters.

Receipts include hashes of the source writing file, selected narration text, and recording; source/window details; the count; the matching-read assertion; measured/reference/unknown timing status; and any separate estimate. Saving a receipt is an intentional project write permitted only after brainstorm mode ends. A receipt does not prove that a read matches, that the performance sounds good, or that the script passes editorial review.

Every delivered script reports the tool count and measured duration with its source. When a matching read is absent, report “duration not yet measured; spoken-read check incomplete.” A previous draft's read can remain a reference, but revised wording needs its own matching read before its timing is current.
