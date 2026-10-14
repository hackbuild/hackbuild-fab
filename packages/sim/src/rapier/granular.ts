// Scene granular-funnel (M02-T05): 18 balls dropped into the SLUG funnel on
// the adopted Rapier, 10 s at 1/240 per trial, seeds 1 to 30. A runtime and
// determinism scene; the ball count it reports is informational (D-075) and
// claims nothing about SLUG vend behaviour. The funnel face formulas and
// the spawn lattice are the capsule geometry's funnelPanel and spawnPos
// (slug.html lines 236 to 244 and 685 to 694, lineage
// slug.capsule-geometry/slug-12); this file adds only the panel cut of
// lines 245 to 262 and the convex-hull slabs (lineage slug.funnel/slug-12).
// The SLUG rows live once, in scenes/granular-funnel.world.json with
// provenance; scenes/slug.ts reads the same rows.
//
// SLUG axes (x, y plan, z up, mm) map to Rapier metres as (x, z, -y), a
// proper rotation. Panels are convex hulls of their slab corners, so no
// quaternion enters the scene and a panel's inner face passes exactly
// through the mouth edge (R0 = fb + (t/2)/sin(ang)).

import type { ColliderDesc, World } from "@dimforge/rapier3d-deterministic-compat";
import { commandError, type Constant } from "@hackbuild/spec";
import { funnelPanel, spawnPos, type FunnelRows, type LatticeRows } from "../capsule/geometry.js";
import { createPrng } from "../prng.js";
import type { RapierScene, SceneTrial, StepObserver, TrialOutcome } from "./scene.js";
import { snapshotHash } from "./snapshot.js";
import { withWorld, type WorldParams } from "./world.js";

/** Metres per millimetre, a unit conversion. */
const M_PER_MM = 0.001;

/** Seeds 1 to 30, one trial each (M02-T05 step 2). */
export const GRANULAR_TRIALS = 30;

const KEYS = [
  "fb", "t", "capD", "xl", "xr", "yb", "yf", "thrX", "thrY", "zCeil", "zFunTop", "fLap",
  "spawnPitch", "spawnEdgeGap", "spawnAboveTop", "spawnLateral", "balls", "duration",
] as const;
type Key = (typeof KEYS)[number];

export interface GranularRows extends WorldParams {
  readonly funnel: Readonly<Record<Key, Constant>>;
}

/** Reads the funnel rows, naming the first missing key. */
export function granularRows(p: WorldParams): GranularRows {
  const f = (p as Partial<GranularRows>).funnel;
  for (const k of KEYS) {
    if (f === undefined || f[k] === undefined) {
      throw commandError({ code: "E_PARAM_MISSING", path: `/funnel/${k}`, got: "absent", expected: "a profile Constant row with provenance", hint: `add ${k} to the scene's world rows file` });
    }
  }
  return p as GranularRows;
}

export interface Panel {
  readonly face: 0 | 2 | 3;
  /** Lean from horizontal, radians. */
  readonly ang: number;
  /** Mid plane crossing of the funnel floor, mm from the throat centre. */
  readonly r0: number;
  /** Slope length of the cut panel, mm. */
  readonly s: number;
  readonly bL: number; readonly bR: number; readonly tL: number; readonly tR: number;
}

type V = Readonly<Record<Key, number>>;
const vals = (r: GranularRows): V => Object.fromEntries(KEYS.map((k) => [k, r.funnel[k].value])) as V;

/** Funnel floor height, mm: the ceiling top (slug.html line 227). */
export const floorZ = (r: GranularRows): number => r.funnel.zCeil.value + r.funnel.t.value;

/** The world rows in the capsule geometry's row shape, mm. */
const slugRows = (P: V): FunnelRows & LatticeRows => ({
  t: P.t, fb: P.fb, capD: P.capD, xl: P.xl, xr: P.xr, yb: P.yb, yf: P.yf, thr: [P.thrX, P.thrY], zFunTop: P.zFunTop,
  spawn: { pitch: P.spawnPitch, edgeGap: P.spawnEdgeGap, above: P.spawnAboveTop },
});

/** Panel geometry per slug.html lines 236 to 262, faces 0 front, 2 left, 3 right: funnelPanel, then the cut of lines 245 to 262. */
export function funnelPanels(rows: GranularRows): Panel[] {
  const P = vals(rows);
  const g = slugRows(P);
  return ([0, 2, 3] as const).map((p) => {
    const { ang, r0, uw, len: s } = funnelPanel(g, p, P.zCeil + P.t);
    const frac = s / uw;
    const bL = p === 0 ? -P.fb : p === 2 ? -P.fb : -P.fb + P.fLap;
    const bR = p === 0 ? P.fb : p === 2 ? P.fb - P.fLap : P.fb;
    const TL = p === 0 ? P.xl - P.thrX : p === 2 ? -P.fb : -(P.yf - P.thrY) + P.fLap;
    const TR = p === 0 ? P.xr - P.thrX : p === 2 ? (P.yf - P.thrY) - P.fLap : P.fb;
    return { face: p, ang, r0, s, bL, bR, tL: bL + (TL - bL) * frac, tR: bR + (TR - bR) * frac };
  });
}

/** Outward and lateral unit vectors in SLUG plan, from rz 0, 90, 270 of slug.html line 245. */
const PLAN: Record<0 | 2 | 3, { n: readonly [number, number]; l: readonly [number, number] }> = {
  0: { n: [0, 1], l: [1, 0] },
  2: { n: [-1, 0], l: [0, 1] },
  3: { n: [1, 0], l: [0, -1] },
};

/** SLUG mm (x, y, z up) to Rapier metres (x, z, -y). */
const toR = (x: number, y: number, z: number): [number, number, number] => [x * M_PER_MM, z * M_PER_MM, -y * M_PER_MM];

/** Slab corners, mm in SLUG axes: the mid plane offset by plus and minus t/2 along its normal. */
export function panelCorners(rows: GranularRows, pn: Panel): [number, number, number][] {
  const P = vals(rows);
  const { n, l } = PLAN[pn.face];
  const z0 = P.zCeil + P.t;
  const out: [number, number, number][] = [];
  for (const [u, v0, v1] of [[0, pn.bL, pn.bR], [pn.s, pn.tL, pn.tR]] as const) {
    for (const v of [v0, v1]) {
      for (const side of [-1, 1]) {
        const h = pn.r0 + u * Math.cos(pn.ang) - side * (P.t / 2) * Math.sin(pn.ang);
        const z = z0 + u * Math.sin(pn.ang) + side * (P.t / 2) * Math.cos(pn.ang);
        out.push([P.thrX + n[0] * h + l[0] * v, P.thrY + n[1] * h + l[1] * v, z]);
      }
    }
  }
  return out;
}

/** Ball start positions, mm in SLUG axes: spawnPos for each ball (slug.html lines 686 to 693). */
export function spawnLattice(rows: GranularRows): [number, number, number][] {
  const P = vals(rows);
  const g = slugRows(P);
  return Array.from({ length: P.balls }, (_, i) => {
    const q = spawnPos(g, i);
    return [q.x, q.y, q.z];
  });
}

/** Lateral start speeds, mm/s, two draws per ball (x then y) as slug.html line 701 (drawn from the seeded generator, D-136). */
export function spawnVelocities(rows: GranularRows, seed: number): [number, number][] {
  const g = createPrng(seed);
  const a = rows.funnel.spawnLateral.value;
  return Array.from({ length: rows.funnel.balls.value }, () => {
    const vx = (g.next() - 0.5) * 2 * a;
    const vy = (g.next() - 0.5) * 2 * a;
    return [vx, vy];
  });
}

export interface GranularOutcome extends TrialOutcome {
  /** Balls whose centre is below the mouth plane at the end, count (informational, D-075). */
  readonly ballsBelowMouth: number;
}

export function runGranularTrial(params: WorldParams, seed: number, observe: StepObserver): Promise<GranularOutcome> {
  const rows = granularRows(params);
  const P = vals(rows);
  return withWorld(params, (world: World, R) => {
    const fixed = world.createRigidBody(R.RigidBodyDesc.fixed());
    const add = (d: ColliderDesc): void => { world.createCollider(d, fixed); };
    for (const pn of funnelPanels(rows)) {
      const pts = panelCorners(rows, pn).flatMap(([x, y, z]) => toR(x, y, z));
      const hull = R.ColliderDesc.convexHull(new Float32Array(pts));
      if (hull === null) throw commandError({ code: "E_SCHEMA", path: `/funnel/panel${pn.face}`, got: "degenerate hull", expected: "a convex slab", hint: "check the funnel rows" });
      add(hull);
    }
    const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): void => {
      const c = toR((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      add(R.ColliderDesc.cuboid(((x1 - x0) / 2) * M_PER_MM, ((z1 - z0) / 2) * M_PER_MM, ((y1 - y0) / 2) * M_PER_MM).setTranslation(c[0], c[1], c[2]));
    };
    const z0 = P.zCeil + P.t;
    // vertical back face, inner face at y = thrY - fb, up to the funnel top
    box(P.xl, P.xr, P.thrY - P.fb - P.t, P.thrY - P.fb, z0, P.zFunTop);
    // ceiling plate with the square mouth cut out: the funnel floor
    box(P.xl, P.thrX - P.fb, P.yb, P.yf, P.zCeil, z0);
    box(P.thrX + P.fb, P.xr, P.yb, P.yf, P.zCeil, z0);
    box(P.thrX - P.fb, P.thrX + P.fb, P.thrY + P.fb, P.yf, P.zCeil, z0);
    box(P.thrX - P.fb, P.thrX + P.fb, P.yb, P.thrY - P.fb, P.zCeil, z0);
    const vel = spawnVelocities(rows, seed);
    const bodies = spawnLattice(rows).map(([x, y, z], i) => {
      const p = toR(x, y, z);
      const v = vel[i]!;
      const b = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p[0], p[1], p[2]).setLinvel(v[0] * M_PER_MM, 0, -v[1] * M_PER_MM));
      world.createCollider(R.ColliderDesc.ball((P.capD / 2) * M_PER_MM), b);
      return b;
    });
    const steps = Math.round(P.duration / params.timestep.value);
    for (let i = 1; i <= steps; i += 1) {
      world.step();
      observe(world, i);
    }
    const below = bodies.filter((b) => b.translation().y < z0 * M_PER_MM).length;
    return { snapshotHash: snapshotHash(world), steps, ballsBelowMouth: below };
  });
}

export const granularFunnelScene: RapierScene = {
  id: "granular-funnel",
  worldRows: "scenes/granular-funnel.world.json",
  trials: Array.from({ length: GRANULAR_TRIALS }, (_, i): SceneTrial => ({ trial: `balls18-t${String(i + 1).padStart(2, "0")}`, seed: i + 1 })),
  run: async (params, trial, observe) => {
    const { snapshotHash: h, steps } = await runGranularTrial(params, trial.seed, observe);
    return { snapshotHash: h, steps };
  },
};
