// design() modules (plan v11.2 section 4.1): designToChase lowering, the
// reader's rules on design.ts, the opaque inline build, and chase.patch
// through spans on a design.ts. The finger-pot design.ts is the worked
// example; its lowered chase must equal the chase.ts it replaced.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isThrownCommandError, type CommandError } from "@hackbuild/spec";
import { designToChase, designWidgets, isDesignSource, patchChaseSource, readChaseSource } from "@hackbuild/chase";
import { ROOT } from "./helpers.js";

const FILE = "reference/sensors/finger-pot/design.ts";
const SOURCE = readFileSync(path.join(ROOT, FILE), "utf8");

const INLINE = `import { design } from "@hackbuild/spec";

export const designModule = design({
  id: "inline-demo",
  meta: { kind: "single", name: "INLINE", version: 1, chase: 2, kernels: ["geom"], machines: ["ffc5p"], license: "CC-BY-SA-4.0" },
  slots: [{ slot: 1, material: "petg", role: "body", label: "body", preview: "#FFFFFF" }],
  params: [{ id: "g", label: "G", live: "commit", fields: [{ id: "w", type: "mm", label: "width", range: [1, 9], step: 1, default: 4 }] }],
  widgets: [],
  build: (p: { w: number }, k: { part: (x: unknown) => unknown }) => {
    const items = [1, 2].map((n) => ({ n, w: p.w }));
    return k.part({ items, text: \`a,b\` });
  },
});
`;

function thrown(f: () => unknown): CommandError {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a CommandError");
}

describe("designToChase", () => {
  it("lowers id, slots and the defaults", () => {
    const chase = designToChase({
      id: "x-y", meta: { kind: "single", name: "XY", version: 1, chase: 2 }, slots: [{ slot: 1 }], params: [], build: { module: "./build.ts", fn: "build" },
    });
    expect(chase.meta).toEqual({ id: "x-y", kind: "single", name: "XY", version: 1, chase: 2 });
    expect(chase.materials).toEqual([{ slot: 1 }]);
    expect(chase.exports).toEqual([]);
    expect(chase.assertions).toEqual([]);
    expect("widgets" in chase).toBe(false);
  });

  it("lowers an inline build to design.ts and its build export", () => {
    const chase = designToChase({ id: "a", meta: {}, slots: [], params: [], build: () => 1 });
    expect(chase.build).toEqual({ module: "./design.ts", fn: "build" });
  });

  it("returns the widgets for the bench layer", () => {
    expect(designWidgets({ widgets: [{ id: "w" }] })).toEqual([{ id: "w" }]);
  });
});

describe("design.ts source", () => {
  it("is recognised by its export", () => {
    expect(isDesignSource(SOURCE)).toBe(true);
    expect(isDesignSource("export const chase = defineChase({})")).toBe(false);
  });

  it("reads the finger-pot module as the chase it replaced", () => {
    const read = readChaseSource(SOURCE, FILE);
    expect(read.chase.meta.id).toBe("sensors-finger-pot");
    expect(read.chase.materials.map((m) => m.slot)).toEqual([1, 2]);
    expect(read.chase.build).toEqual({ module: "./build.ts", fn: "build" });
    const pointers = read.spans.map((s) => s.pointer);
    expect(pointers).toContain("/meta/id");
    expect(pointers).toContain("/materials/0");
    expect(pointers).not.toContain("/slots");
  });

  it("skips an inline build as one opaque span and never runs it", () => {
    const read = readChaseSource(INLINE, "inline/design.ts");
    expect(read.chase.build).toEqual({ module: "./design.ts", fn: "build" });
    const span = read.spans.find((s) => s.pointer === "/build")!;
    const text = Buffer.from(INLINE).subarray(span.start, span.end).toString();
    expect(text.startsWith("(p: { w: number }")).toBe(true);
    expect(text.endsWith("}")).toBe(true);
    expect(read.spans.some((s) => s.pointer.startsWith("/build/"))).toBe(false);
  });

  it("refuses a computed member outside build", () => {
    const e = thrown(() => readChaseSource(INLINE.replace("default: 4", "default: Math.max(1, 4)"), "bad/design.ts"));
    expect(e.record).toBe("chase-source/no-identifier");
    expect(e.path).toBe("/params/0/fields/0/default");
  });

  it("refuses a function in any other member", () => {
    const e = thrown(() => readChaseSource(INLINE.replace("widgets: []", "widgets: () => []"), "bad/design.ts"));
    expect(e.code).toBe("E_SCHEMA");
    expect(e.path).toBe("/widgets");
  });

  it("refuses a design missing slots", () => {
    const e = thrown(() => readChaseSource(INLINE.replace(/  slots: .*\n/, ""), "bad/design.ts"));
    expect(e.path).toBe("/slots");
  });
});

describe("chase.patch on design.ts", () => {
  it("edits one default through the chase pointer and keeps every other byte", () => {
    const out = patchChaseSource(SOURCE, FILE, [{ pointer: "/params/0/fields/0/default", set: 90 }]);
    if (!out.ok) throw new Error(JSON.stringify(out.errors));
    expect(out.plan.source).toBe(SOURCE.replace("default: 60", "default: 90"));
    expect(out.plan.after.params[0]!.fields[0]).toMatchObject({ default: 90 });
  });

  it("edits the design id through /meta/id", () => {
    const out = patchChaseSource(SOURCE, FILE, [{ pointer: "/meta/id", set: "sensors-finger-pot-b" }]);
    if (!out.ok) throw new Error(JSON.stringify(out.errors));
    expect(out.plan.source).toContain("id: \"sensors-finger-pot-b\"");
  });

  it("patches a design with an inline build and leaves the build bytes alone", () => {
    const out = patchChaseSource(INLINE, "inline/design.ts", [{ pointer: "/params/0/fields/0/default", set: 5 }]);
    if (!out.ok) throw new Error(JSON.stringify(out.errors));
    expect(out.plan.source).toBe(INLINE.replace("default: 4", "default: 5"));
  });
});
