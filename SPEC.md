# Cuecraft — Audio caption studio

This document defines the behavior and acceptance criteria. All demonstration data is synthetic. The demo runs without a login or API key.

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
8. Keep one session-only draft per existing cue when switching selection. Mark unsaved cues and offer explicit Save/Discard. Drafts do not affect playback, export or optional persistence. While any draft exists, disable track replacement/history actions; a delayed import must reject if typing began after its read started. Deleting a dirty cue requires saving or discarding first.
9. Set start/end from the actual audio element's current time as a draft, with normal validation at Save. On the stacked phone layout, caption selection focuses and reveals the editor; Back to captions returns focus to the track.

## Acceptance tests

- C1: timestamp format/parse for subsecond and >1hour values; reject invalid minute/second ranges and reversed/out-of-duration intervals.
- C2: reject overlaps, duplicate IDs, whitespace-only captions, NaN/Infinity; allow adjacent cues.
- C3: undo/redo sequences, deletion/restoration, redo invalidation and bounded history.
- C4: VTT round trip non-ASCII and markup characters; corrupted/oversized import preserves existing document.
- C5 browser: real playback time advances after user gesture, pause stops, seek updates active cue, edit/undo/redo, invalid timing error, download VTT and reimport.
- C6: keyboard range/transport and phone layout; audio loading/failure paths.
- C7: draft retention across cues; stale-import protection before Save; exports/storage exclude drafts; explicit discard, blocked track replacement and mobile editor focus.
- C8: native playhead timing drafts, invalid boundaries preserve saved cues, and undo restores valid timing commits.

## Documentation

Describe original asset generation/provenance, supported VTT subset, timing authority, undo model, limitations and sample editing/export walkthrough.

## Completion gate

Implement the behavior and acceptance tests above; document any deliberate limitation. `npm run check` and `npm run test:e2e` must pass. Independently review the code and exercise the production build before release. Verify the public demo at its GitHub repository subpath.
