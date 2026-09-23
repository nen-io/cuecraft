import { useState } from "react";
import type { CaptionDocument } from "../domain/captions";
import { offsetRange, shiftTimings } from "../domain/offset";
const signed = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)}`;

export function TimingOffset({
  document,
  selectedId,
  hasDrafts,
  onCommit,
}: {
  document: CaptionDocument;
  selectedId: string;
  hasDrafts: boolean;
  onCommit: (document: CaptionDocument, message: string) => void;
}) {
  const [scope, setScope] = useState<"selected" | "all">("selected");
  const [input, setInput] = useState("250");
  const [error, setError] = useState("");
  const target = scope === "all" ? "all" : { id: selectedId };
  const range = offsetRange(document, target);
  const offset = /^[+-]?\d{1,9}$/.test(input) ? Number(input) : NaN;
  const valid =
    !!range &&
    Number.isSafeInteger(offset) &&
    offset !== 0 &&
    offset >= range.min &&
    offset <= range.max;
  const selectedIndex = document.cues.findIndex((cue) => cue.id === selectedId);
  return (
    <section
      className="timing-offset panel"
      aria-labelledby="timing-offset-heading"
    >
      <div>
        <h2 id="timing-offset-heading">Shift saved timings</h2>
        <p>
          Move a caption or the whole track while keeping every duration intact.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid || hasDrafts) return;
          try {
            const next = shiftTimings(document, target, offset);
            onCommit(
              next,
              `Shifted ${range.count === 1 ? "1 caption" : `${range.count} captions`} ${Math.abs(offset)} ms ${offset > 0 ? "later" : "earlier"}. Undo restores the previous timing.`,
            );
            setError("");
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Timing could not be shifted.",
            );
          }
        }}
      >
        <label>
          Move
          <select
            aria-label="Timing offset scope"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value as "selected" | "all");
              setError("");
            }}
          >
            <option value="selected">
              Selected caption
              {selectedIndex >= 0 ? ` ${selectedIndex + 1}` : ""}
            </option>
            <option value="all">Whole track</option>
          </select>
        </label>
        <label>
          Offset · milliseconds
          <input
            aria-label="Timing offset in milliseconds"
            value={input}
            maxLength={10}
            spellCheck={false}
            aria-describedby="timing-offset-hint"
            aria-invalid={!valid}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
          />
        </label>
        <button
          className="secondary"
          disabled={!valid || hasDrafts}
          type="submit"
        >
          Apply timing offset
        </button>
      </form>
      <p id="timing-offset-hint" className="offset-hint">
        {hasDrafts
          ? "Save or discard caption drafts before shifting saved timings. "
          : ""}
        {range
          ? `${range.count} saved ${range.count === 1 ? "caption" : "captions"} · Allowed: ${signed(range.min)} to ${signed(range.max)} ms. `
          : "No saved caption selected. "}
        {range?.min === 0 && range.max === 0
          ? "No room to move; shorten the boundary captions first."
          : "Positive moves later; negative moves earlier. No clipping."}
      </p>
      {!valid && range && (range.min !== 0 || range.max !== 0) && (
        <p className="offset-hint">
          Enter a nonzero whole number within the allowed range.
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
