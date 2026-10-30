// bindChase (M10-T06 step 1, acceptance line 1): binding the flex-pair
// chase and bench gives the rail rows, welcome presets and hook members of
// the M09 flex-pair bench, and a widget the bench declares appears in
// BENCH.widgets(). Expected values come from independent sources: the step
// and panel ids are read from reference/keys/flex-pair/bench.ts, the start
// order is typed from D-125 (start blank first, presets after, in the
// welcome's order), and the hook members are parsed from the BenchHook
// interface text of spec/hook.ts, never from the module under test. The
// build here is a stub that returns an empty part, so no geometry runs.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Bench, Chase, ClaimDecl, Metric, WidgetDecl } from "@hackbuild/spec";
import { chase } from "../../../../reference/keys/flex-pair/chase.js";
import { bench } from "../../../../reference/keys/flex-pair/bench.js";
import { bindChase, NO_BUILD, NOT_A_DESIGN, type BindOptions, type ChaseReport } from "../../src/chase/bind.js";
import type { BuildOutput } from "../../src/bench/core.js";
import type { ViewPart } from "@hackbuild/viewer";
import type { WidgetClaimFn } from "../../src/widgets/press.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const read = (...p: string[]): string => readFileSync(path.join(ROOT, ...p), "utf8");

const EMPTY: ViewPart = { part: { id: "flex-pair", bodies: [] }, meshes: {} };

interface Report extends ChaseReport {
  readonly metrics: readonly Metric[];
}

const stub = (metrics: readonly Metric[] = []) => async (): Promise<BuildOutput<ViewPart, Report>> =>
  ({ part: EMPTY, report: { metrics, results: [] }, buildHash: "stub" });

function bind(extra: Partial<BindOptions<Report>> = {}) {
  return bindChase<Report>({ chase, bench, build: stub(), install: false, ...extra });
}

/** Required members of BenchHook in spec/hook.ts, parsed from its text. */
function specHookMembers(): string[] {
  const src = read("spec", "hook.ts");
  const body = /export interface BenchHook \{([\s\S]*?)\n\}/.exec(src)?.[1] ?? "";
  return [...body.matchAll(/^ {2}(?:readonly )?([a-zA-Z]+)(\??)[(:]/gm)].filter((m) => m[2] === "").map((m) => m[1] as string);
}

describe("bindChase on flex-pair", () => {
  it("gives the rail rows of the M09 bench, each panel read against the chase", () => {
    const src = read("reference", "keys", "flex-pair", "bench.ts");
    const declared = [...src.matchAll(/\{ step: "([a-z]+)", goal: "[^"]*", panels: \[([^\]]*)\]/g)].map((m) => ({
      step: m[1], panels: [...(m[2] as string).matchAll(/"([^"]+)"/g)].map((x) => x[1]),
    }));
    expect(declared.map((d) => d.step)).toEqual(["pad", "keys", "wire", "print"]);
    const b = bind();
    expect(b.rail.map((r) => ({ step: r.step, panels: r.panels.map((p) => p.id) }))).toEqual(declared);
    expect(b.railError).toBeNull();
    for (const row of b.rail.flatMap((r) => r.panels)) {
      if (row.id.startsWith("params.")) expect(row).toMatchObject({ kind: "params", group: { id: row.id.slice(7) } });
      else expect(row.kind, row.id).toBe(row.id === "materials" ? "materials" : "panel");
    }
    expect(b.rail.at(-1)).toMatchObject({ step: "print", view: "plate", focus: "export" });
  });

  it("feeds start blank first, then the welcome's presets in its order", () => {
    const b = bind();
    expect(b.starts.map((s) => s.id)).toEqual(["blank", "preset:two", "preset:one"]);
    expect(b.starts.filter((s) => s.primary).map((s) => s.id)).toEqual(["blank"]);
    expect(b.starts.find((s) => s.id === "preset:two")?.label).toBe("two keys");
  });

  it("answers every required BenchHook member and widgets()", () => {
    const members = specHookMembers();
    expect(members.length).toBe(17);
    expect(Object.keys(bind().hook).sort()).toEqual([...members, "widgets"].sort());
  });

  it("keeps the declared status chips and export kinds, json free and the rest gated", () => {
    const b = bind();
    expect(b.status).toEqual(["n_parts", "checks.verdict", "nets.verdict", "build.hash", "print.time"]);
    expect(b.exports.map((x) => [x.kind, x.fabrication])).toEqual([["3mf", true], ["stl", true], ["card", true], ["json", false]]);
    expect(b.writable).toEqual(["json"]);
  });

  it("blank is the chase defaults: one key at the list item defaults", async () => {
    const b = bind();
    await b.whenReady;
    expect(b.hook.state).toEqual({ W: 60, H: 30, r: 4, keys: [{ x: 0, d: 10, cone: 4, gap: 1.84 }], w: 1.4, pads: "clip" });
  });
});

describe("bindChase normalises, checks NaN and admits designs", () => {
  it("a BENCH.state set runs the chase normaliser and the next build carries W_NORMALISED", async () => {
    const b = bind();
    await b.whenReady;
    b.hook.state = { W: 70, bogus: 1, keys: [{ x: 0, d: 10, cone: 4, gap: "wide" }] };
    await b.core.ensureMesh();
    expect(b.hook.state).toMatchObject({ W: 70, keys: [{ gap: 1.84 }] });
    expect(b.hook.state).not.toHaveProperty("bogus");
    const codes = (b.core.result?.warnings ?? []).map((w) => [w.code, w.param]);
    expect(codes).toEqual([["W_NORMALISED", "/bogus"], ["W_NORMALISED", "/keys/0/gap"]]);
    expect(b.hook.log).toContain("dropped /bogus: not a setting of this design");
  });

  it("a non-finite metric fails the build with E_PARAM_MISSING and keeps the last model", async () => {
    let metrics: Metric[] = [];
    const b = bindChase<Report>({ chase, bench, install: false, build: async () => ({ part: EMPTY, report: { metrics, results: [] }, buildHash: "h" }) });
    await b.whenReady;
    const before = b.hook.model;
    metrics = [{ id: "keys.0.travel", value: Number.NaN, unit: "mm", drivenBy: ["/keys/0/gap"] } as unknown as Metric];
    b.core.commit();
    await expect(b.core.ensureMesh()).rejects.toThrow("E_PARAM_MISSING at /keys/0/gap");
    expect(b.hook.error).toContain("check the params at /keys/0/gap");
    expect(b.hook.model).toBe(before);
  });

  it("without a build each build fails with the no-build line", async () => {
    const b = bindChase<Report>({ chase, bench, install: false });
    await b.whenReady;
    expect(b.hook.error).toBe(NO_BUILD);
  });

  it("a dropped chase document is refused as not a design", async () => {
    const b = bind();
    await b.whenReady;
    b.open(JSON.stringify(chase));
    expect(b.hook.log.at(-1)).toContain(NOT_A_DESIGN);
  });

  it("a preset start loads the preset's keys", async () => {
    const b = bind();
    await b.whenReady;
    b.start("preset:two");
    expect((b.hook.state as { keys: unknown[] }).keys).toHaveLength(2);
    b.start("blank");
    expect((b.hook.state as { keys: unknown[] }).keys).toHaveLength(1);
  });

  it("a preset named blank loads from its own start; start blank still resets (PIP and COLLAR declare one)", async () => {
    const two = chase.presets!.find((p) => p.id === "two")!;
    const named = { ...chase, presets: [{ ...two, id: "blank", label: "blank" }, ...chase.presets!] } as Chase;
    const b = bind({ chase: named, bench: { ...bench, welcome: { ...bench.welcome, presets: ["blank", "one"] } } as Bench });
    await b.whenReady;
    expect(b.starts.map((s) => s.id)).toEqual(["blank", "preset:blank", "preset:one"]);
    b.start("preset:blank");
    expect((b.hook.state as { keys: unknown[] }).keys).toHaveLength(2);
    b.start("blank");
    expect((b.hook.state as { keys: unknown[] }).keys).toHaveLength(1);
  });
});

describe("bindChase widgets", () => {
  it("a widget the bench declares appears in BENCH.widgets()", async () => {
    const decl: WidgetDecl = { id: "stick", kind: "drive.tilt", fn: "contact", inputs: {}, outputs: [], tolerance: 0.01, region: "stage.overlay" };
    const withWidget = { ...bench, views: { ...bench.views, widgets: [decl] } } as Bench;
    const b = bind({ bench: withWidget, contact: () => ({ closed: [] }) });
    await b.whenReady;
    const recs = b.hook.widgets();
    expect(recs.map((r) => [r.id, r.kind])).toEqual([["stick", "drive.tilt"]]);
    // flex-pair's pad is a hold gesture, so the tilt model names the press kind it wants (R1-engine-12).
    expect(recs[0]?.problem).toBe("drive gesture hold is not tilt or stick; declare a drive.press widget for it");
    expect(bind().hook.widgets()).toEqual([]);
  });

  // A claim-reading widget needs the chase's claims, the page's claim
  // functions and the press travel threaded to the R1-engine-13 models. The
  // claim function is a hand line, 2 N per mm, so each force is checkable by
  // hand; flex-pair's drive pad holds keys under metrics.keys.
  const LINE: WidgetClaimFn = { unit: "N", inputs: { at: {}, travelMm: { unit: "mm" } }, fn: (_ms, a) => 2 * Number(a["travelMm"]), curve: () => [{ x: 0, y: 0 }, { x: 1, y: 2 }] };
  const CLAIM: ClaimDecl = { id: "press", fn: "line.forceAt", args: { at: "keys.0", travelMm: 0.25 }, want: { nominal: 0.5, lo: 0.4, hi: 0.6, unit: "N" }, why: "a hand band" };
  const PRESS: WidgetDecl = { id: "press", kind: "drive.press", fn: "line.forceAt", inputs: {}, outputs: ["travel", "forceN", "contact"], tolerance: 0.01, region: "stage.overlay" };
  const PLOT: WidgetDecl = { id: "press", kind: "plot.curve", fn: "line.forceAt", inputs: {}, outputs: ["series", "band", "contactMm", "cursor"], tolerance: 0.01, region: "rail.after-params" };
  const KEY_METRICS = [{ id: "keys.0.travel", value: 1.84, unit: "mm", drivenBy: ["/keys/0/gap"] } as unknown as Metric];
  const pressBench = { ...bench, views: { ...bench.views, widgets: [PRESS, PLOT] } } as Bench;
  const pressChase = { ...chase, claims: [CLAIM] } as Chase;
  const closesAt = (t: number) => ({ closed: t >= 1 ? ["tip"] : [], pose: { travelMm: t } });
  const contact = (_ms: readonly Metric[], _t: string, s: unknown) => closesAt(s === true ? 1.84 : typeof s === "number" ? s : 0);

  it("a declared drive.press and plot.curve read the chase's claim through the page's claim functions", async () => {
    let travel: number | undefined;
    const b = bind({ chase: pressChase, bench: pressBench, build: stub(KEY_METRICS), contact, claimFns: { "line.forceAt": LINE }, travel: () => travel });
    await b.whenReady;
    await b.core.ensureMesh();
    const [press, plot] = b.hook.widgets();
    expect([press?.id, press?.kind, press?.problem]).toEqual(["press", "drive.press", null]);
    expect(press?.outputs).toEqual({ travel: 0.25, forceN: 0.5, contact: false });
    expect([plot?.kind, plot?.problem]).toEqual(["plot.curve", null]);
    travel = 1.2;
    expect(b.hook.widgets()[0]?.outputs).toEqual({ travel: 1.2, forceN: 2.4, contact: true });
  });

  it("without the page's claim functions the press computes nothing", async () => {
    const b = bind({ chase: pressChase, bench: pressBench, build: stub(KEY_METRICS), contact });
    await b.whenReady;
    await b.core.ensureMesh();
    // The registry reports the missing outputs over the model's own refusal (R1-engine-12 widgetRecords).
    expect(b.hook.widgets()[0]).toMatchObject({ outputs: {}, problem: "drive.press has no output travel, forceN, contact" });
  });
});
