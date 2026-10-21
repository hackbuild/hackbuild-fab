// designs/pip/chase.ts read the way every command reads it (packages/chase
// source.ts, then validate.ts), and held to sources it does not share: the
// legacy layout.js defaults() run from designs/pip/legacy/src (lineage
// pip.layout/pip-controller-legacy), the two pip-controller example saves,
// and the hookup that reference/electrical/pip-drive generates from the
// M05-T11 fixture.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { inputFields, normaliseParams, paramsErrors, readChaseSource, validateDocument } from "@hackbuild/chase";
import type { HookupDecl } from "@hackbuild/spec";
import { legacyParams } from "../migrate/legacy.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DIR = path.join(ROOT, "designs", "pip");
const read = (...p: string[]): string => readFileSync(path.join(ROOT, ...p), "utf8");
const { chase } = readChaseSource(read("designs", "pip", "chase.ts"), "designs/pip/chase.ts");
const defaults = normaliseParams(chase, {}).params;

type Obj = Record<string, unknown>;
const SAVES = ["pip-design.json", "pip-stick-design.json"] as const;
const save = (f: string): { state: Obj } => JSON.parse(read("designs", "pip", "test", "fixtures", "legacy", f)) as { state: Obj };

/** layout.js defaults(), run as the legacy bench runs it. */
function legacyDefaults(): Obj {
  const g: { PIP?: { LAYOUT: { defaults: () => Obj } } } = {};
  vm.runInNewContext(read("designs", "pip", "legacy", "src", "layout.js"), { globalThis: g });
  return g.PIP!.LAYOUT.defaults();
}

/** A legacy state as normalised chase params, with what normalising had to change. */
function migrated(state: unknown) {
  const m = legacyParams(state);
  return { ...m, ...normaliseParams(chase, m.params) };
}

describe("pip chase", () => {
  it("validates with 0 errors through packages/chase validate.ts", () => {
    const build = path.join(DIR, chase.build.module);
    const v = validateDocument({ chase, ...(existsSync(build) ? { buildSource: readFileSync(build, "utf8") } : {}) });
    expect(v.errors).toEqual([]);
    expect(chase.meta).toMatchObject({ id: "pip", kind: "single", machines: ["ffc5p"] });
  });

  it("takes every default from layout.js defaults(), except the pegs canon turned off", () => {
    const m = migrated(legacyDefaults());
    expect(m.unknown).toEqual([]);
    expect(m.report).toEqual({ dropped: [], replaced: [], clamped: [] });
    // pip-controller b137deb builds bezel pegs; haft (9), the canonical row, does not.
    expect({ ...m.params, pegs: false }).toEqual(defaults);
  });

  it("names the four slots of layout.js lines 47 to 52", () => {
    const slots = legacyDefaults()["slots"] as { color: string }[];
    expect(chase.materials.map((s) => s.preview)).toEqual(slots.map((s) => s.color));
    expect(chase.materials.map((s) => s.material)).toEqual(["petg", "cpla", "tpu95", "ctpu"]);
  });
});

describe.each(SAVES)("legacy save %s", (f) => {
  const m = migrated(save(f));
  it("loads with no unknown key and nothing dropped, replaced or clamped", () => {
    expect(m.unknown).toEqual([]);
    expect(m.report).toEqual({ dropped: [], replaced: [], clamped: [] });
    expect(paramsErrors(chase, m.params)).toEqual([]);
  });
  it("routes every field to a declared field id", () => {
    const ids = new Set(inputFields(chase).map((x) => x.id));
    for (const r of m.routes) if (r.kind === "field") expect(ids.has(r.field), r.from).toBe(true);
  });
  it("equals the preset it is", () => {
    const preset = chase.presets!.find((p) => p.id === (f === "pip-design.json" ? "worked" : "stick"))!;
    expect(m.params).toEqual(normaliseParams(chase, preset.params).params);
  });
  it("drops phys with the row each key reads", () => {
    const phys = m.routes.filter((r) => r.from.startsWith("phys."));
    expect(phys.map((r) => r.from).sort()).toEqual(Object.keys(save(f).state["phys"] as Obj).map((k) => `phys.${k}`).sort());
    expect(phys.find((r) => r.from === "phys.rhoC")).toEqual({ from: "phys.rhoC", kind: "profile", row: "cpla.pip.along" });
  });
});

describe("an unknown legacy key", () => {
  it("is listed", () => {
    const s = save("pip-design.json").state;
    expect(legacyParams({ ...s, stray: 1, shape: { ...(s["shape"] as Obj), spin: 2 } }).unknown).toEqual(["shape.spin", "stray"]);
  });
});

describe("hookup", () => {
  const hook = chase.hookup!;
  const byPort = new Map(hook.map((h) => [h.port, h]));
  const pins = save("pip-design.json").state["pins"] as Record<string, string>;
  const touch = new Set(["SELECT", "START"]);

  it("reads every pin of layout.js line 42 on its port", () => {
    expect(hook.map((h) => h.port).sort()).toEqual(Object.keys(pins).map((p) => `port.${p}`).sort());
    for (const [name, pin] of Object.entries(pins)) expect(byPort.get(`port.${name}`)?.pin).toBe(pin);
  });

  it("waits 3500 us on keys and 1500 us on touch, from the default (D-079)", () => {
    for (const h of hook) {
      const name = h.port.slice("port.".length);
      expect(h.read).toEqual(touch.has(name)
        ? { model: "charge-release", drive: "low", driveUs: 30, waitUs: 1500, waitSource: "default" }
        : { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" });
    }
  });

  it("reads each port as reference/electrical/pip-drive does", () => {
    const drive = readChaseSource(read("reference", "electrical", "pip-drive", "chase.ts"), "reference/electrical/pip-drive/chase.ts").chase.hookup!;
    expect(drive.length).toBe(10);
    for (const d of drive) expect(byPort.get(d.port) as HookupDecl, d.port).toEqual(d);
  });

  it("is never the 200 us key wait pip.ino ships (D-080)", () => {
    const waitMech = (save("pip-design.json").state["phys"] as Obj)["waitMech"] as number;
    expect(waitMech * 1000).toBe(200);
    for (const h of hook) if (h.read.model === "charge-release") expect(h.read.waitUs).not.toBe(waitMech * 1000);
  });
});
