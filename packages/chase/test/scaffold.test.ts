// chase.scaffold over text (M10-T05 step 1). The minimal scaffolds are
// held to the card's list (one PETG slot, one param group, a rail ending in
// print, no expect or waive, 3mf for ffc5p, CC-BY-SA-4.0) and to the
// COLLAR blank diameter they port, read from designs/collar/chase.ts. The
// copy edits run on the flex-pair source, and the expected text is built
// by string search, independent of the reader's spans.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ParamField } from "@hackbuild/spec";
import {
  SCAFFOLDS, benchSource, copyEdits, hasScaffold, legalDefault, patchChaseSource, readBenchSource, readChaseSource, retarget, validateDocument,
} from "@hackbuild/chase";
import { ROOT, readChase } from "./helpers.js";

const FLEX = "reference/keys/flex-pair/chase.ts";

describe("minimal scaffolds (M10-T05 step 1)", () => {
  for (const kind of ["single", "composer"] as const) {
    it(`${kind}: the card's minimal chase, and it validates with 0 errors with its build and bench`, () => {
      const files = SCAFFOLDS[kind]("scratch-pad");
      const { chase } = readChaseSource(files["chase.ts"], "designs/scratch-pad/chase.ts");
      const { bench } = readBenchSource(files["bench.ts"], "designs/scratch-pad/bench.ts");
      const v = validateDocument({ chase, bench, buildSource: files["build.ts"] });
      expect(v.errors).toEqual([]);
      expect(chase.meta).toMatchObject({ id: "scratch-pad", kind, name: "SCRATCH PAD", license: "CC-BY-SA-4.0", machines: ["ffc5p"] });
      expect(chase.meta.derivedFrom).toBeUndefined();
      expect(chase.materials).toEqual([{ slot: 1, material: "petg", role: "body", label: "body" }]);
      expect(chase.params).toHaveLength(1);
      expect(chase.expect).toBeUndefined();
      expect(chase.waive).toBeUndefined();
      expect(chase.exports).toEqual([{ kind: "3mf", machine: "ffc5p", pose: "print" }]);
      const rail = (bench as { rail: { step: string; panels: string[] }[] }).rail;
      expect(rail.map((s) => s.step)).toEqual(["main", "print"]);
      expect(rail[0]!.panels).toEqual(["params.main"]);
    });
  }

  it("the diameter field is the COLLAR blank's range, step and default", () => {
    const collar = readChase("designs/collar/chase.ts").params.find((g) => g.id === "blank")!.fields.find((f) => f.id === "dia")!;
    const { chase } = readChaseSource(SCAFFOLDS.single("x")["chase.ts"], "x/chase.ts");
    const d = chase.params[0]!.fields[0]! as ParamField & { range: unknown; step: unknown; default: unknown };
    const c = collar as ParamField & { range: unknown; step: unknown; default: unknown };
    expect([d.type, d.range, d.step, d.default]).toEqual([c.type, c.range, c.step, c.default]);
  });

  it("only single and composer have a minimal scaffold; surface and machine wait for release 2", () => {
    expect(Object.keys(SCAFFOLDS).sort()).toEqual(["composer", "single"]);
    expect(hasScaffold("surface")).toBe(false);
    expect(hasScaffold("machine")).toBe(false);
  });

  it("benchSource writes one rail step per group then print, and reads back as data", () => {
    const { bench } = readBenchSource(benchSource("p", [{ id: "pad", label: "PAD" }, { id: "keys", label: "KEYS" }]), "p/bench.ts");
    expect((bench as { rail: { step: string }[] }).rail.map((s) => s.step)).toEqual(["pad", "keys", "print"]);
  });
});

describe("copy edits", () => {
  const source = readFileSync(path.join(ROOT, FLEX), "utf8");

  it("sets meta.id and adds meta.derivedFrom after the last meta member; every other byte is kept", () => {
    const out = patchChaseSource(source, FLEX, copyEdits("pair-copy", { id: "keys-flex-pair", buildHash: "abc" }), { addMembers: true });
    if (!out.ok) throw new Error(JSON.stringify(out.errors));
    const lic = 'license: "CC-BY-SA-4.0",';
    const at = source.indexOf(lic) + lic.length;
    const want = `${source.slice(0, at)}\n    derivedFrom: { id: "keys-flex-pair", buildHash: "abc" },${source.slice(at)}`.replace('id: "keys-flex-pair", kind', 'id: "pair-copy", kind');
    expect(out.plan.source).toBe(want);
    expect(out.plan.after.meta.derivedFrom).toEqual({ id: "keys-flex-pair", buildHash: "abc" });
  });

  it("without a golden the copy carries no derivedFrom", () => {
    expect(copyEdits("pair-copy", undefined)).toEqual([{ pointer: "/meta/id", set: "pair-copy" }]);
  });

  it("retarget rewrites the opening path comment only", () => {
    expect(retarget(source, FLEX, "designs/pair-copy/chase.ts")).toBe(`// designs/pair-copy/chase.ts${source.slice(`// ${FLEX}`.length)}`);
    expect(retarget("const a = 1;\n", FLEX, "x")).toBe("const a = 1;\n");
  });
});

describe("legalDefault (generate from legal)", () => {
  const f = (o: Partial<{ default: number; step: number; range: [number, number] }> = {}): ParamField =>
    ({ id: "w", type: "mm", label: "w", range: [0.8, 2.0], step: 0.05, default: 1.4, ...o }) as ParamField;

  it("a default already inside the interval stands", () => {
    expect(legalDefault(f(), [1.2, 1.6], "mm")).toBeUndefined();
    expect(legalDefault(f(), [null, null], "mm")).toBeUndefined();
  });

  it("a default under the floor moves up to the first legal step, over the ceiling down to the last", () => {
    expect(legalDefault(f(), [1.52, null], "mm")).toBe(1.55);
    expect(legalDefault(f(), [1.5, null], "mm")).toBe(1.5);
    expect(legalDefault(f(), [null, 1.18], "mm")).toBe(1.15);
    expect(legalDefault(f({ default: 0.8 }), [0.95, 1.1], "mm")).toBe(0.95);
  });

  it("without a step the default clamps to the interval", () => {
    expect(legalDefault(f({ step: undefined as unknown as number }), [1.52, null], "mm")).toBe(1.52);
  });

  it("no legal step, an empty interval or another unit leaves the default", () => {
    expect(legalDefault(f(), [1.51, 1.54], "mm")).toBeUndefined();
    expect(legalDefault(f(), null, "mm")).toBeUndefined();
    expect(legalDefault(f(), [2.5, null], "mm")).toBeUndefined();
    expect(legalDefault(f(), [1.6, null], "deg")).toBeUndefined();
  });
});
