// Fit bands on the real gap per side after loss (D-100, PROFILE.md 7.3).
// A band holds no drawn figure; drawnFor inverts realGap over the loss rows.

import type { FitBand, FitClassId, Process } from "@hackbuild/spec";
import { PROCESSES } from "@hackbuild/spec";
import { FIT_MOTIONS, type GapSide } from "./loss.js";
import { checkProvenance, refError, schemaError, type ProvenanceRules } from "./provenance.js";

/** A class id the profile retired, and the id that replaces it (fits.json `dropped`). */
export interface DroppedFit {
  readonly class: string;
  readonly use: string;
  readonly decision: string;
}

export interface FitTable {
  readonly fits: readonly FitBand[];
  readonly dropped: readonly DroppedFit[];
}

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Validate parsed fits.json. A band with a basis other than perSide is refused (GapBasis). */
export function loadFits(raw: unknown, rules: ProvenanceRules = {}): FitTable {
  if (typeof raw !== "object" || raw === null) throw schemaError("/fits", "fits.json is not an object");
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r["fits"])) throw schemaError("/fits", "fits.json needs a fits array");
  const fits = r["fits"].map((x: unknown, i): FitBand => {
    const path = `/fits/${i}`;
    if (typeof x !== "object" || x === null) throw schemaError(path, "fit band is not an object");
    const f = x as Record<string, unknown>;
    if (typeof f["class"] !== "string" || f["class"] === "") throw schemaError(`${path}/class`, "fit band has no class");
    if (f["basis"] !== "perSide") {
      throw schemaError(`${path}/basis`, `fit band basis ${String(f["basis"])} refused; every gap is perSide (GapBasis)`, {
        got: f["basis"], expected: "perSide",
      });
    }
    const pr = f["processes"];
    if (!Array.isArray(pr) || pr.length !== 2 || !pr.every((p) => (PROCESSES as readonly unknown[]).includes(p))) {
      throw schemaError(`${path}/processes`, "fit band needs two processes");
    }
    if (!(FIT_MOTIONS as readonly unknown[]).includes(f["motion"])) {
      throw schemaError(`${path}/motion`, "unknown motion", { got: f["motion"], expected: FIT_MOTIONS.join(", ") });
    }
    if (!isNum(f["realLoPerSide"]) || !isNum(f["realHiPerSide"]) || f["realLoPerSide"] > f["realHiPerSide"]) {
      throw schemaError(path, "fit band needs realLoPerSide at or below realHiPerSide, mm per side");
    }
    checkProvenance(f["provenance"], `${path}/provenance`, rules);
    return f as unknown as FitBand;
  });
  const dropped = Array.isArray(r["dropped"]) ? (r["dropped"] as DroppedFit[]) : [];
  return { fits, dropped };
}

/** The band for a class id; a dropped id (PSLIDE) is E_REF naming its replacement. */
export function findFit(t: FitTable, cls: FitClassId | string): FitBand {
  const band = t.fits.find((f) => f.class === cls);
  if (band !== undefined) return band;
  const ids = t.fits.map((f) => f.class as string);
  const d = t.dropped.find((x) => x.class === cls);
  if (d !== undefined) {
    throw refError("/fit", cls, `fit class ${cls} is dropped; use ${d.use} (${d.decision})`, ids, [d.use]);
  }
  throw refError("/fit", cls, `no fit class ${cls} in profile`, ids);
}

/**
 * The realGap side a band's process pair reads, or null when no side
 * applies (laser in laser, paper): fdm in fdm is "hole", fdm in a cut hole
 * is "outer".
 */
export function sideOf(band: FitBand): GapSide | null {
  const [a, b]: readonly [Process, Process] = band.processes;
  if (b !== "fdm") return null;
  if (a === "fdm") return "hole";
  if (a === "laser") return "outer";
  return null;
}
