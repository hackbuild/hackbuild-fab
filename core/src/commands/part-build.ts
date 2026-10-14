// part.build (M00-T13 step 7): resolve the target, merge and validate the
// params, build, run every registered check on the result, store the build
// and its report, and return the parts with findings fail first.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  BodyDraft, BuildHash, BuildInputs, CheckResult, CommandInput, CommandOutput, ImportSpec, NextCall, Part, PartDraft, PartSummary, Verdict,
} from "@hackbuild/spec";
import { skeletonChecks } from "@hackbuild/checks";
import { MM_PER_UNIT, assemblePart, importGlb, importStl, stageImported, type ImportedBody } from "@hackbuild/mesh";
import { constraintVersions, m00Versions, registryHashOf, runPartChecks, seedRows, stamp, type ExportPart } from "../checks.js";
import { sourceDateEpoch } from "../epoch.js";
import { cmdError } from "../errors.js";
import { hashOf } from "../jcs.js";
import { resolveTarget, storeBuild } from "../load-build.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../registry.js";
import { buildPart, fixCalls, loadDesign, loadWorkspace, mergeWarnings, resolveParams, workspaceRoot, type Built, type Values, type Workspace } from "./build.js";
import { reportChecks, reportOrigin, runAllChecks, type AllChecked } from "./check-run.js";
import { isBoardDesign } from "../board.js";
import { runBoardPartBuild } from "./board.js";
import { isWiringDesign } from "../exporters/wiring.js";

/** Build a target with params and preset; the shared front half of every building command. */
export async function buildTarget(target: string, ctx: CoreCtx, params: Values | undefined, preset: string | undefined, at = "/chase"): Promise<Built> {
  const dir = resolveTarget(target, ctx.cwd, ctx.workspace, at);
  const design = await loadDesign(dir, ctx.cwd);
  return buildPart(design, resolveParams(design.chase, params, preset));
}

/**
 * The machine a built part names, its process, and whether its profile row
 * holds a slicer preset. Only a machine with a preset takes a 3mf; a sheet
 * machine (laser, vinyl) holds none (M06-T02).
 */
export function machineOf(built: Built): { readonly id: string; readonly process: string; readonly slices: boolean } {
  const row = built.design.ws.tables.machines.find((m) => m.id === built.part.machine);
  return { id: built.part.machine, process: row?.process ?? "unknown", slices: (row?.presets.length ?? 0) > 0 };
}

/** The params and preset a next call repeats. */
export function baseArgs(params: Values | undefined, preset: string | undefined): Values {
  return { ...(params === undefined ? {} : { params }), ...(preset === undefined ? {} : { preset }) };
}

export function summaries(built: Built): PartSummary[] {
  return [{
    id: built.part.id,
    bodies: built.part.bodies.map((b) => ({ id: b.id, role: b.role, slot: b.slot, material: b.material })),
    volumeMm3: built.part.solid.volumeMm3,
    triangles: built.part.solid.triangles,
  }];
}

/**
 * The stage a finished part.build reports: a fail stops at check, the Part
 * IR already stored (D-067, CHECKS.md section 3); any other verdict is done.
 */
export const stageOf = (verdict: Verdict): "check" | "done" => (verdict === "fail" ? "check" : "done");

export async function runPartBuild(input: CommandInput<"part.build">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"part.build">>> {
  // Exactly one of chase and import, checked before either resolves (spec/commands.ts part.build).
  if (input.import !== undefined && input.chase !== undefined) {
    throw cmdError({
      code: "E_SCHEMA", path: "/import", got: { chase: input.chase, import: input.import.map((i) => i.path) }, expected: "exactly one of chase and import",
      hint: `pass chase ${input.chase} to build the design, or import alone to audit ${input.import[0]?.path ?? "a file"}`,
    });
  }
  if (input.import !== undefined) return runImportBuild(input.import, input, ctx);
  if (input.chase === undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/chase", expected: "a design directory or chase id", hint: "name the design to build, for example hbf part.build reference/keys/flex-pair" });
  }
  const params = input.params as Values | undefined;
  const design = await loadDesign(resolveTarget(input.chase, ctx.cwd, ctx.workspace, "/chase"), ctx.cwd);
  if (isWiringDesign(design)) {
    throw cmdError({
      code: "E_SCHEMA", path: "/chase", got: input.chase, expected: "a design that builds a part",
      hint: `${input.chase} builds a wiring drawing and no part; export it with hbf export.run ${input.chase} --kind wiring`, record: "board-pcb",
    });
  }
  if (isBoardDesign(design)) return runBoardPartBuild(design, input, ctx);
  const built = await buildPart(design, resolveParams(design.chase, params, input.preset));
  const checked: AllChecked = await runAllChecks(built, [], undefined);
  const record = storeBuild(ctx.store, built);
  ctx.store.putReport(reportChecks(built), checked.results, reportOrigin(built));
  const verdict = worst(checked.results);
  const base = baseArgs(params, input.preset);
  // A passing part proposes the 3mf only where the machine slices; a sheet part has no single-part exporter before M10.
  const next: NextCall[] = verdict === "fail"
    ? fixCalls("part.build", input.chase, checked.results, base)
    : machineOf(built).slices
      ? [{ command: "export.run", args: { chase: input.chase, kind: "3mf", ...base }, why: "every check passes; a person approves the 3mf at a terminal" }]
      : [];
  return {
    verdict, stage: stageOf(verdict), buildHash: built.part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(checked.results), counts: countsOf(checked.results), errors: [], artifacts: [], next,
    result: {
      build: `hbf://build/${record.buildHash}` as CommandOutput<"part.build">["build"],
      parts: summaries(built),
      metrics: built.part.metrics,
      warnings: mergeWarnings(built.part.warnings, checked.warnings),
      readsInferred: checked.readsInferred,
      ir: input.detail === "full" ? built.part : null,
    },
  };
}

// ---- import for audit (M04-T14, D-102, D-146, D-160) ----

/** Formats the imported route reads at M04; step and wrl arrive with M14-T02. */
const READS_AT_M04: ReadonlySet<ImportSpec["format"]> = new Set(["stl", "glb", "scad"]);
/** ImportSpec.units absent: m for GLB (glTF states metres), mm for the rest (spec/commands.ts ImportSpec). */
const defaultUnit = (format: ImportSpec["format"]): keyof typeof MM_PER_UNIT => (format === "glb" ? "m" : "mm");

/** One import read, stored and welded. */
interface ReadImport {
  readonly spec: ImportSpec;
  /** hbf://source/<sha256> of the bytes as given (the .scad text for scad). */
  readonly source: string;
  /** hbf://source/<sha256> of the mesh bytes the route reads (the rendered STL for scad). */
  readonly meshUri: string;
  readonly meshFormat: "stl" | "glb";
  readonly mmPerUnit: number;
  readonly read: ImportedBody;
  /** The renderer that made the mesh, when one did: OpenSCAD's version line. */
  readonly renderer?: string;
}

/** The openscad binary's version line, or undefined when it is not on PATH. */
export function openscadVersion(bin = "openscad"): string | undefined {
  const r = spawnSync(bin, ["--version"], { encoding: "utf8" });
  if (r.error !== undefined || r.status !== 0) return undefined;
  return `${r.stdout}${r.stderr}`.trim().split("\n")[0];
}

/**
 * Render a .scad file to STL with the openscad binary in a temporary
 * folder. OpenSCAD exits 0 on an unknown module, so a stderr line holding
 * "Ignoring unknown" is E_KERNEL quoting it (D-146). No binary is E_KERNEL
 * naming it.
 */
export function renderScad(file: string, at: string, bin = "openscad"): { readonly stl: Uint8Array; readonly version: string } {
  const version = openscadVersion(bin);
  if (version === undefined) {
    throw cmdError({
      code: "E_KERNEL", path: at, got: bin, expected: "the openscad binary on PATH",
      hint: `${bin} is not on PATH, so ${file} cannot render; install OpenSCAD or export the model as stl`, record: "mesh-kernel",
    });
  }
  const dir = mkdtempSync(path.join(tmpdir(), "hbf-scad-"));
  try {
    const out = path.join(dir, "render.stl");
    const r = spawnSync(bin, ["-o", out, file], { encoding: "utf8" });
    const unknown = (r.stderr ?? "").split("\n").find((l) => l.includes("Ignoring unknown"));
    if (unknown !== undefined) {
      throw cmdError({
        code: "E_KERNEL", path: at, got: unknown.trim(), expected: "a render with no unknown module, function or variable",
        hint: `${file}: openscad printed "${unknown.trim()}" and exited ${r.status ?? "unknown"}; define or include what it names`, record: "mesh-kernel",
      });
    }
    if (r.status !== 0 || !existsSync(out)) {
      throw cmdError({
        code: "E_KERNEL", path: at, got: r.status, expected: "openscad exit 0 with an stl written",
        hint: `${file}: openscad failed: ${(r.stderr ?? "").trim().split("\n").slice(-1)[0] ?? "no message"}`, record: "mesh-kernel",
      });
    }
    return { stl: new Uint8Array(readFileSync(out)), version };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The bytes an ImportSpec names: a store source uri, or a path relative to the workspace. */
function importBytes(spec: ImportSpec, i: number, ctx: CoreCtx): { readonly bytes: Uint8Array; readonly file: string } {
  if (spec.path.startsWith("hbf://")) return { bytes: ctx.store.source(spec.path, `/import/${i}/path`), file: spec.path };
  const file = path.resolve(ctx.workspace, spec.path);
  try {
    return { bytes: new Uint8Array(readFileSync(file)), file };
  } catch {
    throw cmdError({ code: "E_REF", path: `/import/${i}/path`, got: spec.path, expected: "a file relative to the workspace or an hbf://source/<sha256> uri", hint: `no file at ${spec.path}; name it relative to ${ctx.workspace}` });
  }
}

function readImport(spec: ImportSpec, i: number, ctx: CoreCtx): ReadImport {
  const at = `/import/${i}`;
  if (spec.as !== "body") {
    throw cmdError({
      code: "E_SCHEMA", path: `${at}/as`, got: spec.as, expected: "body",
      hint: "part.build builds one Part, and Part IR holds no bought list; a bought envelope joins an assembly (Assembly.bought). import it as body to audit it",
    });
  }
  if (!READS_AT_M04.has(spec.format)) {
    throw cmdError({ code: "E_KERNEL", path: `${at}/format`, got: spec.format, expected: "stl, glb or scad", hint: `${spec.format} import arrives with M14-T02; export ${spec.path} as stl or glb`, record: "mesh-kernel" });
  }
  const { bytes, file } = importBytes(spec, i, ctx);
  const source = ctx.store.putSource(bytes);
  const unit = spec.units ?? defaultUnit(spec.format);
  const mmPerUnit = MM_PER_UNIT[unit];
  if (spec.format === "scad") {
    const r = renderScad(file, `${at}/path`);
    const meshUri = ctx.store.putSource(r.stl);
    return { spec, source, meshUri, meshFormat: "stl", mmPerUnit, read: importStl(r.stl, spec.path, mmPerUnit), renderer: r.version };
  }
  const meshFormat = spec.format === "glb" ? "glb" : "stl";
  const read = meshFormat === "glb" ? importGlb(bytes, spec.path, mmPerUnit) : importStl(bytes, spec.path, mmPerUnit);
  return { spec, source, meshUri: source, meshFormat, mmPerUnit, read };
}

/** A body id from a file name: lowercase slug, unique within the Part. */
function bodyIds(specs: readonly ImportSpec[]): string[] {
  const used = new Set<string>();
  return specs.map((s) => {
    const base = path.basename(s.path).replace(/\.[^.]*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "import";
    let id = base;
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
    used.add(id);
    return id;
  });
}

/** Profile rows an import's materials name; an unknown id is E_REF. */
function materialRows(ws: Workspace, specs: readonly ImportSpec[]): unknown[] {
  return specs.flatMap((s, i) => {
    if (s.material === undefined) return [];
    const row = ws.tables.materials.find((m) => m.id === s.material);
    if (row === undefined) throw cmdError({ code: "E_REF", path: `/import/${i}/material`, got: s.material, hint: "name a profile material id, or leave material out to import geometry for audit only" });
    return [{ table: "material", id: s.material, row }];
  });
}

/**
 * The checks an imported Part runs (M04-T14 step 5). CHK-PRT-01, CHK-PRT-03
 * and CHK-3MF-04 read meshes and run on the file's parts. Every registered
 * CheckDef at part, feature or net level reads Part.features or nets
 * extracted from them (CHK-PRT-04 pocket walls, CHK-KEY-01 contacts,
 * CHK-NET-02 and CHK-NET-29 traces), so each reports skip; artifact checks
 * have no target, since part.build exports nothing. With no union of the
 * parts, CHK-PRT-03 has nothing to compare and skips with the reason.
 */
function importChecks(ws: Workspace, part: Part, parts: readonly ExportPart[], noUnion: string | null): CheckResult[] {
  const rows = seedRows(ws.checksSeed);
  const target = { level: "part" as const, part: part.id };
  const mesh = runPartChecks(ws.checksSeed, { partId: part.id, parts, solidVolumeMm3: part.solid.volumeMm3, ...(part.unionVolumeMm3 === undefined ? {} : { unionVolumeMm3: part.unionVolumeMm3 }) }).map((r) => {
    if (r.id !== "CHK-PRT-03" || r.verdict === "skip" || noUnion === null) return r;
    const row = rows.get("CHK-PRT-03")!;
    return stamp(row, { verdict: "skip", target, measured: "no union", legal: { kind: "none" }, constraint: `no union of the imported parts to sum against: ${noUnion}` });
  });
  const skipped = skeletonChecks({ seed: ws.checksSeed, filamentTemplate: ws.template })
    .filter((d) => d.appliesTo.level !== "artifact")
    .map((d) => stamp(rows.get(d.id)!, { verdict: "skip", target, measured: "no features", legal: { kind: "none" }, constraint: "imported part has no features" }));
  return [...mesh, ...skipped];
}

/** An import built and audited: the Part, its inputs, every check result (skips included) and what the store keeps. */
export interface ImportAudit {
  readonly part: Part;
  readonly inputs: BuildInputs;
  readonly results: readonly CheckResult[];
  readonly checkVersions: Readonly<Record<string, string>>;
}

/** part.build with import: one Part, one body per file, source imported, audited (D-102, D-146, D-160). */
async function runImportBuild(specs: readonly ImportSpec[], input: CommandInput<"part.build">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"part.build">>> {
  if (input.params !== undefined || input.preset !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: input.params !== undefined ? "/params" : "/preset", got: input.params ?? input.preset, expected: "no params or preset beside import", hint: "an imported part is never parametrised; drop params and preset" });
  }
  const { part, results } = await importAudit(specs, ctx);
  return {
    verdict: worst(results), stage: stageOf(worst(results)), buildHash: part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [],
    result: {
      build: `hbf://build/${part.buildHash}` as CommandOutput<"part.build">["build"],
      parts: [{ id: part.id, bodies: part.bodies.map((b) => ({ id: b.id, role: b.role, slot: b.slot, material: b.material })), volumeMm3: part.solid.volumeMm3, triangles: part.solid.triangles }],
      metrics: part.metrics,
      warnings: part.warnings,
      readsInferred: [],
      ir: input.detail === "full" ? part : null,
    },
  };
}

/** Read, store, stage and check the imports; writes the build, its meshes and its report to the store. */
export async function importAudit(specs: readonly ImportSpec[], ctx: CoreCtx): Promise<ImportAudit> {
  if (specs.length === 0) throw cmdError({ code: "E_SCHEMA", path: "/import", got: 0, expected: "at least one file", hint: "name a file to import, for example --import part.stl" });
  const ws = await loadWorkspace(workspaceRoot(ctx.workspace));
  const reads = specs.map((s, i) => readImport(s, i, ctx));
  const ids = bodyIds(specs);
  const bodies: BodyDraft[] = reads.map((r, i) => ({
    id: ids[i]!, role: "body", slot: i + 1, material: r.spec.material ?? "",
    base: { route: "imported", uri: r.meshUri, format: r.meshFormat, tier: "inferred" },
  }));
  // An imported part is audited as the file gives it: no machine is named, process fdm is the
  // only process a mesh audit applies to, and the frame carries the file's own offset.
  const draft: PartDraft = {
    id: ids[0]!, name: path.basename(specs[0]!.path), process: "fdm", machine: "",
    frame: { originOnAxis: false, carriesOffset: true, pose: "assembly" }, bodies, features: [],
  };
  const { staged, noUnion } = await stageImported(reads.map((r, i) => ({ draft: bodies[i]!, read: r.read })));
  const defs = skeletonChecks({ seed: ws.checksSeed, filamentTemplate: ws.template });
  const checkVersions = { ...Object.fromEntries(defs.map((d) => [d.id as string, d.version])), ...m00Versions(ws.checksSeed) };
  const inputs: BuildInputs = {
    defHash: hashOf({
      import: reads.map((r) => ({
        source: r.source, mesh: r.meshUri, format: r.spec.format, mmPerUnit: r.mmPerUnit, as: r.spec.as,
        material: r.spec.material ?? null, renderer: r.renderer ?? null,
      })),
    }),
    paramsHash: hashOf({}),
    profileHash: hashOf(materialRows(ws, specs)),
    registryHash: registryHashOf({ kinds: {}, constraints: constraintVersions(), checks: checkVersions }),
    kernelVersion: ws.versions.kernel,
    engines: { manifold: ws.versions.manifold },
    adapter: "none",
    seed: 0,
    sourceDateEpoch: sourceDateEpoch(ws.root).value,
    licences: { "manifold-3d": "Apache-2.0" },
  };
  const first = reads[0]!;
  const assembled = assemblePart(draft, staged);
  const part: Part = {
    ...assembled.part,
    source: { kind: "imported", format: first.spec.format, tier: "inferred", uri: first.source },
    buildHash: hashOf(inputs) as BuildHash,
  };
  const fileParts = reads.flatMap((r, i) => r.read.parts.map((p) => ({ name: `${ids[i]!}/${p.name}`, mesh: p.mesh, body: ids[i]! })));
  const results = importChecks(ws, part, fileParts, noUnion);
  const colour = (slot: number): string => ws.template.keys["filament_colour"]?.[slot - 1] ?? ws.template.keys["filament_colour"]?.[0] ?? "";
  ctx.store.putBuild({
    format: "hbf-build-1", buildHash: part.buildHash, chase: `import:${ids[0]!}`, target: specs.map((s) => s.path).join(","),
    values: {}, inputs, part, slots: bodies.map((b) => ({ slot: b.slot, material: b.material, label: b.id, colour: colour(b.slot) })),
  }, [...staged.bodies.map((b) => b.mesh), staged.solid]);
  ctx.store.putReport(checkVersions, results, { chase: `import:${ids[0]!}`, target: specs.map((s) => s.path).join(",") });
  return { part, inputs, results, checkVersions };
}
