// touched: which type check covers an edited file, and the per-session
// record of edited files and workspaces (PLAN.md 6 release 1 rails,
// "touched-package type check"). Node built-ins only, so the plugin package
// can ship it. Used by touched-typecheck.mjs.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

// Files a type check reads. A README or a fixture edit checks nothing.
const CHECKED = /(\.(ts|tsx|mts|cts)|(^|\/)tsconfig[^/]*\.json)$/;

// Test trees checked by tsconfig.tests.json and tools/tsconfig.json, matched
// before the build projects that hold them.
const TESTS = [/^packages\/[^/]+\/test\//, /^core\/test\//, /^kernel\/test\//, /^tools\/test-support\//];
const TOOLS = [/^tools\/test\/[^/]+\.ts$/, /^tools\/parity\//, /^spec\/test\//];

/** The file's path relative to repoRoot with forward slashes, or null outside it. */
export function relPath(repoRoot, file) {
  const abs = isAbsolute(file) ? file : resolve(repoRoot, file);
  const rel = relative(repoRoot, abs);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return null;
  return rel.split(sep).join("/");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** The project dirs the root tsconfig.json references, repo relative. */
export function references(repoRoot) {
  const path = join(repoRoot, "tsconfig.json");
  if (!existsSync(path)) return [];
  const refs = readJson(path).references ?? [];
  return refs.map((r) => relPath(repoRoot, r.path) ?? "").filter(Boolean);
}

/**
 * The type check that covers file: {kind: "vue"} for a .vue file,
 * {kind: "tests"} for a test tree tsconfig.tests.json checks, {kind:
 * "tools"} for one tools/tsconfig.json checks, {kind: "build", dir} for the
 * nearest ancestor directory the root tsconfig.json references, else null.
 */
export function projectFor(repoRoot, file) {
  const rel = relPath(repoRoot, file);
  if (rel === null) return null;
  if (rel.endsWith(".vue")) return { kind: "vue" };
  if (!CHECKED.test(rel)) return null;
  if (TESTS.some((re) => re.test(rel))) return { kind: "tests" };
  if (TOOLS.some((re) => re.test(rel))) return { kind: "tools" };
  const refs = new Set(references(repoRoot));
  for (let dir = dirname(rel); dir !== "." && dir !== ""; dir = dirname(dir)) {
    if (refs.has(dir)) return { kind: "build", dir };
  }
  return null;
}

/** The root package.json workspace that holds rel, or null. Globs use * for one segment. */
export function workspaceFor(repoRoot, rel) {
  const path = join(repoRoot, "package.json");
  if (!existsSync(path)) return null;
  const globs = readJson(path).workspaces ?? [];
  const parts = rel.split("/");
  for (const glob of Array.isArray(globs) ? globs : (globs.packages ?? [])) {
    const g = glob.replace(/\/$/, "").split("/");
    if (parts.length <= g.length) continue;
    if (g.every((seg, i) => seg === "*" || seg === parts[i])) return parts.slice(0, g.length).join("/");
  }
  return null;
}

/** The record path for a session: <root>/.hbf/agent-hooks/<session_id>.json. */
export function recordPath(repoRoot, sessionId) {
  const id = String(sessionId || "session").replace(/[^A-Za-z0-9_-]/g, "_");
  return join(repoRoot, ".hbf", "agent-hooks", `${id}.json`);
}

/** Add file and its workspace to the session record, once each. Returns the record. */
export function recordTouched(repoRoot, sessionId, file) {
  const path = recordPath(repoRoot, sessionId);
  let rec = { files: [], workspaces: [] };
  if (existsSync(path)) {
    try {
      const old = readJson(path);
      rec = { files: [...(old.files ?? [])], workspaces: [...(old.workspaces ?? [])] };
    } catch {
      // A torn record starts over.
    }
  }
  const rel = relPath(repoRoot, file);
  if (rel === null) return rec;
  if (!rec.files.includes(rel)) rec.files.push(rel);
  const ws = workspaceFor(repoRoot, rel);
  if (ws && !rec.workspaces.includes(ws)) rec.workspaces.push(ws);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(rec, null, 2)}\n`);
  return rec;
}
