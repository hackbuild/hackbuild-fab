// The bench interaction contract, framework-free (bible 7.3, D-123, D-132).
// Ported from PIP bench/part2.js lines 1 to 92: rev and built counters, the
// 320 ms rebuild debounce, one build at a time with a single queued
// follow-up, ensureMesh before every export; TENON part3.js lines 43 to 64
// for the light commit; part3.js lines 277 to 295 for touch on range input
// and commit on change. Two changes from PIP, both from M09-T03: a thrown
// build keeps the previous model (PIP set MODEL to null), and a build is a
// promise so the core can host the library build behind `hbf part.build`.

import type { BuildWarning } from "@hackbuild/spec";
import { firstNonFinite, mergeOntoBlank } from "./merge.js";
import { cancel, later, nowMs, type TimerId } from "./timers.js";
import { createHistory } from "./undo.js";
import { refusalOf, type BuildRefusal } from "./refusal.js";

/** Commit to rebuild delay, ms (PIP part2.js `schedule`, line 59). */
export const REBUILD_DEBOUNCE_MS = 320;
/** Default ms over which a build carries SLOW_BUILD and logs the param to lower (COLLAR collar.html line 2808, D-213, BuildDecl.slowMs). */
export const SLOW_BUILD_MS = 2500;
/** The one question asked before a preset replaces art (M09-T03 step 6). */
export const PRESET_OVER_ART = "loading a preset replaces your art. replace it?";

/** ParamField.commit (spec/chase.ts, D-132). */
export type CommitKind = "touch" | "commit" | "light";

export interface BuildOutput<P = unknown, R = unknown> {
  readonly part: P;
  readonly report: R;
  readonly buildHash: string;
  readonly warnings?: readonly BuildWarning[];
}

export interface BuildResult<P = unknown, R = unknown> extends BuildOutput<P, R> {
  /** rev the build read. */
  readonly rev: number;
  /** Wall time of the build, ms, measured by the runner. */
  readonly ms: number;
  readonly warnings: readonly BuildWarning[];
}

export type CoreEvent = "touch" | "commit" | "light" | "load" | "building" | "built" | "error" | "log";

export interface BenchCoreOptions<S, P = unknown, R = unknown> {
  /** designJson `app` field; a loaded document naming another app is refused. */
  readonly app: string;
  /** designJson `v` field. */
  readonly v: number;
  /** A fresh full default state; every call returns a new object. */
  readonly blank: () => S;
  /** The library build behind `hbf part.build` and `hbf check.run`, injected. It receives a copy of the state. */
  readonly build: (state: S) => Promise<BuildOutput<P, R>>;
  /** Mass, colour or slot readouts from the last model; never geometry (TENON `commitLight`). */
  readonly light?: (state: S, last: BuildResult<P, R> | null) => void;
  /** Upgrades a parsed document before the merge. Throws to refuse it. */
  readonly migrate?: (doc: unknown) => unknown;
  /** True when the current state holds art a preset would replace. */
  readonly hasArt?: (state: S) => boolean;
  /** Asks the one preset question; true replaces. Default refuses. */
  readonly confirm?: (text: string) => boolean;
  readonly onChange?: (event: CoreEvent) => void;
  /** BenchDecl.build.slowMs; default SLOW_BUILD_MS. */
  readonly slowMs?: number;
}

export interface BenchCore<S, P = unknown, R = unknown> {
  /** The live design. Mutate through `set`, or in place, then call a commit. */
  readonly state: S;
  /** Increments on every commit, count. */
  readonly rev: number;
  /** rev of the last completed build, count; -1 before the first. */
  readonly built: number;
  readonly building: boolean;
  /** A commit arrived during a build; one follow-up build runs after it. */
  readonly queued: boolean;
  /** Building, or a scheduled build is pending. A thrown build clears it. */
  readonly busy: boolean;
  /** A touch has run since the last commit; the mesh no longer shows the fields. */
  readonly stale: boolean;
  /** Message of the last refusal or thrown build; null after a good build. */
  readonly error: string | null;
  /** The last thrown build while `result` is still the model before it (D-643); null after a good build. */
  readonly refusal: BuildRefusal<S> | null;
  readonly log: readonly string[];
  readonly result: BuildResult<P, R> | null;
  /** Auto build after a commit; off leaves builds to ensureMesh (PIP `UIS.auto`). */
  auto: boolean;

  get(path: string): unknown;
  set(path: string, value: unknown): void;
  /** Range input: previews follow, no rev, no build (PIP part3.js line 286). */
  touch(): void;
  /** rev plus 1, undo snapshot in 450 ms, rebuild in 320 ms. */
  commit(): void;
  /** rev plus 1, `light` runs now, no geometry build. */
  commitLight(): void;
  /** Dispatch on ParamField.commit. */
  commitAs(kind: CommitKind): void;
  undo(): boolean;
  redo(): boolean;
  /** Resolves with a model built from the current rev, building now when stale. */
  ensureMesh(): Promise<BuildResult<P, R>>;
  /** Full factory reset, or a preset applied to a fresh blank. */
  reset(preset?: (fresh: S) => S): void;
  /** A preset over art asks PRESET_OVER_ART once; false when refused. */
  loadPreset(preset: (fresh: S) => S): boolean;
  /** Merge a document onto a fresh blank and commit; false and `error` set when refused. Never throws. */
  loadDesign(json: string): boolean;
  designJson(): string;
  appendLog(line: string): void;
  dispose(): void;
}

type Obj = Record<string, unknown>;

function message(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : JSON.stringify(e) ?? String(e);
}

export function createBenchCore<S, P = unknown, R = unknown>(opts: BenchCoreOptions<S, P, R>): BenchCore<S, P, R> {
  let state = opts.blank();
  let rev = 0;
  let built = -1;
  /** rev of the last commit that changes geometry; a light commit leaves it. */
  let geomRev = 0;
  let failedRev = -1;
  let building = false;
  let queued = false;
  let stale = false;
  let auto = true;
  let error: string | null = null;
  let result: BuildResult<P, R> | null = null;
  /** The state `result` was built from. */
  let goodState: S | null = null;
  let refusal: BuildRefusal<S> | null = null;
  let timer: TimerId | undefined;
  let inflight: Promise<void> | undefined;
  /** Path of the last `set`, the param a slow-build line names; null after a load or reset. */
  let lastSet: string | null = null;
  const slowMs = opts.slowMs ?? SLOW_BUILD_MS;
  const log: string[] = [];
  const history = createHistory(() => JSON.stringify(state));

  const emit = (e: CoreEvent): void => opts.onChange?.(e);
  const appendLog = (line: string): void => {
    log.push(line);
    emit("log");
  };

  const runBuild = (): Promise<void> => {
    timer = undefined;
    if (building) {
      queued = true;
      return inflight ?? Promise.resolve();
    }
    if (built === rev && result !== null) return Promise.resolve();
    building = true;
    emit("building");
    const r = rev;
    const copy = structuredClone(state);
    const param = lastSet;
    const t0 = nowMs();
    const run = async (): Promise<void> => {
      // Emitted once building is false, so a mirror taken on the event never reads a finished build as running.
      let ended: CoreEvent = "built";
      try {
        const out = await opts.build(copy);
        const ms = nowMs() - t0;
        const warnings = [...(out.warnings ?? [])];
        if (ms > slowMs) {
          const text = `build took ${(ms / 1000).toFixed(1)} s, over ${(slowMs / 1000).toFixed(1)} s. lower ${param ?? "the last param you raised"} or turn auto rebuild off`;
          warnings.push({ code: "SLOW_BUILD", text });
          log.push(text);
        }
        result = { part: out.part, report: out.report, buildHash: out.buildHash, warnings, rev: r, ms };
        built = r;
        error = null;
        stale = false;
        goodState = copy;
        refusal = null;
        if (geomRev <= r && rev > r) {
          // Only light commits landed during the build: their readouts rerun on the new model.
          opts.light?.(state, result);
          built = rev;
        }
      } catch (e) {
        error = message(e);
        failedRev = r;
        // The model drawn stays the last good one; a refused build never replaces it.
        refusal = { rev: r, ...refusalOf(e), state: copy, good: goodState };
        ended = "error";
        log.push(`build failed: ${error}`);
      } finally {
        building = false;
        inflight = undefined;
        emit(ended);
        if (queued) {
          queued = false;
          void runBuild();
        }
      }
    };
    const p = run();
    // A builder that throws before its first await has already finished here.
    if (building && inflight === undefined) inflight = p;
    return p;
  };

  const schedule = (): void => {
    cancel(timer);
    timer = undefined;
    if (!auto) return;
    timer = later(() => void runBuild(), REBUILD_DEBOUNCE_MS);
  };

  const afterLoad = (): void => {
    lastSet = null;
    rev += 1;
    geomRev = rev;
    stale = true;
    emit("load");
    schedule();
  };

  const commit = (): void => {
    rev += 1;
    geomRev = rev;
    stale = true;
    history.schedule();
    emit("commit");
    schedule();
  };

  const commitLight = (): void => {
    if (opts.light === undefined) {
      commit();
      return;
    }
    rev += 1;
    history.schedule();
    opts.light(state, result);
    if (!building && result !== null && built >= geomRev) built = rev;
    emit("light");
  };

  const touch = (): void => {
    stale = true;
    emit("touch");
  };

  const COMMITS: Readonly<Record<CommitKind, () => void>> = { touch, commit, light: commitLight };

  const refuse = (reason: string): false => {
    error = reason;
    appendLog(reason);
    emit("error");
    return false;
  };

  const reset = (preset?: (fresh: S) => S): void => {
    state = preset ? preset(opts.blank()) : opts.blank();
    history.now();
    afterLoad();
  };

  const core: BenchCore<S, P, R> = {
    get state() {
      return state;
    },
    get rev() {
      return rev;
    },
    get built() {
      return built;
    },
    get building() {
      return building;
    },
    get queued() {
      return queued;
    },
    get busy() {
      return building || timer !== undefined;
    },
    get stale() {
      return stale;
    },
    get error() {
      return error;
    },
    get refusal() {
      return refusal;
    },
    get log() {
      return log;
    },
    get result() {
      return result;
    },
    get auto() {
      return auto;
    },
    set auto(on: boolean) {
      auto = on;
      if (on && built !== rev) schedule();
      else if (!on) {
        cancel(timer);
        timer = undefined;
      }
    },

    get(path) {
      return path.split(".").reduce<unknown>((o, k) => (o === null || typeof o !== "object" ? undefined : (o as Obj)[k]), state);
    },
    set(path, value) {
      const keys = path.split(".");
      const last = keys.pop();
      if (last === undefined) return;
      const o = keys.reduce<unknown>((a, k) => (a as Obj)[k], state);
      if (o === null || typeof o !== "object") throw new Error(`no setting at ${path}`);
      (o as Obj)[last] = value;
      lastSet = path;
    },
    touch,
    commit,
    commitLight,
    commitAs(kind) {
      COMMITS[kind]();
    },
    undo() {
      const s = history.undo();
      if (s === undefined) return false;
      state = JSON.parse(s) as S;
      afterLoad();
      return true;
    },
    redo() {
      const s = history.redo();
      if (s === undefined) return false;
      state = JSON.parse(s) as S;
      afterLoad();
      return true;
    },
    async ensureMesh() {
      for (;;) {
        if (built === rev && result !== null) return result;
        if (inflight !== undefined) {
          await inflight;
          continue;
        }
        if (failedRev === rev) throw new Error(`build failed: ${error ?? "unknown"}`);
        cancel(timer);
        await runBuild();
      }
    },
    reset,
    loadPreset(preset) {
      if (opts.hasArt?.(state) === true && opts.confirm?.(PRESET_OVER_ART) !== true) return false;
      reset(preset);
      return true;
    },
    loadDesign(json) {
      let doc: unknown;
      try {
        doc = JSON.parse(json);
      } catch (e) {
        return refuse(`not a design: ${message(e)}`);
      }
      if (opts.migrate !== undefined) {
        try {
          doc = opts.migrate(doc);
        } catch (e) {
          return refuse(`design could not be upgraded: ${message(e)}`);
        }
      }
      if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return refuse("not a design: expected a json object");
      const d = doc as Obj;
      if (typeof d["app"] === "string" && d["app"] !== opts.app) return refuse(`not a ${opts.app} design: app is ${d["app"]}`);
      const loaded = "state" in d ? d["state"] : d;
      const { state: merged, dropped } = mergeOntoBlank(opts.blank(), loaded);
      const bad = firstNonFinite(merged);
      if (bad !== undefined) return refuse(`build failed: not a number at ${bad}`);
      for (const p of dropped) appendLog(`dropped ${p}: not a setting of this design`);
      state = merged;
      error = null;
      history.now();
      afterLoad();
      return true;
    },
    designJson() {
      return JSON.stringify({ app: opts.app, v: opts.v, state }, null, 1);
    },
    appendLog,
    dispose() {
      cancel(timer);
      timer = undefined;
      history.clear();
    },
  };
  history.now();
  return core;
}
