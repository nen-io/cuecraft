# Cuecraft visual design

Written before implementation. The studio is an editorial instrument: warm paper, near-black ink, burnt orange signal color and pale lilac caption blocks. System sans-serif handles controls; Georgia gives the composition title a deliberate album-sleeve feel. Tabular numerals make timing stable.

Desktop: narrow brand rail/header; title and honest asset provenance; a large waveform transport panel; split workspace with ordered caption list on the left and a focused cue inspector on the right. Playback has one prominent orange button. Import/export stay visible in the header. Current time, duration and active cue sit close to the waveform. Actual decoded amplitude bars are drawn in SVG; a transparent, labelled native range input supplies click and keyboard seeking.

Primary journey: listen to the original tone composition, choose a cue, edit its text and boundaries, commit, undo/redo, export UTF-8 WebVTT. Import replaces the document as one undoable operation after complete validation. Unsaved form drafts belong to their cue IDs and survive inspector selection changes; explicit Save or Discard resolves them before document-wide history or replacement.

Loading: waveform skeleton and explicit loading status; playback/edit/export disabled until authoritative media duration arrives. Audio failure: clear message and retry button, without moving time. Decode failure: explain waveform unavailable while usable media transport remains available. Invalid edits keep the committed caption list unchanged and place an error adjacent to the form. Empty document offers Add cue. Persistence is opt-in, with denial/corruption displayed nonfatally.

At 320px the header wraps, transport controls remain reachable and the workspace becomes one column. Time inputs stack at the narrowest widths; timeline horizontal representation remains secondary to the readable list. Minimum target heights 40px, visible focus rings, textual button names, native labels. 200% text scaling must wrap without losing controls. Reduced motion disables visual transitions; playback itself still uses media events. No external font, tracking or decorative fake metrics.

Internal review criteria: clear visual hierarchy, useful density, no horizontal page overflow, honest media description, legible low-contrast details, and editable captions visible without obscure navigation.

## Refinement design

The inspector keeps a bounded draft for each existing cue, so browsing the track does not erase unfinished writing. Draft labels in the track and a clear summary separate saved captions from unsaved work. Save commits only the selected cue; Discard restores its saved fields. Import, undo, redo and sample reset wait until drafts are saved or discarded, while export explicitly contains saved captions only. Typing also invalidates an already pending import.

Start/end controls offer “Set to playhead” using the actual audio clock, without saving implicitly. On a stacked phone layout, choosing a caption moves keyboard focus and the viewport to its inspector; “Back to captions” returns to the track. Desktop selection retains its side-by-side context. New controls use the existing warm palette and compact field styling.

## Timing correction form

A compact panel after the caption workspace groups scope, signed millisecond offset and Apply. The selected caption is the default so the supplied full-length sample supports an immediate useful correction. The whole-track option displays its boundary-limited range and explains when no movement is possible. Positive/later and negative/earlier are stated beside the form. Controls wrap into one column on a phone; text remains visible, without a modal or hidden gesture. Restrained footer links lead directly to Source and Engineering walkthrough.
