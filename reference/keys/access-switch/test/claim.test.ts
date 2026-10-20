// keys/access-switch press claim (R1-flagship-access-switch-04): the drawn
// spring peak against the profile band, and the spread at the five corners
// (drawn, beam thickness minus and plus click.beamPrintErrorMm, modulus
// minus and plus click.modulusSpreadPct), each run through packages/sim
// clickRigid and clickReadout here because claim.ts may not run the sim.
// The spread table is written into the README block; HBF_ACCEPT=1
// rewrites it, otherwise the README must equal what this run computes.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { CLICK_DEFAULTS } from "@hackbuild/archetypes";
import { clickReadout, clickRigid, clickRules } from "@hackbuild/sim";
import { buildPart, loadDesign, resolveParams, type Built, type Design } from "../../../../core/src/commands/build.js";
import { PRESS_IDS, PRESS_METRIC, grams, pressBand, pressClaim, spreadCorners, type PressClaim, type SpreadRow } from "../claim";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/keys/access-switch";
const README = path.join(ROOT, REF, "README.md");
const ACCEPT = process.env["HBF_ACCEPT"] === "1";
const START = "<!-- generated: press claim; rewrite with HBF_ACCEPT=1 npx vitest run reference/keys/access-switch -->";
const END = "<!-- end generated: press claim -->";

let design: Design;
let built: Built;
let params: { l: number; t: number; Q: number; w: number };
let E: number;
let consts: { targetN: number; bandPct: number; beamPrintErrorMm: number; modulusSpreadPct: number };
let rows: SpreadRow[];
let claim: PressClaim;

beforeAll(async () => {
  design = await loadDesign(REF, ROOT);
  const resolved = resolveParams(design.chase, undefined, undefined);
  built = await buildPart(design, resolved, { epoch: 315532800 });
  const profile = createProfileLookup(design.ws.tables);
  const c = (id: string): number => profile.constant(id).value;
  consts = {
    targetN: c(PRESS_IDS.targetN), bandPct: c(PRESS_IDS.bandPct),
    beamPrintErrorMm: c(PRESS_IDS.beamPrintErrorMm), modulusSpreadPct: c(PRESS_IDS.modulusSpreadPct),
  };
  const modulus = profile.material("petg").modulusMPa;
  if (modulus === undefined) throw new Error("profile material petg has no modulusMPa");
  E = modulus;
  params = resolved as unknown as typeof params;
  const rules = clickRules(profile);
  rows = spreadCorners(params.t, E, consts.beamPrintErrorMm, consts.modulusSpreadPct).map((k) => {
    const fe = clickRigid({ l: params.l, t: k.t, Q: params.Q, w: params.w, E: k.E, sw: CLICK_DEFAULTS.sw }, rules);
    const r = clickReadout(fe, rules);
    if (!r.ok) throw new Error(`sim did not converge at corner ${k.corner}`);
    return { ...k, peakN: r.peakN };
  });
  claim = pressClaim(built.part.metrics, consts.targetN, consts.bandPct, rows);
}, 300_000);

const metricValue = (metrics: readonly Metric[], id: string): number => {
  const v = metrics.find((m) => m.id === id)?.value;
  if (typeof v !== "number") throw new Error(`no numeric metric ${id}`);
  return v;
};
const n3 = (x: number): string => x.toFixed(3);
const g0 = (x: number): string => grams(x).toFixed(0);

function block(): string {
  const [lo, hi] = claim.bandN;
  const table = rows.map((r) =>
    `| ${r.corner} | ${r.t.toFixed(2)} | ${r.E.toFixed(0)} | ${n3(r.peakN)} | ${g0(r.peakN)} | ${r.peakN >= lo && r.peakN <= hi ? "in" : "out"} |`);
  return [
    START,
    "",
    `Claim \`${claim.id}\`, tier ${claim.tier}, ${claim.status}. Band ${n3(lo)} to ${n3(hi)} N`,
    `(${g0(lo)} to ${g0(hi)} g), target ${n3(claim.targetN)} N (${g0(claim.targetN)} g) plus or minus`,
    `${consts.bandPct} percent, from \`${PRESS_IDS.targetN}\` and \`${PRESS_IDS.bandPct}\` (profile, inferred;`,
    `the band edges computed). Drawn peak ${n3(claim.valueN)} N (${g0(claim.valueN)} g, computed), ${claim.verdict}.`,
    "",
    `Each corner moves one input alone: beam thickness by \`${PRESS_IDS.beamPrintErrorMm}\``,
    `${consts.beamPrintErrorMm} mm, modulus by \`${PRESS_IDS.modulusSpreadPct}\` ${consts.modulusSpreadPct} percent (profile,`,
    `inferred), through packages/sim clickRigid and clickReadout at span ${params.l}, rise ${params.Q},`,
    `width ${params.w}, shuttle ${CLICK_DEFAULTS.sw} (all peaks computed, grams at standard gravity):`,
    "",
    "| corner | t mm | E MPa | peak N | peak g | band |",
    "|---|---|---|---|---|---|",
    ...table,
    "",
    `Spread ${n3(claim.spread.loN)} to ${n3(claim.spread.hiN)} N (${g0(claim.spread.loN)} to ${g0(claim.spread.hiN)} g, computed)`,
    `${claim.spread.exceedsBand ? "leaves" : "stays inside"} the band, so the claim stays inferred until a person`,
    "enters a reading from the thickness ladder coupon.",
    "",
    END,
  ].join("\n");
}

describe("access switch press claim", () => {
  test("the drawn peak lies inside the target band", () => {
    expect(claim.valueN).toBe(metricValue(built.part.metrics, PRESS_METRIC));
    expect(claim.verdict).toBe("in band");
    expect(claim.valueN).toBeGreaterThanOrEqual(claim.bandN[0]);
    expect(claim.valueN).toBeLessThanOrEqual(claim.bandN[1]);
  });

  test("the drawn corner through packages/sim reads the build's peak", () => {
    const drawn = rows.find((r) => r.corner === "drawn");
    expect(drawn?.t).toBe(params.t);
    expect(drawn?.E).toBe(E);
    expect(n3(drawn?.peakN ?? Number.NaN)).toBe(n3(claim.valueN));
  });

  test("the spread exceeds the band, so the claim stays inferred", () => {
    expect(claim.spread.exceedsBand).toBe(true);
    expect(claim.spread.loN).toBeLessThan(claim.bandN[0]);
    expect(claim.spread.hiN).toBeGreaterThan(claim.bandN[1]);
    expect(claim.tier).toBe("inferred");
    expect(claim.status).toBe("unproven until coupon");
  });

  test("the corners move the peak the way the beam and the modulus do", () => {
    const by = new Map(rows.map((r) => [r.corner, r.peakN] as const));
    const drawn = by.get("drawn") ?? Number.NaN;
    expect(by.get("t minus")).toBeLessThan(drawn);
    expect(by.get("t plus")).toBeGreaterThan(drawn);
    expect(by.get("E minus")).toBeLessThan(drawn);
    expect(by.get("E plus")).toBeGreaterThan(drawn);
  });

  test("the build's claim metrics carry the band the claim reads", () => {
    const m = built.part.metrics;
    const band = pressBand(consts.targetN, consts.bandPct);
    expect(metricValue(m, "claim.press.targetN")).toBe(Number(band.targetN.toFixed(3)));
    expect(metricValue(m, "claim.press.lo")).toBe(Number(claim.bandN[0].toFixed(3)));
    expect(metricValue(m, "claim.press.hi")).toBe(Number(claim.bandN[1].toFixed(3)));
    for (const id of ["claim.press.targetN", "claim.press.lo", "claim.press.hi"]) {
      const x = m.find((q) => q.id === id);
      expect(x?.basis, id).toBe("inferred");
      expect(x?.gate, id).toBe("informational");
      expect(x?.note, id).toMatch(/unproven until coupon/);
    }
  });

  test("the README press claim block equals this run", () => {
    const want = block();
    let text = readFileSync(README, "utf8");
    if (ACCEPT) {
      const a = text.indexOf(START), b = text.indexOf(END);
      if (a < 0 || b < a) throw new Error(`readme: markers ${START} and ${END} missing or out of order`);
      text = text.slice(0, a) + want + text.slice(b + END.length);
      writeFileSync(README, text);
    }
    const a = text.indexOf(START), b = text.indexOf(END);
    expect(a >= 0 && b > a ? text.slice(a, b + END.length) : undefined).toBe(want);
  });
});
