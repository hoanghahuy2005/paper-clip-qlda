# Editing and synchronization

## Dialogue

Keep a readable transcript and explicit retained source windows with reasons. The paper edit must retain the main point, why it matters, evidence, qualifications and ending. A polished sentence with the wrong causal story is a failed edit.

Follow the [local transcription default](../SKILL.md#local-transcription): reuse an appropriate saved transcript, then use a compatible local runner. MacWhisper is optional; preserve existing exports and user edits when it is the chosen route. Inspect only the requested material. See [transcription and reuse](transcription.md) for the runner/cache workflow. For a local whisper.cpp fallback, consult the installed CLI's help for timestamp options rather than assuming another build's flags.

Read recognition output in context, including dictated chat messages. Preserve the raw transcript and correct a working copy using the project's vocabulary and the intended meaning. A vocabulary match is not permission for global replacement; a similar name can be a legitimate different word. Never carry a misrecognized name into narration, captions or screen text. Keep intentional ad-libs that preserve meaning, and ask only when an unresolved ambiguity changes it.

Long silence or accelerated sections can produce invented repeated speech and timestamp drift. Transcribe speech blocks separately and add source offsets. ASR can also collapse several attempts into one fluent line. Inspect short suspicious excerpts and the waveform instead of trusting one long transcript.

Word anchors sit inside words. Cut in surrounding quiet intervals, retaining initial consonants and trailing phonemes. Tiny audio edge fades prevent clicks. Quantize picture cuts consistently and concatenate contiguous audio before lossy encoding. Avoid many tiny cuts that destroy rhythm.

Normalize and inspect the result. Around -16 LUFS with headroom is a useful speech starting point, not a universal platform requirement. Keep transitions from jumping above speech. Preserve source resolution where useful and provide a practical sharing export.

Use the complete selected performance to derive timing. A transcript can collapse retakes or miss speech; a detected pause is a candidate boundary, not an instruction to remove it. Keep the performance's pauses and phonetic handles. If script wording is delivered or revised, report a tool-counted narration-only word count and measured read duration/source window. Mark duration unmeasured when no read exists, with estimates explicitly separate.

## Captions

Caption the final edit, using either its transcript or source cues accurately retimed through every retained window and speed change. A source transcript with original timestamps does not satisfy this step. Correct names, technical terms, punctuation, and ASR hallucinations. Preserve what was actually said, including qualifications. Include meaningful non-speech sounds when they affect understanding.

Reconcile repeated visible wording against the selected read as well. A genuine difference such as “read” versus “reads” is not an automatic recognition correction; establish the intended wording. Exact product names, terminal lines and stamp text should remain editable when generated lettering is unreliable.

Review caption text against the complete edited narrative and check timing at the beginning, around cuts and cards, after speed changes, and through the ending. Check each distinct edit independently. Set the manifest's caption `reviewed` field to true only after this review; reset it when speech or timing changes. State any limits on direct listening honestly.

Export UTF-8 SRT or WebVTT with nonempty cues, ordered start times and end times within the associated video's duration. Same-story layouts can share a sidecar when their audio and timing are identical. Keep this sidecar for uploading even if the video also includes an embedded selectable caption track. Burned-in captions cannot be toggled off and do not replace a closed-caption deliverable.

For social exports, normally render an additional version with captions visible in the picture. Favor short readable phrases, generous margins, and a consistent quiet area. Avoid covering the speaker's face, useful screen details, or platform controls. Review representative captioned frames at phone size and crowded points in the demonstration. Retain the clean master; copy approved audio unchanged where possible and verify preservation when adding caption graphics.

## Screen Studio

Prefer an original `.screenstudio` project for a sharp independent camera panel. Enlarging a flattened camera bubble is a fallback. Do not overwrite the original project just to obtain another layout.

One observed package layout contains `recording/channel-1-display-0.mp4`, `channel-2-microphone-0.m4a`, `channel-3-webcam-0.mp4`, and `project.json` with `json.scenes[0].slices`. Inspect actual metadata: channel numbers, names, scenes, schema and offsets can differ.

For this slice schema:

```text
exportDuration = (sourceEndMs - sourceStartMs) / 1000 * timeScale
originalTime = sourceStartMs / 1000 + (exportTime - cumulativeExportStart) / timeScale
```

Intersect approved cuts with slice boundaries; a cut can cross a source jump. Preserve output frame counts when splitting. Account for actual track offsets and mirroring. Compare project duration with the reference export because saved state may differ from a prior export.

Verify synchronization against exported speech at several positions, including after speed changes. Speech-envelope correlation can separate small processing delay from a genuine mapping error. Measure corrections for this recording; never reuse another video's numeric offset. A differently edited screen-only export cannot be aligned by guessing a constant offset.

## Framing and QA

Frame input prompts, progress, result previews and closing separately when useful. Choose crops from representative frames rather than another recording's coordinates. Keep a synchronized webcam panel below the screen when it helps the vertical cut.

Preserve complete time-card text. Fit the whole card over a matching background if portrait cropping truncates it. Inspect first/last frames to exclude neighboring cards from a compilation.

For the same edit in multiple layouts, retain approved audio where possible, match frame totals and compare copied audio hashes. For separate long/short edits, keep independent source windows and transcripts.

For audio-only revisions, retain the accepted picture when possible. Compare the preserved media stream in a container-aware way; a remux changes whole-file bytes even when its video or audio packets are unchanged. State when re-encoding prevents bit-identity claims.

Inspect the encoded first/last frames and transitions in continuous playback in both layouts. Still contact sheets alone can miss one-frame flashes, black gaps and terminal text that finishes too late to read. Reserve a reading hold for important copy before fitting the reveal into the scene. Report technical, visual, listening and intended-device checks separately.
