// The benches under BenchHook conformance (M09-T12, D-128). Derived, never
// typed: every dist/bench/*.html the bake wrote, every dist/legacy/*.html,
// every HTML page under designs/*/legacy/ at any depth (M10-T01) whose
// bytes an adapter names or whose source installs BENCH, and every page an
// adapter declares as a stored zip member (LegacyAdapter.archive). A page that
// installs BENCH but has no adapter, or whose bytes are not the ones its
// adapter was written against, is listed with a problem so the suite fails
// on it. A page listed in ARCHIVED, or one without BENCH and without an
// adapter, is listed as not a bench, which the report carries as not run.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findManifests } from "../bake/bake.mjs";
import { ADAPTERS, ARCHIVED, type LegacyId } from "./legacy-adapters.ts";
import { readStored } from "../legacy/stored-zip.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Where a fab bench takes its drive targets from (spec/bench.ts DriveDecl.targets). */
export interface FabDrive {
  targets: string;
  gesture: string;
}

export interface BenchUnderTest {
  /** Report key: the design id for a legacy page, `<id> (dist/<dir>)` for a bake. */
  name: string;
  /** Path relative to the repo root. */
  rel: string;
  file: string;
  origin: "fab" | "legacy";
  sha256: string;
  adapter: LegacyId | null;
  /** Declared export kinds: chase.ts exports for a fab bake, the adapter list for a legacy page. */
  exports: readonly string[];
  /** Fab drive declaration, null when the bench declares none. */
  drive: FabDrive | null;
  /** Set when the bench cannot be tested as listed; the suite fails with this text. */
  problem: string | null;
  /** The page source assigns globalThis.BENCH or window.BENCH; false for a page an adapter reads through other globals. */
  installsBench: boolean;
}

export interface NotABench {
  rel: string;
  reason: string;
}

const sha256 = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");

const htmlIn = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".html")).sort().map((f) => path.join(dir, f)) : [];

/** The source line every hook-carrying legacy page holds (PIP part2.js, TOGGLE part4.js, KNUCKLE part2.js, BOSS `window.BENCH =`). */
const INSTALLS_BENCH = /(?:globalThis|window)\.BENCH\s*=/;

/** Every .html under dir at any depth, node_modules left out, sorted by path. */
const htmlDeep = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(".html") && !f.split(path.sep).includes("node_modules"))
        .sort()
        .map((f) => path.join(dir, f))
    : [];

function legacyEntry(root: string, file: string, name: string): BenchUnderTest {
  const buf = readFileSync(file);
  const sha = sha256(buf);
  const rel = path.relative(root, file);
  const byHash = Object.values(ADAPTERS).find((a) => a.sha256 === sha);
  const base = { name, rel, file, origin: "legacy" as const, sha256: sha, drive: null, installsBench: INSTALLS_BENCH.test(buf.toString("utf8")) };
  if (byHash) return { ...base, adapter: byHash.id, exports: byHash.exports, problem: null };
  const design = rel.split(path.sep)[1] ?? "";
  const named = (ADAPTERS as Readonly<Record<string, (typeof ADAPTERS)[LegacyId]>>)[design];
  const problem = named
    ? `${named.id}: adapter written against ${named.sha256}, file is ${sha}`
    : `no adapter for ${rel}`;
  return { ...base, adapter: null, exports: [], problem };
}

interface ManifestLite {
  id?: unknown;
  shell?: unknown;
  out?: unknown;
}

/** The bake.json that wrote dist/<out>/<id>.html, found the way `bake.mjs --all` finds them. */
function manifestFor(root: string, rel: string): string | null {
  const [, dir, file] = rel.split(path.sep);
  for (const m of findManifests(root)) {
    const j = JSON.parse(readFileSync(m, "utf8")) as ManifestLite;
    const out = typeof j.out === "string" ? j.out : j.shell === "ui" ? "bench" : "legacy";
    if (`${String(j.id)}.html` === file && out === dir) return m;
  }
  return null;
}

/** chase.exports kinds and bench.views.drive, read from the files beside the manifest. */
async function fabDeclarations(manifest: string): Promise<{ exports: string[]; drive: FabDrive | null }> {
  const dir = path.dirname(manifest);
  const chaseMod = (await import(path.join(dir, "chase.ts"))) as { chase?: { exports?: readonly { kind: string }[] } };
  const exports = (chaseMod.chase?.exports ?? []).map((e) => e.kind);
  let drive: FabDrive | null = null;
  const benchFile = path.join(dir, "bench.ts");
  if (existsSync(benchFile)) {
    const benchMod = (await import(benchFile)) as { bench?: { views?: { drive?: FabDrive } } };
    drive = benchMod.bench?.views?.drive ?? null;
  }
  return { exports, drive };
}

async function fabEntry(root: string, file: string): Promise<BenchUnderTest> {
  const rel = path.relative(root, file);
  const id = path.basename(file, ".html");
  const base = { name: `${id} (dist/bench)`, rel, file, origin: "fab" as const, sha256: sha256(readFileSync(file)), adapter: null, installsBench: true };
  const manifest = manifestFor(root, rel);
  if (!manifest) return { ...base, exports: [], drive: null, problem: `no bake.json writes ${rel}` };
  const { exports, drive } = await fabDeclarations(manifest);
  const problem = exports.length === 0 ? `${path.relative(root, path.dirname(manifest))}/chase.ts declares no exports` : null;
  return { ...base, exports, drive, problem };
}

/** Where pages kept as stored zip members are extracted for the suite; outside out/hook, which the global setup clears. */
export const ARCHIVE_PAGES = "out/legacy-pages";

/**
 * Every adapter page kept in a stored zip (LegacyAdapter.archive), extracted
 * under ARCHIVE_PAGES. A member whose bytes differ from the adapter's
 * sha256 is listed with a problem, so the suite fails on it.
 */
function archivedEntries(root: string): BenchUnderTest[] {
  const out: BenchUnderTest[] = [];
  for (const a of Object.values(ADAPTERS)) {
    if (!a.archive) continue;
    const zip = path.join(root, a.archive.zip);
    const design = a.archive.zip.split("/")[1] ?? a.id;
    const rel = `${a.archive.zip}!${a.archive.member}`;
    const name = `${design}/${path.basename(a.archive.zip)}`;
    const base = { name, rel, origin: "legacy" as const, drive: null, installsBench: false };
    if (!existsSync(zip)) {
      out.push({ ...base, file: zip, sha256: "", adapter: null, exports: [], problem: `${a.id}: ${a.archive.zip} missing` });
      continue;
    }
    const data = readStored(readFileSync(zip)).get(a.archive.member);
    if (!data) {
      out.push({ ...base, file: zip, sha256: "", adapter: null, exports: [], problem: `${a.id}: ${rel} missing` });
      continue;
    }
    const sha = sha256(Buffer.from(data));
    const file = path.join(root, ARCHIVE_PAGES, a.id, a.archive.member);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, data);
    const problem = sha === a.sha256 ? null : `${a.id}: adapter written against ${a.sha256}, ${rel} is ${sha}`;
    out.push({ ...base, file, sha256: sha, adapter: problem ? null : a.id, exports: problem ? [] : a.exports, problem });
  }
  return out;
}

export interface Corpus {
  benches: BenchUnderTest[];
  skipped: NotABench[];
}

export async function listBenches(root: string = ROOT): Promise<Corpus> {
  const benches: BenchUnderTest[] = [];
  const skipped: NotABench[] = [];
  for (const file of htmlIn(path.join(root, "dist/bench"))) benches.push(await fabEntry(root, file));
  for (const file of htmlIn(path.join(root, "dist/legacy"))) {
    benches.push(legacyEntry(root, file, `${path.basename(file, ".html")} (dist/legacy)`));
  }
  const designs = path.join(root, "designs");
  for (const d of existsSync(designs) ? readdirSync(designs).sort() : []) {
    const legacy = path.join(designs, d, "legacy");
    const pages: string[] = [];
    for (const file of htmlDeep(legacy)) {
      const rel = path.relative(root, file);
      const buf = readFileSync(file);
      const sha = sha256(buf);
      const archived = ARCHIVED[sha];
      if (archived !== undefined) {
        skipped.push({ rel, reason: archived });
        continue;
      }
      if (!Object.values(ADAPTERS).some((a) => a.sha256 === sha) && !INSTALLS_BENCH.test(buf.toString("utf8"))) {
        skipped.push({ rel, reason: "no BENCH in the page source and no adapter for its sha256; it predates the hook (D-128)" });
        continue;
      }
      pages.push(file);
    }
    // The report name is the design id for a lone page or for legacy/<id>.html (M09 names pip, toggle, ...); any other page is named by its path in legacy/.
    for (const file of pages) {
      const inLegacy = path.relative(legacy, file);
      benches.push(legacyEntry(root, file, pages.length === 1 || inLegacy === `${d}.html` ? d : `${d}/${inLegacy}`));
    }
  }
  benches.push(...archivedEntries(root));
  return { benches, skipped };
}
