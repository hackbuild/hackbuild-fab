// rules.audit (M04-T13, D-106; group prove). Runs every registered check
// whose target is project, source or artifact over the workspace, through
// the one registry run (packages/checks runRegistry) on the kernel set of
// the milestone that lands the registry. Sources are the files git lists
// (tracked plus untracked, not ignored), read as lint-voice reads them;
// artifacts are the 3MF packages in the store; the project is the graph of
// M04-T09, whose stale list rides along in the result. CHK-MOT-03 runs here
// once the motion kernel registers (M07) and carries simHash, firmwareHash
// and equal in its extra, the output the v3 spec gave this command; until
// then it reports skip with its reason. Exit 0 when no block fail, 1
// otherwise (EXIT_CODES).

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ArtifactBytes, CheckLevel, CheckResult, CommandInput, ProjectGraph, ReportUri, SourceFile } from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { readEntries } from "@hackbuild/3mf";
import { readChaseSource } from "@hackbuild/chase";
import { CHECK_MODULES, PAGE_MILESTONE, kernelsAt, registerChecks, runRegistry, type KernelViews, type TargetSet } from "@hackbuild/checks";
import type { StaleEntry } from "@hackbuild/project";
import { artifactRebuild, designsByChaseId } from "../artifact-rebuild.js";
import { cmdError } from "../errors.js";
import type { CoreCtx } from "../ctx.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import { loadWorkspace, workspaceRoot } from "./build.js";
import { projectGraph, viewOf } from "./project-graph.js";

/** The levels rules.audit runs (CHECKS.md section 14). */
export const AUDIT_LEVELS: readonly CheckLevel[] = ["project", "source", "artifact"];

/**
 * Paths the source checks never read (card step 1). A legacy tree is
 * evidence kept as shipped, byte for byte (M02-T02, D-142); the check
 * fixtures are the registry's own pass and fail inputs, and a fail fixture
 * fails by design. lint-voice builds its fixtures in a temp directory at
 * run time (M-1-T03), so none is tracked.
 */
export const SOURCE_SKIPS: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  { pattern: /^designs\/[^/]+\/legacy\//, reason: "legacy tree, evidence kept as shipped (M02-T02, D-142)" },
  { pattern: /^packages\/checks\/test\/fixtures\//, reason: "check fixtures: a fail fixture fails by design" },
  { pattern: /^designs\/[^/]+\/extract\/fixtures\//, reason: "extracted legacy fixtures, pinned by their SHA256SUMS (R1-fix-18)" },
];

/** The skip reason of a workspace relative path, or null when the source checks read it. */
export function sourceSkip(rel: string): string | null {
  return SOURCE_SKIPS.find((s) => s.pattern.test(rel))?.reason ?? null;
}

/** The file filter lint-voice applies; CHK-LNT-01 and -02 run its rules, so the audit reads the files it reads. */
type Scanned = (p: string) => boolean;
const scannedOf = async (root: string): Promise<Scanned> =>
  ((await import(pathToFileURL(path.join(root, "tools", "lint-voice.mjs")).href)) as { scanned: Scanned }).scanned;

const utf8 = new TextDecoder("utf-8", { fatal: true });

/** Files git lists under root, workspace relative, sorted: tracked plus untracked, not ignored, as lint-voice lists them. */
export function gitFiles(root: string): string[] {
  let out: string;
  try {
    out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
  } catch {
    throw cmdError({ code: "E_REF", path: "/workspace", got: root, hint: "rules.audit reads the files git lists; run it inside a git work tree" });
  }
  return [...new Set(out.split("\n").filter(Boolean))].sort();
}

/** Source targets: scanned UTF-8 text files outside the skips, optionally under one of `under`. */
export async function auditSources(root: string, files: readonly string[], under?: readonly string[]): Promise<SourceFile[]> {
  const scanned = await scannedOf(root);
  const out: SourceFile[] = [];
  for (const rel of files) {
    if (!scanned(rel) || sourceSkip(rel) !== null) continue;
    if (under !== undefined && !under.some((d) => rel.startsWith(`${d}/`))) continue;
    const abs = path.join(root, rel);
    if (!existsSync(abs)) continue;
    let text: string;
    try {
      text = utf8.decode(readFileSync(abs));
    } catch {
      continue;
    }
    out.push({ path: rel, text });
  }
  return out;
}

const CHASE_ENTRY = "Metadata/hackbuild_chase.json";

/** The chase id a 3MF states in its chase entry, or undefined. */
async function statedChase(bytes: Uint8Array): Promise<string | undefined> {
  try {
    const raw = (await readEntries(bytes))[CHASE_ENTRY];
    const text = raw === undefined ? undefined : typeof raw === "string" ? raw : new TextDecoder("utf-8").decode(raw);
    const chase = text === undefined ? undefined : (JSON.parse(text) as { chase?: unknown }).chase;
    return typeof chase === "string" ? chase : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Artifact targets: every 3MF package in the store, its hash recomputed on
 * read, named by its uri so a finding locates it. A PNG render is a stored
 * artifact no artifact check reads, so it is listed and not audited.
 */
export async function storedArtifacts(ctx: CoreCtx, chase?: string): Promise<{ readonly artifacts: ArtifactBytes[]; readonly notAudited: string[] }> {
  const dir = path.join(ctx.store.root, "artifacts");
  const artifacts: ArtifactBytes[] = [];
  const notAudited: string[] = [];
  for (const f of existsSync(dir) ? readdirSync(dir).sort() : []) {
    const [hash, ext, ...rest] = f.split(".");
    if (hash === undefined || ext === undefined || rest.length > 0 || ext === "tmp") continue;
    const uri = `hbf://artifact/${hash}`;
    if (ext !== "3mf") {
      notAudited.push(uri);
      continue;
    }
    const { bytes } = await ctx.store.artifact(hash, "/artifacts");
    if (chase !== undefined && await statedChase(bytes) !== chase) continue;
    artifacts.push({ exporter: "3mf", name: uri, bytes });
  }
  return { artifacts, notAudited };
}

/** The design directories a --chase value names: a directory holding chase.ts, or a chase meta.id. */
function chaseDirs(root: string, cwd: string, chase: string): { readonly dirs: string[]; readonly id: string } {
  const abs = path.resolve(cwd, chase);
  const file = path.join(abs, "chase.ts");
  if (existsSync(file)) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    let id: string;
    try {
      id = readChaseSource(readFileSync(file, "utf8"), `${rel}/chase.ts`).chase.meta.id;
    } catch {
      throw cmdError({ code: "E_SCHEMA", path: "/chase", got: `${rel}/chase.ts`, hint: "the chase source does not read; part.build names the field that fails" });
    }
    return { dirs: [rel], id };
  }
  const dirs = designsByChaseId(root, chase);
  if (dirs.length === 0) {
    throw cmdError({ code: "E_REF", path: "/chase", got: chase, hint: "name a design directory holding chase.ts, or a chase meta.id under reference/ or designs/" });
  }
  return { dirs, id: chase };
}

/** What rules.audit returns beside the findings. */
export interface AuditOut {
  /** Targets audited, each a count, and the store artifacts no artifact check reads. */
  readonly audited: { readonly sources: number; readonly artifacts: number; readonly projectItems: number; readonly notAudited: readonly string[] };
  /** Every result the audit ran or skipped, in registry order. */
  readonly results: readonly CheckResult[];
  /** The project graph's stale items with the path of links to what changed (M04-T09); information, exit 0. */
  readonly stale: readonly StaleEntry[];
  readonly report: ReportUri;
}

export async function runRulesAudit(input: CommandInput<"rules.audit">, ctx: CoreCtx): Promise<CommandOut<AuditOut>> {
  const root = workspaceRoot(ctx.workspace);
  const scope = input.chase === undefined ? undefined : chaseDirs(root, ctx.cwd, input.chase);
  const ws = await loadWorkspace(root);
  const defs = registerChecks({ seed: ws.checksSeed, filamentTemplate: ws.template }, CHECK_MODULES)
    .filter((d) => AUDIT_LEVELS.includes(d.appliesTo.level));
  const sources = await auditSources(root, gitFiles(root), scope?.dirs);
  const { artifacts, notAudited } = await storedArtifacts(ctx, scope?.id);
  const graph = await projectGraph(root, ctx.store);
  const view = viewOf(graph, {});
  const project: ProjectGraph = { items: view.items, links: view.links, stale: view.stale };
  const targets: TargetSet = { sources, artifacts, project };
  const views: KernelViews = { rebuild: artifactRebuild(root, ctx.store) };
  const report = await runRegistry(defs, {
    kernels: kernelsAt(PAGE_MILESTONE), targets, views,
    ctx: { profile: createProfileLookup(ws.tables), machine: "", whitelist: new Map() },
  });
  const results = report.results;
  const stored = ctx.store.putReport(Object.fromEntries(defs.map((d) => [d.id as string, d.version])), results);
  return {
    verdict: worst(results), stage: "done", inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [],
    result: {
      audited: { sources: sources.length, artifacts: artifacts.length, projectItems: project.items.length, notAudited },
      results, stale: view.because, report: stored,
    },
  };
}
