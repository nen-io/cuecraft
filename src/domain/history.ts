import type { CaptionDocument } from "./captions";
export const HISTORY_LIMIT = 40;
export interface History {
  past: CaptionDocument[];
  present: CaptionDocument;
  future: CaptionDocument[];
}
export type HistoryAction =
  { type: "commit"; document: CaptionDocument } | { type: "undo" | "redo" };
export const createHistory = (present: CaptionDocument): History => ({
  past: [],
  present,
  future: [],
});
/** Only document commits enter history. Playback and selection never do. */
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "commit") {
    if (JSON.stringify(state.present) === JSON.stringify(action.document))
      return state;
    return {
      past: [...state.past, state.present].slice(-HISTORY_LIMIT),
      present: action.document,
      future: [],
    };
  }
  if (action.type === "undo" && state.past.length) {
    return {
      past: state.past.slice(0, -1),
      present: state.past.at(-1)!,
      future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
    };
  }
  if (action.type === "redo" && state.future.length) {
    return {
      past: [...state.past, state.present].slice(-HISTORY_LIMIT),
      present: state.future[0],
      future: state.future.slice(1),
    };
  }
  return state;
}
