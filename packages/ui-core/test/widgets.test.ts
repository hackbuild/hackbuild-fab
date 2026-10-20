// R1-engine-12 acceptance: the drive.tilt widget is the drive pad model
// behind the widget registry. Its model of the committed flex-pair build
// (reference/keys/flex-pair: Part IR, CHK-NET-29 report, build.ts contact,
// the only drive build with goldens; no TOGGLE build has goldens yet)
// equals padModel field by field, an unregistered kind refuses, and
// BENCH.widgets() returns each widget's outputs. Every number compared
// comes from those goldens; none is typed here.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WIDGET_KINDS, type CheckResult, type DriveDecl, type Part, type WidgetDecl } from "@hackbuild/spec";
import { chase } from "../../../reference/keys/flex-pair/chase.js";
import { bench } from "../../../reference/keys/flex-pair/bench.js";
import { contact } from "../../../reference/keys/flex-pair/build.js";
import { bench as goldBench, contact as goldContact } from "../../../spec/fixtures/gold.js";
import { padModel } from "../src/drive/drive.js";
import { createBenchCore } from "../src/bench/core.js";
import { createHook } from "../src/bench/hook.js";
import { registerWidget, widgetEntry, widgetKinds, widgetModel, widgetRecords, type WidgetBuild } from "../src/widgets/registry.js";
import { driveTilt, type TiltModel } from "../src/widgets/tilt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const json = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;

const EXPECTED = "reference/keys/flex-pair/expected";
const report = json<{ findings: CheckResult[] }>(`${EXPECTED}/report.json`);
const built = json<{ buildHash: string }>(`${EXPECTED}/build.json`);
const part = json<Part>("packages/ui-core/test/bench/flex-pair.part.json");

const pad = bench.views.drive;
if (pad === undefined) throw new Error("flex-pair bench declares no drive pad");
// padModel reads no gesture, so the flex-pair pad set to tilt is the
// drive.tilt fixture with the golden reads behind it.
const drive: DriveDecl = { ...pad, gesture: "tilt" };

const OUTPUTS = ["targets", "contacts", "pins", "logic", "idle"];
const decl: WidgetDecl = { id: "stick", kind: "drive.tilt", fn: drive.contact, inputs: {}, outputs: OUTPUTS, tolerance: 0.01, region: "stage.overlay" };

const build = (over: Partial<WidgetBuild> = {}): WidgetBuild => ({
  features: part.features, metrics: part.metrics ?? [], results: report.findings, hookup: chase.hookup ?? [],
  contacts: { [drive.contact]: contact }, drive, ...over,
});

const direct = padModel({ decl: drive, hookup: chase.hookup ?? [], features: part.features, metrics: part.metrics ?? [], results: report.findings, contact });

describe("widgets: drive.tilt wraps the pad model", () => {
  it("reads the golden build, whose pad drives and reads", () => {
    expect(part.buildHash).toBe(built.buildHash);
    expect(direct.problem).toBeNull();
    expect(direct.targets.length).toBeGreaterThan(0);
    expect(direct.targets.some((t) => t.read !== null && t.contacts.length > 0)).toBe(true);
  });

  const m = widgetModel(decl, build()) as TiltModel;

  it("equals padModel field by field", () => {
    expect(m.problem).toBe(direct.problem);
    expect(m.pad.problem).toBe(direct.problem);
    expect(m.pad.targets.length).toBe(direct.targets.length);
    direct.targets.forEach((t, i) => {
      const w = m.pad.targets[i];
      expect(w?.target, `target ${i}`).toBe(t.target);
      expect(w?.contacts, `${t.target} contacts`).toEqual(t.contacts);
      expect(w?.bodies, `${t.target} bodies`).toEqual(t.bodies);
      expect(w?.read, `${t.target} read`).toEqual(t.read);
      expect(w?.idle, `${t.target} idle`).toBe(t.idle);
      expect(w?.missing, `${t.target} missing`).toBe(t.missing);
    });
    expect(m.pad).toEqual(direct);
  });

  it("publishes the pad's targets, contacts, pins and levels as outputs", () => {
    expect(m.outputs["targets"]).toEqual(direct.targets.map((t) => t.target));
    for (const t of direct.targets) {
      expect((m.outputs["contacts"] as Record<string, unknown>)[t.target]).toEqual(t.contacts);
      expect((m.outputs["pins"] as Record<string, unknown>)[t.target]).toBe(t.read?.pin ?? null);
      expect((m.outputs["logic"] as Record<string, unknown>)[t.target]).toBe(t.read?.logic ?? null);
      expect((m.outputs["idle"] as Record<string, unknown>)[t.target]).toBe(t.idle);
    }
  });

  it("accepts the stick gesture of the TOGGLE-shaped gold fixture and still equals padModel", () => {
    const gold = goldBench.views.drive;
    if (gold === undefined) throw new Error("gold fixture declares no drive pad");
    const g = widgetModel({ ...decl, fn: gold.contact }, { ...build({ contacts: { [gold.contact]: goldContact } }), drive: gold }) as TiltModel;
    const want = padModel({ decl: gold, hookup: chase.hookup ?? [], features: part.features, metrics: part.metrics ?? [], results: report.findings, contact: goldContact });
    expect(g.pad).toEqual(want);
  });

  it("refuses a hold pad, a missing pad and a fn other than the pad's contact, naming each", () => {
    expect(widgetModel(decl, build({ drive: pad })).problem).toContain("gesture hold is not tilt or stick");
    const { drive: _d, ...noDrive } = build();
    expect(widgetModel(decl, noDrive).problem).toContain("declares no drive pad");
    expect(widgetModel({ ...decl, fn: "other" }, build()).problem).toContain("is not the drive pad contact");
  });
});

describe("widgets: the registry", () => {
  it("holds drive.tilt, and every registered kind is a spec widget kind", () => {
    expect(widgetKinds()).toContain("drive.tilt");
    expect(widgetEntry("drive.tilt")).toBe(driveTilt);
    for (const k of widgetKinds()) expect(WIDGET_KINDS as readonly string[]).toContain(k);
  });

  it("an unregistered kind refuses, naming the registered ones", () => {
    const view = { ...decl, kind: "view.netlens" as const };
    expect(widgetKinds()).not.toContain("view.netlens");
    expect(() => widgetModel(view, build())).toThrow("widget kind view.netlens is not registered. registered: drive.fader, drive.press, drive.tilt, drive.touch, plot.curve, readout.signal");
    expect(() => widgetRecords([view], build())).toThrow("is not registered");
  });

  it("a kind registers once", () => {
    expect(() => registerWidget("drive.tilt", driveTilt)).toThrow("registered twice");
  });
});

describe("widgets: BENCH.widgets()", () => {
  const core = createBenchCore<{ w: number }, { w: number }, object>({
    app: "test", v: 1, blank: () => ({ w: 1 }), build: async (s) => ({ part: s, report: {}, buildHash: "h" }),
  });

  it("returns each widget's outputs and the live ones", () => {
    const { hook } = createHook(core, { exports: [], widgets: () => widgetRecords([decl], build()) });
    const [rec, ...rest] = hook.widgets();
    expect(rest).toEqual([]);
    expect(rec?.id).toBe("stick");
    expect(rec?.kind).toBe("drive.tilt");
    expect(rec?.problem).toBeNull();
    expect(rec?.outputs["targets"]).toEqual(direct.targets.map((t) => t.target));
    expect(rec?.live).toEqual(OUTPUTS);
  });

  it("a declared output the kind lacks is a problem, and an unbuilt pad has no live output", () => {
    const { hook } = createHook(core, {
      exports: [],
      widgets: () => widgetRecords([{ ...decl, outputs: ["targets", "force"] }, decl], build({ metrics: [] })),
    });
    const [odd, empty] = hook.widgets();
    expect(odd?.problem).toBe("drive.tilt has no output force");
    expect(empty?.problem).toContain("no drive targets");
    expect(empty?.live).toEqual([]);
  });

  it("a bench with no widgets returns none", () => {
    expect(createHook(core, { exports: [] }).hook.widgets()).toEqual([]);
  });
});
