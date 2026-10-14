// CHK-FIT-01, every mating pair is in its fit class band on the REAL gap
// (OGEE R16-P 2026-08: seven of seventeen pairs out of band). The rule is
// OGEE16 fits.py as M01-T09 ported it to fits.table: the build's FITS rows
// (fits.<nn>.hole, .shaft, .drawn, .class and fits.model metrics, D-049)
// are each bounded through the solver on fit.drawn and fit.hole, so the
// band comes from profile fit-band and the legacy model, and a row is in
// band within the model's edge tolerance. fitRowsOf is the one loop:
// fits.table in core calls it too. A part with no FITS rows has no pairs;
// an assembly with none skips.

import type {
  ConstraintCtx, FitClassId, Finding, Interval, Metric, Part, ProfileLookup,
} from "@hackbuild/spec";
import { createRegistry, nearest, solve, type ConstraintRegistry } from "@hackbuild/constraints";
import { constraintDefs as profileConstraints, fitModel, inLegacyBand, legacyAfterLoss, legacyBand, sideOf } from "@hackbuild/profile";
import { defineCheck } from "../../registry.js";
import { checkError, missing, skip } from "../common.js";

export interface FitRowEval {
  /** Metric stem, for example "fits.01". */
  readonly id: string;
  readonly name: string;
  readonly cls: string;
  readonly legacyClass: string;
  readonly model: string;
  readonly hole: number;
  readonly shaft: number;
  readonly drawn: number;
  /** Legal drawn clearance, mm. */
  readonly band: readonly [number, number];
  readonly holeBand: readonly [number, number];
  /** The legacy "after loss" column, mm. */
  readonly real: number;
  /** realGap across the joint from the D-100 loss table, mm; null when no loss row prices the pair. */
  readonly unifiedReal: number | null;
  /** The binding bound's reason. */
  readonly reason: string;
  readonly ok: boolean;
  /** The CHK-FIT-01 finding for the row, target the part. */
  readonly finding: Finding;
}

const schema = (path: string, hint: string, got?: unknown): never => {
  throw checkError({ code: "E_SCHEMA", path, ...(got === undefined ? {} : { got }), expected: "a FITS row metric", hint, record: "CHK-FIT-01" });
};

function metricOf(part: Part, id: string): Metric {
  return part.metrics.find((x) => x.id === id) ?? schema(`/metrics/${id}`, `the build emits no ${id}; emit hole, shaft, drawn and class for every fits row`);
}

/**
 * A row value as a number. A value that is not there as a number (NaN, or
 * null where NaN was serialized) is E_PARAM_MISSING, never a fail verdict
 * (D-064): FEELER's encoder fit read an undefined P.armW and reported a
 * silent not ok (feeler-v1.md line 111, plan-deltas R53).
 */
function num(m: Metric): number {
  const v: unknown = m.value;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v === null || (typeof v === "number" && !Number.isFinite(v))) {
    throw missing(`/metrics/${m.id}`, `${m.id} has no value; the param it reads is missing (${m.note})`);
  }
  return schema(`/metrics/${m.id}`, `${m.id} must be a number`, v);
}

function legalOf(iv: Interval): readonly [number, number] {
  if (iv.legal === null || iv.legal[0] === null || iv.legal[1] === null) {
    throw checkError({ code: "E_UNSAT", path: "/facts", got: iv.dim, hint: `fit band for ${iv.dim} is empty or open; check the fit model rows`, record: "CHK-FIT-01" });
  }
  return [iv.legal[0], iv.legal[1]];
}

function unifiedReal(profile: ProfileLookup, cls: string, drawn: number, machine: string, material: string): number | null {
  const side = sideOf(profile.fit(cls as FitClassId));
  if (side === null) return null;
  try {
    return 2 * profile.realGap(drawn / 2, side, machine, material);
  } catch {
    return null;
  }
}

/** True when the part carries FITS rows. */
export const hasFitsRows = (part: Part): boolean => part.metrics.some((m) => /^fits\.\d+\.drawn$/.test(m.id));

/** Every FITS row of a part, evaluated against the solver's fit.drawn and fit.hole intervals. */
export function fitRowsOf(part: Part, profile: ProfileLookup, reg: ConstraintRegistry): readonly FitRowEval[] {
  const model = fitModel(String(metricOf(part, "fits.model").value));
  const material = part.bodies[0]?.material ?? "";
  const machine = part.machine;
  return part.metrics.filter((m) => /^fits\.\d+\.drawn$/.test(m.id)).map((d) => {
    const id = d.id.slice(0, -".drawn".length);
    const drawn = num(d);
    const hole = num(metricOf(part, `${id}.hole`));
    const shaft = num(metricOf(part, `${id}.shaft`));
    const cls = String(metricOf(part, `${id}.class`).value);
    const qctx: ConstraintCtx = { profile, machine, material, facts: { fitClass: cls, fitModel: model.id, shaftMm: shaft }, part };
    const drawnIv = solve(reg, "fit.drawn", qctx).interval;
    const [lo, hi] = legalOf(drawnIv);
    const holeBand = legalOf(solve(reg, "fit.hole", qctx).interval);
    const band = legacyBand(model, cls);
    const ok = inLegacyBand(model, { ...band, lo, hi }, drawn);
    const real = legacyAfterLoss(model, band, drawn);
    const reason = drawnIv.lo[drawnIv.binding.lo[0]!]!.reason;
    const finding: Finding = {
      verdict: ok ? "pass" : "fail", target: { level: "part", part: part.id },
      constraint: `${d.note}: ${reason}`,
      measured: drawn,
      legal: { kind: "interval", lo, hi, unit: "mm", nearest: nearest(drawnIv, drawn) ?? lo },
      extra: { row: id, holeMm: hole, shaftMm: shaft, legacyClass: band.legacyClass, realMm: real },
    };
    return {
      id, name: d.note, cls, legacyClass: band.legacyClass, model: model.id, hole, shaft, drawn, band: [lo, hi], holeBand, real,
      unifiedReal: unifiedReal(profile, cls, drawn, machine, material), reason, ok, finding,
    };
  });
}

let fitReg: ConstraintRegistry | undefined;
/** The fit dims' registry: the ConstraintDefs profile owns (fit-band among them). */
const registry = (): ConstraintRegistry => (fitReg ??= createRegistry(profileConstraints));

export const check = defineCheck({
  id: "CHK-FIT-01",
  level: "assembly",
  run: (t, ctx): readonly Finding[] => {
    const parts = t.assembly.parts.filter(hasFitsRows);
    if (parts.length === 0) return [skip({ level: "assembly", assembly: t.assembly.id }, "not run", `no FITS rows in assembly ${t.assembly.id}: no part emits fits.<nn>.drawn metrics`)];
    return parts.flatMap((p) => fitRowsOf(p, ctx.profile, registry()).map((r) => r.finding));
  },
});
