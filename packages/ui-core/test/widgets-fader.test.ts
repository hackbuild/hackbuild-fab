// R1-engine-14 acceptance, the finger pot fixture (the BLOCKS SLIDER's
// mechanism, canonical in GIB): drive.fader and readout.signal over the
// GIB original evaluated in place (packages/archetypes/test/legacy/gib.json,
// variant finger.defaults, written by scripts/gib-legacy.mjs). Its physics
// rows are the resistances the finger-pot archetype writes as gib.Rtrack,
// gib.Rret and gib.Rdead, and its sim rows are the page's own simFinger at
// five finger positions. Each fader output must equal the page's legs and
// volts, circuit dividerV, and counts over circuit fullScaleCounts, to 0.01
// in its unit (computed). The 12 bit ADC is the RP2040's (vendor, RP2040
// datasheet section 4.9); VDD is the catalog pin row's.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { HookupDecl, Metric, WidgetDecl } from "@hackbuild/spec";
import { dividerV, fullScaleCounts } from "@hackbuild/circuit";
import { pinRow } from "../src/drive/drive.js";
import { widgetEntry, widgetModel, widgetRecords, type WidgetBuild } from "../src/widgets/registry.js";
import { FADER_REST, driveFader, faderLine, type FaderModel } from "../src/widgets/fader.js";
import type { SignalModel } from "../src/widgets/signal.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/gib.json"), "utf8")) as {
  variants: Record<string, { phys: Record<string, number>; sim: { x01: number; V: number; Ra: number; Rb: number }[] }>;
};
const V = LEG.variants["finger.defaults"]!;
const TOL = 0.01;
const AT = "finger-pot.0";
const RP = pinRow("rp2040")!;
const BITS = 12;

const metrics: Metric[] = (["Rtrack", "Rret", "Rdead", "Rsrc", "settle"] as const).map((k) => ({
  id: `${AT}.gib.${k}`, value: V.phys[k]!, qualifier: "computed", basis: "inferred", note: `part2.js physics: ${k}`, gate: "informational", group: "readouts",
} as Metric));
const W: HookupDecl = { port: "port.W", mcu: "rp2040", pin: "GP26", read: { model: "adc", bits: BITS, samples: 1, refV: RP.vddV } };
const OUT = ["pos", "raOhm", "rbOhm", "ratio", "swingPct", "pin", "volts", "counts", "qualifier"];
const FADER: WidgetDecl = { id: "slider", kind: "drive.fader", fn: AT, inputs: {}, outputs: OUT, tolerance: TOL, region: "stage.overlay" };
const SIGNAL: WidgetDecl = { id: "wiper", kind: "readout.signal", fn: "port.W", inputs: {}, outputs: ["pin", "level", "volts", "rOhm", "timingUs", "message"], tolerance: TOL, region: "status.extra" };
const build = (pos?: number, over: Partial<WidgetBuild> = {}): WidgetBuild => ({
  features: [], metrics, results: [], hookup: [W], contacts: {}, ...(pos === undefined ? {} : { positions: { [AT]: pos } }), ...over,
});
const near = (a: unknown, b: number, what: string): void => {
  expect(typeof a, what).toBe("number");
  expect(Math.abs((a as number) - b), `${what}: ${String(a)} against ${b}`).toBeLessThanOrEqual(TOL);
};
const counts = (v: number): number => Math.round(Math.min(1, Math.max(0, v / RP.vddV)) * fullScaleCounts(BITS));

describe("drive.fader on the finger pot fixture", () => {
  it("the page reads a 3.3 V divider, the catalog supply of the rp2040, and records five positions", () => {
    expect(RP.vddV).toBe(3.3);
    expect(V.sim.map((s) => s.x01)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(widgetEntry("drive.fader")).toBe(driveFader);
  });

  it.each(V.sim.map((s) => [s.x01, s] as const))("finger at %s: legs and volts equal simFinger, counts equal circuit's full scale (computed)", (x, s) => {
    const m = widgetModel(FADER, build(x)) as FaderModel;
    expect(m.problem).toBeNull();
    expect(m.outputs["pos"]).toBe(x);
    near(m.outputs["raOhm"], s.Ra, "Ra");
    near(m.outputs["rbOhm"], s.Rb, "Rb");
    near(m.outputs["volts"], s.V, "V against the page");
    near(m.outputs["volts"], dividerV(RP.vddV, s.Ra, 0, s.Rb), "V against circuit dividerV");
    expect(m.outputs["counts"]).toBe(counts(s.V));
    expect(m.outputs["pin"]).toBe("GP26");
    expect(m.outputs["qualifier"]).toMatchObject({ volts: "computed", counts: "computed" });
  });

  it("the swing is the page's end to end volts over the supply, CHK-NET-30's element over element and leads (computed)", () => {
    const first = V.sim[0]!, last = V.sim[V.sim.length - 1]!;
    const m = widgetModel(FADER, build()) as FaderModel;
    near(m.outputs["swingPct"], (100 * (first.V - last.V)) / RP.vddV, "swing");
    near(m.outputs["swingPct"], (100 * V.phys["Rtrack"]!) / (V.phys["Rtrack"]! + V.phys["Rdead"]!), "track over track and dead legs");
    expect(m.outputs["pos"]).toBe(FADER_REST);
    expect(faderLine(m)).toMatch(/^finger at 50 percent, A leg [0-9.]+ kohm, B leg [0-9.]+ kohm computed, GP26 reads [0-9.]+ V, [0-9]+ counts computed, swing [0-9.]+ percent$/);
  });

  it("names the gap: no rows, no adc hookup, two adc pins", () => {
    expect(widgetModel({ ...FADER, fn: "finger-pot.1" }, build()).problem).toContain("the build carries no finger-pot.1.gib.Rtrack");
    const bare = widgetModel(FADER, build(0.5, { hookup: [] })) as FaderModel;
    expect(bare.problem).toBe("no hookup entry reads the wiper by adc; volts and counts are unknown");
    expect(bare.outputs["volts"]).toBeNull();
    expect(bare.outputs["raOhm"]).toBe(V.sim[2]!.Ra);
    expect(widgetModel(FADER, build(0.5, { hookup: [W, { ...W, port: "port.X", pin: "GP27" }] })).problem).toBe("hookup reads GP26, GP27 by adc; keep one for the wiper");
  });

  it("BENCH.widgets() carries every declared output, all live", () => {
    const [r] = widgetRecords([FADER], build(0.25));
    expect(r!.problem).toBeNull();
    expect(r!.live).toEqual(OUT);
  });
});

describe("readout.signal on the finger pot wiper", () => {
  it.each(V.sim.map((s) => [s.x01, s] as const))("finger at %s: the wiper pin reads the fader's counts and volts", (x, s) => {
    const sig = widgetModel(SIGNAL, build(x)) as SignalModel;
    const fad = widgetModel(FADER, build(x)) as FaderModel;
    expect(sig.problem).toBeNull();
    expect(sig.outputs["level"]).toBe(fad.outputs["counts"]);
    expect(sig.outputs["level"]).toBe(counts(s.V));
    near(sig.outputs["volts"], s.V, "V");
    near(sig.outputs["rOhm"], V.phys["Rsrc"]!, "source R");
    near(sig.outputs["timingUs"], V.phys["settle"]! * 1e6, "settle us");
    expect(sig.outputs["message"]).toMatch(/^GP26 reads [0-9]+ counts, [0-9.]+ V computed, source [0-9.]+ kohm worst computed, settles in [0-9.]+ us computed$/);
  });

  it("refuses two finger pots, naming them", () => {
    const two = [...metrics, ...metrics.map((m) => ({ ...m, id: m.id.replace(AT, "finger-pot.1") }))];
    expect(widgetModel(SIGNAL, build(0.5, { metrics: two })).problem).toBe("the build carries 2 finger pots (finger-pot.0, finger-pot.1); read each through a drive.fader widget");
  });
});
