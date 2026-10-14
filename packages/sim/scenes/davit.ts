// DAVIT scene data and sweep driver (M02-T06). Pose sets and proxy keys are
// declared here; every placement comes from the DAVIT chain in
// packages/motion (D-139) through the binding core hands the loader
// (src/place.ts), so this file computes no pose. The proxy code in src/proxy
// never names a design.
//
// The std scenes are an R3 and R4 hybrid fixture, not a DAVIT revision: R4 is
// MINI only (originals/davit/files/src/README_R4.md lines 3 to 6), so std
// takes its chain numbers and the std-only parts from the R3 page
// (originals/davit/files/r3/davit.html, lineage copy row davit.collide/r3-page)
// and the palm, jaws and pincap from R4 (davitMeshes below). The mini scenes are
// R4, whose page sim_r4.html is the canonical row davit.collide/r4-page; chain()
// and collide() are the same functions in both pages (computed 2026-10-08).

import { canonicalize, sha256Hex } from "@hackbuild/spec";
import { createPrng } from "../src/prng.js";
import type { BindKinematics, DavitPose, SceneKinematics } from "../src/place.js";
import { collide, pairKey, type Contact, type MaskMap, type NearList, type PairCache, type PosedBody } from "../src/proxy/collide.js";
import { decodeProxy, type DavitData, type Proxy } from "../src/proxy/decode.js";
import { legacyMasks, penetrations, type BuiltMask, type Penetration } from "../src/proxy/masks.js";
import type { Solid } from "../src/proxy/build.js";

export type Model = "std" | "mini";
export type PipeId = "1in" | "125in" | "15in";
export type Side = "R" | "L";
/** `npm run davit:sweep` sets this: the sweeps then cover every pipe the card names, at the cost of minutes (records/davit-sweep.json). */
export const FULL_SWEEP = process.env.HBF_DAVIT_FULL === "1";
export const MODELS: readonly Model[] = ["std", "mini"];
export const PIPES: readonly PipeId[] = ["1in", "125in", "15in"];
export const SIDES: readonly Side[] = ["R", "L"];

export const PRESETS: Readonly<Record<"HANG" | "REACH" | "LIFT" | "TUCK", DavitPose>> = {
  HANG: { pitch: 0, roll: 0, elbow: 0, wrist: 0, grip: 35 },
  REACH: { pitch: 55, roll: 25, elbow: -70, wrist: 40, grip: 30 },
  LIFT: { pitch: -35, roll: 0, elbow: -95, wrist: 0, grip: 6 },
  TUCK: { pitch: 100, roll: 0, elbow: -105, wrist: 90, grip: 3 },
};
export const JOINT_RANGES: Readonly<Record<keyof DavitPose, readonly [number, number, number]>> = {
  pitch: [-120, 120, 2], roll: [-180, 180, 5], elbow: [-110, 110, 2], wrist: [-180, 180, 5], grip: [3, 46, 1],
};

/** Four presets, then each joint of each preset swept alone through its verified range (step 4). */
export function gatedPoseSet(): DavitPose[] {
  const out: DavitPose[] = Object.values(PRESETS).map((p) => ({ ...p }));
  for (const preset of Object.values(PRESETS)) {
    for (const joint of Object.keys(JOINT_RANGES) as (keyof DavitPose)[]) {
      const [lo, hi, step] = JOINT_RANGES[joint];
      for (let v = lo; v <= hi; v += step) out.push({ ...preset, [joint]: v });
    }
  }
  return out;
}

/**
 * The seeded combined set (step 6): all five joints drawn together within
 * their verified range, to 0.1 deg, from the one M02 generator (D-136).
 * Informational: its contacts are recorded, never gated.
 */
export function combinedPoseSet(seed: number, count: number): DavitPose[] {
  const rng = createPrng(seed);
  const draw = ([lo, hi]: readonly number[]): number => Math.round((lo! + rng.next() * (hi! - lo!)) * 10) / 10;
  return Array.from({ length: count }, () => ({
    pitch: draw(JOINT_RANGES.pitch), roll: draw(JOINT_RANGES.roll), elbow: draw(JOINT_RANGES.elbow), wrist: draw(JOINT_RANGES.wrist), grip: draw(JOINT_RANGES.grip),
  }));
}

export const poseTuple = (p: DavitPose): number[] => [p.pitch, p.roll, p.elbow, p.wrist, p.grip];

/** sha256 of the RFC 8785 canonical JSON of the pose list (D-051). */
export function poseSetHash(poses: readonly DavitPose[]): string {
  return sha256Hex(canonicalize(poses.map(poseTuple)));
}

const MINI3 = ["crank", "upper", "fore"];
export const proxyKey = (model: Model, linkOrBase: string): string => (model === "mini" && MINI3.includes(linkOrBase) ? `mini_${linkOrBase}` : linkOrBase);
export const baseKey = (model: Model): string => (model === "mini" ? "mini_base" : "base");

let place: SceneKinematics["davit"]["place"] | undefined;
/** The scene loader (src/scenes.ts) and core/test bind the DAVIT chain of packages/motion here. */
export const bindKinematics: BindKinematics = (k) => {
  place = k.davit.place;
};

/** The proxy key of a placed body: the mount by pipe, links and bases by model, hardware by its kind. */
function keyOf(model: Model, pipe: PipeId, n: string, side: string): string {
  if (n === "mount") return `mount_${pipe}`;
  if (n === "base") return baseKey(model);
  return side !== "" && n.includes("#") ? n.split("#")[0]! : proxyKey(model, n);
}

/** Posed bodies for one configuration: mount, both bases, and the seventeen bodies of each arm. */
export function davitBodies(model: Model, pipe: PipeId, pose: Readonly<Record<Side, DavitPose>>): PosedBody[] {
  if (place === undefined) throw new Error("scenes/davit.ts has no kinematics bound: core binds packages/motion through SceneDeps.kinematics (sim takes place(pose), D-139)");
  return place(model, pipe, pose).map((b) => ({ n: b.n, k: keyOf(model, pipe, b.n, b.side), side: b.side, m: b.m }));
}

export interface RealFail {
  readonly pair: string;
  readonly side: Side | "LR";
  readonly pose: readonly number[];
  readonly distMm: number;
  readonly pointA: number;
  readonly pointB: number;
  readonly declared: boolean;
  /** A point of a slip pair lies inside the other body (Stage B). */
  readonly inside?: boolean;
}

export interface SweepReport {
  readonly model: Model;
  readonly pipe: PipeId;
  readonly side: Side;
  readonly poses: number;
  readonly declaredPairs: number;
  readonly realFails: readonly RealFail[];
  readonly realFailCount: number;
  /** Stage B: unmasked points inside the other body, summed over poses. */
  readonly penetratingPoints: number;
  /** Hits between a body of one arm and a body of the other, or a base or the mount on the other side. */
  readonly leftRightContacts: number;
  /** Closest unmasked approach per declared pair, mm (computed), over the pose set. */
  readonly closest: Readonly<Record<string, number>>;
  readonly wallMs: number;
}

export interface SweepOptions {
  readonly model: Model;
  readonly pipe: PipeId;
  readonly side: Side;
  readonly poses: readonly DavitPose[];
  readonly proxies: ReadonlyMap<string, Proxy>;
  readonly masks: MaskMap;
  readonly touchMm: number;
  readonly lookMm: number;
  /** Closest approach is scanned at every n-th pose (the scan has no early exit); other poses stop at the first hit. */
  readonly closestEvery?: number;
  readonly cache?: PairCache;
  /** Stage B: unmasked points inside the other body are real fails too. */
  readonly penetration?: { readonly masks: ReadonlyMap<string, BuiltMask>; readonly solids: ReadonlyMap<string, Solid>; readonly marginMm: number; readonly near?: Map<string, NearList> };
  /** Pairs allowed to touch by design and fit class; none for Stage A. */
  readonly exempt?: ReadonlySet<string>;
  /** Maximum real fails kept, the count still covers all. */
  readonly keep?: number;
}

/** The pose goes to `side`; the other arm hangs. Real fails are hits outside declared masks. */
export function sweepPoses(o: SweepOptions): SweepReport {
  const t0 = performance.now();
  const other: Side = o.side === "R" ? "L" : "R";
  const fails: RealFail[] = [];
  const closest: Record<string, number> = {};
  let lr = 0, penetrating = 0, total = 0;
  const penCaches = { near: o.penetration?.near ?? new Map<string, NearList>(), found: new Map<string, Penetration[]>() };
  for (const [i, p] of o.poses.entries()) {
    const look = i % (o.closestEvery ?? 1) === 0 ? o.lookMm : o.touchMm;
    const bodies = davitBodies(o.model, o.pipe, { [o.side]: p, [other]: PRESETS.HANG } as Record<Side, DavitPose>);
    for (const c of collide(bodies, o.proxies, o.masks, { touchMm: o.touchMm, lookMm: look, ...(o.cache === undefined ? {} : { cache: o.cache }) })) {
      const key = pairKey(c.a, c.b);
      if (c.declared) closest[key] = Math.min(closest[key] ?? Infinity, c.distMm);
      if (!c.hit || o.exempt?.has(key)) continue;
      const cross = c.sideA !== "" && c.sideB !== "" && c.sideA !== c.sideB;
      if (cross) lr += 1;
      total += 1;
      if (fails.length < (o.keep ?? 200)) fails.push(failOf(c, key, o.side, cross, poseTuple(p)));
    }
    if (o.penetration !== undefined) {
      for (const q of penetrations(bodies, o.proxies, o.penetration.masks, o.penetration.solids, o.penetration.marginMm, o.side, penCaches)) {
        total += 1;
        if (fails.length < (o.keep ?? 200)) fails.push({ pair: pairKey(q.a, q.b), side: o.side, pose: poseTuple(p), distMm: q.distMm, pointA: q.ia, pointB: q.ib, declared: true, inside: true });
        penetrating += 1;
      }
    }
  }
  return {
    model: o.model, pipe: o.pipe, side: o.side, poses: o.poses.length, declaredPairs: o.masks.size,
    realFails: fails, realFailCount: total, penetratingPoints: penetrating, leftRightContacts: lr, closest, wallMs: performance.now() - t0,
  };
}

function failOf(c: Contact, pair: string, side: Side, cross: boolean, pose: number[]): RealFail {
  return { pair, side: cross ? "LR" : side, pose, distMm: c.distMm, pointA: c.ia, pointB: c.ib, declared: c.declared };
}

/** Proxy key of a pair-name part (davit.html resolvePK). */
export function keyOfName(model: Model, pipe: PipeId, name: string): string {
  const b = name.split("#")[0]!;
  if (b === "mount") return `mount_${pipe}`;
  if (b === "base") return baseKey(model);
  return proxyKey(model, b);
}

/** Stage A: the legacy proxies and the legacy masks of one configuration, decoded from DATA. */
export function stageA(data: DavitData, model: Model, pipe: PipeId): { proxies: Map<string, Proxy>; masks: MaskMap } {
  const proxies = new Map<string, Proxy>();
  for (const [k, rec] of Object.entries(data.prox)) proxies.set(k, decodeProxy(rec));
  const pairs = [...(model === "mini" ? data.pairsMini : data.pairs), ...(model === "mini" ? data.hubPairsMini : data.hubPairs)[pipe]!];
  return { proxies, masks: legacyMasks(pairs, (n) => proxies.get(keyOfName(model, pipe, n))!.n) };
}

// ---------------------------------------------------------------- Stage B

import { readFileSync } from "node:fs";
import { importStl, meshHash, snapWeld } from "@hackbuild/mesh";
import { buildProxy, samplePoints, solidOf, type MeshLike } from "../src/proxy/build.js";
import { decodeSoup, extractData, type MeshRecord } from "../src/proxy/decode.js";
import { calibrate, type Calibration, type CalibrationCache, type DeclaredPair } from "../src/proxy/masks.js";

export interface HashedMesh { readonly mesh: MeshLike; readonly hash: string }

/** An STL file as a hashed, welded mesh (the imported route, D-053). */
export function meshOfStl(bytes: Uint8Array, file: string): HashedMesh {
  const b = importStl(bytes, file);
  return { mesh: b.mesh, hash: b.meshHash };
}

/** A DATA parts or hw record as a hashed, welded mesh. */
export function meshOfRecord(rec: MeshRecord): HashedMesh {
  const soup = decodeSoup(rec);
  const welded = snapWeld({ positions: soup, triangles: Uint32Array.from({ length: soup.length / 3 }, (_, i) => i) });
  return { mesh: welded, hash: meshHash(welded) };
}

export interface ContactsFile {
  readonly models: Readonly<Record<Model, { readonly pairs: readonly DeclaredPair[] }>>;
  readonly hub: { readonly a: string; readonly b: string; readonly pipes: readonly PipeId[]; readonly fit: DeclaredPair["fit"] };
}

/** The declared pairs of one model and pipe: the 29 arm pairs plus base x mount (step 3). */
export function declaredPairs(c: ContactsFile, model: Model, pipe: PipeId): DeclaredPair[] {
  return [...c.models[model].pairs, ...(c.hub.pipes.includes(pipe) ? [{ a: c.hub.a, b: c.hub.b, fit: c.hub.fit }] : [])];
}

export interface StageBParams { readonly spacingMm: number; readonly cellMm: number; readonly erodeMm: number }

/** Proxies, solids and mesh hashes for the keys one configuration uses. */
export function stageBProxies(meshes: ReadonlyMap<string, HashedMesh>, model: Model, pipe: PipeId, prm: StageBParams) {
  const keys = new Set<string>();
  for (const b of davitBodies(model, pipe, { R: PRESETS.HANG, L: PRESETS.HANG })) keys.add(b.k);
  const proxies = new Map<string, Proxy>(), solids = new Map<string, Solid>(), hashes = new Map<string, string>();
  for (const k of keys) {
    const m = meshes.get(k);
    if (m === undefined) throw new Error(`no mesh for proxy key ${k}`);
    proxies.set(k, buildProxy(samplePoints(m.mesh, prm.spacingMm), prm.cellMm));
    solids.set(k, solidOf(m.mesh, prm.erodeMm));
    hashes.set(k, m.hash);
  }
  return { proxies, solids, hashes };
}

/** Calibrate Stage B masks for one configuration over a pose list and both sides. */
export function calibrateConfig(
  model: Model, pipe: PipeId, declared: readonly DeclaredPair[], pre: ReturnType<typeof stageBProxies>,
  poses: readonly DavitPose[], touchMm: number, marginMm: number, cache?: CalibrationCache,
): Calibration {
  return calibrate({
    declared, proxies: pre.proxies, keyOf: (n) => keyOfName(model, pipe, n), solids: pre.solids, hashes: pre.hashes,
    poseCount: poses.length, sides: SIDES, poseSetHash: poseSetHash(poses), touchMm, marginMm, ...(cache === undefined ? {} : { cache }),
    bodiesAt: (i, side) => davitBodies(model, pipe, { [side]: poses[i]!, [side === "R" ? "L" : "R"]: PRESETS.HANG } as Record<Side, DavitPose>),
  });
}

const DESIGN = new URL("../../../designs/davit/", import.meta.url);
const stl = (dir: string, key: string): HashedMesh => meshOfStl(readFileSync(new URL(`legacy/${dir}stl/davit_${key}.stl`, DESIGN)), `davit_${key}.stl`);
const dataOf = (file: string): DavitData => extractData(readFileSync(new URL(`legacy/${file}`, DESIGN), "utf8"));

/**
 * Meshes by proxy key. Std takes the R3 parts only the std model has (base,
 * crank, upper, fore), the R4 palm, jaws and pincap shared with mini (the R3
 * palm channel is the 247 mm3 interference of README_R4.md item 8), the three
 * mounts, and the servo and horn meshes of davit.html DATA.hw. Mini takes the
 * R4 STLs and the sim_r4.html DATA.hw.
 */
export function davitMeshes(model: Model): Map<string, HashedMesh> {
  const m = new Map<string, HashedMesh>();
  for (const k of ["mount_1in", "mount_125in", "mount_15in"]) m.set(k, stl("", k));
  for (const k of ["palm", "jaw_drive", "jaw_idle", "pincap"]) m.set(k, stl("r4/", k));
  if (model === "std") {
    for (const k of ["base", "crank", "upper", "fore"]) m.set(k, stl("", k));
    const hw = dataOf("davit.html").hw;
    for (const k of ["std_servo", "std_horn", "mic_servo", "mic_horn"]) m.set(k, meshOfRecord(hw[k]!));
  } else {
    for (const k of ["mini_base", "mini_crank", "mini_upper", "mini_fore"]) m.set(k, stl("r4/", k));
    const hw = dataOf("r4/sim_r4.html").hw;
    for (const k of ["mic_servo", "mic_horn"]) m.set(k, meshOfRecord(hw[k]!));
  }
  return m;
}

export function loadContacts(): ContactsFile {
  return JSON.parse(readFileSync(new URL("contacts.json", DESIGN), "utf8")) as ContactsFile;
}

// ---------------------------------------------------------------- R4 parity (step 11)

import { kernel, loadManifold, scope } from "@hackbuild/mesh";
import { nearPairs } from "../src/proxy/collide.js";

/** sweep.py PAIRS: 31 pairs; pairs with a static body are swept at every pipe, the rest at 125in only. */
export const R4_PAIRS: readonly (readonly [string, string])[] = [
  ["crank", "upper"], ["crank", "hw0"], ["crank", "hw1"], ["crank", "hw2"], ["fore", "upper"], ["hw2", "upper"], ["hw3", "upper"], ["hw4", "upper"],
  ["fore", "palm"], ["fore", "hw4"], ["fore", "hw5"], ["fore", "hw6"], ["jaw_idle", "palm"], ["palm", "pincap"], ["hw6", "palm"], ["hw7", "palm"], ["hw8", "palm"],
  ["jaw_drive", "jaw_idle"], ["jaw_drive", "hw8"], ["jaw_drive", "hw9"], ["jaw_idle", "pincap"], ["hw1", "hw0"], ["hw3", "hw2"], ["hw5", "hw4"], ["hw7", "hw6"],
  ["hw9", "hw8"], ["hw9", "palm"], ["base", "crank"], ["base", "hw0"], ["mount", "base"], ["mount", "crank"],
];
const R4_STATIC = new Set(["mount", "base", "hw0"]);
const R4_DEPTH: Readonly<Record<string, number>> = { hub: 0, crank: 1, upper: 2, fore: 3, palm: 4, jaw_drive: 5, jaw_idle: 5, pincap: 5 };
const R4_LINK_OF = (n: string): string | null => {
  if (n === "base" || n === "mount") return null;
  if (n.startsWith("hw")) return ["hub", "crank", "crank", "upper", "upper", "fore", "fore", "palm", "palm", "jaw_drive"][Number(n.slice(2))]!;
  return n;
};
const depthOf = (n: string): number => { const l = R4_LINK_OF(n); return l === null ? 0 : R4_DEPTH[l]!; };
const JOINT_AT = ["", "pitch", "roll", "elbow", "wrist", "grip"] as const;

export interface R4Case { readonly pipe: PipeId; readonly a: string; readonly b: string }

/** The 43 pair sweeps of sweep.py main: 31 at 125in, the 6 static pairs again at 1in and 15in. */
export function r4Cases(): R4Case[] {
  const out: R4Case[] = [];
  for (const pipe of PIPES) {
    for (const [a, b] of R4_PAIRS) {
      if (pipe !== "125in" && !(R4_STATIC.has(a) || R4_STATIC.has(b))) continue;
      out.push({ pipe, a, b });
    }
  }
  return out;
}

/** The poses of one pair sweep: the deepest joint between the two bodies through its range, the rest at zero and grip 25 deg. */
export function r4PairPoses(a: string, b: string): DavitPose[] {
  const da = depthOf(a), db = depthOf(b);
  const base: DavitPose = { pitch: 0, roll: 0, elbow: 0, wrist: 0, grip: 25 };
  const isStatic = R4_STATIC.has(a) || R4_STATIC.has(b);
  const joint = da === 5 && db === 5 ? "grip" : da === db ? null : JOINT_AT[Math.max(da, db)]!;
  if (joint === null) return [base];
  const [lo, hi] = JOINT_RANGES[joint as keyof DavitPose];
  const steps = isStatic ? 121 : 91;
  return Array.from({ length: steps }, (_, i) => ({ ...base, [joint]: lo + ((hi - lo) * i) / (steps - 1) }));
}

/** sweep.py names to sim body names: hw0 to mic_servo#0, hw1 to mic_horn#1. */
export const r4BodyName = (n: string): string => (n.startsWith("hw") ? `mic_${Number(n.slice(2)) % 2 === 0 ? "servo" : "horn"}#${Number(n.slice(2))}` : n);

export function r4PairBodies(pipe: PipeId, pose: DavitPose, a: string, b: string): PosedBody[] {
  const want = new Set([r4BodyName(a), r4BodyName(b)]);
  return davitBodies("mini", pipe, { R: pose, L: PRESETS.HANG }).filter((x) => want.has(x.n) && x.side !== "L");
}

export interface PairSweepResult { readonly case: R4Case; readonly poses: number; readonly minSampledMm: number; readonly worst: readonly number[] | null; readonly intersectionMm3: number }

/** Smallest sampled distances of one pair over its sweep, ascending, at most keep poses, with the pose index. */
export function sampledApproach(c: R4Case, proxies: ReadonlyMap<string, Proxy>, reachMm: number, keep: number): { dist: number; at: number }[] {
  const poses = r4PairPoses(c.a, c.b);
  const wanted = new Set([pairKey(r4BodyName(c.a), r4BodyName(c.b))]);
  const near = new Map<string, NearList>();
  const found: { dist: number; at: number }[] = [];
  poses.forEach((p, at) => {
    let best = Infinity;
    nearPairs(r4PairBodies(c.pipe, p, c.a, c.b), proxies, { wanted, marginMm: reachMm, cache: near }, (_a, _b, list) => {
      for (let k = 2; k < list.length; k += 3) best = Math.min(best, Math.sqrt(list[k]!));
    });
    if (best < Infinity) found.push({ dist: best, at });
  });
  return found.sort((x, y) => x.dist - y.dist || x.at - y.at).slice(0, keep);
}

/** Exact intersection volume, mm3 (computed), of the two bodies at a pose; the horn is clipped by the hub shave. */
export async function intersectionMm3(c: R4Case, pose: DavitPose, meshes: ReadonlyMap<string, HashedMesh>, hornShaveMm: number): Promise<number> {
  await loadManifold();
  return scope(() => {
    const wasm = kernel();
    const solid = (key: string) => {
      const m = meshes.get(key)!.mesh;
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
      mesh.merge();
      let man = wasm.Manifold.ofMesh(mesh);
      if (key === "mic_horn") {
        let top = -Infinity;
        for (let i = 2; i < m.positions.length; i += 3) top = Math.max(top, m.positions[i]!);
        man = man.intersect(wasm.Manifold.cube([200, 200, 200], false).translate([-100, -100, top - hornShaveMm - 200]));
      }
      return man;
    };
    const bodies = r4PairBodies(c.pipe, pose, c.a, c.b);
    const placed = bodies.map((b) => {
      const m = b.m;
      const colMajor = [m[0]!, m[4]!, m[8]!, 0, m[1]!, m[5]!, m[9]!, 0, m[2]!, m[6]!, m[10]!, 0, m[3]!, m[7]!, m[11]!, 1];
      return solid(b.k).transform(colMajor as never);
    });
    return placed[0]!.intersect(placed[1]!).volume();
  });
}
