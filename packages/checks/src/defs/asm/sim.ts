// The sim handle the assembly checks read (spec/sim.ts SimHandle): the sim
// reports measurements and the checks hold the verdicts (D-055). A run
// without a handle reports not run.

import type { Assembly, CheckCtx, Finding, SimHandle } from "@hackbuild/spec";
import { skip } from "../common.js";

export const NO_SIM = "no sim handle supplied to the registry: the caller opens the M02 sim on this assembly";

export function simOr(ctx: CheckCtx, a: Assembly): SimHandle | Finding {
  return ctx.sim ?? skip({ level: "assembly", assembly: a.id }, "not run", NO_SIM);
}

export const isSim = (v: SimHandle | Finding): v is SimHandle => typeof (v as SimHandle).closestApproach === "function";

/** Mesh hash of an instance's part solid or a bought body's envelope, for the whitelist (CheckCtx.whitelist keys by mesh hash). */
export function hashOf(a: Assembly, id: string): string | undefined {
  const inst = a.instances.find((i) => i.id === id);
  if (inst !== undefined) return a.parts.find((p) => p.id === inst.part)?.solid.hash;
  return a.bought.find((b) => b.id === id)?.envelope.hash;
}

/** True when the whitelist excuses the pair, in either direction. */
export function whitelisted(ctx: CheckCtx, a: Assembly, x: string, y: string): boolean {
  const hx = hashOf(a, x), hy = hashOf(a, y);
  if (hx === undefined || hy === undefined) return false;
  return (ctx.whitelist.get(hx) ?? []).includes(hy) || (ctx.whitelist.get(hy) ?? []).includes(hx);
}
