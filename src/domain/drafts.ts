import { formatTimestamp, type Cue } from "./captions";

/** Session-only form fields. They never enter playback, persistence or WebVTT until Save. */
export interface CueDraft {
  text: string;
  start: string;
  end: string;
}
export function draftFor(cue: Cue): CueDraft {
  return {
    text: cue.text,
    start: formatTimestamp(cue.startMs),
    end: formatTimestamp(cue.endMs),
  };
}
export function matchesCue(draft: CueDraft, cue: Cue): boolean {
  const saved = draftFor(cue);
  return (
    draft.text === saved.text &&
    draft.start === saved.start &&
    draft.end === saved.end
  );
}
