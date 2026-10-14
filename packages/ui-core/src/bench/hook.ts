// BENCH, the test hook every fab bench answers (spec/hook.ts, D-128, D-214).
// Ported from PIP bench/part2.js lines 405 to 428: getters over the core's
// counters, `state` set replaces the design and rebuilds, `busy` holds
// while a build is pending, exportBytes base64 over 0x8000-byte slices.
// Changes from PIP, each from spec/hook.ts: `ready` turns true after the
// first build settles (PIP set it at boot), settled() replaces polling the
// three counters, an unknown export kind rejects with a message instead of
// a TypeError on an undefined blob, a thrown build sets `error`, and state
// writes clamp to the declared ranges with one log line per clamp.

import {
  BENCH_GLOBAL, EXPORT_ALIASES, SEVERITY_EFFECT, UNKNOWN_EXPORT_KIND,
  type BenchHook, type CheckResult, type DriveReadoutRecord, type DriveStimulus, type ParamField, type ParamGroup,
} from "@hackbuild/spec";
import type { BenchCore, BuildResult } from "./core.js";
import { cancel, later, type TimerId } from "./timers.js";

/** Slice PIP's exportBytes hands String.fromCharCode at once, bytes (part2.js line 425). */
export const B64_CHUNK = 0x8000;
/** settled() timeout when the caller names none, ms (inferred: the conformance ready ceiling is 120 s). */
export const SETTLED_TIMEOUT_MS = 120000;
/** How often settled() reads the counters, ms (inferred: one frame at 60 Hz). */
export const SETTLE_POLL_MS = 16;

/**
 * Export kinds that are free of the gate (spec/registry.ts ExporterDef:
 * "png and json are free"). A page holds no exporter registry, so every
 * other kind it declares is treated as fabrication and gated.
 */
export const FREE_EXPORTS: readonly string[] = ["json", "png"];

/** One export a bench can write (spec/registry.ts ExporterDef, reduced to what a page holds). */
export interface HookExport<P = unknown, R = unknown> {
  /** Exporter id, the resolved kind: 3mf, stl, card, json. */
  readonly kind: string;
  /** ExporterDef.fabrication: the build and every check run first and a blocking fail refuses (D-109). */
  readonly fabrication: boolean;
  /** Bytes of the export from the current build; text is written as utf-8. */
  write(result: BuildResult<P, R>): Promise<Uint8Array | string> | Uint8Array | string;
}

export interface HookOptions<P = unknown, R = unknown> {
  /** Every export the chase declares. A declared kind this page cannot write still belongs here and throws its reason from `write`. */
  readonly exports: readonly HookExport<P, R>[];
  readonly verbs?: Readonly<Record<string, (...args: readonly unknown[]) => unknown>>;
  /** Param groups whose ranges and options a state write clamps to (spec/hook.ts state). */
  readonly params?: readonly ParamGroup[];
  /** Check results of a build, for the fabrication gate. */
  readonly checks?: (result: BuildResult<P, R>) => readonly CheckResult[];
  /** The hook's `model` from a build; default the build's part. */
  readonly model?: (result: BuildResult<P, R>) => unknown;
  readonly drive?: (target: string, value: DriveStimulus) => Promise<DriveReadoutRecord>;
  readonly release?: (target?: string) => Promise<void>;
  /** Pauses the viewer for an export and returns the resume (G-46, hb-viewer `paused`). */
  readonly pause?: () => () => void;
  /** Resolves when the page has booted (kernel, share link); the first build runs after it. */
  readonly boot?: Promise<unknown>;
}

export interface Hook {
  readonly hook: BenchHook;
  /** Resolves when `ready` turns true. */
  readonly whenReady: Promise<void>;
}

/** Ids of the checks whose fail stops a fabrication export (spec/ids.ts SEVERITY_EFFECT); a waived fail does not. */
export function blockingChecks(results: readonly CheckResult[]): string[] {
  const out: string[] = [];
  for (const r of results) {
    if (r.verdict === "fail" && SEVERITY_EFFECT[r.severity] === "block-export" && r.waived === undefined && !out.includes(r.id)) out.push(r.id);
  }
  return out;
}

/** The refusal a fabrication export with blocking fails gives, naming each check. */
export function blockedLine(kind: string, failing: readonly string[]): string {
  return `${kind} export refused: ${failing.join(", ")} failed. fix the finding, then export.`;
}

/** Base64 of bytes, PIP's chunked btoa (part2.js lines 424 to 426). */
export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += B64_CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK));
  return btoa(s);
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);

function clampFields(fields: readonly ParamField[], into: Obj, at: string, lines: string[]): void {
  for (const f of fields) {
    if (!Object.prototype.hasOwnProperty.call(into, f.id)) continue;
    const path = at === "" ? f.id : `${at}.${f.id}`;
    const v = into[f.id];
    if ("range" in f && typeof v === "number" && Number.isFinite(v)) {
      const [lo, hi] = f.range;
      if (v < lo || v > hi) {
        const set = v < lo ? lo : hi;
        into[f.id] = set;
        lines.push(`clamp ${path}: ${v} outside ${lo} to ${hi}, set ${set}`);
      }
    } else if (f.type === "enum") {
      const legal = f.options.map((o) => o.value);
      if (!legal.includes(v as string)) {
        into[f.id] = f.default;
        lines.push(`clamp ${path}: ${JSON.stringify(v)} not one of ${legal.join(", ")}, set ${f.default}`);
      }
    } else if (f.type === "slot" && !(Number.isInteger(v) && (v as number) >= 1)) {
      into[f.id] = f.default;
      lines.push(`clamp ${path}: ${JSON.stringify(v)} is not a slot, set ${f.default}`);
    } else if (f.type === "list" && Array.isArray(v)) {
      if (v.length > f.max) {
        lines.push(`clamp ${path}: ${v.length} items outside ${f.min} to ${f.max}, set ${f.max}`);
        into[f.id] = v.slice(0, f.max);
      }
      (into[f.id] as unknown[]).forEach((item, i) => {
        if (isObj(item)) clampFields(f.item, item, `${path}.${i}`, lines);
      });
    }
  }
}

/**
 * Clamps a state to the declared ranges, in place on a copy: a number past
 * its range to the range end, an enum or slot outside its options to its
 * default, a list past `max` to `max` items. One line per clamp, worded as
 * spec/hook.ts gives it: `clamp body.w: 40 outside 12 to 30, set 30`.
 */
export function clampState(groups: readonly ParamGroup[], state: unknown): { state: unknown; lines: string[] } {
  const lines: string[] = [];
  if (!isObj(state)) return { state, lines };
  const copy = structuredClone(state);
  clampFields(groups.flatMap((g) => g.fields), copy, "", lines);
  return { state: copy, lines };
}

function message(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : JSON.stringify(e) ?? String(e);
}

const noDrive = async (): Promise<DriveReadoutRecord> => {
  throw new Error("this bench declares no drive pad");
};

/** Builds the hook object over a core; installHook puts it on globalThis. */
export function createHook<S, P, R>(core: BenchCore<S, P, R>, opts: HookOptions<P, R>): Hook {
  let ready = false;
  const groups = opts.params ?? [];
  const byKind = new Map(opts.exports.map((x) => [x.kind, x]));

  const clampDoc = (json: string): string => {
    let doc: unknown;
    try {
      doc = JSON.parse(json);
    } catch {
      return json;
    }
    if (!isObj(doc)) return json;
    const inner = "state" in doc;
    const { state, lines } = clampState(groups, inner ? doc["state"] : doc);
    for (const l of lines) core.appendLog(l);
    if (lines.length === 0) return json;
    return JSON.stringify(inner ? { ...doc, state } : state);
  };

  const hook: BenchHook = {
    get ready() {
      return ready;
    },
    get state() {
      return structuredClone(core.state);
    },
    set state(v: unknown) {
      const { state, lines } = clampState(groups, v);
      for (const l of lines) core.appendLog(l);
      core.loadDesign(JSON.stringify({ state }));
    },
    get model() {
      const r = core.result;
      if (r === null) return null;
      return opts.model ? opts.model(r) : r.part;
    },
    get rev() {
      return core.rev;
    },
    /** Zero before the first build, as PIP's BUILT starts; settled() reads the core's own -1. */
    get built() {
      return Math.max(core.built, 0);
    },
    get busy() {
      return core.busy;
    },
    get buildHash() {
      return core.result?.buildHash ?? null;
    },
    get error() {
      return core.error;
    },
    get log() {
      return [...core.log];
    },
    settled(timeoutMs = SETTLED_TIMEOUT_MS) {
      return new Promise<void>((resolve, reject) => {
        let tick: TimerId | undefined;
        const end = later(() => {
          cancel(tick);
          const why = !ready ? "not ready" : core.busy ? "busy" : `built ${core.built}, rev ${core.rev}`;
          reject(new Error(`not settled after ${timeoutMs} ms: ${why}`));
        }, timeoutMs);
        const look = (): void => {
          if (ready && !core.busy) {
            if (core.built === core.rev) {
              cancel(end);
              resolve();
              return;
            }
            if (core.error !== null) {
              cancel(end);
              reject(new Error(`build failed: ${core.error}`));
              return;
            }
          }
          tick = later(look, SETTLE_POLL_MS);
        };
        look();
      });
    },
    loadDesign(json) {
      core.loadDesign(clampDoc(json));
    },
    designJson: () => core.designJson(),
    ensureMesh: async () => {
      await core.ensureMesh();
    },
    commit: () => core.commit(),
    drive: (target, value) => (opts.drive ?? noDrive)(target, value),
    release: async (target) => {
      await opts.release?.(target);
    },
    async exportBytes(kind) {
      const resolved = (EXPORT_ALIASES as Readonly<Record<string, string>>)[kind] ?? kind;
      const x = byKind.get(resolved);
      if (x === undefined) throw new Error(UNKNOWN_EXPORT_KIND + kind);
      const result = await core.ensureMesh();
      if (x.fabrication) {
        const failing = blockingChecks(opts.checks?.(result) ?? []);
        if (failing.length > 0) throw new Error(blockedLine(resolved, failing));
      }
      const resume = opts.pause?.();
      try {
        const out = await x.write(result);
        return toBase64(typeof out === "string" ? new TextEncoder().encode(out) : out);
      } finally {
        resume?.();
      }
    },
    ...(opts.verbs === undefined ? {} : { verbs: opts.verbs }),
  };

  const whenReady = (async () => {
    try {
      await opts.boot;
    } catch (e) {
      core.appendLog(`boot failed: ${message(e)}`);
    }
    // A first build that throws still settles: `error` carries it and ready turns true.
    await core.ensureMesh().catch(() => undefined);
    ready = true;
  })();

  return { hook, whenReady };
}

/** Defines `globalThis.BENCH` (spec/hook.ts BENCH_GLOBAL) and returns the hook. */
export function installHook<S, P, R>(core: BenchCore<S, P, R>, opts: HookOptions<P, R>): Hook {
  const made = createHook(core, opts);
  Object.defineProperty(globalThis, BENCH_GLOBAL, { value: made.hook, configurable: true, enumerable: true, writable: true });
  return made;
}
