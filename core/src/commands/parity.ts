// hbf parity (utility verb, D-152): rebuild a reference at its defaults and
// compare build.json, report.json, edit.json and artifacts.json with its
// expected/ folder (TESTING.md 5.1). --accept writes them; it is the only
// updater of these four JSON goldens (D-227). A section render under
// expected/ is not a parity golden and has its own named writer. Goldens
// are canonical JSON (RFC 8785) and hashes.
//
// Goldens are pinned to an epoch: a reference builds at the
// inputs.sourceDateEpoch its expected/build.json records, passed to the
// build directly, so the HEAD commit time (epoch.ts) and the caller's
// SOURCE_DATE_EPOCH never move buildHash or the 3MF bytes under parity.
// Without a build.json golden the epoch in force is used and recorded.
//
// Query goldens (M01-T05 corrections, D-228): a reference that declares
// constraints.query inputs in queries.json gets each one rerun and compared
// with the CommandResult golden it names under expected/, and --accept
// writes them. They are named by queries.json, never by GOLDEN_FILES. An
// entry may name command circuit.solve (M05-T07): the solve reruns on the
// reference built at the pinned epoch.
//
// The edit (M05-T18). edit.json names one pointer moved from `from` to
// `to`: a params pointer such as /keys/0/gap, or a chase default pointer
// such as /params/1/fields/0/item/3/default, the form chase.patch writes
// (M10), which moves that field's default and so every value built from
// it. The golden records the meshes that changed, the metric deltas and,
// when any check result changes verdict between the two builds, each such
// result as the after build reports it (id, target, from, to, measured,
// legal, fix), so an edit that flips a check is pinned to that flip.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CheckResult, CommandInput, Hash, ParamField } from "@hackbuild/spec";
import { cmdError } from "../errors.js";
import { canonicalize } from "@hackbuild/spec";
import { resolveTarget } from "../load-build.js";
import { reportObject } from "@hackbuild/checks";
import { buildPart, declares3mf, export3mf, loadDesign, resolveParams, workspaceRoot, type Built, type Design, type Values } from "./build.js";
import { reportChecks, runAllChecks } from "./check-run.js";
import { runConstraintsQuery } from "./constraints-query.js";
import { solveBuilt } from "./circuit-solve.js";
import { mcuPinRow } from "@hackbuild/catalog";
import { hashOf } from "../jcs.js";
import { finish } from "../result.js";
import type { CoreCtx } from "../ctx.js";
import { buildSurface, isSurfaceDir } from "./surface.js";
import { boardArtifacts, boardCheckVersions, buildBoard, fabZip, isBoardDesign, runBoardChecks, zipHash } from "../board.js";
import { boardViews } from "../board-views.js";
import { isWiringDesign, wiringDraft, wiringInputOf } from "../exporters/wiring.js";
import { workspaceCatalog } from "../catalog-files.js";
import { sha256Hex } from "@hackbuild/spec";
import { wiringReport, wiringSvg } from "@hackbuild/wiring";

export const GOLDEN_FILES = ["build.json", "report.json", "edit.json", "artifacts.json"] as const;
export type GoldenFile = (typeof GOLDEN_FILES)[number];

/** The file beside chase.ts that declares a reference's query goldens. */
export const QUERY_DECL = "queries.json";

export interface ParityArgs {
  readonly reference: string;
  readonly accept?: boolean;
  /** Where the goldens live; default <reference>/expected. */
  readonly expectedDir?: string;
}

export interface ParityFile {
  /** A GOLDEN_FILES name, or a query golden path relative to the reference as queries.json names it. */
  readonly file: GoldenFile | string;
  readonly status: "equal" | "differs" | "missing" | "written";
  /** Keys whose values moved, for a differing or rewritten file. */
  readonly moved: readonly string[];
}

export interface ParityOut {
  readonly reference: string;
  readonly ok: boolean;
  readonly accepted: boolean;
  readonly files: readonly ParityFile[];
  readonly buildHash: string;
  /**
   * Notes for the person who reads the diff before --accept. "mesh-layout"
   * when every golden meshHash moved and every golden volume is equal: the
   * likely cause is a change to how meshes are hashed or laid out, not to
   * the geometry, and --accept would re-baseline it without a trace.
   */
  readonly warnings: readonly string[];
  /**
   * A surface reference (chase.surface.ts, surface.ts): what the board was
   * evaluated as and its verdicts, gates passed and failed for a vinyl
   * board, nets whole and split after the weed erosion for a ladder.
   * buildHash is then the hash of the build result.
   */
  readonly surface?: { readonly kind: "vinyl" | "ladder"; readonly passed: number; readonly failed: number };
}

interface EditDecl { readonly pointer: string; readonly from: number; readonly to: number }

/** A chase default pointer: the default of a numeric field, or of a numeric item field of a list. */
const CHASE_DEFAULT = /^\/params\/(\d+)\/fields\/(\d+)(?:\/item\/(\d+))?\/default$/;

/**
 * The params pointers an edit sets to `v`. A params pointer sets itself; a
 * chase default pointer sets the field it names, and for a list item field
 * that field in every item the defaults build. E_REF when the pointer names
 * no numeric field, E_STALE when the chase default is not the edit's `from`.
 */
function editParams(design: Design, values: Values, edit: EditDecl, v: number): Values {
  const m = CHASE_DEFAULT.exec(edit.pointer);
  if (m === null) return { [edit.pointer]: v };
  const field = design.chase.params[Number(m[1])]?.fields[Number(m[2])];
  const item = m[3] === undefined ? field : field?.type === "list" ? field.item[Number(m[3])] : undefined;
  if (field === undefined || item === undefined || !("range" in item) || !("default" in item) || typeof item.default !== "number") {
    throw cmdError({ code: "E_REF", path: "/edit/pointer", got: edit.pointer, hint: "name the default of a numeric chase field, /params/<g>/fields/<f>/default or /params/<g>/fields/<f>/item/<i>/default" });
  }
  if (item.default !== edit.from) {
    throw cmdError({ code: "E_STALE", path: "/edit/from", got: edit.from, expected: String(item.default), hint: "the chase default moved; write expected/edit.json from the chase default and accept again" });
  }
  if (m[3] === undefined) return { [`/${field.id}`]: v };
  const items = (values[field.id] as readonly Values[] | undefined) ?? [];
  return Object.fromEntries(items.map((_, n) => [`/${field.id}/${n}/${item.id}`, v]));
}

/** One check result whose verdict an edit changed, as the after build reports it. */
function verdictKey(r: CheckResult): string {
  return `${r.id}\u0000${canonicalize(r.target)}`;
}

/**
 * Each check result whose verdict differs between two builds, both checked
 * without artifacts, as the before and after runs report it, sorted by id
 * then target. A result present in one run only is left out. chase.diff
 * and the parity edit read this one comparison.
 */
export async function verdictPairs(a: Built, b: Built): Promise<{ readonly before: CheckResult; readonly after: CheckResult }[]> {
  const before = new Map((await runAllChecks(a, [], undefined)).results.map((r) => [verdictKey(r), r] as const));
  const out: { before: CheckResult; after: CheckResult; key: string }[] = [];
  for (const r of (await runAllChecks(b, [], undefined)).results) {
    const key = verdictKey(r);
    const was = before.get(key);
    if (was === undefined || was.verdict === r.verdict) continue;
    out.push({ before: was, after: r, key });
  }
  return out.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0)).map(({ before: was, after }) => ({ before: was, after }));
}

/** The parity golden form of verdictPairs: the after result with the verdict it left. */
async function verdictFlips(a: Built, b: Built): Promise<Values[]> {
  return (await verdictPairs(a, b)).map(({ before: was, after: r }) => (
    { id: r.id, target: r.target, from: was.verdict, to: r.verdict, measured: r.measured, legal: r.legal, ...(r.fix === undefined ? {} : { fix: r.fix }) }
  ));
}

/** Number on a 1e-9 grid, so a delta of two decimals reads as written. */
const tidy = (v: number): number => Number(v.toFixed(9));

/**
 * The default edit: the first numeric param that carries a constraintDim,
 * moved one step up (one step down when that leaves its range). In a list
 * the pointer names item 0.
 */
function defaultEdit(design: Design, values: Values): EditDecl {
  for (const f of design.chase.params.flatMap((g) => g.fields)) {
    const pick = (field: ParamField, pointer: string, from: unknown): EditDecl | undefined => {
      if (!("constraintDim" in field) || field.constraintDim === undefined || typeof from !== "number" || !("range" in field)) return undefined;
      const step = "step" in field && typeof field.step === "number" ? field.step : (field.range[1] - field.range[0]) / 100;
      const up = tidy(from + step);
      return { pointer, from, to: up <= field.range[1] ? up : tidy(from - step) };
    };
    if (f.type === "list") {
      const first = (values[f.id] as Values[] | undefined)?.[0];
      for (const it of f.item) {
        const e = pick(it, `/${f.id}/0/${it.id}`, first?.[it.id]);
        if (e !== undefined) return e;
      }
    } else {
      const e = pick(f, `/${f.id}`, values[f.id]);
      if (e !== undefined) return e;
    }
  }
  throw cmdError({ code: "E_REF", path: "/params", hint: "no numeric param with a constraintDim to edit; write expected/edit.json by hand once and accept again" });
}

function valueAt(values: Values, pointer: string): unknown {
  let at: unknown = values;
  for (const seg of pointer.split("/").slice(1)) at = typeof at === "object" && at !== null ? (at as Values)[seg] : undefined;
  return at;
}

function buildJson(b: Built): Values {
  return {
    buildHash: b.part.buildHash,
    inputs: b.inputs,
    meshHashes: Object.fromEntries(b.part.bodies.map((x) => [x.id, x.mesh.hash])),
    volumes: Object.fromEntries(b.part.bodies.map((x) => [x.id, tidy(x.mesh.volumeMm3)])),
  };
}

function editJson(edit: EditDecl, a: Built, b: Built, flips: readonly Values[]): Values {
  const hashes = (x: Built) => new Map(x.part.bodies.map((y) => [y.id, y.mesh.hash]));
  const ha = hashes(a);
  const hb = hashes(b);
  const ids = [...new Set([...ha.keys(), ...hb.keys()])].sort();
  const metricDelta: Record<string, number> = {};
  for (const m of b.part.metrics) {
    const before = a.part.metrics.find((x) => x.id === m.id);
    if (typeof m.value === "number" && typeof before?.value === "number" && m.value !== before.value) metricDelta[m.id] = tidy(m.value - before.value);
  }
  return {
    ...edit,
    expect: {
      changed: ids.filter((id) => ha.get(id) !== hb.get(id)), unchanged: ids.filter((id) => ha.get(id) === hb.get(id)), metricDelta,
      // Present only when a verdict moved, so an edit that flips nothing keeps its golden as written before M05-T18.
      ...(flips.length === 0 ? {} : { verdicts: flips }),
    },
  };
}

function readGolden(file: string): unknown {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function movedKeys(a: unknown, b: unknown): string[] {
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return canonicalize(a ?? null) === canonicalize(b ?? null) ? [] : ["/"];
  const ra = a as Values;
  const rb = b as Values;
  return [...new Set([...Object.keys(ra), ...Object.keys(rb)])].sort().filter((k) => canonicalize(ra[k] ?? null) !== canonicalize(rb[k] ?? null));
}

/**
 * The mesh-layout warning for a build.json golden against a fresh one: every
 * body in both moved its meshHash while every volume stayed equal.
 */
export function layoutWarnings(old: unknown, fresh: unknown): string[] {
  const rec = (v: unknown, k: string): Record<string, unknown> | undefined => {
    const x = typeof v === "object" && v !== null ? (v as Values)[k] : undefined;
    return typeof x === "object" && x !== null ? (x as Record<string, unknown>) : undefined;
  };
  const [ha, hb, va, vb] = [rec(old, "meshHashes"), rec(fresh, "meshHashes"), rec(old, "volumes"), rec(fresh, "volumes")];
  if (ha === undefined || hb === undefined || va === undefined || vb === undefined) return [];
  const ids = Object.keys(ha).filter((id) => id in hb);
  if (ids.length === 0) return [];
  const allMoved = ids.every((id) => ha[id] !== hb[id]);
  const volumesEqual = ids.every((id) => va[id] === vb[id]);
  return allMoved && volumesEqual
    ? [`mesh-layout: all ${ids.length} meshHashes moved and every volume is equal; this reads as a hash or layout change, not geometry. Name the change before --accept`]
    : [];
}

/** The epoch a build.json golden records, when it records one. */
function goldenEpoch(dir: string): number | undefined {
  const g = readGolden(path.join(dir, "build.json")) as { inputs?: { sourceDateEpoch?: unknown } } | null | undefined;
  const e = g?.inputs?.sourceDateEpoch;
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 0 ? e : undefined;
}

/**
 * One declared query golden. `command` defaults to constraints.query; a
 * circuit.solve declaration (M05-T07) reruns the solve on the reference
 * built at the pinned epoch, so its buildHash is the build.json golden's.
 */
type QueryDecl =
  | { readonly golden: string; readonly command?: "constraints.query"; readonly input: CommandInput<"constraints.query"> }
  | { readonly golden: string; readonly command: "circuit.solve"; readonly input: CommandInput<"circuit.solve"> };

/** The commands a queries.json entry may name. */
export const QUERY_COMMANDS = ["constraints.query", "circuit.solve"] as const;

/** The declared query goldens; E_SCHEMA when queries.json is malformed or names a path outside expected/. */
function queryDecls(designDir: string): readonly QueryDecl[] {
  const file = path.join(designDir, QUERY_DECL);
  if (!existsSync(file)) return [];
  const raw = readGolden(file) as { queries?: unknown } | null;
  const list = raw?.queries;
  if (!Array.isArray(list)) throw cmdError({ code: "E_SCHEMA", path: `/${QUERY_DECL}/queries`, expected: "a list of {golden, input}", hint: "write queries.json as {\"queries\": [{\"golden\": \"expected/query-1.json\", \"input\": {...}}]}" });
  return list.map((q: unknown, i): QueryDecl => {
    const d = q as { golden?: unknown; command?: unknown; input?: unknown } | null;
    const command = d?.command ?? "constraints.query";
    if (typeof d?.golden !== "string" || !/^expected\/query-[^/]+\.json$/.test(d.golden) || typeof d.input !== "object" || d.input === null
      || !(QUERY_COMMANDS as readonly unknown[]).includes(command)) {
      throw cmdError({ code: "E_SCHEMA", path: `/${QUERY_DECL}/queries/${i}`, got: d?.golden ?? null, expected: `golden expected/query-<name>.json, an input object and a command in ${QUERY_COMMANDS.join(", ")}`, hint: "name each golden under expected/ as query-<name>.json and give its input; command defaults to constraints.query" });
    }
    return command === "circuit.solve"
      ? { golden: d.golden, command, input: d.input as CommandInput<"circuit.solve"> }
      : { golden: d.golden, input: d.input as CommandInput<"constraints.query"> };
  });
}

/**
 * Each declared query rerun as the CommandResult its golden holds; inputsHash
 * is the hash of the declared input. A circuit.solve query builds its target
 * at defaults at `epoch`, the build.json golden's when the caller passes it,
 * else the one goldenEpoch reads beside designDir.
 */
export async function queryGoldens(designDir: string, cwd: string, epoch?: number): Promise<readonly { readonly file: string; readonly fresh: unknown }[]> {
  const out: { file: string; fresh: unknown }[] = [];
  for (const d of queryDecls(designDir)) {
    const ctx = { workspace: workspaceRoot(cwd), cwd, inputsHash: hashOf(d.input) as Hash } as unknown as CoreCtx;
    if (d.command === "circuit.solve") {
      if (d.input.mcu !== undefined) mcuPinRow(d.input.mcu, "/mcu");
      const design = await loadDesign(resolveTarget(d.input.build, cwd, workspaceRoot(cwd), "/build"), cwd);
      const at = epoch ?? goldenEpoch(path.join(designDir, "expected"));
      const built = await buildPart(design, resolveParams(design.chase, undefined, undefined), at === undefined ? {} : { epoch: at });
      out.push({ file: d.golden, fresh: finish(await solveBuilt(built, d.input, ctx)) });
      continue;
    }
    out.push({ file: d.golden, fresh: finish(await runConstraintsQuery(d.input, ctx)) });
  }
  return out;
}

/**
 * Parity of a surface reference: each surface golden equal and the board
 * passing (surface.ts). Its goldens have one writer, the reference test
 * with HBF_ACCEPT_VINYL=1, beside the stats golden that needs the oracle.
 */
async function surfaceParity(args: ParityArgs, dir: string, cwd: string): Promise<ParityOut> {
  if (args.accept === true) {
    const rel = path.relative(workspaceRoot(dir), dir).split(path.sep).join("/");
    throw cmdError({ code: "E_SCHEMA", path: "/accept", got: true, expected: "no --accept on a surface reference", hint: `surface goldens are written with HBF_ACCEPT_VINYL=1 npx vitest run ${rel}, beside the stats golden that reads the shipped oracle` });
  }
  const s = await buildSurface(dir);
  const gold = args.expectedDir === undefined ? path.join(dir, "expected") : path.resolve(cwd, args.expectedDir);
  const files: ParityFile[] = Object.entries(s.fresh).map(([file, fresh]) => {
    const old = readGolden(path.join(gold, file));
    if (old === undefined) return { file, status: "missing", moved: [] };
    return { file, status: canonicalize(old ?? null) === canonicalize(fresh) ? "equal" : "differs", moved: movedKeys(old, fresh) };
  });
  return {
    reference: s.reference, ok: s.failed === 0 && files.every((f) => f.status === "equal"), accepted: false, files,
    buildHash: s.draftHash, warnings: [], surface: { kind: s.kind, passed: s.passed, failed: s.failed },
  };
}

/** The goldens a board reference keeps: a board chase has no params, so no edit.json (M08-T06). */
export const BOARD_GOLDEN_FILES = ["build.json", "report.json", "artifacts.json", "reparse.json"] as const;

/**
 * Parity of a board reference (M08-T06): the generator reruns at the epoch
 * build.json pins; build.json holds buildHash, inputs, recordHash and the
 * board metrics, report.json the board checks, artifacts.json the fab
 * zip's sha256. A refused generator is E_KERNEL with its first gate line.
 */
async function boardParity(args: ParityArgs, design: Design, dir: string): Promise<ParityOut> {
  const pinned = goldenEpoch(dir);
  const built = await buildBoard(design, {}, pinned === undefined ? {} : { epoch: pinned });
  if ("refused" in built) {
    throw cmdError({ code: "E_KERNEL", path: "/reference", got: built.lines, hint: `${design.target}: ${built.lines[0] ?? `generator exited ${built.exit}`}`, record: "board-pcb" });
  }
  const views = boardViews(design.ws.root, built.runDir, design.dir);
  const results = await runBoardChecks(built, boardArtifacts(built), views);
  const zip = fabZip(built.files);
  // The reparse CHK-BRD-01 ran, as its report: lines, vector, drills, pour, raster (M08-T07 expected/reparse.json).
  const reparse = [...views.reparsed.values()][0];
  const fresh: Record<(typeof BOARD_GOLDEN_FILES)[number], unknown> = {
    "build.json": {
      buildHash: built.part.buildHash, inputs: built.inputs, recordHash: built.record.recordHash,
      metrics: Object.fromEntries(built.part.metrics.map((m) => [m.id, m.value])),
    },
    "report.json": reportObject(boardCheckVersions(design.ws), results),
    "artifacts.json": zip === undefined ? {} : { gerbers: zipHash(zip) },
    "reparse.json": reparse?.detail ?? {},
  };
  const files: ParityFile[] = BOARD_GOLDEN_FILES.map((file) => {
    const old = readGolden(path.join(dir, file));
    const moved = old === undefined ? [] : movedKeys(old, fresh[file]);
    if (args.accept === true) return { file, status: "written", moved };
    if (old === undefined) return { file, status: "missing", moved };
    return { file, status: canonicalize(old ?? null) === canonicalize(fresh[file]) ? "equal" : "differs", moved };
  });
  if (args.accept === true) {
    mkdirSync(dir, { recursive: true });
    for (const file of BOARD_GOLDEN_FILES) writeFileSync(path.join(dir, file), `${canonicalize(fresh[file])}\n`);
  }
  return {
    reference: design.target, ok: files.every((f) => f.status === "equal" || f.status === "written"),
    accepted: args.accept === true, files, buildHash: built.part.buildHash, warnings: [],
  };
}

/** The goldens a wiring reference keeps (M08-T13): no params, no checks, so no edit.json or report.json. */
export const WIRING_GOLDEN_FILES = ["build.json", "artifacts.json"] as const;

/**
 * Parity of a wiring reference (M08-T13): build.ts reruns in the sandbox,
 * the pins come from the catalog row again. build.json holds buildHash
 * (the hash of the chase, the draft and the resolved WiringInput, so a
 * catalog row edit moves it), the board, its tier and the WiringReport;
 * artifacts.json the drawing's sha256.
 */
async function wiringParity(args: ParityArgs, design: Design, dir: string): Promise<ParityOut> {
  const draft = await wiringDraft(design, {});
  const input = wiringInputOf(workspaceCatalog(design.ws.root), draft);
  const buildHash = hashOf({ def: design.defHash, draft, input });
  const fresh: Record<(typeof WIRING_GOLDEN_FILES)[number], unknown> = {
    "build.json": { buildHash, board: input.board, report: wiringReport(input) },
    "artifacts.json": { wiring: sha256Hex(new TextEncoder().encode(wiringSvg(input))) },
  };
  const files: ParityFile[] = WIRING_GOLDEN_FILES.map((file) => {
    const old = readGolden(path.join(dir, file));
    const moved = old === undefined ? [] : movedKeys(old, fresh[file]);
    if (args.accept === true) return { file, status: "written", moved };
    if (old === undefined) return { file, status: "missing", moved };
    return { file, status: canonicalize(old ?? null) === canonicalize(fresh[file]) ? "equal" : "differs", moved };
  });
  if (args.accept === true) {
    mkdirSync(dir, { recursive: true });
    for (const file of WIRING_GOLDEN_FILES) writeFileSync(path.join(dir, file), `${canonicalize(fresh[file])}\n`);
  }
  return {
    reference: design.target, ok: files.every((f) => f.status === "equal" || f.status === "written"),
    accepted: args.accept === true, files, buildHash, warnings: [],
  };
}

export async function runParity(args: ParityArgs, cwd: string): Promise<ParityOut> {
  const target = resolveTarget(args.reference, cwd, workspaceRoot(cwd), "/reference");
  if (isSurfaceDir(target)) return surfaceParity(args, target, cwd);
  const design = await loadDesign(target, cwd);
  const dir = args.expectedDir === undefined ? path.join(design.dir, "expected") : path.resolve(cwd, args.expectedDir);
  if (isWiringDesign(design)) return wiringParity(args, design, dir);
  if (isBoardDesign(design)) return boardParity(args, design, dir);
  const values = resolveParams(design.chase, undefined, undefined);
  const pinned = goldenEpoch(dir);
  const opts = pinned === undefined ? {} : { epoch: pinned };
  const built = await buildPart(design, values, opts);
  // A chase that declares no 3mf export gets no package, and artifacts.json is empty.
  const pkg = declares3mf(design) ? await export3mf(built) : undefined;
  const checked = await runAllChecks(built, pkg === undefined ? [] : [{ exporter: "3mf", name: pkg.name, bytes: pkg.bytes, part: built.part }], undefined);
  const results: readonly CheckResult[] = checked.results;

  const stored = readGolden(path.join(dir, "edit.json")) as Partial<EditDecl> | null | undefined;
  const edit: EditDecl = stored !== null && stored !== undefined && typeof stored.pointer === "string" && typeof stored.from === "number" && typeof stored.to === "number"
    ? { pointer: stored.pointer, from: stored.from, to: stored.to }
    : defaultEdit(design, values);
  const from = editParams(design, values, edit, edit.from);
  const atDefaults = Object.entries(from).every(([p, v]) => valueAt(values, p) === v);
  const before = atDefaults ? built : await buildPart(design, resolveParams(design.chase, from, undefined), opts);
  const after = await buildPart(design, resolveParams(design.chase, editParams(design, values, edit, edit.to), undefined), opts);
  const flips = await verdictFlips(before, after);

  const fresh: Record<GoldenFile, unknown> = {
    "build.json": buildJson(built),
    "report.json": reportObject(reportChecks(built), results),
    "edit.json": editJson(edit, before, after, flips),
    "artifacts.json": pkg === undefined ? {} : { "3mf": pkg.artifactHash },
  };
  const warnings = layoutWarnings(readGolden(path.join(dir, "build.json")), fresh["build.json"]);
  const files: ParityFile[] = GOLDEN_FILES.map((file) => {
    const old = readGolden(path.join(dir, file));
    const moved = old === undefined ? [] : movedKeys(old, fresh[file]);
    if (args.accept === true) return { file, status: "written", moved };
    if (old === undefined) return { file, status: "missing", moved };
    return { file, status: canonicalize(old ?? null) === canonicalize(fresh[file]) ? "equal" : "differs", moved };
  });
  const queries = await queryGoldens(design.dir, cwd, pinned);
  for (const q of queries) {
    // queries.json names goldens under expected/; they live in the goldens dir.
    const at = path.join(dir, path.basename(q.file));
    const old = readGolden(at);
    const moved = old === undefined ? [] : movedKeys(old, q.fresh);
    files.push(
      args.accept === true ? { file: q.file, status: "written", moved }
        : old === undefined ? { file: q.file, status: "missing", moved }
          : { file: q.file, status: canonicalize(old ?? null) === canonicalize(q.fresh) ? "equal" : "differs", moved },
    );
  }
  if (args.accept === true) {
    mkdirSync(dir, { recursive: true });
    for (const file of GOLDEN_FILES) writeFileSync(path.join(dir, file), `${canonicalize(fresh[file])}\n`);
    for (const q of queries) writeFileSync(path.join(dir, path.basename(q.file)), `${canonicalize(q.fresh)}\n`);
  }
  return {
    reference: design.target, ok: files.every((f) => f.status === "equal" || f.status === "written"),
    accepted: args.accept === true, files, buildHash: built.part.buildHash, warnings,
  };
}
