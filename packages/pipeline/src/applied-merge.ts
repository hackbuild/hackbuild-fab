// The applied merge (spec/build.ts APPLIED_MERGE, D-165, M06-T12 step 2):
// before kernel stage 1, every chase.applied entry whose part is the
// draft's id, in array order, resolves its FaceRef through the shared face
// resolver, places its archetype through the one placement path
// (archetypes placeArchetype, which Author.arch also calls), and appends
// the bodies, features, metrics and warnings to the draft. Ids are
// prefixed `<archetype id>.<n>.`, n counting entries of that archetype on
// the part, so an entry merges to the ids Author.arch would give the same
// call. apply() sees the draft as build.ts returned it.

import type { AppliedArchetype, BuildWarning, MaterialSlot, PartDraft, ProfileLookup } from "@hackbuild/spec";
import { archetypes, placeArchetype } from "@hackbuild/archetypes";
import { commandError as cmdError, didYouMean } from "@hackbuild/spec";
import { resolveFace } from "./face-frame.js";

export interface MergeCtx {
  readonly profile: ProfileLookup;
  readonly materials: readonly MaterialSlot[];
}

/** The draft with every applied entry for it merged; the draft itself when none applies. */
export function mergeApplied(draft: PartDraft, applied: readonly AppliedArchetype[], ctx: MergeCtx): PartDraft {
  if (applied.length === 0) return draft;
  const counts = new Map<string, number>();
  const bodies = [...draft.bodies];
  const features = [...draft.features];
  const metrics = [...(draft.metrics ?? [])];
  const warnings: BuildWarning[] = [...(draft.warnings ?? [])];
  applied.forEach((entry, i) => {
    if (entry.part !== draft.id) {
      throw cmdError({
        code: "E_REF", path: `/applied/${i}/part`, got: entry.part, expected: "the id of a part build.ts returns", didYouMean: didYouMean(entry.part, [draft.id]),
        hint: `applied entry ${i} names part ${entry.part}; build.ts returns part ${draft.id}`,
      });
    }
    const key = archetypes.resolve(entry.archetype).id;
    const index = counts.get(key) ?? 0;
    counts.set(key, index + 1);
    const face = resolveFace(entry.face, draft.faces ?? [], `/applied/${i}/face`);
    const out = placeArchetype(archetypes, { id: entry.archetype, face, params: entry.params ?? {}, draft, profile: ctx.profile, index, materials: ctx.materials });
    bodies.push(...out.bodies);
    features.push(...out.features);
    metrics.push(...(out.metrics ?? []));
    warnings.push(...(out.warnings ?? []));
  });
  return { ...draft, bodies, features, ...(metrics.length === 0 ? {} : { metrics }), ...(warnings.length === 0 ? {} : { warnings }) };
}
