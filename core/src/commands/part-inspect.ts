// part.inspect (M00-T13 step 10): bodies with slot, material, role, volume,
// bounding box and meshHash, plus features, frame, slots, metrics and
// warnings of a stored build. A design directory builds and stores first.

import type { CommandInput, CommandOutput, FeatureView, HbfUri } from "@hackbuild/spec";
import { partOf } from "@hackbuild/project";
import { cmdError } from "../errors.js";
import { storeBuild } from "../load-build.js";
import { parseUri, type BuildRecord, type SlotView } from "../store.js";
import type { CoreCtx } from "../ctx.js";
import type { CommandOut } from "../result.js";
import { buildTarget } from "./part-build.js";

/** What part.inspect returns: the CommandIO output plus the stored record's slots, metrics and warnings. */
export type InspectOut = CommandOutput<"part.inspect"> & {
  readonly build: string;
  readonly chase: string;
  readonly slots: readonly SlotView[];
  readonly metrics: BuildRecord["part"]["metrics"];
  readonly warnings: BuildRecord["part"]["warnings"];
};

function featureViews(rec: BuildRecord): FeatureView[] {
  return rec.part.features.map((f) => {
    const resolved: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(f as unknown as Record<string, unknown>)) {
      if (k !== "id" && k !== "kind" && (typeof v === "number" || typeof v === "string")) resolved[k] = v;
    }
    return { id: f.id, kind: f.kind, resolved, checks: [] };
  });
}

/**
 * The build record a target names: a design directory builds and stores
 * first; hbf://build/<h> and hbf://build/<h>/part/<partId> read the store.
 * Any other store uri is read, so its hash is checked, before part.inspect
 * refuses it as no build.
 */
export async function recordOf(target: string, ctx: CoreCtx, at: string): Promise<BuildRecord> {
  if (target.startsWith("hbf://")) {
    const p = parseUri(target, at);
    if (p.kind === "build") {
      const rec = ctx.store.build(`hbf://build/${p.id}`, at);
      if (p.part !== undefined) partOf(rec, p.part, target, at);
      return rec;
    }
    await ctx.store.get(target as HbfUri);
    throw cmdError({
      code: "E_HANDLE", path: at, got: target, expected: "hbf://build/<buildHash>",
      hint: `that uri names a ${p.kind}; part.inspect reads a build, and hbf explain prints any hbf:// uri`,
    });
  }
  return storeBuild(ctx.store, await buildTarget(target, ctx, undefined, undefined, at));
}

export async function runPartInspect(input: CommandInput<"part.inspect">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"part.inspect">>> {
  const rec = await recordOf(input.part, ctx, "/part");
  const result: InspectOut = {
    build: `hbf://build/${rec.buildHash}`, chase: rec.chase,
    features: featureViews(rec), frame: rec.part.frame, bodies: rec.part.bodies,
    slots: rec.slots, metrics: rec.part.metrics, warnings: rec.part.warnings,
  };
  return {
    verdict: "pass", stage: "done", buildHash: rec.buildHash, inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [], artifacts: [], next: [], result,
  };
}
