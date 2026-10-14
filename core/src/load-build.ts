// Loading and building a design (M00-T13 step 7). chase.ts is read
// as data by the D-178 source reader (packages/chase), never executed;
// build.ts runs only in the build sandbox (sandbox.ts). Every design meshes
// on the packages/mesh stage runner (D-047); a design that carries no draft
// kinds builds with the full profile, and the keys flex-pair reference
// hands its draft kinds' cutters and bodies to the same runner as stage
// inputs (stageInputsOf). This file also resolves a target
// given as a chase id, writes the build to the store, and names the 3MF
// adapter that enters BuildInputs.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { PRE_UNION_KINDS, type AnyFeatureKindDef, type BodyDraft, type Chase, type FeatureKind, type FeatureOf, type GeneratedGeometry, type KernelCtx, type MeshRoute, type PartDraft, type ProfileLookup, type SchemaLike, type ShapeDecl } from "@hackbuild/spec";
import { readChaseSource } from "@hackbuild/chase";
import { loadProfile, type ProfileTables } from "@hackbuild/profile";
import { meshRef, runStages, type BodyCutters, type MeshData, type RasterMask } from "@hackbuild/mesh";
import { buildLines } from "@hackbuild/project";
import type { Built, Design, Meshed, Workspace } from "./commands/build.js";
import { cmdError, didYouMean } from "./errors.js";
import { kernelKindsOf } from "./kinds.js";
import { Store, type BuildRecord, type SlotView } from "./store.js";


/**
 * BuildInputs.adapter: `3mf/<dialect>-<version>` from the preset's slicer
 * application tag, for example BambuStudio-01.10.01.50 to
 * 3mf/bbs-01.10.01.50 (D-051, D-159).
 */
export function adapterOf(app: string): string {
  const m = /^(BambuStudio|OrcaSlicer)-(.+)$/.exec(app);
  if (m === null) return `3mf/${app}`;
  return `3mf/${m[1] === "BambuStudio" ? "bbs" : "orca"}-${m[2]!}`;
}

let fullTables: ProfileTables | undefined;

/** The profile packages/profile/data holds, loaded once per process. */
export function fullProfile(): ProfileTables {
  fullTables ??= loadProfile();
  return fullTables;
}

/** A feature kind and its generator are admitted together (D-058). */
function noGenerator(f: FeatureOf<FeatureKind>, _ctx: KernelCtx): GeneratedGeometry {
  throw cmdError({
    code: "E_KERNEL", path: `/features/${f.id}`, got: f.kind,
    hint: `feature kind ${f.kind} has no generator in this build; remove the feature or build it as a body`,
    record: "mesh-kernel",
  });
}

/**
 * A design without draft kinds: the stage runner and the full profile, with
 * the package kinds of every kernel the chase lists (kinds.ts). A feature
 * whose kind no listed kernel registers meets noGenerator.
 */
export function loadStageDesign(d: {
  readonly dir: string; readonly target: string; readonly chase: Chase;
  readonly buildFile: string; readonly defHash: Design["defHash"]; readonly ws: Workspace;
}): Design {
  const registered = kernelKindsOf(d.chase.meta.kernels);
  const always = registered.flatMap((e) => e.kinds);
  const onUse = registered.flatMap((e) => e.onUse ?? []);
  const defs = new Map<string, AnyFeatureKindDef>([...always, ...onUse].map((k) => [k.kind, k] as const));
  const maskFns = new Map(registered.flatMap((e) => (e.masks === undefined ? [] : e.kinds.map((k) => [k.kind, e.masks!] as const))));
  const generate = (f: FeatureOf<FeatureKind>, ctx: KernelCtx): GeneratedGeometry => {
    const def = defs.get(f.kind) as { generate(f: FeatureOf<FeatureKind>, ctx: KernelCtx): GeneratedGeometry } | undefined;
    return def === undefined ? noGenerator(f, ctx) : def.generate(f, ctx);
  };
  const featureMasks = (f: FeatureOf<FeatureKind>, ctx: KernelCtx): ReadonlyMap<string, RasterMask> => maskFns.get(f.kind)?.(f, ctx) ?? new Map();
  return {
    ...d, generate, featureMasks,
    kinds: Object.fromEntries(always.map((k) => [k.kind, k.version])),
    onUseKinds: Object.fromEntries(onUse.map((k) => [k.kind, k.version])),
    featureSchemas: Object.fromEntries([...defs.values()].map((k) => [k.kind, k.schema as SchemaLike])),
    kernelChecks: (seed) => registered.flatMap((e) => e.checks(seed)),
    ws: { ...d.ws, tables: fullProfile() }, stages: true,
  };
}

/**
 * Raster masks by uri for a stage design. Author has no mask registration,
 * so a build module that emits raster bodies exports `masks(params)`; the
 * sandbox calls it beside the build function and returns the table as data.
 */
function maskLookup(table: Readonly<Record<string, RasterMask>> | undefined): ((uri: string) => RasterMask) | undefined {
  if (table === undefined) return undefined;
  return (uri) => {
    const m = Object.prototype.hasOwnProperty.call(table, uri) ? table[uri] : undefined;
    if (m === undefined) {
      throw cmdError({ code: "E_REF", path: "/bodies/layers/mask", got: uri, didYouMean: didYouMean(uri, Object.keys(table)), hint: "return every mask uri a raster layer names from masks(params)" });
    }
    return m;
  };
}

/** What a feature kind generated for one feature, with the body it hosts on. */
export interface Generated {
  readonly f: FeatureOf<FeatureKind>;
  readonly host: BodyDraft;
  readonly g: GeneratedGeometry;
}

/** Stage runner inputs from the generated features: stage 2 to 4 shapes per host body, and the feature bodies. */
export interface StageInputs {
  readonly cutters: Record<string, BodyCutters>;
  readonly bodies: readonly BodyDraft[];
  /** Feature body id to the id of the body it hosts on. */
  readonly hosts: ReadonlyMap<string, string>;
}

/**
 * Map GeneratedGeometry onto the stage runner: preUnionCutters, positives
 * and postUnionCutters onto cutters[host id], concatenated in feature order
 * when several features share a host; each feature's bodies become one
 * BodyDraft with the feature id, its shapes joined by a csg union. Shapes
 * of one feature that disagree on role, slot or material are E_SCHEMA.
 * Only PRE_UNION_KINDS (chamfer, round) may emit preUnionCutters; any other
 * kind that does is E_KERNEL (D-047 stage 2, spec/feature-kinds.ts).
 */
export function stageInputsOf(generated: readonly Generated[]): StageInputs {
  const lists = new Map<string, { pre: ShapeDecl[]; pos: ShapeDecl[]; post: ShapeDecl[] }>();
  const bodies: BodyDraft[] = [];
  const hosts = new Map<string, string>();
  for (const { f, host, g } of generated) {
    if (g.preUnionCutters.length > 0 && !(PRE_UNION_KINDS as readonly string[]).includes(f.kind)) {
      throw cmdError({
        code: "E_KERNEL", path: `/features/${f.id}/preUnionCutters`, got: f.kind,
        expected: `one of ${PRE_UNION_KINDS.join(", ")}`,
        hint: `feature kind ${f.kind} may not cut before union; emit its cutters as postUnionCutters`, record: "mesh-kernel",
      });
    }
    const l = lists.get(host.id) ?? { pre: [], pos: [], post: [] };
    l.pre.push(...g.preUnionCutters);
    l.pos.push(...g.positives);
    l.post.push(...g.postUnionCutters);
    lists.set(host.id, l);
    const [first, ...rest] = g.bodies;
    if (first === undefined) continue;
    rest.forEach((b, j) => {
      if (b.role !== first.role || b.slot !== first.slot || b.material !== first.material) {
        throw cmdError({
          code: "E_SCHEMA", path: `/features/${f.id}/bodies/${j + 1}`, got: [b.role, b.slot, b.material],
          expected: `${first.role}, slot ${first.slot}, ${first.material} as body 0`,
          hint: `feature ${f.id} generates one body; give every shape one role, slot and material`, record: "mesh-kernel",
        });
      }
    });
    const base: ShapeDecl = rest.length === 0 ? first.shape : { route: "csg", op: "union", of: g.bodies.map((b) => b.shape) };
    bodies.push({ id: f.id, role: first.role, slot: first.slot, material: first.material, base });
    hosts.set(f.id, host.id);
  }
  const cutters: Record<string, BodyCutters> = {};
  for (const [id, l] of lists) {
    if (l.pre.length + l.pos.length + l.post.length === 0) continue;
    cutters[id] = { preUnionCutters: l.pre, unionPositives: l.pos, postUnionCutters: l.post };
  }
  return { cutters, bodies, hosts };
}

/** Run the eight stages (D-047) on the draft and its generated features: the only mesher part.build uses. */
export async function stageMesh(
  draft: PartDraft, profile: ProfileLookup, masks: Readonly<Record<string, RasterMask>> | undefined, generated: readonly Generated[] = [],
): Promise<Meshed> {
  const mask = maskLookup(masks);
  const { cutters, bodies: featureBodies, hosts } = stageInputsOf(generated);
  const out = await runStages({ draft, profile, cutters, bodies: featureBodies, ...(mask === undefined ? {} : { mask }) });
  const bodies = out.bodies.map((b) => {
    const host = hosts.get(b.draft.id);
    return {
      id: b.draft.id, role: b.draft.role, slot: b.draft.slot, material: b.draft.material,
      ...(host === undefined ? {} : { host }), mesh: b.mesh, ref: meshRef(b.mesh),
    };
  });
  // One exported part per body: bodies of one slot stay separate parts of the object.
  const slots = bodies.map((b) => ({ slot: b.slot, material: b.material, mesh: b.mesh, name: b.id }));
  return {
    bodies, slots, solid: meshRef(out.solid), routes: [...out.routes].sort() as MeshRoute[],
    itemTransform: out.itemTransform, warnings: out.warnings, staged: out,
  };
}

/** Directories that may hold a chase: reference/<area>/<id> and designs/<id>, sorted. */
function chaseDirs(root: string): string[] {
  const out: string[] = [];
  const sub = (d: string): string[] => (existsSync(d) ? readdirSync(d).sort().map((x) => path.join(d, x)).filter((x) => statSync(x).isDirectory()) : []);
  for (const area of sub(path.join(root, "reference"))) out.push(...sub(area));
  out.push(...sub(path.join(root, "designs")));
  return out.filter((d) => existsSync(path.join(d, "chase.ts")));
}

/** The chase id and aliases a chase.ts declares, read as data; a chase the reader refuses names none. */
function chaseNamesOf(dir: string): { readonly id?: string; readonly aliases: readonly string[] } {
  try {
    const { chase } = readChaseSource(readFileSync(path.join(dir, "chase.ts"), "utf8"), path.join(dir, "chase.ts"));
    return { id: chase.meta.id, aliases: Array.isArray(chase.meta.aliases) ? chase.meta.aliases.filter((a): a is string => typeof a === "string") : [] };
  } catch {
    return { aliases: [] };
  }
}

/** Every chase directory with the names a target may use for it: id, aliases and basename. */
export function chaseIndex(root: string): { readonly dir: string; readonly rel: string; readonly names: readonly string[] }[] {
  return chaseDirs(root).map((d) => {
    const n = chaseNamesOf(d);
    return { dir: d, rel: path.relative(root, d), names: [...new Set([...(n.id === undefined ? [] : [n.id]), ...n.aliases, path.basename(d)])] };
  });
}

/**
 * A design directory or a chase id, alias or directory name. An unknown
 * name is E_REF with the nearest names; a name two directories answer to is
 * E_REF listing both, so a copied design cannot shadow another by id.
 */
export function resolveTarget(target: string, cwd: string, root: string, at = "/chase"): string {
  const dir = path.resolve(cwd, target);
  if (existsSync(dir) && statSync(dir).isDirectory()) return dir;
  const known = chaseIndex(root);
  const hits = known.filter((k) => k.names.includes(target));
  if (hits.length === 1) return hits[0]!.dir;
  if (hits.length > 1) {
    throw cmdError({
      code: "E_REF", path: at, got: target, expected: "a name one chase directory answers to",
      didYouMean: hits.map((h) => h.rel).slice(0, 3),
      hint: `${hits.length} chase directories answer to ${target}: ${hits.map((h) => h.rel).join(", ")}; name the directory`,
    });
  }
  throw cmdError({
    code: "E_REF", path: at, got: target, expected: "a design or reference directory holding chase.ts, or its chase id",
    didYouMean: didYouMean(target, known.flatMap((k) => [k.rel, ...k.names])),
    hint: "name a design directory such as reference/keys/flex-pair, or a chase id",
  });
}

/** Slot views for the renderer: label and preview colour per chase slot. */
export function slotViews(built: Built): SlotView[] {
  const { chase, ws } = built.design;
  const used = [...new Set(built.part.bodies.map((b) => b.slot))].sort((a, b) => a - b);
  return used.map((slot) => {
    const decl = chase.materials.find((m) => m.slot === slot);
    const colour = decl?.preview ?? ws.template.keys["filament_colour"]?.[slot - 1] ?? "#808080";
    return { slot, material: decl?.material ?? "", label: decl?.label ?? `slot${slot}`, colour };
  });
}

/** Write a build and its meshes to the store; returns the record. */
export function storeBuild(store: Store, built: Built): BuildRecord {
  const rec: BuildRecord = {
    format: "hbf-build-1", buildHash: built.part.buildHash, chase: built.design.chase.meta.id, target: built.design.target,
    values: built.values, inputs: built.inputs, part: built.part, slots: slotViews(built), graph: buildLines(built.graph),
  };
  const meshes: MeshData[] = [...built.meshed.bodies.map((b) => b.mesh), ...built.meshed.slots.map((s) => s.mesh)];
  store.putBuild(rec, meshes);
  return rec;
}
