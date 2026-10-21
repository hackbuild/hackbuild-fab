// The vitest files that read the owner's originals or benches, derived from
// their source, never typed (AUDIT-2026-10-11 section 5 item 3, option 2).
// A hosted runner has neither, so ci.yml excludes these files and prints
// them as not run; the owner-files job runs exactly this list on the
// owner's self-hosted runner with HBF_ORIGINALS set.
//
// A test file is an owner file when it, or a relative module it imports
// one level down (a fixture), does one of these:
//   - imports originalPath, originalsRoot, localOriginal or localSource
//     from tools/test-support/originals-root (the never-skip readers;
//     ORIGINALS_OF_RECORD alone is an identity string and reads nothing)
//   - imports tools/test-support/benches-root (the HBF_BENCHES reader)
//   - names a path under fab-work-directory/ (a bench read by absolute
//     path that has not moved behind HBF_BENCHES yet)
//   - passes an owner path to a file read: a lineage.json row source, a
//     literal under /Users/, or a name bound to either, read without
//     localOriginal or localSource (a hosted runner fails such a read
//     with ENOENT)
//
// A read whose path the file also tests with existsSync (a skip or skipIf
// on it) is guarded: the hosted runner takes the skip, so the file stays
// in the hosted runs and is also listed for the owner runner. Every other
// owner file is excluded from the hosted runs.
//
// Usage:
//   node .github/scripts/owner-files.mjs list       repo-relative paths, one per line
//   node .github/scripts/owner-files.mjs excludes   one --exclude=<absolute path> per line, unguarded files only
//   node .github/scripts/owner-files.mjs report     the not-run line and the list
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The vitest include roots of vitest.config.ts. */
export const TEST_FILE = /^(spec\/test|tools\/test|tools\/test-support|tools\/parity|packages\/[^/]+\/test|reference\/.+\/test|designs\/.+\/test|core\/test|kernel\/test)\/.+\.test\.ts$/;

const ORIGINALS_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["'][./]*tools\/test-support\/originals-root(?:\.js|\.ts)?["']/g;
const READERS = new Set(["originalPath", "originalsRoot", "localOriginal", "localSource"]);
const BENCHES_IMPORT = /from\s*["'][./]*tools\/test-support\/benches-root(?:\.js|\.ts)?["']/;
const BENCH_PATH = /fab-work-directory\//;
const RELATIVE_IMPORT = /from\s*["'](\.{1,2}\/[^"']+)["']/g;

/** The text without block comments and line comments, so a cited source is not a read. */
export const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

const READ_CALL = String.raw`\b(?:readFileSync|readFile|createReadStream|openSync|statSync|readdirSync)`;
const BINDING = /^([ \t]*)(?:export\s+)?(?:const|let|var|function)\s+([\w$]+)\s*(?::[^=\n]*)?=?\s*([^;\n]*)/gm;
const OWNER_LITERAL = /^["'`]\/Users\//;
const RELOCATE = /\b(?:localOriginal|localSource|originalPath)\(/;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Each binding with its initializer; a block body runs to the brace at the binding's indent. */
function bindings(code) {
  const out = [];
  for (const m of code.matchAll(BINDING)) {
    const [, indent, name, head] = m;
    let init = head;
    if (head.trimEnd().endsWith("{")) {
      const from = m.index + m[0].length;
      const close = code.indexOf(`\n${indent}}`, from);
      init = head + code.slice(from, close === -1 ? code.length : close);
    }
    out.push({ name, init });
  }
  return out;
}

/** The first argument of every call to one of the names, as written, with its offset. */
function firstArgs(code, callee) {
  const out = [];
  for (const m of code.matchAll(new RegExp(`(?:^|[^\\w$.])(?:${callee})\\(\\s*((?:[^,()]|\\([^()]*\\))*)`, "g"))) out.push({ arg: m[1].trim(), at: m.index });
  return out;
}

/**
 * Owner paths the code passes to a file read: a lineage.json row source, a
 * literal under /Users/, or a name bound to either, read directly or through
 * a local function that reads its first parameter. localOriginal, localSource and
 * originalPath relocate a path, so nothing through them is an owner path.
 * Returns each read argument with whether an existsSync on it guards it.
 */
export function ownerReads(text) {
  const code = stripComments(text);
  const lineage = /lineage\.json/.test(code);
  const names = new Set();
  const isOwner = (expr) =>
    !RELOCATE.test(expr) &&
    (OWNER_LITERAL.test(expr) || (lineage && /^[\w$.!?[\]]*\.source\b/.test(expr)) || [...names].some((n) => new RegExp(`^${escapeRe(n)}\\b`).test(expr)));
  const all = bindings(code);
  for (let grew = true; grew; ) {
    grew = false;
    for (const { name, init } of all) {
      if (names.has(name) || RELOCATE.test(init)) continue;
      const owner = (lineage && /\.source\b(?!\s*(?:===|!==|==|\.endsWith|\.startsWith))/.test(init)) || isOwner(init.trim()) || (/["'`]\/Users\//.test(init) && !/\b(?:expect|toBe|toEqual|readFileSync|JSON\.parse)\b/.test(init));
      if (owner) {
        names.add(name);
        grew = true;
      }
    }
  }
  // a local function that passes its first parameter to a file read
  const readers = all
    .filter(({ init }) => {
      const param = /^(?:async\s*)?\(?\s*([\w$]+)/.exec(init.trim())?.[1];
      return param !== undefined && /=>|\{/.test(init) && new RegExp(`${READ_CALL}\\(\\s*${escapeRe(param)}\\b`).test(init);
    })
    .map(({ name }) => escapeRe(name));
  const callee = [READ_CALL.slice(2), ...readers].join("|");
  const out = [];
  const TEST_START = /\b(?:test|it)(?:\.(?:runIf|skipIf|each)\([^\n]*?\))?\(/g;
  for (const { arg, at } of firstArgs(code, callee)) {
    if (arg === "" || !isOwner(arg)) continue;
    // guarded: an existsSync on the argument anywhere, or one earlier in the same test
    let from = 0;
    for (const t of code.slice(0, at).matchAll(TEST_START)) from = t.index;
    const guarded = new RegExp(`existsSync\\(\\s*${escapeRe(arg.replace(/!$/, ""))}\\s*\\)`).test(code) || (from > 0 && /existsSync\(/.test(code.slice(from, at)));
    out.push({ arg, guarded });
  }
  return out;
}

/** Why a source text reads owner files, or null. */
export function ownerSignal(text) {
  for (const m of text.matchAll(ORIGINALS_IMPORT)) {
    const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    const hit = names.find((n) => READERS.has(n));
    if (hit) return `imports ${hit} from originals-root`;
  }
  if (BENCHES_IMPORT.test(text)) return "imports benches-root";
  if (BENCH_PATH.test(stripComments(text))) return "names a fab-work-directory path";
  const reads = ownerReads(text);
  const open = reads.find((r) => !r.guarded);
  if (open) return `reads an owner path (${open.arg}) unguarded`;
  if (reads.length > 0) return `reads an owner path (${reads[0].arg}) behind existsSync`;
  return null;
}

/** A signal the hosted runner can run past: every owner read is behind existsSync. */
export const isGuarded = (why) => / behind existsSync/.test(why);

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
    for (const { file, why } of files) if (!isGuarded(why)) console.log(`--exclude=${join(ROOT, file)}`);
    return;
  }
  if (cmd === "report") {
    const open = files.filter((f) => !isGuarded(f.why));
    const guarded = files.filter((f) => isGuarded(f.why));
    const lines = [`not run in ci: ${open.length} test files read the owner's originals or benches; the owner-files job runs them on the owner's runner`];
    for (const { file, why } of open) lines.push(`  ${file}: ${why}`);
    lines.push(`skipped in part in ci: ${guarded.length} test files guard their owner reads with existsSync; the owner-files job runs them in full`);
    for (const { file, why } of guarded) lines.push(`  ${file}: ${why}`);
    console.log(lines.join("\n"));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
    return;
  }
  console.error("usage: owner-files.mjs list | excludes | report");
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv[2]);
