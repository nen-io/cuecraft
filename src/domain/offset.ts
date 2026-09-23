import {
  CaptionError,
  validateDocument,
  type CaptionDocument,
} from "./captions";
export type OffsetScope = "all" | { id: string };

/** Bounds preserve each duration and the neighboring gaps; the document is already validated. */
export function offsetRange(document: CaptionDocument, scope: OffsetScope) {
  const index =
    scope === "all"
      ? -1
      : document.cues.findIndex((cue) => cue.id === scope.id);
  const cues =
    scope === "all" ? document.cues : index < 0 ? [] : [document.cues[index]];
  if (!cues.length) return null;
  const left =
    scope === "all" || index === 0 ? 0 : document.cues[index - 1].endMs;
  const right =
    scope === "all" || index === document.cues.length - 1
      ? document.durationMs
      : document.cues[index + 1].startMs;
  return {
    min: left - cues[0].startMs,
    max: right - cues.at(-1)!.endMs,
    count: cues.length,
  };
}

/** A timing correction is one atomic, validated edit: never silently clip a cue. */
export function shiftTimings(
  document: CaptionDocument,
  scope: OffsetScope,
  offsetMs: number,
): CaptionDocument {
  const canonical = validateDocument(document, document.durationMs);
  if (!Number.isSafeInteger(offsetMs) || offsetMs === 0)
    throw new CaptionError("Enter a nonzero whole number of milliseconds.");
  const range = offsetRange(canonical, scope);
  if (!range) throw new CaptionError("Choose a saved caption to shift.");
  if (offsetMs < range.min || offsetMs > range.max)
    throw new CaptionError(
      "This offset would cross another caption or the audio boundary.",
    );
  return validateDocument(
    {
      ...canonical,
      cues: canonical.cues.map((cue) =>
        scope === "all" || scope.id === cue.id
          ? {
              ...cue,
              startMs: cue.startMs + offsetMs,
              endMs: cue.endMs + offsetMs,
            }
          : cue,
      ),
    },
    canonical.durationMs,
  );
}
