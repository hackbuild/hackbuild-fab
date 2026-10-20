// asm.solve (M02-T11 step 5, D-106): places a scene's bodies at one named
// pose and returns placements, pairwise contacts and the closest approach
// of every declared pair. For DAVIT, --clamp joint=deg moves one joint on
// both arms toward deg with the bisection clamp of davit.html attempt() and
// reports the clamped value. Verdict: the scene declares zero real fails.

import type { CommandInput, Pose, Quat, Vec3 } from "@hackbuild/spec";
import { solveAssembly, type AsmRun, type Placement } from "@hackbuild/sim";
import { cmdError } from "../errors.js";
import type { CoreCtx } from "../ctx.js";
import type { CommandOut } from "../result.js";
import { sceneDeps, sceneOf, simResult, type SceneArg } from "./sim.run.js";

export type AsmSolveInput = Omit<CommandInput<"asm.solve">, "build"> & SceneArg & {
  /** CLI-only until M10: a pose the scene names (DAVIT HANG, REACH, LIFT, TUCK). */
  readonly pose?: string;
  /** CLI-only until M10: joint=deg, for example elbow=-110. */
  readonly clamp?: string;
};

export type AsmSolveOutput = Omit<AsmRun, "placements"> & {
  readonly placements: Readonly<Record<string, Pose>>;
  readonly unsatisfied: readonly never[];
  readonly lines: readonly string[];
};

/** Unit quaternion of the rotation part of a row-major rigid 4x4 (Shepperd's method). */
export function quatOf(m: readonly number[]): Quat {
  const [a, b, c, , d, e, f, , g, h, k] = m as [number, number, number, number, number, number, number, number, number, number, number];
  const tr = a + e + k;
  let x: number, y: number, z: number, w: number;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    w = s / 4; x = (h - f) / s; y = (c - g) / s; z = (d - b) / s;
  } else if (a > e && a > k) {
    const s = Math.sqrt(1 + a - e - k) * 2;
    w = (h - f) / s; x = s / 4; y = (b + d) / s; z = (c + g) / s;
  } else if (e > k) {
    const s = Math.sqrt(1 + e - a - k) * 2;
    w = (c - g) / s; x = (b + d) / s; y = s / 4; z = (f + h) / s;
  } else {
    const s = Math.sqrt(1 + k - a - e) * 2;
    w = (d - b) / s; x = (c + g) / s; y = (f + h) / s; z = s / 4;
  }
  return [x, y, z, w];
}

const poseOf = (p: Placement): Pose => ({ frame: "assembly", pos: [p.m[3]!, p.m[7]!, p.m[11]!] as Vec3, rot: quatOf(p.m) });

/** --clamp joint=deg. */
function clampOf(raw: string | undefined): { joint: string; value: number } | undefined {
  if (raw === undefined) return undefined;
  const m = /^([a-z_]+)=(-?\d+(?:\.\d+)?)$/.exec(raw.trim());
  if (m === null) throw cmdError({ code: "E_SCHEMA", path: "/clamp", got: raw, expected: "joint=deg", hint: "write --clamp joint=deg, for example elbow=-110" });
  return { joint: m[1]!, value: Number(m[2]) };
}

export async function runAsmSolve(i: AsmSolveInput, ctx: CoreCtx): Promise<CommandOut<AsmSolveOutput>> {
  const id = sceneOf(i);
  const clamp = clampOf(i.clamp);
  const r = await solveAssembly(id, { ...(i.pose === undefined ? {} : { pose: i.pose }), ...(clamp === undefined ? {} : { clamp }) }, sceneDeps(ctx));
  const placements: Record<string, Pose> = {};
  for (const p of r.placements) placements[p.side === "" ? p.body : `${p.body}@${p.side}`] = poseOf(p);
  const c = r.clamp;
  const lines = [
    `pose ${r.pose}  ${Object.entries(r.joints).map(([k, v]) => `${k} ${v}`).join("  ")} deg`,
    ...(c === undefined ? [] : [c.contactAt === null
      ? `clamp  ${c.joint} ${c.from} to ${c.requested} deg is clear`
      : `clamp  ${c.joint} ${c.from} to ${c.requested} deg stops at ${c.clamped.toFixed(3)} deg, contact at ${c.contactAt.toFixed(3)} deg after ${c.iterations} steps (computed)`]),
    ...r.closest.map((x) => `closest  ${x.pair} ${x.side}  ${x.mm.toFixed(2)} mm (computed)`),
    ...r.realFails.map((f) => `real fail  ${f.pair} ${f.sides}  ${f.distMm.toFixed(2)} mm (computed)`),
    `declared  ${r.expectation.declared}`,
    `measured  ${r.expectation.measured}`,
  ];
  return simResult<AsmSolveOutput>({ ...r, placements, unsatisfied: [], lines }, r.expectation, ctx);
}
