// Drawn gap to real gap, per side, over the one loss table (D-100,
// PROFILE.md 7.1 and 7.2). Every figure here is per side (GapBasis); the
// seed's diametral figures are halved before they reach these rows.

import type { FitMotion, GapFeature, LossRow, Mm, PrintAxis, Process } from "@hackbuild/spec";
import { PROCESSES } from "@hackbuild/spec";
import { checkProvenance, schemaError, type ProvenanceRules } from "./provenance.js";

export type GapSide = "hole" | "outer";

/** hole: an fdm bore around an fdm part. outer: an fdm part in a cut hole. */
export const GAP_PAIR: Readonly<Record<GapSide, readonly [Process, Process]>> = {
  hole: ["fdm", "fdm"],
  outer: ["laser", "fdm"],
};

/** The motions a loss row and a fit band key on (spec/profile.ts FitMotion). */
export const FIT_MOTIONS: readonly FitMotion[] = ["static", "slide", "rotate", "snap", "press"];

/** A loss row is matched to a layer within this distance, mm (PROFILE.md 7.1). */
export const LAYER_MATCH_MM = 0.005;

export interface LossPick {
  readonly row: LossRow;
  /** 3 material and layer, 2 material, 1 machine and layer, 0 machine. */
  readonly rank: 0 | 1 | 2 | 3;
  /** Tie-break within a rank: 2 axis, 1 dRange, 3 both, 0 neither. */
  readonly extra: number;
}

/** Stable id of a loss row, for the read log and profileHash (D-051). */
export function lossRowId(r: LossRow): string {
  const scope = [
    r.machine ?? "*",
    r.material ?? "*",
    r.layer === undefined ? "*" : String(r.layer),
    r.axis ?? "*",
    r.dRange === undefined ? "*" : `${r.dRange[0]}..${r.dRange[1]}`,
  ];
  return `${r.processA}.${r.processB}.${r.motion}@${scope.join(",")}`;
}

/** Most specific matching row wins; material beats machine (D-100). */
export function pickLoss(
  rows: readonly LossRow[], side: GapSide, machine: string,
  material: string, layer: Mm, motion: FitMotion = "static",
  axis?: PrintAxis, d?: Mm,
): LossPick | undefined {
  const [a, b] = GAP_PAIR[side];
  const sameLayer = (r: LossRow): boolean =>
    r.layer !== undefined && Math.abs(r.layer - layer) < LAYER_MATCH_MM;
  const extra = (r: LossRow): number => {
    if (r.axis !== undefined && r.axis !== axis) return -1;
    if (r.dRange !== undefined && (d === undefined || d < r.dRange[0] || d >= r.dRange[1])) return -1;
    return (r.axis !== undefined ? 2 : 0) + (r.dRange !== undefined ? 1 : 0);
  };
  let best: LossPick | undefined;
  for (const r of rows) {
    if (r.processA !== a || r.processB !== b || r.motion !== motion) continue;
    if (r.machine !== undefined && r.machine !== machine) continue;
    const x = extra(r);
    if (x < 0) continue;
    let rank: LossPick["rank"];
    if (r.material !== undefined) {
      if (r.material !== material) continue;
      if (r.layer !== undefined && !sameLayer(r)) continue;
      rank = r.layer !== undefined ? 3 : 2;
    } else {
      if (r.machine === undefined) continue;
      if (r.layer !== undefined && !sameLayer(r)) continue;
      rank = r.layer !== undefined ? 1 : 0;
    }
    if (best === undefined || rank > best.rank || (rank === best.rank && x > best.extra)) {
      best = { row: r, rank, extra: x };
    }
  }
  return best;
}

/** The rows one realGap call resolved: the bore's row (hole side only) and the pin's row. */
export interface GapRows {
  readonly hole?: LossPick;
  readonly outer: LossPick;
}

/**
 * Resolve the rows a gap on `side` reads. The bore and the pin each pick
 * their own row by their own print axis. Returns undefined when a side
 * has no matching row.
 */
export function gapRows(
  rows: readonly LossRow[], side: GapSide, machine: string, material: string,
  layer: Mm, f: GapFeature = {}, motion: FitMotion = "static",
): GapRows | undefined {
  const outer = pickLoss(rows, side, machine, material, layer, motion, f.outerAxis, f.d);
  if (outer === undefined) return undefined;
  if (side === "outer") return { outer };
  const hole = pickLoss(rows, side, machine, material, layer, motion, f.holeAxis, f.d);
  if (hole === undefined) return undefined;
  return { hole, outer };
}

/** hole: drawn - holeUnderPerSide - outerOverPerSide. outer: drawn - outerOverPerSide. */
export function applyLoss(drawnPerSide: Mm, g: GapRows): Mm {
  const over = g.outer.row.outerOverPerSide;
  return g.hole === undefined ? drawnPerSide - over : drawnPerSide - g.hole.row.holeUnderPerSide - over;
}

/** realGap inverted over the same rows: the drawn gap per side that prints `real`. */
export function invertLoss(realPerSide: Mm, g: GapRows): Mm {
  const over = g.outer.row.outerOverPerSide;
  return g.hole === undefined ? realPerSide + over : realPerSide + g.hole.row.holeUnderPerSide + over;
}

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/**
 * Validate parsed loss rows. A row whose basis is anything other than
 * perSide is refused with E_SCHEMA (PROFILE.md 7.1), as is a row with no
 * tier or a non-numeric loss.
 */
export function loadLoss(raw: unknown, rules: ProvenanceRules = {}): LossRow[] {
  if (!Array.isArray(raw)) throw schemaError("/loss", "loss.json needs a loss array");
  return raw.map((x: unknown, i): LossRow => {
    const path = `/loss/${i}`;
    if (typeof x !== "object" || x === null) throw schemaError(path, "loss row is not an object");
    const r = x as Record<string, unknown>;
    if (r["basis"] !== "perSide") {
      throw schemaError(`${path}/basis`, `loss row basis ${String(r["basis"])} refused; every gap is perSide (GapBasis)`, {
        got: r["basis"], expected: "perSide",
      });
    }
    for (const k of ["processA", "processB"]) {
      if (!(PROCESSES as readonly unknown[]).includes(r[k])) {
        throw schemaError(`${path}/${k}`, `unknown process ${String(r[k])}`, { got: r[k], expected: PROCESSES.join(", ") });
      }
    }
    if (!(FIT_MOTIONS as readonly unknown[]).includes(r["motion"])) {
      throw schemaError(`${path}/motion`, `unknown motion ${String(r["motion"])}`, { got: r["motion"], expected: FIT_MOTIONS.join(", ") });
    }
    if (!isNum(r["holeUnderPerSide"]) || !isNum(r["outerOverPerSide"])) {
      throw schemaError(path, "loss row needs numeric holeUnderPerSide and outerOverPerSide, mm per side");
    }
    if (r["machine"] === undefined && r["material"] === undefined) {
      throw schemaError(path, "loss row names neither machine nor material");
    }
    checkProvenance(r["provenance"], `${path}/provenance`, rules);
    return r as unknown as LossRow;
  });
}
