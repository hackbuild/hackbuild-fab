// Host simulation of tools/skeleton/flexpair_probe: the unchanged sketch,
// compiled with clang++ against sim/Arduino.h and sim/shim.cpp, reads a node
// model built from the computed electrical model of reference/keys/flex-pair
// preset two (sim/run.mjs). Every figure the simulation produces is computed.
// The compile and the runs need clang++ and the built packages (npx tsc -b);
// without clang++ each run is skipped and reported as not run.
//
// The model and the per-scenario counts are held to sim/expected/, which
// only `node tools/skeleton/flexpair_probe/sim/run.mjs --write-expected`
// rewrites, and the cap bridge and pressed range to a closed form computed
// here from the built geometry and the profile resistivity row.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ASSUMED, EXPECTED, ROOT, buildModel, compileSim, countsOf, flatten, hasClang, modelRecord, runAll, runSim, scenarioSet, scenarioText, score, sketchConstants,
} from "../skeleton/flexpair_probe/sim/run.mjs";

const temps = [];
const temp = (prefix) => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  temps.push(d);
  return d;
};
after(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});
const expected = (f) => JSON.parse(readFileSync(join(EXPECTED, f), "utf8"));

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const CLANG = hasClang();
const skip = CLANG ? false : "clang++ not found: probe simulation not run";

/** The rp2040 row as written in the catalog data (M05-T02), read without the package. */
function rp2040Row() {
  const r = JSON.parse(read("packages/catalog/data/mcu-pins.json")).rows.find((x) => x.id === "rp2040");
  return { vdd: r.vddV, vil: r.vilMaxV, pinPf: r.inputCap.value };
}

let modelP;
const model = () => (modelP ??= buildModel());
let binP;
const bin = () => (binP ??= Promise.resolve(compileSim(temp("hbf-probe-sim-"))));

/** The ctpu bulk resistivity row as written in the profile data, read without the package. */
function ctpuOhmCm() {
  const rows = JSON.parse(read("packages/profile/data/materials.json"));
  const hit = JSON.stringify(rows).match(/"id":"ctpu\.pip\.bulk","direction":"bulk","ohmCm":([\d.]+)/);
  return Number(hit[1]);
}

test("flatten sums overlapping conductances into ordered segments", () => {
  const segs = flatten([{ pin: 2, t0: 0, t1: 10, gGnd: 1 }, { pin: 2, t0: 5, t1: 20, gGnd: 2 }, { pin: 3, t0: 0, t1: 9, gGnd: 7 }], 2);
  assert.deepEqual(segs, [{ t0: 0, t1: 5, gGnd: 1, gFloat: 0 }, { t0: 5, t1: 10, gGnd: 3, gFloat: 0 }, { t0: 10, t1: 20, gGnd: 2, gFloat: 0 }]);
});

test("the model reads its thresholds and pins from the rp2040 row and the sketch", async () => {
  const m = await model();
  const row = rp2040Row();
  const sk = sketchConstants(read("tools/skeleton/flexpair_probe/flexpair_probe.ino"));
  assert.deepEqual(m.keys.map((k) => k.sim.pin), sk.keys.map((k) => k.pin));
  for (const k of m.keys) {
    assert.equal(k.sim.vil, row.vil);
    assert.equal(k.sim.vdd, row.vdd);
    assert.equal(k.capacitance.pinPf.value, row.pinPf);
    assert.equal(k.thresholds.waitUs.value, sk.waitUs);
  }
});

test("the cap bridge and the pressed range equal PIP's closed form over the built geometry", async () => {
  const m = await model();
  const rho = ctpuOhmCm() * 1e-2;
  for (const k of m.keys) {
    const { colGap, colR, capT } = { colGap: k.cap.colGap.value * 1e-3, colR: k.cap.colR.value * 1e-3, capT: k.cap.capT.value * 1e-3 };
    // pip-controller src/model.js:404: spread across the split, plus two through paths under the half columns
    const rsw = (rho * (colGap + colR)) / (capT * 2 * colR) + (2 * rho * capT) / ((Math.PI * colR ** 2) / 2);
    assert.ok(Math.abs(k.cap.rswOhm.value - rsw) <= 1e-9 * rsw, `${k.net} rsw ${k.cap.rswOhm.value} against ${rsw}`);
    assert.equal(k.pressedOhm.lo, (k.pathOhm.value + k.cap.rswOhm.value) * 10);
    assert.equal(k.pressedOhm.hi, (k.pathOhm.value + k.cap.rswOhm.value) * 30);
    // pin, the model.js:418 trace rule and the probe lead
    const want = k.capacitance.pinPf.value + 0.02 * k.capacitance.keyTraceMm.value + 1 + ASSUMED.keyLeadPf.value;
    assert.ok(Math.abs(k.capacitance.totalPf.value - want) < 1e-9, `${k.net} totalPf`);
  }
});

test("the model equals the committed expected/electrical.json", async () => {
  const m = await model();
  assert.deepEqual(JSON.parse(JSON.stringify(modelRecord(m))), expected("electrical.json"));
});

test("a pressed range above the declared contact ceiling is a finding", async () => {
  const m = await model();
  const over = m.keys.filter((k) => k.pressedOhm.lo > k.declaredMaxOhm.value).map((k) => k.net);
  assert.ok(over.length > 0, "the flex-pair pressed range passes contact.maxOhm");
  assert.deepEqual(m.findings.map((f) => f.key), over);
});

test("the travel margin reads the printed gap when the slicer half gives one", async () => {
  const m = await model();
  const printed = await buildModel({ analysis: { e_contact_gap: [{ key: 1, printed_gap_mm: 1.92 }, { key: 2, printed_gap_mm: 1.9 }] } });
  assert.equal(m.mech.printedGap, null);
  assert.equal(m.mech.margin.value, m.mech.travel.value - m.mech.gap.value);
  assert.equal(printed.mech.printedGap.value, 1.92);
  assert.equal(printed.mech.margin.value, printed.mech.travel.value - 1.92);
});

test("every scenario reads as the committed expected/summary.json counts", { skip }, async () => {
  const m = await model();
  const results = runAll(m, temp("hbf-probe-all-"));
  const want = expected("summary.json");
  assert.deepEqual(countsOf(results.runs), want.counts);
  assert.deepEqual(results.worseOfThresholds, want.worseOfThresholds);
  // the gated scenario closes fewer presses than it scripts, and reads every one that closes
  for (const k of Object.values(results.runs["10-travel-gated"].keys)) {
    assert.ok(k.closing < k.scripted);
    assert.equal(k.detected, k.closing);
  }
});

test("a probe-sim run past its time limit is killed and reported", { skip }, async () => {
  const { bin: b } = await bin();
  const m = await model();
  const dir = temp("hbf-probe-limit-");
  const [sc] = scenarioSet(m, { cycles: 8, faultCycles: 4 });
  writeFileSync(join(dir, "s.txt"), scenarioText(sc, m));
  assert.throws(() => runSim(b, join(dir, "s.txt"), 1), /killed after 1 ms/);
});

test("the probe compiles against the shim with no warnings", { skip }, async () => {
  const { warnings } = await bin();
  assert.deepEqual(warnings, []);
});

test("a fixed path crosses at R C ln(VDD / VIL) on the shim clock", { skip }, async () => {
  const { bin: b } = await bin();
  const row = rp2040Row();
  const R = 10e6;
  const C = 8e-12;
  const dir = temp("hbf-probe-rc-");
  const sc = join(dir, "rc.txt");
  // Pressed from 1.5 s on K1, K2 open, no noise, no leakage.
  writeFileSync(sc, [`seed 1`, `vdd ${row.vdd}`, `vil ${row.vil}`, `noise 0`, `pin 2 ${C} 0`, `pin 3 ${C} 0`,
    `seg 2 1500000 3000000 ${1 / R} 0`, `end 3200000`, ""].join("\n"));
  const run = runSim(b, sc);
  const ev = run.lines.map((l) => l.text.match(/^event K1 GP2 press 1 pressed (\d+) us$/)).find(Boolean);
  assert.ok(ev, "K1 press logged");
  const want = R * C * Math.log(row.vdd / row.vil) * 1e6;
  assert.ok(Math.abs(Number(ev[1]) - want) <= 2, `crossing ${ev[1]} us, computed ${want.toFixed(1)} us`);
});

test("nominal session: every press and release is read, interrupts off no longer than the guard", { skip }, async () => {
  const m = await model();
  const { bin: b } = await bin();
  const [sc] = scenarioSet(m, { cycles: 8, faultCycles: 4 });
  const dir = temp("hbf-probe-nominal-");
  writeFileSync(join(dir, "s.txt"), scenarioText(sc, m));
  const run = runSim(b, join(dir, "s.txt"));
  const s = score(sc, run, m.sketch);
  for (const [net, k] of Object.entries(s.keys)) {
    assert.equal(k.detected, k.scripted, `${net} presses read`);
    assert.equal(k.spurious, 0, `${net} spurious presses`);
    assert.equal(k.releasesMatched, k.scripted, `${net} releases read`);
  }
  assert.ok(run.irqOffMaxUs <= m.sketch.guardUs + 5, `interrupts off ${run.irqOffMaxUs} us`);
});

test("split short and a cap that never lands each give their report", { skip }, async () => {
  const m = await model();
  const { bin: b } = await bin();
  const runs = scenarioSet(m, { cycles: 8, faultCycles: 4 });
  const dir = temp("hbf-probe-faults-");
  const go = (name) => {
    const sc = runs.find((r) => r.name === name);
    writeFileSync(join(dir, `${name}.txt`), scenarioText(sc, m));
    const run = runSim(b, join(dir, `${name}.txt`));
    return { run, s: score(sc, run, m.sketch) };
  };
  const short = go("04-fault-split-short-K1");
  assert.ok(short.run.lines.some((l) => /^ {2}K1 reads pressed with nothing touching it/.test(l.text)), "boot names the short on K1");
  assert.ok(!short.run.lines.some((l) => /^ {2}K2 reads pressed/.test(l.text)), "K2 is clean at boot");
  const cap = go("06-fault-cap-short-of-columns-K1");
  assert.equal(cap.s.keys["K1"].detected, 0);
  assert.equal(cap.s.keys["K2"].detected, cap.s.keys["K2"].scripted);
  assert.ok(cap.run.lines.some((l) => /^summary K1 GP2 presses 0 /.test(l.text)), "the summary shows K1 never pressed");
});
