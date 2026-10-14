// CHK-3MF-08 run body (CHECKS.md 9.11, M05-T20 step 3): no object that holds
// a conductor body or shares a face with one has `interlocking_beam` on,
// whether set per object or inherited from the project. The rule on the
// package runs once, in packages/3mf (src/validate/chk-3mf-08.ts), which the
// validator mirror also runs; this body adds what only a build has. With
// the artifact's Part IR at hand (check.run, export.run and parity attach
// it) the package's conductor record is held against Part IR body roles and
// Part.bodyAdjacency, so an export or a slicer save whose record misses a
// conductor fails. The slicer defaults the loss quote reads are profile
// constants 3mf.interlockingBeamWidth and 3mf.interlockingDepth (vendor).

import type { CheckCtx, Finding, ProfileLookup, TargetOf } from "@hackbuild/spec";
import { beamFreeBodies, chk3mf08, type InterlockingDefaults } from "@hackbuild/3mf";
import { entriesOf } from "../skeleton/threemf.js";
import { boolFinding, skip } from "../defs/common.js";

export const BEAM_CONSTANTS = { beamWidthMm: "3mf.interlockingBeamWidth", depthCells: "3mf.interlockingDepth" } as const;

/** The slicer interlocking defaults from profile, read through the run's lookup so the reads are logged. */
export function interlockingDefaults(profile: Pick<ProfileLookup, "constant">): InterlockingDefaults {
  return { beamWidthMm: profile.constant(BEAM_CONSTANTS.beamWidthMm).value, depthCells: profile.constant(BEAM_CONSTANTS.depthCells).value };
}

export async function run3mf08(t: TargetOf<"artifact">, ctx: CheckCtx): Promise<readonly Finding[]> {
  const entries = Object.fromEntries(await entriesOf(t.artifact));
  const part = t.artifact.part;
  const beamFree = part === undefined ? undefined : beamFreeBodies(part.bodies, part.bodyAdjacency);
  const out = chk3mf08(entries, interlockingDefaults(ctx.profile), beamFree);
  const at = { level: "artifact" as const, artifact: t.artifact.name, path: out.path };
  if (out.verdict === "skip") return [skip(at, "not run", out.constraint)];
  return [boolFinding(at, out.verdict === "pass", out.constraint, out.extra)];
}
