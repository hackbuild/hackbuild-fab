// Part IR assembly (D-048, D-049): Part.bodies {id, mesh, material, slot,
// role}[] with `solid` as their union, the draft's metrics, and its
// warnings followed by the route warnings, all hashed into the part's
// content hash. A FITS row or a healer flip can then never lag its geometry.
//
// The mesh layer never assigns Part.buildHash. That hash is sha256 over the
// canonical BuildInputs (D-051, spec/ids.ts BuildHash) and only core, which
// holds those inputs, computes it. A part leaves here without it, and
// core's part.build (core/src/commands/build.ts buildPart) assembles its
// Part through assemblePart, so there is one assembly path.

import type { Body, BuildWarning, Hash, Part, PartDraft, Vec3 } from "@hackbuild/spec";
import { canonicalize, sha256Hex } from "@hackbuild/spec";
import { meshRef } from "./hash.js";
import { runStages, type StageInput, type StageOutput } from "./stages.js";

/** Part IR before core assigns buildHash from BuildInputs (D-051). */
export type UnhashedPart = Omit<Part, "buildHash">;

/** A built part and what stage 7 lifted into the 3MF item transform. */
export interface BuiltPart {
  readonly part: UnhashedPart;
  /** partContentHashOf(part, itemTransform). Not a BuildHash (D-051). */
  readonly contentHash: Hash;
  /** Bed offset removed from the vertices, mm (3MF dialect geometry rule 4). */
  readonly itemTransform: Vec3;
  /** Stage names that ran, in D-047 order. */
  readonly stages: readonly string[];
}

/**
 * Content hash: sha256 over the RFC 8785 canonical JSON of the part id, each
 * body's id, role, slot, material and meshHash, the solid's meshHash, the
 * body adjacency rows (M05-T20), the item transform, the metrics and the
 * warnings. It moves whenever geometry, a metric or a warning moves (D-049).
 * It is not the buildHash, which is keyed by BuildInputs (D-051) and
 * assigned only in core.
 */
export function partContentHashOf(p: UnhashedPart, itemTransform: Vec3): Hash {
  const doc = {
    id: p.id,
    bodies: p.bodies.map((b) => ({ id: b.id, role: b.role, slot: b.slot, material: b.material, mesh: b.mesh.hash })),
    solid: p.solid.hash,
    ...(p.bodyAdjacency === undefined ? {} : { bodyAdjacency: p.bodyAdjacency }),
    itemTransform,
    metrics: p.metrics,
    warnings: p.warnings,
  };
  return sha256Hex(canonicalize(doc)) as Hash;
}

/** Part IR from a draft and its stage output. */
export function assemblePart(draft: PartDraft, staged: StageOutput): BuiltPart {
  const bodies: Body[] = staged.bodies.map((b) => ({
    id: b.draft.id,
    mesh: meshRef(b.mesh),
    material: b.draft.material,
    slot: b.draft.slot,
    role: b.draft.role,
  }));
  const warnings: BuildWarning[] = [...(draft.warnings ?? []), ...staged.warnings];
  const part: UnhashedPart = {
    id: draft.id,
    name: draft.name,
    process: draft.process,
    machine: draft.machine,
    solid: meshRef(staged.solid),
    ...(staged.unionVolumeMm3 === undefined ? {} : { unionVolumeMm3: staged.unionVolumeMm3 }),
    bodies,
    ...(staged.adjacency === undefined ? {} : { bodyAdjacency: staged.adjacency }),
    features: draft.features,
    frame: draft.frame,
    ...(draft.pose === undefined ? {} : { pose: draft.pose }),
    source: { kind: "kernel", routes: staged.routes },
    ...(draft.thickness === undefined ? {} : { thickness: draft.thickness }),
    ...(draft.stack === undefined ? {} : { stack: draft.stack }),
    metrics: draft.metrics ?? [],
    warnings,
    assertions: draft.assertions ?? [],
  };
  return { part, contentHash: partContentHashOf(part, staged.itemTransform), itemTransform: staged.itemTransform, stages: staged.stages };
}

/**
 * Run the stages and assemble the part, without a buildHash. Named apart
 * from core's buildPart, which runs the sandboxed build and assigns the
 * BuildHash (D-051).
 */
export async function stagePart(input: StageInput): Promise<BuiltPart> {
  return assemblePart(input.draft, await runStages(input));
}
