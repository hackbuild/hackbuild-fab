// Board builds (M08-T06 step 6, D-089). A chase of kind board names its
// backend in build.ts (packages/board BoardDraft); for the direct route core
// runs the reference's gated Python generator through uv into a folder
// of its own, publishes a copy at .hbf/out/<design>, stamps and validates
// the BoardRecord it wrote, and assembles a body-less board Part: Part.board holds the record and
// metrics.board the counts and the DRC's tightest clearance. The fab zip
// goes to the store as an artifact. A generator that exits non-zero wrote
// nothing; part.build returns its gate lines as an E_KERNEL error and
// stores nothing.
//
// defHash covers the chase and build.ts (D-178) plus every file the
// generator reads: the design directory's .py files and board.json, the
// direct library with its fonts, and the tools/py pins the route runs on,
// so an edit to gen.py, board.json or a library line moves the buildHash.
//
// gen.py is design code, run as the user like build.ts (D-201: a person
// reviews a design they did not write before it runs). On darwin it runs
// under sandbox-exec: no network, writes only inside the fresh folder of its
// run, and no program started but the tools/py interpreter. uv resolves that
// interpreter first, outside the confinement, since a first run syncs the
// venv over the network. A denial stops the build with E_KERNEL record
// build-sandbox/generator. Elsewhere the generator runs unconfined.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import {
  sha256Hex,
  type ArtifactBytes, type Assembly, type BoardRecord, type BuildSandboxReason, type Net, type BuildHash, type BuildInputs, type CheckResult, type Hash, type MeshUri, type MeshHash, type Part,
} from "@hackbuild/spec";
import {
  DIRECT_GATES, DIRECT_RECORD, boardAdapter, boardMetrics, directFailure, directSuccess, padFeatureId, writeBom, writeCpl, writeNetlist,
  type BoardDraft, type CplDialect, type DirectFile, type DirectGates,
} from "@hackbuild/board";
import { workspaceCatalog } from "./catalog-files.js";
import { createProfileLookup } from "@hackbuild/profile";
import { CHECK_MODULES, PAGE_MILESTONE, kernelsAt, registerChecks, runRegistry, type KernelViews, type RegisteredCheck } from "@hackbuild/checks";
import { constraintVersions, registryHashOf } from "./checks.js";
import { sourceDateEpoch } from "./epoch.js";
import { cmdError } from "./errors.js";
import { hashOf } from "./jcs.js";
import { runSandboxed, type SandboxOptions } from "./sandbox.js";
import type { Design, Values } from "./commands/build.js";

const GENERATOR_REASON: BuildSandboxReason = "generator";

/** A direct-route board built: the record, the fab files and the Part that carries them. */
export interface BoardBuilt {
  readonly design: Design;
  readonly values: Values;
  readonly part: Part;
  readonly record: BoardRecord;
  readonly gates: DirectGates;
  readonly files: readonly DirectFile[];
  /** .hbf/out/<design>, absolute: the published copy of the run, and where board exports and renders go. */
  readonly outDir: string;
  /**
   * The folder this run's generator wrote, absolute, which no other build
   * writes: the reparse reads gates.json and source/ beside the zip from
   * here, since a concurrent build of the same design rewrites outDir.
   * Removed when the process exits.
   */
  readonly runDir: string;
  readonly inputs: BuildInputs;
  readonly sourceDateEpoch: number;
}

/** A generator that refused to write: its exit and gate lines. */
export interface BoardRefused {
  readonly refused: true;
  readonly design: Design;
  readonly exit: number;
  readonly lines: readonly string[];
}

export const isBoardDesign = (design: Pick<Design, "chase">): boolean => design.chase.meta.kind === "board";

const posix = (p: string): string => p.split(path.sep).join("/");

/** .hbf/out/<design directory name> under the workspace root; the M08 acceptance lines name it. */
export function boardOutDir(design: Pick<Design, "dir" | "ws">): string {
  return path.join(design.ws.root, ".hbf", "out", path.basename(design.dir));
}

const runDirs = new Set<string>();
let sweepOnExit = false;

/**
 * A fresh folder for one generator run, beside outDir under .runs/, and the
 * run folder inside it the generator writes. Two builds of one design in
 * parallel (test workers, a bench and the CLI) each write their own, so
 * neither reads a zip the other is half way through. The generator may
 * write only inside the fresh folder, which also holds its staging folder.
 */
function newRunDir(outDir: string): { readonly box: string; readonly runDir: string } {
  const runs = path.join(path.dirname(outDir), ".runs");
  mkdirSync(runs, { recursive: true });
  sweepDeadRuns(runs);
  const box = mkdtempSync(path.join(runs, `${path.basename(outDir)}-${process.pid}-`));
  runDirs.add(box);
  if (!sweepOnExit) {
    sweepOnExit = true;
    process.once("exit", () => { for (const d of runDirs) rmSync(d, { recursive: true, force: true }); });
  }
  return { box, runDir: path.join(box, "run") };
}

/** Remove the run folders of processes that ended without their exit hook (a test worker killed by its pool). */
function sweepDeadRuns(runs: string): void {
  for (const name of readdirSync(runs)) {
    const pid = Number(/-(\d+)-[^-]+$/.exec(name)?.[1]);
    if (!Number.isInteger(pid) || pid === process.pid) continue;
    let alive = true;
    try { process.kill(pid, 0); } catch (e) { alive = (e as NodeJS.ErrnoException).code === "EPERM"; }
    if (!alive) rmSync(path.join(runs, name), { recursive: true, force: true });
  }
}

/**
 * Copy a finished run to outDir by swapping whole folders, so a reader of
 * outDir sees one run's files. When another build published between the
 * two renames, its folder stays and this copy is dropped.
 */
function publishRun(runDir: string, outDir: string): void {
  const next = mkdtempSync(`${outDir}.next-`);
  cpSync(runDir, next, { recursive: true });
  const old = `${next}.old`;
  try { renameSync(outDir, old); } catch { /* no earlier copy, or another build moved it first */ }
  try { renameSync(next, outDir); } catch { rmSync(next, { recursive: true, force: true }); }
  rmSync(old, { recursive: true, force: true });
}

/** The fab zip a direct generator writes: the one .zip in its folder. */
export function fabZip(files: readonly DirectFile[]): DirectFile | undefined {
  return files.find((f) => f.name.endsWith(".zip"));
}

/** Run build.ts in the sandbox and read the BoardDraft it returns; E_SCHEMA names a bad field. */
async function boardDraft(design: Design, values: Values, sandbox?: SandboxOptions): Promise<BoardDraft> {
  const { chase, ws } = design;
  const sb = await runSandboxed({
    buildFile: design.buildFile, fn: chase.build.fn, designDir: design.dir, root: ws.root, values, chase, tables: ws.tables, masks: false,
  }, sandbox);
  const d = sb.draft as Partial<BoardDraft> | null;
  if (d === null || typeof d !== "object" || d.backend !== "direct") {
    throw cmdError({
      code: "E_SCHEMA", path: "/build/backend", got: d === null || typeof d !== "object" ? typeof d : String(d.backend), expected: "direct",
      hint: "a board build.ts returns { backend: \"direct\", generator: \"./gen.py\" }; the tscircuit backend lands at M08-T10", record: "board-pcb",
    });
  }
  const g = d.generator;
  if (typeof g !== "string" || !g.startsWith("./") || !g.endsWith(".py") || g.includes("..")) {
    throw cmdError({ code: "E_SCHEMA", path: "/build/generator", got: String(g), expected: "\"./<name>.py\" inside the design directory", hint: "name the generator beside chase.ts, for example ./gen.py", record: "board-pcb" });
  }
  if (!existsSync(path.join(design.dir, g))) {
    throw cmdError({ code: "E_REF", path: "/build/generator", got: g, hint: `no ${g} in ${posix(design.target)}; add the generator beside chase.ts`, record: "board-pcb" });
  }
  return { backend: "direct", generator: g };
}

/** Files under dir whose extension is in exts, recursively, sorted by forward-slash path. */
function filesUnder(dir: string, exts: readonly string[], skip: readonly string[] = []): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const n of readdirSync(d).sort()) {
      const p = path.join(d, n);
      if (statSync(p).isDirectory()) {
        if (!skip.includes(n) && n !== "__pycache__") walk(p);
      } else if (exts.some((e) => n.endsWith(e))) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/** The generator's inputs beyond build.ts: design files, the direct library, its fonts and the Python pins. */
export function generatorInputs(design: Pick<Design, "dir" | "ws">): { readonly files: readonly { readonly path: string; readonly sha256: string }[]; readonly pins: readonly string[] } {
  const lib = path.join(design.ws.root, "tools", "py", "board");
  const files = [
    // The generators read only themselves and board.json; other files beside them (expected/, a parts audit) never enter.
    ...filesUnder(design.dir, [".py"], ["expected", "test", "out"]),
    ...(existsSync(path.join(design.dir, "board.json")) ? [path.join(design.dir, "board.json")] : []),
    ...filesUnder(path.join(lib, "direct"), [".py"]),
    ...filesUnder(path.join(lib, "fonts"), [".woff2"]),
  ].map((f) => ({ path: posix(path.relative(design.ws.root, f)), sha256: sha256Hex(readFileSync(f)) }));
  const pyproject = readFileSync(path.join(design.ws.root, "tools", "py", "pyproject.toml"), "utf8");
  const pins = [...pyproject.matchAll(/^\s*"((?:shapely|fonttools|brotli)==[^";\s]+)/gm)].map((m) => m[1] ?? "").sort();
  return { files, pins };
}

/** CheckDefs that need the board kernel, from the seed and the check modules. */
export function boardCheckDefs(ws: Pick<Design["ws"], "checksSeed" | "template">): readonly RegisteredCheck[] {
  return registerChecks({ seed: ws.checksSeed, filamentTemplate: ws.template }, CHECK_MODULES).filter((d) => d.needs.includes("board"));
}

/** Board check id to version, for registryHash and reportHash. */
export function boardCheckVersions(ws: Pick<Design["ws"], "checksSeed" | "template">): Record<string, string> {
  return Object.fromEntries(boardCheckDefs(ws).map((d) => [d.id as string, d.version]));
}

/** A body-less part's solid: no triangles, the board's box as bounds, mm. */
function boardSolid(record: BoardRecord): Part["solid"] {
  const xs = record.board.outline.map((p) => p[0]);
  const ys = record.board.outline.map((p) => p[1]);
  const hash = sha256Hex(new Uint8Array(0)) as MeshHash;
  return {
    uri: `hbf://mesh/${hash}` as MeshUri, hash, triangles: 0, volumeMm3: 0, watertight: false,
    bbox: [[Math.min(...xs), Math.min(...ys), 0], [Math.max(...xs), Math.max(...ys), record.board.thickness]],
  };
}

/**
 * One pad feature per drilled record pad, id "pad.<ref>.<pin>": the target
 * CHK-BRD-02 reads (seeded at level feature, kind pad).
 */
export function boardPadFeatures(record: BoardRecord): Part["features"] {
  return record.pads.filter((p) => p.drill !== undefined).map((p) => ({
    kind: "pad" as const, id: padFeatureId(p), net: p.net, size: [p.w, p.h] as const, for: "solder" as const,
  }));
}

/** A body-less board Part around a record: Part.board the record, metrics.board its counts. */
export function boardPart(record: BoardRecord, o: {
  readonly id: string; readonly name: string; readonly machine: string; readonly buildHash: BuildHash;
  readonly tightest?: { readonly mm: number; readonly rule: number } | undefined; readonly assertions?: Part["assertions"];
}): Part {
  return {
    id: o.id, name: o.name, process: "pcb", machine: o.machine,
    solid: boardSolid(record), bodies: [], features: boardPadFeatures(record),
    frame: { originOnAxis: false, carriesOffset: false, pose: "assembly" },
    source: { kind: "kernel", routes: [] },
    board: record,
    metrics: boardMetrics(record, o.tightest),
    warnings: [],
    assertions: [...(o.assertions ?? [])],
    buildHash: o.buildHash,
  };
}

/** The tools/py interpreter and the realpath of its base prefix, per workspace root. */
const pythons = new Map<string, { readonly exe: string; readonly base: string }>();

/**
 * Resolve the tools/py interpreter through uv, which syncs the venv first
 * when it must. It runs outside the generator confinement and runs no
 * design code.
 */
function toolsPython(root: string, uv: string): { readonly exe: string; readonly base: string } {
  const key = `${root}\0${uv}`;
  const hit = pythons.get(key);
  if (hit !== undefined) return hit;
  const r = spawnSync(uv, ["run", "--project", path.join(root, "tools", "py"), "python", "-c", "import os, sys; print(sys.executable); print(os.path.realpath(sys.base_prefix))"],
    { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (r.error !== undefined) {
    throw cmdError({ code: "E_KERNEL", path: "/build/generator", got: uv, expected: "the uv binary on PATH", hint: `${uv} did not start (${r.error.message}); install uv, the Python runner of tools/py (D-140)`, record: "board-pcb" });
  }
  const [exe, base] = (r.stdout ?? "").split("\n").map((l) => l.trim());
  if (r.status !== 0 || exe === undefined || exe === "" || base === undefined || base === "") {
    throw cmdError({ code: "E_KERNEL", path: "/build/generator", got: (r.stderr ?? "").trim().split("\n").slice(-3), expected: "the tools/py interpreter", hint: `uv run --project tools/py exited ${r.status ?? "on a signal"} before the generator ran; run uv sync --project tools/py`, record: "board-pcb" });
  }
  const found = { exe, base };
  pythons.set(key, found);
  return found;
}

const sbString = (s: string): string => `"${s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;

/**
 * The sandbox-exec profile of a generator run: everything the interpreter
 * reads is allowed; network is denied, writes go only under `writable` and
 * /dev/null, and the only programs it may start are the interpreter and
 * its base prefix (a framework build re-executes itself from there).
 */
export function generatorProfile(writable: string, exe: string, base: string): string {
  const exes = [...new Set([exe, realpathSync(exe)])].map((e) => `(literal ${sbString(e)})`).join(" ");
  return [
    "(version 1)",
    "(allow default)",
    "(deny network*)",
    "(deny file-write*)",
    `(allow file-write* (subpath ${sbString(realpathSync(writable))}) (literal "/dev/null") (literal "/dev/dtracehelper"))`,
    "(deny process-exec)",
    `(allow process-exec ${exes} (subpath ${sbString(base)}))`,
  ].join("\n");
}

/** A denial the confinement raised, as Python reports it: errno 1, EPERM. */
const DENIED = /\[Errno 1\] Operation not permitted/;

/**
 * Run a direct generator on the tools/py interpreter; the folder it wrote is
 * read back on exit 0. It may write only under `writable` (darwin), which
 * defaults to the parent of outDir: buildBoard makes that folder fresh for
 * each run.
 */
export function runGenerator(root: string, generator: string, outDir: string, epoch: number, uv = "uv", writable = path.dirname(outDir)): ReturnType<typeof directSuccess> {
  const py = toolsPython(root, uv);
  const tail = [generator, "--out", outDir, "--epoch", String(epoch)];
  const confined = process.platform === "darwin";
  const [cmd, ...argv] = confined ? ["/usr/bin/sandbox-exec", "-p", generatorProfile(writable, py.exe, py.base), py.exe, ...tail] : [py.exe, ...tail];
  // env carries no secrets of the caller; the generator reads its arguments and the workspace
  const env = { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: process.env["HOME"] ?? root, PYTHONDONTWRITEBYTECODE: "1" };
  const r = spawnSync(cmd!, argv, { cwd: root, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error !== undefined) {
    throw cmdError({ code: "E_KERNEL", path: "/build/generator", got: cmd!, expected: "the tools/py interpreter", hint: `${cmd!} did not start (${r.error.message}); run uv sync --project tools/py`, record: "board-pcb" });
  }
  if (r.status !== 0) {
    if (confined && DENIED.test(r.stderr ?? "")) {
      const line = (r.stderr ?? "").split("\n").find((l) => DENIED.test(l))?.trim() ?? "";
      throw cmdError({
        code: "E_KERNEL", path: "/build/generator", got: path.basename(generator), expected: "no network, no write outside the run folder, no program but python",
        hint: `the generator confinement stopped ${path.basename(generator)}: ${line}; a board generator writes only its --out folder and reads the workspace`, record: `build-sandbox/${GENERATOR_REASON}`,
      });
    }
    return directFailure(r.status ?? 1, r.stdout ?? "", r.stderr ?? "");
  }
  const rec = path.join(outDir, DIRECT_RECORD);
  if (!existsSync(rec)) {
    throw cmdError({ code: "E_KERNEL", path: "/build/generator", got: path.basename(generator), expected: `${DIRECT_RECORD} beside the fab set`, hint: `${path.basename(generator)} exited 0 and wrote no ${DIRECT_RECORD} in ${outDir}`, record: "board-pcb" });
  }
  const files = readdirSync(outDir)
    .filter((n) => n !== DIRECT_RECORD && n !== DIRECT_GATES && statSync(path.join(outDir, n)).isFile())
    .map((name) => ({ name, bytes: new Uint8Array(readFileSync(path.join(outDir, name))) }));
  return directSuccess(readFileSync(rec, "utf8"), readFileSync(path.join(outDir, DIRECT_GATES), "utf8"), files);
}

export interface BoardBuildOptions {
  /** SOURCE_DATE_EPOCH, s; default sourceDateEpoch(). */
  readonly epoch?: number;
  readonly sandbox?: SandboxOptions;
}

/** Build a board design on its backend; a generator that refused returns its gate lines. */
export async function buildBoard(design: Design, values: Values, opts: BoardBuildOptions = {}): Promise<BoardBuilt | BoardRefused> {
  const { chase, ws } = design;
  const draft = await boardDraft(design, values, opts.sandbox);
  const epoch = opts.epoch ?? sourceDateEpoch(ws.root).value;
  const outDir = boardOutDir(design);
  const { box, runDir } = newRunDir(outDir);
  const run = runGenerator(ws.root, path.join(design.dir, draft.generator), runDir, epoch, "uv", box);
  if (!run.ok) return { refused: true, design, exit: run.exit, lines: run.lines };
  publishRun(runDir, outDir);
  const gen = generatorInputs(design);
  const inputs: BuildInputs = {
    defHash: hashOf({ def: design.defHash, generator: draft.generator, files: gen.files, pins: gen.pins }),
    paramsHash: hashOf(values),
    profileHash: hashOf([]),
    registryHash: registryHashOf({ kinds: {}, constraints: constraintVersions(), checks: boardCheckVersions(ws) }),
    kernelVersion: ws.versions.kernel,
    engines: { manifold: ws.versions.manifold },
    adapter: boardAdapter(draft.backend),
    seed: 0,
    sourceDateEpoch: epoch,
    licences: { [chase.meta.id]: chase.meta.license, shapely: "BSD-3-Clause", fonttools: "MIT" },
  };
  const { record, gates } = run;
  const tightest = typeof gates.tightest === "number" && typeof gates.rule === "number" ? { mm: gates.tightest, rule: gates.rule } : undefined;
  const part = boardPart(record, {
    id: path.basename(design.dir), name: chase.meta.name, machine: chase.meta.machines[0] ?? "",
    tightest, assertions: chase.assertions, buildHash: hashOf(inputs) as BuildHash,
  });
  return { design, values, part, record, gates, files: run.files, outDir, runDir, inputs, sourceDateEpoch: epoch };
}

/** The BOM, CPL and netlist of a board, written from its record by packages/board (the one writer of each). */
export function assemblyFiles(record: BoardRecord, stem: string, dialect: CplDialect = "body-centre"): { readonly exporter: "bom" | "cpl" | "netlist"; readonly name: string; readonly bytes: Uint8Array }[] {
  const enc = new TextEncoder();
  return [
    { exporter: "bom", name: `${stem}-BOM.csv`, bytes: enc.encode(writeBom(record)) },
    { exporter: "cpl", name: `${stem}-CPL.csv`, bytes: enc.encode(writeCpl(record, dialect)) },
    { exporter: "netlist", name: `${stem}-netlist.txt`, bytes: enc.encode(writeNetlist(record)) },
  ];
}

/** The fab zip and the BOM, CPL and netlist as artifacts for the artifact-level board checks, with the Part they came from. */
export function boardArtifacts(built: BoardBuilt): ArtifactBytes[] {
  const zip = fabZip(built.files);
  const stem = path.basename(built.design.dir);
  return [
    ...(zip === undefined ? [] : [{ exporter: "gerbers", name: zip.name, bytes: zip.bytes, part: built.part }]),
    ...assemblyFiles(built.record, stem).map((f) => ({ ...f, part: built.part })),
  ];
}

/** The nets of a board record as net targets (CHK-BRD-04 reads the record through the part). */
export function boardNets(part: Part): { readonly net: Net; readonly part: Part }[] {
  return (part.board?.nets ?? []).map((n) => ({
    part,
    net: {
      id: n.name, conductors: [], bodies: [], terminals: n.members, resistance: [], bulkOhm: 0 as Net["bulkOhm"], contacts: [],
      totalOhm: [0, 0] as unknown as Net["totalOhm"], unpricedContacts: [], capToGndPf: 0 as Net["capToGndPf"], couplingPf: {},
      capMethod: "none" as unknown as Net["capMethod"], tier: "unknown" as Net["tier"], qualifier: "unknown",
    },
  }));
}

/**
 * Every check that needs the board kernel, on the board Part and its fab
 * zip, with the board kernel registered beside the page milestone's.
 * Checks whose run lands later report skip with that milestone.
 */
export async function runBoardChecks(built: { readonly design: Pick<Design, "ws"> & { readonly chase?: Pick<Design["chase"], "expect"> }; readonly part?: Part }, artifacts: readonly ArtifactBytes[], views: KernelViews, only?: readonly string[]): Promise<CheckResult[]> {
  const ws = built.design.ws;
  const defs = boardCheckDefs(ws).filter((d) => only === undefined || only.includes(d.id));
  const part = built.part;
  const report = await runRegistry(defs, {
    kernels: new Set([...kernelsAt(PAGE_MILESTONE), "board"]),
    // A board is checked as one part, as the assembly of its placed parts (CHK-BRD-03, CHK-BRD-19),
    // through its nets (CHK-BRD-04) and as the project the run holds (CHK-BRD-06 to -09, -20, -21).
    targets: {
      ...(part === undefined ? {} : {
        parts: [part], assemblies: [boardAssembly(part)], nets: boardNets(part),
        project: { items: [{ id: part.id, kind: "part", hash: part.buildHash }], links: [], stale: [] },
      }),
      artifacts,
    },
    views: { ...views, catalog: views.catalog ?? workspaceCatalog(ws.root), ...(part === undefined ? {} : { part: (id: string) => (id === part.id ? part : views.part?.(id)) }) },
    ctx: { profile: createProfileLookup(ws.tables), machine: part?.machine ?? "", whitelist: new Map() },
    ...(built.design.chase?.expect === undefined ? {} : { expect: built.design.chase.expect }),
  });
  return [...report.results];
}

/** The board as an assembly target: its one Part, whose record holds the placed parts. */
export function boardAssembly(part: Part): Assembly {
  return {
    id: part.id, parts: [part], instances: [], bought: [], joints: [], connections: [], assertions: [],
    metrics: [], warnings: [], buildHash: part.buildHash,
  };
}

/** hbf://artifact handle of the fab zip by its sha256. */
export function zipHash(file: DirectFile): Hash {
  return sha256Hex(file.bytes) as Hash;
}
