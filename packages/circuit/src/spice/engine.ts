// eecircuit-engine 1.8.0 (ngspice 45.2 in wasm), loaded only on demand (D-086).
//
// The analytic path is the offline default; this module reaches ngspice
// for device models and transients. The package is one 19 MB ESM file with
// the wasm inlined (LICENSING.md 2.1), so it stays out of every module
// graph until loadSpice() runs: the only reference to it in the repo is the
// dynamic import below, and never a static one (M05-T01 acceptance grep).
// It is never in a bake (D-043).
//
// Licence (tools/licences.json row eecircuit-engine 1.8.0): MIT for the
// wrapper, BSD-3-Clause for ngspice, LGPL-2.0-or-later for
// src/frontend/numparam (ngspice COPYING line 43 to 44), and
// LGPL-2.1-or-later for src/maths/KLU: ngspice COPYING lines 28 to 29 say
// LGPLv2, and the KLU file headers that state a licence (colamd.c lines 53
// to 56, colamd_global.c line 7, ngspice tag ngspice-45.2 commit
// 724dc77b9153dc75eaec474b1f7a44f1fcf5f362, read 2026-10-08) give version
// 2.1 or any later version. xspice and osdi are disabled in the build
// (EEcircuit-engine Docker/run.sh:107).
//
// Timing is one machine's measurement and never asserted (verified-claims
// C9: start 449 ms, .op median 0.365 ms on the planning host).

import type { Spdx } from "@hackbuild/spec";
import type { OperatingPointInput } from "./netlist.js";
import { toNetlist } from "./netlist.js";

/** Audited SPDX expression for BuildInputs.licences["eecircuit-engine"] (D-041, D-051). */
export const EECIRCUIT_LICENCE: Spdx = "MIT AND BSD-3-Clause AND LGPL-2.0-or-later AND LGPL-2.1-or-later";

/** One vector of a run, as eecircuit-engine readOutput returns it (real data only). */
export interface SpiceVector {
  readonly name: string;
  readonly type: string;
  readonly values: readonly number[];
}

export interface SpiceResult {
  /** Plot name from the raw header, for example "Operating Point" or "Transient Analysis". */
  readonly plot: string;
  readonly vectors: readonly SpiceVector[];
}

export interface SpiceEngine {
  /** ngspice version from the init banner, for example "45.2"; BuildInputs.engines.ngspice. */
  readonly ngspice: string;
  /** Run one deck; runs are serialised because the engine holds one netlist at a time. */
  run(input: OperatingPointInput | string): Promise<SpiceResult>;
}

/** The part of eecircuit-engine's Simulation this module calls. */
interface SimulationLike {
  start(): Promise<void>;
  setNetList(input: string): void;
  runSim(): Promise<{ header: string; dataType: string; data: readonly { name: string; type: string; values: readonly unknown[] }[] }>;
  getInitInfo(): string;
  getError(): string[];
}

let cached: Promise<SpiceEngine> | null = null;

/** Start ngspice once per process and return the cached engine. */
export function loadSpice(): Promise<SpiceEngine> {
  cached ??= start().catch((e: unknown) => {
    cached = null;
    throw e;
  });
  return cached;
}

/** The ngspice version in an init banner line `** ngspice-45.2 : Circuit level simulation program`. */
export function ngspiceVersion(initInfo: string): string {
  const m = /\bngspice-(\d+(?:\.\d+)*)\b/.exec(initInfo);
  if (m === null || m[1] === undefined) throw new Error("ngspice init banner names no version");
  return m[1];
}

async function start(): Promise<SpiceEngine> {
  const mod = (await import("eecircuit-engine")) as unknown as { Simulation: new () => SimulationLike };
  const sim = new mod.Simulation();
  await sim.start();
  const ngspice = ngspiceVersion(sim.getInitInfo());
  let queue: Promise<unknown> = Promise.resolve();
  const runOne = async (deck: string): Promise<SpiceResult> => {
    sim.setNetList(deck);
    const r = await sim.runSim();
    const errors = sim.getError().filter((l) => l.trim() !== "");
    if (errors.length > 0) {
      // ngspice stops answering after a parse error in this build; drop the instance.
      cached = null;
      throw new Error(`ngspice refused the deck: ${errors.join(" | ")}`);
    }
    // A run that did not happen leaves the previous result in place; the title line proves this one ran.
    const title = deck.slice(0, deck.indexOf("\n"));
    const got = /^Title: (.*)$/m.exec(r.header)?.[1];
    if (got !== title) throw new Error(`ngspice returned a result for ${JSON.stringify(got)}, expected ${JSON.stringify(title)}`);
    if (r.dataType !== "real") throw new Error(`ngspice returned ${r.dataType} data; only real analyses are read`);
    const plot = /^Plotname: (.*)$/m.exec(r.header)?.[1] ?? "";
    return { plot, vectors: r.data.map((d) => ({ name: d.name, type: d.type, values: d.values as number[] })) };
  };
  return {
    ngspice,
    run(input) {
      const deck = typeof input === "string" ? input : toNetlist(input);
      const next = queue.then(() => runOne(deck));
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

/** BuildInputs entries a result that used the engine merges in (D-051, LICENSING.md 4.1). */
export function spiceBuildInputs(engine: Pick<SpiceEngine, "ngspice">): {
  readonly engines: { readonly ngspice: string };
  readonly licences: Readonly<Record<string, Spdx>>;
} {
  return { engines: { ngspice: engine.ngspice }, licences: { "eecircuit-engine": EECIRCUIT_LICENCE } };
}

function vector(result: SpiceResult, name: string): readonly number[] {
  const v = result.vectors.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (v === undefined) throw new Error(`ngspice result has no vector ${name}; it has ${result.vectors.map((x) => x.name).join(", ")}`);
  return v.values;
}

/** Node voltage of an operating point, V. */
export function nodeVolts(result: SpiceResult, node: string): number {
  const [v] = vector(result, `v(${node})`);
  if (v === undefined) throw new Error(`ngspice result has no point for v(${node})`);
  return v;
}

/**
 * First time a transient node crosses thresholdV, us, by linear
 * interpolation between the two samples that bracket it (the C9 RC script,
 * /Users/obsidian/Projects/hackbuild/fab-knowledge/evidence/scratch/c9/m05rc.mjs
 * line 7, which reads a falling edge; a rising edge reads the same way).
 * Null when the node never crosses.
 */
export function crossingUs(result: SpiceResult, node: string, thresholdV: number): number | null {
  const t = vector(result, "time");
  const v = vector(result, `v(${node})`);
  for (let i = 1; i < v.length; i += 1) {
    const a = v[i - 1] as number;
    const b = v[i] as number;
    if ((a > thresholdV && b <= thresholdV) || (a < thresholdV && b >= thresholdV)) {
      const ta = t[i - 1] as number;
      const tb = t[i] as number;
      return (ta + ((thresholdV - a) * (tb - ta)) / (b - a)) * 1e6;
    }
  }
  return null;
}
