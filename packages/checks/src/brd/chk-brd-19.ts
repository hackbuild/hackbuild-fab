// CHK-BRD-19 run body (M08-T09 step 2; the card's provisional CHK-BRD-08):
// every lead a part's model carries lands on a through pad of the record,
// through a placement transform derived here and never imported from the
// generator. Ported from SHUNT check3d_shunt.mjs lines 48 to 84 (lineage
// board.lead-landing/shunt-r1): board y is world minus Z, model z is plus
// footprint y, rotation.y is plus rot, so a lead at footprint (fx, fy)
// lands at (px + fx c + fy s, py + fx s - fy c). A lead within 0.01 mm of
// a through pad of its part lands; a declared allowance {ref: [mm,
// reason]} widens that for one part; the lead count equals the part's
// through pads; a model's bounds fit its declared body plus 1.6 mm; a part
// with no model is a declared stand-in. measured is the worst landing
// distance outside the allowances, legal 0 to 0.01 mm.

import type { Assembly, CheckCtx, Finding, TargetOf } from "@hackbuild/spec";
import { intervalFinding, skip } from "../defs/common.js";
import { NO_BOARD_VIEW, viewsOf } from "../views.js";

/** check3d_shunt.mjs line 78: a lead lands within 0.01 mm of a declared pad. */
export const LEAD_TOL_MM = 0.01;
/** check3d_shunt.mjs line 62: a real model's bounds over its declared body. */
export const MODEL_SLACK_MM = 1.6;

/** The transform three.js applies in the SHUNT viewer, re-derived (check3d_shunt.mjs line 50). */
export function place(px: number, py: number, rotDeg: number, fx: number, fy: number): [number, number] {
  const r = (rotDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [px + fx * c + fy * s, py + fx * s - fy * c];
}

export function runBrd19(t: TargetOf<"assembly">, ctx: CheckCtx): readonly Finding[] {
  const asm: Assembly = t.assembly;
  const out: Finding[] = [];
  for (const part of asm.parts) {
    const rec = part.board;
    if (rec === undefined) continue;
    const at = { level: "part" as const, part: part.id };
    const view = viewsOf(ctx).board?.landing;
    if (view === undefined) {
      out.push(skip(at, "not run", NO_BOARD_VIEW));
      continue;
    }
    const L = view(part.id);
    if (L === undefined) {
      out.push(skip(at, "not run", `no placements or model leads at hand for ${part.id}: the generator writes placements and the reference keeps models.json`));
      continue;
    }
    const fails: string[] = [];
    let worst = 0;
    let landed = 0;
    let allowed = 0;
    let standIns = 0;
    let real = 0;
    const models = new Set<string>();
    for (const p of rec.parts) {
      if (p.model?.standIn === true) {
        standIns += 1;
        continue;
      }
      const pl = L.placements[p.ref];
      const md = pl === undefined ? undefined : L.models[pl.model];
      if (pl === undefined || md === undefined) {
        fails.push(`${p.ref}: no model and not declared a stand-in`);
        continue;
      }
      real += 1;
      models.add(pl.model);
      const [[x0, , z0], [x1, , z1]] = md.bbox as [number[], number[]];
      const fit = Math.max(p.body.w, p.body.h) + MODEL_SLACK_MM;
      if (x1! - x0! > fit + 0.001 || z1! - z0! > fit + 0.001) fails.push(`${p.ref}: model ${(x1! - x0!).toFixed(2)} x ${(z1! - z0!).toFixed(2)} mm exceeds body ${p.body.w} x ${p.body.h} + ${MODEL_SLACK_MM}`);
      if (md.leads.length === 0) continue;
      const thru = rec.pads.filter((q) => q.ref === p.ref && q.through);
      if (thru.length !== md.leads.length) fails.push(`${p.ref}: model recovered ${md.leads.length} leads, the record holds ${thru.length} through pads`);
      const allow = L.allow[p.ref];
      const tol = allow === undefined ? LEAD_TOL_MM : allow[0];
      for (const [lx, lz] of md.leads) {
        const [bx, by] = place(pl.x, pl.y, pl.rot, lx, lz);
        const best = Math.min(...thru.map((q) => Math.hypot(q.x - bx, q.y - by)));
        if (best > tol) {
          fails.push(`${p.ref}: lead lands ${best.toFixed(3)} mm from the nearest through pad (at ${bx.toFixed(3)}, ${by.toFixed(3)})`);
          worst = Math.max(worst, best);
        } else if (best > LEAD_TOL_MM) allowed += 1;
        else {
          landed += 1;
          worst = Math.max(worst, best);
        }
      }
    }
    const allowText = Object.entries(L.allow).map(([ref, [mm, why]]) => `${ref} up to ${mm} mm: ${why}`).join("; ");
    const constraint = fails.length === 0
      ? `lead landings ${landed} at ${worst.toFixed(3)} mm, ${allowed} within the declared allowance, ${standIns} declared stand-ins, ${rec.parts.length} parts, ${models.size} real models`
      : `${fails[0]}${fails.length > 1 ? `, and ${fails.length - 1} more` : ""}`;
    const f = intervalFinding(at, worst, 0, LEAD_TOL_MM, "mm", constraint, {
      landed, allowed, standIns, parts: rec.parts.length, realModels: models.size, placedReal: real, allowance: allowText, fails: fails.slice(0, 8).join("; "),
    });
    out.push(fails.length === 0 ? f : { ...f, verdict: "fail" });
  }
  return out;
}
