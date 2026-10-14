// The sim scene registry (M02-T11 step 2): every scene the hbf sim commands
// run, by id, with the module under packages/sim/scenes/ that holds its
// data, the mode it runs in and the expectation it declares. Legacy designs
// have no chase until M10, so `hbf <command> --scene <id>` resolves here;
// the flag is CLI-only and goes when every scene has a chase.
//
// The runners measure. Where a scene declares an expectation (a pass set,
// zero real fails, an empty clash set, every hook inserting), the runner
// compares measured against declared and says whether they are equal; the
// command turns that into a verdict and an exit code (D-064, D-074). The
// fixture scenes (ogee16-cranks-proud, cotter-hook-sharp) declare what the
// design requires, the same as their shipped scenes, so the command fails
// on them.
//
// Scene modules are TypeScript under packages/sim/scenes/, loaded at run
// time through the caller's SceneDeps.load (this package is headless and
// reads no file). Under plain Node a scene needs a resolve hook that
// retries a missing relative .js as .ts (core registers
// core/dist/resolve-hook.js); vitest resolves them itself.
// Nothing physical is typed here: steps, clash volume, touch and reach are
// profile rows the caller's lookup supplies.

import { canonicalize, commandError, didYouMean, sha256Hex, type Hash, type TrialResult } from "@hackbuild/spec";
import { applyPoint, type BindKinematics, type DavitPose, type Mat4, type SceneKinematics } from "./place.js";
import { collide, pairKey, type Contact, type MaskMap, type PosedBody } from "./proxy/collide.js";
import { extractData, type DavitData, type Proxy } from "./proxy/decode.js";
import type { PrismaticLaneResult } from "./sweep/prismatic.js";
import type { InsertPose } from "./sweep/insert.js";
import type { HookDims } from "./programs/cotter/hook.js";
import type { RotateSweepResult } from "./sweep/rotate.js";
import { applyVariant, runSlugTrials, slugVerdict, type SlugScene, type SlugSceneVariant } from "./capsule/vend.js";
import type { PawlScene } from "./programs/pawl/suite.js";

export type SweepMode = "pose" | "rotate" | "prismatic" | "insert";
export const SWEEP_MODES: readonly SweepMode[] = ["pose", "rotate", "prismatic", "insert"];

export interface SceneDef {
  readonly id: string;
  /** Module under packages/sim/scenes/ that holds the scene. */
  readonly file: string;
  /** sim.run runs trials; sim.sweep runs the one sweep mode the scene has; check.run audits the poses of an audit scene (M04-T11). */
  readonly runs: "trials" | SweepMode | "audit";
  /** asm.solve and part.probe place the scene's bodies (DAVIT). */
  readonly assembly: boolean;
  /** What the scene declares, in words; null when it declares nothing (informational). */
  readonly declares: string | null;
  readonly note: string;
}

const DAVIT_DECLARES = "0 real fails and 0 left-right contacts, both arms";

/** Every registered scene, in the order the CLI lists them. */
export const SIM_SCENES: readonly SceneDef[] = [
  { id: "slug", file: "slug.ts", runs: "trials", assembly: false, declares: "126 of 128 vends deliver one capsule over 8 trials, misses on vend 1 (BUILD.md)", note: "SLUG capsule machine, 8 trials of 16 vends" },
  { id: "slug-mouth58", file: "slug-mouth58.ts", runs: "trials", assembly: false, declares: null, note: "SLUG with the 58 mm mouth, 6 trials of 13 vends, informational" },
  { id: "slug-vend1", file: "slug.ts", runs: "trials", assembly: false, declares: null, note: "SLUG single vend: one trial, one vend; the commit-at-command scene" },
  { id: "pawl", file: "pawl.ts", runs: "trials", assembly: false, declares: "the declared PAWL pass set (scene pawl)", note: "PAWL biped, 17 Rapier trials" },
  { id: "ogee16-cranks", file: "ogee16-cranks.ts", runs: "rotate", assembly: false, declares: "no swept clash over ogee16.sweepClashMm3", note: "OGEE16 nine cranks, shipped print STLs" },
  { id: "ogee16-cranks-proud", file: "ogee16-cranks.ts", runs: "rotate", assembly: false, declares: "no swept clash over ogee16.sweepClashMm3", note: "OGEE16 proud-head fixture cranks" },
  { id: "ogee16-printed", file: "ogee16-printed.ts", runs: "audit", assembly: false, declares: "0 clashes in each of 4 poses (audit_print.py)", note: "OGEE R16-P printed assembly at the 4 audit_print.py poses, shipped print STLs" },
  { id: "ogee16-printed-negatives", file: "ogee16-printed.ts", runs: "audit", assembly: false, declares: "0 clashes in each pose (audit_print.py)", note: "OGEE R16-P printed assembly, row bar 0 and column bar 1 driven 3 mm past the stroke" },
  { id: "cotter-hook", file: "cotter-hook.ts", runs: "insert", assembly: false, declares: "every hook INSERTS", note: "COTTER hook_fit.py verify pairs and the kit board" },
  { id: "cotter-hook-sharp", file: "cotter-hook.ts", runs: "insert", assembly: false, declares: "every hook INSERTS", note: "COTTER sharp-bend fixture" },
  { id: "sash-slide", file: "sash-slide.ts", runs: "prismatic", assembly: false, declares: "0 overlap cells in every lane", note: "SASH battery preset slide" },
  { id: "davit-std-1in", file: "davit.ts", runs: "pose", assembly: true, declares: DAVIT_DECLARES, note: "DAVIT std arms on 1 in pipe, legacy proxies and masks" },
  { id: "davit-std-125in", file: "davit.ts", runs: "pose", assembly: true, declares: DAVIT_DECLARES, note: "DAVIT std arms on 1-1/4 in pipe, legacy proxies and masks" },
  { id: "davit-std-15in", file: "davit.ts", runs: "pose", assembly: true, declares: DAVIT_DECLARES, note: "DAVIT std arms on 1-1/2 in pipe, legacy proxies and masks" },
  { id: "davit-mini-1in", file: "davit.ts", runs: "pose", assembly: true, declares: DAVIT_DECLARES, note: "DAVIT MINI arms (micro servos at every joint) on 1 in pipe, legacy proxies and masks" },
  { id: "davit-mini-125in", file: "davit.ts", runs: "pose", assembly: true, declares: DAVIT_DECLARES, note: "DAVIT MINI arms (micro servos at every joint) on 1-1/4 in pipe, legacy proxies and masks" },
  { id: "davit-mini-15in", file: "davit.ts", runs: "pose", assembly: true, declares: DAVIT_DECLARES, note: "DAVIT MINI arms (micro servos at every joint) on 1-1/2 in pipe, legacy proxies and masks" },
];

/** The scene with this id; E_REF with up to three didYouMean otherwise. */
export function sceneDef(id: string): SceneDef {
  const def = SIM_SCENES.find((s) => s.id === id);
  if (def !== undefined) return def;
  const ids = SIM_SCENES.map((s) => s.id);
  throw commandError({
    code: "E_REF", path: "/scene", got: id, expected: "a registered sim scene", didYouMean: didYouMean(id, ids),
    hint: `no sim scene ${id}; scenes are ${ids.join(", ")}`, record: "viewer-sim",
  });
}

/** What the runners read from profile and from the caller. */
export interface SceneDeps {
  constant(id: string): { readonly value: number };
  /** Imports a scene module by its file name under packages/sim/scenes/. */
  load(file: string): Promise<unknown>;
  /** Reads a repository file as UTF-8 text, by its path from the repository root. */
  readText(path: string): string;
  /** Hook dims for a hole and board, mm (core binds mech/hook-rule); needed by the cotter scenes. */
  readonly hookDesign?: (hole: number, tb: number) => HookDims;
  /** Wall clock for wallMs only, ms; never reaches the physics. */
  readonly now?: () => number;
  /** The placements of the machines a scene moves (core binds packages/motion); needed by the davit and ogee16-cranks scenes. */
  readonly kinematics?: SceneKinematics;
}

/** Measured against declared, both in words. */
export interface Expectation {
  readonly declared: string;
  readonly measured: string;
  /** Measured equals declared (computed). */
  readonly met: boolean;
}

/** Imports a scene module and hands it the caller's kinematics when it reads placements. */
async function load<T>(deps: SceneDeps, file: string): Promise<T> {
  const m = (await deps.load(file)) as T & { readonly bindKinematics?: BindKinematics };
  if (m.bindKinematics !== undefined && deps.kinematics !== undefined) m.bindKinematics(deps.kinematics);
  return m;
}

const hashOf = (v: unknown): Hash => sha256Hex(canonicalize(v)) as Hash;

function schema(path: string, got: unknown, expected: string, hint: string): never {
  throw commandError({ code: "E_SCHEMA", path, got, expected, hint, record: "viewer-sim" });
}

// ---------------------------------------------------------------- sim.run

export interface TrialRowView {
  readonly trial: string;
  readonly seed: number;
  /** Runs and passes in this trial, count (computed). */
  readonly runs: number;
  readonly passes: number;
  /** Rapier snapshot hash (pawl) or capsule end-state hash (slug). */
  readonly hash: Hash;
  /** The trial's own measurements as its runner returns them. */
  readonly detail: Readonly<Record<string, unknown>>;
}

export interface TrialsRun {
  readonly scene: string;
  readonly trials: TrialResult;
  readonly hashKind: "snapshot" | "end-state";
  readonly rows: readonly TrialRowView[];
  readonly expectation: Expectation | null;
  /** Why a declared expectation was not compared, when it was not. */
  readonly notCompared?: string;
}

interface SlugModule { readonly SLUG_SCENE: SlugScene }
interface SlugMouthModule { readonly SLUG_MOUTH58: SlugSceneVariant }
interface PawlModule { readonly PAWL_SCENE: PawlScene }

/** The single-vend scene: SLUG with one vend and one trial, no expectation (M02-T11 step 8). */
export const SLUG_VEND1: SlugSceneVariant = {
  id: "slug-vend1",
  base: "slug",
  geometry: { provenance: { tier: "inferred", method: "derived", date: "2026-10-07", source: "the slug scene geometry, unchanged" } },
  protocol: { provenance: { tier: "inferred", method: "derived", date: "2026-10-07", source: "docs/plan/milestones/M02-sim.md M02-T11 step 8: the SLUG single-vend scene" }, vends: 1 },
  trials: 1,
  seed: 1,
  status: "informational",
};

/** The capsule scene behind a slug scene id. */
export async function slugScene(id: string, deps: SceneDeps): Promise<SlugScene> {
  const base = (await load<SlugModule>(deps, "slug.ts")).SLUG_SCENE;
  if (id === "slug") return base;
  if (id === "slug-vend1") return applyVariant(base, SLUG_VEND1);
  if (id === "slug-mouth58") return applyVariant(base, (await load<SlugMouthModule>(deps, "slug-mouth58.ts")).SLUG_MOUTH58);
  return schema("/scene", id, "a slug scene", `${id} is not a slug scene`);
}

function positiveInt(path: string, v: number | undefined): void {
  if (v !== undefined && !(Number.isInteger(v) && v >= 1)) schema(path, v, "an integer from 1", `${path.slice(1)} ${String(v)}, legal an integer from 1`);
}

/** sim.run on a trials scene: n trials from seed (the scene's defaults when absent). */
export async function runTrials(id: string, opts: { readonly trials?: number; readonly seed?: number }, deps: SceneDeps): Promise<TrialsRun> {
  const def = sceneDef(id);
  if (def.runs === "audit") schema("/scene", id, "a trials scene", `${id} is an audit scene; run check.run --scene ${id}`);
  if (def.runs !== "trials") schema("/scene", id, "a trials scene", `${id} runs sim.sweep --mode ${def.runs}, not sim.run`);
  positiveInt("/trials", opts.trials);
  if (opts.seed !== undefined && !Number.isSafeInteger(opts.seed)) schema("/seed", opts.seed, "an integer", "seed is an integer");
  const now = deps.now ?? Date.now;
  if (id === "pawl") {
    const scene = (await load<PawlModule>(deps, "pawl.ts")).PAWL_SCENE;
    const n = opts.trials ?? scene.trials.length;
    if (n > scene.trials.length) schema("/trials", n, `at most ${scene.trials.length}`, `the PAWL suite has ${scene.trials.length} trials; pass --trials ${scene.trials.length} or fewer`);
    const run = scene.trials.length === n ? scene : { ...scene, trials: scene.trials.slice(0, n) };
    const { runPawlSuite } = await import("./programs/pawl/suite.js");
    const r = await runPawlSuite(run, now);
    const v = r.verdict;
    return {
      scene: id, trials: r.trials, hashKind: "snapshot",
      rows: r.rows.map((t) => ({ trial: t.label, seed: scene.seed, runs: 1, passes: t.ok ? 1 : 0, hash: t.snapshotHash, detail: { ...t } })),
      expectation: {
        declared: `stand: ${v.declaredPass.join(", ")}`,
        measured: v.exitCode === 0 ? `stand: ${v.measuredPass.join(", ")}` : `stand only in the run: ${v.onlyMeasured.join(", ") || "none"}; stand only in the declaration: ${v.onlyDeclared.join(", ") || "none"}`,
        met: v.exitCode === 0,
      },
    };
  }
  const scene = await slugScene(id, deps);
  const n = opts.trials ?? scene.trials;
  const seed = opts.seed ?? scene.seed;
  const run = runSlugTrials(scene, n, seed, now);
  const rows = run.rows.map((t): TrialRowView => ({ trial: `seed ${t.seed}`, seed: t.seed, runs: t.vends, passes: t.passes, hash: t.endHash, detail: { ...t } }));
  const e = scene.expected;
  if (e === null) return { scene: id, trials: run.result, hashKind: "end-state", rows, expectation: null };
  if (n !== e.trials || seed !== scene.seed) {
    return { scene: id, trials: run.result, hashKind: "end-state", rows, expectation: null, notCompared: `the declaration covers ${e.trials} trials from seed ${scene.seed}; this run is ${n} from seed ${seed}` };
  }
  const v = slugVerdict(scene, run);
  return { scene: id, trials: run.result, hashKind: "end-state", rows, expectation: { declared: `${e.passes} of ${e.runs} reproduced, misses on vend ${e.missVends.join(", ")}`, measured: v.line, met: v.met } };
}

// ---------------------------------------------------------------- sim.sweep

/** Closest approach of one moving body over the sweep. */
export interface SweepClosest {
  readonly body: string;
  readonly with: string;
  /** Closest approach, mm (computed), by `measure`. */
  readonly mm: number;
  /** Where it occurs, mm; null where the mode keeps no point (pose). */
  readonly at: readonly number[] | null;
  /** Step, position or pose where it occurs. */
  readonly state: string;
  readonly measure: string;
  /** Further measures at the same place, unit in the key suffix (computed). */
  readonly extra?: Readonly<Record<string, number>>;
  readonly line: string;
}

export interface SweepClash {
  readonly body: string;
  readonly with: string;
  /** Interference volume, mm3 (computed); null where the mode measures distance only (pose, prismatic cells). */
  readonly mm3: number | null;
  /** Overlapping raster cells, count (computed), prismatic only. */
  readonly cells?: number;
  readonly masked: boolean;
}

export interface SweepRun {
  readonly scene: string;
  readonly mode: SweepMode;
  /** Hash of what was swept: placed surfaces (rotate), outcomes (insert, prismatic, pose). */
  readonly sweptHash: Hash;
  /** Poses evaluated, count. */
  readonly poses: number;
  readonly clashes: readonly SweepClash[];
  readonly closest: readonly SweepClosest[];
  /** pose mode: hits outside the declared masks, as found (computed). */
  readonly realFails?: readonly { readonly pair: string; readonly side: string; readonly pose: readonly number[]; readonly distMm: number }[];
  readonly realFailCount?: number;
  /** insert mode: one row per hook case. */
  readonly cases?: readonly InsertCaseView[];
  readonly expectation: Expectation;
  readonly wallMs: number;
}

export interface InsertCaseView {
  readonly id: string;
  /** mm */
  readonly hole: number;
  /** mm */
  readonly tb: number;
  readonly dims: HookDims;
  readonly verdict: "INSERTS" | "TRAPPED";
  readonly stop: string;
  /** count */
  readonly poses: number;
  /** deg */
  readonly maxTiltDeg: number;
  readonly clearing: InsertPose | null;
}

const fix2 = (v: number): string => v.toFixed(2);

interface OgeeModule {
  runOgeeSweep(variant: "shipped" | "proud", steps: number, clashMm3: number): Promise<{
    readonly results: readonly RotateSweepResult[];
    readonly clashes: readonly { readonly sweep: string; readonly with: string; readonly mm3: number; readonly stepSumMm3: number }[];
    readonly near: readonly { readonly sweep: string; readonly box: string; readonly cornerMm: number; readonly gapMm: number }[];
  }>;
}

async function rotateRun(id: string, steps: number | undefined, deps: SceneDeps): Promise<SweepRun> {
  const n = steps ?? deps.constant("ogee16.sweepSteps").value;
  const clashMm3 = deps.constant("ogee16.sweepClashMm3").value;
  const t0 = (deps.now ?? Date.now)();
  const r = await (await load<OgeeModule>(deps, "ogee16-cranks.ts")).runOgeeSweep(id === "ogee16-cranks-proud" ? "proud" : "shipped", n, clashMm3);
  const wallMs = (deps.now ?? Date.now)() - t0;
  const closest = r.near.map((x): SweepClosest => {
    const row = r.results.find((s) => s.part === x.sweep)!;
    const a = row.approach.find((b) => b.with === x.box)!;
    return {
      body: x.sweep, with: x.box, mm: x.cornerMm, at: a.at, state: `step ${a.step} of ${row.poses}`,
      measure: "box corners to the swept surface (check_sweep.py); gapMm is the true box gap, at and state locate it",
      extra: { gapMm: x.gapMm },
      line: `${x.sweep} to ${x.box}: ${fix2(x.cornerMm)} mm corner, ${fix2(x.gapMm)} mm gap (computed)`,
    };
  });
  const clashes = r.clashes.map((c): SweepClash => ({ body: c.sweep, with: c.with, mm3: c.mm3, masked: false }));
  return {
    scene: id, mode: "rotate", sweptHash: hashOf(r.results.map((s) => [s.part, s.sweptHash])), poses: r.results.reduce((s, x) => s + x.poses, 0),
    clashes, closest,
    expectation: {
      declared: `no swept clash over ${String(clashMm3)} mm3`,
      measured: clashes.length === 0 ? "no swept clash" : `${clashes.length} clashes: ${clashes.map((c) => `${c.body} with ${c.with} ${fix2(c.mm3 ?? 0)} mm3`).join("; ")}`,
      met: clashes.length === 0,
    },
    wallMs,
  };
}

interface HookCaseDef { readonly id: string; readonly hole: number; readonly tb: number; readonly expect: string; readonly dims?: HookDims }
interface CotterModule {
  hookCases(): HookCaseDef[];
  readonly SHARP_CASE: HookCaseDef;
  runHookCase(c: HookCaseDef, design: (hole: number, tb: number) => HookDims, p: SceneDeps): Promise<InsertCaseView & { readonly wallMs: number }>;
}

async function insertRun(id: string, deps: SceneDeps): Promise<SweepRun> {
  const design = deps.hookDesign;
  if (design === undefined) schema("/hookDesign", null, "a hook design binding", "the cotter scenes need the mech/hook-rule binding the caller supplies");
  const m = await load<CotterModule>(deps, "cotter-hook.ts");
  const list = id === "cotter-hook-sharp" ? [m.SHARP_CASE] : m.hookCases();
  const cases: InsertCaseView[] = [];
  let wallMs = 0;
  for (const c of list) {
    const r = await m.runHookCase(c, design, deps);
    wallMs += r.wallMs;
    cases.push({ id: r.id, hole: r.hole, tb: r.tb, dims: r.dims, verdict: r.verdict, stop: r.stop, poses: r.poses, maxTiltDeg: r.maxTiltDeg, clearing: r.clearing });
  }
  const trapped = cases.filter((c) => c.verdict !== "INSERTS");
  return {
    scene: id, mode: "insert", sweptHash: hashOf(cases.map((c) => [c.id, c.verdict, c.poses, c.clearing?.state ?? null])),
    poses: cases.reduce((s, c) => s + c.poses, 0), clashes: [], closest: [], cases,
    expectation: {
      declared: "every hook INSERTS",
      measured: trapped.length === 0 ? `${cases.length} of ${cases.length} INSERTS` : `${cases.length - trapped.length} of ${cases.length} INSERTS; TRAPPED ${trapped.map((c) => `${c.id} (max tilt ${c.maxTiltDeg} deg)`).join(", ")}`,
      met: trapped.length === 0,
    },
    wallMs,
  };
}

interface SashModule { sashSlideSweep(slug: string): PrismaticLaneResult[] }

async function prismaticRun(id: string, deps: SceneDeps): Promise<SweepRun> {
  const t0 = (deps.now ?? Date.now)();
  const lanes = (await load<SashModule>(deps, "sash-slide.ts")).sashSlideSweep("battery-default");
  const wallMs = (deps.now ?? Date.now)() - t0;
  const clashes = lanes.filter((l) => l.overlapCells > 0).map((l): SweepClash => ({ body: l.name, with: "shell wall", mm3: null, cells: l.overlapCells, masked: false }));
  const closest = lanes.flatMap((l): SweepClosest[] => (l.closest === null ? [] : [{
    body: l.name, with: "shell wall", mm: l.closest.mm, at: l.closest.slideAt, state: `k ${l.closest.k} pitches`,
    measure: "slide body cell to wall cell, centre distance less half a pitch each side (design frame)",
    extra: { wallXMm: l.closest.wallAt[0], wallYMm: l.closest.wallAt[1] },
    line: `${l.name} to shell wall: ${fix2(l.closest.mm)} mm at k ${l.closest.k} (computed)`,
  }]));
  return {
    scene: id, mode: "prismatic", sweptHash: hashOf(lanes.map((l) => [l.name, l.rows.map((r) => [r.k, r.cells])])),
    poses: lanes.reduce((s, l) => s + l.poses, 0), clashes, closest,
    expectation: {
      declared: "0 overlap cells in every lane",
      measured: clashes.length === 0 ? "0 overlap cells in every lane" : clashes.map((c) => `${c.body} ${String(c.cells)} cells`).join("; "),
      met: clashes.length === 0,
    },
    wallMs,
  };
}

// ---------------------------------------------------------------- DAVIT

type Side = "R" | "L";
/** The two arm builds davit.html carries: std (DATA.const, DATA.pairs) and MINI (DATA.constm, DATA.pairsMini). */
type DavitModel = "std" | "mini";
type PresetName = "HANG" | "REACH" | "LIFT" | "TUCK";

interface DavitModule {
  readonly PRESETS: Readonly<Record<PresetName, DavitPose>>;
  readonly JOINT_RANGES: Readonly<Record<keyof DavitPose, readonly [number, number, number]>>;
  readonly SIDES: readonly Side[];
  davitBodies(model: DavitModel, pipe: string, pose: Readonly<Record<Side, DavitPose>>): PosedBody[];
  stageA(data: DavitData, model: DavitModel, pipe: string): { proxies: Map<string, Proxy>; masks: MaskMap };
  gatedPoseSet(): DavitPose[];
  poseTuple(p: DavitPose): number[];
  sweepPoses(o: {
    model: DavitModel; pipe: string; side: Side; poses: readonly DavitPose[]; proxies: ReadonlyMap<string, Proxy>; masks: MaskMap;
    touchMm: number; lookMm: number; cache?: Map<string, Contact | null>; keep?: number;
  }): {
    readonly realFails: readonly { pair: string; side: string; pose: readonly number[]; distMm: number }[];
    readonly realFailCount: number; readonly leftRightContacts: number; readonly closest: Readonly<Record<string, number>>; readonly poses: number;
  };
}

interface DavitSetup {
  readonly m: DavitModule;
  readonly model: DavitModel;
  readonly pipe: string;
  readonly proxies: Map<string, Proxy>;
  readonly masks: MaskMap;
  readonly touchMm: number;
}

const davitData = new WeakMap<SceneDeps, DavitData>();

async function davitSetup(id: string, deps: SceneDeps): Promise<DavitSetup> {
  const def = sceneDef(id);
  if (!def.assembly) schema("/scene", id, "a DAVIT scene (davit-<std|mini>-<pipe>)", `${id} has no placed assembly; asm.solve and part.probe place the davit scenes`);
  const m = await load<DavitModule>(deps, "davit.ts");
  let data = davitData.get(deps);
  if (data === undefined) davitData.set(deps, (data = extractData(deps.readText("designs/davit/legacy/davit.html"))));
  // Scene ids are davit-<model>-<pipe>; SIM_SCENES registers no other assembly scene.
  const [, model, pipe] = id.split("-") as [string, DavitModel, string];
  const { proxies, masks } = m.stageA(data, model, pipe);
  return { m, model, pipe, proxies, masks, touchMm: deps.constant("davit.touchMm").value };
}

async function poseRun(id: string, deps: SceneDeps): Promise<SweepRun> {
  const s = await davitSetup(id, deps);
  const lookMm = deps.constant("davit.closestReachMm").value;
  const poses = s.m.gatedPoseSet();
  const t0 = (deps.now ?? Date.now)();
  const fails: { pair: string; side: string; pose: readonly number[]; distMm: number }[] = [];
  let failCount = 0, lr = 0;
  const closest: SweepClosest[] = [];
  const cache = new Map<string, Contact | null>();
  for (const side of s.m.SIDES) {
    // One pose at a time so the closest approach of each pair keeps the pose it came from.
    const best = new Map<string, { mm: number; pose: readonly number[] }>();
    for (const p of poses) {
      const r = s.m.sweepPoses({ model: s.model, pipe: s.pipe, side, poses: [p], proxies: s.proxies, masks: s.masks, touchMm: s.touchMm, lookMm, cache });
      failCount += r.realFailCount;
      lr += r.leftRightContacts;
      if (fails.length < 200) fails.push(...r.realFails.slice(0, 200 - fails.length));
      for (const [pair, mm] of Object.entries(r.closest)) {
        const b = best.get(pair);
        if (b === undefined || mm < b.mm) best.set(pair, { mm, pose: s.m.poseTuple(p) });
      }
    }
    for (const [pair, b] of [...best].sort(([a], [c]) => (a < c ? -1 : a > c ? 1 : 0))) {
      closest.push({
        body: `${pair.split("|")[0]!}@${side}`, with: `${pair.split("|")[1]!}@${side}`, mm: b.mm, at: null, state: `pose ${b.pose.join(",")} (pitch, roll, elbow, wrist, grip deg)`,
        measure: "closest unmasked proxy point pair of a declared pair (davit.html collide)",
        line: `${pair} ${side}: ${fix2(b.mm)} mm (computed)`,
      });
    }
  }
  const wallMs = (deps.now ?? Date.now)() - t0;
  const clashPairs = [...new Set(fails.map((f) => `${f.pair}|${f.side}`))];
  return {
    scene: id, mode: "pose", sweptHash: hashOf({ poses: poses.map(s.m.poseTuple), closest: closest.map((c) => [c.body, c.mm]), fails: failCount }),
    poses: poses.length * s.m.SIDES.length,
    clashes: clashPairs.map((k): SweepClash => {
      const [a, b, side] = k.split("|");
      return { body: `${a!}@${side!}`, with: `${b!}@${side!}`, mm3: null, masked: false };
    }),
    closest, realFails: fails, realFailCount: failCount,
    expectation: { declared: DAVIT_DECLARES, measured: `${failCount} real fails, ${lr} left-right contacts`, met: failCount === 0 && lr === 0 },
    wallMs,
  };
}

/** sim.sweep: the scene's sweep; mode, when given, must be the scene's. */
export async function runSweep(id: string, opts: { readonly mode?: string; readonly steps?: number }, deps: SceneDeps): Promise<SweepRun> {
  const def = sceneDef(id);
  if (def.runs === "trials") schema("/scene", id, "a sweep scene", `${id} runs trials; use sim.run --scene ${id}`);
  if (def.runs === "audit") schema("/scene", id, "a sweep scene", `${id} is an audit scene; run check.run --scene ${id}`);
  if (opts.mode !== undefined && opts.mode !== def.runs) {
    schema("/mode", opts.mode, def.runs, `scene ${id} sweeps in mode ${def.runs}; pass --mode ${def.runs} or leave it out`);
  }
  if (opts.steps !== undefined) {
    if (def.runs !== "rotate") schema("/steps", opts.steps, "absent", `mode ${def.runs} takes its positions from the scene; --steps applies to mode rotate`);
    if (!(Number.isInteger(opts.steps) && opts.steps >= 2)) schema("/steps", opts.steps, "an integer of at least 2", "a sweep needs both ends of the motion");
  }
  if (def.runs === "rotate") return rotateRun(id, opts.steps, deps);
  if (def.runs === "insert") return insertRun(id, deps);
  if (def.runs === "prismatic") return prismaticRun(id, deps);
  return poseRun(id, deps);
}

// ---------------------------------------------------------------- asm.solve

/** Bisection steps of davit.html attempt() (line 626), count. */
export const CLAMP_ITERATIONS = 8;

export interface Placement {
  readonly body: string;
  readonly side: "" | Side;
  /** Row-major 4x4, mm. */
  readonly m: Mat4;
}

export interface PairClosest {
  readonly pair: string;
  readonly side: "" | Side;
  /** Closest unmasked approach, mm (computed). */
  readonly mm: number;
  /** World points on a and b as the pair is keyed, mm. */
  readonly a: readonly number[];
  readonly b: readonly number[];
}

export interface ClampResult {
  readonly joint: keyof DavitPose;
  /** deg */
  readonly from: number;
  readonly requested: number;
  /** Last clear value after the bisection, deg (computed); equal to requested when the request is clear. */
  readonly clamped: number;
  /** First value the bisection found in contact, deg; null when the request is clear. */
  readonly contactAt: number | null;
  /** count */
  readonly iterations: number;
  /** Real fails at the requested value, count (computed). */
  readonly failsAtRequest: number;
}

export interface AsmRun {
  readonly scene: string;
  readonly pose: PresetName;
  readonly joints: DavitPose;
  readonly placements: readonly Placement[];
  readonly realFails: readonly { readonly pair: string; readonly sides: string; readonly distMm: number }[];
  readonly closest: readonly PairClosest[];
  readonly clamp?: ClampResult;
  readonly expectation: Expectation;
}

const PRESET_NAMES: readonly PresetName[] = ["HANG", "REACH", "LIFT", "TUCK"];

function presetOf(name: string | undefined): PresetName {
  const n = (name ?? "HANG").toUpperCase();
  if (!(PRESET_NAMES as readonly string[]).includes(n)) {
    throw commandError({ code: "E_REF", path: "/pose", got: name, expected: "a named pose", didYouMean: didYouMean(n, PRESET_NAMES), hint: `poses are ${PRESET_NAMES.join(", ")}`, record: "viewer-sim" });
  }
  return n as PresetName;
}

/** Hits outside the masks: the contacts davit.html collide() paints. */
function realFailsOf(contacts: readonly Contact[]): Contact[] {
  return contacts.filter((c) => c.hit);
}

/** Both arms at the joints (davit.html `linked`, true by default, line 201). */
function bodiesAt(s: DavitSetup, j: DavitPose): PosedBody[] {
  return s.m.davitBodies(s.model, s.pipe, { R: j, L: j });
}

function contactsAt(s: DavitSetup, j: DavitPose, lookMm: number): Contact[] {
  return collide(bodiesAt(s, j), s.proxies, s.masks, { touchMm: s.touchMm, lookMm });
}

function pointOf(s: DavitSetup, bodies: readonly PosedBody[], name: string, side: string, i: number): number[] {
  const b = bodies.find((x) => x.n === name && x.side === side)!;
  const px = s.proxies.get(b.k)!;
  return applyPoint(b.m, [px.pts[i * 3]!, px.pts[i * 3 + 1]!, px.pts[i * 3 + 2]!]);
}

/**
 * Port of sim_r4.html attempt() (lines 628 to 646, lineage davit.attempt/r4-page;
 * davit.html lines 617 to 635 are the same code, copy row davit.attempt/r3-page):
 * set the joint on both arms, collide; on a contact, bisect between the old
 * and requested value CLAMP_ITERATIONS times and keep the last clear value.
 */
function clampJoint(s: DavitSetup, base: DavitPose, joint: keyof DavitPose, requested: number): ClampResult {
  const at = (v: number): number => realFailsOf(contactsAt(s, { ...base, [joint]: v }, s.touchMm)).length;
  const from = base[joint];
  const failsAtRequest = at(requested);
  if (failsAtRequest === 0) return { joint, from, requested, clamped: requested, contactAt: null, iterations: 0, failsAtRequest };
  let lo = from, hi = requested;
  for (let it = 0; it < CLAMP_ITERATIONS; it += 1) {
    const mid = (lo + hi) / 2;
    if (at(mid) > 0) hi = mid; else lo = mid;
  }
  return { joint, from, requested, clamped: lo, contactAt: hi, iterations: CLAMP_ITERATIONS, failsAtRequest };
}

/** asm.solve on a DAVIT scene: place both arms at a named pose, report contacts and the closest approach of every declared pair. */
export async function solveAssembly(id: string, opts: { readonly pose?: string; readonly clamp?: { readonly joint: string; readonly value: number } }, deps: SceneDeps): Promise<AsmRun> {
  const s = await davitSetup(id, deps);
  const pose = presetOf(opts.pose);
  let joints: DavitPose = { ...s.m.PRESETS[pose] };
  let clamp: ClampResult | undefined;
  if (opts.clamp !== undefined) {
    const joint = opts.clamp.joint as keyof DavitPose;
    if (!(joint in s.m.JOINT_RANGES)) {
      const names = Object.keys(s.m.JOINT_RANGES);
      throw commandError({ code: "E_REF", path: "/clamp", got: opts.clamp.joint, expected: "a DAVIT joint", didYouMean: didYouMean(opts.clamp.joint, names), hint: `joints are ${names.join(", ")}`, record: "viewer-sim" });
    }
    if (!Number.isFinite(opts.clamp.value)) schema("/clamp", opts.clamp.value, "a finite angle, deg", "write --clamp joint=deg, for example elbow=-110");
    clamp = clampJoint(s, joints, joint, opts.clamp.value);
    joints = { ...joints, [joint]: clamp.clamped };
  }
  const bodies = bodiesAt(s, joints);
  // Declared pairs are scanned without a reach limit, so every one reports its closest unmasked approach.
  const contacts = collide(bodies, s.proxies, s.masks, { touchMm: s.touchMm, lookMm: Infinity });
  const fails = realFailsOf(contacts);
  // A declared pair is one arm's pair (or a base with the mount); the same names across the two arms are not a designed contact.
  const closest = contacts.filter((c) => c.declared && (c.sideA === "" || c.sideB === "" || c.sideA === c.sideB)).map((c): PairClosest => ({
    pair: pairKey(c.a, c.b), side: c.sideA !== "" ? c.sideA : c.sideB, mm: c.distMm,
    a: pointOf(s, bodies, c.a, c.sideA, c.ia), b: pointOf(s, bodies, c.b, c.sideB, c.ib),
  })).sort((x, y) => (x.side + x.pair < y.side + y.pair ? -1 : 1));
  return {
    scene: id, pose, joints,
    placements: bodies.map((b) => ({ body: b.n, side: b.side, m: b.m })),
    realFails: fails.map((c) => ({ pair: pairKey(c.a, c.b), sides: `${c.sideA}${c.sideB}`, distMm: c.distMm })),
    closest,
    ...(clamp === undefined ? {} : { clamp }),
    expectation: { declared: "0 real fails at the pose", measured: `${fails.length} real fails`, met: fails.length === 0 },
  };
}

// ---------------------------------------------------------------- part.probe

export interface ProbeRun {
  readonly scene: string;
  readonly pose: PresetName;
  readonly a: { readonly body: string; readonly side: "" | Side; readonly point: readonly number[] };
  readonly b: { readonly body: string; readonly side: "" | Side; readonly point: readonly number[] };
  /** Closest approach between every proxy point of a and of b, mm (computed). */
  readonly mm: number;
  /** True when the pair is declared; maskedMm is then its closest unmasked approach, mm (computed). */
  readonly declared: boolean;
  readonly maskedMm: number | null;
}

/** `name` or `name@L`; arm bodies default to the right arm. */
function bodyRef(bodies: readonly PosedBody[], ref: string, path: string): PosedBody {
  const at = ref.lastIndexOf("@");
  const name = at < 0 ? ref : ref.slice(0, at);
  const side = at < 0 ? undefined : ref.slice(at + 1);
  const named = bodies.filter((b) => b.n === name);
  const hit = named.find((b) => (side === undefined ? b.side === "" || b.side === "R" : b.side === side));
  if (hit !== undefined) return hit;
  const names = [...new Set(bodies.map((b) => b.n))];
  throw commandError({ code: "E_REF", path, got: ref, expected: "a body of the scene, name or name@L", didYouMean: didYouMean(name, names), hint: `no body ${ref}; bodies are ${names.join(", ")}`, record: "viewer-sim" });
}

/** part.probe on a DAVIT scene: closest approach between two bodies at a named pose, with the two points. */
export async function probePair(id: string, opts: { readonly a: string; readonly b: string; readonly pose?: string }, deps: SceneDeps): Promise<ProbeRun> {
  const s = await davitSetup(id, deps);
  const pose = presetOf(opts.pose);
  const bodies = bodiesAt(s, s.m.PRESETS[pose]);
  const A = bodyRef(bodies, opts.a, "/a"), B = bodyRef(bodies, opts.b, "/b");
  if (A === B) schema("/b", opts.b, "a second body", "probe two different bodies");
  const key = pairKey(A.n, B.n);
  const lo = A.n < B.n ? A : B, hi = lo === A ? B : A;
  // An all-zero mask makes the pair declared, so collide scans it without a reach limit and masks no point.
  const open: MaskMap = new Map([[key, { a: lo.n, b: hi.n, A: new Uint8Array(s.proxies.get(lo.k)!.n), B: new Uint8Array(s.proxies.get(hi.k)!.n) }]]);
  const raw = collide([A, B], s.proxies, open, { touchMm: s.touchMm, lookMm: Infinity })[0]!;
  const declared = s.masks.has(key);
  const masked = declared ? collide([A, B], s.proxies, s.masks, { touchMm: s.touchMm, lookMm: Infinity })[0] : undefined;
  const [ia, ib] = raw.a === A.n ? [raw.ia, raw.ib] : [raw.ib, raw.ia];
  return {
    scene: id, pose,
    a: { body: A.n, side: A.side, point: pointOf(s, bodies, A.n, A.side, ia) },
    b: { body: B.n, side: B.side, point: pointOf(s, bodies, B.n, B.side, ib) },
    mm: raw.distMm, declared, maskedMm: masked?.distMm ?? null,
  };
}
