# Verification

## Commands

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm run format:check
```

`check` runs TypeScript, Vitest and a production Vite build. Vitest includes only `tests/unit/**/*.test.ts`; browser tests are separate. Playwright starts or reuses the local server on port 4302, uses Chromium and runs one worker. In CI, reuse is disabled. Failed tests retain traces and screenshots under ignored `test-results/`.

## Acceptance map

| Contract                    | Evidence                                                                                                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 timestamps               | Subsecond and >1-hour round trips; invalid ranges, fractional, negative, nonfinite and unsafe integer rejection                                                                                                        |
| C2 document model           | Adjacent intervals, half-open active cue, immutability, sorting, overlap/ID/text/schema/size limits and add-gap behavior                                                                                               |
| C3 history                  | Delete/undo/redo, redo invalidation, no-op commits and 40-state bound                                                                                                                                                  |
| C4 codecs                   | Unicode, literal markup/entities, LF/CR, significant whitespace, BOM/CRLF files, malformed/oversized input, saved-state validation and maximum-size escaped-text round trip                                            |
| C5 editor journey           | Actual audio time advances, pause freezes it, seek changes active cue; edit, reject overlap, undo/redo, delete/add, export download and reimport                                                                       |
| C6 input/layout/error paths | Range ArrowRight, Space on background, Space in textarea, end-of-audio state, 320/390px viewport and doubled computed text sizes, metadata loading gate, waveform-only failure, media failure/retry and play rejection |
| Security                    | HTML-like input remains literal with no image node, corrupt/unavailable storage, oversized file preserves track, and delayed import cannot overwrite newer text                                                        |
| Resilience                  | Error/retry preserves unsaved session edits and undo history                                                                                                                                                           |
| Drafts and timing           | Per-cue draft retention, blocked track replacement, saved-only export/storage, delayed import after unsaved typing, exact playhead field entry and mobile focus/return                                                 |
| Interoperability            | Native Chromium `VTTCue.getCueAsHTML()` decodes the actual exported cue payload, including numeric newlines and markup entities                                                                                        |

## Recorded local evidence

17 September 2026:

- `npm run check`: passed, including **47 Vitest cases** and production build.
- `npm run test:e2e`: **16 Chromium journeys passed**.
- Production preview smoke: the built CSP was present, all 180 waveform bins loaded, actual media time advanced after Play, and browser console/page error lists were empty.
- `npm run format:check`: passed after formatting the authored source, tests and docs.
- Desktop, mobile and focused mobile-inspector screenshots are produced by the running-app test at 1440px and 390px respectively; the populated waveform comes from the real WAV. The refined captures show a retained unsaved draft, its track badge, and explicit playhead timing controls. The same test verifies no page overflow at 320px/390px and after doubling each element's computed font size.
- Independent parent review's axe WCAG2/2.1 AA scan reported zero violations after supporting text colors were darkened; page-error list was empty and 1440/720/390/320px widths had no horizontal overflow. This audit tool lives in the parent review workspace, not this standalone repository.

The first browser run exposed a caption-label counter being included in the label string; it was moved outside the label. Independent review also identified low-contrast supporting text and a retry/remount risk; final code and regression tests address both. A suspected numeric-newline WebVTT incompatibility was disproven by the native Chromium parser test; no unsupported claim or arbitrary restriction was retained.

## Fixtures and limits

`fixtures/sample.vtt` is a valid original sample export. `literal-markup.vtt` demonstrates safe Unicode/markup text. `invalid-overlap.vtt` is intentionally rejected. Unit tests construct larger adversarial documents in memory instead of checking in large files.

Only local Chromium is automated. Safari, Firefox, actual phones, real screen readers, long media, physical sound output, deployment response headers, and concurrent-tab consistency have not been verified. The playback test proves browser decoding and real media-clock progression, not speaker audibility. The doubled-text test approximates text scaling; it does not replace device accessibility testing. No performance/load benchmark or comprehensive penetration test is claimed. Public deployment and clean-clone verification are separate release gates owned by the publishing agent.

## Refinement verification

The refinement pass first reproduced two data-loss paths in failing browser tests: switching captions discarded unfinished text, and a delayed import replaced text typed before Save. Both regression tests now pass. Four new browser journeys cover draft retention, pre-commit import fencing, saved-only export/storage, playhead timing validation, protected undo/reset and phone inspector focus/return. Unit rules remained unchanged; all 47 domain cases and all 16 Chromium journeys pass, with a fresh production build.

A fresh independent parent audit of the refined app reports zero axe violations and zero page errors or document overflow at 1440/720/390/320px, including interactions. This remains automated Chromium evidence, not complete accessibility certification. Publication and live subpath checks belong to the release owner.
