// check.run (M00-T13 step 8). On a build: the registered checks plus
// CHK-PRT-01, CHK-PRT-03 and CHK-3MF-04 on Part IR, with the 3MF checks on
// the package export.run would write, built in memory. With --artifact
// alone: the artifact-level checks on that file's bytes. The build may be
// hbf://build/<hash>; it is rebuilt from the stored target and params, and
// a build whose inputs moved since is E_HANDLE naming the chase.

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  type ArtifactBytes, type Assembly, type BuildInputs, type BuildWarning, type CheckResult, type Hash, type CommandInput, type CommandOutput, type InferredRead,
  type NextCall,
} from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { CHECK_MODULES, PAGE_MILESTONE, conductorPackageChecks, kernelsAt, registerChecks, runArtifactChecks, runRegistry, runSkeleton, skeletonChecks, type InterferenceDecl, type KernelViews } from "@hackbuild/checks";
import type { MeshData } from "@hackbuild/mesh";
import { sceneDef } from "@hackbuild/sim";
import { M00_PART_CHECKS, constraintVersions, registryHashOf, runPartChecks } from "../checks.js";
import { sourceDateEpoch } from "../epoch.js";
import { cmdError, didYouMean } from "../errors.js";
import { hashOf } from "../jcs.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../registry.js";
import {
  buildPart, checkDefs, checkVersions, declares3mf, export3mf, fixCalls, loadDesign, loadWorkspace, registryDefs, runBuildRegistry, runChecks, workspaceRoot, type Built, type Values,
} from "./build.js";
import { baseArgs, buildTarget } from "./part-build.js";
import { sceneDeps } from "./sim.run.js";
import { isBoardDesign } from "../board.js";
import { resolveTarget } from "../load-build.js";
import { boardArtifactKind, runBoardArtifactCheck, runBoardCheckRun } from "./board.js";

export interface AllChecked {
  readonly results: readonly CheckResult[];
  readonly readsInferred: readonly InferredRead[];
  readonly warnings: readonly BuildWarning[];
}

/** Every check id core runs: the registered skeleton checks, the checks of the kernels the chase lists, the M00 Part IR checks and the registry checks of the build levels. */
export function allCheckIds(built: Built): string[] {
  return [...checkDefs(built.design).map((d) => d.id as string), ...M00_PART_CHECKS, ...registryDefs(built.design).map((d) => d.id as string)];
}

/**
 * The checks export.run gates the written package on: CHK-3MF-06 and -07,
 * and CHK-3MF-08 where the design resolves it (the circuit kernel, M05-T20),
 * so a package whose conductor objects carry beams never leaves the gate.
 */
export function packageCheckIds(built: Built): string[] {
  return ["CHK-3MF-06", "CHK-3MF-07", ...(allCheckIds(built).includes("CHK-3MF-08") ? ["CHK-3MF-08"] : [])];
}

/** The checks a run resolved, to their versions, for reportHash (M04-T08 step 1); `only` narrows them as it narrows the run. */
export function reportChecks(built: Built, only?: readonly string[]): Record<string, string> {
  const all = checkVersions(built.design);
  return only === undefined ? all : Object.fromEntries(Object.entries(all).filter(([id]) => only.includes(id)));
}

/** The chase, target and build a stored report came from: a damaged report names the chase to rebuild, and the graph links the build (M04-T09). */
export function reportOrigin(built: Built): { chase: string; target: string; build: string } {
  return { chase: built.design.chase.meta.id, target: built.graph.target, build: built.part.buildHash };
}

/**
 * The skeleton checks, the M00 Part IR checks and the registry checks of
 * the build levels on one build; `only` narrows each. export.run gates on
 * these results, so a registry block fail (CHK-PRT-16 and kin) stops an
 * export (D-109).
 */
export async function runAllChecks(built: Built, artifacts: readonly ArtifactBytes[], only: readonly string[] | undefined): Promise<AllChecked> {
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
    ? await runChecks(built, artifacts, skeletonOnly)
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
  const readsInferred = mergeReads([...skeleton.readsInferred, ...registry.readsInferred]);
  const warnings = [...skeleton.warnings, ...registry.warnings.filter((w) => !skeleton.warnings.some((x) => x.code === w.code && x.text === w.text))];
  return { results: [...skeleton.results, ...part, ...registry.results], readsInferred, warnings };
}

/** Inferred reads merged by row, check ids unioned and sorted, rows sorted. */
function mergeReads(reads: readonly InferredRead[]): InferredRead[] {
  const by = new Map<string, Set<string>>();
  for (const r of reads) {
    const s = by.get(r.row) ?? new Set<string>();
    for (const c of r.movesChecks) s.add(c);
    by.set(r.row, s);
  }
  return [...by.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([row, s]) => ({ row, movesChecks: [...s].sort() }));
}

function readArtifact(file: string, cwd: string): ArtifactBytes {
  const abs = path.resolve(cwd, file);
  try {
    return { exporter: "3mf", name: path.basename(abs), bytes: new Uint8Array(readFileSync(abs)) };
  } catch {
    throw cmdError({ code: "E_REF", path: "/artifact", got: file, hint: "name an exported 3mf file that exists" });
  }
}

/** The artifact-level checks on one file, with no build, and the versions of the checks it resolved. */
async function artifactOnly(artifact: ArtifactBytes, ctx: CoreCtx): Promise<{ results: CheckResult[]; checks: Record<string, string> }> {
  const ws = await loadWorkspace(workspaceRoot(ctx.workspace));
  // The skeleton's artifact checks and CHK-3MF-08, which reads the package's conductor record when no build is named.
  const defs = [...skeletonChecks({ seed: ws.checksSeed, filamentTemplate: ws.template }), ...conductorPackageChecks({ seed: ws.checksSeed })]
    .filter((d) => d.appliesTo.level === "artifact");
  const results = await runArtifactChecks(defs, { artifacts: [artifact], profile: createProfileLookup(ws.tables), machine: "" });
  return { results: [...results], checks: Object.fromEntries(defs.map((d) => [d.id as string, d.version])) };
}

/** A stored build, rebuilt from its target and params; E_HANDLE when its inputs moved. */
export async function fromStore(uri: string, ctx: CoreCtx): Promise<Built> {
  const rec = ctx.store.build(uri, "/build");
  const design = await loadDesign(path.join(ctx.workspace, rec.target), ctx.workspace);
  const built = await buildPart(design, rec.values as Values);
  if (built.part.buildHash !== rec.buildHash) {
    throw cmdError({
      code: "E_HANDLE", path: "/build", got: uri, chase: rec.chase,
      hint: `the inputs of ${rec.target} moved since this build (now ${built.part.buildHash.slice(0, 6)}); rebuild chase ${rec.chase}`,
    });
  }
  return built;
}

/** What an audit scene module under packages/sim/scenes/ exports (packages/sim/scenes/ogee16-printed.ts auditScene). */
interface AuditSceneModule {
  auditScene(id: string, buildHashOf: (declHash: Hash) => Hash): Promise<{
    readonly assemblies: readonly Assembly[];
    readonly meshes: ReadonlyMap<string, MeshData>;
    readonly audit: InterferenceDecl;
  }>;
}

/**
 * check.run --scene <id> (M04-T11 step 4): the registry's assembly checks
 * on an audit scene's poses, one assembly per pose. CLI only, by the same
 * transitional rule as the M02 sim commands (M02-T11 step 2); it goes when
 * the design has a chase (M10). The build hash is sha256 over BuildInputs
 * whose defHash is the scene's declaration hash, so the poses enter it.
 */
async function runSceneAudit(id: string, input: CommandInput<"check.run">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"check.run">>> {
  if ((input as { build?: string }).build !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/scene", got: id, expected: "--build or --scene, not both", hint: "pass one of --build and --scene" });
  }
  const scene = sceneDef(id);
  if (scene.runs !== "audit") {
    throw cmdError({
      code: "E_SCHEMA", path: "/scene", got: id, expected: "an audit scene",
      hint: `${id} runs ${scene.runs}; use ${scene.runs === "trials" ? "sim.run" : "sim.sweep"} --scene ${id}`, record: "viewer-sim",
    });
  }
  const ws = await loadWorkspace(workspaceRoot(ctx.workspace));
  const all = registerChecks({ seed: ws.checksSeed, filamentTemplate: ws.template }, CHECK_MODULES).filter((d) => d.appliesTo.level === "assembly");
  const ids = all.map((d) => d.id as string);
  (input.only ?? []).forEach((c, i) => {
    if (!ids.includes(c)) throw cmdError({ code: "E_REF", path: `/only/${i}`, got: c, didYouMean: didYouMean(c, ids), hint: "name an assembly check the registry runs on a scene" });
  });
  const defs = input.only === undefined ? all : all.filter((d) => input.only!.includes(d.id));
  const checks = Object.fromEntries(defs.map((d) => [d.id as string, d.version]));
  const inputsOf = (declHash: Hash): BuildInputs => ({
    defHash: hashOf({ scene: id, declaration: declHash }),
    paramsHash: hashOf({}),
    profileHash: hashOf({}),
    registryHash: registryHashOf({ kinds: {}, constraints: constraintVersions(), checks }),
    kernelVersion: ws.versions.kernel,
    engines: { manifold: ws.versions.manifold },
    adapter: "none",
    seed: 0,
    sourceDateEpoch: sourceDateEpoch(ws.root).value,
    licences: { "manifold-3d": "Apache-2.0" },
  });
  const mod = (await sceneDeps(ctx).load(scene.file)) as AuditSceneModule;
  const built = await mod.auditScene(id, (declHash) => hashOf(inputsOf(declHash)));
  const poses = new Set(built.assemblies.map((a) => a.id));
  const views: KernelViews = {
    mesh: (ref) => built.meshes.get(ref.hash),
    interference: (assembly) => (poses.has(assembly) ? built.audit : undefined),
  };
  const report = await runRegistry(defs, {
    kernels: kernelsAt(PAGE_MILESTONE), targets: { assemblies: built.assemblies }, views,
    ctx: { profile: createProfileLookup(ws.tables), machine: "", whitelist: new Map() },
  });
  const results = report.results;
  const stored = ctx.store.putReport(checks, results);
  return {
    verdict: worst(results), stage: "done", buildHash: built.assemblies[0]!.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [],
    result: { results, report: stored },
  };
}

export async function runCheckRun(input: CommandInput<"check.run">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"check.run">>> {
  const sceneId = (input as { scene?: string }).scene;
  if (sceneId !== undefined) return runSceneAudit(sceneId, input, ctx);
  if ((input as { build?: string }).build === undefined) {
    throw cmdError({ code: "E_PARAM_MISSING", path: "/build", expected: "--build <hbf://build/...>, a design directory, --artifact or --scene <id>", hint: "name what to check" });
  }
  const artifactFile = ctx.cli.artifact;
  if (artifactFile !== undefined && input.build === artifactFile && boardArtifactKind(artifactFile) !== undefined) {
    return runBoardArtifactCheck(artifactFile, input, ctx);
  }
  if (artifactFile !== undefined && input.build === artifactFile) {
    const { results, checks } = await artifactOnly(readArtifact(artifactFile, ctx.cwd), ctx);
    const keep = (id: string): boolean => input.only === undefined || input.only.includes(id);
    const narrowed = results.filter((r) => keep(r.id));
    const report = ctx.store.putReport(Object.fromEntries(Object.entries(checks).filter(([id]) => keep(id))), narrowed);
    return {
      verdict: worst(narrowed), stage: "done", inputsHash: ctx.inputsHash,
      findings: findingsOf(narrowed), counts: countsOf(narrowed), errors: [], artifacts: [], next: [],
      result: { results: narrowed, report },
    };
  }
  if (!input.build.startsWith("hbf://")) {
    const design = await loadDesign(resolveTarget(input.build, ctx.cwd, ctx.workspace, "/build"), ctx.cwd);
    if (isBoardDesign(design)) return runBoardCheckRun(design, input, ctx);
  }
  const built = input.build.startsWith("hbf://") ? await fromStore(input.build, ctx) : await buildTarget(input.build, ctx, undefined, undefined, "/build");
  let artifacts: ArtifactBytes[];
  // A file named beside a build is checked against that build's Part IR, the rebuild of the chase it names (CHK-3MF-08).
  if (artifactFile !== undefined) artifacts = [{ ...readArtifact(artifactFile, ctx.cwd), part: built.part }];
  else if (!declares3mf(built.design)) artifacts = [];
  else {
    const pkg = await export3mf(built);
    artifacts = [{ exporter: "3mf", name: pkg.name, bytes: pkg.bytes, part: built.part }];
  }
  const checked = await runAllChecks(built, artifacts, input.only);
  const verdict = worst(checked.results);
  const report = ctx.store.putReport(reportChecks(built, input.only), checked.results, reportOrigin(built));
  // check.run takes no params, so a fix is proposed as the part.build call that applies it.
  const stored = input.build.startsWith("hbf://");
  const target = stored ? built.design.target : input.build;
  const next: NextCall[] = verdict === "fail" ? fixCalls("part.build", target, checked.results, baseArgs(stored ? built.values : undefined, undefined)) : [];
  return {
    verdict, stage: "done", buildHash: built.part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(checked.results), counts: countsOf(checked.results), errors: [], artifacts: [], next,
    result: { results: checked.results, report },
  };
}
