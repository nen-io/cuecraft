/** Maximum absolute amplitude in equal windows. O(samples), O(barCount) output. */
export function waveformPeaks(samples: Float32Array, barCount = 180): number[] {
  if (!Number.isSafeInteger(barCount) || barCount < 1 || barCount > 1000)
    throw new Error("Invalid waveform resolution.");
  const peaks: number[] = [];
  for (let bar = 0; bar < barCount; bar++) {
    const from = Math.floor((bar * samples.length) / barCount);
    const to = Math.floor(((bar + 1) * samples.length) / barCount);
    let peak = 0;
    for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(samples[i]));
    peaks.push(peak);
  }
  return peaks;
}
