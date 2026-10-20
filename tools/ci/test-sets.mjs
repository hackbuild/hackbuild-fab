// The vitest files each workspace `npm test` collects against the files one
// root run collects (R1-rails-ci-hooks-03). ci.yml runs the root set only,
// so a file only in the workspace set runs nowhere hosted; this prints it.
// Both sets take the owner-files excludes, as the hosted runs do.
//
// Usage:
//   node tools/ci/test-sets.mjs                    list both sets and compare
//   node tools/ci/test-sets.mjs --save <file>      also write the sets as json
//   node tools/ci/test-sets.mjs --sets <file>      compare saved sets, no listing
// Exit 1 when a file is only in the workspace set.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");

/** The filters of the single root run: exit-a, build's contract step and parity's designs step. */
export const ROOT_FILTERS = ["packages", "reference", "core", "kernel", "spec", "designs/blocks"];

/** Workspace dirs from the root package.json globs, `dir/*` expanded one level. */
export function workspaces() {
  const out = [];
  for (const w of JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).workspaces) {
    if (!w.endsWith("/*")) { out.push(w); continue; }
    const dir = w.slice(0, -2);
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isDirectory() && existsSync(join(ROOT, dir, e.name, "package.json"))) out.push(`${dir}/${e.name}`);
    }
  }
  return out;
}

/** Shell words of a script tail; double and single quotes only, which is all the test scripts use. */
export const words = (s) => [...s.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);

const excludes = () => execFileSync("node", [join(ROOT, ".github/scripts/owner-files.mjs"), "excludes"], { encoding: "utf8" }).split("\n").filter(Boolean);

/** Repo-relative files `vitest list` collects from cwd with these args; --json goes last, since it takes an optional file name. */
function list(cwd, args) {
  const out = execFileSync("npx", ["vitest", "list", ...args, "--filesOnly", "--json"], { cwd, encoding: "utf8", maxBuffer: 64 << 20 });
  return JSON.parse(out.slice(out.indexOf("["))).map((t) => relative(ROOT, t.file)).sort();
}

/** Files of every workspace whose test script is `vitest run ...`, run from the workspace as `npm test -w` does. */
export function workspaceSet(ex = excludes()) {
  const files = [];
  for (const w of workspaces()) {
    const script = JSON.parse(readFileSync(join(ROOT, w, "package.json"), "utf8")).scripts?.test;
    if (!script) continue;
    const m = /^vitest run(?:\s+(.*))?$/.exec(script);
    if (!m) throw new Error(`${w}: test script is not a bare vitest run: ${script}`);
    const args = words(m[1] ?? "");
    // a workspace with no test file lists nothing; npm test passes it only with this flag
    if (!args.includes("--passWithNoTests")) args.push("--passWithNoTests");
    files.push(...list(join(ROOT, w), [...args, ...ex]));
  }
  return [...new Set(files)].sort();
}

export const rootSet = (ex = excludes()) => list(ROOT, [...ROOT_FILTERS, ...ex]);

const ENV = /\benvironment:\s*["']([\w-]+)["']/;
const configEnv = (dir) => {
  const f = ["vitest.config.ts", "vitest.config.mjs", "vitest.config.js"].map((n) => join(ROOT, dir, n)).find(existsSync);
  return (f && ENV.exec(readFileSync(f, "utf8"))?.[1]) ?? "node";
};

/** Files in both sets whose workspace config sets another environment than the root's and that carry no @vitest-environment line of their own. */
export function environmentDiffers(files) {
  const rootEnv = configEnv(".");
  return files.filter((f) => {
    const w = workspaces().filter((d) => f.startsWith(`${d}/`)).sort((a, b) => b.length - a.length)[0];
    if (!w || configEnv(w) === rootEnv) return false;
    return !/@vitest-environment\s/.test(readFileSync(join(ROOT, f), "utf8"));
  });
}

export function compare(sets) {
  const inRoot = new Set(sets.root);
  const inWs = new Set(sets.workspaces);
  return {
    onlyInWorkspaces: sets.workspaces.filter((f) => !inRoot.has(f)),
    onlyInRoot: sets.root.filter((f) => !inWs.has(f)),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
  let sets;
  if (arg("--sets")) sets = JSON.parse(readFileSync(arg("--sets"), "utf8"));
  else {
    const ex = excludes();
    sets = { workspaces: workspaceSet(ex), root: rootSet(ex) };
  }
  if (arg("--save")) writeFileSync(arg("--save"), JSON.stringify(sets, null, 2) + "\n");
  const { onlyInWorkspaces, onlyInRoot } = compare(sets);
  const env = environmentDiffers(sets.workspaces.filter((f) => sets.root.includes(f) && existsSync(join(ROOT, f))));
  console.log(`workspace files: ${sets.workspaces.length}, root files: ${sets.root.length}`);
  console.log(`only in workspaces: ${onlyInWorkspaces.length}`);
  for (const f of onlyInWorkspaces) console.log(`  ${f}`);
  console.log(`only in root: ${onlyInRoot.length}`);
  for (const f of onlyInRoot) console.log(`  ${f}`);
  console.log(`environment differs: ${env.length}`);
  for (const f of env) console.log(`  ${f}`);
  process.exitCode = onlyInWorkspaces.length > 0 ? 1 : 0;
}
