// M09-T03 step 7: a loaded design merges onto a fresh blank at every depth
// (PIP bench/part2.js lines 188 to 197). Expected states are worked by hand.

import { describe, expect, test } from "vitest";
import { firstNonFinite, mergeOntoBlank } from "../../src/bench/merge.js";

const blank = () => ({ groups: { left: { on: false, kind: "pad", keys: [1, 2] }, menu: { on: false } }, phys: { vcc: 3.3 }, name: "pip" });

describe("mergeOntoBlank", () => {
  test("recurses into objects, replaces arrays whole, keeps blank keys the document lacks", () => {
    const { state, dropped } = mergeOntoBlank(blank(), { groups: { left: { on: true, keys: [9] } }, name: "mine" });
    expect(state).toEqual({ groups: { left: { on: true, kind: "pad", keys: [9] }, menu: { on: false } }, phys: { vcc: 3.3 }, name: "mine" });
    expect(dropped).toEqual([]);
  });

  test("drops keys the blank lacks, at every depth, and names each by pointer", () => {
    const { state, dropped } = mergeOntoBlank(blank(), { retired: 1, groups: { left: { old: 2 }, gone: {} }, phys: { "a/b": 0 } });
    expect(dropped).toEqual(["/retired", "/groups/left/old", "/groups/gone", "/phys/a~1b"]);
    expect(state).toEqual(blank());
  });

  test("a scalar over an object replaces it, as PIP does", () => {
    const { state } = mergeOntoBlank(blank(), { phys: 5 });
    expect(state.phys).toBe(5);
  });

  test("a non-object document leaves the blank", () => {
    expect(mergeOntoBlank(blank(), [1]).state).toEqual(blank());
    expect(mergeOntoBlank(blank(), null).state).toEqual(blank());
  });

  test("a document key named __proto__ is dropped, never merged into the prototype", () => {
    const { state, dropped } = mergeOntoBlank(blank(), JSON.parse('{"__proto__": {"polluted": true}}'));
    expect(dropped).toEqual(["/__proto__"]);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect((state as { polluted?: boolean }).polluted).toBeUndefined();
  });
});

describe("firstNonFinite", () => {
  test("finds NaN and infinities by pointer", () => {
    expect(firstNonFinite({ a: 1, b: [0, Number.NaN] })).toBe("/b/1");
    expect(firstNonFinite({ a: { c: Number.POSITIVE_INFINITY } })).toBe("/a/c");
    expect(firstNonFinite(Number.NaN)).toBe("/");
    expect(firstNonFinite({ a: 1, b: "NaN" })).toBeUndefined();
  });
});
