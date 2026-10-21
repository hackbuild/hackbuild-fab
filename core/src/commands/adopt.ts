// hbf adopt (plan v9 3.1 second bullet, R1-engine-25; group make, CLI only
// until the F4 decision). Lifts an hbf draft into a design: the sources come
// from the application/hbf-draft+json block of a DRAFT page, or from a
// draft directory's draft.json and files. A page without the block is
// refused (E_SCHEMA "not an hbf draft"); old print-forge benches are
// adopted by the designs area's ports, not here.
//
// Order: chase.validate on the draft first, so an error blocks with nothing
// written; chase.scaffold from draft: on branch hbf/<name> into
// designs/<name>; chase.patch sets each default the scaffold moved back to
// the state the page opens with; widget.ts goes to widgets/ as a candidate
// (graduation to a registered kind is its own change). The draft's export
// is stored as expected/draft-export.3mf with its sha256 and 3MF part
// geometry hash, and test/draft-export.test.ts compares the adopted build
// with it through draftExportDrift below. part.build, check.run and
// chase.bake then run as on any design: checks block again, so a failing
// build is adopted and its export refuses at the gate. The virtual slice
// runs through tools/slice/slice.mjs only when asked and present, else it
// is not run, never a pass. Nothing is committed; the files are staged.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readEntries, readModels } from "@hackbuild/3mf";
import { allFields, readChaseSource } from "@hackbuild/chase";
import { defaultsOf, draft3mf } from "@hackbuild/pipeline";
import {
  DRAFT_BLOCK_FILE, DRAFT_BLOCK_TYPE, DRAFT_META_KEY, DRAFT_META_VALUE, sha256Hex,
  type CommandError, type CommandInput, type CommandOutput, type DraftBlock, type Hash, type PatchEdit,
} from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import { worst, type CommandOut } from "../result.js";
import { buildPart, export3mf, loadDesign, resolveParams, workspaceRoot } from "./build.js";
import { runChaseBake, runNode } from "./chase-bake.js";
import { git, tryGit, writeChasePatch } from "./chase-patch.js";
import { runChaseScaffold } from "./chase-scaffold.js";
import { runChaseValidate } from "./chase-validate.js";
import { runCheckRun } from "./check-run.js";
import { runPartBuild } from "./part-build.js";

type Output = CommandOutput<"adopt">;

const posix = (p: string): string => p.split(path.sep).join("/");

/** The golden a draft leaves in its design, relative to the design directory. */
export const GOLDEN_3MF = "expected/draft-export.3mf";
export const GOLDEN_JSON = "expected/draft-export.json";
const GOLDEN_TEST = "test/draft-export.test.ts";

/** What expected/draft-export.json records beside the 3MF. */
export interface GoldenRecord {
  readonly sha256: string;
  readonly source: Output["golden"]["source"];
  readonly geometryHash: string;
  readonly draftDefHash: string;
  readonly kernelVersion: string;
}

const notDraft = (got: string, hint: string): never => {
  throw cmdError({ code: "E_SCHEMA", path: "/draft", got, expected: "not an hbf draft: a DRAFT page or a draft directory", hint });
};

/** The draft block of a DRAFT page's html, checked for the fields adopt reads. */
export function blockOfPage(html: string, label: string): DraftBlock {
  const open = `<script type="${DRAFT_BLOCK_TYPE}">`;
  const at = html.indexOf(open);
  if (at < 0) return notDraft(label, `${label} carries no ${DRAFT_BLOCK_TYPE} block; adopt reads pages hbf draft baked, and old benches are ported in the designs area`);
  const end = html.indexOf("</script>", at);
  return blockOf(html.slice(at + open.length, end < 0 ? undefined : end), label);
}

function blockOf(text: string, label: string): DraftBlock {
  let b: Partial<DraftBlock>;
  try {
    b = JSON.parse(text) as Partial<DraftBlock>;
  } catch (e) {
    return notDraft(label, `the draft block of ${label} does not parse (${(e as Error).message}); bake the draft again`);
  }
  const ok = typeof b.goal === "string" && typeof b.chase === "string" && typeof b.build === "string"
    && typeof b.files === "object" && b.files !== null && (b.widget === null || typeof b.widget === "string")
    && typeof b.state === "object" && b.state !== null && typeof b.kernelVersion === "string" && typeof b.defHash === "string";
  if (!ok) return notDraft(label, `the draft block of ${label} lacks goal, chase, build, files, widget, state, kernelVersion or defHash; bake the draft again`);
  return b as DraftBlock;
}

/** Write a block's sources into dir: chase.ts, the build module where chase.ts names it, the closure files and widget.ts. */
function materialize(block: DraftBlock, dir: string, label: string): void {
  const chase = readChaseSource(block.chase, `${label}/chase.ts`).chase;
  const files: Record<string, string> = { ...block.files, "chase.ts": block.chase, [posix(path.normalize(chase.build.module))]: block.build };
  if (block.widget !== null) files["widget.ts"] = block.widget;
  for (const [f, text] of Object.entries(files)) {
    const abs = path.resolve(dir, f);
    if (!abs.startsWith(dir + path.sep)) notDraft(label, `the draft block names ${f}, outside the draft; bake the draft again`);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
}

/** One mesh or component object of a 3MF, keyed part#id, with its geometry hash and size. */
interface MeshRow {
  readonly key: string;
  readonly hash: string;
  readonly vertices: number;
  readonly triangles: number;
}

/** The geometry of every object in the package: vertex and triangle bytes, component references and transforms. Names and metadata stay out. */
async function meshRows(bytes: Uint8Array): Promise<MeshRow[]> {
  const rows: MeshRow[] = [];
  const models = readModels(await readEntries(bytes));
  for (const part of [...models.keys()].sort()) {
    const objects = models.get(part)!.objects;
    for (const id of [...objects.keys()].sort((a, b) => a - b)) {
      const o = objects.get(id)!;
      const pos = o.positions ?? new Float64Array(0);
      const tri = o.triangles ?? new Uint32Array(0);
      const comps = o.components.map((c) => `${c.objectid} ${c.path ?? ""} ${c.transform ?? ""}`).join("\n");
      const hash = sha256Hex(`${sha256Hex(new Uint8Array(pos.buffer, pos.byteOffset, pos.byteLength))} ${sha256Hex(new Uint8Array(tri.buffer, tri.byteOffset, tri.byteLength))} ${sha256Hex(comps)}`);
      rows.push({ key: `${part}#${id}`, hash, vertices: pos.length / 3, triangles: tri.length / 3 });
    }
  }
  return rows;
}

const geometryHash = (rows: readonly MeshRow[]): string => sha256Hex(rows.map((r) => `${r.key} ${r.hash}`).join("\n"));

/** The 3MF part geometry hash of a package. */
export async function geometryHashOf(bytes: Uint8Array): Promise<string> {
  return geometryHash(await meshRows(bytes));
}

/** Lines naming each object whose geometry differs between the draft export and the adopted build's 3MF; empty when they match. */
function meshDiff(draft: readonly MeshRow[], adopted: readonly MeshRow[]): string[] {
  const a = new Map(adopted.map((r) => [r.key, r]));
  const out: string[] = [];
  for (const d of draft) {
    const n = a.get(d.key);
    if (n === undefined) out.push(`${d.key}: in the draft export only (${d.vertices} vertices, ${d.triangles} triangles, computed)`);
    else if (n.hash !== d.hash) out.push(`${d.key}: geometry moved, ${d.vertices} vertices and ${d.triangles} triangles in the draft export, ${n.vertices} and ${n.triangles} adopted (computed)`);
    a.delete(d.key);
  }
  for (const n of a.values()) out.push(`${n.key}: in the adopted build only (${n.vertices} vertices, ${n.triangles} triangles, computed)`);
  return out;
}

export interface Drift {
  readonly geometryHash: string;
  readonly adoptedGeometryHash: string;
  readonly diff: readonly string[];
  /** The adopted build's 3MF, at its defaults. */
  readonly adopted: Uint8Array;
}

/**
 * The adopted design in dir against its draft golden: the golden's sha256
 * and geometry hash against draft-export.json, then its 3MF part geometry
 * against the 3MF of the design built at its defaults. test/draft-export
 * in the design and hbf adopt both call it.
 */
export async function draftExportDrift(dir: string, cwd: string = dir): Promise<Drift> {
  const golden = new Uint8Array(readFileSync(path.join(dir, GOLDEN_3MF)));
  const rec = JSON.parse(readFileSync(path.join(dir, GOLDEN_JSON), "utf8")) as GoldenRecord;
  const diff: string[] = [];
  const sha = sha256Hex(golden);
  if (sha !== rec.sha256) diff.push(`${GOLDEN_3MF}: sha256 ${sha}, ${GOLDEN_JSON} records ${rec.sha256}`);
  const design = await loadDesign(dir, cwd);
  const built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
  const adopted = (await export3mf(built)).bytes;
  const want = await meshRows(golden);
  const got = await meshRows(adopted);
  const g = geometryHash(want);
  if (g !== rec.geometryHash) diff.push(`${GOLDEN_3MF}: geometry hash ${g}, ${GOLDEN_JSON} records ${rec.geometryHash}`);
  diff.push(...meshDiff(want, got));
  return { geometryHash: g, adoptedGeometryHash: geometryHash(got), diff, adopted };
}

/** The test adopt writes beside the golden; vitest picks it up under designs/. */
const goldenTest = (rel: string): string => `// ${rel}/${GOLDEN_TEST}
// Written by hbf adopt (R1-engine-25). The adopted build's 3MF part
// geometry against ${GOLDEN_3MF}, the draft's export: an empty diff, or
// the lines a person reads before accepting the move into the golden.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { draftExportDrift } from "${"../".repeat(rel.split("/").length + 1)}core/src/commands/adopt.js";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the adopted build's 3MF part geometry equals the draft export golden", async () => {
  expect((await draftExportDrift(DIR)).diff).toEqual([]);
}, 120_000);
`;

/** Pointer edits that set each top level input default to the state the draft page opens with. */
function stateEdits(chaseText: string, label: string, state: Readonly<Record<string, unknown>>): PatchEdit[] {
  const chase = readChaseSource(chaseText, label).chase;
  const now = defaultsOf(chase);
  const edits: PatchEdit[] = [];
  for (const [f, pointer] of allFields(chase)) {
    if (!/^\/params\/\d+\/fields\/\d+$/.test(pointer) || !(f.id in state)) continue;
    const want = state[f.id];
    if (JSON.stringify(want) !== JSON.stringify(now[f.id])) edits.push({ pointer: `${pointer}/default`, set: want } as PatchEdit);
  }
  return edits;
}

/** How long the slicer may run, seconds (inferred: slice.mjs's own default). */
const SLICE_LIMIT_S = 600;

/** The virtual slice of the adopted 3MF through the reach area's driver; not run carries why. */
async function virtualSlice(ctx: CoreCtx, root: string, name: string, bytes: Uint8Array, asked: boolean, failing: boolean): Promise<Output["slice"]> {
  const driver = path.join(root, "tools", "slice", "slice.mjs");
  if (!asked) return { status: "not run", reason: "slice not asked; pass --slice to slice the adopted 3mf through tools/slice/slice.mjs" };
  if (!existsSync(driver)) return { status: "not run", reason: "no tools/slice/slice.mjs in this workspace" };
  if (failing) return { status: "not run", reason: "a check fails; slice.mjs slices no failing build" };
  const out = mkdtempSync(path.join(os.tmpdir(), "hbf-adopt-slice-"));
  const file = path.join(out, `${name}.3mf`);
  writeFileSync(file, bytes);
  const r = await runNode(ctx, root, [driver, file, out, "--time-limit", String(SLICE_LIMIT_S)]);
  const first = (s: string): string => s.trim().split("\n")[0] ?? "";
  if (r.code === 0) return { status: "sliced", reason: `${first(r.out)}; virtual print in ${posix(out)}, computed, never a print` };
  if (r.code === 3) return { status: "not run", reason: first(r.out) || "the slicer is absent" };
  return { status: "failed", reason: first(r.err) || first(r.out) || `slice.mjs exit ${r.code}` };
}

const refused = (ctx: CoreCtx, errors: readonly CommandError[]): CommandOut<Output> => ({
  verdict: "fail", stage: "input", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts: [], next: [],
  result: {
    design: "", branch: "", files: [], defHash: "" as Hash, buildHash: "" as Hash,
    checks: { pass: 0, warn: 0, fail: 0, skip: 0 }, page: { file: "", bytes: 0, hash: "" as Hash },
    golden: { file: "", sha256: "", source: "computed", geometryHash: "", adoptedGeometryHash: "", diff: [] },
    slice: { status: "not run", reason: "refused before the build" }, widget: null,
  },
});

/** The draft block and the directory holding its sources; scratch is set when adopt wrote that directory. */
function readDraft(input: CommandInput<"adopt">, cwd: string, top: string): { block: DraftBlock; src: string; scratch?: string } {
  const abs = path.resolve(cwd, input.draft);
  if (!existsSync(abs)) throw cmdError({ code: "E_REF", path: "/draft", got: input.draft, expected: "a DRAFT page or a draft directory", hint: "name the page hbf draft baked, or its .hbf/drafts/<name> directory" });
  if (statSync(abs).isDirectory()) {
    const file = path.join(abs, DRAFT_BLOCK_FILE);
    if (!existsSync(file)) return notDraft(input.draft, `${input.draft} holds no ${DRAFT_BLOCK_FILE}; adopt reads drafts hbf draft wrote`);
    return { block: blockOf(readFileSync(file, "utf8"), input.draft), src: abs };
  }
  const block = blockOfPage(readFileSync(abs, "utf8"), input.draft);
  mkdirSync(path.join(top, ".hbf"), { recursive: true });
  const scratch = mkdtempSync(path.join(top, ".hbf", "adopt-"));
  materialize(block, scratch, input.draft);
  return { block, src: scratch, scratch };
}

/** The draft's export: the DRAFT_ 3MF the page wrote, or the page's export computed from the draft at its opening state. */
async function draftExport(input: CommandInput<"adopt">, ctx: CoreCtx, src: string, block: DraftBlock, id: string): Promise<{ bytes: Uint8Array; source: Output["golden"]["source"] }> {
  if (input.export !== undefined) {
    const bytes = new Uint8Array(readFileSync(path.resolve(ctx.cwd, input.export)));
    const root = readModels(await readEntries(bytes)).get("3D/3dmodel.model");
    if (root?.metadata[DRAFT_META_KEY] !== DRAFT_META_VALUE) {
      throw cmdError({ code: "E_SCHEMA", path: "/export", got: input.export, expected: `a DRAFT_ 3mf carrying ${DRAFT_META_KEY} ${DRAFT_META_VALUE}`, hint: "pass the 3mf the draft page wrote, or leave --export out to compute it from the draft" });
    }
    return { bytes, source: "page export" };
  }
  const design = await loadDesign(src, ctx.cwd);
  const built = await buildPart(design, resolveParams(design.chase, block.state as Record<string, never>, undefined));
  return { bytes: (await draft3mf(built, id)).bytes, source: "computed" };
}

export async function runAdopt(input: CommandInput<"adopt">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const found = tryGit(ctx.cwd, ["rev-parse", "--show-toplevel"]);
  if (found === undefined || found === "") {
    throw cmdError({ code: "E_REF", path: "/draft", got: ctx.cwd, expected: "a directory in a git work tree", hint: "adopt writes designs/<name> on branch hbf/<name>; run it inside the repository" });
  }
  const top = realpathSync(found);
  const root = workspaceRoot(ctx.workspace);
  const { block, src, scratch } = readDraft(input, ctx.cwd, top);
  try {
    const chase = readChaseSource(block.chase, `${input.draft}/chase.ts`).chase;
    const name = input.name ?? chase.meta.id;

    // chase.validate first: an error blocks before anything is written.
    const valid = await runChaseValidate({ chase: src }, ctx);
    if (valid.errors.length > 0) return refused(ctx, valid.errors);
    ctx.signal.throwIfAborted();

    const made = await runChaseScaffold({ kind: chase.meta.kind, name, from: `draft:${src}` }, ctx);
    if (made.errors.length > 0) return refused(ctx, made.errors);
    const rel = `designs/${name}`;
    const dir = path.join(top, rel);
    const edits = stateEdits(readFileSync(path.join(dir, "chase.ts"), "utf8"), `${rel}/chase.ts`, block.state);
    if (edits.length > 0) {
      const w = await writeChasePatch(ctx, dir, "chase.ts", edits);
      if ("errors" in w) return refused(ctx, w.errors);
    }
    let widget: string | null = null;
    if (block.widget !== null) {
      widget = `${rel}/widgets/widget.ts`;
      mkdirSync(path.join(dir, "widgets"), { recursive: true });
      writeFileSync(path.join(top, widget), block.widget);
    }

    const exported = await draftExport(input, ctx, src, block, chase.meta.id);
    const record: GoldenRecord = {
      sha256: sha256Hex(exported.bytes), source: exported.source, geometryHash: await geometryHashOf(exported.bytes),
      draftDefHash: block.defHash, kernelVersion: block.kernelVersion,
    };
    mkdirSync(path.join(dir, "expected"), { recursive: true });
    mkdirSync(path.join(dir, "test"), { recursive: true });
    writeFileSync(path.join(dir, GOLDEN_3MF), exported.bytes);
    writeFileSync(path.join(dir, GOLDEN_JSON), `${JSON.stringify(record, null, 2)}\n`);
    writeFileSync(path.join(dir, GOLDEN_TEST), goldenTest(rel));
    ctx.signal.throwIfAborted();

    const built = await runPartBuild({ chase: dir }, ctx);
    if (built.errors.length > 0 || built.buildHash === undefined) return { ...refused(ctx, built.errors), stage: "build" };
    const checked = await runCheckRun({ build: dir }, ctx);
    const failing = checked.counts.fail > 0;
    const drift = await draftExportDrift(dir, ctx.cwd);
    const slice = await virtualSlice(ctx, root, name, drift.adopted, input.slice === true, failing);
    const page = await runChaseBake({ chase: dir }, ctx);
    if (page.errors.length > 0 || page.result === undefined) return { ...refused(ctx, page.errors), stage: "build" };

    git(top, ["add", "--", rel]);
    const files = git(top, ["diff", "--cached", "--name-only", "--", rel]).split("\n").filter((f) => f !== "").sort();
    const defHash = (await loadDesign(dir, ctx.cwd)).defHash as Hash;
    const verdict = checked.verdict === "pass" && drift.diff.length > 0 ? "warn" : worst(checked.result?.results ?? []);
    return {
      verdict, stage: "done", buildHash: built.buildHash, inputsHash: ctx.inputsHash,
      findings: checked.findings, counts: checked.counts, errors: [], artifacts: [], next: checked.next,
      result: {
        design: rel, branch: `hbf/${name}`, files, defHash, buildHash: built.buildHash as unknown as Hash,
        checks: checked.counts, page: page.result,
        golden: { file: `${rel}/${GOLDEN_3MF}`, sha256: record.sha256, source: record.source, geometryHash: drift.geometryHash, adoptedGeometryHash: drift.adoptedGeometryHash, diff: drift.diff },
        slice, widget,
      },
    };
  } finally {
    if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
  }
}
