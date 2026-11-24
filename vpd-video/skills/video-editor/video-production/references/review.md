# Review a cut or audition

Use the bundled [review helper](../scripts/review.py) and [player template](../assets/review.html) for rough cuts, format comparisons and music auditions. This is separate from the final `production.json` delivery checker: a useful rough review does not require final covers or publishing copy.

The helper needs Python 3.10+ and `ffprobe` on PATH. It uses the standard library; the player uses native browser controls with no remote scripts, fonts, analytics or media requests.

## Input

Create a `review.json` beside the candidate exports. Each candidate is one MP4 containing its complete mix. Never try to synchronize a separate browser music element with a video element. Silent animatics are permitted. For a fair music audition, use the same narration, picture, duration, dialogue gain and agreed processing across the music choices; verify that separately from this helper's technical checks.

```json
{
  "schema_version": 1,
  "title": "A short explanation — music audition",
  "selected": "r2-wide-a",
  "candidates": [
    {
      "id": "r2-wide-a",
      "label": "Full story",
      "revision": "r2",
      "timeline": "full-story-r2",
      "aspect": "16:9",
      "music": "Candidate A",
      "path": "exports/wide music A.mp4",
      "captions": {"path": "captions/full-story.vtt", "language": "en", "label": "English"},
      "chapters": [{"id": "opening", "label": "The problem", "start": 0}]
    },
    {
      "id": "r2-tall-a",
      "label": "Full story",
      "revision": "r2",
      "timeline": "full-story-r2",
      "aspect": "9:16",
      "music": "Candidate A",
      "path": "exports/tall music A.mp4"
    }
  ]
}
```

Add more candidates for music B, other revisions, or a distinct short edit. The selector groups a cut by `timeline` and `revision`, then offers available formats and music choices. It does not require a complete format × music matrix. If the selected music is unavailable in another format, the player selects an available candidate and shows its actual music label.

Required candidate fields are `id`, `label`, `revision`, `timeline`, `aspect`, `music`, and `path`. IDs are unique. A timeline/revision/aspect/music tuple must also be unique, so controls never identify two different files. `selected` defaults to the first candidate. Chapters and WebVTT captions are optional; chapter IDs identify scenes in copied feedback. Use the actual cut's chapter times and reviewed caption wording. Keep raw recognition output elsewhere untouched.

**A timeline is a claim of matching editorial time.** Reuse its ID only when the same position identifies the same story moment. Matching duration alone does not establish this. Same-timeline files must have measured video durations within 0.1 seconds; different edits need distinct timeline IDs even when their durations happen to match. Switching within a timeline preserves time and play/pause state. Switching to a distinct timeline resets to the beginning while preserving play/pause state.

Media and caption paths must be relative to the manifest directory, stay inside it, and identify real files. Names with spaces are supported. Export MP4 with one H.264/yuv420p video stream, square pixels, baked orientation, and zero or one AAC audio stream. These constraints improve browser compatibility; they do not guarantee playback in every browser or on a remote device. Only 16:9 and 9:16 are currently supported, with a 1% aspect-ratio tolerance for pixel rounding.

## Check and build

Run commands from the installed skill directory, or use its absolute helper path:

```sh
python3 scripts/review.py check /path/to/project/review.json
python3 scripts/review.py build /path/to/project/review.json /path/to/new-review-bundle
```

The read-only check probes the actual files, checks aspect ratio, codec, duration, caption timing, selected ID, unique choices and chapter times. It does not infer equal story content, identical narration, an acceptable music mix, caption accuracy, or editorial approval. `--ffprobe /absolute/path/to/ffprobe` can be supplied before the subcommand.

Build copies files into a new directory and writes `index.html` and a normalized `review.json` with measured media metadata. The destination must not already exist. Source exports are never changed. The HTML embeds the manifest and caption text, avoiding file-origin JSON/caption fetches. Keep the entire directory together: it is a portable bundle, not a single embedded-video HTML file. The bundle may be copied after the original sources are moved or archived.

Open `index.html` in a browser. The player provides native playback, format and music switching, captions, chapter seeking, video/caption downloads, and a copyable feedback reference containing revision, candidate, timeline, scene and current time. Clipboard access can be unavailable on local files; a selected text field is the fallback.

For browsers that restrict file playback, use the local server:

```sh
python3 scripts/review.py serve /path/to/new-review-bundle --port 8080
```

The server binds only to `127.0.0.1`, supports video byte ranges and HEAD requests, and serves only bundle files listed in the manifest plus the page and manifest. Stop it with Ctrl-C when the review is finished. It exposes no directory listing and performs no external hosting. A phone cannot use another computer's loopback or local file path. Choose an authorized delivery route separately and verify real playback on that device; a responsive desktop test is not a phone-access test.

## Review before delivery

Check beginning, ending, every cut boundary, longest text, critical payoff, captions, format/music switches while playing and paused, and the chosen device. Listen to the complete mix and relevant A/B passages. Verify the final encoded files, not just a composition preview. Keep technical checks, direct listening, visual review and user approval as distinct results. Record the selected candidate in the project's current brief before making a final package.
