// What the four CHK-INL run bodies share: the inlay declarations of a Part,
// the host body each one carves, the preset layer height and the floors
// read from profile. Run bodies read the Part IR only (D-024): the
// declarations are Part.features, the host slot is a Body, and the art grids
// are recomputed from the declaration by the same package code the
// generator runs (kind.ts), so a check proves what the generator emits.

import { commandError, type CheckCtx, type Mm, type Part } from "@hackbuild/spec";
import { inlaySplit, type InlayDecl, type InlayHost } from "../kind.js";

/** Profile constant: the smallest stroke that prints, mm (packages/profile/data/opacity.json). */
export const MIN_FEATURE_ID = "inlay.minFeature";

/** The inlay declarations of a part, in feature order. */
export function inlaysOf(part: Part): readonly InlayDecl[] {
  return part.features.filter((f): f is InlayDecl => f.kind === "inlay");
}

/** One declaration per art uri, the first that names it. */
export function distinctArts(part: Part): readonly InlayDecl[] {
  const seen = new Set<string>();
  return inlaysOf(part).filter((f) => (seen.has(f.art) ? false : (seen.add(f.art), true)));
}

/** Preset layer height of the part's machine, mm: the default preset, as the kernel's machine view reads it. */
export function layerHeightOf(part: Part, ctx: CheckCtx): Mm {
  const preset = ctx.profile.machine(part.machine).presets[0];
  if (preset === undefined) {
    throw commandError({ code: "E_REF", path: "/machine", got: part.machine, hint: `machine ${part.machine} has no preset; add one to profile`, record: "verification" });
  }
  return preset.layer;
}

/** The host body a declaration carves: its body field, else the part's first body of role body. */
export function hostOf(part: Part, f: InlayDecl, ctx: CheckCtx): InlayHost {
  const body = f.body !== undefined ? part.bodies.find((b) => b.id === f.body) : part.bodies.find((b) => b.role === "body");
  if (body === undefined) {
    throw commandError({ code: "E_REF", path: `/features/${f.id}/body`, got: f.body ?? null, hint: `inlay ${f.id} names no host body in part ${part.id}`, record: "verification" });
  }
  return { id: body.id, slot: body.slot, thk: f.face.origin[2], machine: { id: part.machine, layerHeight: layerHeightOf(part, ctx) } };
}

/** The split the generator emits for this declaration. */
export function splitOf(part: Part, f: InlayDecl, ctx: CheckCtx): ReturnType<typeof inlaySplit> {
  return inlaySplit(f, hostOf(part, f, ctx));
}

/** The stroke floor, mm: the feature's minFeature, never under the profile row. */
export function minFeatureOf(f: InlayDecl, ctx: CheckCtx): { readonly minF: Mm; readonly profileMinF: Mm; readonly from: "profile" | "feature" } {
  const c = ctx.profile.constant(MIN_FEATURE_ID);
  if (c.unit !== "mm" || !(c.value > 0)) {
    throw commandError({ code: "E_SCHEMA", path: `/constants/${c.id}`, got: { value: c.value, unit: c.unit }, expected: "a length above 0 in mm", hint: `set profile constant ${c.id} in mm`, record: "verification" });
  }
  return f.minFeature >= c.value ? { minF: f.minFeature, profileMinF: c.value, from: "feature" } : { minF: c.value, profileMinF: c.value, from: "profile" };
}

/** A number on a 1e-9 grid, so results read as computed and hash stably. */
export const tidy = (v: number, d = 9): number => Number(v.toFixed(d));
