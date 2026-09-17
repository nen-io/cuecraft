/** Original deterministic composition, no sampled or third-party audio. */
import { writeFileSync } from "node:fs";
const rate = 22050;
const seconds = 24;
const samples = rate * seconds;
const wav = Buffer.alloc(44 + samples * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(36 + samples * 2, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(samples * 2, 40);
const notes = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
for (let i = 0; i < samples; i++) {
  const t = i / rate;
  const beat = Math.floor(t / 0.75);
  const phase = t % 0.75;
  const env = (1 - Math.exp(-phase * 70)) * Math.exp(-phase * 5);
  const pitch = notes[beat % notes.length] * (t >= 12 && t < 18 ? 0.5 : 1);
  const bell =
    Math.sin(2 * Math.PI * pitch * t) +
    0.26 * Math.sin(2 * Math.PI * pitch * 2 * t);
  const pad =
    Math.sin(2 * Math.PI * 130.815 * t) *
    0.12 *
    (0.5 + 0.5 * Math.sin(t * 0.7));
  const fade = Math.min(t / 0.15, 1, (seconds - t) / 2);
  const sample = Math.max(-1, Math.min(1, (bell * env * 0.42 + pad) * fade));
  wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
}
writeFileSync(new URL("../public/small-hours.wav", import.meta.url), wav);
console.log(`Wrote ${samples} samples (${seconds}s, ${rate} Hz mono PCM).`);
