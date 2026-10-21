// Generates every count in docs/plan/counts.json and the PLAN.md Appendix B
// table (D-010). Repo counts are recomputed on each run; rows whose source
// lives outside the repo come from tools/counts.external.json.
//
// counts.json and Appendix B are integrator-only (R1-rails-registries-02):
// a builder branch never commits either; the integrator runs this after
// each merge and commits the result, and `npm run derived:counts` (CI on
// main) fails while they lag. No package test reads counts.json; the
// cross-check of these counts against the seed and def files (D-010) is
// tools/test/counts.test.mjs.
//
//   node tools/counts.mjs                 write counts.json and Appendix B
//   node tools/counts.mjs --external      recheck snapshot rows whose source exists here; exit 1 on a mismatch
//   node tools/counts.mjs --check-prose   list hand-typed counted numbers in docs/ and READMEs (warnings, exit 0)
//   --root=<dir>                          run against another checkout (tests use a temp copy)
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const BEGIN = "<!-- counts:begin -->";
const END = "<!-- counts:end -->";
const APPENDIX_HEAD = "## Appendix B.";
const TABLE_HEAD = "| count | value | method or source |";

const rootArg = process.argv.find((a) => a.startsWith("--root="));
const root = resolve(rootArg ? rootArg.slice("--root=".length) : join(fileURLToPath(import.meta.url), "..", ".."));
const read = (p) => readTexts([join(root, p)])[0];
const readJson = (p) => JSON.parse(read(p));

// Sorted walk so output never depends on directory order; dotfiles are skipped.
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// In a git checkout only tracked or staged files count, and each is read from
// its staged blob, so neither a stray untracked file nor another agent's
// unstaged edit can move a committed count; CI checks out a clean tree and gets
// the same bytes. Outside git (the test's temp copy) every file counts and is
// read from disk. Returns null when root is not a git top level, else the set
// of absolute paths in the index.
let indexCache;
function indexPaths() {
  if (indexCache !== undefined) return indexCache;
  indexCache = null;
  try {
    const top = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (realpathSync(top) !== realpathSync(root)) return indexCache;
    const out = execFileSync("git", ["-C", root, "ls-files", "-z", "--cached"], { encoding: "utf8", maxBuffer: 1 << 26 });
    indexCache = new Set(out.split("\0").filter(Boolean).map((p) => join(root, p)));
  } catch {
    indexCache = null;
  }
  return indexCache;
}

// Text of each absolute path: the staged blob when the path is in the index
// (one `git cat-file --batch` for all of them), else the file on disk.
function readTexts(paths) {
  const index = indexPaths();
  const staged = index ? paths.filter((p) => index.has(p)) : [];
  const blobs = new Map();
  if (staged.length) {
    const input = staged.map((p) => `:${relative(root, p).split(sep).join("/")}\n`).join("");
    const out = execFileSync("git", ["-C", root, "cat-file", "--batch"], { input, maxBuffer: 1 << 30 });
    let at = 0;
    for (const p of staged) {
      const nl = out.indexOf(10, at);
      const head = out.subarray(at, nl).toString("utf8").split(" ");
      if (head[1] !== "blob") throw new Error(`counts: no staged blob for ${relative(root, p)} (${head.join(" ")})`);
      const size = Number(head[2]);
      blobs.set(p, out.subarray(nl + 1, nl + 1 + size).toString("utf8"));
      at = nl + 1 + size + 1;
    }
  }
  return paths.map((p) => (blobs.has(p) ? blobs.get(p) : readFileSync(p, "utf8")));
}

// Files under dir that git would add on `git add -A` but does not count yet:
// untracked and not ignored. The derived row in the card runs after
// `git add -A`, so any such file means the committed counts and the card's
// form disagree. Returns [] outside git.
function untrackedUnder(dir) {
  try {
    const top = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (realpathSync(top) !== realpathSync(root)) return [];
    const out = execFileSync("git", ["-C", root, "ls-files", "-z", "--others", "--exclude-standard", "--", relative(root, dir)], { encoding: "utf8", maxBuffer: 1 << 26 });
    return out.split("\0").filter(Boolean).filter((p) => !p.split("/").some((s) => s.startsWith("."))).sort();
  } catch {
    return [];
  }
}

// Counted files under dir, sorted: the index entries in a git checkout (a
// staged file deleted from disk still counts, as it would commit), else a walk.
function trackedWalk(dir) {
  const index = indexPaths();
  if (!index) return walk(dir);
  const prefix = dir + sep;
  return [...index].filter((p) => p.startsWith(prefix) && !relative(dir, p).split(sep).some((s) => s.startsWith("."))).sort();
}

// wc -w in the C locale: runs of bytes split on ASCII whitespace.
const wordsIn = (text) => text.split(/[ \t\n\v\f\r]+/).filter(Boolean).length;
const wordsOf = (paths) => readTexts(paths).reduce((n, t) => n + wordsIn(t), 0);
const fmt = (n) => n.toLocaleString("en-US");

function countBy(items, key) {
  const out = {};
  for (const it of items) out[key(it)] = (out[key(it)] ?? 0) + 1;
  return out;
}

// String-literal members of the const array behind `type <name> = (typeof X)[number]`.
function unionMembers(src, typeName) {
  const alias = src.match(new RegExp(`type ${typeName} = \\(typeof (\\w+)\\)\\[number\\]`));
  if (!alias) throw new Error(`counts: spec/commands.ts has no type ${typeName}`);
  const body = src.match(new RegExp(`const ${alias[1]} = \\[([\\s\\S]*?)\\] as const`));
  if (!body) throw new Error(`counts: spec/commands.ts has no array ${alias[1]}`);
  return body[1].replace(/\/\/.*$/gm, "").match(/"[^"]*"/g)?.length ?? 0;
}

const DOMAINS = {
  mechanical: ["case", "inlay", "machine", "mechanism", "robot", "sheet"],
  electrical: ["board", "copper", "printed-circuit"],
  device: ["device"],
  meta: ["meta"],
};

function decisionCounts() {
  const src = read("docs/plan/DECISIONS.md");
  const ids = [...src.matchAll(/^### D-(\d{3})\b/gm)].map((m) => Number(m[1]));
  const lo = Math.min(...ids), hi = Math.max(...ids);
  const have = new Set(ids);
  const missing = [];
  for (let i = lo; i <= hi; i++) if (!have.has(i)) missing.push(i);
  const section = (title) => {
    const i = src.indexOf(`\n## ${title}\n`);
    if (i < 0) throw new Error(`counts: DECISIONS.md has no section ${title}`);
    const j = src.indexOf("\n## ", i + 1);
    return src.slice(i, j < 0 ? undefined : j);
  };
  const status = {};
  for (const m of section("Index").matchAll(/^\| D-\d{3} \|[^|]*\| ([^|]*) \|/gm)) {
    const word = m[1].trim().split(/[ ,]/)[0];
    status[word] = (status[word] ?? 0) + 1;
  }
  const ownerQueue = [...section("Owner queue").matchAll(/^\| D-\d{3} \|/gm)].length;
  return {
    decided: status.decided ?? 0,
    first: lo,
    last: hi,
    neverIssued: missing,
    owner: status.owner ?? 0,
    ownerQueue,
    superseded: status.superseded ?? 0,
    total: ids.length,
  };
}

// Ids of the CHK- rows in the CHECKS.md section 9 tables; 9.10 holds reserved
// ids that are not entered. Returned as a set so the union with the seed counts
// an id that is both entered and seeded (CHK-NET-29) once.
function enteredChecks() {
  const lines = read("docs/plan/CHECKS.md").split("\n");
  let sub = null;
  const ids = new Set();
  for (const line of lines) {
    const h3 = line.match(/^### (9\.\d+)\b/);
    if (h3) { sub = h3[1]; continue; }
    if (/^## /.test(line)) { sub = line.startsWith("## 9.") ? "9" : null; continue; }
    const m = sub && sub !== "9.10" && line.match(/^\| *`?(CHK-[A-Z0-9]+-\d+)/);
    if (m) ids.add(m[1]);
  }
  return ids;
}

// Registered canon entries (M06-T01): one def file per id under
// packages/<pkg>/src/defs/, its status as the def file states it, and the
// alias rows of the archetype alias table. The package load tests compare
// these with the loaded registries, so a regex that misreads a def fails there.
function canonCounts(pkg, aliasFile) {
  const dir = join(root, "packages", pkg, "src", "defs");
  const files = existsSync(dir) ? trackedWalk(dir).filter((p) => p.endsWith(".ts") && !p.endsWith(`${sep}index.ts`)) : [];
  const texts = readTexts(files);
  const out = {
    byStatus: countBy(texts, (t) => (t.match(/^\s*status: "([a-z]+)",$/m) ?? [])[1] ?? "unstated"),
    registered: files.length,
  };
  if (aliasFile) out.aliases = (read(aliasFile).match(/^\s*\{ alias: "/gm) ?? []).length;
  return out;
}

// One file out of a gzipped npm tarball: ustar headers, 512-byte blocks.
function tgzEntry(path, name) {
  const tar = gunzipSync(readFileSync(path));
  for (let at = 0; at + 512 <= tar.length;) {
    const head = tar.subarray(at, at + 512);
    if (head.every((b) => b === 0)) break;
    const field = (o, n) => head.subarray(o, o + n).toString("utf8").replace(/\0.*$/s, "");
    const full = (field(345, 155) ? field(345, 155) + "/" : "") + field(0, 100);
    const size = parseInt(field(124, 12).trim() || "0", 8);
    if (full === name) return tar.subarray(at + 512, at + 512 + size).toString("utf8");
    at += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error(`counts: ${name} not in ${path}`);
}

// Distinct .hb- class names in the hackbuild-ui stylesheet packages/ui
// installs: the vendored tarball while the dependency is a file: spec,
// node_modules once it is an exact npm version (M09-T02 step 9).
function uiCounts() {
  const pkgPath = join(root, "packages/ui/package.json");
  if (!existsSync(pkgPath)) return null;
  const spec = JSON.parse(readFileSync(pkgPath, "utf8")).dependencies?.["@virgilvox/hackbuild-ui"];
  if (!spec) return null;
  const css = spec.startsWith("file:")
    ? tgzEntry(resolve(root, "packages/ui", spec.slice("file:".length)), "package/dist/styles/hackbuild.css")
    : readFileSync(join(root, "node_modules/@virgilvox/hackbuild-ui/dist/styles/hackbuild.css"), "utf8");
  return { hbClasses: new Set(css.match(/\.hb-[a-zA-Z0-9_-]*/g)).size, spec };
}

export function compute() {
  const checks = readJson("packages/checks/seed/checks.seed.json").checks;
  const tools = readJson("registry/tools.json").tools;
  const manifest = readJson("tools/seed-manifest.json");
  const commands = read("spec/commands.ts");
  const mechs = parse(read("packages/mechanisms/seed/mechanisms.seed.yaml"));
  const archs = parse(read("packages/archetypes/seed/archetypes.seed.yaml"));
  const knowledgeDir = join(root, "knowledge");
  const refDir = join(knowledgeDir, "references") + sep;
  const kAll = trackedWalk(knowledgeDir);
  const kFiles = kAll.filter((p) => !p.startsWith(refDir));
  const rFiles = kAll.filter((p) => p.startsWith(refDir));
  // Rows entered after the seed (enteredBy, M04-T12) are registered but not seeded.
  const seededRows = checks.filter((c) => c.enteredBy === undefined);
  const sev = countBy(seededRows, (c) => c.severity);
  const all = countBy(checks, (c) => c.severity);
  const entered = enteredChecks();
  const seededIds = new Set(seededRows.map((c) => c.id));
  const both = [...entered].filter((id) => seededIds.has(id)).sort();
  return {
    archetypes: archs.length,
    canon: {
      archetypes: canonCounts("archetypes", "packages/archetypes/src/aliases.ts"),
      mechanisms: canonCounts("mechanisms"),
    },
    checks: {
      block: sev.block ?? 0,
      byLevel: countBy(seededRows, (c) => c.appliesTo.level),
      entered: entered.size,
      enteredAndSeeded: both,
      enteredWithSeeded: new Set([...entered, ...seededIds]).size,
      registered: { block: all.block ?? 0, total: checks.length, warn: all.warn ?? 0 },
      total: seededRows.length,
      warn: sev.warn ?? 0,
    },
    decisions: decisionCounts(),
    knowledge: { files: kFiles.length, words: wordsOf(kFiles) },
    mechanismShape: {
      idFamilyProvenanceOnly: mechs.filter((m) => Object.keys(m).sort().join() === "family,id,provenance").length,
      noInputsGovernsDerived: mechs.filter((m) => !m.inputs && !m.governs && !m.derived).length,
    },
    mechanisms: mechs.length,
    references: { words: wordsOf(rFiles) },
    seed: {
      files: manifest.length,
      imported: manifest.filter((r) => r.dest).length,
      skipped: manifest.filter((r) => r.skipped).length,
    },
    spec: { commands: unionMembers(commands, "CommandName"), mcpTools: unionMembers(commands, "McpToolName") },
    ui: uiCounts(),
    tools: {
      domain: Object.fromEntries(Object.entries(DOMAINS).map(([k, gs]) => [k, tools.filter((t) => gs.includes(t.group)).length])),
      total: tools.length,
    },
  };
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}

const pad = (n) => String(n).padStart(3, "0");

const statusList = (by) => Object.entries(by).sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => `${k} ${n}`).join(", ") || "none";

function table(c, ext) {
  const lv = Object.entries(c.checks.byLevel).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const d = c.decisions;
  const gaps = d.neverIssued.length ? ` with ${d.neverIssued.map((i) => `D-${pad(i)}`).join(", ")} never issued` : "";
  const rows = [
    ["seeded checks", `${c.checks.total} (${c.checks.block} block, ${c.checks.warn} warn); by level ${lv.map(([k, n]) => `${k} ${n}`).join(", ")}`, "`packages/checks/seed/checks.seed.json` `checks[]` by `severity` and `appliesTo.level`"],
    ["registered checks", `${c.checks.registered.total} (${c.checks.registered.block} block, ${c.checks.registered.warn} warn): the seeded rows and the rows entered with enteredBy`, "`packages/checks/seed/checks.seed.json` `checks[]` by `severity`"],
    ["entered checks", `${c.checks.entered} in CHECKS.md section 9 (excluding the reserved rows of 9.10), ${c.checks.enteredWithSeeded} distinct with the seeded rows${c.checks.enteredAndSeeded.length ? ` (${c.checks.enteredAndSeeded.join(", ")} ${c.checks.enteredAndSeeded.length === 1 ? "is" : "are"} in both)` : ""}`, "`CHK-` table rows under the section 9 headings of `docs/plan/CHECKS.md`; distinct ids in their union with `checks[].id` of the seed"],
    ["decision entries", `${d.total}, D-${pad(d.first)} to D-${pad(d.last)}${gaps}: ${d.decided} decided, ${d.owner} owner, ${d.superseded} superseded; owner queue ${d.ownerQueue}`, "`### D-` headings, the Index status column and the Owner queue rows of `docs/plan/DECISIONS.md`"],
    ["registry tools", `${c.tools.total} (${c.tools.domain.mechanical} mechanical or cosmetic, ${c.tools.domain.electrical} electrical, ${c.tools.domain.device} device, ${c.tools.domain.meta} meta)`, "`registry/tools.json` `tools[]` by `group`"],
    ["seed files", `${c.seed.files} (${c.seed.imported} imported, ${c.seed.skipped} skipped)`, "`tools/seed-manifest.json`"],
    ["seeded mechanisms", `${c.mechanisms} (${c.mechanismShape.noInputsGovernsDerived} with no inputs, governs or derived; ${c.mechanismShape.idFamilyProvenanceOnly} with only id, family and provenance)`, "`packages/mechanisms/seed/mechanisms.seed.yaml`"],
    ["seeded archetypes", `${c.archetypes}`, "`packages/archetypes/seed/archetypes.seed.yaml`"],
    ["registered mechanisms", `${c.canon.mechanisms.registered} (${statusList(c.canon.mechanisms.byStatus)})`, "def files under `packages/mechanisms/src/defs/` by their `status`"],
    ["registered archetypes", `${c.canon.archetypes.registered} (${statusList(c.canon.archetypes.byStatus)}), plus ${c.canon.archetypes.aliases} seed ids resolved by alias`, "def files under `packages/archetypes/src/defs/` by their `status`; alias rows of `packages/archetypes/src/aliases.ts`"],
    ["spec commands, MCP tools", `${c.spec.commands}, ${c.spec.mcpTools}`, "string-literal members of `CommandName` and `McpToolName` in `spec/commands.ts`"],
    ["knowledge files", `${c.knowledge.files}, with ${fmt(c.knowledge.words)} words`, "tracked files under `knowledge/` outside `knowledge/references/`; words as `wc -w` splits them"],
    ["reference words", fmt(c.references.words), "tracked files under `knowledge/references/`; words as `wc -w` splits them"],
    ...(c.ui ? [["hackbuild-ui `.hb-` classes", `${c.ui.hbClasses} in the stylesheet packages/ui installs (${c.ui.spec})`, "distinct `.hb-` names in `dist/styles/hackbuild.css` of the `@virgilvox/hackbuild-ui` dependency of `packages/ui/package.json`"]] : []),
    ...ext.map((r) => [r.label, r.note ? `${r.value}; ${r.note}` : r.value, `${r.method} (snapshot ${r.date}, \`tools/counts.external.json\` ${r.key})`]),
  ];
  const cell = (s) => String(s).replace(/\|/g, "\\|");
  return [TABLE_HEAD, "|---|---|---|", ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
}

function writePlan(c, ext) {
  const planPath = join(root, "docs/plan/PLAN.md");
  let plan = readFileSync(planPath, "utf8");
  if (!plan.includes(BEGIN)) {
    const head = plan.indexOf(APPENDIX_HEAD);
    const start = head < 0 ? -1 : plan.indexOf(TABLE_HEAD, head);
    if (start < 0) throw new Error("counts: PLAN.md has no Appendix B table to mark");
    let end = plan.indexOf("\n\n", start);
    if (end < 0) end = plan.length;
    plan = `${plan.slice(0, start)}${BEGIN}\n${plan.slice(start, end)}\n${END}${plan.slice(end)}`;
  }
  const i = plan.indexOf(BEGIN), j = plan.indexOf(END);
  if (j < i) throw new Error("counts: PLAN.md counts markers out of order");
  const next = `${plan.slice(0, i)}${BEGIN}\n${table(c, ext)}\n${plan.slice(j)}`;
  if (next !== readFileSync(planPath, "utf8")) writeFileSync(planPath, next);
}

function writeJson(c, ext) {
  const external = Object.fromEntries(ext.map((r) => [r.key, r.value]));
  const text = JSON.stringify(sortKeys({ ...c, external }), null, 2) + "\n";
  const p = join(root, "docs/plan/counts.json");
  if (!existsSync(p) || readFileSync(p, "utf8") !== text) writeFileSync(p, text);
}

// ---- external rechecks: each returns the value string the snapshot should hold ----

const glob1 = (dir) => {
  const top = readdirSync(dir).sort().filter((n) => n.endsWith(".md")).map((n) => join(dir, n)).filter((p) => statSync(p).isFile());
  const sub = readdirSync(dir).sort().map((n) => join(dir, n)).filter((p) => statSync(p).isDirectory())
    .flatMap((d) => readdirSync(d).sort().filter((n) => n.endsWith(".md")).map((n) => join(d, n)));
  return [...top, ...sub];
};

function davitPairs(html) {
  const at = html.indexOf('"pairs":[');
  if (at < 0) throw new Error('no "pairs":[ in the file');
  let depth = 0, k = at + 8;
  for (; k < html.length; k++) {
    if (html[k] === "[") depth++;
    else if (html[k] === "]" && --depth === 0) break;
  }
  return JSON.parse(html.slice(at + 8, k + 1));
}

const RECHECK = {
  "handoff.knowledge": (p) => { const f = glob1(p); return `${f.length} files, ${fmt(wordsOf(f))} words`; },
  "handoff.references.words": (p) => fmt(wordsOf(glob1(p))),
  "handoff.scaffold.files": (p) => String(readdirSync(p, { recursive: true }).filter((n) => statSync(join(p, String(n))).isFile()).length),
  "handoff.spec.commands": (p) => {
    const src = readFileSync(p, "utf8");
    const body = src.slice(src.indexOf("export interface Commands"));
    return String(body.slice(0, body.search(/^}/m)).match(/^\s*"[a-z.]+":/gm)?.length ?? 0);
  },
  "pip.noteElements": (p) => String(readFileSync(p, "utf8").match(/class="note"/g)?.length ?? 0),
  "davit.pairsPerPipe": (p) => `${davitPairs(readFileSync(p, "utf8")).length} arm pairs plus 1 hub pair`,
  "sprue.filamentKeys": (p) => {
    const keys = readFileSync(p, "utf8").split("\n").slice(747, 772).map((l) => l.match(/^\s*"([a-z_]+)":/)?.[1]).filter(Boolean);
    return String(keys.filter((k) => !["version", "printer_settings_id", "print_settings_id"].includes(k)).length);
  },
  "slug.chkSites": (p) => {
    const py = "import ast,sys\nt=ast.parse(open(sys.argv[1]).read())\nprint(sum(1 for n in ast.walk(t) if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='chk'))";
    return execFileSync("uv", ["run", "--quiet", "--project", join(root, "tools/py"), "python", "-c", py, p], { encoding: "utf8" }).trim();
  },
  "brand.fe0386Folders": (p) => {
    let out = "";
    try { out = execFileSync("grep", ["-rl", "FE0386", "benches"], { cwd: p, encoding: "utf8", maxBuffer: 1 << 26 }); }
    catch (e) { if (e.status !== 1) throw e; }
    return String(new Set(out.split("\n").filter(Boolean).map((l) => l.split("/")[1])).size);
  },
  "hackbuildUi.hbClasses": (p) => {
    const ver = JSON.parse(readFileSync(join(p, "package.json"), "utf8")).version;
    if (ver !== "0.2.0") return { skip: `installed hackbuild-ui is ${ver}, the row counts 0.2.0` };
    return String(new Set(readFileSync(join(p, "dist/styles/hackbuild.css"), "utf8").match(/\.hb-[a-zA-Z0-9_-]*/g)).size);
  },
};

// A row names its source by archive prefix (tools/publish-paths.mjs); sourcePath reads it from the archive's variable.
async function external(ext) {
  const { sourcePath } = await import(new URL("./test-support/originals-root.ts", import.meta.url).href);
  let bad = 0;
  for (const r of ext) {
    const fn = RECHECK[r.key];
    if (!fn) { console.log(`${r.key}: not run, no recheck method; snapshot ${r.value}`); continue; }
    const at = sourcePath(r.path);
    if (!existsSync(at)) { console.log(`${r.key}: not run, source absent at ${at}`); continue; }
    let got;
    try { got = fn(at); }
    catch (e) { console.log(`${r.key}: not run, recheck failed: ${String(e.message).split("\n")[0]}`); continue; }
    if (got && typeof got === "object") { console.log(`${r.key}: not run, ${got.skip}`); continue; }
    if (got === r.value) console.log(`${r.key}: ok, ${got}`);
    else { bad++; console.log(`${r.key}: mismatch, snapshot ${r.value}, source gives ${got}`); }
  }
  return bad;
}

// ---- prose: counted numbers typed next to their noun ----

function proseTargets(c) {
  return [
    ["checks.total", c.checks.total, "(?:seeded )?checks"],
    ["checks.block", c.checks.block, "block(?:ing)? checks"],
    ["checks.warn", c.checks.warn, "warn(?:ing)? checks"],
    ["checks.entered", c.checks.entered, "(?:new |entered )checks"],
    ["tools.total", c.tools.total, "(?:registry )?(?:tools|registry entries|entries)"],
    ["seed.files", c.seed.files, "seed files"],
    ["mechanisms", c.mechanisms, "(?:seeded )?mechanisms"],
    ["archetypes", c.archetypes, "(?:seeded )?archetypes"],
    ["spec.commands", c.spec.commands, "(?:CLI )?commands"],
    ["spec.mcpTools", c.spec.mcpTools, "MCP tools"],
    ["knowledge.files", c.knowledge.files, "knowledge files"],
    ["decisions.total", c.decisions.total, "decisions?(?: entries)?"],
    ["decisions.ownerQueue", c.decisions.ownerQueue, "owner(?: queue)? entries"],
  ];
}

function checkProse(c) {
  const files = [];
  const docs = join(root, "docs");
  if (existsSync(docs)) files.push(...walk(docs).filter((p) => p.endsWith(".md")));
  const skip = new Set(["node_modules", ".git"]);
  const findReadmes = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (skip.has(name)) continue;
      const p = join(dir, name);
      if (p === docs) continue;
      if (statSync(p).isDirectory()) findReadmes(p);
      else if (/^README(\..+)?$/i.test(name)) files.push(p);
    }
  };
  findReadmes(root);
  const res = proseTargets(c).map(([key, n, noun]) => [key, new RegExp(`(?<![\\d.,])${fmt(n).replace(/,/g, ",?")} ${noun}\\b`, "gi")]);
  let hits = 0;
  for (const p of files) {
    const rel = relative(root, p);
    let inBlock = false;
    readFileSync(p, "utf8").split("\n").forEach((line, i) => {
      if (line.includes(BEGIN)) inBlock = true;
      if (line.includes(END)) { inBlock = false; return; }
      if (inBlock) return;
      for (const [key, re] of res) {
        for (const m of line.matchAll(re)) {
          hits++;
          console.log(`warn ${rel}:${i + 1}: "${m[0]}" typed by hand, generated as ${key}`);
        }
      }
    });
  }
  console.log(`counts: ${hits} hand-typed counts in ${files.length} files (warnings; the doc-number drift check blocks when DOCS.md says so)`);
}

function main() {
  const ext = readJson("tools/counts.external.json");
  if (process.argv.includes("--external")) {
    external(ext).then((bad) => {
      console.log(bad ? `counts: ${bad} external rows drifted` : "counts: external rows match or did not run");
      process.exit(bad ? 1 : 0);
    });
    return;
  }
  const c = compute();
  if (process.argv.includes("--check-prose")) { checkProse(c); return; }
  writeJson(c, ext);
  writePlan(c, ext);
  console.log("counts: wrote docs/plan/counts.json and the PLAN.md Appendix B table");
  // A counted directory with untracked files gives one result here and another
  // after `git add -A` (the M-1-T11 form), so the derived row fails until they
  // are staged or ignored.
  const stray = untrackedUnder(join(root, "knowledge"));
  if (stray.length) {
    const shown = stray.slice(0, 5).join(", ") + (stray.length > 5 ? ", ..." : "");
    console.error(`counts: ${stray.length} untracked files under knowledge/ are not counted (${shown}); stage or ignore them, then rerun`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
