import { useEffect, useRef, useState } from "react";
import { waveformPeaks } from "../domain/waveform";
export const AUDIO_URL = `${import.meta.env.BASE_URL}small-hours.wav`;

/** The audio element owns time; React mirrors media events and never advances a timer. */
export function useMedia() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [peaks, setPeaks] = useState<number[]>([]);
  const [waveError, setWaveError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const audio = audioRef.current!;
    const metadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurationMs(Math.round(audio.duration * 1000));
        setError("");
      } else setError("The audio duration could not be read. Please retry.");
    };
    const tick = () => setTimeMs(Math.round(audio.currentTime * 1000));
    const play = () => setPlaying(true);
    const pause = () => setPlaying(false);
    const failure = () => {
      setPlaying(false);
      setError("The audio could not load. Check the connection and retry.");
    };
    audio.addEventListener("loadedmetadata", metadata);
    audio.addEventListener("timeupdate", tick);
    audio.addEventListener("seeked", tick);
    audio.addEventListener("play", play);
    audio.addEventListener("pause", pause);
    audio.addEventListener("ended", pause);
    audio.addEventListener("error", failure);
    if (audio.readyState >= 1) metadata();
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", metadata);
      audio.removeEventListener("timeupdate", tick);
      audio.removeEventListener("seeked", tick);
      audio.removeEventListener("play", play);
      audio.removeEventListener("pause", pause);
      audio.removeEventListener("ended", pause);
      audio.removeEventListener("error", failure);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let context: AudioContext | undefined;
    let active = true;
    setPeaks([]);
    setWaveError("");
    void (async () => {
      try {
        const response = await fetch(AUDIO_URL, { signal: controller.signal });
        if (!response.ok) throw new Error("Audio fetch failed");
        const buffer = await response.arrayBuffer();
        if (!active) return;
        context = new AudioContext();
        const decoded = await context.decodeAudioData(buffer);
        if (active) setPeaks(waveformPeaks(decoded.getChannelData(0)));
      } catch {
        if (active)
          setWaveError(
            "Waveform unavailable. Playback and captions still work when the audio loads.",
          );
      } finally {
        if (context && context.state !== "closed") void context.close();
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const seek = (nextMs: number) => {
    if (durationMs === null || !Number.isFinite(nextMs) || error) return;
    const audio = audioRef.current!;
    audio.currentTime = Math.max(0, Math.min(durationMs, nextMs)) / 1000;
    setTimeMs(Math.round(audio.currentTime * 1000));
  };
  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || durationMs === null) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
      setError("");
    } catch {
      setError(
        "Playback was blocked. Try Play again or check your browser audio settings.",
      );
      setPlaying(false);
    }
  };
  const reset = () => {
    audioRef.current?.pause();
    seek(0);
  };
  const retry = () => {
    setError("");
    setTimeMs(0);
    setPlaying(false);
    audioRef.current?.load();
    setAttempt((value) => value + 1);
  };
  return {
    audioRef,
    durationMs,
    timeMs,
    playing,
    error,
    peaks,
    waveError,
    seek,
    toggle,
    reset,
    retry,
  };
}
export type MediaController = ReturnType<typeof useMedia>;
