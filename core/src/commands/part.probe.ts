// part.probe (M02-T11 step 6; assigned to M02 in MILESTONES.md 1.3):
// closest approach in mm between two bodies of a scene at a pose, with the
// point on each. A measurement only: verdict skip, exit 0. The point, ray
// and section probes of spec/commands.ts read a built part and land when
// designs build from a chase.

import type { CommandInput, ProbeResult } from "@hackbuild/spec";
import { probePair, type ProbeRun } from "@hackbuild/sim";
import { cmdError } from "../errors.js";
import type { CoreCtx } from "../ctx.js";
import type { CommandOut } from "../result.js";
import { sceneDeps, sceneOf, simResult } from "./sim.run.js";

export type PartProbeInput = Omit<CommandInput<"part.probe">, "part" | "at" | "section" | "ray"> & {
  readonly part?: string;
  /** CLI-only until M10. */
  readonly scene?: string;
  /** Body names, name or name@L. */
  readonly a?: string;
  readonly b?: string;
  readonly pose?: string;
};

export type PartProbeOutput = ProbeResult & ProbeRun & { readonly lines: readonly string[] };

function need(v: string | undefined, path: string): string {
  if (v === undefined) throw cmdError({ code: "E_PARAM_MISSING", path, expected: "a body name", hint: `pass ${path.replace("/", "--")} <body>, for example --a crank --b upper` });
  return v;
}

export async function runPartProbe(i: PartProbeInput, ctx: CoreCtx): Promise<CommandOut<PartProbeOutput>> {
  const id = sceneOf({ ...(i.part === undefined ? {} : { build: i.part }), ...(i.scene === undefined ? {} : { scene: i.scene }) });
  const r = await probePair(id, { a: need(i.a, "/a"), b: need(i.b, "/b"), ...(i.pose === undefined ? {} : { pose: i.pose }) }, sceneDeps(ctx));
  const fmtP = (p: readonly number[]): string => p.map((v) => v.toFixed(2)).join(", ");
  const lines = [
    `probe  ${r.a.body}${r.a.side === "" ? "" : `@${r.a.side}`} to ${r.b.body}${r.b.side === "" ? "" : `@${r.b.side}`} at ${r.pose}: ${r.mm.toFixed(2)} mm (computed)`,
    `points  ${fmtP(r.a.point)} and ${fmtP(r.b.point)} mm`,
    ...(r.maskedMm === null ? [] : [`declared pair  closest unmasked ${r.maskedMm.toFixed(2)} mm (computed)`]),
  ];
  const out: PartProbeOutput = {
    ...r, hit: true, part: id, body: r.a.body, point: [r.a.point[0]!, r.a.point[1]!, r.a.point[2]!],
    nearest: [{ feature: r.b.body, mm: r.mm }], lines,
  };
  return simResult(out, null, ctx);
}
