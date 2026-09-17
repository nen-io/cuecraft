import { describe, expect, it } from "vitest";
import {
  activeCue,
  addCue,
  ASSET_KEY,
  exportVtt,
  formatTimestamp,
  importVtt,
  MAX_IMPORT_BYTES,
  parseTimestamp,
  restoreDocument,
  sampleDocument,
  serializeDocument,
  updateCue,
  validateDocument,
  type CaptionDocument,
} from "../../src/domain/captions";
import {
  createHistory,
  historyReducer,
  HISTORY_LIMIT,
} from "../../src/domain/history";
import { waveformPeaks } from "../../src/domain/waveform";
const doc = (): CaptionDocument => ({
  version: 1,
  durationMs: 10000,
  cues: [
    { id: "one", startMs: 0, endMs: 2000, text: "One" },
    { id: "two", startMs: 2000, endMs: 4000, text: "Two" },
  ],
});

describe("timestamps (C1)", () => {
  it.each([0, 1, 999, 1000, 3599999, 3600000, 360000001])(
    "roundtrips %i milliseconds",
    (value) => expect(parseTimestamp(formatTimestamp(value))).toBe(value),
  );
  it.each([
    "00:60:00.000",
    "00:00:60.000",
    "00:01.000",
    "-1:00:00.000",
    "00:00:01.00",
    "Infinity",
    "99999999999999999999:00:00.000",
  ])("rejects %s", (value) => expect(() => parseTimestamp(value)).toThrow());
  it.each([NaN, Infinity, -1, 0.5])(
    "rejects invalid formatting input %s",
    (value) => expect(() => formatTimestamp(value)).toThrow(),
  );
});
describe("document invariants (C2)", () => {
  it("allows adjacent cues, sorts detached copies, and uses half-open intervals", () => {
    const input = doc();
    input.cues.reverse();
    const result = validateDocument(input, 10000);
    expect(result.cues[0].id).toBe("one");
    expect(input.cues[0].id).toBe("two");
    expect(activeCue(result, 1999)?.id).toBe("one");
    expect(activeCue(result, 2000)?.id).toBe("two");
    expect(activeCue(result, 4000)).toBeUndefined();
  });
  it.each([
    { startMs: -1 },
    { startMs: 2000 },
    { startMs: NaN },
    { endMs: Infinity },
    { endMs: 10001 },
    { startMs: 0.2 },
    { text: "  \n" },
    { text: "x".repeat(501) },
    { id: "<script>" },
  ])("rejects invalid cue %o", (patch) => {
    const input = doc();
    input.cues[0] = { ...input.cues[0], ...patch };
    expect(() => validateDocument(input, 10000)).toThrow();
  });
  it("rejects overlaps and duplicate identities", () => {
    const input = doc();
    input.cues[1].startMs = 1999;
    expect(() => validateDocument(input, 10000)).toThrow("overlap");
    input.cues[1].startMs = 2000;
    input.cues[1].id = "one";
    expect(() => validateDocument(input, 10000)).toThrow("duplicate");
  });
  it("rejects wrong version, duration, shape and more than 100 cues", () => {
    for (const input of [
      null,
      { ...doc(), version: 2 },
      { ...doc(), durationMs: 9000 },
      { ...doc(), cues: {} },
      { ...doc(), cues: Array(101).fill(doc().cues[0]) },
    ])
      expect(() => validateDocument(input, 10000)).toThrow();
  });
  it("commits valid update and leaves invalid original unchanged", () => {
    const input = doc();
    expect(
      updateCue(input, { ...input.cues[0], text: "<b>text & 日本語</b>" })
        .cues[0].text,
    ).toContain("<b>");
    expect(() => updateCue(input, { ...input.cues[0], endMs: 2500 })).toThrow();
    expect(input.cues[0].endMs).toBe(2000);
    expect(() => updateCue(input, { ...input.cues[0], id: "missing" })).toThrow(
      "no longer exists",
    );
  });
  it("adds in the first real gap and rejects a full timeline", () => {
    const result = addCue(doc(), "three");
    expect(result.cues[2]).toMatchObject({ startMs: 4000, endMs: 5500 });
    expect(
      addCue(sampleDocument(24000), "gap").cues.find((cue) => cue.id === "gap"),
    ).toMatchObject({ startMs: 3750, endMs: 4500 });
    expect(() => addCue({ ...doc(), durationMs: 4000 }, "three")).toThrow(
      "No gap",
    );
  });
});
describe("history (C3)", () => {
  it("undoes deletion, redoes, and invalidates redo after a new edit", () => {
    let state = createHistory(doc());
    const deleted = { ...doc(), cues: [doc().cues[1]] };
    state = historyReducer(state, { type: "commit", document: deleted });
    state = historyReducer(state, { type: "undo" });
    expect(state.present.cues).toHaveLength(2);
    state = historyReducer(state, { type: "redo" });
    expect(state.present.cues).toHaveLength(1);
    state = historyReducer(state, { type: "undo" });
    state = historyReducer(state, {
      type: "commit",
      document: { ...doc(), cues: [] },
    });
    expect(state.future).toEqual([]);
  });
  it("bounds history and does not record identical commits", () => {
    let state = createHistory(doc());
    expect(historyReducer(state, { type: "commit", document: doc() })).toBe(
      state,
    );
    for (let i = 0; i < 60; i++)
      state = historyReducer(state, {
        type: "commit",
        document: { ...doc(), cues: [{ ...doc().cues[0], text: `Edit ${i}` }] },
      });
    expect(state.past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < 60; i++)
      state = historyReducer(state, { type: "undo" });
    expect(state.future).toHaveLength(HISTORY_LIMIT);
    expect(state.present.cues[0].text).toBe("Edit 19");
  });
});
describe("WebVTT and persistence (C4)", () => {
  it("roundtrips Unicode, newlines, literal entity names, markup and significant whitespace", () => {
    const input = doc();
    input.cues[0].text = "  日本語 & <b>test</b> &amp;\n\nsecond line\r  ";
    const encoded = exportVtt(input);
    expect(encoded).not.toContain("<b>");
    expect(importVtt(encoded, 10000).cues[0].text).toBe(input.cues[0].text);
    expect(importVtt("WEBVTT\n\n", 10000).cues).toEqual([]);
  });
  it.each([
    "bad",
    "WEBVTT\n\n00:00:00.000 --> 00:00:01.000 position:10%\na",
    "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n<img src=x>",
    "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n&unknown;",
    "WEBVTT\n\n00:00:02.000 --> 00:00:01.000\na",
  ])("rejects unsupported input", (input) =>
    expect(() => importVtt(input, 10000)).toThrow(),
  );
  it("rejects oversize before parsing and measures bytes instead of codepoints", () =>
    expect(() =>
      importVtt("日".repeat(Math.ceil(MAX_IMPORT_BYTES / 3) + 1), 10000),
    ).toThrow("512 KiB"));
  it("supports BOM and CRLF files and rejects duplicate numeric identifiers", () => {
    expect(
      importVtt(
        "\uFEFFWEBVTT\r\n\r\n00:00:00.000 --> 00:00:01.000\r\nhello\r\n",
        10000,
      ).cues[0].text,
    ).toBe("hello");
    expect(() =>
      importVtt(
        "WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.000\na\n\n1\n00:00:01.000 --> 00:00:02.000\nb",
        10000,
      ),
    ).toThrow("duplicate");
  });
  it("validates stored asset identity, bounds, schema and corruption", () => {
    expect(restoreDocument(serializeDocument(doc()), 10000)).toEqual(doc());
    for (const raw of [
      "{",
      JSON.stringify({ assetKey: "other", document: doc() }),
      JSON.stringify({
        assetKey: ASSET_KEY,
        document: { ...doc(), durationMs: 1 },
      }),
      "x".repeat(512 * 1024 + 1),
    ])
      expect(() => restoreDocument(raw, 10000)).toThrow();
  });
});
describe("waveform", () => {
  it("uses actual peak amplitudes within each bin and bounds output resolution", () => {
    expect(waveformPeaks(new Float32Array([0, -0.5, 0.25, 1]), 2)).toEqual([
      0.5, 1,
    ]);
    expect(waveformPeaks(new Float32Array(), 2)).toEqual([0, 0]);
    expect(() => waveformPeaks(new Float32Array(), 1001)).toThrow();
  });
});

describe("maximum-size export envelope", () => {
  it.each(["&".repeat(500), "\r".repeat(499) + "x", "日本語&<>".repeat(83)])(
    "roundtrips all 100 maximum-width captions including expanded entities and Unicode",
    (text) => {
      const input: CaptionDocument = {
        version: 1,
        durationMs: 10000,
        cues: Array.from({ length: 100 }, (_, index) => ({
          id: `max-${index}`,
          startMs: index * 100,
          endMs: (index + 1) * 100,
          text,
        })),
      };
      const exported = exportVtt(input);
      expect(new TextEncoder().encode(exported).byteLength).toBeLessThan(
        MAX_IMPORT_BYTES,
      );
      const restored = importVtt(exported, input.durationMs);
      expect(
        restored.cues.map(({ startMs, endMs, text }) => ({
          startMs,
          endMs,
          text,
        })),
      ).toEqual(
        input.cues.map(({ startMs, endMs, text }) => ({
          startMs,
          endMs,
          text,
        })),
      );
    },
  );
});
