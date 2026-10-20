// part.build (M-S-T08, D-179, M00-T13): read chase.ts as data (D-178
// source reader), resolve params, run build.ts in the build sandbox
// through an Author, and hand the draft to the build and check pipeline
// (packages/pipeline assembleBuild, D-264): the draft feature kinds the
// reference registers, the packages/mesh stage runner (D-047 stages 1 to
// 8, ARCHITECTURE.md 4; feature cutters and bodies go in as stage
// inputs), the hashes, and the checks. A baked bench runs the same
// pipeline in its page. This file holds what reads the workspace on disk:
// the seeds, defHash over the source closure, SOURCE_DATE_EPOCH and the
// project graph.
//
// What stays thin here, and where it is completed: the draft kinds of the
// keys flex-pair reference load in this process from its skeleton-kinds.ts
// (DRAFT_KIND_DIRS) until the kinds move to their packages (M03, M05). MCU
// pin rows come from the catalog (M05-T02, D-076).

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type ArtifactBytes, type ArtifactHash, type BuildWarning, type CheckResult,
  type CommandError, type FeatureKind, type FeatureOf, type GeneratedGeometry, type Hash, type KernelCtx, type NextCall, type SchemaLike,
} from "@hackbuild/spec";
import { loadProfile, tablesFromSeed, type ProfileTables } from "@hackbuild/profile";
import { filamentTemplate, slicerMaterials } from "@hackbuild/3mf";
import { profileRowHash, type BuildFacts } from "@hackbuild/project";
import { mcuPinRow } from "@hackbuild/catalog";
import {
  assembleBuild, export3mf as exportPackage, graphKinds, readRow, runChecks as runPipelineChecks,
  type Built as PipelineBuilt, type Checked, type Design as PipelineDesign, type Values, type Workspace as PipelineWorkspace,
} from "@hackbuild/pipeline";
import { cmdError } from "../errors.js";
import { findingsOf } from "../result.js";
import { sha256Hex } from "@hackbuild/spec";
import { hashOf } from "../jcs.js";
import { sourceDateEpoch } from "../epoch.js";
import { constraintVersions } from "../checks.js";
import { readChaseSource } from "@hackbuild/chase";
import { fullProfile, loadStageDesign } from "../load-build.js";
import { kernelKindsOf } from "../kinds.js";
import { runSandboxed, sandboxStop, type SandboxOptions } from "../sandbox.js";

export {
  checkDefs, checkVersions, declares3mf, defaultsOf, featureSchemaProblem, graphKinds, kindsUsed, mergeWarnings, readRow, registryDefs,
  resolveParams, runBuildRegistry, sheetMachineView, type Checked, type Meshed,
} from "@hackbuild/pipeline";

type Generate = (f: FeatureOf<FeatureKind>, ctx: KernelCtx) => GeneratedGeometry;

// ---- workspace data: seeds the slice reads ----

export interface Workspace extends PipelineWorkspace {
  readonly root: string;
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

export interface Design extends PipelineDesign {
  readonly dir: string;
  /** Path the target named, relative to the workspace root. */
  readonly target: string;
  readonly ws: Workspace;
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
    throw cmdError({ code: "E_REF", path: "/chase", got: target, expected: "chase.ts in the directory", hint: "add chase.ts to the directory, or start one with chase.scaffold" });
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


// ---- one build ----

export interface Built extends PipelineBuilt<Design> {
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


export interface BuildOptions {
  /** SOURCE_DATE_EPOCH for BuildInputs, s; parity passes the goldens' value. Default: sourceDateEpoch(). */
  readonly epoch?: number;
  readonly sandbox?: SandboxOptions;
}

export async function buildPart(design: Design, values: Values, opts: BuildOptions = {}): Promise<Built> {
  const { chase, ws } = design;
  const sb = await runSandboxed({
    buildFile: design.buildFile, fn: chase.build.fn, designDir: design.dir, root: ws.root,
    values, chase, tables: ws.tables, masks: design.stages,
  }, opts.sandbox);
  const { built, reads } = await assembleBuild(design, values, sb, {
    epoch: opts.epoch ?? sourceDateEpoch(ws.root).value,
    constraints: constraintVersions(),
    stop: (reason, detail, at) => sandboxStop(ws.root, design.buildFile, reason, detail, at),
  });
  const { part, inputs, draft } = built;
  const def = defParts(design);
  const graph: BuildFacts = {
    target: posix(design.target), buildHash: part.buildHash, chaseHash: def.chase, buildScriptHash: def.buildScript, paramsHash: inputs.paramsHash,
    profile: ws.tables === fullProfile() ? "data" : "seed",
    reads: reads.map((r) => { const x = readRow(ws.tables, r); return { table: x.table, id: x.id, hash: profileRowHash(x.table, x.id, x.row) }; }),
    ...graphKinds(design, draft), meshes: Object.fromEntries(part.bodies.map((b) => [b.id, b.mesh.hash])),
  };
  return { ...built, graph };
}

// ---- checks ----

/**
 * Run the skeleton checks over a build, each with its own ProfileLookup so
 * the rows a check read are attributed to it (readsInferred). A check that
 * predicts a fix rebuilds in the sandbox.
 */
export function runChecks(built: Built, artifacts: readonly ArtifactBytes[], only?: readonly string[]): Promise<Checked> {
  return runPipelineChecks(built, artifacts, only, (v) => buildPart(built.design, v));
}

/** The rebuild a check run takes: the same design on other values, in the sandbox. */
export const rebuildOf = (design: Design) => (v: Values): Promise<Built> => buildPart(design, v);

// ---- the 3mf export, one filament per chase slot ----

/**
 * The 3mf package for a build, its object named after the design
 * directory. warnings are the writer's (PRESET_INFERRED on a TPU slot,
 * PROFILE.md 8.1, D-187); a caller that shows a result carries them through.
 */
export function export3mf(built: Built): Promise<{ readonly bytes: Uint8Array; readonly artifactHash: ArtifactHash; readonly name: string; readonly warnings: readonly BuildWarning[] }> {
  return exportPackage(built, path.basename(built.design.dir));
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
