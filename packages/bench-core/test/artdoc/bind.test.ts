// The art controller through bindChase: one controller per `art` param, whose
// edits are core sets and commits (so the design json holds the art and undo
// restores it), and BENCH.verbs.art drives the same state. The chase is the
// art board fixture, tools/fixtures/art-board.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { artDocumentUri } from "@hackbuild/spec";
import { bindChase, type ArtDocState } from "../../src/index.js";
import { bench } from "../../../../tools/fixtures/art-board/bench.js";
import { chase } from "../../../../tools/fixtures/art-board/chase.js";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("bindChase art", () => {
  it("names the art params, makes one controller each and none for other ids", () => {
    const b = bindChase({ chase, bench, install: false });
    expect(b.artIds).toEqual(["art"]);
    expect(b.art("art")).toBe(b.art("art"));
    expect(b.art("thk")).toBeNull();
    b.core.dispose();
  });

  it("an edit sets the param to a layers value whose uri hashes its document, and the design json carries it", () => {
    const b = bindChase({ chase, bench, install: false });
    const c = b.art("art")!;
    const id = c.add("shape");
    const v = b.core.get("art") as { uri: string; kind: string; doc: Parameters<typeof artDocumentUri>[0] };
    expect(v.kind).toBe("layers");
    expect(v.uri).toBe(artDocumentUri(v.doc));
    expect(b.core.rev).toBeGreaterThan(0);
    expect(c.moveBy(id, 4, 0, { altKey: true })).toBe(true);
    expect(JSON.stringify(b.core.designJson())).toContain(c.uri());
    expect(c.uri()).not.toBe(v.uri);
    b.core.dispose();
  });

  it("undo and redo go through the core history", () => {
    const b = bindChase({ chase, bench, install: false });
    const c = b.art("art")!;
    c.add("shape");
    vi.advanceTimersByTime(600);
    c.add("scope");
    vi.advanceTimersByTime(600);
    expect(c.layers().length).toBe(2);
    expect(b.core.undo()).toBe(true);
    c.refresh();
    expect(c.layers().map((L) => L.kind)).toEqual(["shape"]);
    expect(b.core.redo()).toBe(true);
    c.refresh();
    expect(c.layers().map((L) => L.kind)).toEqual(["shape", "scope"]);
    b.core.dispose();
  });

  it("the hook carries the art verb, and a bad call throws a line that names the problem", () => {
    const b = bindChase({ chase, bench, install: false });
    const verb = b.hook.verbs!["art"]!;
    const s = verb("add", { kind: "text" }) as ArtDocState;
    expect(s.layers.map((L) => L.kind)).toEqual(["text"]);
    expect(() => verb("add", { kind: 7 })).toThrow("art kind is 7, expected a string");
    expect(() => verb("spin", {})).toThrow(/^art op spin, expected one of state, add/);
    expect(() => verb("state", { param: "nope" })).toThrow("no art param nope; art params are art");
    expect(() => verb("set", { id: s.sel, key: "slot", value: 0 })).toThrow(/^slot is 0, expected a whole number from 1/);
    b.core.dispose();
  });
});
