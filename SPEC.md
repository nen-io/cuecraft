# Cuecraft — Audio caption studio

Status: implementation authorized 17 September 2026. This spec plus docs/QUALITY.md is the acceptance contract. All data in this public example is synthetic. Demo must work with no login or API key.

## Product and visual design

A warm cream editorial studio with charcoal text, orange playhead, large waveform and a precise caption timeline. Default clip is an original generated audio composition, honestly labelled as a tone/sound sample with descriptive captions; do not pretend synthesized tones are spoken words. Can use an original recorded spoken sample only if generated/licensed reproducibly. The waveform must represent actual decoded samples.

## Model and rules

Document v1 contains media duration and sorted cues {id,startMs,endMs,text}. Cue times are integer milliseconds, 0 <= start < end <= actual media duration. No overlapping cues; touching boundaries allowed. IDs unique; text nonempty <=500 characters; max 100 cues. Use half-open active intervals [start,end). Duration comes from loaded media, with a clear loading/error state.

## Required behavior

1. Built-in playable asset loads without external network. Play/pause/seek/reset, current/duration readout and active cue. Audio element/media clock is authoritative, not setInterval drift. Handle play() rejection and ended.
2. Select, edit text/start/end, add cue in available space, delete cue. Invalid edit shows a field error and leaves committed document unchanged.
3. Undo/redo records committed document operations, not playback ticks or selection. A new edit after undo clears redo. Use bounded history.
4. Waveform supports click/keyboard seek via labelled range input. Timeline and caption list track same selection. Space shortcuts must not interfere with typing.
5. Export well-formed UTF-8 WebVTT with millisecond timestamps and escaped caption markup. Support importing this project's WebVTT subset with useful errors; reject oversized input >512 KiB and unsupported malformed timestamps. Round-trip text including &, < and > without rendering arbitrary HTML.
6. Restore edits optionally from validated storage keyed to bundled asset; failures nonfatal. A reset-to-sample action restores original cues.
7. No speech recognition or rendering claims. All buttons operate; display audio errors instead of fake moving playhead.

## Acceptance tests

- C1: timestamp format/parse for subsecond and >1hour values; reject invalid minute/second ranges and reversed/out-of-duration intervals.
- C2: reject overlaps, duplicate IDs, whitespace-only captions, NaN/Infinity; allow adjacent cues.
- C3: undo/redo sequences, deletion/restoration, redo invalidation and bounded history.
- C4: VTT round trip non-ASCII and markup characters; corrupted/oversized import preserves existing document.
- C5 browser: real playback time advances after user gesture, pause stops, seek updates active cue, edit/undo/redo, invalid timing error, download VTT and reimport.
- C6: keyboard range/transport and phone layout; audio loading/failure paths.

## Documentation

Describe original asset generation/provenance, supported VTT subset, timing authority, undo model, limitations and sample editing/export walkthrough.

## Completion gate

All specified behavior and tests implemented or parent explicitly resolves a scope issue; documentation reflects real behavior; npm run check and npm run test:e2e pass; parent reviews code and actually exercises app before publication. Public demo runs from GitHub repository subpath. No cleanup before verified publication.
