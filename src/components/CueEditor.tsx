import { Check, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type Ref } from "react";
import { formatTimestamp, parseTimestamp, type Cue } from "../domain/captions";
import type { CueDraft } from "../domain/drafts";
interface Props {
  cue: Cue;
  index: number;
  onSave: (cue: Cue) => void;
  onDelete: (id: string) => void;
  draft: CueDraft;
  dirty: boolean;
  onChange: (draft: CueDraft) => void;
  onDiscard: () => void;
  timeMs: number;
  readPlayhead: () => number;
  canUsePlayhead: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onBack: () => void;
}
export function CueEditor({
  cue,
  index,
  onSave,
  onDelete,
  draft,
  dirty,
  onChange,
  onDiscard,
  timeMs,
  readPlayhead,
  canUsePlayhead,
  headingRef,
  onBack,
}: Props) {
  const { text, start, end } = draft;
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<
    "text" | "start" | "end" | "timing" | null
  >(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const textField = useRef<HTMLTextAreaElement>(null);
  const startField = useRef<HTMLInputElement>(null);
  const endField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!error) return;
    const field =
      invalid === "text"
        ? textField
        : invalid === "end"
          ? endField
          : startField;
    field.current?.focus();
  }, [error, invalid, validationAttempt]);
  function change(next: CueDraft) {
    setError("");
    setInvalid(null);
    onChange(next);
  }
  return (
    <section className="editor panel" aria-label="Caption editor">
      <div className="section-line">
        <span className="eyebrow">CAPTION INSPECTOR</span>
        <span className="index-pill">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <h2 id="caption-editor-heading" ref={headingRef} tabIndex={-1}>
        Make every moment clear.
      </h2>
      <p className="muted editor-intro">
        Caption {index + 1} · {dirty ? "Unsaved draft" : "Saved caption"}
      </p>
      <button className="back-to-track" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to captions
      </button>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          let field: "text" | "start" | "end" | "timing" = "text";
          try {
            if (!text.trim() || text.includes("\0"))
              throw new Error("Enter caption text without null characters.");
            field = "start";
            const startMs = parseTimestamp(start);
            field = "end";
            const endMs = parseTimestamp(end);
            field = "timing";
            onSave({
              ...cue,
              startMs,
              endMs,
              text,
            });
            setError("");
          } catch (cause) {
            setInvalid(field);
            setValidationAttempt((attempt) => attempt + 1);
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
          ref={textField}
          aria-invalid={invalid === "text"}
          value={text}
          onChange={(event) => change({ ...draft, text: event.target.value })}
          maxLength={500}
          rows={4}
          aria-describedby={
            invalid === "text" ? "caption-hint editor-error" : "caption-hint"
          }
        />
        <p className="field-hint" id="caption-hint">
          Sound descriptions belong in [square brackets].
        </p>
        <div className="time-fields">
          <div>
            <label htmlFor="start-time">Start time</label>
            <input
              id="start-time"
              ref={startField}
              aria-invalid={invalid === "start" || invalid === "timing"}
              value={start}
              onChange={(event) =>
                change({ ...draft, start: event.target.value })
              }
              maxLength={12}
              spellCheck={false}
              aria-describedby={
                invalid === "start" || invalid === "timing"
                  ? "time-hint editor-error"
                  : "time-hint"
              }
            />
            <button
              className="use-playhead"
              type="button"
              disabled={!canUsePlayhead}
              onClick={() =>
                change({ ...draft, start: formatTimestamp(readPlayhead()) })
              }
            >
              Set start to playhead
            </button>
          </div>
          <div>
            <label htmlFor="end-time">End time</label>
            <input
              id="end-time"
              ref={endField}
              aria-invalid={invalid === "end" || invalid === "timing"}
              value={end}
              onChange={(event) =>
                change({ ...draft, end: event.target.value })
              }
              maxLength={12}
              spellCheck={false}
              aria-describedby={
                invalid === "end" || invalid === "timing"
                  ? "time-hint editor-error"
                  : "time-hint"
              }
            />
            <button
              className="use-playhead"
              type="button"
              disabled={!canUsePlayhead}
              onClick={() =>
                change({ ...draft, end: formatTimestamp(readPlayhead()) })
              }
            >
              Set end to playhead
            </button>
          </div>
        </div>
        <p className="field-hint" id="time-hint">
          Use HH:MM:SS.mmm. Playhead {formatTimestamp(timeMs)} · Save to apply
          timing. Captions cannot overlap.
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
            className="discard-draft"
            type="button"
            disabled={!dirty}
            onClick={() => {
              setError("");
              setInvalid(null);
              onDiscard();
            }}
          >
            Discard draft
          </button>
          <button
            className="icon-button delete"
            type="button"
            onClick={() => onDelete(cue.id)}
            aria-label="Delete caption"
            disabled={dirty}
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
          <span>Drafts stay in this session. Export keeps saved captions.</span>
        </p>
      </div>
    </section>
  );
}
