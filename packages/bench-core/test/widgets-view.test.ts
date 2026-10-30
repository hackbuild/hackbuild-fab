// R1-engine-15 acceptance: drive.code, view.light and view.netlens.
// drive.code reads TUMBLER's gate, tumbSolve from packages/mechanisms at
// the module's own defaults (5 pins, lift 2 mm, shear 0.4 mm, cut code
// 1 3 0 2 4), bound the way a page build binds it; the expected verdicts
// are by hand from the original's arithmetic (tumbler.html line 473): the
// cut code at KEY 1 lifts every pin to the shear line; any other code
// sets WRONG, which lifts pin 2 by 3 x 2 + 2 x 1.4 = 8.8 mm against
// 6 mm, an error of 2.8 mm over the 0.4 mm window, so 4 pins of 5 and
// locked (computed). view.light's rest pose is PIP's key light at
// (60, -90, 140) mm (part3.js lines 14 to 17). view.netlens reads the
// flex-pair Part IR the viewer tests read: K1 has two conductor bodies
// and GND three, by reading the fixture's features (measured).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Part, ProfileLookup, WidgetDecl, WidgetKind } from "@hackbuild/spec";
import { defaults, tumbSolve, tumblerDefaults, tumblerDerive, tumblerModule } from "@hackbuild/mechanisms";
import { widgetModel, widgetRecords, type WidgetBuild } from "../src/widgets/registry.js";
import { codeLine, nextDigit, type CodeModel, type WidgetCodeGate } from "../src/widgets/code.js";
import { KEY_AIM, KEY_DIST, lightAt, type LightModel } from "../src/widgets/light.js";
import { netlensLine, type NetlensModel } from "../src/widgets/netlens.js";
import { createOwner, createStageScene, XRAY_GHOST, type Palette, type ViewModes } from "@hackbuild/viewer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const part = JSON.parse(readFileSync(path.join(HERE, "bench/flex-pair.part.json"), "utf8")) as Part;

const decl = (kind: WidgetKind, fn: string, outputs: readonly string[], inputs: WidgetDecl["inputs"] = {}): WidgetDecl =>
  ({ id: kind, kind, fn, inputs, outputs, tolerance: 0.01, region: "stage.overlay" });
const build = (over: Partial<WidgetBuild> = {}): WidgetBuild => ({ features: [], metrics: [], results: [], hookup: [], contacts: {}, ...over });

// ---- drive.code ----

const tumb = tumblerModule("tumb")!;
const P = defaults(tumb);
const CUT = P["code"] as readonly number[];
const gate: WidgetCodeGate = {
  cut: Array.from({ length: P["n"] as number }, (_, i) => CUT[i % CUT.length]!),
  max: 4,
  solve: (u) => tumbSolve(P, u),
};
const CODE_OUT = ["code", "insertion", "opens", "pinsOk", "wrong", "keyspace"];
const codeDecl = decl("drive.code", "tumb", CODE_OUT);
const dial = (code: readonly number[], insertion?: number): CodeModel =>
  widgetModel(codeDecl, build({ gates: { tumb: gate }, codes: { [codeDecl.id]: code }, ...(insertion === undefined ? {} : { insertion: { [codeDecl.id]: insertion } }) })) as CodeModel;

describe("drive.code", () => {
  const cases: [readonly number[], number, number][] = [
    [[1, 3, 0, 2, 4], 1, 5],
    [[1, 3, 0, 2, 3], 0, 4],
    [[4, 4, 4, 4, 4], 0, 4],
  ];
  it.each(cases)("code %j: the widget's verdict is the tumbler gate's", (code, opens, pinsOk) => {
    const m = dial(code);
    expect(m.problem).toBeNull();
    const same = code.every((d, i) => d === gate.cut[i]);
    const check = tumbSolve(P, { KEY: 1, WRONG: same ? 0 : 1 });
    expect(m.outputs["opens"]).toBe(check.allOk ? 1 : 0);
    expect(m.outputs["pinsOk"]).toBe(check.pins.filter((p) => p.ok).length);
    expect(m.outputs["opens"]).toBe(opens);
    expect(m.outputs["pinsOk"]).toBe(pinsOk);
  });

  it("the cut code opens as the bay's opens metric says, and the keyspace is its codes", () => {
    // tumb's derive reads no profile row.
    const d = tumblerDerive(tumb, tumblerDefaults("tumb"), {} as ProfileLookup);
    const m = dial(CUT);
    expect(m.outputs["opens"]).toBe(d["opens"]!.value);
    expect(m.outputs["keyspace"]).toBe(d["codes"]!.value);
    expect(m.outputs["keyspace"]).toBe(3125);
  });

  it("a half inserted key stays locked even with the cut code", () => {
    const m = dial(CUT, 0.5);
    expect(m.outputs["opens"]).toBe(tumbSolve(P, { KEY: 0.5, WRONG: 0 }).allOk ? 1 : 0);
    expect(m.outputs["opens"]).toBe(0);
    expect(codeLine(m)).toBe("1 3 0 2 4 stays locked, 0 pins at the shear line (computed)");
  });

  it("wheels step as TUMBLER's buttons, 0 to max then back to 0", () => {
    expect([0, 1, 2, 3, 4].map((d) => nextDigit(d, 4))).toEqual([1, 2, 3, 4, 0]);
  });

  it("refuses without a gate, a wrong wheel count or a digit past max", () => {
    expect(widgetModel(codeDecl, build()).problem).toBe("the bench carries no code gate tumb; the page build hands the gate in");
    expect(dial([1, 2]).problem).toBe("the wheels hold 2 digits and the lock has 5 pins");
    expect(dial([1, 2, 3, 4, 5]).problem).toBe("a wheel reads 5; each holds 0 to 4");
  });
});

// ---- view.light ----

const LIGHT_OUT = ["azDeg", "elDeg", "at", "intensity"];
const lightDecl = decl("view.light", "key", LIGHT_OUT);
const aimAt = (azDeg: number, elDeg: number): LightModel => widgetModel(lightDecl, build({ lights: { [lightDecl.id]: { azDeg, elDeg } } })) as LightModel;

describe("view.light", () => {
  it("rests at PIP's key light", () => {
    const m = widgetModel(lightDecl, build()) as LightModel;
    const at = m.outputs["at"] as number[];
    [60, -90, 140].forEach((v, i) => expect(at[i]).toBeCloseTo(v, 9));
    expect(KEY_DIST).toBeCloseTo(Math.sqrt(31300), 9);
    expect(KEY_AIM.azDeg).toBeCloseTo(-56.3099, 3);
    expect(KEY_AIM.elDeg).toBeCloseTo(52.3097, 3);
  });

  it("moves the light around and up at the key's distance", () => {
    const flat = aimAt(0, 0).outputs["at"] as number[];
    [KEY_DIST, 0, 0].forEach((v, i) => expect(flat[i]).toBeCloseTo(v, 9));
    const side = aimAt(90, 30).outputs["at"] as number[];
    [0, KEY_DIST * Math.sqrt(3) / 2, KEY_DIST / 2].forEach((v, i) => expect(side[i]).toBeCloseTo(v, 9));
  });

  it("refuses an elevation under the bed", () => {
    expect(aimAt(0, -10).problem).toBe("light elevation -10 deg is outside 0 to 90");
  });

  it("the viewer's key light goes where the model says, and back", () => {
    const st = createStageScene(createOwner());
    const at = lightAt({ azDeg: 90, elDeg: 30 });
    st.keyLight(at).forEach((v, i) => expect(v).toBeCloseTo(at[i]!, 5));
    expect(st.keyLight(null)).toEqual([60, -90, 140]);
    st.dispose();
  });
});

// ---- view.netlens ----

const NET_OUT = ["net", "nets", "bodies", "ghosted"];
const lensDecl = decl("view.netlens", "nets", NET_OUT);
const lens = (net?: string): NetlensModel =>
  widgetModel(lensDecl, build({ features: part.features, bodies: part.bodies, ...(net === undefined ? {} : { lenses: { [lensDecl.id]: net } }) })) as NetlensModel;

describe("view.netlens", () => {
  it("lights the bodies of one net from the Part IR", () => {
    const k1 = lens("K1");
    expect(k1.outputs["nets"]).toEqual(["GND", "K1"]);
    expect(k1.outputs["bodies"]).toEqual(["conductor.key1", "conductor.key1col"]);
    expect(k1.outputs["ghosted"]).toBe(part.bodies.length - 2);
    expect(lens().outputs["bodies"]).toEqual(["conductor.gnd", "conductor.gnd1col", "conductor.gnd1stub"]);
    expect(netlensLine(k1)).toBe("net K1 lights 2 bodies: conductor.key1, conductor.key1col");
  });

  it("refuses a net with no body and a part with no nets", () => {
    expect(lens("K9").problem).toBe("net K9 has no body in this part; nets: GND, K1");
    expect(widgetModel(lensDecl, build()).problem).toBe("no body of this part carries a net. build the design first.");
  });

  it("the viewer draws the same net lit and ghosts every other body", () => {
    const st = createStageScene(createOwner());
    const palette: Palette = { slot: () => "rgb(240, 240, 230)", net: () => "rgb(166, 226, 46)", focus: "rgb(254, 3, 134)", bed: "rgb(26, 26, 26)" };
    const modes: ViewModes = { explode: false, xray: false, section: null, plate: false, focus: [], lens: "K1" };
    const meshes = Object.fromEntries(part.bodies.map((b) => [b.id, { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], triangles: [0, 1, 2] }]));
    st.draw({ part, meshes }, modes, palette);
    const lit = st.drawnBodies().filter((b) => b.opacity === 1).map((b) => b.id).sort();
    expect(lit).toEqual(lens("K1").outputs["bodies"]);
    expect(st.drawnBodies().filter((b) => b.opacity === XRAY_GHOST)).toHaveLength(part.bodies.length - 2);
    st.dispose();
  });
});

// ---- liveness ----

describe("liveness: every declared output of the three kinds holds a value", () => {
  it("BENCH.widgets() records", () => {
    const recs = widgetRecords([codeDecl, lightDecl, lensDecl], build({ gates: { tumb: gate }, features: part.features, bodies: part.bodies }));
    expect(recs.map((r) => [r.id, r.problem, r.live])).toEqual([
      ["drive.code", null, CODE_OUT],
      ["view.light", null, LIGHT_OUT],
      ["view.netlens", null, NET_OUT],
    ]);
  });
});
