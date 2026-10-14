// Masks: per pair, per side of the pair, one flag per fine point. Stage A
// decodes the legacy masks from DATA (skipA and skipB index lists, keyed by
// pair name). Stage B masks are generated here and keyed by the mesh hashes
// of both bodies and the pose set hash (D-135); a key that does not match the
// meshes or poses now in use is E_STALE naming the pair.

import type { MaskMap, MaskPair } from "./collide.js";
import type { PairRecord } from "./decode.js";

/** Stage A: DATA pairs and the pipe's hub pairs as masks, sized by the proxies they index. */
export function legacyMasks(pairs: readonly PairRecord[], sizeOf: (name: string) => number): MaskMap {
  const out = new Map<string, MaskPair>();
  for (const pr of pairs) {
    const A = new Uint8Array(sizeOf(pr.a)), B = new Uint8Array(sizeOf(pr.b));
    for (const i of pr.skipA) A[i] = 1;
    for (const i of pr.skipB) B[i] = 1;
    out.set(`${pr.a}|${pr.b}`, { a: pr.a, b: pr.b, A, B });
  }
  return out;
}

// ---------------------------------------------------------------- Stage B

import { canonicalize, commandError, sha256Hex } from "@hackbuild/spec";
import type { Mat4 } from "../place.js";
import type { Solid } from "./build.js";
import { nearPairs, pairKey, type NearList, type PosedBody } from "./collide.js";
import type { Proxy } from "./decode.js";

/** How a declared pair may touch. slip: never penetrates. press: designed interference, masked by class. */
export type FitClass = "slip" | "press";

export interface DeclaredPair { readonly a: string; readonly b: string; readonly fit: FitClass }

/** A generated mask with the key that ties it to the meshes and the pose set it was calibrated on. */
export interface BuiltMask extends MaskPair {
  readonly key: string;
  readonly hashA: string;
  readonly hashB: string;
  readonly poseSetHash: string;
  readonly fit: FitClass;
}

/** D-135: the key is the sha256 of the canonical JSON of both mesh hashes and the pose set hash. */
export function maskKey(hashA: string, hashB: string, poseSetHash: string): string {
  return sha256Hex(canonicalize({ meshHashA: hashA, meshHashB: hashB, poseSetHash }));
}

/** E_STALE naming the pair when a mask's key does not match the meshes or the pose set now in use. */
export function assertFresh(mask: BuiltMask, hashA: string, hashB: string, poseSetHash: string): void {
  // The key hashes the three values, so comparing it is the whole test; the stored fields only word the hint.
  if (mask.key === maskKey(hashA, hashB, poseSetHash)) return;
  const what = mask.hashA !== hashA || mask.hashB !== hashB ? "a mesh changed" : "the pose set changed";
  throw commandError({
    code: "E_STALE", path: `/masks/${mask.a}|${mask.b}`, got: { meshHashA: hashA, meshHashB: hashB, poseSetHash },
    expected: `key ${mask.key.slice(0, 16)} over meshHashA ${mask.hashA.slice(0, 16)}, meshHashB ${mask.hashB.slice(0, 16)}, poseSetHash ${mask.poseSetHash.slice(0, 16)}`,
    hint: `mask ${mask.a} x ${mask.b} is stale, ${what}; calibrate it again`, record: "viewer-sim",
  });
}

const inverseApply = (m: Mat4, p: Float64Array, i: number): [number, number, number] => {
  const x = p[i * 3]! - m[3]!, y = p[i * 3 + 1]! - m[7]!, z = p[i * 3 + 2]! - m[11]!;
  return [m[0]! * x + m[4]! * y + m[8]! * z, m[1]! * x + m[5]! * y + m[9]! * z, m[2]! * x + m[6]! * y + m[10]! * z];
};

export interface CalibrationInput {
  readonly declared: readonly DeclaredPair[];
  readonly proxies: ReadonlyMap<string, Proxy>;
  /** Proxy key of a body name. */
  readonly keyOf: (name: string) => string;
  readonly solids: ReadonlyMap<string, Solid>;
  readonly hashes: ReadonlyMap<string, string>;
  readonly poseCount: number;
  readonly bodiesAt: (pose: number, side: "R" | "L") => PosedBody[];
  readonly sides: readonly ("R" | "L")[];
  readonly poseSetHash: string;
  readonly touchMm: number;
  readonly marginMm: number;
  /** Work to reuse: valid for the same proxies and margin; arm pairs repeat across pipes. */
  readonly cache?: CalibrationCache;
}

/** Near lists and the mask marks derived from them, by relative pose. */
export interface CalibrationCache {
  readonly near: Map<string, NearList>;
  readonly marks: Map<string, { readonly a: number[]; readonly b: number[]; readonly penA: number[]; readonly penB: number[] }>;
}

export const newCalibrationCache = (): CalibrationCache => ({ near: new Map(), marks: new Map() });

export interface Calibration {
  readonly masks: Map<string, BuiltMask>;
  /** Point pairs under touch in every pose of the set, per pair and side (D-049 metric). */
  readonly constant: Record<string, number>;
  readonly uniqueRelativePoses: number;
  /** The cache, reusable by penetrations() at the same margin. */
  readonly cache: CalibrationCache;
}

/**
 * Calibrate masks for the declared pairs only, over the gated pose set and
 * both sides. Every point pair within the margin is masked unless a point
 * lies inside the other body's solid (slip pairs): a mask hides contact, never
 * interference. press pairs are masked by class.
 */
export function calibrate(inp: CalibrationInput): Calibration {
  const masks = new Map<string, BuiltMask>();
  const fitOf = new Map<string, FitClass>();
  for (const d of inp.declared) {
    const ka = inp.keyOf(d.a), kb = inp.keyOf(d.b);
    masks.set(`${d.a}|${d.b}`, {
      a: d.a, b: d.b, A: new Uint8Array(inp.proxies.get(ka)!.n), B: new Uint8Array(inp.proxies.get(kb)!.n),
      key: maskKey(inp.hashes.get(ka)!, inp.hashes.get(kb)!, inp.poseSetHash), hashA: inp.hashes.get(ka)!, hashB: inp.hashes.get(kb)!,
      poseSetHash: inp.poseSetHash, fit: d.fit,
    });
    fitOf.set(`${d.a}|${d.b}`, d.fit);
  }
  const wanted = new Set(masks.keys());
  // A point inside the other body in any pose stays unmasked, whatever other poses show.
  const pen = new Map<string, [Uint8Array, Uint8Array]>([...masks].map(([k, m]) => [k, [new Uint8Array(m.A.length), new Uint8Array(m.B.length)]]));
  const t2 = inp.touchMm * inp.touchMm;
  const shared = inp.cache ?? newCalibrationCache();
  const cache = shared.near;
  const touching = new Map<string, Set<number>>();
  const applied = new Set<string>();
  const constant: Record<string, number> = {};
  let unique = 0;
  for (const side of inp.sides) {
    const running = new Map<string, Set<number>>();
    for (let i = 0; i < inp.poseCount; i += 1) {
      const visited = new Set<string>();
      nearPairs(inp.bodiesAt(i, side), inp.proxies, { wanted, marginMm: inp.marginMm, cache, side }, (a, b, list, _rel, fresh, pa, pb) => {
        const key = pairKey(a.n, b.n);
        const mk = masks.get(key)!;
        const flip = !(a.n < b.n);
        let mk2 = shared.marks.get(_rel);
        if (fresh) {
          unique += 1;
          const exempt = mk.fit !== "slip";
          const solidA = inp.solids.get(a.k)!, solidB = inp.solids.get(b.k)!;
          const inA = new Map<number, boolean>(), inB = new Map<number, boolean>();
          mk2 = { a: [], b: [], penA: [], penB: [] };
          for (let k = 0; k < list.length; k += 3) {
            const ii = list[k]!, jj = list[k + 1]!;
            mk2.a.push(ii);
            mk2.b.push(jj);
            if (exempt) continue;
            if (!inA.has(ii)) inA.set(ii, solidB(...inverseApply(b.m, pa!, ii)));
            if (!inB.has(jj)) inB.set(jj, solidA(...inverseApply(a.m, pb!, jj)));
            if (inA.get(ii)!) mk2.penA.push(ii);
            if (inB.get(jj)!) mk2.penB.push(jj);
          }
          shared.marks.set(_rel, mk2);
        }
        if (!applied.has(_rel)) {
          applied.add(_rel);
          // Marks are in the orientation of the visit; the mask pair is a below b.
          const pp = pen.get(key)!;
          const [mskA, mskB, pA, pB] = flip ? [mk.B, mk.A, pp[1], pp[0]] as const : [mk.A, mk.B, pp[0], pp[1]] as const;
          for (const i2 of mk2!.a) mskA[i2] = 1;
          for (const j2 of mk2!.b) mskB[j2] = 1;
          for (const i2 of mk2!.penA) pA[i2] = 1;
          for (const j2 of mk2!.penB) pB[j2] = 1;
        }
        visited.add(key);
        let S = touching.get(_rel);
        if (S === undefined) {
          S = new Set<number>();
          for (let k = 0; k < list.length; k += 3) if (list[k + 2]! < t2) S.add(list[k]! * 65536 + list[k + 1]!);
          touching.set(_rel, S);
        }
        const prev = running.get(key);
        if (prev === undefined) running.set(key, S);
        else if (prev !== S && prev.size > 0) running.set(key, new Set([...prev].filter((c) => S!.has(c))));
      });
      for (const key of masks.keys()) if (!visited.has(key)) running.set(key, new Set());
    }
    for (const [key, set] of running) constant[`${key}@${side}`] = set.size;
  }
  for (const [k, m] of masks) {
    const [pA, pB] = pen.get(k)!;
    for (let i = 0; i < m.A.length; i += 1) if (pA[i] === 1) m.A[i] = 0;
    for (let i = 0; i < m.B.length; i += 1) if (pB[i] === 1) m.B[i] = 0;
  }
  return { masks, constant, uniqueRelativePoses: unique, cache: shared };
}

export interface Penetration {
  readonly a: string;
  readonly b: string;
  readonly ia: number;
  readonly ib: number;
  readonly distMm: number;
}

const worldPoint = (m: Mat4, px: Proxy, i: number): [number, number, number] => {
  const x = px.pts[i * 3]!, y = px.pts[i * 3 + 1]!, z = px.pts[i * 3 + 2]!;
  return [m[0]! * x + m[1]! * y + m[2]! * z + m[3]!, m[4]! * x + m[5]! * y + m[6]! * z + m[7]!, m[8]! * x + m[9]! * y + m[10]! * z + m[11]!];
};

/**
 * Unmasked points of a slip pair that lie inside the other body, within the
 * near cache's margin of it. Press pairs are exempt by class. The
 * near cache may be the one calibrate filled; found repeats a result for a
 * repeated relative pose.
 */
export function penetrations(
  bodies: readonly PosedBody[],
  proxies: ReadonlyMap<string, Proxy>,
  masks: ReadonlyMap<string, BuiltMask>,
  solids: ReadonlyMap<string, Solid>,
  marginMm: number,
  side: "R" | "L",
  caches: { near: Map<string, NearList>; found: Map<string, Penetration[]> },
): Penetration[] {
  const wanted = new Set([...masks].filter(([, m]) => m.fit === "slip").map(([k]) => k));
  const out: Penetration[] = [];
  nearPairs(bodies, proxies, { wanted, marginMm, cache: caches.near, side }, (a, b, list, rel) => {
    if (!caches.found.has(rel)) {
      const mk = masks.get(pairKey(a.n, b.n))!;
      const flip = !(a.n < b.n);
      const mA = flip ? mk.B : mk.A, mB = flip ? mk.A : mk.B;
      const pxA = proxies.get(a.k)!, pxB = proxies.get(b.k)!;
      const found: Penetration[] = [];
      const doneA = new Set<number>(), doneB = new Set<number>();
      for (let k = 0; k < list.length; k += 3) {
        const ii = list[k]!, jj = list[k + 1]!, d = Math.sqrt(list[k + 2]!);
        if (mA[ii] === 0 && !doneA.has(ii)) {
          doneA.add(ii);
          const w = worldPoint(a.m, pxA, ii);
          if (solids.get(b.k)!(...inverseApply(b.m, Float64Array.from(w), 0))) found.push({ a: a.n, b: b.n, ia: ii, ib: jj, distMm: d });
        }
        if (mB[jj] === 0 && !doneB.has(jj)) {
          doneB.add(jj);
          const w = worldPoint(b.m, pxB, jj);
          if (solids.get(a.k)!(...inverseApply(a.m, Float64Array.from(w), 0))) found.push({ a: a.n, b: b.n, ia: ii, ib: jj, distMm: d });
        }
      }
      caches.found.set(rel, found);
    }
    out.push(...caches.found.get(rel)!);
  });
  return out;
}
