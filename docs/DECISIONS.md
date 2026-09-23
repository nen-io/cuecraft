# Architecture decision records

## ADR001 — React shell, pure domain model

**Context:** A precise caption editor needs valid transitions, readable tests and a polished interface. **Alternatives:** embed rules in component callbacks; introduce a global state library; build custom elements without a framework. **Decision:** React 19 and TypeScript with pure caption/codec/history modules. The studio owns per-cue drafts while components own presentation; the domain validates the complete committed document. **Consequences:** tests exercise rules without a browser and UI cannot commit a partially valid track. Some orchestration remains in the studio component; extracting an external store would add indirection without shared consumers. **Revisit:** multiple editing surfaces, very large documents or reuse of the engine outside this app.

## ADR002 — Native media time, decoded waveform

**Context:** A visual editor can look convincing while showing fake waveforms or drifting timer-based progress. **Alternatives:** synthetic visual bars, setInterval time, or WebAudio scheduling for all playback. **Decision:** native audio owns transport and duration; a separate short-lived WebAudio decode computes peaks from the exact asset. **Consequences:** browser seeking and ended behavior remain correct, but visual updates follow native event frequency and may be less fluid than requestAnimationFrame. Decode failures and playback failures are independent and explicit. **Revisit:** sample-accurate editing, multi-track mixing or long-media memory pressure.

## ADR003 — Bounded immutable snapshots and optional local storage

**Context:** A user should recover from any committed edit without playback filling history or slow imports overwriting newer work. **Alternatives:** inverse patch log, persistent database, automatic storage and cross-tab synchronization. **Decision:** at most 40 full history states, separate selection/playback state, opt-in asset/version-bound localStorage, and revision-fenced file reads. **Consequences:** transparent undo and atomic imports with bounded memory; reload history is not persisted and multiple tabs are last-writer-wins. Retry preserves the mounted studio. **Revisit:** measured snapshot cost, larger documents, multi-tab requirements or collaborative editing.

## ADR004 — Strict WebVTT subset and explicit security boundary

**Context:** Caption files are untrusted and full WebVTT permits rich syntax irrelevant to the demo. **Alternatives:** full parser with style/region support; raw HTML rendering; accept malformed inputs best-effort. **Decision:** strict timestamps and plain/escaped text only, validate before commit, DOM text rendering, escaped export and native parser interoperability tests. Import bound 512 KiB applies before reading. **Consequences:** malicious content remains text; unsupported valid WebVTT features are rejected with errors. The 512 KiB ceiling is chosen to preserve round-trip imports for every valid maximum-size document, including entity expansion and multibyte text. **Revisit:** user demand for full standard support, backed by a maintained parser, expanded test corpus and revised resource envelope.

## ADR005 — Fixed small audio and static deployment

**Context:** An employer should run the demo without credentials, backend setup or unreliable external assets. **Alternatives:** audio upload, cloud transcription, remote sample URLs, or persistent shared projects. **Decision:** one original reproducible PCM composition with no external fonts/assets and relative Vite base. Production builds include CSP; hosting headers remain a deployment concern. **Consequences:** deterministic demos, constrained decoder work and no server data boundary; this does not demonstrate production authentication or a scalable transcription backend. **Revisit:** actual audio-upload product requirements, which demand a new threat model, quotas and execution architecture.

## ADR006 — Simple linear UI within an honest scale envelope

**Context:** Complexity should pay for a real requirement. **Alternatives:** virtual list, indexed interval tree, worker-based rendering and incremental history immediately. **Decision:** cap at 100 cues, use sorted validation and linear active selection; aggregate to 180 waveform bars. **Consequences:** the model stays easy to audit and test. No invented throughput claims; current bounds explicitly reject overload. **Revisit:** profiles at 1,000+ cues, multi-minute files or real mobile-device evidence showing main-thread bottlenecks. The staged migration is described in SCALABILITY.md.

## ADR007 — Preserve drafts separately from the saved track

**Context:** Real editing exposed two losses: switching cues discarded unfinished text, and an older file read could replace text typed after import began. **Alternatives:** auto-save every keystroke; modal confirmation on each selection; or bounded per-cue session drafts. **Decision:** keep a Map keyed by existing cue ID, mark dirty cues, expose Save/Discard, and advance the async revision fence on draft changes. Whole-track replacement/history waits until drafts are resolved; export and optional storage include saved captions only. **Consequences:** browsing is safe without implicit commits or confirmation dialogs; drafts are deliberately not a reload backup. At most 100 drafts each hold 500 text code units and two 12-character time fields. **Revisit:** durable recovery or multi-document editing, which needs a versioned draft persistence contract.

## ADR008 — Precise timing actions and reachable mobile inspection

**Context:** Typing timestamps from a distant playback readout and manually finding the inspector on a phone add avoidable friction. **Alternatives:** drag handles with new gesture semantics; automatic timing commits; or native-clock field actions plus focus navigation. **Decision:** Set start/end reads actual audio currentTime into the draft, then uses the existing Save validation. Mobile selection focuses the inspector with a return path; desktop context remains stationary. **Consequences:** invalid timing stays recoverable and no new clock or gesture engine is introduced. **Revisit:** measured demand for waveform drag editing or continuous cue audition.

## Signed offsets preserve the whole interval

A correction often needs both caption boundaries to move together. Separate start/end edits make that cumbersome and can accidentally change duration. The offset form supports selected or whole-track scope, with the legal range visible before Apply. It rejects collisions and audio-boundary violations instead of clipping: silent clipping would shorten durations and change the requested edit. Draft gating prevents replacing an unsaved form with new saved timings. One immutable document commit makes the bulk operation one undo step. Millisecond integers match the existing WebVTT model, avoiding locale-dependent decimal-second parsing.

This follows React's [minimal derived state guidance](https://react.dev/learn/choosing-the-state-structure); current official docs were checked on 23 September 2026. No dependency update was needed.
