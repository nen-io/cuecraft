# Accessibility and human usability

This is a focused engineering review, not a WCAG conformance certification. The checks below ran in Chromium on 23 September 2026. They exercise keyboard input, browser accessibility names/descriptions, focus, layout and media emulation. VoiceOver, NVDA, physical touch devices, Safari and Firefox were not tested.

## Tasks and fixes

- **Edit, save and export with a keyboard.** The new browser journey starts at the first Tab stop, uses the skip link and inspector jump, edits a caption using keyboard input, saves and exports WebVTT with Tab/Enter only. Saving previously remounted the editor and sent focus to the document body. The editor now keeps its identity while its saved values change, so Save retains focus.
- **Correct malformed timing.** An invalid Start or End time is identified by `aria-invalid`, associated with the explanatory message and focused after submission. A document-level timing conflict associates the error with both timing fields and focuses Start. Drafts and saved captions remain separate. Empty caption text is identified at the text field. Time syntax is explained before an error occurs.
- **Delete and recover.** Deleting an inspected caption previously removed the focused button without a destination. Focus now moves to the next inspector heading, or the caption track when empty. A status message explains that Undo restores deletion. Import and reset remain undoable; active drafts must first be saved or discarded.
- **Identify a caption without seeing its row.** Caption list and timeline controls retain short action names and expose the cue's time, description and draft state as accessible descriptions. Playback time is not announced on every media tick.
- **Understand the first action.** A short workflow hint and expandable keyboard/timing help explain Listen → choose → Save → export. Essential form/help/control text is at least 12px; decorative identifiers remain smaller. A real hidden file input is activated by the visible Import button.

## Keyboard model

The first Tab stop is **Skip to workspace**. Native Tab/Shift+Tab moves between controls; Enter activates buttons and links. **Jump to caption editor** focuses its heading. **Back to captions** returns to the track heading. Native arrow keys adjust the labelled waveform range; Home/End seek its limits. Space plays/pauses only outside interactive controls, and does not intercept text entry, buttons, links or disclosure summaries. Undo/Redo are explicit buttons, so browser text undo remains available in fields.

The graphical caption timeline has proportional durations, including very short imported cues. The full-sized caption list provides the equivalent selection action when a graphical block is too small to tap comfortably; the timeline does not misrepresent timing by widening those blocks. No drag gesture is required to edit timing.

## Visual and layout evidence

`tests/e2e/accessibility.spec.ts` covers focus recovery, meaningful descriptions, real Tab/Enter editing/export, 320px reflow with doubled computed text, forced-colors and reduced-motion emulation. Existing browser journeys cover 320/390px layout, actual playback, failure/retry and draft/import races. Forced-colors CSS preserves selected-row outlines, the waveform/playhead and error borders using system colors; selection and error text remain available independently of color.

[Forced-colors screenshot](screenshots/accessibility-forced-colors.png) is a real browser capture with 200% computed text at 320px. The normal desktop/mobile screenshots were also refreshed. Computed-text doubling is a layout stress test, not an exhaustive test of browser zoom or operating-system scaling. Emulated high contrast is not a Windows device test.

The release owner separately samples WCAG 2.2 AA rules with axe and verifies the production build. Automated scans can miss spoken announcements, cognitive friction, browser/assistive-technology differences and device gestures. No claim of end-to-end screen-reader validation is made.

## Reference and maintenance

Use native controls and stable component identity before adding custom keyboard handling. Keep drafts, saved document history and the native media clock separate. New controls must preserve visible focus, labels, source-of-truth boundaries and keyboard recovery after conditional content disappears.

Reviewed current official guidance: [WAI focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), [WAI target size and equivalent controls](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [WAI slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and [React input labels](https://react.dev/reference/react-dom/components/input).

## Additional production-engine check

The publishing review exercises one representative task and the skip destination in Playwright Chromium and WebKit at 1440, 720, 390 and 320px. Chromium additionally checks initial and task states with axe WCAG 2/2.1/2.2 A/AA rules and broad doubled-computed-text/forced-colors rendering. This is a scoped engine check, not the complete suite in Safari or a screen-reader session. On macOS, WebKit used Option-Tab to reach links; Safari's keyboard navigation setting determines ordinary Tab behavior. See [Apple's keyboard navigation guide](https://support.apple.com/guide/safari/cpsh003/mac).
