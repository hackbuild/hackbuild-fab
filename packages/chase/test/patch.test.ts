// chase.patch over source text (M10-T05 step 2). The flex-pair chase.ts is
// the source; each expected text is built from the file by plain string
// slicing at the literal, independent of the reader's spans, so a writer
// that moves any other byte fails.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isThrownCommandError, type CommandError, type PatchEdit } from "@hackbuild/spec";
import { patchChaseSource, readChaseSource, type PatchPlan } from "@hackbuild/chase";
import { ROOT } from "./helpers.js";

const FILE = "reference/keys/flex-pair/chase.ts";
const SOURCE = readFileSync(path.join(ROOT, FILE), "utf8");
/** The travel default, gap, of the keys list item (flex-pair chase.ts). */
const GAP = "/params/1/fields/0/item/3/default";
const GAP_TEXT = "constraintDim: \"contact.gap\"";

function thrown(f: () => unknown): CommandError {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a CommandError");
}

function plan(source: string, edits: readonly PatchEdit[], addMembers = false): PatchPlan {
  const out = patchChaseSource(source, FILE, edits, addMembers ? { addMembers } : {});
  if (!out.ok) throw new Error(JSON.stringify(out.errors));
  return out.plan;
}

/** The char offset of the gap default literal 1.84, found by text search. */
function gapAt(source: string): number {
  const field = source.indexOf("{ id: \"gap\"");
  const at = source.indexOf("default: 1.84", field) + "default: ".length;
  expect(source.indexOf(GAP_TEXT, at)).toBeGreaterThan(at);
  return at;
}

describe("chase.patch source writer (M10-T05 step 2)", () => {
  it("a pointer edit replaces the literal and leaves every other byte unchanged", () => {
    const p = plan(SOURCE, [{ pointer: GAP, set: 1.44 }]);
    const at = gapAt(SOURCE);
    expect(p.edits).toBe(1);
    expect(p.source).toBe(`${SOURCE.slice(0, at)}1.44${SOURCE.slice(at + "1.84".length)}`);
    expect(readChaseSource(p.source, FILE).chase.params[1]).toEqual(p.after.params[1]);
    expect(p.inverse).toEqual([{ pointer: GAP, set: 1.84 }]);
  });

  it("the byte offsets hold past a multibyte comment", () => {
    const src = SOURCE.replace("  params: [", "  // café µm \u{1d4b3}\n  params: [");
    const p = plan(src, [{ pointer: GAP, set: 1.44 }]);
    const at = gapAt(src);
    expect(p.source).toBe(`${src.slice(0, at)}1.44${src.slice(at + 4)}`);
  });

  it("the inverse edits restore the source byte for byte", () => {
    const edits: PatchEdit[] = [
      { pointer: GAP, set: 1.44 },
      { anchor: "label: \"cones\"", replace: "label: \"keys\"" },
      { pointer: "/materials/-", set: { slot: 5, material: "petg", role: "body", label: "lid", preview: "#F4F1EA" } },
    ];
    const p = plan(SOURCE, edits);
    const back = plan(p.source, p.inverse);
    expect(back.source).toBe(SOURCE);
  });

  it("an anchor that matches twice is E_STALE naming the count and lines, and changes nothing", () => {
    const src = SOURCE.replace("default: 1.84", "default: 2.15").replace("step: 0.05, default: 1.4", "step: 0.05, default: 2.15");
    const e = thrown(() => patchChaseSource(src, FILE, [{ anchor: "default: 2.15", replace: "default: 1.44" }]));
    expect(e.code).toBe("E_STALE");
    expect(e.got).toBe(2);
    expect(e.path).toBe("/edits/0/anchor");
    const lines = src.split("\n").flatMap((l, i) => (l.includes("default: 2.15") ? [i + 1] : []));
    expect(e.hint).toContain(`matched 2 times at lines ${lines.join(", ")}`);
  });

  it("an anchor that matches nowhere is E_STALE matched 0 times", () => {
    const e = thrown(() => patchChaseSource(SOURCE, FILE, [{ anchor: "default: 2.15", replace: "default: 1.44" }]));
    expect(e.code).toBe("E_STALE");
    expect(e.hint).toContain("matched 0 times");
  });

  it("a pointer that names nothing is E_REF with the nearest pointers", () => {
    const e = thrown(() => patchChaseSource(SOURCE, FILE, [{ pointer: "/params/1/fields/0/item/3/defualt", set: 1.44 }]));
    expect(e.code).toBe("E_REF");
    expect(e.didYouMean).toContain(GAP);
  });

  it("an edit that breaks the schema is refused with the error it adds", () => {
    const out = patchChaseSource(SOURCE, FILE, [{ pointer: "/materials/0/slot", set: "one" }]);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.errors.map((e) => e.path)).toContain("/materials/0/slot");
  });

  it("an error the source already had does not block a patch", () => {
    const had: CommandError = { code: "E_REF", path: "/x", hint: "known" };
    const out = patchChaseSource(SOURCE, FILE, [{ pointer: GAP, set: 1.44 }], { validate: () => [had] });
    expect(out.ok).toBe(true);
  });

  it("an array append takes the indentation of its siblings", () => {
    const slot = { slot: 5, material: "petg", role: "body", label: "lid", preview: "#F4F1EA" };
    const p = plan(SOURCE, [{ pointer: "/materials/-", set: slot }]);
    const last = "{ slot: 4, material: \"ctpu\", role: \"flex-conductor\", label: \"caps\", preview: \"#6E6E6E\" },";
    const at = SOURCE.indexOf(last) + last.length;
    expect(p.source).toBe(`${SOURCE.slice(0, at)}\n    { slot: 5, material: "petg", role: "body", label: "lid", preview: "#F4F1EA" },${SOURCE.slice(at)}`);
    expect(p.after.materials.at(-1)).toEqual(slot);
  });

  it("an absent key is E_REF unless the caller adds members, as arch.apply does", () => {
    const applied = { archetype: "flex-cone-key", part: "pad", face: { ref: "pad.top", uv: [0, 0], rotDeg: 0 } };
    expect(thrown(() => patchChaseSource(SOURCE, FILE, [{ pointer: "/applied", set: [applied] }])).code).toBe("E_REF");
    const p = plan(SOURCE, [{ pointer: "/applied", set: [applied] }], true);
    expect(p.after.applied).toEqual([applied]);
    expect(plan(p.source, p.inverse).source).toBe(SOURCE);
  });
});
