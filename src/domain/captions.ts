export interface Cue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}
export interface CaptionDocument {
  version: 1;
  durationMs: number;
  cues: Cue[];
}
export const MAX_CUES = 100;
export const MAX_TEXT_LENGTH = 500;
export const MAX_IMPORT_BYTES = 512 * 1024;
export const ASSET_KEY = "small-hours-pcm-v1";
export const STORAGE_KEY = `cuecraft:${ASSET_KEY}`;
export const MAX_STORAGE_BYTES = 512 * 1024;

export class CaptionError extends Error {}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Validate all external state, then return a detached, sorted canonical document. */
export function validateDocument(
  value: unknown,
  actualDurationMs: number,
): CaptionDocument {
  if (!Number.isSafeInteger(actualDurationMs) || actualDurationMs <= 0)
    throw new CaptionError("Audio duration is not ready.");
  if (
    !record(value) ||
    value.version !== 1 ||
    value.durationMs !== actualDurationMs ||
    !Array.isArray(value.cues)
  ) {
    throw new CaptionError("This document does not match the loaded audio.");
  }
  if (value.cues.length > MAX_CUES)
    throw new CaptionError("A document supports at most 100 captions.");
  const ids = new Set<string>();
  const cues = value.cues
    .map((cue, index): Cue => {
      if (
        !record(cue) ||
        typeof cue.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(cue.id) ||
        ids.has(cue.id)
      ) {
        throw new CaptionError(
          `Caption ${index + 1} has an invalid or duplicate ID.`,
        );
      }
      ids.add(cue.id);
      if (
        typeof cue.startMs !== "number" ||
        typeof cue.endMs !== "number" ||
        !Number.isSafeInteger(cue.startMs) ||
        !Number.isSafeInteger(cue.endMs) ||
        cue.startMs < 0 ||
        cue.startMs >= cue.endMs ||
        cue.endMs > actualDurationMs
      ) {
        throw new CaptionError(
          `Caption ${index + 1}: start must be before end, within the audio duration.`,
        );
      }
      if (
        typeof cue.text !== "string" ||
        !cue.text.trim() ||
        cue.text.length > MAX_TEXT_LENGTH ||
        cue.text.includes("\0")
      ) {
        throw new CaptionError(
          `Caption ${index + 1}: enter 1–500 characters of text without null characters.`,
        );
      }
      return {
        id: cue.id,
        startMs: cue.startMs,
        endMs: cue.endMs,
        text: cue.text,
      };
    })
    .sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < cues.length; i++) {
    if (cues[i].startMs < cues[i - 1].endMs)
      throw new CaptionError(
        "Caption times overlap. Leave each caption its own interval.",
      );
  }
  return { version: 1, durationMs: actualDurationMs, cues };
}

export function sampleDocument(durationMs: number): CaptionDocument {
  return validateDocument(
    {
      version: 1,
      durationMs,
      cues: [
        {
          id: "intro",
          startMs: 0,
          endMs: 3750,
          text: "[Soft bell notes open the melody]",
        },
        {
          id: "rise",
          startMs: 4500,
          endMs: 9000,
          text: "[A bright, repeating arpeggio]",
        },
        {
          id: "low",
          startMs: 10500,
          endMs: 15750,
          text: "[The melody drops into a lower register]",
        },
        {
          id: "return",
          startMs: 18000,
          endMs: 21000,
          text: "[Higher notes return above a warm hum]",
        },
        {
          id: "fade",
          startMs: 21750,
          endMs: durationMs,
          text: "[The final notes slowly fade]",
        },
      ],
    },
    durationMs,
  );
}

export function activeCue(
  doc: CaptionDocument,
  timeMs: number,
): Cue | undefined {
  return doc.cues.find((cue) => cue.startMs <= timeMs && timeMs < cue.endMs);
}

export function updateCue(doc: CaptionDocument, cue: Cue): CaptionDocument {
  if (!doc.cues.some((item) => item.id === cue.id))
    throw new CaptionError("That caption no longer exists.");
  return validateDocument(
    { ...doc, cues: doc.cues.map((item) => (item.id === cue.id ? cue : item)) },
    doc.durationMs,
  );
}

export function addCue(doc: CaptionDocument, id: string): CaptionDocument {
  let startMs = 0;
  for (const cue of doc.cues) {
    if (cue.startMs - startMs >= 250) break;
    startMs = cue.endMs;
  }
  const next = doc.cues.find((cue) => cue.startMs >= startMs);
  const endMs = Math.min(startMs + 1500, next?.startMs ?? doc.durationMs);
  if (endMs - startMs < 250)
    throw new CaptionError(
      "No gap of at least 250 ms remains. Shorten a caption to make room.",
    );
  return validateDocument(
    {
      ...doc,
      cues: [
        ...doc.cues,
        { id, startMs, endMs, text: "[New sound description]" },
      ],
    },
    doc.durationMs,
  );
}

export function formatTimestamp(ms: number): string {
  if (!Number.isSafeInteger(ms) || ms < 0)
    throw new CaptionError("Timestamp must be a nonnegative integer.");
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms / 60000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
}

export function parseTimestamp(value: string): number {
  const match = /^(\d{2,}):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
  if (!match)
    throw new CaptionError(
      "Use HH:MM:SS.mmm, with minutes and seconds from 00 to 59.",
    );
  const ms =
    Number(match[1]) * 3600000 +
    Number(match[2]) * 60000 +
    Number(match[3]) * 1000 +
    Number(match[4]);
  if (!Number.isSafeInteger(ms))
    throw new CaptionError("Timestamp is too large.");
  return ms;
}

export const byteLength = (value: string) =>
  new TextEncoder().encode(value).byteLength;
const escapeText = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r/g, "&#13;")
    .replace(/\n/g, "&#10;");
const unescapeText = (text: string) =>
  text.replace(
    /&(amp|lt|gt|#10|#13);/g,
    (_, entity: string) =>
      ({ amp: "&", lt: "<", gt: ">", "#10": "\n", "#13": "\r" })[entity]!,
  );

export function exportVtt(doc: CaptionDocument): string {
  validateDocument(doc, doc.durationMs);
  return `WEBVTT\n\n${doc.cues.map((cue, i) => `${i + 1}\n${formatTimestamp(cue.startMs)} --> ${formatTimestamp(cue.endMs)}\n${escapeText(cue.text)}\n`).join("\n")}`;
}

/** Deliberately small subset: numeric IDs, exact timestamps, no cue settings/markup. */
export function importVtt(input: string, durationMs: number): CaptionDocument {
  if (byteLength(input) > MAX_IMPORT_BYTES)
    throw new CaptionError("WebVTT files must be 512 KiB or smaller.");
  const normalized = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+$/, "");
  if (!/^WEBVTT(?:\n\n|$)/.test(normalized))
    throw new CaptionError(
      "Expected a WEBVTT header followed by a blank line.",
    );
  const body = normalized.startsWith("WEBVTT\n\n") ? normalized.slice(8) : "";
  const blocks = body ? body.split(/\n\n+/) : [];
  if (blocks.length > MAX_CUES)
    throw new CaptionError("A document supports at most 100 captions.");
  const cues = blocks.map((block, i): Cue => {
    const lines = block.split("\n");
    const identifier = /^\d+$/.test(lines[0]) ? lines.shift() : undefined;
    const timing =
      /^(\d{2,}:[0-5]\d:[0-5]\d\.\d{3}) --> (\d{2,}:[0-5]\d:[0-5]\d\.\d{3})$/.exec(
        lines.shift() ?? "",
      );
    if (!timing || !lines.length)
      throw new CaptionError(
        `Caption ${i + 1}: unsupported timing, settings, or missing text.`,
      );
    const encoded = lines.join("\n");
    if (/[<>]/.test(encoded) || /&(?!amp;|lt;|gt;|#10;|#13;)/.test(encoded))
      throw new CaptionError(
        `Caption ${i + 1}: use escaped text; WebVTT markup is not supported.`,
      );
    return {
      id: `vtt-${identifier ?? i + 1}`,
      startMs: parseTimestamp(timing[1]),
      endMs: parseTimestamp(timing[2]),
      text: unescapeText(encoded),
    };
  });
  return validateDocument({ version: 1, durationMs, cues }, durationMs);
}

export function restoreDocument(
  raw: string,
  durationMs: number,
): CaptionDocument {
  if (byteLength(raw) > MAX_STORAGE_BYTES)
    throw new CaptionError("Saved edits exceed the storage limit.");
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.assetKey !== ASSET_KEY)
    throw new CaptionError("Saved edits belong to a different audio asset.");
  return validateDocument(value.document, durationMs);
}
export const serializeDocument = (document: CaptionDocument) =>
  JSON.stringify({ assetKey: ASSET_KEY, document });
