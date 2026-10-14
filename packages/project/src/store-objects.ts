// Store objects and their integrity (M04-T08 steps 2 and 4, D-050, D-051,
// ARCHITECTURE.md 6 and 8). Pure: bytes in, bytes or a verdict out; the file
// I/O and the atomic rename stay with the store in core. A JSON object
// (a build record, a report) is written as its RFC 8785 form plus
// contentHash, sha256 over the form without that field, so a flipped byte
// anywhere in the file is caught; it also has to answer to the hash it is
// filed under (buildHash over its inputs, reportHash over its checks and
// findings). A mesh answers to its meshHash at the 1/1024 mm grid (D-054,
// D-175), so a change below the grid is the same mesh by definition. An
// artifact answers to sha256 (png) or the D-052 artifactHash (3mf).

import { canonicalize, commandError, sha256Hex, type CheckResult, type CommandError, type HbfUri } from "@hackbuild/spec";
import { decodeHbfm, meshHash, type MeshData } from "@hackbuild/mesh";
import { artifactHash, readEntries } from "@hackbuild/3mf";

/** The field a sealed JSON store object carries its own hash in. */
export const CONTENT_HASH_FIELD = "contentHash";
/** The file form of a stored report. */
export const REPORT_FORMAT = "hbf-report-1";

/**
 * A stored report: the run's resolved check versions, its sorted results and
 * the reportHash over them, under its format tag. reportHash is defined in
 * packages/checks (report-hash.ts); this tier takes it as a function, since
 * tier 2 imports only spec, tier 0 and tier 1 (tools/tiers.json).
 */
export interface StoredReport {
  readonly format: typeof REPORT_FORMAT;
  readonly checks: Readonly<Record<string, string>>;
  readonly findings: readonly CheckResult[];
  readonly reportHash: string;
}

/** reportHash over a report's checks and findings. */
export type ReportHasher = (checks: Readonly<Record<string, string>>, findings: readonly CheckResult[]) => string;

/** The outcome of reading a store object back: its value, or why it failed its hash. */
export type Opened<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly why: string };

const fail = (why: string): { readonly ok: false; readonly why: string } => ({ ok: false, why });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** File text of a JSON store object: canonical JSON with contentHash over the body, then a newline. */
export function sealJson(body: Readonly<Record<string, unknown>>): string {
  if (CONTENT_HASH_FIELD in body) throw new TypeError(`a store object carries its own ${CONTENT_HASH_FIELD}; pass the body without it`);
  return `${canonicalize({ ...body, [CONTENT_HASH_FIELD]: sha256Hex(canonicalize(body)) })}\n`;
}

/** Parse sealed text and recompute contentHash; the body comes back without the field. */
export function openJson(text: string): Opened<Record<string, unknown>> {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return fail("the file does not parse as JSON");
  }
  if (!isRecord(v)) return fail("the file holds no JSON object");
  const { [CONTENT_HASH_FIELD]: sealed, ...body } = v;
  if (typeof sealed !== "string") return fail(`the object carries no ${CONTENT_HASH_FIELD}`);
  let again: string;
  try {
    again = sha256Hex(canonicalize(body));
  } catch {
    return fail("the object holds a value canonical JSON has no form for");
  }
  return again === sealed ? { ok: true, value: body } : fail(`${CONTENT_HASH_FIELD} ${sealed.slice(0, 6)} on file, ${again.slice(0, 6)} recomputed`);
}

/** File text of a report object, sealed under its format tag. */
export function reportFile(report: Omit<StoredReport, "format">): { readonly report: StoredReport; readonly text: string } {
  const stored: StoredReport = { format: REPORT_FORMAT, checks: report.checks, findings: report.findings, reportHash: report.reportHash };
  return { report: stored, text: sealJson(stored as unknown as Record<string, unknown>) };
}

/** A stored report read back: sealed, filed under `id`, and its reportHash recomputed from its checks and findings. */
export function openReport(id: string, text: string, rehash: ReportHasher): Opened<StoredReport> {
  const o = openJson(text);
  if (!o.ok) return o;
  const r = o.value as Partial<StoredReport>;
  if (r.format !== REPORT_FORMAT || !isRecord(r.checks) || !Array.isArray(r.findings)) return fail(`the object is no ${REPORT_FORMAT} report`);
  if (r.reportHash !== id) return fail(`reportHash ${String(r.reportHash).slice(0, 6)} filed under ${id.slice(0, 6)}`);
  const again = rehash(r.checks as Record<string, string>, r.findings);
  return again === id ? { ok: true, value: r as StoredReport } : fail(`reportHash ${id.slice(0, 6)} on file, ${again.slice(0, 6)} recomputed`);
}

/** A stored build record read back: sealed, filed under `id`, and its buildHash recomputed over its inputs (D-051). */
export function openBuild(id: string, text: string): Opened<Record<string, unknown>> {
  const o = openJson(text);
  if (!o.ok) return o;
  const b = o.value;
  if (b["buildHash"] !== id) return fail(`buildHash ${String(b["buildHash"]).slice(0, 6)} filed under ${id.slice(0, 6)}`);
  let again: string;
  try {
    again = sha256Hex(canonicalize(b["inputs"] ?? null));
  } catch {
    return fail("the inputs hold a value canonical JSON has no form for");
  }
  return again === id ? o : fail(`buildHash ${id.slice(0, 6)} on file, ${again.slice(0, 6)} recomputed over its inputs`);
}

/** A stored mesh read back: decoded and its meshHash recomputed. */
export function openMesh(id: string, bytes: Uint8Array): Opened<MeshData> {
  let m: MeshData;
  try {
    m = decodeHbfm(bytes);
  } catch (e) {
    return fail(`the file does not decode as .hbfm: ${e instanceof Error ? e.message : String(e)}`);
  }
  const again = meshHash(m);
  return again === id ? { ok: true, value: m } : fail(`meshHash ${id.slice(0, 6)} on file, ${again.slice(0, 6)} recomputed`);
}

/** A stored artifact read back: sha256 for a png, the D-052 artifactHash over the entries for a 3mf. */
export async function openArtifact(id: string, ext: string, bytes: Uint8Array): Promise<Opened<Uint8Array>> {
  let again: string;
  if (ext === "3mf") {
    try {
      again = artifactHash(await readEntries(bytes)) as unknown as string;
    } catch (e) {
      return fail(`the package does not open: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else again = sha256Hex(bytes);
  return again === id ? { ok: true, value: bytes } : fail(`hash ${id.slice(0, 6)} on file, ${again.slice(0, 6)} recomputed`);
}

/** E_HANDLE for an object that failed its hash: the store refuses it instead of reading it. */
export function damaged(uri: HbfUri | string, at: string, why: string, chase: string | undefined): CommandError {
  return {
    code: "E_HANDLE", path: at, got: uri, expected: why,
    ...(chase === undefined ? {} : { chase }),
    hint: `store object failed its hash; rebuild ${chase ?? "the design that wrote it"}`,
  };
}

/** Throw damaged() as a CommandError. */
export function refuseDamaged(uri: HbfUri | string, at: string, why: string, chase: string | undefined): never {
  throw commandError(damaged(uri, at, why, chase));
}
