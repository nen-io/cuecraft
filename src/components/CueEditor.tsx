import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatTimestamp, parseTimestamp, type Cue } from "../domain/captions";
interface Props {
  cue: Cue;
  index: number;
  onSave: (cue: Cue) => void;
  onDelete: (id: string) => void;
}
export function CueEditor({ cue, index, onSave, onDelete }: Props) {
  const [text, setText] = useState(cue.text);
  const [start, setStart] = useState(formatTimestamp(cue.startMs));
  const [end, setEnd] = useState(formatTimestamp(cue.endMs));
  const [error, setError] = useState("");
  return (
    <section className="editor panel" aria-label="Caption editor">
      <div className="section-line">
        <span className="eyebrow">CAPTION INSPECTOR</span>
        <span className="index-pill">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <h2>Make every moment clear.</h2>
      <p className="muted editor-intro">
        Describe what you hear. Give it room to breathe.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave({
              ...cue,
              startMs: parseTimestamp(start),
              endMs: parseTimestamp(end),
              text,
            });
            setError("");
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "The caption could not be saved.",
            );
          }
        }}
      >
        <div className="field-label">
          <label htmlFor="caption-text">Caption text</label>
          <span aria-hidden="true">{text.length} / 500</span>
        </div>
        <textarea
          id="caption-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={500}
          rows={4}
          aria-describedby={error ? "editor-error" : "caption-hint"}
        />
        <p className="field-hint" id="caption-hint">
          Sound descriptions belong in [square brackets].
        </p>
        <div className="time-fields">
          <div>
            <label htmlFor="start-time">Start time</label>
            <input
              id="start-time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              spellCheck={false}
              aria-describedby="time-hint"
            />
          </div>
          <div>
            <label htmlFor="end-time">End time</label>
            <input
              id="end-time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              spellCheck={false}
              aria-describedby="time-hint"
            />
          </div>
        </div>
        <p className="field-hint" id="time-hint">
          HH:MM:SS.mmm · Captions cannot overlap.
        </p>
        {error && (
          <p className="inline-error" id="editor-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <button className="primary" type="submit">
            <Check size={16} /> Save caption
          </button>
          <button
            className="icon-button delete"
            type="button"
            onClick={() => onDelete(cue.id)}
            aria-label="Delete caption"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </form>
      <div className="editor-note">
        <span className="note-line" />
        <p>
          Local by design.
          <br />
          <span>Your captions stay in this browser.</span>
        </p>
      </div>
    </section>
  );
}
