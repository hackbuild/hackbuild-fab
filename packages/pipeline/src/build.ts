// One build of a design after its build function ran: the applied merge,
// the feature kinds, the D-047 stage runner, BuildInputs and buildHash
// (D-051), Part IR from mesh assemblePart, every check, and the 3mf
// package. part.build runs the build function in core's sandbox and a
// baked bench runs it in the page (D-264); both hand the draft to
// assembleBuild here, so one set of inputs gives one buildHash and one
// set of package bytes on either side. Nothing here reads a file, a clock
// or the environment: the caller passes the workspace data, defHash, the
// constraint versions and SOURCE_DATE_EPOCH.

import {
  commandError as cmdError, didYouMean,
  type AnyCheckDef, type ArtifactBytes, type ArtifactHash, type BodyDraft, type BuildHash, type BuildInputs, type BuildSandboxReason, type BuildWarning, type Chase, type CheckResult,
  type FeatureKind, type FeatureOf, type GeneratedGeometry, type Hash, type HookupDecl, type InferredRead, type KernelCtx,
  type MachineView, type McuPinSpec, type MeshRef, type MeshRoute, type Metric, type Net, type Part, type PartDraft, type ProfileRead, type SchemaLike, type Tier, type Vec3,
} from "@hackbuild/spec";
import { createProfileLookup, lossRowId, materialFamily, type ProfileTables } from "@hackbuild/profile";
import { assemblePart, isWatertight, meshError, type MeshData, type RasterMask, type StageOutput } from "@hackbuild/mesh";
import { configOf, write3mf, type FilamentSlot, type FilamentTemplate, type SlicerMaterials, type ThreeMfInput } from "@hackbuild/3mf";
import { CHECK_MODULES, CLAIM_CHECKS, IMPORT_PATH_CHECKS, PAGE_MILESTONE, kernelsAt, registerChecks, runRegistry, runSkeleton, skeletonChecks, skeletonNets, type KernelViews } from "@hackbuild/checks";
import { hashOf } from "./hash.js";
import { M00_PART_CHECKS, gatedSkips, m00Versions, registryHashOf, runPartChecks } from "./part-checks.js";
import { machineView } from "./author.js";
import { adapterOf, stageMesh } from "./stage.js";
import { mergeApplied } from "./applied-merge.js";
import { draftProblem } from "./draft.js";
import { resolveParams, type Values } from "./params.js";

const isObject = (v: unknown): v is Values => typeof v === "object" && v !== null && !Array.isArray(v);

type Generate = (f: FeatureOf<FeatureKind>, ctx: KernelCtx) => GeneratedGeometry;

// ---- workspace data and the design ----

/** The seeds and tables a build reads; core loads them from the workspace, a bake writes them into the page. */
export interface Workspace {
  readonly tables: ProfileTables;
  readonly checksSeed: unknown;
  readonly template: FilamentTemplate;
  readonly materials: SlicerMaterials;
  readonly mcu: (id: string) => McuPinSpec;
  readonly versions: { readonly kernel: string; readonly manifold: string };
}

export interface Design {
  readonly chase: Chase;
  readonly generate: Generate;
  /** Feature kind id to version, for registryHash. */
  readonly kinds: Readonly<Record<string, string>>;
  /** Kinds registered on use (kinds.ts onUse), id to version; they join registryHash when the draft declares them. */
  readonly onUseKinds?: Readonly<Record<string, string>>;
  /**
   * FeatureKindDef.schema by kind id. assembleBuild applies it to every
   * draft feature of that kind before kernel stage 1 (D-178); a kind with
   * no entry is refused by its generator.
   */
  readonly featureSchemas?: Readonly<Record<string, SchemaLike>>;
  /** Raster masks a generated shape names, by uri; package kinds that emit raster bodies supply them (kinds.ts). */
  readonly featureMasks?: (f: FeatureOf<FeatureKind>, ctx: KernelCtx) => ReadonlyMap<string, RasterMask>;
  /** CheckDefs of the kernels the chase lists, built from the check seed (kinds.ts). */
  readonly kernelChecks?: (seed: unknown) => readonly AnyCheckDef[];
  readonly defHash: Hash;
  readonly ws: Workspace;
  /**
   * True when the design carries no draft kinds; the build function's
   * module is then asked for raster masks. Every design meshes on the
   * stage runner.
   */
  readonly stages: boolean;
}

/** What the build function returned and what it read, as core's sandbox replies it (core/src/sandbox.ts SandboxResult). */
export interface DraftRun {
  readonly draft: unknown;
  readonly warnings: readonly BuildWarning[];
  readonly derived: readonly Metric[];
  readonly reads: readonly ProfileRead[];
  readonly profileWarnings: readonly BuildWarning[];
  readonly masks?: Readonly<Record<string, RasterMask>>;
}

// ---- meshing: the packages/mesh stage runner ----

interface Positioned { readonly id: string; readonly role: BodyDraft["role"]; readonly slot: number; readonly material: string; readonly host?: string }

/** A build's meshes from the D-047 stage runner (packages/mesh runStages), the only mesher. */
export interface Meshed {
  readonly bodies: readonly (Positioned & { readonly mesh: MeshData; readonly ref: MeshRef })[];
  /** Exported parts, one per body after stage 5 partition; bodies of one slot stay separate parts. */
  readonly slots: readonly { readonly slot: number; readonly material: string; readonly mesh: MeshData; readonly name: string }[];
  readonly solid: MeshRef;
  readonly routes: readonly MeshRoute[];
  /** Stage 7: the bed offset lifted off the vertices into the 3MF item transform, mm. */
  readonly itemTransform: Vec3;
  /** Route and stage warnings (healer, prism retries, stage 6 INSET); they enter Part.warnings (D-049). */
  readonly warnings: readonly BuildWarning[];
  /** The stage runner output itself; part.build hands it to mesh assemblePart, the one Part IR assembly path. */
  readonly staged: StageOutput;
}


// ---- one build ----

export interface Built<D extends Design = Design> {
  readonly design: D;
  readonly values: Values;
  readonly draft: PartDraft;
  readonly part: Part;
  readonly meshed: Meshed;
  readonly inputs: BuildInputs;
  readonly sourceDateEpoch: number;
}

/** The canonical {table, id, row} of one profile read, the unit profileHash and the graph's row items cover. */
export function readRow(tables: ProfileTables, r: ProfileRead): { readonly table: string; readonly id: string; readonly row: unknown } {
  return { table: r.table, id: r.id, row: rowOf(tables, r) ?? null };
}

function profileRows(tables: ProfileTables, reads: readonly ProfileRead[]): unknown[] {
  return reads.map((r) => readRow(tables, r));
}

/** The profile row a read names, by table; tables the slice does not hold give undefined. */
const ROW_OF: Readonly<Record<string, (t: ProfileTables, id: string) => unknown>> = {
  material: (t, id) => t.materials.find((m) => m.id === id),
  machine: (t, id) => t.machines.find((m) => m.id === id),
  toolhead: (t, id) => {
    const [m, i] = id.split(".");
    return t.machines.find((x) => x.id === m)?.toolheads.find((h) => String(h.index) === i);
  },
  resistivity: (t, id) => t.materials.flatMap((m) => m.resistivity).find((r) => r.id === id),
  loss: (t, id) => t.loss.find((r) => lossRowId(r) === id),
  constant: (t, id) => t.constants?.constants.find((c) => c.id === id),
  fit: (t, id) => t.fits?.fits.find((f) => f.class === id),
};

function rowOf(tables: ProfileTables, r: ProfileRead): unknown {
  return ROW_OF[r.table]?.(tables, r.id);
}

function tierOf(tables: ProfileTables, r: ProfileRead): Tier | undefined {
  const row = rowOf(tables, r) as { provenance?: { tier?: Tier }; tier?: Tier } | undefined;
  return row?.provenance?.tier ?? row?.tier;
}

/** Profile reads in first-read order without repeats, as one lookup would log them. */
function mergeReads(...logs: (readonly ProfileRead[])[]): ProfileRead[] {
  const seen = new Set<string>();
  return logs.flat().filter((r) => {
    const key = `${r.table}\u0000${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Warnings in first-seen order, one per code, text and param. param is in
 * the key: two TPU slots raise PRESET_INFERRED with one text and differ
 * only by the slot their param names.
 */
export function mergeWarnings(...lists: (readonly BuildWarning[])[]): BuildWarning[] {
  const out: BuildWarning[] = [];
  for (const w of lists.flat()) if (!out.some((x) => x.code === w.code && x.text === w.text && x.param === w.param)) out.push(w);
  return out;
}

const pointerSegment = (k: PropertyKey | { readonly key: PropertyKey }): string =>
  String(typeof k === "object" ? k.key : k).replace(/~/g, "~0").replace(/\//g, "~1");

/**
 * The first draft feature its kind's FeatureKindDef.schema refuses, as a
 * JSON pointer into the draft and the schema's message. A kind with no
 * schema entry is left to its generator, which names the milestone that
 * admits it.
 */
export async function featureSchemaProblem(
  schemas: Readonly<Record<string, SchemaLike>>, features: readonly Record<string, unknown>[],
): Promise<{ readonly path: string; readonly detail: string } | undefined> {
  for (const [i, f] of features.entries()) {
    const kind = String(f["kind"]);
    const schema = Object.prototype.hasOwnProperty.call(schemas, kind) ? schemas[kind] : undefined;
    if (schema === undefined) continue;
    const r = await schema["~standard"].validate(f);
    if (r.issues === undefined) continue;
    const issue = r.issues[0];
    const at = (issue?.path ?? []).map(pointerSegment).join("/");
    return {
      path: `/features/${i}${at === "" ? "" : `/${at}`}`,
      detail: `feature ${String(f["id"])} fails the ${kind} schema: ${issue?.message ?? "invalid"}`,
    };
  }
  return undefined;
}

/**
 * The MachineView of a sheet machine: it cuts flat stock, so it has no
 * layer grid or line width, and any kind that asks for one is E_KERNEL
 * naming the machine rather than a number made up for it.
 */
export function sheetMachineView(id: string): MachineView {
  const none = (what: string): never => {
    throw cmdError({ code: "E_KERNEL", path: "/machine", got: id, expected: "a printer preset", hint: `${id} cuts sheet and has no ${what}; build this feature on a printer machine`, record: "mesh-kernel" });
  };
  return {
    id,
    get layerHeight(): number { return none("layer height"); },
    get firstLayer(): number { return none("first layer"); },
    get lineWidth(): number { return none("line width"); },
    layer: () => none("layer grid"), layerTop: () => none("layer grid"), layerIndex: () => none("layer grid"), line: () => none("line width"),
  };
}

/** Each on-use kind (core/src/kinds.ts onUse) the draft declares, id to version. */
function onUseUsed(design: Design, draft: PartDraft): Record<string, string> {
  return Object.fromEntries(Object.entries(design.onUseKinds ?? {}).filter(([k]) => draft.features.some((f) => f.kind === k)));
}

/**
 * kindsUsed split for the project graph: a design without stages carries
 * draft kinds (skeleton-kinds.ts), linked as items of that design; its
 * on-use kinds and every stage design's kinds are package kinds.
 */
export function graphKinds(design: Design, draft: PartDraft): { kinds: Readonly<Record<string, string>>; draftKinds?: Readonly<Record<string, string>> } {
  return design.stages ? { kinds: kindsUsed(design, draft) } : { kinds: onUseUsed(design, draft), draftKinds: design.kinds };
}

/** The design's registered kinds plus each on-use kind its draft declares. */
export function kindsUsed(design: Design, draft: PartDraft): Readonly<Record<string, string>> {
  const used = onUseUsed(design, draft);
  return Object.keys(used).length === 0 ? design.kinds : { ...design.kinds, ...used };
}

export interface AssembleOptions {
  /** SOURCE_DATE_EPOCH for BuildInputs, s. */
  readonly epoch: number;
  /** Every constraint def the caller collects, id to version, for registryHash (core/src/checks.ts constraintVersions). */
  readonly constraints: Readonly<Record<string, string>>;
  /** The error a draft the build function returned fails with; core names its build file and the sandbox reason. */
  readonly stop: (reason: BuildSandboxReason, detail: string, at?: string) => Error;
}

/**
 * One build from the draft its build function returned (DraftRun) and the
 * values it ran on. `reads` is every profile read in first-read order, the
 * build function's first and the kernel's after, for the project graph.
 */
export async function assembleBuild<D extends Design>(design: D, values: Values, sb: DraftRun, opts: AssembleOptions): Promise<{ readonly built: Built<D>; readonly reads: readonly ProfileRead[] }> {
  const { chase, ws } = design;
  const profile = createProfileLookup(ws.tables);
  const result = sb.draft;
  if (!isObject(result) || !Array.isArray(result["bodies"])) {
    throw cmdError({ code: "E_KERNEL", path: "/build", got: isObject(result) && "parts" in result ? "assembly" : typeof result, expected: "one PartDraft", hint: "part.build builds one PartDraft; assemblies are not built yet", record: "agent-capability" });
  }
  const problem = draftProblem(result);
  if (problem !== undefined) throw opts.stop("result-schema", `${problem.got} where the draft needs ${problem.expected}`, problem.path);
  const featureProblem = await featureSchemaProblem(design.featureSchemas ?? {}, result["features"] as readonly Record<string, unknown>[]);
  if (featureProblem !== undefined) throw opts.stop("result-schema", featureProblem.detail, featureProblem.path);
  // Author.derive values join the draft's metrics, sorted by id after them,
  // so they hash with the part and reach the HUD (spec/build.ts Author.derive).
  // The applied merge runs on the draft as build.ts returned it, before
  // stage 1 (spec/build.ts APPLIED_MERGE); chase.applied is in defHash.
  const drafted = mergeApplied(result as unknown as PartDraft, chase.applied ?? [], { profile, materials: chase.materials });
  const derivedIds = new Set(sb.derived.map((m) => m.id));
  const clash = (drafted.metrics ?? []).findIndex((m) => derivedIds.has(m.id));
  if (clash >= 0) throw opts.stop("result-schema", `metric ${drafted.metrics?.[clash]?.id} repeats a k.derive id`, `/metrics/${clash}`);
  const raw: PartDraft = sb.derived.length === 0 ? drafted
    : { ...drafted, metrics: [...(drafted.metrics ?? []), ...[...sb.derived].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))] };
  // A sheet machine (laser, vinyl) has no slicer preset and no layer grid (M06-T02).
  const sheet = profile.machine(raw.machine).presets.length === 0;
  const view = sheet ? sheetMachineView(raw.machine) : machineView(profile, raw.machine);
  const slots: Record<string, number> = {};
  for (const m of chase.materials) slots[m.material] ??= m.slot;
  const generated = raw.features.map((f) => {
    const hostId = "body" in f ? (f as { body: string }).body : raw.bodies[0]?.id;
    const host = raw.bodies.find((b) => b.id === hostId) ?? raw.bodies[0];
    if (host === undefined) throw cmdError({ code: "E_SCHEMA", path: "/bodies", got: 0, expected: "at least one body", hint: "declare a body with k.body" });
    const ctx: KernelCtx = { profile, route: host.base.route, process: raw.process, machineView: view, body: host, faces: raw.faces ?? [], slots };
    return { f: f as FeatureOf<FeatureKind>, host, g: design.generate(f as FeatureOf<FeatureKind>, ctx), ctx };
  });
  // Masks a package kind's raster shapes name join the build module's own; both are content addressed.
  const kindMasks = design.featureMasks === undefined ? []
    : generated.flatMap(({ f, ctx }) => [...design.featureMasks!(f, ctx)]);
  const masks = kindMasks.length === 0 ? sb.masks : { ...(sb.masks ?? {}), ...Object.fromEntries(kindMasks) };
  const meshed = await stageMesh(raw, profile, masks, generated);
  // The build's reads came first in the child; the kernel's follow here.
  const reads = mergeReads(sb.reads, profile.reads());
  const draft: PartDraft = { ...raw, warnings: [...(raw.warnings ?? []), ...sb.warnings, ...mergeWarnings(sb.profileWarnings, profile.warnings(), meshed.warnings)] };
  const epoch = opts.epoch;
  const inputs: BuildInputs = {
    defHash: design.defHash,
    paramsHash: hashOf(values),
    profileHash: hashOf(profileRows(ws.tables, reads)),
    registryHash: registryHashOf({ kinds: kindsUsed(design, raw), constraints: opts.constraints, checks: checkVersions(design), exporters: { "3mf": hashOf(ws.template) } }),
    kernelVersion: ws.versions.kernel,
    engines: { manifold: ws.versions.manifold },
    adapter: sheet ? "none" : adapterOf(profile.preset(raw.machine).slicer.app),
    seed: 0,
    sourceDateEpoch: epoch,
    licences: { [chase.meta.id]: chase.meta.license, "manifold-3d": "Apache-2.0", jszip: "MIT" },
  };
  // Part IR comes from mesh assemblePart (D-048, D-049): the draft's warnings
  // first, then the route warnings merged with the profile's, so part.warnings
  // equals draft.warnings. Only this assembly holds BuildInputs, so only it
  // assigns buildHash, sha256 over their RFC 8785 canonical form (D-051).
  const assembled = assemblePart(
    { ...raw, warnings: [...(raw.warnings ?? []), ...sb.warnings], assertions: [...(chase.assertions ?? []), ...(raw.assertions ?? [])] },
    { ...meshed.staged, warnings: mergeWarnings(sb.profileWarnings, profile.warnings(), meshed.warnings) },
  );
  const part: Part = { ...assembled.part, buildHash: hashOf(inputs) as BuildHash };
  const built: Built<D> = { design, values, draft, part, meshed, inputs, sourceDateEpoch: epoch };
  return { built, reads };
}

// ---- checks ----

/** The skeleton checks, then the checks of every kernel the chase lists (core/src/kinds.ts). */
export function checkDefs(design: Design): readonly AnyCheckDef[] {
  return [
    ...skeletonChecks({ seed: design.ws.checksSeed, filamentTemplate: design.ws.template }),
    ...(design.kernelChecks?.(design.ws.checksSeed) ?? []),
  ];
}

/** Levels a single build produces targets for in the registry run: the part and its features. */
const BUILD_LEVELS: readonly string[] = ["part", "body", "feature"];

/**
 * The registered checks of the part, body and feature levels that the
 * skeleton set, the kernel checks and the M00 Part IR checks do not
 * already run (security finding 3 of the audit of 2026-10-08: CHK-PRT-16
 * and the other registry block checks never reached the D-109 export
 * gate). They run through runRegistry on the kernels of the page milestone.
 * The import path checks (IMPORT_PATH_CHECKS) stay out: Part IR carries no
 * pieces, so they run only where part.build --import reads the mesh. The
 * claim check (CLAIM_CHECKS) stays out too: it reads the chase claims,
 * which Part IR does not carry.
 */
export function registryDefs(design: Design): readonly AnyCheckDef[] {
  const taken = new Set<string>([...checkDefs(design).map((d) => d.id as string), ...M00_PART_CHECKS, ...IMPORT_PATH_CHECKS, ...CLAIM_CHECKS]);
  return registerChecks({ seed: design.ws.checksSeed, filamentTemplate: design.ws.template }, CHECK_MODULES)
    .filter((d) => BUILD_LEVELS.includes(d.appliesTo.level) && !taken.has(d.id));
}

/** Every check id the design resolves, to its version: registryHash and reportHash both read it. */
export function checkVersions(design: Design): Record<string, string> {
  return {
    ...Object.fromEntries(checkDefs(design).map((d) => [d.id, d.version])),
    ...m00Versions(design.ws.checksSeed),
    ...Object.fromEntries(registryDefs(design).map((d) => [d.id, d.version])),
  };
}

/**
 * The registry checks of registryDefs on one build, each with its own
 * ProfileLookup so the inferred rows it read are attributed to it. A def a
 * failed precondition gates (prior holds the skeleton and M00 results)
 * returns its skip, as runRegistry would.
 */
export async function runBuildRegistry(built: Built, prior: readonly CheckResult[], only?: readonly string[]): Promise<Omit<Checked, "nets">> {
  const { design } = built;
  const defs = registryDefs(design).filter((d) => only === undefined || only.includes(d.id));
  // The views the 2026-10-08 prototype ran: the body meshes the export
  // writes, by hash, and each body's declared shape, on the Part IR as
  // emitted. Two views stay out until a person decides two findings (M04-T03
  // card defects): the union solid, on which CHK-KEY-06 reads the stage 7
  // snap slivers of the flex-pair cone shells as vertices on faces, and the
  // plan outlines, with which CHK-NET-04 fails the flex-pair leads that end
  // on the pad edge for their clips. Both checks skip with their reason.
  const meshes = new Map<string, MeshData>(built.meshed.bodies.map((b) => [b.ref.hash, b.mesh] as const));
  const views: KernelViews = {
    mesh: (ref) => meshes.get(ref.hash),
    shape: (_part, body) => built.draft.bodies.find((b) => b.id === body)?.base,
  };
  const gated = gatedSkips(design.ws.checksSeed, built.part.id, prior, defs);
  const results: CheckResult[] = [];
  const inferred = new Map<string, Set<string>>();
  const warnings: BuildWarning[] = [];
  for (const def of defs) {
    const skip = gated.get(def.id);
    if (skip !== undefined) {
      results.push(skip);
      continue;
    }
    const lookup = createProfileLookup(design.ws.tables);
    const report = await runRegistry([def], {
      kernels: kernelsAt(PAGE_MILESTONE), targets: { parts: [built.part] }, views,
      ctx: { profile: lookup, machine: built.draft.machine, whitelist: new Map() },
    });
    results.push(...report.results);
    for (const w of lookup.warnings()) if (!warnings.some((x) => x.code === w.code && x.text === w.text)) warnings.push(w);
    if (report.ran === 0) continue;
    for (const r of lookup.reads()) {
      if (tierOf(design.ws.tables, r) !== "inferred") continue;
      const key = `${r.table}/${r.id}`;
      const set = inferred.get(key) ?? new Set<string>();
      set.add(def.id);
      inferred.set(key, set);
    }
  }
  const readsInferred = [...inferred.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([row, s]) => ({ row, movesChecks: [...s].sort() }));
  return { results, readsInferred, warnings };
}

export interface Checked {
  readonly results: readonly CheckResult[];
  readonly nets: readonly Net[];
  readonly readsInferred: readonly InferredRead[];
  readonly warnings: readonly BuildWarning[];
}

/** A fresh build of the same design on other values; a check that predicts a fix rebuilds through it. */
export type Rebuild = (values: Values) => Promise<Pick<Built, "part" | "draft">>;

/**
 * Run the skeleton checks over a build, each with its own ProfileLookup so
 * the rows a check read are attributed to it (readsInferred). `rebuild`
 * gets values resolved against the chase.
 */
export async function runChecks(built: Built, artifacts: readonly ArtifactBytes[], only: readonly string[] | undefined, rebuild: Rebuild): Promise<Checked> {
  const { design } = built;
  let defs = checkDefs(design);
  if (only !== undefined && only.length > 0) {
    const ids = defs.map((d) => d.id as string);
    only.forEach((id, i) => {
      if (!ids.includes(id)) throw cmdError({ code: "E_REF", path: `/only/${i}`, got: id, didYouMean: didYouMean(id, ids), hint: "name a check the registry runs" });
    });
    defs = defs.filter((d) => only.includes(d.id));
  }
  const results: CheckResult[] = [];
  const inferred = new Map<string, Set<string>>();
  const netLookup = createProfileLookup(design.ws.tables);
  skeletonNets(built.draft, (design.chase.hookup ?? []) as readonly HookupDecl[], netLookup, design.ws.mcu);
  const netReads = new Set(netLookup.reads().map((r) => `${r.table}/${r.id}`));
  let nets: readonly Net[] = [];
  const warnings: BuildWarning[] = [];
  for (const def of defs) {
    const lookup = createProfileLookup(design.ws.tables);
    const report = await runSkeleton([def], {
      part: built.part, draft: built.draft, profile: lookup, machine: built.draft.machine,
      hookup: (design.chase.hookup ?? []) as readonly HookupDecl[], mcu: design.ws.mcu, artifacts,
      params: design.chase.params, values: built.values,
      rebuild: async (v) => {
        const again = await rebuild(resolveParams(design.chase, v as Values, undefined));
        return { part: again.part, draft: again.draft };
      },
    });
    results.push(...report.results);
    if (nets.length === 0) nets = report.nets;
    for (const w of [...report.warnings, ...lookup.warnings()]) {
      if (!warnings.some((x) => x.code === w.code && x.text === w.text)) warnings.push(w);
    }
    // runSkeleton solves the nets for every check; a row only the net solve
    // read moves a check that reads nets, and no other.
    const readsNets = def.appliesTo.level === "net" || def.needs.includes("circuit");
    if (report.ran > 0) {
      for (const r of lookup.reads()) {
        if (tierOf(design.ws.tables, r) !== "inferred") continue;
        if (!readsNets && netReads.has(`${r.table}/${r.id}`)) continue;
        const key = `${r.table}/${r.id}`;
        const set = inferred.get(key) ?? new Set<string>();
        set.add(def.id);
        inferred.set(key, set);
      }
    }
  }
  const readsInferred = [...inferred.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([row, s]) => ({ row, movesChecks: [...s].sort() }));
  return { results, nets, readsInferred, warnings };
}

// ---- the 3mf export, one filament per chase slot ----

/**
 * Slicer filament type for a profile material: the longest key of the
 * slicer material table that the id ends with, past any grade number (petg
 * PETG, cpla PLA, ctpu TPU, tpu95 TPU), read on the material family so a
 * brand row maps as its family (cpla-protopasta PLA). The profile carries
 * no slicer type.
 */
function slicerType(materials: SlicerMaterials, id: string): string {
  // A trailing grade number names the hardness, not the type (tpu95 TPU).
  const base = materialFamily(id).toUpperCase().replace(/\d+$/, "");
  const key = Object.keys(materials).filter((t) => base.endsWith(t)).sort((a, b) => b.length - a.length)[0];
  if (key === undefined) {
    throw cmdError({ code: "E_REF", path: "/materials", got: id, expected: Object.keys(materials).join(", "), hint: "use a material whose id ends with a slicer filament type" });
  }
  return key;
}

/**
 * True when the chase declares a 3mf export. A chase that declares none
 * (reference/electrical/capricate-touch: cABS has no harvested ffc5p
 * preset, and resolvePreset refuses a guessed row) gets no package from
 * parity, check.run or the determinism hashes; export.run still refuses.
 */
export const declares3mf = (design: Pick<Design, "chase">): boolean => design.chase.exports.some((e) => e.kind === "3mf");

/** The write3mf input for a build, one object named `name` at the bed centre, one filament per chase slot. */
export function threeMfInput(built: Built, name: string): ThreeMfInput {
  const { design, part } = built;
  const { ws, chase } = design;
  const machine = ws.tables.machines.find((m) => m.id === part.machine);
  const preset = machine?.presets[0];
  if (machine === undefined || preset === undefined) {
    throw cmdError({ code: "E_REF", path: "/machine", got: part.machine, didYouMean: ws.tables.machines.map((m) => m.id), hint: "name a machine the profile slice holds" });
  }
  for (const s of built.meshed.slots) {
    if (!isWatertight(s.mesh)) {
      throw meshError({ code: "E_KERNEL", path: `/slots/${s.slot}`, got: "open mesh", expected: "every slot mesh watertight", hint: `slot ${s.slot} did not close after the grid snap; widen the thinnest feature in it`, record: "mesh-kernel" });
    }
  }
  const env = machine.envelope;
  const bed: readonly [number, number] = "sheet" in env ? env.sheet : [env[0], env[1]];
  const slots = [...chase.materials].sort((a, b) => a.slot - b.slot);
  // Slot preview colour per P-20; absent, the colour the template was harvested with.
  const filaments: FilamentSlot[] = slots.map((s) => ({
    colour: s.preview ?? ws.template.keys["filament_colour"]?.[s.slot - 1] ?? "",
    type: slicerType(ws.materials, s.material),
    material: s.material,
  }));
  const label = (slot: number): string => slots.find((s) => s.slot === slot)?.label ?? `slot${slot}`;
  // A slot with one part keeps its label; a slot with several names each part by its body id too.
  const shared = (slot: number): boolean => built.meshed.slots.filter((x) => x.slot === slot).length > 1;
  const partName = (p: Meshed["slots"][number]): string => (shared(p.slot) ? `${label(p.slot)} ${p.name}` : label(p.slot));
  // Body role, and the declared width of the conductor feature that made
  // the body, for the per-object overrides and the CHK-3MF-08 record
  // (packages/3mf src/overrides.ts, M05-T20).
  const roleOf = new Map(part.bodies.map((b) => [b.id, b.role] as const));
  const widthOf = new Map(part.features.flatMap((f) => (f.kind === "conductor" ? [[f.id, Number(f.width.toFixed(6))] as const] : [])));
  // Thinnest spring beam per body, for the thin-wall row (R1-flagship-access-switch-07).
  const springOf = new Map<string, number>();
  for (const f of part.features) {
    if (f.kind !== "spring") continue;
    const body = f.body ?? part.bodies[0]?.id;
    if (body !== undefined) springOf.set(body, Math.min(springOf.get(body) ?? Infinity, f.t));
  }
  return {
    title: chase.meta.name, chase: chase.meta.id, buildHash: part.buildHash, sourceDateEpoch: built.sourceDateEpoch,
    // License carries ChaseMeta.license (LICENSING.md 1.4). Designer and Copyright stay empty until the owner rules on them.
    license: chase.meta.license,
    slicer: preset.slicer, nozzleMm: preset.nozzle, lineWidthMm: preset.lineWidth, template: ws.template, materials: ws.materials, filaments,
    objects: [{
      name,
      position: [bed[0] / 2, bed[1] / 2, 0],
      bodies: built.meshed.slots.map((s) => {
        const role = roleOf.get(s.name);
        const width = widthOf.get(s.name);
        const springT = springOf.get(s.name);
        return {
          name: partName(s), slot: s.slot, mesh: s.mesh, body: s.name, ...(role === undefined ? {} : { role }), ...(width === undefined ? {} : { widthMm: width }),
          ...(springT === undefined ? {} : { springTMm: springT }),
        };
      }),
    }],
    ...(part.bodyAdjacency === undefined ? {} : { adjacency: part.bodyAdjacency }),
  };
}

/**
 * The 3mf package for a build, its object named `name` (core passes the
 * design directory's basename). warnings are the writer's (PRESET_INFERRED
 * on a TPU slot, PROFILE.md 8.1, D-187); a caller that shows a result
 * carries them through.
 */
export async function export3mf(built: Built, name: string): Promise<{ readonly bytes: Uint8Array; readonly artifactHash: ArtifactHash; readonly name: string; readonly warnings: readonly BuildWarning[] }> {
  const out = await write3mf(threeMfInput(built, name));
  // The vendored writer brands its hash with its own symbol and types
  // warning bounds as unknown; it writes lowercase sha256 hex and sets no
  // bound (packages/checks/src/3mf/contracts.ts), so both narrow to spec.
  return { bytes: out.bytes, artifactHash: out.artifactHash as string as ArtifactHash, name: `${name}.3mf`, warnings: out.warnings as readonly BuildWarning[] };
}

/** The writer config of the same package, for the STL fallback zip and the print card (packages/3mf build). */
export function threeMfConfig(built: Built, name: string): ReturnType<typeof configOf> {
  return configOf(threeMfInput(built, name));
}

// ---- every check on one build ----

export interface AllChecked {
  readonly results: readonly CheckResult[];
  readonly readsInferred: readonly InferredRead[];
  readonly warnings: readonly BuildWarning[];
}

/** Every check id a build runs: the registered skeleton checks, the checks of the kernels the chase lists, the M00 Part IR checks and the registry checks of the build levels. */
export function allCheckIds(built: Pick<Built, "design">): string[] {
  return [...checkDefs(built.design).map((d) => d.id as string), ...M00_PART_CHECKS, ...registryDefs(built.design).map((d) => d.id as string)];
}

/**
 * The checks export.run gates the written package on: CHK-3MF-06 and -07,
 * and CHK-3MF-08 where the design resolves it (the circuit kernel, M05-T20),
 * so a package whose conductor objects carry beams never leaves the gate.
 */
export function packageCheckIds(built: Pick<Built, "design">): string[] {
  return ["CHK-3MF-06", "CHK-3MF-07", ...(allCheckIds(built).includes("CHK-3MF-08") ? ["CHK-3MF-08"] : [])];
}

/** Inferred reads merged by row, check ids unioned and sorted, rows sorted. */
function mergeInferred(reads: readonly InferredRead[]): InferredRead[] {
  const by = new Map<string, Set<string>>();
  for (const r of reads) {
    const s = by.get(r.row) ?? new Set<string>();
    for (const c of r.movesChecks) s.add(c);
    by.set(r.row, s);
  }
  return [...by.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([row, s]) => ({ row, movesChecks: [...s].sort() }));
}

/**
 * The skeleton checks, the M00 Part IR checks and the registry checks of
 * the build levels on one build; `only` narrows each. export.run and a
 * baked bench's fabrication exports gate on these results, so a registry
 * block fail (CHK-PRT-16 and kin) stops an export (D-109).
 */
export async function runAllChecks(built: Built, artifacts: readonly ArtifactBytes[], only: readonly string[] | undefined, rebuild: Rebuild): Promise<AllChecked> {
  const ids = allCheckIds(built);
  (only ?? []).forEach((id, i) => {
    if (!ids.includes(id)) throw cmdError({ code: "E_REF", path: `/only/${i}`, got: id, didYouMean: didYouMean(id, ids), hint: "name a check the registry runs" });
  });
  const m00 = new Set<string>(M00_PART_CHECKS);
  const registered = new Set<string>(registryDefs(built.design).map((d) => d.id as string));
  const skeletonOnly = only?.filter((id) => !m00.has(id) && !registered.has(id));
  const m00Only = only?.filter((id) => m00.has(id));
  const registryOnly = only?.filter((id) => registered.has(id));
  const skeleton = only === undefined || (skeletonOnly ?? []).length > 0
    ? await runChecks(built, artifacts, skeletonOnly, rebuild)
    : { results: [], readsInferred: [], warnings: [] };
  const part = only === undefined || (m00Only ?? []).length > 0
    ? runPartChecks(built.design.ws.checksSeed, {
      partId: built.part.id,
      parts: built.meshed.slots.map((s, i) => ({ name: (s as { name?: string }).name ?? `slot${s.slot}#${i}`, mesh: s.mesh })),
      solidVolumeMm3: built.part.solid.volumeMm3,
      ...(built.part.unionVolumeMm3 === undefined ? {} : { unionVolumeMm3: built.part.unionVolumeMm3 }),
    }, m00Only)
    : [];
  const registry = only === undefined || (registryOnly ?? []).length > 0
    ? await runBuildRegistry(built, [...skeleton.results, ...part], registryOnly)
    : { results: [], readsInferred: [], warnings: [] };
  const readsInferred = mergeInferred([...skeleton.readsInferred, ...registry.readsInferred]);
  const warnings = [...skeleton.warnings, ...registry.warnings.filter((w) => !skeleton.warnings.some((x) => x.code === w.code && x.text === w.text))];
  return { results: [...skeleton.results, ...part, ...registry.results], readsInferred, warnings };
}
