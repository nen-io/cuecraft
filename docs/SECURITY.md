# Security model

## Scope and trust boundaries

This is a static, no-account, browser-only demonstration. It has no authentication tokens, API keys, privileged backend, analytics, user database or third-party upload. This removes server authorization and tenant-isolation concerns from the implemented scope, but does not make imported files or browser persistence trustworthy. The protected assets are document correctness, availability of the editor, and the user's local caption text.

An attacker can supply a malicious `.vtt`, persuade someone to paste HTML-like captions, or modify localStorage through another same-origin page/browser extension. A compromised package, host, extension, operating system or browser can exceed this application's protection boundary. Same-origin sites share browser storage access; the asset key is validation, not encryption or authorization.

| Threat                                            | Implemented mitigation                                                                                                         | Verification                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Caption markup/script execution                   | React text nodes, no `innerHTML`; strict imported entities, markup escaping on export                                          | Domain Unicode/markup codec test; browser `<img onerror>` remains literal and creates no image     |
| Oversized or malformed VTT stalls/corrupts editor | 512 KiB file precheck and byte recheck; max 100 cues; max 500 code units; strict timestamps; complete validation before commit | Oversize, malformed, overlap, duplicate ID and nonfinite unit tests; browser preserves prior track |
| Poisoned localStorage                             | 512 KiB serialized input bound, schema/asset/duration validation; nonfatal restore/save failures                               | Unit corruption/wrong-asset tests and browser corrupted/quota-denial checks                        |
| Old asynchronous import overwrites later edit     | Request generation and session revision fence including unsaved draft typing; unmount invalidates in-flight reads              | Browser delays file read, types unsaved text or saves it, resolves read and checks refusal         |
| Forged playback progress                          | Native audio events and actual media clock; errors shown, no simulated interval                                                | Real play/pause/seek test; blocked play and media load failure checks                              |
| Resource accumulation                             | 40 undo states; fixed 180 waveform bars; one bundled asset; decode context closure/abort, revoked download URLs                | History bounds and waveform tests; source review of lifecycle cleanup                              |
| Remote script/media injection                     | Production CSP, bundled assets, relative same-origin paths; no input accepted as a URL                                         | Production build inspection and source review; no claim of full penetration testing                |

## Browser policy

Production builds inject a meta Content-Security-Policy: default/script/connect/media/font sources are self; objects and form actions are disabled; base URI is disabled; image sources are self/data. Inline styles are allowed because timeline geometry is expressed through React style properties. Inline scripts and eval are not allowed. Development mode omits this policy so Vite's development modules and hot reload function normally.

A meta policy cannot enforce `frame-ancestors` and is not a substitute for deployment response headers. The current static app does not claim framing protection, host-level HSTS or cache header controls. A production host should supply suitable headers, HTTPS and update policy. `package-lock.json` pins transitive resolutions; dependency checks complement code/input review and are not described as a security audit.

## Residual risk and reporting

Local saved edits are unencrypted and last-writer-wins across tabs. Anyone with the browser profile, same-origin script access or an extension with access may read them. Exported downloads remain under the user's file-management controls. Browser memory or storage can be exhausted outside these app-enforced limits. Only Chromium has been exercised automatically; engine-specific WebVTT behavior remains a portability risk.

For a suspected vulnerability, use the repository's private vulnerability reporting feature if enabled. Otherwise open a minimal issue asking for a private reporting channel, without posting sensitive documents, secrets or a weaponized exploit. No maintainer email address is invented here. Security controls described above are implemented boundaries, not a claim of comprehensive production hardening.

Session drafts are bounded plain strings in a Map keyed by existing validated cue IDs. They never render as HTML and never enter exported or persisted data before full document validation. Imports and document-wide replacement are blocked while drafts exist; exported saved-only state is labelled explicitly. Playhead timing changes remain uncommitted until normal validation.
