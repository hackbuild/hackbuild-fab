// spec/hook.ts
/**
 * Status: draft until the M09 exit. MILESTONES.md 1.5, D-179.
 * M09 is the first milestone that runs this file.
 */
// The test hook every baked bench exposes on globalThis as BENCH (D-128).
// Frozen in PIP's getter style. Playwright conformance runs on every baked
// bench; legacy adapters map TOGGLE, KNUCKLE, TENON and COTTER onto it.
// Version 4, 2026-10-04. Carries D-128, D-129.
// 2026-10-05: gold standard gaps P-06 and P-07 (synthesis/gold-standard.md
// section 12): tilt and azimuth stimulus, release, the error state, clamps
// on out-of-range writes, the unknown export kind message.

import type { DriveStimulus } from "./build.js";

/** Name of the global the hook lives on. */
export const BENCH_GLOBAL = "BENCH";

/** Legacy export kind names and the exporter ids they resolve to. */
export const EXPORT_ALIASES = {
  "print-card": "card",
  design: "json",
  stlzip: "stl",
} as const satisfies Readonly<Record<string, string>>;

/**
 * What drive returns, one record per call (UI.md 13). Numbers carry their
 * unit in the key suffix and every number is qualified through the
 * matching `<key>Qualifier` entry where the bench has one. Keys present
 * follow DriveDecl.readout: target, pin, logic, mcu, ohm, settleUs, waitUs,
 * waitQualifier for every fab bench; pinV, pullupOhm and dir where the
 * readout lists them (P-06); tiltDeg for tilt; adc for slide. Boolean
 * entries are flags, such as calibrated (false until a coupon calibrates
 * the read wait, D-078).
 */
export type DriveReadoutRecord = Readonly<Record<string, number | string | boolean>>;

/** Message prefix exportBytes rejects with for a kind the bench does not declare (G-51). */
export const UNKNOWN_EXPORT_KIND = "unknown export kind: ";

export interface BenchHook {
  /** True once the first build finished and the hook is safe to drive. */
  readonly ready: boolean;
  /**
   * Getter returns the design; setter replaces it and rebuilds. A value
   * outside a declared range or option set is clamped to the range (an
   * enum or slot falls back to its default) and each clamp appends a log
   * line naming field, value and range within 100 ms (G-10, P-07):
   * `clamp body.w: 40 outside 12 to 30, set 30`. A write never hangs.
   */
  state: unknown;
  /** The last built model. */
  readonly model: unknown;
  /** Increments on every commit, count. */
  readonly rev: number;
  /** rev of the last completed build, count. */
  readonly built: number;
  /** Building, or auto-build pending with built !== rev. A thrown build clears it (G-11). */
  readonly busy: boolean;
  /** Build hash of the last completed build, null before the first. */
  readonly buildHash: string | null;
  /**
   * Message of the last thrown build, null after a good build (P-07, G-11).
   * A non-Error throw is stringified, never "undefined". While set, the
   * stage keeps the last good mesh and the status strip shows an error chip
   * with this text.
   */
  readonly error: string | null;
  readonly log: string[];
  /**
   * Resolves when ready && !busy && built === rev. Rejects with
   * `build failed: <error>` when the build for the current rev throws, and
   * with `not settled after <timeoutMs> ms` on timeout. timeoutMs in ms.
   */
  settled(timeoutMs?: number): Promise<void>;
  /**
   * Merge onto a fresh blank, drop retired keys, clamp to declared ranges
   * with one log line per clamp (as the state setter), then commit. Text
   * that is not a design for this bench leaves the design untouched, sets
   * `error` and logs the reason; it never throws to the page or opens an
   * alert (G-37).
   */
  loadDesign(json: string): void;
  designJson(): string;
  ensureMesh(): Promise<void>;
  commit(): void;
  /**
   * Drive pad stimulus: hold a key, slide a pot, tilt a stick. value is a
   * boolean for hold, a number in the target's unit for slide (mm) or a
   * one-axis tilt (degrees), and { tiltDeg, phiDeg } for a stick (P-06).
   * Calls the same ContactFn as the pad, the 3D pose and the readout
   * (DriveDecl.contact, G-20). The stimulus stays applied until release.
   */
  drive(target: string, value: DriveStimulus): Promise<DriveReadoutRecord>;
  /** Release one held target, or every held target when none is named; resolves once the pad is idle (P-06). */
  release(target?: string): Promise<void>;
  /**
   * Base64 bytes of a declared export; kind resolved through EXPORT_ALIASES.
   * Awaits ensureMesh first (G-46). A kind the bench does not declare
   * rejects with an Error whose message is UNKNOWN_EXPORT_KIND followed by
   * the kind, never a TypeError (G-51).
   */
  exportBytes(kind: string): Promise<string>;
  /** Design extras: firmware, wiringSvg, printCard, setTilt. */
  readonly verbs?: Readonly<Record<string, (...args: readonly unknown[]) => unknown>>;
}
