// Capture assertions (D-074, CHECKS.md section 10). A snap, a trap or a
// retainer proves it holds when the part, moved the way it would escape,
// interferes with its keeper by more than a floor; a path or a slide
// proves it is free when the same volume stays under the floor. The rule
// and the 1.0 mm3 floor are PINTLE R6 snap_check.py line 25:
// `ok = (v < 1.0) if want_clear else (v > 1.0)`, both strict.
//
// The volume is the manifold-3d intersection of the moved a with b. A
// boolean the kernel refuses throws E_KERNEL naming the pair, never a
// volume of 0: OGEE audit_print.py read a raised boolean as clear
// (M04 header, D-153), and a trap that crashes must not read as free.

import type { Assertion, Finding, Quat, ResultTarget } from "@hackbuild/spec";
import { kernel, loadManifold, scope, type MeshData } from "@hackbuild/mesh";
import { checkError, fmt } from "./skeleton/common.js";
import { placed } from "./solid/mesh.js";

export type CaptureAssertion = Extract<Assertion, { type: "capture" }>;

/** traps: the volume must exceed the floor. clear: it must stay under it. */
export type CaptureWant = "traps" | "clear";

/** A rigid move of a: rotate about z through the origin, then translate. mm and degrees. */
export interface CaptureMove {
  readonly dxMm: number;
  readonly dyMm: number;
  readonly dzMm: number;
  readonly rotZDeg: number;
}

export const NO_MOVE: CaptureMove = { dxMm: 0, dyMm: 0, dzMm: 0, rotZDeg: 0 };

export function movedMesh(m: MeshData, move: CaptureMove): MeshData {
  const half = (move.rotZDeg * Math.PI) / 360;
  const rot: Quat = [0, 0, Math.sin(half), Math.cos(half)];
  return placed(m, { pos: [move.dxMm, move.dyMm, move.dzMm], rot });
}

/**
 * Intersection volume of two closed meshes, mm3 (computed). E_KERNEL at
 * `path` when either mesh is not a closed manifold or the result is not
 * finite.
 */
export async function interferenceMm3(a: MeshData, b: MeshData, path: string): Promise<number> {
  await loadManifold();
  return scope(() => {
    const wasm = kernel();
    const solid = (m: MeshData, side: "a" | "b") => {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
      mesh.merge();
      const refuse = (got: string) => checkError({
        code: "E_KERNEL", path: `${path}/${side}`, got, expected: "NoError",
        hint: `${path}: body ${side} is not a closed manifold, so its interference volume is unknown; export it closed and run again`,
        record: "verification",
      });
      // manifold-3d 3.5.4 throws a ManifoldError from the constructor on an open mesh instead of returning a status.
      let s: InstanceType<typeof wasm.Manifold>;
      try {
        s = new wasm.Manifold(mesh);
      } catch (e) {
        throw refuse(e instanceof Error ? e.message : String(e));
      }
      const status = s.status();
      if (status !== "NoError") throw refuse(status);
      return s;
    };
    const v = solid(a, "a").intersect(solid(b, "b")).volume();
    if (!Number.isFinite(v)) {
      throw checkError({ code: "E_KERNEL", path, got: String(v), expected: "a finite volume in mm3", hint: `${path}: the intersection returned no volume; run again`, record: "verification" });
    }
    return Math.max(0, v);
  });
}

const round6 = (v: number): number => Number(v.toFixed(6));

/**
 * The finding for one moved pair. Legal is the interval past the floor
 * (traps) or below it (clear); the verdict is strict on both sides, as
 * snap_check.py line 25 is, so a volume equal to the floor fails either way.
 */
export function volumeFinding(target: ResultTarget, want: CaptureWant, floorMm3: number, measuredMm3: number, label: string): Finding {
  const v = round6(measuredMm3);
  const ok = want === "traps" ? v > floorMm3 : v < floorMm3;
  const constraint = want === "traps"
    ? `${label}: a trap holds only when the escape move drives more than ${fmt(floorMm3)} mm3 into its keeper`
    : `${label}: a free path or slide stays under ${fmt(floorMm3)} mm3 of interference`;
  return {
    verdict: ok ? "pass" : "fail",
    target,
    measured: v,
    legal: want === "traps"
      ? { kind: "interval", lo: floorMm3, hi: null, unit: "mm3", nearest: ok ? v : floorMm3 }
      : { kind: "interval", lo: 0, hi: floorMm3, unit: "mm3", nearest: ok ? v : floorMm3 },
    constraint,
    extra: { want, floorMm3, interferenceMm3: round6(measuredMm3) },
  };
}

/** A capture assertion's finding: want traps against its minInterferenceMm3. */
export function captureFinding(target: ResultTarget, assertion: CaptureAssertion, measuredMm3: number): Finding {
  return volumeFinding(target, "traps", assertion.minInterferenceMm3, measuredMm3, `${assertion.a} against ${assertion.b}`);
}
