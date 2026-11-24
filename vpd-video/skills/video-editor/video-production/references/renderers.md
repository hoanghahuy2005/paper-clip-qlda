# Renderer routes

These are useful starting points, not capability limits. Respect the requested renderer and preserve a working project. Inspect the installed version and available tools before claiming an integration is usable. A connection configured in another agent client may not be available here.

| Route | Useful starting point | Shared obligations |
| --- | --- | --- |
| Recorded face/screen footage | Remotion for repeatable compositions, inserts and captions; FFmpeg for simple media operations. | Source windows, sound, natural speech, sharp reframing and readable evidence. |
| Illustrated or animated explanation | HyperFrames for HTML/CSS composition and seekable motion. | Current script/scene handoff, reference art, causal clarity and readable holds. |
| Hybrid | Existing renderer plus a bounded animated insert. | One output clock and verified seam, color, framing and audio continuity. |

Both Remotion and HyperFrames can work with footage and animation. Choose for the existing assets/source, available skills and the required result; do not port a functioning project to satisfy this table. Read upstream authoring guidance rather than copying a frozen renderer manual into this skill.

## Remotion

Use [the official documentation](https://www.remotion.dev/docs/) and its available agent skills for the installed version. It covers React compositions, video/audio, captions and rendering; [animation guidance](https://www.remotion.dev/docs/animating-properties) explains frame-driven properties.

Turn the paper edit into explicit retained source windows before adding graphics. Keep cut timing and content shared for `both-same`, with separate layout parameters/components where appropriate. Build the recorded material first, then layer inserts and text without losing the speaker's context. For screen recordings, recover separate camera/screen tracks when available instead of magnifying a flattened webcam bubble; see [synchronization](editing.md#screen-studio).

Inspect timeline frames at cuts and text changes, then render representative difficult sections. Verify the encoded media, not only the interactive player. Keep renderer version and edit recipe with the result so a later revision can reproduce it.

## HyperFrames

[HyperFrames' upstream repository](https://github.com/heygen-com/hyperframes) documents its HTML-to-video model, CLI/Studio and agent skills. If its skills are available, begin with its entry point, then load the current core, animation, audio and CLI guidance that the actual task needs. Otherwise consult the matching upstream documentation before authoring. Do not invent timing attributes or mix-media APIs from memory.

Start with the accepted scene handoff and narration anchors. Build a cheap animatic and one pivotal scene before generating the entire asset list. Define each scene's opening, settled and exit states and every object's persistence. Seekable motion must produce the intended appearance when entering a scene directly, not only after playing from time zero.

Keep a visible initial pose where the accepted scene requires one; verify boundary frames for accidental white flashes, blank gaps and a late first pose. Honor rejected effects in the current “do not” list. A full-frame flash is not a default transition. Animate the explanatory object through the causal chain, allowing enough time to inspect it.

Use upstream audio capabilities for placed-track fades, ducking or carving when appropriate; preprocessing sources and mixing placed tracks are distinct jobs. Render both requested layouts using the same selected narration/clock for `both-same`.

## Revisions and verification

Record a known working version and dependency lock. Apply relevant tool upgrade guidance, verify the changed version against the project, and report any upgrade. A passing structural check alone does not establish identical rendered output. If a candidate upgrade fails, preserve the working project and report the failed check rather than silently accepting a regression.

Separate the changed stream when possible: audio-only work can remux preserved picture; picture-only work can retain accepted audio. Verify packet or decoded-stream identity using a comparison suited to the container/codec rather than comparing whole-file hashes after remuxing. When an operation requires re-encoding, report that and check content/timing instead of claiming bit identity.

Run the renderer's relevant checks and inspect the final encoded beginning, ending and scene boundaries in both layouts. A black/white-frame detector is a diagnostic, not a ban on intentional black/white imagery. Distinguish structural checks, visual playback, audio listening and target-device review in the receipt.
