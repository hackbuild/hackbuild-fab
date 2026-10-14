// Runs one of the M05-T19 button path checks over its fixture through the
// registry with the M05 kernel set and net targets registered, as
// circuit.solve does. The fixtures are committed data (make-json.mjs).

import { readFileSync } from "node:fs";
import type { CheckLevel, CheckResult, KernelId } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, kernelsAt, levelsAt, registerChecks, runRegistry } from "../src/index";
import { loadFixture } from "./fixture-load";

const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as unknown;
export const defs = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);
export const KERNELS: ReadonlySet<KernelId> = kernelsAt("M05");
export const TARGETS: ReadonlySet<CheckLevel> = levelsAt("M05");
export const profile = createProfileLookup(loadProfile());

export async function runFixture(id: string, which: string): Promise<readonly CheckResult[]> {
  const def = defs.find((d) => d.id === id);
  if (def === undefined) throw new Error(`no check ${id}`);
  const fx = loadFixture(id, which);
  const report = await runRegistry([def], {
    kernels: KERNELS, produced: TARGETS, targets: fx.targets, views: fx.views,
    ctx: { profile, machine: "ffc5p", whitelist: new Map(), ...(fx.hookup === undefined ? {} : { hookup: fx.hookup }) },
  });
  return report.results;
}

/** The results that ran, skips left out. */
export const ran = (rs: readonly CheckResult[]): readonly CheckResult[] => rs.filter((r) => r.verdict !== "skip");
