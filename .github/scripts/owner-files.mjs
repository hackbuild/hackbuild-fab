// The vitest files that read the owner's originals or benches, derived from
// their source, never typed (AUDIT-2026-10-11 section 5 item 3, option 2).
// A hosted runner has neither, so ci.yml excludes these files and prints
// them as not run; the owner-files job runs exactly this list on the
// owner's self-hosted runner with HBF_ORIGINALS set.
//
// A test file is an owner file when it, or a relative module it imports
// one level down (a fixture), does one of these:
//   - imports originalPath, originalsRoot or localOriginal from
//     tools/test-support/originals-root (the never-skip originals reader;
//     ORIGINALS_OF_RECORD alone is an identity string and reads nothing)
//   - imports tools/test-support/benches-root (the HBF_BENCHES reader)
//   - names a path under fab-work-directory/ (a bench read by absolute
//     path that has not moved behind HBF_BENCHES yet)
//
// Usage:
//   node .github/scripts/owner-files.mjs list       repo-relative paths, one per line
//   node .github/scripts/owner-files.mjs excludes   one --exclude=<absolute path> per line
//   node .github/scripts/owner-files.mjs report     the not-run line and the list
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The vitest include roots of vitest.config.ts. */
export const TEST_FILE = /^(spec\/test|tools\/test|tools\/test-support|tools\/parity|packages\/[^/]+\/test|reference\/.+\/test|designs\/.+\/test|core\/test)\/.+\.test\.ts$/;

const ORIGINALS_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["'][./]*tools\/test-support\/originals-root(?:\.js|\.ts)?["']/g;
const READERS = new Set(["originalPath", "originalsRoot", "localOriginal"]);
const BENCHES_IMPORT = /from\s*["'][./]*tools\/test-support\/benches-root(?:\.js|\.ts)?["']/;
const BENCH_PATH = /fab-work-directory\//;
const RELATIVE_IMPORT = /from\s*["'](\.{1,2}\/[^"']+)["']/g;

/** The text without block comments and line comments, so a cited source is not a read. */
export const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/** Why a source text reads owner files, or null. */
export function ownerSignal(text) {
  for (const m of text.matchAll(ORIGINALS_IMPORT)) {
    const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    const hit = names.find((n) => READERS.has(n));
    if (hit) return `imports ${hit} from originals-root`;
  }
  if (BENCHES_IMPORT.test(text)) return "imports benches-root";
  if (BENCH_PATH.test(stripComments(text))) return "names a fab-work-directory path";
  return null;
}

/** The local file a relative import names, trying the .ts source for a .js specifier. */
function resolveImport(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const p of [base, base.replace(/\.js$/, ".ts"), `${base}.ts`, base.replace(/\.mjs$/, ".mts")]) {
    if (existsSync(p) && /\.(ts|mts|mjs|js)$/.test(p)) return p;
  }
  return null;
}

/** Owner signal of a test file, looking one relative import down. */
export function fileSignal(abs, read = (p) => readFileSync(p, "utf8")) {
  const text = read(abs);
  const own = ownerSignal(text);
  if (own) return own;
  for (const m of text.matchAll(RELATIVE_IMPORT)) {
    const dep = resolveImport(abs, m[1]);
    if (dep === null || dep.includes("/src/") || dep.includes("/dist/")) continue;
    const sig = ownerSignal(read(dep));
    if (sig) return `${sig} (via ${relative(dirname(abs), dep)})`;
  }
  return null;
}

/** Every owner test file in the tracked tree, sorted, with its reason. */
export function ownerFiles(root = ROOT) {
  const tracked = execFileSync("git", ["ls-files", "--cached", "--", "*.test.ts"], { cwd: root, encoding: "utf8" }).split("\n").filter((f) => TEST_FILE.test(f));
  const out = [];
  for (const f of tracked) {
    const abs = join(root, f);
    if (!existsSync(abs)) continue;
    const why = fileSignal(abs);
    if (why) out.push({ file: f, why });
  }
  return out.sort((a, b) => (a.file < b.file ? -1 : 1));
}

function main(cmd) {
  const files = ownerFiles();
  if (cmd === "list") {
    for (const { file } of files) console.log(file);
    return;
  }
  if (cmd === "excludes") {
    // absolute, so one set of flags holds for every workspace's vitest root
    for (const { file } of files) console.log(`--exclude=${join(ROOT, file)}`);
    return;
  }
  if (cmd === "report") {
    const lines = [`not run in ci: ${files.length} test files read the owner's originals or benches; the owner-files job runs them on the owner's runner`];
    for (const { file, why } of files) lines.push(`  ${file}: ${why}`);
    console.log(lines.join("\n"));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
    return;
  }
  console.error("usage: owner-files.mjs list | excludes | report");
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv[2]);
