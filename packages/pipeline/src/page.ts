// The library build in a baked bench page (D-264). The page imports the
// design's chase and build.ts directly, runs the build function through
// the same Author core's sandbox child runs it through, and hands the
// draft to assembleBuild, so a page and `hbf part.build` give one
// buildHash and one set of 3mf bytes for one set of values. What only the
// workspace on disk knows (defHash over the source closure, the profile
// slice, the check seed, the kernel and manifold versions, the constraint
// versions, SOURCE_DATE_EPOCH) the bake computes with core and writes into
// the page as PageFacts.
//
// The draft crosses a structuredClone as it crosses core's IPC (v8
// serialize), so a build that hands back shared or class objects meets the
// same boundary in both places. The page has no sandbox: a baked bench
// carries only build.ts files the bake's author chose to inline.

import {
  commandError as cmdError, didYouMean, draftName,
  type BuildWarning, type Chase, type CheckResult, type Hash, type Metric, type Part, type SchemaLike,
  type FeatureKind, type FeatureOf, type GeneratedGeometry, type KernelCtx,
} from "@hackbuild/spec";
import { createProfileLookup, type ProfileTables } from "@hackbuild/profile";
import { loadManifold, liveCount, type RasterMask } from "@hackbuild/mesh";
import { DEFAULT_MATERIALS, DEFAULT_TEMPLATE, build as build3mf, clampEpoch, threeMfEntries, zipEntries } from "@hackbuild/3mf";
import { mcuPinRow } from "@hackbuild/catalog";
import { makeAuthor } from "./author.js";
import {
  assembleBuild, export3mf, mergeWarnings, packageCheckIds, runAllChecks, threeMfConfig,
  threeMfInput, type Built, type Design, type DraftRun, type Workspace,
} from "./build.js";
import { draftCard, draftEntries, draftResults } from "./draft-mark.js";
import { kernelKindsOf } from "./kinds.js";
import { resolveParams, type Values } from "./params.js";
import { registerSolvers } from "./solvers.js";
import { stageDesign } from "./stage.js";

// A host global in browsers and node 17 on; this tier carries no DOM or node lib.
declare function structuredClone<T>(value: T): T;

/** What the bake computes with core for one design and writes into the page. */
export interface PageFacts {
  /** The design directory's basename: the 3mf object name and the file stem (core export3mf). */
  readonly name: string;
  readonly defHash: Hash;
  /** The profile tables core's loadDesign gave the design (the seed slice with constants and fits, or the full profile). */
  readonly tables: ProfileTables;
  readonly checksSeed: unknown;
  readonly versions: Workspace["versions"];
  /** Constraint def id to version; a page passes the registry loader's (packages/registry-loader pageFacts), the baked value is its cross-check. */
  readonly constraints: Readonly<Record<string, string>>;
  /** SOURCE_DATE_EPOCH the bake ran under, s. */
  readonly epoch: number;
}

/** A design's draft feature kinds (reference/keys/flex-pair/skeleton-kinds.ts), when it carries them. */
export interface DraftKinds {
  readonly generateSkeleton: (f: FeatureOf<FeatureKind>, ctx: KernelCtx) => GeneratedGeometry;
  readonly SKELETON_KINDS: Readonly<Record<string, { readonly version: string; readonly schema: SchemaLike }>>;
}

export interface PageInput {
  readonly chase: Chase;
  /** The build.ts module namespace; chase.build.fn names the build function in it. */
  readonly module: Readonly<Record<string, unknown>>;
  readonly kinds?: DraftKinds;
  readonly facts: PageFacts;
  /** An hbf draft page (plan v9 3.1): fails show as warnings and every export carries the DRAFT marks. */
  readonly draft?: boolean;
}

/** One body mesh as the stage reads it, the build's own arrays. */
export interface PageMesh {
  readonly positions: ArrayLike<number>;
  readonly triangles: ArrayLike<number>;
}

/** One in-page build with its check run. */
export interface PageResult {
  readonly buildHash: string;
  /** BuildInputs.registryHash of this build, the one `hbf part.build` stores. */
  readonly registryHash: string;
  readonly part: Part;
  readonly meshes: Readonly<Record<string, PageMesh>>;
  readonly metrics: readonly Metric[];
  readonly results: readonly CheckResult[];
  readonly warnings: readonly BuildWarning[];
}

/** One file a page export writes. */
export interface PageFile {
  readonly name: string;
  readonly media: string;
  readonly bytes: Uint8Array | string;
  /** The package checks run on the written bytes (CHK-3MF-06, -07, -08); empty for a kind with none. */
  readonly results: readonly CheckResult[];
}

/** The export kinds a page writes from a build; the bench writes json itself. */
export const PAGE_EXPORTS = ["3mf", "stl", "card"] as const;
export type PageExportKind = (typeof PAGE_EXPORTS)[number];

export interface PageBuild {
  readonly chase: Chase;
  readonly facts: PageFacts;
  /** True on an hbf draft page; the ui names its downloads with DRAFT_ from it. */
  readonly draft: boolean;
  /** Builds and checks one set of values; the values are resolved against the chase as part.build resolves them. */
  build(values: Values): Promise<PageResult>;
  /** Writes one export from a build this page made, by its buildHash. */
  exportFile(kind: PageExportKind, buildHash: string): Promise<PageFile>;
  /** Owned wasm objects alive between builds, count; zero after every build (D-055). */
  liveCount(): number;
}

/** Builds kept for export after a newer build, count. */
const KEPT_BUILDS = 4;

const MEDIA: Readonly<Record<PageExportKind, string>> = { "3mf": "model/3mf", stl: "application/zip", card: "text/plain" };

/** The page Design: draft kinds when the design carries them, else its package kinds on the stage runner. */
export function pageDesign(chase: Chase, facts: PageFacts, kinds?: DraftKinds): Design {
  const ws: Workspace = {
    tables: facts.tables, checksSeed: facts.checksSeed, template: DEFAULT_TEMPLATE, materials: DEFAULT_MATERIALS,
    mcu: (id) => mcuPinRow(id, "/hookup/mcu"), versions: facts.versions,
  };
  if (kinds === undefined) return { ...stageDesign({ chase, defHash: facts.defHash, ws }), ws };
  const listed = kernelKindsOf(chase.meta.kernels);
  return {
    chase, generate: kinds.generateSkeleton, defHash: facts.defHash, ws, stages: false,
    kinds: Object.fromEntries(Object.entries(kinds.SKELETON_KINDS).map(([k, d]) => [k, d.version])),
    featureSchemas: Object.fromEntries(Object.entries(kinds.SKELETON_KINDS).map(([k, d]) => [k, d.schema])),
    kernelChecks: (seed) => listed.flatMap((e) => e.checks(seed)),
  };
}

/** Runs the build function in the page through an Author, as core/src/sandbox-child.ts runs it in the child. */
export async function runDraft(design: Design, module: Readonly<Record<string, unknown>>, values: Values): Promise<DraftRun> {
  const { chase } = design;
  const fn = module[chase.build.fn];
  if (typeof fn !== "function") {
    const fns = Object.keys(module).filter((k) => typeof module[k] === "function");
    throw cmdError({ code: "E_REF", path: "/build/fn", got: chase.build.fn, didYouMean: didYouMean(chase.build.fn, fns), hint: `export function ${chase.build.fn} from build.ts` });
  }
  const profile = createProfileLookup(design.ws.tables);
  const warnings: BuildWarning[] = [];
  const derived: Metric[] = [];
  const k = makeAuthor(chase, profile, warnings, derived);
  const draft: unknown = await (fn as (v: unknown, k: unknown) => unknown)(structuredClone(values), k);
  const maskFn = module["masks"];
  const masks: unknown = design.stages && typeof maskFn === "function" ? (maskFn as (v: unknown) => unknown)(structuredClone(values)) : undefined;
  return structuredClone({
    draft, warnings, derived, reads: profile.reads(), profileWarnings: profile.warnings(),
    ...(masks === undefined ? {} : { masks: masks as Readonly<Record<string, RasterMask>> }),
  });
}

/** The 3mf of a draft: the writer's entries with the draft model (draft-mark.ts), zipped as the writer zips them. */
export async function draft3mf(built: Built, name: string): Promise<{ readonly bytes: Uint8Array; readonly name: string }> {
  const input = threeMfInput(built, name);
  const entries = draftEntries(threeMfEntries(input));
  return { bytes: await zipEntries(entries, clampEpoch(input.sourceDateEpoch)), name: `${name}.3mf` };
}

/** The page build of one design. The manifold kernel loads on the first build. */
export function createPageBuild(input: PageInput): PageBuild {
  registerSolvers();
  const { chase, module, facts } = input;
  const design = pageDesign(chase, facts, input.kinds);
  const stop = (reason: string, detail: string, at = "/build"): Error => cmdError({
    code: "E_KERNEL", path: at, got: chase.build.module,
    hint: `the page build stopped build.ts (${reason}): ${detail}; nothing was written`, record: `build-sandbox/${reason}`,
  });
  const assemble = async (values: Values): Promise<Built> => {
    await loadManifold();
    const sb = await runDraft(design, module, values);
    const { built } = await assembleBuild(design, values, sb, { epoch: facts.epoch, constraints: facts.constraints, stop });
    return built;
  };
  const rebuild = (values: Values): Promise<Built> => assemble(values);
  const kept = new Map<string, Built>();
  const keep = (b: Built): void => {
    kept.delete(b.part.buildHash);
    kept.set(b.part.buildHash, b);
    while (kept.size > KEPT_BUILDS) kept.delete(kept.keys().next().value as string);
  };

  const draft = input.draft === true;
  const shown = (results: readonly CheckResult[]): readonly CheckResult[] => (draft ? draftResults(results) : results);
  const named = (n: string): string => (draft ? draftName(n) : n);

  return {
    chase, facts, draft,
    async build(state) {
      const values = resolveParams(chase, state, undefined);
      const built = await assemble(values);
      const checked = await runAllChecks(built, [], undefined, rebuild);
      keep(built);
      const meshes: Record<string, PageMesh> = {};
      for (const b of built.meshed.bodies) meshes[b.id] = { positions: b.mesh.positions, triangles: b.mesh.triangles };
      return {
        buildHash: built.part.buildHash, registryHash: built.inputs.registryHash, part: built.part, meshes, metrics: built.part.metrics ?? [],
        results: shown(checked.results), warnings: mergeWarnings(built.part.warnings, checked.warnings),
      };
    },
    async exportFile(kind, buildHash) {
      const built = kept.get(buildHash);
      if (built === undefined) throw new Error(`build ${buildHash.slice(0, 12)} is no longer held. rebuild, then export.`);
      if (kind === "3mf") {
        const pkg = draft ? await draft3mf(built, facts.name) : await export3mf(built, facts.name);
        const checked = await runAllChecks(built, [{ exporter: "3mf", name: pkg.name, bytes: pkg.bytes, part: built.part }], packageCheckIds(built), rebuild);
        return { name: named(pkg.name), media: MEDIA["3mf"], bytes: pkg.bytes, results: shown(checked.results) };
      }
      const out = build3mf(threeMfConfig(built, facts.name));
      if (!out.ok) throw new Error(`${kind} export refused: ${out.completeness.id} failed. name every object and part once, then export.`);
      if (kind === "stl") return { name: named(`${facts.name}-stl.zip`), media: MEDIA.stl, bytes: await out.stlZip(), results: [] };
      return { name: named(`${facts.name}-card.txt`), media: MEDIA.card, bytes: draft ? draftCard(out.card()) : out.card(), results: [] };
    },
    liveCount,
  };
}
