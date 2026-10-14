// Pieces the check modules share: result targets, the finding shapes each
// legal kind takes, mesh access through the kernel views, and the active
// machine preset. Formatting and the interval evidence come from the
// skeleton's common.ts, so every check prints numbers one way.

import type {
  CheckCtx, Feature, Finding, MachinePreset, Part, ResultTarget, SourceFile, Verdict,
} from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";
import { checkError, fmt, intervalEvidence, missing, passOr, skip } from "../skeleton/common.js";
import { NO_MESH, viewsOf } from "../views.js";

export { checkError, fmt, intervalEvidence, missing, passOr, skip };

export const partTarget = (part: Pick<Part, "id">): ResultTarget => ({ level: "part", part: part.id });
export const featureTarget = (part: Pick<Part, "id">, f: Pick<Feature, "id">): ResultTarget => ({ level: "feature", part: part.id, feature: f.id });

type Extra = Finding["extra"];

/** Markdown and plain text: plan docs and knowledge records. */
const PROSE = /\.(?:md|markdown|txt)$/i;

/**
 * The skip a code rule (CHK-FIT-04, CHK-SHT-04, CHK-LNT-03, -04) returns on
 * a prose record, or undefined on code and bench sources. A record quotes
 * origin code, kerf values and part counts of many designs as evidence, so
 * an assignment or a count in it is a citation the rule cannot tell from a
 * copy (rules.audit, M04-T13). The voice rules, CHK-LNT-01 and -02, read
 * prose too.
 */
export function proseSkip(source: SourceFile): Finding | undefined {
  if (!PROSE.test(source.path)) return undefined;
  return skip({ level: "source", path: source.path }, "not run", "a prose record quotes origin code and counts as evidence; this rule reads code and bench sources");
}

/** A boolean finding: the rule held (true) or not. */
export function boolFinding(target: ResultTarget, ok: boolean, constraint: string, extra?: Extra, verdict?: Verdict): Finding {
  return {
    verdict: verdict ?? passOr(ok), target, measured: ok, legal: { kind: "boolean", must: true }, constraint,
    ...(extra === undefined ? {} : { extra }),
  };
}

/** An interval finding with nearest from the evidence. */
export function intervalFinding(
  target: ResultTarget, measured: number, lo: number | null, hi: number | null, unit: string, constraint: string, extra?: Extra,
): Finding {
  const ev = intervalEvidence(measured, lo, hi, unit);
  return {
    verdict: passOr(ev.inside), target, measured: ev.measured, legal: ev.legal, constraint,
    ...(extra === undefined ? {} : { extra }),
  };
}

/** A set finding: measured must be one of values. */
export function setFinding(target: ResultTarget, measured: string, values: readonly string[], constraint: string, extra?: Extra, unit?: string): Finding {
  const ok = values.includes(measured);
  return {
    verdict: passOr(ok), target, measured,
    legal: { kind: "set", values, ...(unit === undefined ? {} : { unit }), ...(values[0] === undefined ? {} : { nearest: ok ? measured : values[0] }) },
    constraint, ...(extra === undefined ? {} : { extra }),
  };
}

/** Body meshes of a part through the views, or the reason they are absent. */
export function bodyMeshes(part: Part, ctx: CheckCtx): { readonly meshes: readonly MeshData[]; readonly names: readonly string[] } | { readonly reason: string } {
  const view = viewsOf(ctx).mesh;
  if (view === undefined) return { reason: NO_MESH };
  const meshes: MeshData[] = [];
  for (const b of part.bodies) {
    const m = view(b.mesh);
    if (m === undefined) return { reason: `${NO_MESH}; body ${b.id} (${b.mesh.uri}) is not at hand` };
    meshes.push(m);
  }
  if (meshes.length === 0) return { reason: `part ${part.id} has no bodies` };
  return { meshes, names: part.bodies.map((b) => b.id) };
}

/** The solid mesh of a part through the views, or the reason it is absent. */
export function solidMesh(part: Part, ctx: CheckCtx): MeshData | { readonly reason: string } {
  const view = viewsOf(ctx).mesh;
  if (view === undefined) return { reason: NO_MESH };
  return view(part.solid) ?? { reason: `${NO_MESH}; solid ${part.solid.uri} is not at hand` };
}

export const isReason = (v: unknown): v is { readonly reason: string } =>
  typeof v === "object" && v !== null && "reason" in v && typeof (v as { reason: unknown }).reason === "string";

/**
 * The skip a print-layer check returns on a part whose machine cuts sheet
 * (laser, vinyl): such a machine has no slicer preset, so layer height,
 * first layer and line width do not exist for it (M06-T02, the TUMBLER
 * sheet parts). Undefined for a printed part, which the check then runs on.
 */
export function sheetSkip(part: Part, ctx: CheckCtx): Finding | undefined {
  if (ctx.profile.machine(part.machine).presets.length === 0) {
    return skip(partTarget(part), "not applicable", `machine ${part.machine} cuts ${part.process} sheet and has no layer grid; this check reads a printer preset`);
  }
  // A laser, vinyl or paper part on a machine row that carries a preset still has no layers.
  if (part.process !== "fdm") return skip(partTarget(part), "not applicable", `part ${part.id} is a ${part.process} part and has no print layers; this check applies to fdm parts`);
  return undefined;
}

/** The machine's first preset: the active preset of a build (PROFILE.md 8). E_PARAM_MISSING when the machine has none. */
export function presetOf(ctx: CheckCtx, machine: string): MachinePreset {
  const preset = ctx.profile.machine(machine).presets[0];
  if (preset === undefined) throw missing(`/profile/machines/${machine}/presets/0`, `machine ${machine} has no preset; layer and line width are unknown`);
  return preset;
}

/** A positive finite number or E_PARAM_MISSING at path. */
export function need(v: unknown, path: string, hint: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw missing(path, hint);
  return v;
}

/** The body a feature names, or the part's first body. */
export function bodyOf(part: Part, f: Pick<Feature, "id" | "body">) {
  const b = f.body === undefined ? part.bodies[0] : part.bodies.find((x) => x.id === f.body);
  if (b === undefined) {
    throw checkError({ code: "E_REF", path: `/features/${f.id}/body`, got: f.body ?? null, hint: `feature ${f.id} names a body part ${part.id} does not have`, record: "verification" });
  }
  return b;
}

/** Cell size for a raster over a part, mm: 0.1 on parts up to 40 mm, coarser so a layer stays near 400 cells a side. */
export function cellFor(extentMm: number): number {
  return Math.max(0.1, Number((extentMm / 400).toFixed(3)));
}
