// CHK-ASM-11, every pair of bodies clear in every declared pose, except
// declared touch pairs under their squeeze ceiling (OGEE R16-P 2026-08,
// designs/ogee16/legacy/source/audit_print.py audit(), lines 64 to 79;
// M04-T11). One assembly is one pose. The rule is audit()'s: a pair whose
// bounding boxes are apart on any axis by the declared margin is skipped;
// otherwise its intersection volume is computed, and a pair that is not a
// declared touch pair clashes above the volume tolerance, a declared touch
// pair above the squeeze ceiling. Touch pairs are the assembly's contact
// assertions; tolerance, ceiling and margin are the design's declaration,
// handed in through the interference view with their origin.
//
// The volume is capture.ts interferenceMm3, the one manifold-3d
// intersection in this package. A boolean that throws is E_KERNEL naming
// the pair, never 0 mm3: audit() reads `except Exception: v = 0.0`, so a
// crashed intersection read as clear (D-153).

import type { Assembly, CheckCtx, Finding, MeshRef, ResultTarget } from "@hackbuild/spec";
import { bounds, type MeshData } from "@hackbuild/mesh";
import { defineCheck } from "../../registry.js";
import { interferenceMm3 } from "../../capture.js";
import { placed } from "../../solid/mesh.js";
import { NO_MESH, viewsOf, type InterferenceDecl } from "../../views.js";
export type { InterferenceDecl, InterferenceView } from "../../views.js";
import { fmt, intervalFinding, skip } from "../common.js";


export const NO_DECL = "no interference declaration supplied to the registry: the caller hands in the design's tolerance, touch ceiling and box margin";

export interface PairVolume {
  readonly a: string;
  readonly b: string;
  /** Intersection volume, mm3 (computed). */
  readonly mm3: number;
  readonly touch: boolean;
}

export interface PoseAudit {
  readonly bodies: number;
  /** Pairs whose boxes overlap within the margin, count. */
  readonly boxPairs: number;
  /** Every pair with a volume above 0 mm3. */
  readonly overlaps: readonly PairVolume[];
  readonly clashes: readonly PairVolume[];
}

/** The instance's placed mesh, or the reason it is not at hand. */
type MeshOf = (ref: MeshRef) => MeshData | undefined;

/** audit_print.audit() on one assembly, every pair in instance order. */
export async function auditPose(a: Assembly, decl: InterferenceDecl, meshOf: MeshOf): Promise<PoseAudit | { readonly reason: string }> {
  const touch = new Set<string>();
  for (const x of a.assertions) if (x.type === "contact") touch.add(`${x.a}\u0000${x.b}`).add(`${x.b}\u0000${x.a}`);
  const solids: { id: string; mesh: MeshData; lo: readonly number[]; hi: readonly number[] }[] = [];
  for (const inst of a.instances) {
    const part = a.parts.find((p) => p.id === inst.part);
    if (part === undefined) return { reason: `instance ${inst.id} names part ${inst.part}, which the assembly does not carry` };
    const m = meshOf(part.solid);
    if (m === undefined) return { reason: `${NO_MESH}; solid of ${part.id} (${part.solid.uri}) is not at hand` };
    const mesh = placed(m, inst.pose);
    const [lo, hi] = bounds(mesh);
    solids.push({ id: inst.id, mesh, lo, hi });
  }
  const g = decl.boxMarginMm;
  let boxPairs = 0;
  const overlaps: PairVolume[] = [];
  const clashes: PairVolume[] = [];
  for (let i = 0; i < solids.length; i += 1) {
    for (let j = i + 1; j < solids.length; j += 1) {
      const x = solids[i]!, y = solids[j]!;
      if ([0, 1, 2].some((k) => x.hi[k]! < y.lo[k]! + g || y.hi[k]! < x.lo[k]! + g)) continue;
      boxPairs += 1;
      const mm3 = await interferenceMm3(x.mesh, y.mesh, `/assemblies/${a.id}/pairs/${x.id}|${y.id}`);
      const pair: PairVolume = { a: x.id, b: y.id, mm3, touch: touch.has(`${x.id}\u0000${y.id}`) };
      if (mm3 > 0) overlaps.push(pair);
      if (pair.touch ? mm3 > decl.touchCeilingMm3 : mm3 > decl.tolMm3) clashes.push(pair);
    }
  }
  return { bodies: solids.length, boxPairs, overlaps, clashes };
}

const line = (p: PairVolume): string => `${p.a}${p.touch ? "*" : ""} against ${p.b}${p.touch ? "*" : ""} ${p.mm3.toFixed(2)} mm3`;

/** The pose finding: measured is the clash count, legal 0 to 0; extra carries the largest touch-pair overlap and the pair count. */
export function poseFinding(a: Assembly, decl: InterferenceDecl, r: PoseAudit): Finding {
  const at: ResultTarget = { level: "assembly", assembly: a.id };
  const worst = [...r.clashes].sort((p, q) => q.mm3 - p.mm3);
  const touch = r.overlaps.filter((p) => p.touch).sort((p, q) => q.mm3 - p.mm3)[0];
  const rule = `every pair clear above ${fmt(decl.tolMm3)} mm3, a declared touch pair under ${fmt(decl.touchCeilingMm3)} mm3, set by ${decl.origin}`;
  const constraint = worst.length === 0
    ? `${a.id}: 0 clashes over ${r.boxPairs} box-test pairs of ${r.bodies} bodies (computed); ${rule}`
    : `${a.id}: ${worst.length} ${worst.length === 1 ? "clash" : "clashes"} (computed), worst ${worst.slice(0, 4).map(line).join("; ")}; ${rule}; move the bodies apart or declare the pair a touch pair`;
  return intervalFinding(at, r.clashes.length, 0, 0, "count", constraint, {
    bodies: r.bodies,
    boxPairs: r.boxPairs,
    overlapPairs: r.overlaps.length,
    largestTouchMm3: Number((touch?.mm3 ?? 0).toFixed(6)),
    largestTouchPair: touch === undefined ? "none" : `${touch.a}|${touch.b}`,
    tolMm3: decl.tolMm3,
    touchCeilingMm3: decl.touchCeilingMm3,
    clashes: worst.map(line).join("; "),
  });
}

export const check = defineCheck({
  id: "CHK-ASM-11",
  level: "assembly",
  run: async (t, ctx: CheckCtx): Promise<readonly Finding[]> => {
    const a = t.assembly;
    const at: ResultTarget = { level: "assembly", assembly: a.id };
    const views = viewsOf(ctx);
    const decl = views.interference?.(a.id);
    if (decl === undefined) return [skip(at, "not run", NO_DECL)];
    const meshOf = views.mesh;
    if (meshOf === undefined) return [skip(at, "not run", NO_MESH)];
    const r = await auditPose(a, decl, (ref) => meshOf(ref));
    if ("reason" in r) return [skip(at, "not run", r.reason)];
    return [poseFinding(a, decl, r)];
  },
});
