// part.build (M-S-T08, D-179, M00-T13): read chase.ts as data (D-178
// source reader), resolve params, run build.ts in the build sandbox
// through an Author, generate the draft feature kinds the reference
// registers, mesh every design on the packages/mesh stage runner (D-047
// stages 1 to 8, ARCHITECTURE.md 4; feature cutters and bodies go in as
// stage inputs), hash, and run the checks.
//
// What stays thin here, and where it is completed: the draft kinds of the
// keys flex-pair reference load in this process from its skeleton-kinds.ts
// (DRAFT_KIND_DIRS) until the kinds move to their packages (M03, M05). MCU
// pin rows come from the catalog (M05-T02, D-076).

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type AnyCheckDef, type ArtifactBytes, type ArtifactHash, type BodyDraft, type BuildHash, type BuildInputs, type BuildWarning, type Chase, type CheckResult,
  type CommandError, type FeatureKind, type FeatureOf,
  type GeneratedGeometry, type Hash, type HookupDecl, type InferredRead, type KernelCtx,
  type MachineView, type McuPinSpec, type MeshRef, type MeshRoute, type Net, type NextCall, type ParamField, type ParamGroup,
  type Part, type PartDraft, type ProfileRead, type SchemaLike, type Tier, type Vec3,
} from "@hackbuild/spec";
import {
  createProfileLookup, loadProfile, lossRowId, materialFamily, tablesFromSeed,
  type ProfileTables,
} from "@hackbuild/profile";
import { assemblePart, isWatertight, meshError, type MeshData, type RasterMask, type StageOutput } from "@hackbuild/mesh";
import { filamentTemplate, slicerMaterials, write3mf, type FilamentSlot, type FilamentTemplate, type SlicerMaterials } from "@hackbuild/3mf";
import { CHECK_MODULES, PAGE_MILESTONE, kernelsAt, registerChecks, runRegistry, runSkeleton, skeletonChecks, skeletonNets, type KernelViews } from "@hackbuild/checks";
import { profileRowHash, type BuildFacts } from "@hackbuild/project";
import { mcuPinRow } from "@hackbuild/catalog";
import { cmdError, didYouMean } from "../errors.js";
import { findingsOf } from "../result.js";
import { sha256Hex } from "@hackbuild/spec";
import { hashOf } from "../jcs.js";
import { sourceDateEpoch } from "../epoch.js";
import { M00_PART_CHECKS, constraintVersions, gatedSkips, m00Versions, registryHashOf } from "../checks.js";
import { readChaseSource } from "@hackbuild/chase";
import { machineView } from "../author.js";
import { adapterOf, fullProfile, loadStageDesign, stageMesh } from "../load-build.js";
import { mergeApplied } from "../applied-merge.js";
import { kernelKindsOf } from "../kinds.js";
import { draftProblem, runSandboxed, sandboxStop, type SandboxOptions } from "../sandbox.js";

type Values = Record<string, unknown>;
type Generate = (f: FeatureOf<FeatureKind>, ctx: KernelCtx) => GeneratedGeometry;

// ---- workspace data: seeds the slice reads ----

export interface Workspace {
  readonly root: string;
  readonly tables: ProfileTables;
  readonly checksSeed: unknown;
  readonly template: FilamentTemplate;
  readonly materials: SlicerMaterials;
  readonly mcu: (id: string) => McuPinSpec;
  readonly versions: { readonly kernel: string; readonly manifold: string };
}

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

/** The npm workspace root holding `from`: the nearest package.json with workspaces. */
export function workspaceRoot(from: string): string {
  let dir = path.resolve(from);
  for (;;) {
    const pj = path.join(dir, "package.json");
    if (existsSync(pj) && (readJson(pj) as { workspaces?: unknown }).workspaces !== undefined) return dir;
    const up = path.dirname(dir);
    if (up === dir) {
      throw cmdError({ code: "E_REF", path: "/chase", got: from, expected: "a path inside the hackbuild-fab workspace", hint: "run hbf from the workspace or name a design inside it" });
    }
    dir = up;
  }
}

/** The seed slice with the full profile's constant and fit tables. */
function withConstants(seed: ProfileTables, full: ProfileTables): ProfileTables {
  return {
    ...seed,
    ...(full.constants === undefined ? {} : { constants: full.constants }),
    ...(full.fits === undefined ? {} : { fits: full.fits }),
  };
}

const workspaces = new Map<string, Promise<Workspace>>();

export function loadWorkspace(root: string): Promise<Workspace> {
  let ws = workspaces.get(root);
  if (ws === undefined) {
    ws = (async (): Promise<Workspace> => {
      const at = (...p: string[]) => path.join(root, ...p);
      const manifoldPj = readJson(at("node_modules", "manifold-3d", "package.json")) as { version: string };
      // BuildInputs.kernelVersion is the @hackbuild/kernel version (ARCHITECTURE.md 8), not core's.
      const kernelPj = readJson(at("kernel", "package.json")) as { name: string; version: string };
      if (kernelPj.name !== "@hackbuild/kernel") {
        throw cmdError({ code: "E_REF", path: "/kernel", got: kernelPj.name, expected: "@hackbuild/kernel", hint: "kernel/package.json names the kernel package whose version enters BuildInputs" });
      }
      return {
        root,
        // The seed slice carries no constants or fits; the stage runner reads the stage 6 inset
        // distances (3mf.coincidenceInset, 3mf.pinchInset) from the profile's constant table,
        // and Author.fit resolves a class against the profile's fit table.
        tables: withConstants(tablesFromSeed(readJson(at("packages", "profile", "seed", "profile.seed.json"))), loadProfile()),
        checksSeed: readJson(at("packages", "checks", "seed", "checks.seed.json")),
        template: filamentTemplate(readJson(at("packages", "3mf", "data", "filament_template.json"))),
        materials: slicerMaterials(readJson(at("packages", "3mf", "seed", "materials.json"))),
        mcu: (id) => mcuPinRow(id, "/hookup/mcu"),
        versions: { kernel: kernelPj.version, manifold: manifoldPj.version },
      };
    })();
    workspaces.set(root, ws);
  }
  return ws;
}

// ---- the design: chase, build function, draft kinds ----

export interface Design {
  readonly dir: string;
  /** Path the target named, relative to the workspace root. */
  readonly target: string;
  readonly chase: Chase;
  readonly generate: Generate;
  /** Feature kind id to version, for registryHash. */
  readonly kinds: Readonly<Record<string, string>>;
  /** Kinds registered on use (core/src/kinds.ts onUse), id to version; they join registryHash when the draft declares them. */
  readonly onUseKinds?: Readonly<Record<string, string>>;
  /**
   * FeatureKindDef.schema by kind id. buildPart applies it to every draft
   * feature of that kind before kernel stage 1 (D-178); a kind with no
   * entry is refused by its generator.
   */
  readonly featureSchemas?: Readonly<Record<string, SchemaLike>>;
  /** Raster masks a generated shape names, by uri; package kinds that emit raster bodies supply them (core/src/kinds.ts). */
  readonly featureMasks?: (f: FeatureOf<FeatureKind>, ctx: KernelCtx) => ReadonlyMap<string, RasterMask>;
  /** CheckDefs of the kernels the chase lists, built from the check seed (core/src/kinds.ts). */
  readonly kernelChecks?: (seed: unknown) => readonly AnyCheckDef[];
  readonly defHash: Hash;
  readonly ws: Workspace;
  /**
   * True when the design carries no draft kinds; the sandbox then asks its
   * build module for raster masks. Every design meshes on the stage runner.
   */
  readonly stages: boolean;
  /** The module holding the build function; it runs only in the build sandbox. */
  readonly buildFile: string;
}

const fileUrl = (p: string): string => pathToFileURL(p).href;

/**
 * Directories, relative to the workspace root, whose skeleton-kinds.ts the
 * parent loads in process as trusted kernel code: the draft kinds of the
 * keys flex-pair reference (D-179). A skeleton-kinds.ts anywhere else is
 * refused, so a copied design cannot run code outside the sandbox.
 */
export const DRAFT_KIND_DIRS: readonly string[] = ["reference/keys/flex-pair"];

const posix = (p: string): string => p.split(path.sep).join("/");

function firstExisting(candidates: readonly string[]): string | undefined {
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
}

const insideDir = (dir: string, p: string): boolean => {
  const rel = path.relative(dir, p);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/**
 * The file chase.build.module names. The reader has refused "..", absolute
 * paths, anything not starting "./" and anything not ending ".ts"; this checks the realpath, so a
 * symlink inside the design directory cannot point the build outside it.
 */
function buildModuleFile(dir: string, root: string, module: string): string {
  const found = firstExisting([path.resolve(dir, module)]);
  if (found === undefined) {
    throw cmdError({ code: "E_REF", path: "/build/module", got: module, hint: "point chase.build.module at build.ts beside chase.ts" });
  }
  if (!insideDir(realpathSync(dir), realpathSync(found))) {
    throw cmdError({
      code: "E_SCHEMA", path: "/build/module", got: module, expected: "a file inside the design directory",
      hint: `${posix(path.relative(root, found))} resolves outside ${posix(path.relative(root, dir))}; keep build.ts in the design directory`,
      record: "build-sandbox/import",
    });
  }
  return found;
}

/** Relative specifiers a TypeScript source names in import and export statements, type-only ones included. */
function relativeSpecifiers(source: string): string[] {
  const out: string[] = [];
  const re = /\bfrom\s*["']([^"'\n]+)["']|\bimport\s*\(\s*["']([^"'\n]+)["']\s*\)|\bimport\s+["']([^"'\n]+)["']/g;
  for (const m of source.matchAll(re)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec !== undefined && /^\.{1,2}\//.test(spec)) out.push(spec);
  }
  return out;
}

/**
 * defHash sources (D-178): the entry files and every file reached from them
 * by relative imports, each with the sha256 of its bytes, named by its
 * forward-slash path relative to the design directory and sorted by it. A
 * static scan: an edit to any module build.ts imports moves defHash. The
 * names carry no workspace location, so moving or renaming a design keeps
 * its defHash (ARCHITECTURE.md 8, D-174).
 */
export function sourceClosure(entries: readonly string[], designDir: string): { readonly path: string; readonly sha256: string }[] {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const f = queue.shift()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const spec of relativeSpecifiers(readFileSync(f, "utf8"))) {
      const base = path.resolve(path.dirname(f), spec);
      const hit = firstExisting([base, `${base}.ts`, `${base}.js`, path.join(base, "index.ts"), path.join(base, "index.js")]);
      if (hit !== undefined && !seen.has(hit)) queue.push(hit);
    }
  }
  return [...seen].map((f) => ({ path: posix(path.relative(designDir, f)), sha256: sha256Hex(readFileSync(f)) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export async function loadDesign(target: string, cwd: string): Promise<Design> {
  const dir = path.resolve(cwd, target);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw cmdError({ code: "E_REF", path: "/chase", got: target, expected: "a design or reference directory holding chase.ts", hint: "name a directory such as reference/keys/flex-pair" });
  }
  const root = workspaceRoot(dir);
  const ws = await loadWorkspace(root);
  const rel = posix(path.relative(root, dir));
  const chaseFile = path.join(dir, "chase.ts");
  if (!existsSync(chaseFile)) {
    throw cmdError({ code: "E_REF", path: "/chase", got: target, expected: "chase.ts in the directory", hint: "add chase.ts to the directory; hbf does not scaffold one yet" });
  }
  // Read as data: nothing in chase.ts runs (D-178).
  const { chase } = readChaseSource(readFileSync(chaseFile, "utf8"), posix(path.relative(root, chaseFile)));
  const buildFile = buildModuleFile(dir, root, chase.build.module);
  const kindsFile = path.join(dir, "skeleton-kinds.ts");
  const draftKinds = existsSync(kindsFile);
  if (draftKinds && !DRAFT_KIND_DIRS.includes(rel)) {
    throw cmdError({
      code: "E_SCHEMA", path: "/chase", got: posix(path.relative(root, kindsFile)), expected: `skeleton-kinds.ts only in ${DRAFT_KIND_DIRS.join(", ")}`,
      hint: "remove skeleton-kinds.ts; feature kinds register through their packages, and a design's code runs only in the build sandbox",
      record: "build-sandbox/import",
    });
  }
  const sources = sourceClosure([buildFile, ...(draftKinds ? [kindsFile] : [])], dir);
  const defHash = hashOf({ chase, sources });
  if (!draftKinds) {
    return loadStageDesign({ dir, target: path.relative(root, dir), chase, buildFile, defHash, ws });
  }
  const kindsMod = (await import(fileUrl(kindsFile))) as { generateSkeleton: Generate; SKELETON_KINDS: Record<string, { version: string; schema: SchemaLike }> };
  const kinds = Object.fromEntries(Object.entries(kindsMod.SKELETON_KINDS).map(([k, d]) => [k, d.version]));
  const featureSchemas = Object.fromEntries(Object.entries(kindsMod.SKELETON_KINDS).map(([k, d]) => [k, d.schema]));
  // The draft kinds stand in for the package kinds, and the checks of the
  // kernels the chase lists still apply: the flex-pair lists circuit, whose
  // exported conductors carry CHK-3MF-08 (core/src/kinds.ts, M05-T20).
  const listed = kernelKindsOf(chase.meta.kernels);
  return {
    dir, target: path.relative(root, dir), chase, generate: kindsMod.generateSkeleton, kinds, featureSchemas,
    kernelChecks: (seed) => listed.flatMap((e) => e.checks(seed)),
    defHash, ws, stages: false, buildFile,
  };
}

// ---- params: defaults, preset, params, pointers ----

type NumericField = Extract<ParamField, { readonly range: readonly [number, number] }>;
const NUMERIC_TYPES: ReadonlySet<string> = new Set(["mm", "deg", "int", "ratio", "number"]);
const UNIT_OF: Readonly<Record<string, string>> = { mm: "mm", deg: "deg", int: "count", ratio: "ratio" };

const inputFields = (fields: readonly ParamField[]): ParamField[] => fields.filter((f) => f.type !== "derived");

function fieldDefault(f: ParamField): unknown {
  if (f.type === "list") {
    const item = itemDefaults(f.item);
    return Array.from({ length: f.min }, () => ({ ...item }));
  }
  return "default" in f ? f.default : undefined;
}

function itemDefaults(fields: readonly ParamField[]): Values {
  const out: Values = {};
  for (const f of inputFields(fields)) {
    const d = fieldDefault(f);
    if (d !== undefined) out[f.id] = d;
  }
  return out;
}

/** Defaults of every input field; a list takes `min` items at the item defaults. */
export function defaultsOf(chase: Chase): Values {
  return itemDefaults(chase.params.flatMap((g) => g.fields));
}

const isObject = (v: unknown): v is Values => typeof v === "object" && v !== null && !Array.isArray(v);

/** Objects merge key by key; a list or scalar replaces whole (CommandIO part.build). */
function merge(base: Values, over: Values): Values {
  const out: Values = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObject(v) && isObject(out[k]) ? merge(out[k] as Values, v) : v;
  return out;
}

function schemaError(p: string, got: unknown, expected: string, hint: string): never {
  throw cmdError({ code: "E_SCHEMA", path: p, got, expected, hint });
}

function checkValue(f: ParamField, v: unknown, p: string): unknown {
  if (NUMERIC_TYPES.has(f.type)) {
    const nf = f as NumericField;
    const unit = f.type === "number" ? (f as { unit: string }).unit : UNIT_OF[f.type] ?? "";
    if (typeof v !== "number" || !Number.isFinite(v)) schemaError(p, v, `a number in ${unit}`, `set ${f.id} to a number`);
    if (nf.range !== undefined && (v < nf.range[0] || v > nf.range[1])) {
      schemaError(p, v, `${nf.range[0]} to ${nf.range[1]} ${unit}`, `set ${f.id} inside its range`);
    }
    if (f.type === "int" && !Number.isInteger(v)) schemaError(p, v, "a whole number", `set ${f.id} to a whole number`);
    return v;
  }
  if (f.type === "enum") {
    const values = f.options.map((o) => o.value);
    if (typeof v !== "string" || !values.includes(v)) schemaError(p, v, `one of ${values.join(", ")}`, `pick a listed value for ${f.id}`);
    return v;
  }
  if (f.type === "bool") {
    if (typeof v !== "boolean") schemaError(p, v, "true or false", `set ${f.id} to true or false`);
    return v;
  }
  if (f.type === "text") {
    if (typeof v !== "string") schemaError(p, v, "a string", `set ${f.id} to text`);
    return v;
  }
  if (f.type === "list") {
    if (!Array.isArray(v) || v.length < f.min || v.length > f.max) {
      schemaError(p, Array.isArray(v) ? v.length : v, `a list of ${f.min} to ${f.max} items`, `give ${f.id} between ${f.min} and ${f.max} items`);
    }
    const defaults = itemDefaults(f.item);
    return v.map((item, i) => checkGroup(inputFields(f.item), isObject(item) ? merge(defaults, item) : item, `${p}/${i}`));
  }
  return v;
}

/**
 * Validate one level of params. `at` maps a field id to the pointer the
 * caller wrote it under, so a group-qualified value reports its own path
 * ("/rim/w" for field w of group rim).
 */
function checkGroup(fields: readonly ParamField[], v: unknown, p: string, at: ReadonlyMap<string, string> = new Map(), more: readonly string[] = []): Values {
  if (!isObject(v)) schemaError(p === "" ? "/" : p, v, "an object of param values", "pass params as a json object");
  const ids = fields.map((f) => f.id);
  const out: Values = {};
  for (const [k, val] of Object.entries(v)) {
    const f = fields.find((x) => x.id === k);
    const where = at.get(k) ?? `${p}/${k}`;
    if (f === undefined) {
      throw cmdError({ code: "E_SCHEMA", path: where, got: k, expected: `a param id: ${ids.join(", ")}`, didYouMean: didYouMean(k, [...ids, ...more]), hint: `remove ${k}; the chase declares no such param` });
    }
    out[k] = checkValue(f, val, where);
  }
  return out;
}

/**
 * Params may name a field directly ({"w": 3}) or under its group id
 * ({"rim": {"w": 3}}); field ids are unique across a chase, so both forms
 * name one field. Returns the flat values and each field's written pointer.
 */
function ungroup(groups: readonly ParamGroup[], plain: Values): { readonly flat: Values; readonly at: Map<string, string> } {
  const fieldIds = new Set(groups.flatMap((g) => g.fields.map((f) => f.id)));
  const flat: Values = {};
  const at = new Map<string, string>();
  for (const [k, v] of Object.entries(plain)) {
    const group = fieldIds.has(k) ? undefined : groups.find((g) => g.id === k);
    if (group !== undefined && isObject(v)) {
      for (const [fk, fv] of Object.entries(v)) {
        flat[fk] = fv;
        at.set(fk, `/${k}/${fk}`);
      }
    } else {
      flat[k] = v;
      at.set(k, `/${k}`);
    }
  }
  return { flat, at };
}

/** A pointer whose first segment is a group id names the field below it. */
function fieldPointer(groups: readonly ParamGroup[], pointer: string): string {
  const [, head, ...rest] = pointer.split("/");
  const fieldIds = new Set(groups.flatMap((g) => g.fields.map((f) => f.id)));
  if (head === undefined || fieldIds.has(head) || rest.length === 0) return pointer;
  return groups.some((g) => g.id === head) ? `/${rest.join("/")}` : pointer;
}

/** Every pointer a param edit may name: /<field> and /<list>/<i>/<item field>. */
function pointersOf(groups: readonly ParamGroup[], values: Values): string[] {
  const out: string[] = [];
  for (const f of inputFields(groups.flatMap((g) => g.fields))) {
    if (f.type === "list") {
      const n = Array.isArray(values[f.id]) ? (values[f.id] as unknown[]).length : 0;
      for (let i = 0; i < n; i += 1) for (const it of inputFields(f.item)) out.push(`/${f.id}/${i}/${it.id}`);
    } else out.push(`/${f.id}`);
  }
  return out;
}

function setPointer(values: Values, pointer: string, v: unknown, known: readonly string[]): Values {
  if (!known.includes(pointer)) {
    throw cmdError({ code: "E_REF", path: pointer, got: pointer, didYouMean: didYouMean(pointer, known), hint: "name a param pointer the chase declares" });
  }
  const out = JSON.parse(JSON.stringify(values)) as Values;
  const segs = pointer.split("/").slice(1);
  let at: Values | unknown[] = out;
  for (const s of segs.slice(0, -1)) at = (at as Values)[s] as Values;
  (at as Values)[segs[segs.length - 1]!] = v;
  return out;
}

/**
 * Keys a params object may not carry at any level. JSON.parse makes
 * "__proto__" an own key, and assigning it while merging would set a
 * prototype instead of a param, so the unknown-key check would never see it.
 */
const FORBIDDEN_PARAM_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

function refuseForbiddenKeys(v: unknown, at: string): void {
  if (Array.isArray(v)) {
    v.forEach((x, i) => refuseForbiddenKeys(x, `${at}/${i}`));
    return;
  }
  if (typeof v !== "object" || v === null) return;
  for (const k of Object.keys(v)) {
    const p = `${at}/${k.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    if (FORBIDDEN_PARAM_KEYS.has(k)) {
      throw cmdError({ code: "E_SCHEMA", path: p, got: k, expected: "a param id", hint: `remove ${k}; it names no param` });
    }
    refuseForbiddenKeys((v as Values)[k], p);
  }
}

/** Merged, validated params: defaults, then the preset, then params, then pointer keys. */
export function resolveParams(chase: Chase, params: Values | undefined, preset: string | undefined): Values {
  refuseForbiddenKeys(params ?? {}, "");
  let values = defaultsOf(chase);
  if (preset !== undefined) {
    const row = (chase.presets ?? []).find((p) => p.id === preset);
    if (row === undefined) {
      const ids = (chase.presets ?? []).map((p) => p.id);
      throw cmdError({ code: "E_REF", path: "/preset", got: preset, didYouMean: didYouMean(preset, ids), hint: "name a preset the chase declares" });
    }
    values = merge(values, row.params as Values);
  }
  const plain = Object.fromEntries(Object.entries(params ?? {}).filter(([k]) => !k.startsWith("/")));
  const fields = inputFields(chase.params.flatMap((g) => g.fields));
  const { flat, at } = ungroup(chase.params, plain);
  values = checkGroup(fields, merge(values, flat), "", at, chase.params.map((g) => g.id));
  for (const [k, v] of Object.entries(params ?? {}).filter(([key]) => key.startsWith("/"))) {
    const known = pointersOf(chase.params, values);
    const field = fieldPointer(chase.params, k);
    if (!known.includes(field)) setPointer(values, k, v, known);
    values = setPointer(values, field, v, known);
  }
  return checkGroup(fields, values, "");
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

export interface Built {
  readonly design: Design;
  readonly values: Values;
  readonly draft: PartDraft;
  readonly part: Part;
  readonly meshed: Meshed;
  readonly inputs: BuildInputs;
  readonly sourceDateEpoch: number;
  /** What the build read, by hash, for the project graph links it writes when stored (M04-T09 step 2). */
  readonly graph: BuildFacts;
}

/**
 * The two parts of defHash (D-178): the chase object and the source
 * closure of build.ts (with skeleton-kinds.ts where DRAFT_KIND_DIRS loads
 * one). hashOf({chase, sources}) is defHash; the project graph links each
 * part as its own item.
 */
export function defParts(design: Pick<Design, "chase" | "dir" | "buildFile" | "ws">): { readonly chase: Hash; readonly buildScript: Hash; readonly sources: ReturnType<typeof sourceClosure> } {
  const kindsFile = path.join(design.dir, "skeleton-kinds.ts");
  const draftKinds = existsSync(kindsFile) && DRAFT_KIND_DIRS.includes(posix(path.relative(design.ws.root, design.dir)));
  const sources = sourceClosure([design.buildFile, ...(draftKinds ? [kindsFile] : [])], design.dir);
  return { chase: hashOf(design.chase), buildScript: hashOf(sources), sources };
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

export interface BuildOptions {
  /** SOURCE_DATE_EPOCH for BuildInputs, s; parity passes the goldens' value. Default: sourceDateEpoch(). */
  readonly epoch?: number;
  readonly sandbox?: SandboxOptions;
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

export async function buildPart(design: Design, values: Values, opts: BuildOptions = {}): Promise<Built> {
  const { chase, ws } = design;
  const profile = createProfileLookup(ws.tables);
  const sb = await runSandboxed({
    buildFile: design.buildFile, fn: chase.build.fn, designDir: design.dir, root: ws.root,
    values, chase, tables: ws.tables, masks: design.stages,
  }, opts.sandbox);
  const result = sb.draft;
  if (!isObject(result) || !Array.isArray(result["bodies"])) {
    throw cmdError({ code: "E_KERNEL", path: "/build", got: isObject(result) && "parts" in result ? "assembly" : typeof result, expected: "one PartDraft", hint: "part.build builds one PartDraft; assemblies are not built yet", record: "agent-capability" });
  }
  const problem = draftProblem(result);
  if (problem !== undefined) throw sandboxStop(ws.root, design.buildFile, "result-schema", `${problem.got} where the draft needs ${problem.expected}`, problem.path);
  const featureProblem = await featureSchemaProblem(design.featureSchemas ?? {}, result["features"] as readonly Record<string, unknown>[]);
  if (featureProblem !== undefined) throw sandboxStop(ws.root, design.buildFile, "result-schema", featureProblem.detail, featureProblem.path);
  // Author.derive values join the draft's metrics, sorted by id after them,
  // so they hash with the part and reach the HUD (spec/build.ts Author.derive).
  // The applied merge runs on the draft as build.ts returned it, before
  // stage 1 (spec/build.ts APPLIED_MERGE); chase.applied is in defHash.
  const drafted = mergeApplied(result as unknown as PartDraft, chase.applied ?? [], { profile, materials: chase.materials });
  const derivedIds = new Set(sb.derived.map((m) => m.id));
  const clash = (drafted.metrics ?? []).findIndex((m) => derivedIds.has(m.id));
  if (clash >= 0) throw sandboxStop(ws.root, design.buildFile, "result-schema", `metric ${drafted.metrics?.[clash]?.id} repeats a k.derive id`, `/metrics/${clash}`);
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
  const epoch = opts.epoch ?? sourceDateEpoch(ws.root).value;
  const inputs: BuildInputs = {
    defHash: design.defHash,
    paramsHash: hashOf(values),
    profileHash: hashOf(profileRows(ws.tables, reads)),
    registryHash: registryHashOf({ kinds: kindsUsed(design, raw), constraints: constraintVersions(), checks: checkVersions(design), exporters: { "3mf": hashOf(ws.template) } }),
    kernelVersion: ws.versions.kernel,
    engines: { manifold: ws.versions.manifold },
    adapter: sheet ? "none" : adapterOf(profile.preset(raw.machine).slicer.app),
    seed: 0,
    sourceDateEpoch: epoch,
    licences: { [chase.meta.id]: chase.meta.license, "manifold-3d": "Apache-2.0", jszip: "MIT" },
  };
  // Part IR comes from mesh assemblePart (D-048, D-049): the draft's warnings
  // first, then the route warnings merged with the profile's, so part.warnings
  // equals draft.warnings. Only core holds BuildInputs, so only core assigns
  // buildHash, sha256 over their RFC 8785 canonical form (D-051).
  const assembled = assemblePart(
    { ...raw, warnings: [...(raw.warnings ?? []), ...sb.warnings], assertions: [...(chase.assertions ?? []), ...(raw.assertions ?? [])] },
    { ...meshed.staged, warnings: mergeWarnings(sb.profileWarnings, profile.warnings(), meshed.warnings) },
  );
  const part: Part = { ...assembled.part, buildHash: hashOf(inputs) as BuildHash };
  const def = defParts(design);
  const graph: BuildFacts = {
    target: posix(design.target), buildHash: part.buildHash, chaseHash: def.chase, buildScriptHash: def.buildScript, paramsHash: inputs.paramsHash,
    profile: ws.tables === fullProfile() ? "data" : "seed",
    reads: reads.map((r) => { const x = readRow(ws.tables, r); return { table: x.table, id: x.id, hash: profileRowHash(x.table, x.id, x.row) }; }),
    ...graphKinds(design, raw), meshes: Object.fromEntries(part.bodies.map((b) => [b.id, b.mesh.hash])),
  };
  return { design, values, draft, part, meshed, inputs, sourceDateEpoch: epoch, graph };
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
 */
export function registryDefs(design: Design): readonly AnyCheckDef[] {
  const taken = new Set<string>([...checkDefs(design).map((d) => d.id as string), ...M00_PART_CHECKS]);
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

/**
 * Run the skeleton checks over a build, each with its own ProfileLookup so
 * the rows a check read are attributed to it (readsInferred).
 */
export async function runChecks(built: Built, artifacts: readonly ArtifactBytes[], only?: readonly string[]): Promise<Checked> {
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
        const again = await buildPart(design, resolveParams(design.chase, v as Values, undefined));
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

/**
 * The 3mf package for a build. warnings are the writer's (PRESET_INFERRED
 * on a TPU slot, PROFILE.md 8.1, D-187); a caller that shows a result
 * carries them through.
 */
export async function export3mf(built: Built): Promise<{ readonly bytes: Uint8Array; readonly artifactHash: ArtifactHash; readonly name: string; readonly warnings: readonly BuildWarning[] }> {
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
  const out = await write3mf({
    title: chase.meta.name, chase: chase.meta.id, buildHash: part.buildHash, sourceDateEpoch: built.sourceDateEpoch,
    // License carries ChaseMeta.license (LICENSING.md 1.4). Designer and Copyright stay empty until the owner rules on them.
    license: chase.meta.license,
    slicer: preset.slicer, nozzleMm: preset.nozzle, template: ws.template, materials: ws.materials, filaments,
    objects: [{
      name: path.basename(design.dir),
      position: [bed[0] / 2, bed[1] / 2, 0],
      bodies: built.meshed.slots.map((s) => {
        const role = roleOf.get(s.name);
        const width = widthOf.get(s.name);
        return { name: partName(s), slot: s.slot, mesh: s.mesh, body: s.name, ...(role === undefined ? {} : { role }), ...(width === undefined ? {} : { widthMm: width }) };
      }),
    }],
    ...(part.bodyAdjacency === undefined ? {} : { adjacency: part.bodyAdjacency }),
  });
  return { bytes: out.bytes, artifactHash: out.artifactHash, name: `${path.basename(design.dir)}.3mf`, warnings: out.warnings };
}

// ---- results ----

/** One next call per fix: rebuild with the fixed value. */
export function fixCalls(command: "part.build" | "check.run" | "export.run", target: string, results: readonly CheckResult[], base: Values): NextCall[] {
  return findingsOf(results).filter((r) => r.fix !== undefined).map((r) => ({
    command,
    args: { ...base, params: { ...((base["params"] as Values | undefined) ?? {}), [r.fix!.param]: r.fix!.set }, [command === "check.run" ? "build" : "chase"]: target },
    why: `${r.id} ${r.verdict}s; ${r.fix!.param} = ${String(r.fix!.set)} predicts ${String(r.fix!.predicts.measured)}, ${r.fix!.predicts.verdict}`,
  }));
}

export type { CommandError, Values };
