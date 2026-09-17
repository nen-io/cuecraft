# Asset provenance

`public/small-hours.wav` is an original synthetic tone composition generated specifically for Cuecraft by `scripts/generate-audio.mjs`. No recording, sample pack, third-party composition, voice or copyrighted source was copied. The script uses a deterministic sequence of sinusoidal notes, harmonic overtone, quiet bass pad, exponential note envelope and final fade. Output: 24 seconds, mono, 22,050 Hz, signed 16-bit PCM WAV; 529,200 samples and 1,058,444 bytes.

Run `npm run assets:generate` to reproduce it. The script, audio and descriptive caption text are covered by this repository's MIT license. Captions describe synthesized sound; they are not speech recognition output. Reproducibility is numerical on the supported Node runtime; floating-point transcendental implementation changes could alter individual least-significant samples on other engines.

`docs/screenshots/desktop.png` and `mobile.png` are captured from the running app by Playwright with the original asset loaded, actual decoded waveform visible, and representative sample captions. They are not design mockups. System fonts avoid remote font dependencies. Lucide icon components are distributed through the pinned `lucide-react` dependency under its ISC license; package license notices remain in the installed dependency. No other image/audio assets are fetched externally.
