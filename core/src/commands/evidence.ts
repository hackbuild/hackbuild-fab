// hbf evidence add and list (R1-engine-26, plan v9 section 3.1): a slicer
// save, a reading, a photo or a note attached to one claim of a design.
// A design is designs/<id> or a reference, reference/<area>/<id>, each with
// a chase.ts. add appends one row to <dir>/evidence/evidence.jsonl and copies
// a file under evidence/files/ named by its sha256; it never rewrites a row,
// never touches profile and never commits. CHK-CLAIM-01 reads the rows
// (packages/checks claims/evidence.ts), the same way for both homes. The row
// says who added it: person when the add ran at a terminal, agent otherwise;
// a coupon result an agent relays is recorded as the agent's.

import { hasDesignFile, readDesignDir } from "../design-file.js";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { readChaseSource } from "@hackbuild/chase";
import {
  EVIDENCE_DIRECTIONS, EVIDENCE_KINDS, EVIDENCE_UNITS, convertUnit, parseEvidence,
  type EvidenceDirection, type EvidenceKind, type EvidenceRow,
} from "@hackbuild/checks";
import { sha256Hex, type ClaimDecl } from "@hackbuild/spec";
import { cmdError, didYouMean } from "../errors.js";
import { designDirs } from "../artifact-rebuild.js";
import { workspaceRoot } from "./build.js";

export interface EvidenceAddIn {
  /** A design or reference directory name, area/id of a reference, or a path to the directory. */
  readonly design: string;
  readonly claim: string;
  readonly value?: number;
  readonly unit?: string;
  readonly note?: string;
  readonly direction?: string;
  readonly file?: string;
  readonly kind?: string;
}

export interface EvidenceAddOut {
  /** The design directory, designs/<id> or reference/<area>/<id>, relative to the workspace root. */
  readonly design: string;
  /** The jsonl the row was appended to, same base. */
  readonly log: string;
  readonly row: EvidenceRow;
}

export interface EvidenceListOut {
  readonly design: string;
  readonly rows: readonly EvidenceRow[];
}

const LOG = path.join("evidence", "evidence.jsonl");
const PHOTO = new Set([".png", ".jpg", ".jpeg", ".heic", ".webp"]);
const SLICER = new Set([".3mf", ".gcode", ".bgcode"]);

/** designs/<id> or reference/<area>/<id> when dir holds a chase.ts, else null. */
function labelOf(dir: string): string | null {
  if (!hasDesignFile(dir)) return null;
  const parent = path.dirname(dir);
  if (path.basename(parent) === "designs") return `designs/${path.basename(dir)}`;
  if (path.basename(path.dirname(parent)) === "reference") return `reference/${path.basename(parent)}/${path.basename(dir)}`;
  return null;
}

/** Subdirectories of dir, sorted; empty when dir is not readable. */
function subdirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

/**
 * The design directory an argument names. A path (it has a separator) is
 * cwd-relative, or relative to a directory above cwd, with reference/
 * optional in front of area/id. A bare id is searched from cwd upward in
 * designs/<id> and reference/<area>/<id>; an id found in more than one
 * place is refused, since the row would land in whichever came first.
 */
export function evidenceDesign(arg: string, cwd: string): { readonly dir: string; readonly label: string } {
  const here = path.resolve(cwd);
  const found: { dir: string; label: string }[] = [];
  const push = (dir: string): void => {
    const label = labelOf(dir);
    if (label !== null && !found.some((f) => f.label === label)) found.push({ dir, label });
  };
  if (arg.includes("/") || arg.includes(path.sep)) {
    push(path.resolve(here, arg));
    if (found.length === 0 && !path.isAbsolute(arg)) {
      for (let d = here; ; d = path.dirname(d)) {
        push(path.join(d, arg));
        push(path.join(d, "reference", arg));
        if (found.length > 0 || path.dirname(d) === d) break;
      }
    }
  } else {
    for (let d = here; ; d = path.dirname(d)) {
      push(path.join(d, "designs", arg));
      for (const area of subdirs(path.join(d, "reference"))) push(path.join(d, "reference", area, arg));
      if (found.length > 0 || path.dirname(d) === d) break;
    }
  }
  if (found.length === 1) return found[0]!;
  if (found.length > 1) {
    const labels = found.map((f) => f.label);
    throw cmdError({
      code: "E_REF", path: "/design", got: arg, expected: `one design, not ${labels.join(" and ")}`, didYouMean: labels,
      hint: "the id names more than one design; give the path, for example reference/keys/flex-pair",
    });
  }
  let labels: string[] = [];
  try {
    labels = designDirs(workspaceRoot(cwd));
  } catch {
    labels = [];
  }
  const pathLike = arg.includes("/") || arg.includes(path.sep);
  throw cmdError({
    code: "E_REF", path: "/design", got: arg, expected: "a design under designs/ or a reference under reference/<area>/, with a chase.ts",
    didYouMean: didYouMean(arg, pathLike ? labels : labels.map((l) => path.posix.basename(l))),
    hint: "evidence attaches to designs/<id> or reference/<area>/<id>; name one by id or path, or adopt or scaffold one first",
  });
}

function claimsOf(dir: string, label: string): readonly ClaimDecl[] {
  const read = readDesignDir(dir, label);
  return (read.chase as { claims?: readonly ClaimDecl[] }).claims ?? [];
}

function pick<T extends string>(v: string | undefined, of: readonly T[], at: string): T | undefined {
  if (v === undefined) return undefined;
  if (!(of as readonly string[]).includes(v)) throw cmdError({ code: "E_SCHEMA", path: at, got: v, expected: of.join(", "), didYouMean: didYouMean(v, of), hint: `pick one of ${of.join(", ")}` });
  return v as T;
}

/** Append one evidence row; who is person when both gate streams are terminals. */
export function evidenceAdd(input: EvidenceAddIn, cwd: string, atTerminal: boolean, now: Date = new Date()): EvidenceAddOut {
  const forms = [input.value !== undefined, input.note !== undefined, input.file !== undefined].filter(Boolean).length;
  if (forms !== 1) {
    throw cmdError({ code: "E_SCHEMA", path: "/", expected: "one of --value with --unit, --note, --file", hint: "give one reading, one note or one file per add" });
  }
  const { dir, label } = evidenceDesign(input.design, cwd);
  const claims = claimsOf(dir, label);
  const decl = claims.find((c) => c.id === input.claim);
  if (decl === undefined) {
    const ids = claims.map((c) => c.id);
    throw cmdError({
      code: "E_REF", path: "/claim", got: input.claim, expected: ids.length === 0 ? "a claim the chase declares" : ids.join(", "), didYouMean: didYouMean(input.claim, ids),
      hint: ids.length === 0 ? `${label}/chase.ts declares no claims; add one with chase.patch first` : `name a claim ${label}/chase.ts declares`,
    });
  }
  const direction = pick<EvidenceDirection>(input.direction, EVIDENCE_DIRECTIONS, "/direction");
  if (direction !== undefined && input.note === undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/direction", got: direction, expected: "a --note beside it", hint: "a direction rides on a note; say what you felt with --note" });
  }
  let kind = pick<EvidenceKind>(input.kind, EVIDENCE_KINDS, "/kind");
  let reading: { value: number; unit: string } | undefined;
  let file: { sha256: string; path: string } | undefined;
  if (input.value !== undefined) {
    if (!Number.isFinite(input.value)) throw cmdError({ code: "E_SCHEMA", path: "/value", got: String(input.value), expected: "a finite number", hint: "give the reading as a number" });
    if (input.unit === undefined) throw cmdError({ code: "E_PARAM_MISSING", path: "/unit", hint: `give the reading's unit with --unit, one of ${Object.keys(EVIDENCE_UNITS).join(", ")}` });
    convertUnit(input.value, input.unit, decl.want.unit);
    reading = { value: input.value, unit: input.unit };
    kind ??= EVIDENCE_UNITS[input.unit]!.dim === "length" ? "caliper" : "coupon";
    if (kind === "note" || kind === "photo" || kind === "slicer-save") {
      throw cmdError({ code: "E_SCHEMA", path: "/kind", got: kind, expected: "caliper or coupon", hint: "a reading is a caliper or coupon value; attach files with --file" });
    }
  } else if (input.note !== undefined) {
    if (input.note.trim() === "") throw cmdError({ code: "E_SCHEMA", path: "/note", got: input.note, expected: "a non-empty note", hint: "say what you saw or felt" });
    if (kind !== undefined && kind !== "note") throw cmdError({ code: "E_SCHEMA", path: "/kind", got: kind, expected: "note", hint: "a note is kind note" });
    kind = "note";
  } else {
    const src = path.resolve(cwd, input.file!);
    if (!existsSync(src)) throw cmdError({ code: "E_REF", path: "/file", got: input.file, hint: "no file at that path; give the path of the save or photo" });
    const bytes = readFileSync(src);
    const ext = path.extname(src).toLowerCase();
    kind ??= PHOTO.has(ext) ? "photo" : SLICER.has(ext) ? "slicer-save" : undefined;
    if (kind === undefined) throw cmdError({ code: "E_SCHEMA", path: "/kind", got: ext, expected: EVIDENCE_KINDS.join(", "), hint: `no kind for ${ext} files; give one with --kind` });
    const hash = sha256Hex(bytes);
    const stored = path.posix.join("evidence", "files", `${hash}${ext}`);
    mkdirSync(path.join(dir, "evidence", "files"), { recursive: true });
    if (!existsSync(path.join(dir, stored))) copyFileSync(src, path.join(dir, stored));
    file = { sha256: hash, path: stored };
  }
  const body = {
    claim: decl.id, kind,
    ...(reading ?? {}),
    qualifier: reading === undefined ? "none" as const : "measured" as const,
    ...(input.note === undefined ? {} : { note: input.note }),
    ...(direction === undefined ? {} : { direction }),
    ...(file === undefined ? {} : { file }),
    at: now.toISOString(),
    who: atTerminal ? "person" as const : "agent" as const,
  };
  const row: EvidenceRow = { id: sha256Hex(JSON.stringify(body)).slice(0, 12), ...body };
  const log = path.join(dir, LOG);
  mkdirSync(path.dirname(log), { recursive: true });
  appendFileSync(log, `${JSON.stringify(row)}\n`);
  return { design: label, log: `${label}/${LOG.split(path.sep).join("/")}`, row };
}

/** Every row of a design's evidence log, optionally one claim's. */
export function evidenceList(design: string, cwd: string, claim?: string): EvidenceListOut {
  const { dir, label } = evidenceDesign(design, cwd);
  const log = path.join(dir, LOG);
  const rows = existsSync(log) ? parseEvidence(readFileSync(log, "utf8"), `${label}/${LOG}`) : [];
  return { design: label, rows: claim === undefined ? rows : rows.filter((r) => r.claim === claim) };
}

/** One line per row for the text mirror; every number carries its qualifier. */
export function renderEvidenceRow(r: EvidenceRow): string {
  const what = r.value !== undefined
    ? `${r.value} ${r.unit} measured`
    : r.file !== undefined ? `${r.file.path} sha256 ${r.file.sha256}` : `"${r.note ?? ""}"${r.direction === undefined ? "" : ` reads ${r.direction}`}`;
  return `${r.id}  ${r.claim.padEnd(14)} ${r.kind.padEnd(11)} ${what}  ${r.who} ${r.at}`;
}
