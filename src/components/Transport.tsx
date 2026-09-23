import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import {
  formatTimestamp,
  type CaptionDocument,
  activeCue,
} from "../domain/captions";
import type { MediaController } from "../hooks/useMedia";
interface Props {
  media: MediaController;
  document?: CaptionDocument;
  selectedId?: string;
  onSelect?: (id: string) => void;
}
export function Transport({ media, document, selectedId, onSelect }: Props) {
  const { durationMs, timeMs, playing, peaks, error, waveError } = media;
  const active = document ? activeCue(document, timeMs) : undefined;
  const progress = durationMs ? (timeMs / durationMs) * 100 : 0;
  const ready = durationMs !== null && !error;
  return (
    <section className="transport panel" aria-label="Audio player">
      <div className="section-line">
        <span className="eyebrow">
          <Volume2 size={14} /> LISTEN & SHAPE
        </span>
        <span className="small-label">ORIGINAL COMPOSITION · 24 SEC</span>
      </div>
      <div className="waveform-wrap">
        <div className="waveform" aria-hidden="true">
          {peaks.length ? (
            <svg viewBox="0 0 1080 128" preserveAspectRatio="none">
              {peaks.map((peak, i) => (
                <rect
                  key={i}
                  x={i * 6}
                  y={64 - Math.max(1.5, peak * 100)}
                  width="3"
                  height={Math.max(3, peak * 200)}
                  rx="1.5"
                  fill={
                    (i / peaks.length) * 100 <= progress ? "#ca4c27" : "#92958b"
                  }
                />
              ))}
            </svg>
          ) : (
            <div className="wave-empty">
              {waveError
                ? "Waveform could not be decoded"
                : "Decoding the original audio…"}
            </div>
          )}
          <div className="playhead" style={{ left: `${progress}%` }}>
            <span />
          </div>
        </div>
        <input
          className="seek-input"
          type="range"
          min={0}
          max={durationMs ?? 24000}
          step={10}
          value={timeMs}
          disabled={!ready}
          onChange={(event) => media.seek(Number(event.target.value))}
          aria-label="Seek audio"
          aria-valuetext={formatTimestamp(timeMs)}
        />
      </div>
      <div className="ruler" aria-hidden="true">
        <span>00:00</span>
        <span>00:06</span>
        <span>00:12</span>
        <span>00:18</span>
        <span>00:24</span>
      </div>
      {document && (
        <div className="cue-timeline" aria-label="Caption timeline">
          {document.cues.map((cue, index) => (
            <button
              key={cue.id}
              className={
                selectedId === cue.id ? "timeline-cue selected" : "timeline-cue"
              }
              aria-label={`Select caption ${index + 1} on timeline`}
              aria-describedby={`cue-description-${cue.id}`}
              aria-pressed={selectedId === cue.id}
              style={{
                left: `${(cue.startMs / document.durationMs) * 100}%`,
                width: `${((cue.endMs - cue.startMs) / document.durationMs) * 100}%`,
              }}
              onClick={() => onSelect?.(cue.id)}
            >
              {String(index + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      )}
      <div className="transport-bottom">
        <div className="play-controls">
          <button
            className="play-button"
            onClick={() => void media.toggle()}
            disabled={durationMs === null}
            aria-label={playing ? "Pause audio" : "Play audio"}
          >
            {playing ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Reset playback"
            onClick={media.reset}
            disabled={!ready}
          >
            <RotateCcw size={18} />
          </button>
          <div className="time-readout">
            <output
              role="timer"
              aria-label="Current playback time"
              aria-live="off"
              data-testid="current-time"
            >
              {formatTimestamp(timeMs).slice(3)}
            </output>
            <span>
              {" "}
              /{" "}
              {durationMs === null
                ? "--:--.---"
                : formatTimestamp(durationMs).slice(3)}
            </span>
          </div>
        </div>
        <span className="shortcut">
          <kbd>space</kbd> play / pause
        </span>
      </div>
      <div className="live-caption">
        <span className="status-dot" />
        <span data-testid="active-caption">
          {error
            ? "Audio unavailable"
            : durationMs === null
              ? "Loading audio…"
              : (active?.text ?? "A quiet moment between captions")}
        </span>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error} <button onClick={media.retry}>Retry audio</button>
        </div>
      )}
      {waveError && !error && (
        <p className="inline-notice" role="status">
          {waveError}
        </p>
      )}
    </section>
  );
}
