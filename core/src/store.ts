// The content-addressed store (D-050, AGENT-SURFACE.md 7.1 and 7.2):
// <workspace>/.hbf/store/{builds,meshes,reports,artifacts} keyed by content
// hash, addressed as hbf://build/<h>, hbf://mesh/<h>, hbf://report/<h> and
// hbf://artifact/<h>, plus the static hbf://check/<id> read from the check
// seed. Each kind keeps one file form: builds/<buildHash>.json,
// meshes/<meshHash>.hbfm, reports/<reportHash>.json and
// artifacts/<artifactHash>.<ext>; put() routes raw bytes into that form or
// refuses them, so whatever put returns, get reads back. The store is a
// cache with evidence: builds are reproducible from their inputs.
// origins.jsonl remembers which chase a build or report came from, so a
// collected or damaged handle names the chase to rebuild. Writes go to a
// temp name in the same directory and rename; every read recomputes the
// object's hash through packages/project store-objects and refuses a
// mismatch with E_HANDLE (M04-T08 step 4). A stored build or a report from
// a build also appends the project graph lines it was made with to
// .hbf/graph.jsonl (M04-T09 step 6); a missing graph file is rebuilt from
// the build records and origins.jsonl before the next line lands.

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  ArtifactUri, BuildHash, BuildInputs, BuildUri, CheckResult, Hash, HbfUri, Part, ReportUri, StoreHandle,
} from "@hackbuild/spec";
import { decodeHbfm, encodeHbfm, meshHash, type MeshData } from "@hackbuild/mesh";
import { artifactHash, readEntries } from "@hackbuild/3mf";
import {
  decodeLines, encodeLines, openArtifact, openBuild, openMesh, openReport, refuseDamaged, reportFile, reportLine, sealJson,
  type MadeLine, type Opened, type StoreReader, type StoredReport,
} from "@hackbuild/project";
import { reportHash, reportHashInput, reportObject } from "@hackbuild/checks";
import { checkRecord, readSeedRows, type CheckRecord } from "./checks.js";
import { cmdError, didYouMean } from "./errors.js";
import { sha256Hex } from "@hackbuild/spec";
import { canonicalOrMissing } from "./jcs.js";

export const STORE_KINDS = ["build", "mesh", "report", "artifact"] as const;
export type StoreKind = (typeof STORE_KINDS)[number];

const DIR: Readonly<Record<StoreKind, string>> = { build: "builds", mesh: "meshes", report: "reports", artifact: "artifacts" };
const HEX = /^[0-9a-f]{1,64}$/;
const HASH = /^[0-9a-f]{64}$/;
/** The one file extension each kind is stored under; an artifact keeps its own (png, 3mf). */
const EXT: Readonly<Record<StoreKind, string | undefined>> = { build: "json", mesh: "hbfm", report: "json", artifact: undefined };
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;
const startsWith = (bytes: Uint8Array, magic: readonly number[]): boolean => magic.every((b, i) => bytes[i] === b);

/** One slot as the renderer and part.inspect show it. */
export interface SlotView {
  readonly slot: number;
  readonly material: string;
  readonly label: string;
  /** Preview colour, #rrggbb. */
  readonly colour: string;
}

/** What hbf://build/<buildHash> resolves to. */
export interface BuildRecord {
  readonly format: "hbf-build-1";
  readonly buildHash: BuildHash;
  /** Chase id (meta.id). */
  readonly chase: string;
  /** Design directory, relative to the workspace. */
  readonly target: string;
  /** Resolved params the build ran with. */
  readonly values: Readonly<Record<string, unknown>>;
  readonly inputs: BuildInputs;
  readonly part: Part;
  readonly slots: readonly SlotView[];
  /** The project graph lines this build wrote (M04-T09), kept so the graph rebuilds from the store. */
  readonly graph?: readonly MadeLine[];
}

export interface ParsedUri {
  readonly kind: StoreKind | "check";
  readonly id: string;
  /** hbf://build/<h>/part/<partId>: the part id; id is then the build hash. */
  readonly part?: string;
}

const KIND_OF_SEGMENT: Readonly<Record<string, StoreKind | "check">> = {
  build: "build", mesh: "mesh", report: "report", artifact: "artifact", check: "check",
};

/** Split an hbf:// uri; anything else is E_HANDLE. */
export function parseUri(uri: string, at = "/target"): ParsedUri {
  const m = /^hbf:\/\/([a-z-]+)\/(.+)$/.exec(uri);
  const kind = m === null ? undefined : KIND_OF_SEGMENT[m[1]!];
  if (m === null || kind === undefined) {
    throw cmdError({ code: "E_HANDLE", path: at, got: uri, expected: "hbf://build/<hash>, hbf://mesh/<hash>, hbf://report/<hash>, hbf://artifact/<hash> or hbf://check/<id>", hint: "name a store uri hbf printed, or the design directory" });
  }
  const part = kind === "build" ? /^([0-9a-f]+)\/part\/(.+)$/.exec(m[2]!) : null;
  if (part !== null) return { kind, id: part[1]!, part: part[2]! };
  return { kind, id: m[2]! };
}

/** Write to a temp name in the same directory, then rename, so a reader never sees half a file. */
function writeAtomic(file: string, bytes: Uint8Array | string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, file);
}

/** Where a stored object came from, for the rebuild hint of a collected or damaged handle. */
export interface StoreOrigin {
  readonly chase: string;
  readonly target: string;
  /** For a report: the buildHash it checked, the hash its graph link records. */
  readonly build?: string;
}

export class Store implements StoreHandle, StoreReader {
  readonly root: string;

  constructor(readonly workspace: string) {
    this.root = path.join(workspace, ".hbf", "store");
  }

  /** The stored file for a kind and hash, in that kind's file form only, so has() and get() agree. */
  private file(kind: StoreKind, id: string): string | undefined {
    if (!HEX.test(id)) return undefined;
    const dir = path.join(this.root, DIR[kind]);
    if (!existsSync(dir)) return undefined;
    const want = EXT[kind];
    const hit = readdirSync(dir).find((f) => {
      const [stem, ext, ...rest] = f.split(".");
      return stem === id && ext !== undefined && rest.length === 0 && (want === undefined ? ext !== "tmp" : ext === want);
    });
    return hit === undefined ? undefined : path.join(dir, hit);
  }

  /** The static hbf://check/<id>: the check page (M04-T02), or E_HANDLE with up to three near uris. */
  check(id: string, at = "/target"): CheckRecord {
    const rows = readSeedRows(this.workspace);
    const row = rows.get(id);
    if (row !== undefined) return checkRecord(row, this.workspace);
    throw cmdError({
      code: "E_HANDLE", path: at, got: `hbf://check/${id}`, didYouMean: didYouMean(id, [...rows.keys()]).map((k) => `hbf://check/${k}`),
      hint: "name a seeded check id such as hbf://check/CHK-PRT-01; hbf explain <id> prints the record",
    });
  }

  /** The chase a hash was built from, when origins.jsonl recorded it. */
  originOf(hash: string): string | undefined {
    const file = path.join(this.root, "origins.jsonl");
    if (!existsSync(file)) return undefined;
    for (const line of readFileSync(file, "utf8").split("\n").reverse()) {
      if (line.trim() === "") continue;
      try {
        const row = JSON.parse(line) as { hash?: string; chase?: string };
        if (row.hash === hash && typeof row.chase === "string") return row.chase;
      } catch {
        // a torn line from a killed writer; the store is a cache
      }
    }
    return undefined;
  }

  private remember(hash: string, origin: StoreOrigin): void {
    mkdirSync(this.root, { recursive: true });
    const row = { hash, chase: origin.chase, target: origin.target, ...(origin.build === undefined ? {} : { build: origin.build }) };
    appendFileSync(path.join(this.root, "origins.jsonl"), `${JSON.stringify(row)}\n`);
  }

  /** <workspace>/.hbf/graph.jsonl: append-only made lines, newest per item id (M04-T09 step 6). */
  get graphFile(): string {
    return path.join(path.dirname(this.root), "graph.jsonl");
  }

  /** The graph lines on file; when the file is missing, the lines rebuilt from the store, written back. */
  graphLines(): MadeLine[] {
    if (existsSync(this.graphFile)) return decodeLines(readFileSync(this.graphFile, "utf8"));
    const lines = this.linesFromStore();
    if (lines.length > 0) writeAtomic(this.graphFile, encodeLines(lines));
    return lines;
  }

  /** Append made lines, rebuilding a missing graph file from the store first so no older build drops out. */
  appendGraph(lines: readonly MadeLine[]): void {
    if (!existsSync(this.graphFile)) this.graphLines();
    mkdirSync(path.dirname(this.graphFile), { recursive: true });
    appendFileSync(this.graphFile, encodeLines(lines));
  }

  /**
   * Graph lines from the store in origins.jsonl order: each build record's
   * own lines, and a report line for each report whose origin names the
   * build it checked. A collected or damaged object is left out.
   */
  private linesFromStore(): MadeLine[] {
    const file = path.join(this.root, "origins.jsonl");
    if (!existsSync(file)) return [];
    const out: MadeLine[] = [];
    for (const line of readFileSync(file, "utf8").split("\n")) {
      let row: { hash?: unknown; target?: unknown; build?: unknown };
      try {
        row = JSON.parse(line) as typeof row;
      } catch {
        continue;
      }
      if (typeof row.hash !== "string" || typeof row.target !== "string") continue;
      try {
        if (this.file("build", row.hash) !== undefined) out.push(...(this.build(`hbf://build/${row.hash}`).graph ?? []));
        else if (typeof row.build === "string" && this.file("report", row.hash) !== undefined) {
          out.push(reportLine(row.target, row.hash, row.build, this.report(row.hash).checks));
        }
      } catch {
        // a damaged object is refused on read; the graph leaves it out
      }
    }
    return out;
  }

  private missing(uri: string, kind: StoreKind | "check", id: string, at: string): never {
    const chase = this.originOf(id);
    throw cmdError({
      code: "E_HANDLE", path: at, got: uri,
      ...(chase === undefined ? {} : { chase }),
      hint: chase === undefined
        ? `the store holds no ${kind} ${id}; build the design and use the uri part.build prints`
        : `the store collected ${kind} ${id}; rebuild chase ${chase}`,
    });
  }

  /** The value of an opened object, or E_HANDLE naming the chase that wrote it. */
  private checked<T>(o: Opened<T>, uri: string, id: string, at: string): T {
    return o.ok ? o.value : refuseDamaged(uri, at, o.why, this.originOf(id));
  }

  async has(uri: HbfUri): Promise<boolean> {
    const p = parseUri(uri);
    return p.kind === "check" ? readSeedRows(this.workspace).has(p.id) : this.file(p.kind, p.id) !== undefined;
  }

  async get(uri: HbfUri): Promise<unknown> {
    const p = parseUri(uri);
    if (p.kind === "build") return this.build(uri);
    if (p.kind === "mesh") return this.mesh(p.id);
    if (p.kind === "report") return this.report(p.id);
    if (p.kind === "artifact") return (await this.artifact(p.id)).bytes;
    return this.check(p.id);
  }

  /**
   * StoreHandle.put: route raw bytes into the kind's file form, or refuse
   * with E_SCHEMA. A build is a BuildRecord (hbf-build-1) stored under its
   * buildHash; a mesh is .hbfm stored under its meshHash; a report is a
   * stored report or a findings list, stored under its reportHash; an
   * artifact is a PNG under its sha256 or a 3MF under its D-052 artifactHash.
   */
  async put(kind: StoreKind, bytes: Uint8Array): Promise<HbfUri> {
    if (kind === "build") return this.putBuildRecord(parseBuildRecord(bytes));
    if (kind === "mesh") {
      let m: MeshData;
      try {
        m = decodeHbfm(bytes);
      } catch (e) {
        throw cmdError({ code: "E_SCHEMA", path: "/bytes", got: `${bytes.length} bytes`, expected: "an .hbfm mesh", hint: `put mesh takes encodeHbfm bytes; ${e instanceof Error ? e.message : String(e)}` });
      }
      return this.putMesh(m);
    }
    if (kind === "report") {
      const r = parseReport(bytes);
      return this.putReport(r.checks, r.findings);
    }
    if (startsWith(bytes, PNG_MAGIC)) return this.putArtifact(sha256Hex(bytes) as Hash, "png", bytes);
    if (startsWith(bytes, ZIP_MAGIC)) {
      let entries: Awaited<ReturnType<typeof readEntries>>;
      try {
        entries = await readEntries(bytes);
      } catch (e) {
        throw cmdError({ code: "E_SCHEMA", path: "/bytes", got: `${bytes.length} bytes`, expected: "a 3MF package", hint: `the zip does not open as a 3MF; ${e instanceof Error ? e.message : String(e)}` });
      }
      return this.putArtifact(artifactHash(entries) as unknown as Hash, "3mf", bytes);
    }
    throw cmdError({ code: "E_SCHEMA", path: "/bytes", got: `${bytes.length} bytes`, expected: "a PNG or a 3MF package", hint: "put artifact stores png and 3mf; another artifact kind names its extension through putArtifact" });
  }

  /** Write one mesh under its meshHash; returns hbf://mesh/<meshHash>. */
  putMesh(m: MeshData): HbfUri {
    const h = meshHash(m);
    writeAtomic(path.join(this.root, "meshes", `${h}.hbfm`), encodeHbfm(m));
    return `hbf://mesh/${h}` as HbfUri;
  }

  /** Write a build record under its buildHash, sealed, and record its chase in origins.jsonl. */
  private putBuildRecord(rec: BuildRecord): BuildUri {
    writeAtomic(path.join(this.root, "builds", `${rec.buildHash}.json`), sealJson(rec as unknown as Record<string, unknown>));
    this.remember(rec.buildHash, { chase: rec.chase, target: rec.target });
    if (rec.graph !== undefined) this.appendGraph(rec.graph);
    return `hbf://build/${rec.buildHash}` as BuildUri;
  }

  /** Write a build, its body meshes and the solid; returns hbf://build/<buildHash>. */
  putBuild(rec: BuildRecord, meshes: readonly MeshData[]): BuildUri {
    for (const m of meshes) this.putMesh(m);
    return this.putBuildRecord(rec);
  }

  /** Read hbf://build/<hash> after its hash checks pass, or E_HANDLE naming the chase when the store recorded it. */
  build(uri: string, at = "/target"): BuildRecord {
    const p = parseUri(uri, at);
    if (p.kind !== "build" || p.part !== undefined) {
      throw cmdError({ code: "E_HANDLE", path: at, got: uri, expected: "hbf://build/<buildHash>", hint: "pass the build uri part.build printed" });
    }
    const file = this.file("build", p.id);
    if (file === undefined || !file.endsWith(".json")) return this.missing(uri, "build", p.id, at);
    return this.checked(openBuild(p.id, readFileSync(file, "utf8")), uri, p.id, at) as unknown as BuildRecord;
  }

  /** Read hbf://mesh/<meshHash> after its meshHash recomputes. */
  mesh(hash: string, at = "/target"): MeshData {
    const uri = `hbf://mesh/${hash}`;
    const file = this.file("mesh", hash);
    if (file === undefined) return this.missing(uri, "mesh", hash, at);
    return this.checked(openMesh(hash, new Uint8Array(readFileSync(file))), uri, hash, at);
  }

  /** Read hbf://report/<reportHash> after its contentHash and reportHash recompute. */
  report(hash: string, at = "/target"): StoredReport {
    const uri = `hbf://report/${hash}`;
    const file = this.file("report", hash);
    if (file === undefined) return this.missing(uri, "report", hash, at);
    return this.checked(openReport(hash, readFileSync(file, "utf8"), (checks, findings) => reportHash(reportHashInput(checks, findings))), uri, hash, at);
  }

  /** Read hbf://artifact/<hash> after its hash recomputes; ext is the stored file's own. */
  async artifact(hash: string, at = "/target"): Promise<{ readonly ext: string; readonly bytes: Uint8Array }> {
    const uri = `hbf://artifact/${hash}`;
    const file = this.file("artifact", hash);
    if (file === undefined) return this.missing(uri, "artifact", hash, at);
    const ext = path.extname(file).slice(1);
    const bytes = this.checked(await openArtifact(hash, ext, new Uint8Array(readFileSync(file))), uri, hash, at);
    return { ext, bytes };
  }

  /**
   * Store a report under reportHash (M04-T08 step 1): `checks` maps every
   * check the run resolved to its version, skips included. The origin, when
   * given, lets a damaged report name the chase to rebuild.
   */
  putReport(checks: Readonly<Record<string, string>>, results: readonly CheckResult[], origin?: StoreOrigin): ReportUri {
    const file = canonicalOrMissing(() => reportFile(reportObject(checks, results)));
    const h = file.report.reportHash;
    writeAtomic(path.join(this.root, "reports", `${h}.json`), file.text);
    if (origin !== undefined) this.remember(h, origin);
    if (origin?.build !== undefined) this.appendGraph([reportLine(origin.target, h, origin.build, file.report.checks)]);
    return `hbf://report/${h}` as ReportUri;
  }

  /** Store an imported file's bytes under their sha256 (hbf://source/<sha256>, AGENT-SURFACE.md 7, D-050); returns the uri. */
  putSource(bytes: Uint8Array): string {
    const h = sha256Hex(bytes);
    writeAtomic(path.join(this.root, "source", h), bytes);
    return `hbf://source/${h}`;
  }

  /** The bytes of hbf://source/<sha256>; E_HANDLE when absent or when they no longer hash to the name. */
  source(uri: string, at = "/import"): Uint8Array {
    const m = /^hbf:\/\/source\/([0-9a-f]{64})$/.exec(uri);
    const file = m === null ? undefined : path.join(this.root, "source", m[1]!);
    if (file === undefined || !existsSync(file)) {
      throw cmdError({ code: "E_HANDLE", path: at, got: uri, expected: "hbf://source/<sha256> the store holds", hint: "import the file by its path; part.build stores it under hbf://source/<sha256>" });
    }
    const bytes = new Uint8Array(readFileSync(file));
    if (sha256Hex(bytes) !== m![1]) {
      throw cmdError({ code: "E_HANDLE", path: at, got: uri, expected: "bytes that hash to the uri", hint: "store object failed its hash; import the file by its path again" });
    }
    return bytes;
  }

  /** Store artifact bytes under their artifact hash. */
  putArtifact(hash: Hash, ext: string, bytes: Uint8Array): ArtifactUri {
    writeAtomic(path.join(this.root, "artifacts", `${hash}.${ext}`), bytes);
    return `hbf://artifact/${hash}` as ArtifactUri;
  }
}

function parseJson(bytes: Uint8Array, kind: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw cmdError({ code: "E_SCHEMA", path: "/bytes", got: `${bytes.length} bytes`, expected: `UTF-8 JSON of a ${kind}`, hint: `put ${kind} takes the JSON hbf writes for a ${kind}` });
  }
}

/** A BuildRecord from put bytes: format hbf-build-1 and a 64 hex buildHash, or E_SCHEMA. */
function parseBuildRecord(bytes: Uint8Array): BuildRecord {
  const v = parseJson(bytes, "build") as Partial<BuildRecord> & { contentHash?: unknown } | null;
  const o = typeof v === "object" && v !== null && !Array.isArray(v) ? v : undefined;
  if (o?.format !== "hbf-build-1") {
    throw cmdError({ code: "E_SCHEMA", path: "/format", got: String(o?.format), expected: "hbf-build-1", hint: "put build takes the record part.build stores" });
  }
  if (typeof o.buildHash !== "string" || !HASH.test(o.buildHash)) {
    throw cmdError({ code: "E_SCHEMA", path: "/buildHash", got: String(o.buildHash), expected: "64 lowercase hex", hint: "a build record carries the buildHash it is stored under" });
  }
  if (typeof o.chase !== "string" || typeof o.target !== "string" || typeof o.part !== "object" || o.part === null) {
    throw cmdError({ code: "E_SCHEMA", path: "/part", got: typeof o.part, expected: "chase, target and part fields", hint: "put build takes the record part.build stores" });
  }
  const { contentHash: _sealed, ...rec } = o;
  return rec as BuildRecord;
}

/**
 * A report from put bytes: a stored report {checks, findings}, or a bare
 * CheckResult list whose checks are the versions its own results carry.
 */
function parseReport(bytes: Uint8Array): { checks: Record<string, string>; findings: CheckResult[] } {
  const v = parseJson(bytes, "report");
  const stored = typeof v === "object" && v !== null && !Array.isArray(v) ? (v as { checks?: unknown; findings?: unknown }) : undefined;
  const list = Array.isArray(v) ? v : stored?.findings;
  if (!Array.isArray(list) || !list.every((r) => typeof r === "object" && r !== null && typeof (r as { id?: unknown }).id === "string")) {
    throw cmdError({ code: "E_SCHEMA", path: "/findings", got: Array.isArray(list) ? "a list with a row lacking id" : typeof list, expected: "a list of CheckResult", hint: "put report takes a findings list or a stored report" });
  }
  const findings = list as CheckResult[];
  const given = stored?.checks;
  const checks = typeof given === "object" && given !== null && !Array.isArray(given)
    ? (given as Record<string, string>)
    : Object.fromEntries(findings.map((r) => [r.id as string, r.version]));
  return { checks, findings };
}
