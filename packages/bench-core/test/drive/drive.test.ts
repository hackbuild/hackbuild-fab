// M09-T10 acceptance: the drive pad readout of every flex-pair key equals
// the reads the committed goldens hold. Path, capacitance, settle taus,
// wait and its qualifier come from reference/keys/flex-pair/expected/
// report.json (CHK-NET-29), the pressed and released levels from
// expected/query-solve.json (circuit.solve points), and the Part IR from
// packages/bench-core/test/bench/flex-pair.part.json, whose buildHash must be
// the one in expected/build.json. No number below is typed.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { QUALIFIERS, type CheckResult, type Part } from "@hackbuild/spec";
import { floatPoint } from "@hackbuild/circuit";
import { mcuPinRow } from "@hackbuild/catalog";
import { chase } from "../../../../reference/keys/flex-pair/chase.js";
import { bench } from "../../../../reference/keys/flex-pair/bench.js";
import { contact } from "../../../../reference/keys/flex-pair/build.js";
import { chargeReleaseLevels, createPad, padDocks, padModel, pinRow, READ_CHECK, targetOfBody, type PadInput, type PadModel } from "../../src/drive/drive.js";
import { idleLine, padLines, readoutLine } from "../../src/drive/format.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const json = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;

const EXPECTED = "reference/keys/flex-pair/expected";
const report = json<{ findings: CheckResult[] }>(`${EXPECTED}/report.json`);
const solve = json<{ result: { points: { net: string; mcu: string; pathOhm: number; pressed: { state: string }[]; released: { state: string }[] }[] } }>(`${EXPECTED}/query-solve.json`);
const built = json<{ buildHash: string }>(`${EXPECTED}/build.json`);
const part = json<Part>("packages/bench-core/test/bench/flex-pair.part.json");

const decl = bench.views.drive;
if (decl === undefined) throw new Error("flex-pair bench declares no drive pad");

const input = (over: Partial<PadInput> = {}): PadInput => ({
  decl, hookup: chase.hookup ?? [], features: part.features, metrics: part.metrics ?? [], results: report.findings, contact, ...over,
});

const reads = report.findings.filter((r) => r.id === READ_CHECK);

describe("drive: the flex-pair pad against the goldens", () => {
  it("reads the golden build", () => {
    expect(part.buildHash).toBe(built.buildHash);
    expect(reads.length).toBeGreaterThan(0);
  });

  const model = padModel(input());

  it("has one target per key the metrics name, and every golden read lands on one", () => {
    expect(model.problem).toBeNull();
    const keys = new Set((part.metrics ?? []).filter((m) => m.id.startsWith("keys.")).map((m) => m.id.split(".")[1]));
    expect(model.targets.map((t) => t.target)).toEqual([...keys]);
    const readPins = model.targets.flatMap((t) => (t.read === null ? [] : [t.read.pin]));
    expect(readPins.sort()).toEqual(reads.map((r) => String(r.extra?.["pin"])).sort());
  });

  for (const r of reads) {
    const x = r.extra ?? {};
    it(`${String(x["port"])}: the record equals CHK-NET-29 and the solve golden`, () => {
      const t = model.targets.find((m) => m.read?.pin === x["pin"]);
      expect(t?.read).toBeDefined();
      const rec = t?.read;
      if (rec == null) return;
      expect(rec.ohm).toBe(r.measured);
      expect(rec.mcu).toBe(x["mcu"]);
      expect(rec.waitUs).toBe(x["waitUs"]);
      expect(rec.waitQualifier).toBe(x["waitQualifier"]);
      expect(rec.waitSource).toBe(x["waitSource"]);
      expect(rec.calibrated).toBe(false);
      expect(rec.settleUs).toBeCloseTo((x["settleTaus"] as number) * (x["pathOhm"] as number) * (x["cPf"] as number) * 1e-6, 9);
      // The settle is never the read time (D-079): the wait the firmware uses is far longer.
      expect(rec.settleUs).toBeLessThan(rec.waitUs);
      const net = (r.target as { net?: string }).net;
      const point = solve.result.points.find((p) => p.net === net && p.mcu === rec.mcu);
      expect(point, `solve point for ${String(net)}`).toBeDefined();
      expect(rec.logic).toBe(point?.pressed[0]?.state);
      expect(t?.idle).toBe(point?.released[0]?.state);
    });

    it(`${String(x["port"])}: the line carries the golden numbers, each followed by a qualifier`, () => {
      const t = model.targets.find((m) => m.read?.pin === x["pin"]);
      const line = t?.read ? readoutLine(t.read) : "";
      expect(line.startsWith(`${t?.target} ${String(x["pin"])} reads `)).toBe(true);
      expect(line).toContain(`reads ${t?.read?.logic} on ${String(x["mcu"])}`);
      expect(line).toContain(`${((r.measured as number) / 1e6).toFixed(2)} Mohm computed`);
      expect(line).toContain(`wait ${String(x["waitUs"])} us ${String(x["waitQualifier"])} (pip_stick, uncalibrated)`);
      const numbers = [...line.matchAll(/(\d+(?:\.\d+)?) (Mohm|us) (\w+)/g)];
      expect(numbers).toHaveLength(3);
      for (const n of numbers) expect(QUALIFIERS as readonly string[]).toContain(n[3]);
    });
  }

  it("the level equations agree with packages/circuit floatPoint on the catalog row", () => {
    for (const r of reads) {
      const x = r.extra ?? {};
      const mcu = mcuPinRow(String(x["mcu"]));
      const row = pinRow(String(x["mcu"]));
      expect(row).not.toBeNull();
      if (row === null) continue;
      const ohm = x["pathOhm"] as number;
      const cPf = x["cPf"] as number;
      const tauUs = ohm * cPf * 1e-6;
      // The golden wait sits far above tau, where exp underflows; waits near
      // tau are where the decay constant shows in the level.
      for (const waitUs of [x["waitUs"] as number, 0.5 * tauUs, tauUs, 2 * tauUs])
      for (const vRet of [0, mcu.vddV]) {
        const read = { drive: "high" as const, waitUs };
        const idleDroopV = (row.leakNa * 1e-9 * read.waitUs * 1e-6) / (cPf * 1e-12);
        const op = floatPoint({
          net: "n", mcu, pathOhm: ohm, vRetV: vRet, qualifier: "computed",
          read: { model: "charge-release", drive: read.drive, driveUs: 30, waitUs: read.waitUs, waitSource: "default" },
          out: { tauUs, idleDroopV },
        } as Parameters<typeof floatPoint>[0]);
        const ours = chargeReleaseLevels(row, read, ohm, cPf, vRet);
        expect(ours.pressedV).toBeCloseTo(op.pressed[0]?.volts as number, 9);
        expect(ours.releasedV).toBeCloseTo(op.released[0]?.volts as number, 9);
        expect([ours.pressed, ours.released]).toEqual([op.pressed[0]?.state, op.released[0]?.state]);
      }
    }
  });

  it("idle text names each pin and the level it reads after the float", () => {
    const line = idleLine(model);
    expect(line.startsWith("all pins idle")).toBe(true);
    for (const t of model.targets) if (t.read !== null) expect(line).toContain(`${t.read.pin} reads ${t.idle} after the float`);
    expect(padLines(model, [])).toEqual([line]);
  });

  it("a pick on a key's actuator or contact body maps to that key", () => {
    for (const t of model.targets) {
      expect(t.bodies.length).toBeGreaterThan(0);
      for (const b of t.bodies) expect(targetOfBody(model, b)).toBe(t.target);
    }
    expect(targetOfBody(model, "pad")).toBeNull();
  });
});

describe("drive: the held set and what the pad says without a read", () => {
  it("hold, second hold, release one, release all", () => {
    let changes = 0;
    const pad = createPad(() => void (changes += 1));
    pad.drive("1", true);
    pad.drive("2", true);
    pad.drive("1", true);
    expect(pad.held).toEqual(["2", "1"]);
    pad.drive("2", false);
    expect(pad.held).toEqual(["1"]);
    pad.release();
    expect(pad.held).toEqual([]);
    expect(changes).toBe(5);
    expect(() => pad.drive("1", 3)).toThrow("takes a hold");
  });

  it("names the missing contact function, an unknown target source and an empty build", () => {
    expect(padModel(input({ contact: null })).problem).toContain("no contact function");
    expect(padModel(input({ decl: { ...decl, targets: "model.axes" } })).problem).toContain("not a metric group");
    expect(padModel(input({ metrics: [] })).problem).toContain("no drive targets");
  });

  it("a key with no read in this build says so instead of inventing a number", () => {
    const model = padModel(input({ results: [] }));
    const t = model.targets[0];
    expect(t?.read).toBeNull();
    expect(t?.missing).toContain(READ_CHECK);
    expect(padLines(model, [t?.target ?? ""])[0]).toContain("not read");
  });
});

describe("drive: where the pad sits at 390 (D-630)", () => {
  // D-630 typed: at the narrow width a pad over four targets docks below the stage.
  const pad = (n: number): PadModel => ({ targets: Array.from({ length: n }, (_, i) => ({ target: `k${i}`, contacts: [], bodies: [], read: null, idle: null, missing: "m" })), problem: null });
  it("four targets stay over the stage, five dock below it, and only at the narrow width", () => {
    expect(padDocks(pad(4), true)).toBe(false);
    expect(padDocks(pad(5), true)).toBe(true);
    expect(padDocks(pad(10), true)).toBe(true);
    expect(padDocks(pad(10), false)).toBe(false);
    expect(padDocks(null, true)).toBe(false);
  });
});
