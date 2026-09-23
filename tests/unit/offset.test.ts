import { describe, expect, it } from "vitest";
import { offsetRange, shiftTimings } from "../../src/domain/offset";
import type { CaptionDocument } from "../../src/domain/captions";
const document: CaptionDocument = {
  version: 1,
  durationMs: 10000,
  cues: [
    { id: "a", startMs: 1000, endMs: 3000, text: "First" },
    { id: "b", startMs: 5000, endMs: 7000, text: "Second" },
  ],
};
describe("timing offsets", () => {
  it("shifts all cues preserving IDs, text, duration, gaps and source", () => {
    const next = shiftTimings(document, "all", 500);
    expect(next.cues.map(({ startMs, endMs }) => [startMs, endMs])).toEqual([
      [1500, 3500],
      [5500, 7500],
    ]);
    expect(next.cues.map(({ id, text }) => [id, text])).toEqual([
      ["a", "First"],
      ["b", "Second"],
    ]);
    expect(document.cues[0].startMs).toBe(1000);
  });
  it("allows inclusive edges and selects neighboring limits", () => {
    expect(offsetRange(document, "all")).toEqual({
      min: -1000,
      max: 3000,
      count: 2,
    });
    expect(offsetRange(document, { id: "a" })).toEqual({
      min: -1000,
      max: 2000,
      count: 1,
    });
    expect(offsetRange(document, { id: "b" })).toEqual({
      min: -2000,
      max: 3000,
      count: 1,
    });
    expect(shiftTimings(document, { id: "a" }, 2000).cues[0].endMs).toBe(5000);
    expect(shiftTimings(document, "all", -1000).cues[0].startMs).toBe(0);
    expect(shiftTimings(document, "all", 3000).cues[1].endMs).toBe(10000);
  });
  it.each([0, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects non-integer or zero offset %s",
    (offset) => {
      expect(() => shiftTimings(document, "all", offset)).toThrow(
        "nonzero whole",
      );
    },
  );
  it.each([-1001, 3001])(
    "rejects out of range %s without mutation",
    (offset) => {
      const before = structuredClone(document);
      expect(() => shiftTimings(document, "all", offset)).toThrow("boundary");
      expect(document).toEqual(before);
    },
  );
  it("rejects neighbor collision, missing selection, empty and malformed source", () => {
    expect(() => shiftTimings(document, { id: "a" }, 2001)).toThrow(
      "another caption",
    );
    expect(() => shiftTimings(document, { id: "missing" }, 1)).toThrow(
      "Choose",
    );
    expect(() => shiftTimings({ ...document, cues: [] }, "all", 1)).toThrow(
      "Choose",
    );
    expect(() =>
      shiftTimings(
        { ...document, cues: [{ ...document.cues[0], startMs: -1 }] },
        "all",
        1,
      ),
    ).toThrow("start");
  });
});
