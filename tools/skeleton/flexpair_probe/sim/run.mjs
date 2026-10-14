// Virtual print, electrical half, for reference/keys/flex-pair preset two.
//
// 1. Builds the Part IR in process (core buildPart, SOURCE_DATE_EPOCH
//    315532800) and prices each key net with the circuit package (solveKeys,
//    the profile resistivity rows), then adds what the package leaves
//    unpriced: the cap bridge by PIP's flex switch equation
//    (pip-controller src/model.js:404) over the built cap and column
//    geometry, the trace capacitance by PIP's rule (model.js:418), and the
//    pressed contact range PIP measured on its stick (ten to thirty times the
//    solved path, pip-controller docs/electrical.md:152). Every figure leaves
//    here with a qualifier; a simulated result is computed.
// 2. Writes one scenario per run for sim/shim.cpp, compiles the unchanged
//    probe sketch against the shim with clang++, runs it, and scores the
//    serial log against the scripted presses.
// 3. Compares half the built cone height with the contact gap (pip.md 5.1
//    rule of thumb, no force model): the printed gap the slicer half
//    computed when --analysis names its slice.json, else the declared gap.
//
// Every press in the nominal, slow-contact and fast-tap scenarios closes by
// construction, so their counts hold given every press closes; scenario 10
// gates each press on a drawn cone travel against the gap instead. Idle and
// skin scenarios run at VIL and again at VIH, the earliest a Schmitt input
// could read low, and the worse is reported.
//
// Usage: node tools/skeleton/flexpair_probe/sim/run.mjs [outDir] [--analysis <slice.json>] [--write-expected]
// outDir defaults to fab-knowledge/evidence/virtual-print beside the repo.
// --write-expected also rewrites sim/expected/electrical.json and
// summary.json, the figures tools/test/flexpair-probe-sim.test.mjs holds
// the sim to; a person runs it and reads the diff (not with --analysis).

import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

register("../../../../core/dist/resolve-hook.js", import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "..", "..", "..", "..");
export const EXPECTED = path.join(HERE, "expected");
const SKETCH = path.join(ROOT, "tools", "skeleton", "flexpair_probe", "flexpair_probe.ino");
const SHIM = path.join(HERE, "shim.cpp");
const PRESET = "two";
/** The print card epoch, core DEFAULT_EPOCH (1980-01-01). */
const { DEFAULT_EPOCH: EPOCH } = await import(pathToFileURL(path.join(ROOT, "core", "dist", "epoch.js")).href);
/** Longest one probe-sim run may take before it is killed, ms. */
const RUN_LIMIT_MS = 120000;

// ---- electrical figures with no ContactRow yet, read from profile ----
// No ContactRow exists (packages/profile/src/lookup.ts contact()), so the
// contact, skin, trace, lead and noise figures are inferred profile rows
// electrical.* (packages/profile/data/constants.json) until a coupon measures
// the contacts. None is measured on this part. The trace rule and the 5 tau
// reject go through the circuit read model (traceCapRule, nodeCapPf,
// chargeReleaseRead, M05-T05) over the same rows. The draws and timings below
// them shape the scripted scenarios only and stay here.
const { createProfileLookup, loadProfile } = await import("@hackbuild/profile");
const PROFILE = createProfileLookup(loadProfile());
const rowOf = (id) => PROFILE.constant(`electrical.${id}`);
const sourceOf = (id, row) => `profile electrical.${id}: ${row.provenance.source}`;
const one = (id) => { const r = rowOf(id); return { value: r.value, qualifier: r.provenance.tier, source: sourceOf(id, r) }; };
const range = (id) => {
  const lo = rowOf(`${id}.lo`), hi = rowOf(`${id}.hi`);
  return { lo: lo.value, hi: hi.value, qualifier: lo.provenance.tier, source: sourceOf(`${id}.lo`, lo) };
};
export const ASSUMED = {
  contactFactor: range("contactFactor"),
  stickPressedUs: { lo: 113, hi: 2431, qualifier: "inferred",
    source: "pip.md 5.10, pip-controller docs/electrical.md:147: pressed crossings on the PIP stick (measured there, transferred here)" },
  stickIdleUs: { lo: 6500, hi: 17800, never: "2 of 10 pins", qualifier: "inferred",
    source: "pip.md 5.10: idle crossings on the PIP stick (measured there, transferred here)" },
  skinOhm: range("skinOhm"),
  tracePfPerMm: one("tracePfPerMm"),
  tracePfFixed: one("tracePfFixed"),
  smearOhm: one("smearOhm"),
  gndLeadPf: one("gndLeadPf"),
  keyLeadPf: { ...one("keyLeadPf"), lo: rowOf("keyLeadPf.lo").value, hi: rowOf("keyLeadPf.hi").value },
  coneTravelDraw: { lo: 0.4, hi: 0.6, qualifier: "inferred", source: "scenario 10: a press travels 0.4 to 0.6 of the cone height, around the pip.md 5.1 rule of thumb (inferred)" },
  noiseV: one("noiseV"),
  holdMs: { lo: 90, hi: 400, qualifier: "inferred", source: "deliberate test presses, no measurement" },
  gapMs: { lo: 250, hi: 700, qualifier: "inferred", source: "deliberate test presses, no measurement" },
  tapHoldMs: { lo: 30, hi: 120, qualifier: "inferred", source: "fast taps, no measurement" },
  coneTravelFraction: { value: 0.5, qualifier: "inferred", source: "pip.md 5.1 limits: a pressed cone travels about half its height (REPO/docs/switches.md), a rule of thumb" },
};

const q = (value, unit, qualifier, source) => ({ value, unit, qualifier, source });

// ---- seeded randomness ----

function fnv(s) {
  let h = 0x811c9dc5;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return h >>> 0;
}

export function rngOf(name) {
  let a = fnv(name) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const logUniform = (r, lo, hi) => Math.exp(Math.log(lo) + r() * (Math.log(hi) - Math.log(lo)));
const uniform = (r, lo, hi) => lo + r() * (hi - lo);

function pct(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
}

const spread = (xs) => ({ min: Math.min(...xs), p5: pct(xs, 5), median: pct(xs, 50), p95: pct(xs, 95), max: Math.max(...xs) });

// ---- the sketch constants, read from the sketch itself ----

export function sketchConstants(text = readFileSync(SKETCH, "utf8")) {
  const c = (name) => {
    const m = text.match(new RegExp(`^static const \\w+ ${name} = (\\d+);`, "m"));
    if (!m) throw new Error(`probe sketch declares no ${name}`);
    return Number(m[1]);
  };
  const keys = [...text.matchAll(/^\s*\{ "(K\d+)", (\d+), "(port\.key\d+)" \},/gm)].map((m) => ({ net: m[1], pin: Number(m[2]), port: m[3] }));
  return { chargeUs: c("CHARGE_US"), waitUs: c("WAIT_US"), limitUs: c("LIMIT_US"), guardUs: c("GUARD_US"), agree: c("AGREE"), scanGapMs: c("SCAN_GAP_MS"), keys };
}

// ---- step 1 and step 3: the built part and its electrical model ----

/**
 * The electrical model of the built part. analysis, when given, is the
 * slice.json of tools/py/gcode/analyze.py for the same build; its printed
 * contact gap then replaces the declared gap in the travel margin.
 */
export async function buildModel({ analysis } = {}) {
  const saved = process.env["SOURCE_DATE_EPOCH"];
  process.env["SOURCE_DATE_EPOCH"] = String(EPOCH);
  try {
    const core = await import(path.join(ROOT, "core", "dist", "commands", "build.js"));
    const { solveKeys, polylineLength, flexCapBridgeOhm, rcCrossingUs, traceCapRule, nodeCapPf, chargeReleaseRead } = await import("@hackbuild/circuit");
    const { createProfileLookup } = await import("@hackbuild/profile");
    const design = await core.loadDesign("reference/keys/flex-pair", ROOT);
    const built = await core.buildPart(design, core.resolveParams(design.chase, undefined, PRESET));
    const profile = createProfileLookup(design.ws.tables);
    const hookup = design.chase.hookup ?? [];
    const { points } = solveKeys({ part: built.draft, hookup, profile, mcu: design.ws.mcu });
    const rhoT = profile.resistivity("ctpu", "bulk", "printed");
    const sk = sketchConstants();
    const keysAt = built.values["keys"];
    const draft = built.draft;
    const keys = points.map((pt, i) => {
      const n = i + 1;
      const mcu = design.ws.mcu(pt.mcu);
      const kx = keysAt[i].x;
      const col = draft.features.find((f) => f.id === `conductor.key${n}col`);
      const contact = draft.features.find((f) => f.id === `contact.key${n}`);
      const cap = draft.bodies.find((b) => b.id === `cap${n}`);
      if (!col || !contact || !cap) throw new Error(`key ${n}: built part lacks its column, contact or cap`);
      const xs = col.region.path.map((p) => p[0] - kx);
      const colR = Math.max(...col.region.path.map((p) => Math.hypot(p[0] - kx, p[1])));
      const colGap = 2 * Math.min(...xs.map(Math.abs));
      const capT = cap.base.z[1] - cap.base.z[0];
      // PIP flex switch (model.js:404): cap spread across the split plus two cap through paths.
      const rswOhm = flexCapBridgeOhm({ ohmCm: rhoT.ohmCm, colGapMm: colGap, colRMm: colR, capTMm: capT });
      const keyLenMm = pt.legs.filter((l) => l.net === pt.net && l.direction === "along").reduce((s, l) => s + l.lengthMm, 0);
      const gndLenMm = draft.features.filter((f) => f.kind === "conductor" && f.net === "GND" && f.region.centreline)
        .reduce((s, f) => s + polylineLength(f.region.centreline), 0);
      const pinPf = mcu.inputCap.value;
      // PIP's trace rule (model.js:418) through the read model, the probe lead on top.
      const rule = traceCapRule(profile);
      const tracePf = rule.perMmPf.value * keyLenMm + rule.fixedPf.value;
      const cPf = nodeCapPf(pinPf, keyLenMm, { perMmPf: rule.perMmPf.value, fixedPf: rule.fixedPf.value }) + ASSUMED.keyLeadPf.value;
      const C = cPf * 1e-12;
      const solved = pt.pathOhm.value + rswOhm;
      const lnVil = Math.log(mcu.vddV / mcu.vilMaxV);
      // The pin is driven high and a press returns it to GND; C is pin, trace and lead together.
      const crossUs = (R, vThreshold = mcu.vilMaxV) => rcCrossingUs({ ohm: R, capPf: cPf, vDrive: mcu.vddV, vRet: 0, vThreshold });

      const r = rngOf(`model ${pt.net}`);
      const N = 10000;
      const pressedA = Array.from({ length: N }, () => crossUs(solved * logUniform(r, ASSUMED.contactFactor.lo, ASSUMED.contactFactor.hi)));
      const pressedB = Array.from({ length: N }, () => logUniform(r, ASSUMED.stickPressedUs.lo, ASSUMED.stickPressedUs.hi));
      const skin = Array.from({ length: N }, () => crossUs(logUniform(r, ASSUMED.skinOhm.lo, ASSUMED.skinOhm.hi)));
      const leakA = mcu.leakage.value * 1e-9;
      const dryUs = (C * (mcu.vddV - mcu.vilMaxV)) / leakA * 1e6;
      return {
        net: pt.net, port: pt.port, pin: pt.pin,
        legs: pt.legs.map((l) => ({ conductor: l.conductor, direction: l.direction, lengthMm: l.lengthMm, ohm: l.ohm, row: l.row, tier: l.tier })),
        unpricedContacts: pt.unpricedContacts,
        contactAt: pt.contacts.map((c) => c.at),
        pathOhm: q(pt.pathOhm.value, "ohm", "computed", "solveKeys over profile rows cpla.pip.along and cpla.pip.through (inferred rows)"),
        cap: {
          colR: q(colR, "mm", "computed", `built conductor.key${n}col`), colGap: q(colGap, "mm", "computed", `built conductor.key${n}col`),
          capT: q(capT, "mm", "computed", `built cap${n}`), rhoT: q(rhoT.ohmCm, "ohm cm", rhoT.provenance.tier, rhoT.id),
          rswOhm: q(rswOhm, "ohm", "computed", "pip-controller src/model.js:404 over the built geometry (inferred row)"),
        },
        solvedOhm: q(solved, "ohm", "computed", "pathOhm plus cap bridge, no contact interfaces"),
        pressedOhm: { lo: solved * ASSUMED.contactFactor.lo, hi: solved * ASSUMED.contactFactor.hi, unit: "ohm", qualifier: "computed", source: "solvedOhm x contactFactor (inferred)" },
        declaredMaxOhm: q(contact.maxOhm, "ohm", "computed", `contact.key${n}.maxOhm in the built part`),
        capacitance: {
          pinPf: q(pinPf, "pF", mcu.inputCap.qualifier, mcu.inputCap.source),
          keyTraceMm: q(keyLenMm, "mm", "computed", "key net along legs"),
          tracePf: q(tracePf, "pF", "inferred", ASSUMED.tracePfPerMm.source),
          keyLeadPf: q(ASSUMED.keyLeadPf.value, "pF", "inferred", ASSUMED.keyLeadPf.source),
          totalPf: q(cPf, "pF", "inferred", "pin plus trace plus the probe lead to the pad clip"),
          gndNetMm: q(gndLenMm, "mm", "computed", "GND net centrelines"),
        },
        thresholds: {
          vddV: q(mcu.vddV, "V", "vendor", mcu.source), vilMaxV: q(mcu.vilMaxV, "V", "vendor", mcu.source), vihMinV: q(mcu.vihMinV, "V", "vendor", mcu.source),
          waitUs: q(sk.waitUs, "us", "inferred", "flexpair_probe.ino WAIT_US"), limitUs: q(sk.limitUs, "us", "inferred", "flexpair_probe.ino LIMIT_US"),
          rejectByCrossingOhm: q((sk.waitUs * 1e-6) / (C * lnVil), "ohm", "computed", "largest path that crosses VIL inside WAIT_US at totalPf"),
          rejectBy5TauOhm: q(chargeReleaseRead({ net: pt.net, pathOhm: solved, nodePf: cPf, settleTaus: 5, emit: { value: sk.waitUs, unit: "us", qualifier: "inferred", basis: "inferred" }, leakNa: mcu.leakage.value }).rejectOhm, "ohm", "computed", "WAIT_US / (5 C), the sketch header's figure, at totalPf"),
        },
        crossingUs: {
          solved: q(crossUs(solved), "us", "computed", "solvedOhm at totalPf to VIL"),
          solvedAtVih: q(crossUs(solved, mcu.vihMinV), "us", "computed", "solvedOhm at totalPf to VIH, the earliest a Schmitt input could fall"),
          pressedFactor: { ...spread(pressedA), unit: "us", qualifier: "computed", source: "pressedOhm log uniform, 10000 draws, at totalPf to VIL" },
          pressedStick: { ...spread(pressedB), unit: "us", qualifier: "inferred", source: ASSUMED.stickPressedUs.source },
          releasedDry: q(dryUs, "us", "computed", `pin leakage ${mcu.leakage.value} nA (${mcu.leakage.qualifier}) at totalPf, VDD to VIL`),
          releasedStick: { lo: ASSUMED.stickIdleUs.lo, hi: ASSUMED.stickIdleUs.hi, never: ASSUMED.stickIdleUs.never, unit: "us", qualifier: "inferred", source: ASSUMED.stickIdleUs.source },
          releasedSkin: { ...spread(skin), unit: "us", qualifier: "computed", source: "skin 1 to 20 Mohm log uniform key to GND, 10000 draws, at totalPf to VIL" },
        },
        sim: { pin: Number(String(pt.pin).replace(/^GP/, "")), C, solved, leakA, vdd: mcu.vddV, vil: mcu.vilMaxV, vih: mcu.vihMinV, lnVil },
      };
    });
    const k0 = draft.features.find((f) => f.id === "contact.key1");
    const coneH = k0.coneH;
    const gap = k0.gap;
    const travel = coneH * ASSUMED.coneTravelFraction.value;
    const printedRows = (analysis?.e_contact_gap ?? []).filter((g) => typeof g.printed_gap_mm === "number");
    const printedGap = printedRows.length > 0 ? Math.max(...printedRows.map((g) => g.printed_gap_mm)) : null;
    const usedGap = printedGap ?? gap;
    const mech = {
      coneH: q(coneH, "mm", "computed", "contact.key1.coneH in the built part"),
      gap: q(gap, "mm", "computed", "contact.key1.gap in the built part (declared)"),
      printedGap: printedGap === null ? null : q(printedGap, "mm", "computed", "the widest printed contact gap of any key, tools/py/gcode/analyze.py e_contact_gap (a simulated print)"),
      travel: q(travel, "mm", "computed", `${ASSUMED.coneTravelFraction.value} x coneH, ${ASSUMED.coneTravelFraction.source}`),
      margin: q(travel - usedGap, "mm", "computed", printedGap === null ? "travel minus the declared gap; no slicer analysis given, so the printed gap is not known here" : "travel minus the printed gap"),
      gapPct: q((100 * gap) / coneH, "percent", "computed", "gap / coneH; PIP holds 35 to 50 (pip.md 5.1)"),
      sameForKey2: draft.features.find((f) => f.id === "contact.key2").coneH === coneH && draft.features.find((f) => f.id === "contact.key2").gap === gap,
      closure: "every press of scenarios 01 to 03 closes by construction: their counts hold given every press closes; scenario 10 gates each press on a drawn travel against the gap",
    };
    // the sim's own pressed range against the contact ceiling the design declares
    const findings = keys.filter((k) => k.pressedOhm.lo > k.declaredMaxOhm.value).map((k) => ({
      key: k.net, kind: "pressed range over the declared contact.maxOhm",
      pressedOhm: { lo: k.pressedOhm.lo, hi: k.pressedOhm.hi }, declaredMaxOhm: k.declaredMaxOhm.value, rejectByCrossingOhm: k.thresholds.rejectByCrossingOhm.value,
      note: "the pressed path assumed here (solvedOhm x contactFactor, inferred) is above the ceiling the design declares; presses still read because WAIT_US accepts paths up to rejectByCrossingOhm",
      qualifier: "computed",
    }));
    // A press registers after AGREE scans that read it. One scan floats every
    // key: the others for up to LIMIT_US when idle, the pressed one under WAIT_US.
    const scanWorstUs = (keys.length - 1) * sk.limitUs + sk.waitUs + sk.scanGapMs * 1000;
    const timing = {
      scanWorst: q(scanWorstUs / 1000, "ms", "computed", "(keys - 1) x LIMIT_US + WAIT_US + SCAN_GAP_MS, flexpair_probe.ino"),
      holdAlwaysRead: q((sk.agree * scanWorstUs) / 1000, "ms", "computed", "AGREE x scanWorst: a hold this long always registers"),
    };
    return { preset: PRESET, epoch: EPOCH, sketch: sk, keys, mech, timing, findings, assumed: ASSUMED };
  } finally {
    if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"];
    else process.env["SOURCE_DATE_EPOCH"] = saved;
  }
}

// ---- step 2: scenarios ----

const MS = 1000;
const S = 1000 * MS;

/**
 * One scripted session. Each key gets `cycles` press and release cycles in
 * turn, K1 first. pressOf(rng, key, i) gives the press conductances or null
 * for a press that never closes. faults add background conductances.
 */
function session(model, name, o) {
  const r = rngOf(name);
  const contribs = [];
  const presses = Object.fromEntries(model.keys.map((k) => [k.net, []]));
  let t = o.startUs ?? 2 * S;
  const hold = o.hold ?? ASSUMED.holdMs;
  const gap = o.gap ?? ASSUMED.gapMs;
  for (const k of model.keys) {
    for (let i = 0; i < o.cycles; i++) {
      t += uniform(r, gap.lo, gap.hi) * MS;
      const t1 = t + logUniform(r, hold.lo, hold.hi) * MS;
      const g = o.pressOf(r, k, i);
      if (g) contribs.push({ pin: k.sim.pin, t0: t, t1, ...g });
      presses[k.net].push({ t0: t, t1, ohm: g ? 1 / (g.gGnd || g.gFloat) : null });
      t = t1;
    }
    t += 1 * S;
  }
  for (const f of o.faults ?? []) contribs.push({ ...f, t1: f.t1 ?? 1e15 });
  const inputs = [{ t: t + 500 * MS, ch: "s" }, ...(o.inputs ?? [])];
  const end = Math.max(...inputs.map((x) => x.t)) + 2 * S;
  return { name, contribs, presses, inputs, end, pins: o.pins, float: o.float, notes: o.notes ?? [] };
}

/** Flatten overlapping conductance contributions into sorted, non-overlapping segments per pin. */
export function flatten(contribs, pin) {
  const mine = contribs.filter((c) => c.pin === pin);
  const cuts = [...new Set(mine.flatMap((c) => [c.t0, c.t1]))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i], b = cuts[i + 1];
    const live = mine.filter((c) => c.t0 <= a && c.t1 >= b);
    const gGnd = live.reduce((s, c) => s + (c.gGnd ?? 0), 0);
    const gFloat = live.reduce((s, c) => s + (c.gFloat ?? 0), 0);
    if (gGnd > 0 || gFloat > 0) out.push({ t0: a, t1: b, gGnd, gFloat });
  }
  return out;
}

export function scenarioText(sc, model) {
  const k0 = model.keys[0].sim;
  // the input reads low below this: VIL max, or VIH min for the -vih runs (the earliest a Schmitt input could fall)
  const vlow = sc.threshold === "vih" ? k0.vih : k0.vil;
  const lines = [
    `# ${sc.name}: written by tools/skeleton/flexpair_probe/sim/run.mjs; every figure is computed or inferred, none measured`,
    `seed ${fnv(sc.base ?? sc.name)}`, `vdd ${k0.vdd}`, `vil ${vlow}`, `noise ${ASSUMED.noiseV.value}`,
  ];
  for (const p of sc.pins) lines.push(`pin ${p.pin} ${p.C.toExponential(6)} ${p.leak.toExponential(6)}`);
  if (sc.float) lines.push(`float ${sc.float.C.toExponential(6)} ${sc.float.leak.toExponential(6)}`);
  for (const p of sc.pins) {
    for (const s of flatten(sc.contribs, p.pin)) lines.push(`seg ${p.pin} ${s.t0.toFixed(3)} ${s.t1.toFixed(3)} ${s.gGnd.toExponential(6)} ${s.gFloat.toExponential(6)}`);
  }
  for (const i of [...sc.inputs].sort((a, b) => a.t - b.t)) lines.push(`input ${i.t.toFixed(0)} ${i.ch}`);
  lines.push(`end ${sc.end.toFixed(0)}`);
  return `${lines.join("\n")}\n`;
}

export function scenarioSet(model, { cycles = 50, faultCycles = 10 } = {}) {
  const [K1, K2] = model.keys;
  const factor = (r, k) => ({ gGnd: 1 / (k.sim.solved * logUniform(r, ASSUMED.contactFactor.lo, ASSUMED.contactFactor.hi)) });
  // K1 leaks at the rp2040 figure, K2 so its idle crossing sits mid PIP's measured idle population.
  const k2IdleUs = (ASSUMED.stickIdleUs.lo + ASSUMED.stickIdleUs.hi) / 2;
  const pinsNominal = [
    { pin: K1.sim.pin, C: K1.sim.C, leak: K1.sim.leakA },
    { pin: K2.sim.pin, C: K2.sim.C, leak: (K2.sim.C * (K2.sim.vdd - K2.sim.vil)) / (k2IdleUs * 1e-6) },
  ];
  const base = { pins: pinsNominal };
  const runs = [
    session(model, "01-nominal", { ...base, cycles, pressOf: factor,
      notes: ["pressed path solvedOhm x 10 to 30 (inferred)", `K1 idle leak ${K1.sim.leakA * 1e9} nA, K2 idle crossing about ${k2IdleUs} us`] }),
    session(model, "02-slow-contact", { ...base, cycles,
      pressOf: (r, k) => ({ gGnd: k.sim.lnVil * k.sim.C / (logUniform(r, ASSUMED.stickPressedUs.lo, ASSUMED.stickPressedUs.hi) * 1e-6) }),
      notes: ["pressed crossing drawn from the PIP stick population 113 to 2431 us (inferred)"] }),
    session(model, "03-fast-taps", { ...base, cycles, pressOf: factor, hold: ASSUMED.tapHoldMs, gap: { lo: 150, hi: 400 },
      notes: ["holds 30 to 120 ms (inferred), gaps 150 to 400 ms"] }),
  ];
  const fault = (name, o) => session(model, name, { ...base, cycles: faultCycles, pressOf: factor, ...o });
  // A smear across K1's split: the K1 net reaches GND through its own path plus the smear.
  runs.push(fault("04-fault-split-short-K1", {
    faults: [{ pin: K1.sim.pin, t0: 0, gGnd: 1 / (K1.sim.solved + ASSUMED.smearOhm.value) }],
    notes: [`K1 split bridged by ${ASSUMED.smearOhm.value} ohm (inferred) from power on`],
  }));
  // K2's clip off its pad: the pin sees only its own capacitance and leakage, and presses reach nothing.
  runs.push(fault("05-fault-lead-open-K2", {
    pins: [pinsNominal[0], { pin: K2.sim.pin, C: model.keys[1].capacitance.pinPf.value * 1e-12, leak: K2.sim.leakA }],
    pressOf: (r, k) => (k.net === "K2" ? null : factor(r, k)),
    notes: ["K2 lead open from power on: pin capacitance only, rp2040 leakage"],
  }));
  runs.push(fault("06-fault-cap-short-of-columns-K1", {
    pressOf: (r, k) => (k.net === "K1" ? null : factor(r, k)),
    notes: ["K1 cap never lands on the columns: every K1 press is open"],
  }));
  // GND clip off: a press joins the key node to the floating GND net and the jumper left on it.
  const gndPf = ASSUMED.tracePfPerMm.value * K1.capacitance.gndNetMm.value + ASSUMED.tracePfFixed.value + ASSUMED.gndLeadPf.value;
  runs.push(fault("07-fault-gnd-open", {
    pressOf: (r, k) => ({ gFloat: factor(r, k).gGnd }),
    float: { C: gndPf * 1e-12, leak: 0 },
    notes: [`GND open from power on, floating GND net ${gndPf.toFixed(2)} pF (inferred: printed net plus a ${ASSUMED.gndLeadPf.value} pF jumper)`],
  }));
  // Skin from the K1 lead to the GND lead at the low end of PIP's skin range, at power on (hands on during the baseline) for 3 s.
  runs.push(fault("08-fault-skin-1M-K1-at-boot", {
    faults: [{ pin: K1.sim.pin, t0: 0, t1: 3 * S, gGnd: 1 / ASSUMED.skinOhm.lo }],
    notes: ["1 Mohm skin K1 to GND from power on to 3 s (inferred)"],
  }));
  // The same skin landing mid session for 3 s, then a fresh baseline with hands off.
  const mid = fault("09-fault-skin-1M-K1-mid", { notes: ["1 Mohm skin K1 to GND for 3 s mid session, then b with hands off"] });
  const tMid = mid.presses["K1"][Math.floor(faultCycles / 2)].t1 + 200 * MS;
  const midRun = fault("09-fault-skin-1M-K1-mid", {
    faults: [{ pin: K1.sim.pin, t0: tMid, t1: tMid + 3 * S, gGnd: 1 / ASSUMED.skinOhm.lo }],
    inputs: [{ t: mid.end + 1 * S, ch: "b" }, { t: mid.end + 3 * S, ch: "s" }],
    notes: mid.notes,
  });
  midRun.skinAt = [tMid, tMid + 3 * S];
  runs.push(midRun);
  // A press closes only when its drawn travel reaches the gap: the printed gap when the model has one.
  const gapMm = model.mech.printedGap?.value ?? model.mech.gap.value;
  const coneH = model.mech.coneH.value;
  runs.push(session(model, "10-travel-gated", { ...base, cycles,
    pressOf: (r, k, i) => (coneH * uniform(r, ASSUMED.coneTravelDraw.lo, ASSUMED.coneTravelDraw.hi) >= gapMm ? factor(r, k, i) : null),
    notes: [`a press closes when a travel of ${ASSUMED.coneTravelDraw.lo} to ${ASSUMED.coneTravelDraw.hi} x coneH ${coneH} mm (inferred) reaches the ${model.mech.printedGap ? "printed" : "declared"} gap ${gapMm} mm`] }));
  // Idle leak and skin read again at VIH, the earliest a Schmitt input could read low.
  for (const name of ["01-nominal", "08-fault-skin-1M-K1-at-boot", "09-fault-skin-1M-K1-mid"]) {
    const sc = runs.find((x) => x.name === name);
    runs.push({ ...sc, name: `${name}-vih`, base: name, threshold: "vih", notes: [...sc.notes, "input reads low below VIH min, the earliest a Schmitt input could fall"] });
  }
  return runs;
}

/** Per base scenario run at both thresholds, the worse count per key: fewest presses read, most spurious. */
export function worseOfThresholds(runs) {
  const out = {};
  for (const [name, r] of Object.entries(runs)) {
    const vih = runs[`${name}-vih`];
    if (vih === undefined) continue;
    out[name] = Object.fromEntries(Object.entries(r.keys).map(([net, k]) => [net, {
      detected: Math.min(k.detected, vih.keys[net].detected), spurious: Math.max(k.spurious, vih.keys[net].spurious), scripted: k.scripted,
    }]));
  }
  return out;
}

/** The counts the committed expected/summary.json holds, per scenario and key. */
export function countsOf(runs) {
  return Object.fromEntries(Object.entries(runs).map(([name, r]) => [name, Object.fromEntries(Object.entries(r.keys).map(([net, k]) => [net, {
    scripted: k.scripted, closing: k.closing, detected: k.detected, spurious: k.spurious, releasesMatched: k.releasesMatched,
  }]))]));
}

/** The model as electrical.json holds it: everything but the sim handles. */
export function modelRecord(model) {
  return { ...model, keys: model.keys.map(({ sim, ...k }) => k) };
}

// ---- compile, run, score ----

export function hasClang() {
  return spawnSync("clang++", ["--version"], { encoding: "utf8" }).status === 0;
}

export function compileSim(binDir) {
  mkdirSync(binDir, { recursive: true });
  const bin = path.join(binDir, "probe-sim");
  const res = spawnSync("clang++", ["-std=c++17", "-O2", "-Wall", "-Wextra", "-I", HERE, "-x", "c++", SKETCH, "-x", "c++", SHIM, "-o", bin], { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`clang++ failed:\n${res.stderr}`);
  return { bin, warnings: res.stderr.split("\n").filter((l) => /warning:/i.test(l)) };
}

export function runSim(bin, scenarioPath, limitMs = RUN_LIMIT_MS) {
  const res = spawnSync(bin, [scenarioPath], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: limitMs, killSignal: "SIGKILL" });
  if (res.error) throw new Error(`probe-sim on ${scenarioPath}: ${res.error.code === "ETIMEDOUT" ? `killed after ${limitMs} ms` : res.error.message}`);
  if (res.status !== 0) throw new Error(`probe-sim exited ${res.status ?? res.signal}: ${res.stderr}`);
  const lines = res.stdout.split("\n").filter((l) => l.length > 0).map((l) => {
    const tab = l.indexOf("\t");
    return { t: Number(l.slice(0, tab)), text: l.slice(tab + 1) };
  });
  const irq = res.stderr.match(/interrupts-off max ([\d.]+) us/);
  return { lines, irqOffMaxUs: irq ? Number(irq[1]) : null };
}

const EVENT = /^event (K\d+) GP(\d+) press (\d+) (?:pressed (\d+) us|released none in (\d+) us|released (\d+) us)$/;

/** Match each logged event to a scripted press or release. */
export function score(sc, run, sk) {
  const tol = 2 * (2 * sk.limitUs + sk.scanGapMs * 1000) + 1000;
  const out = {};
  for (const [net, presses] of Object.entries(sc.presses)) {
    const ev = run.lines.map((l) => ({ t: l.t, m: l.text.match(EVENT) })).filter((e) => e.m && e.m[1] === net);
    const pressedEv = ev.filter((e) => e.m[4] !== undefined);
    const releasedEv = ev.filter((e) => e.m[4] === undefined);
    const used = new Set();
    const latP = [];
    let detected = 0;
    const closes = presses.filter((p) => p.ohm !== null);
    for (const p of presses) {
      const e = pressedEv.find((x) => !used.has(x) && x.t >= p.t0 && x.t <= p.t1 + tol);
      if (e) { used.add(e); detected++; latP.push(e.t - p.t0); }
    }
    const spurious = pressedEv.filter((x) => !used.has(x)).length;
    // A release belongs to the press whose pressed event comes before it.
    const usedR = new Set();
    const latR = [];
    for (const p of presses) {
      const pe = [...used].find((x) => x.t >= p.t0 && x.t <= p.t1 + tol);
      if (!pe) continue;
      const e = releasedEv.find((x) => !usedR.has(x) && x.t > pe.t);
      if (e) { usedR.add(e); latR.push(e.t - p.t1); }
    }
    const missedHolds = presses.filter((p) => !pressedEv.some((x) => used.has(x) && x.t >= p.t0 && x.t <= p.t1 + tol)).map((p) => (p.t1 - p.t0) / 1000);
    const heldMs = presses.map((p) => (p.t1 - p.t0) / 1000);
    const pressedUs = pressedEv.map((e) => Number(e.m[4]));
    const releasedUs = releasedEv.map((e) => (e.m[5] !== undefined ? null : Number(e.m[6])));
    out[net] = {
      scripted: presses.length, closing: closes.length, detected, spurious,
      releasesLogged: releasedEv.length, releasesMatched: usedR.size, releasesUnmatched: releasedEv.length - usedR.size, releasedNever: releasedUs.filter((x) => x === null).length,
      pressLatencyMs: latP.length ? spread(latP.map((x) => x / 1000)) : null,
      releaseLatencyMs: latR.length ? spread(latR.map((x) => x / 1000)) : null,
      loggedPressedUs: pressedUs.length ? spread(pressedUs) : null,
      loggedReleasedUs: releasedUs.filter((x) => x !== null).length ? spread(releasedUs.filter((x) => x !== null)) : null,
      holdMs: spread(heldMs),
      missedHoldMs: missedHolds,
    };
  }
  const notable = run.lines.filter((l) => /^(baseline|  |summary)/.test(l.text)).map((l) => `${(l.t / 1000).toFixed(1)} ms  ${l.text}`);
  return { keys: out, notable, irqOffMaxUs: run.irqOffMaxUs };
}

// ---- main ----

function parseArgs(argv) {
  const o = { writeExpected: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--analysis") o.analysis = argv[++i];
    else if (a === "--write-expected") o.writeExpected = true;
    else if (o.outDir === undefined) o.outDir = a;
    else throw new Error(`unexpected argument ${a}`);
  }
  if (o.writeExpected && o.analysis !== undefined) throw new Error("--write-expected writes the figures of the build alone; drop --analysis");
  return o;
}

/** Compiles once, runs every scenario, writes the probe logs; the bin folder is removed whatever happens. */
export function runAll(model, probeDir) {
  const binDir = mkdtempSync(path.join(tmpdir(), "hbf-probe-sim-"));
  try {
    const { bin, warnings } = compileSim(binDir);
    const results = { compileWarnings: warnings, runs: {} };
    for (const sc of scenarioSet(model)) {
      const scPath = path.join(probeDir, `${sc.name}.scenario.txt`);
      writeFileSync(scPath, scenarioText(sc, model));
      const run = runSim(bin, scPath);
      writeFileSync(path.join(probeDir, `${sc.name}.log`), `${run.lines.map((l) => l.text).join("\n")}\n`);
      writeFileSync(path.join(probeDir, `${sc.name}.timed.log`), `${run.lines.map((l) => `${l.t}\t${l.text}`).join("\n")}\n`);
      writeFileSync(path.join(probeDir, `${sc.name}.truth.json`), `${JSON.stringify({ presses: sc.presses, skinAt: sc.skinAt ?? null, notes: sc.notes }, null, 1)}\n`);
      results.runs[sc.name] = { notes: sc.notes, ...score(sc, run, model.sketch) };
    }
    results.worseOfThresholds = worseOfThresholds(results.runs);
    return results;
  } finally {
    rmSync(binDir, { recursive: true, force: true });
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(o.outDir ?? path.join(ROOT, "..", "fab-knowledge", "evidence", "virtual-print"));
  const probeDir = path.join(outDir, "probe");
  mkdirSync(probeDir, { recursive: true });
  const analysis = o.analysis === undefined ? undefined : JSON.parse(readFileSync(o.analysis, "utf8"));
  const model = await buildModel({ analysis });
  writeFileSync(path.join(outDir, "electrical.json"), `${JSON.stringify(modelRecord(model), null, 2)}\n`);
  for (const f of model.findings) process.stdout.write(`finding ${f.key}: pressed ${f.pressedOhm.lo.toFixed(0)} to ${f.pressedOhm.hi.toFixed(0)} ohm against contact.maxOhm ${f.declaredMaxOhm} (computed)\n`);
  if (!hasClang()) {
    process.stdout.write("clang++ not found: the probe simulation did not run\n");
    return;
  }
  const results = runAll(model, probeDir);
  for (const [name, r] of Object.entries(results.runs)) {
    process.stdout.write(`${name}: ${Object.entries(r.keys).map(([n, v]) => `${n} ${v.detected} of ${v.scripted} (closing ${v.closing}), spurious ${v.spurious}`).join("; ")}; irq off max ${r.irqOffMaxUs} us\n`);
  }
  for (const [name, w] of Object.entries(results.worseOfThresholds)) {
    process.stdout.write(`${name}, worse of VIL and VIH: ${Object.entries(w).map(([n, v]) => `${n} ${v.detected} of ${v.scripted}, spurious ${v.spurious}`).join("; ")}\n`);
  }
  writeFileSync(path.join(probeDir, "summary.json"), `${JSON.stringify(results, null, 2)}\n`);
  if (o.writeExpected) {
    mkdirSync(EXPECTED, { recursive: true });
    writeFileSync(path.join(EXPECTED, "electrical.json"), `${JSON.stringify(modelRecord(model), null, 2)}\n`);
    writeFileSync(path.join(EXPECTED, "summary.json"), `${JSON.stringify({ counts: countsOf(results.runs), worseOfThresholds: results.worseOfThresholds }, null, 2)}\n`);
    process.stdout.write(`wrote ${path.relative(ROOT, EXPECTED)}/electrical.json and summary.json\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

