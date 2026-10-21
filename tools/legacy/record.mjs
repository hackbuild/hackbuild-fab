// Shared harness for the M07-T01 legacy record scripts (extract-nest.mjs,
// extract-plate.mjs and the two extract-plan.mjs). Each script computes a
// result object from a legacy file, asserts the numbers the M07 Records
// table states (D-153), and then either writes the record (--write) or
// compares the result with the committed record and exits 1 on any
// difference. The record carries the machine, the date, the sha256 of each
// input and the sha256 of the canonical JSON of the result.
//
// The Python twin is tools/py/legacy_record.py; both write the same record
// shape so the cards that read them (M07-T03 onward) parse one layout.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { cpus, platform, release, arch } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * The legacy folder of a design, named from a root rather than from the
 * harness file's own place, so a harness under designs/<id>/extract/ keeps
 * reading the folder when either one moves.
 */
export const legacyDir = (id, root = ROOT) => resolve(root, "designs", id, "legacy");

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Reads a legacy file and refuses it when its sha256 is not the pinned one. */
export function readPinned(path, pinned) {
  const bytes = readFileSync(path);
  const got = sha256(bytes);
  if (got !== pinned) throw new Error(`${relative(ROOT, path)} sha256 ${got}, pinned ${pinned}`);
  return bytes;
}

/**
 * 1-based line of the first line starting with `text`; throws when it is not
 * at `line`, so a moved marker fails the extraction instead of slicing the
 * wrong block.
 */
export function marker(lines, text, line) {
  const at = lines.findIndex((l) => l.startsWith(text)) + 1;
  if (at !== line) throw new Error(`marker "${text}" at line ${at}, expected ${line}`);
  return at;
}

/** Keys sorted, so the hash of a result does not depend on insertion order. */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** Collects assertion failures; the script exits 1 when any is present. */
export class Asserts {
  constructor() { this.failed = []; }
  eq(name, got, want) {
    if (canonical(got) !== canonical(want)) this.failed.push(`${name}: got ${canonical(got)}, record ${canonical(want)}`);
  }
  near(name, got, want, tol) {
    if (!(Math.abs(got - want) <= tol)) this.failed.push(`${name}: got ${got}, record ${want} (tolerance ${tol})`);
  }
  ok(name, cond, detail = "") {
    if (!cond) this.failed.push(`${name}${detail ? `: ${detail}` : ""}`);
  }
}

/** Walks two results; numbers agree within tol, everything else exactly. */
export function diff(a, b, tol = 1e-9, path = "result", out = []) {
  if (typeof a === "number" && typeof b === "number") {
    if (!(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)))) out.push(`${path}: ${a} against record ${b}`);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${path}: length ${a.length} against record ${b.length}`);
    else a.forEach((x, i) => diff(x, b[i], tol, `${path}[${i}]`, out));
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!(k in a)) out.push(`${path}.${k}: missing, record has it`);
      else if (!(k in b)) out.push(`${path}.${k}: not in the record`);
      else diff(a[k], b[k], tol, `${path}.${k}`, out);
    }
  } else if (a !== b) out.push(`${path}: ${JSON.stringify(a)} against record ${JSON.stringify(b)}`);
  return out;
}

export function machine() {
  return {
    cpu: cpus()[0]?.model ?? "unknown",
    os: `${platform()} ${release()} ${arch()}`,
    node: process.version,
  };
}

/**
 * The key a record names an input by: an archive id in the publish form of
 * tools/publish-paths.mjs (fab-knowledge:originals/...) as given, a local
 * path relative to the repository.
 */
const inputKey = (path) => (/^[a-z][\w-]*:/.test(path) ? path : relative(ROOT, path));

/**
 * Finishes a record script. `spec` holds record, card, command, qualifier,
 * inputs (archive ids or absolute paths, with their pinned sha256) and the
 * record path. Without --write each pin must be among the record's input
 * sha256, so a record written while the inputs sat in a legacy folder still
 * checks against the originals they were copied from.
 * Without --write the committed record is the golden: the result must equal
 * it, and the asserts must hold. With --write the asserts must still hold.
 */
export function finish(spec, result, asserts, argv = process.argv) {
  const write = argv.includes("--write");
  const out = resolve(ROOT, spec.out);
  const problems = [...asserts.failed];
  if (!write) {
    if (!existsSync(out)) problems.push(`${spec.out} does not exist; run with --write once the asserts hold`);
    else {
      const rec = JSON.parse(readFileSync(out, "utf8"));
      problems.push(...diff(result, rec.result, spec.tol ?? 1e-9));
      if (rec.resultSha256 !== sha256(canonical(rec.result))) problems.push(`${spec.out} resultSha256 does not match its result`);
      const recorded = new Set(Object.values(rec.inputs ?? {}));
      for (const [path, pin] of Object.entries(spec.inputs)) {
        if (!recorded.has(pin)) problems.push(`input ${inputKey(path)}: pinned ${pin}, in no input of the record`);
      }
    }
  }
  if (problems.length) {
    for (const p of problems) process.stderr.write(`FAIL ${p}\n`);
    process.exit(1);
  }
  if (write) {
    const rec = {
      record: spec.record,
      card: spec.card ?? "M07-T01",
      date: new Date().toISOString().slice(0, 10),
      qualifier: spec.qualifier,
      command: spec.command,
      machine: machine(),
      inputs: Object.fromEntries(Object.entries(spec.inputs).map(([p, s]) => [inputKey(p), s])),
      resultSha256: sha256(canonical(result)),
      result,
    };
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(rec, null, 1)}\n`);
    process.stdout.write(`wrote ${spec.out}\n`);
  }
}
