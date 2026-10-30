// R1-engine-14 acceptance, the PIP fixture: drive.touch and readout.signal
// on the committed pip-drive reference (reference/electrical/pip-drive),
// whose circuit.solve golden holds the CHK-NET-29 results the widgets
// read, the circuit chargeReleaseRead records (reads) and the circuit
// floatPoint levels (points) of every PIP pin. Each widget output must
// equal the golden's circuit value, and a fresh chargeReleaseRead call on
// the same inputs, to 0.01 in its unit (computed). The touch pad set is
// PIP's own (packages/circuit/test/fixtures/pip-b137deb-elec.json type
// touch), never read from the code under test.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CheckResult, OperatingPoint, ReadOutputs, WidgetDecl } from "@hackbuild/spec";
import { SETTLE_TAUS, chargeReleaseRead, emitWait } from "@hackbuild/circuit";
import { chase } from "../../../reference/electrical/pip-drive/chase.js";
import { pinRow } from "../src/drive/drive.js";
import { widgetEntry, widgetKinds, widgetModel, widgetRecords, type WidgetBuild } from "../src/widgets/registry.js";
import { TOUCH_FN, driveTouch, touchLine, touchPorts, type TouchModel } from "../src/widgets/touch.js";
import { readoutSignal, type SignalModel } from "../src/widgets/signal.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const json = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;
const solve = json<{ result: { results: CheckResult[]; reads: ReadOutputs[]; points: OperatingPoint[] } }>("reference/electrical/pip-drive/expected/query-solve.json").result;
const ELEC = json<{ keys: { id: string; type: string }[] }>("packages/circuit/test/fixtures/pip-b137deb-elec.json");
const TOUCH = ELEC.keys.filter((k) => k.type === "touch").map((k) => k.id);
const KEYS = ELEC.keys.filter((k) => k.type !== "touch").map((k) => k.id);
const TOL = 0.01;

const hookup = chase.hookup ?? [];
const build = (closed: readonly string[] = []): WidgetBuild => ({ features: [], metrics: [], results: solve.results, hookup, contacts: {}, closed });
const OUT = ["pads", "touched", "pin", "rOhm", "tauUs", "settleUs", "waitUs", "ok", "volts", "level", "qualifier"];
const PADS: WidgetDecl = { id: "touch", kind: "drive.touch", fn: TOUCH_FN, inputs: {}, outputs: OUT, tolerance: TOL, region: "stage.overlay" };
const signal = (port: string): WidgetDecl => ({ id: `sig-${port}`, kind: "readout.signal", fn: port, inputs: {}, outputs: ["pin", "model", "level", "volts", "rOhm", "timingUs", "message", "qualifier"], tolerance: TOL, region: "status.extra" });

const near = (a: unknown, b: number, what: string): void => {
  expect(typeof a, what).toBe("number");
  expect(Math.abs((a as number) - b), `${what}: ${String(a)} against ${b}`).toBeLessThanOrEqual(TOL);
};
const readOf = (net: string): ReadOutputs => solve.reads.find((r) => r.net === net)!;
const pointOf = (net: string): OperatingPoint => solve.points.find((p) => p.net === net)!;
const rec = (m: TouchModel, out: string): Record<string, unknown> => m.outputs[out] as Record<string, unknown>;

describe("drive.touch on the PIP fixture", () => {
  it("is registered, and its pads are PIP's touch pads", () => {
    expect(widgetKinds()).toEqual(expect.arrayContaining(["drive.touch", "drive.fader", "readout.signal"]));
    expect(widgetEntry("drive.touch")).toBe(driveTouch);
    expect(TOUCH.length).toBeGreaterThan(0);
    expect(touchPorts(solve.results)).toEqual(TOUCH.map((id) => `port.${id}`));
    const m = widgetModel(PADS, build()) as TouchModel;
    expect(m.problem).toBeNull();
    expect(m.outputs["pads"]).toEqual(TOUCH.map((id) => `port.${id}`));
  });

  it.each(TOUCH)("%s touched: path, tau, settle, reject and the pin level equal circuit's to 0.01 (computed)", (id) => {
    const port = `port.${id}`;
    const m = widgetModel(PADS, build([port])) as TouchModel;
    const r = readOf(id);
    const pad = m.pads.find((p) => p.port === port)!;
    expect(rec(m, "touched")[port]).toBe(true);
    near(rec(m, "rOhm")[port], r.rOhm, "rOhm");
    near(rec(m, "tauUs")[port], r.tauUs, "tauUs");
    near(rec(m, "settleUs")[port], r.settleUs, "settleUs");
    near(rec(m, "waitUs")[port], r.wait.emit.value, "waitUs");
    near(pad.cPf, r.cPf, "cPf");
    near(pad.rejectOhm, r.rejectOhm, "rejectOhm");
    expect(rec(m, "ok")[port]).toBe(r.ok);
    const pressed = pointOf(id).pressed[0]!;
    near(rec(m, "volts")[port], pressed.volts, "pressed volts");
    expect(rec(m, "level")[port]).toBe(pressed.state);
    // A fresh call of the one charge-release reader on the check's inputs.
    const x = solve.results.find((c) => c.id === "CHK-NET-29" && c.extra?.["port"] === port)!.extra!;
    const h = hookup.find((e) => e.port === port)!;
    if (h.read.model !== "charge-release") throw new Error(`${port} is not charge-release`);
    const fresh = chargeReleaseRead({
      net: id, pathOhm: (x["pathOhm"] as number) + (x["skinOhm"] as number), nodePf: x["cPf"] as number,
      settleTaus: SETTLE_TAUS.touch, emit: emitWait(h.read), leakNa: pinRow("rp2040")!.leakNa,
    });
    near(rec(m, "tauUs")[port], fresh.tauUs, "fresh tauUs");
    near(rec(m, "settleUs")[port], fresh.settleUs, "fresh settleUs");
    near(pad.rejectOhm, fresh.rejectOhm, "fresh rejectOhm");
    expect(m.outputs["qualifier"]).toMatchObject({ [port]: { rOhm: "computed", waitUs: "inferred" } });
    expect(touchLine(pad)).toMatch(/touched: HIGH at [0-9.]+ V computed, path [0-9.]+ Mohm with skin computed, .* wait 1500 us inferred$/);
  });

  it.each(TOUCH)("%s idle: the pin holds the released level circuit gives (computed)", (id) => {
    const port = `port.${id}`;
    const m = widgetModel(PADS, build()) as TouchModel;
    const released = pointOf(id).released[0]!;
    expect(rec(m, "touched")[port]).toBe(false);
    near(rec(m, "volts")[port], released.volts, "released volts");
    expect(rec(m, "level")[port]).toBe(released.state);
    expect(pointOf(id).pressed[0]!.state).not.toBe(released.state);
  });

  it("refuses a wrong fn and a build with no charge-release read, naming why", () => {
    expect(widgetModel({ ...PADS, fn: "contact" }, build()).problem).toBe("widget fn contact is not CHK-NET-29; drive.touch reads the charge-release check");
    expect(widgetModel(PADS, { ...build(), results: [] }).problem).toBe("CHK-NET-29 read no touch pad in this build. build the design first.");
  });

  it("BENCH.widgets() carries every declared output, all live", () => {
    const [r] = widgetRecords([PADS], build([`port.${TOUCH[0]}`]));
    expect(r!.problem).toBeNull();
    expect(r!.live).toEqual(OUT);
  });
});

describe("readout.signal on the PIP fixture", () => {
  it.each(KEYS)("key %s held and released: level and path equal circuit's (computed)", (id) => {
    const port = `port.${id}`;
    const held = widgetModel(signal(port), build([port])) as SignalModel;
    expect(held.problem).toBeNull();
    expect(held.outputs["pin"]).toBe(hookup.find((h) => h.port === port)!.pin);
    expect(held.outputs["level"]).toBe(pointOf(id).pressed[0]!.state);
    near(held.outputs["volts"], pointOf(id).pressed[0]!.volts, "pressed volts");
    near(held.outputs["rOhm"], readOf(id).rOhm, "rOhm");
    near(held.outputs["timingUs"], readOf(id).wait.emit.value, "wait");
    const open = widgetModel(signal(port), build()) as SignalModel;
    expect(open.outputs["level"]).toBe(pointOf(id).released[0]!.state);
    expect(open.outputs["rOhm"]).toBeNull();
  });

  it("a touched pad reads what drive.touch reads for it", () => {
    const port = `port.${TOUCH[0]}`;
    const s = widgetModel(signal(port), build([port])) as SignalModel;
    const t = widgetModel(PADS, build([port])) as TouchModel;
    expect(s.outputs["level"]).toBe(rec(t, "level")[port]);
    expect(s.outputs["volts"]).toBe(rec(t, "volts")[port]);
    expect(s.outputs["rOhm"]).toBe(rec(t, "rOhm")[port]);
    expect(s.outputs["qualifier"]).toEqual({ level: "computed", volts: "computed", rOhm: "computed", timingUs: "inferred" });
  });

  it("refuses a port no hookup entry reads", () => {
    expect(widgetModel(signal("port.NOPE"), build()).problem).toBe("no hookup entry reads port.NOPE; name a hookup port as the widget fn");
    expect(widgetEntry("readout.signal")).toBe(readoutSignal);
  });
});
