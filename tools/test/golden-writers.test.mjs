// Golden writers (D-227). hbf parity --accept is the only updater of the four
// JSON goldens; a section render under expected/ has one named writer, and
// for keys flex-pair that is the reference vitest under HBF_ACCEPT=1. The plan
// once called parity the only golden updater while that vitest also wrote
// expected/. Each test reads the code or the plan text and fails when a new
// writer appears, when CI could accept, or when the plan drops the split.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const flat = (s) => s.replace(/\s+/g, " ");

const SKIP = new Set(["node_modules", "dist", "out", ".git", ".venv", "__pycache__"]);
function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name) || (name.startsWith(".") && name !== ".github")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const CODE = /\.(ts|mts|mjs|js|cjs|py|sh|yml|yaml)$/;
const codeFiles = ["core", "packages", "tools", "reference", "designs", "spec", ".github"]
  .filter((d) => existsSync(join(root, d)))
  .flatMap((d) => walk(join(root, d)))
  .filter((p) => CODE.test(p))
  .map((p) => relative(root, p).split("\\").join("/"));

const RENDER_WRITER = "reference/keys/flex-pair/test/reference.test.ts";
// The access switch reference tests splice their generated card blocks under
// HBF_ACCEPT, each into one Markdown file (D-587 names them beside D-227).
const CARD_WRITERS = [
  "reference/keys/access-switch/coupon/test/reference.test.ts",
  "reference/keys/access-switch/test/reference.test.ts",
];
const JSON_GOLDENS = ["build.json", "report.json", "edit.json", "artifacts.json"];

test("only the named render writers read HBF_ACCEPT", () => {
  const readers = codeFiles.filter((p) => /process\.env(\.HBF_ACCEPT|\[\s*["']HBF_ACCEPT["']\s*\])|os\.environ[^\n]*HBF_ACCEPT/.test(read(p)));
  assert.deepEqual([...readers].sort(), [RENDER_WRITER, ...CARD_WRITERS].sort());
});

test("each card writer is named in the decision log and writes only its one Markdown block, then compares it", () => {
  const log = read("docs/plan/DECISIONS.md");
  for (const w of CARD_WRITERS) {
    assert.ok(log.includes(w), `${w} is named in DECISIONS.md`);
    const src = read(w);
    const writes = [...src.matchAll(/writeFileSync\(\s*(\w+)\s*,\s*splice\(/g)].map((x) => x[1]);
    assert.equal(writes.length, 1, `${w}: one splice write`);
    assert.equal([...src.matchAll(/writeFileSync\(/g)].length, 1, `${w}: no other write`);
    assert.match(src, new RegExp(`const ${writes[0]} = [^\\n]*\\.md"`), `${w}: the write target is a Markdown file`);
    assert.match(src, new RegExp(`expect\\(between\\(readFileSync\\(${writes[0]}, "utf8"\\)`), `${w}: the block is compared after the optional write`);
  }
});

test("no CI workflow, package script or tool sets HBF_ACCEPT or passes --accept to parity", () => {
  const pkgs = ["package.json", ...walk(root).map((p) => relative(root, p)).filter((p) => /(^|\/)package\.json$/.test(p) && !p.includes("node_modules"))];
  for (const p of new Set(pkgs)) {
    const scripts = JSON.stringify(JSON.parse(read(p)).scripts ?? {});
    assert.doesNotMatch(scripts, /HBF_ACCEPT/, `${p} scripts`);
    assert.doesNotMatch(scripts, /parity[^"]*--accept/, `${p} scripts`);
  }
  for (const p of codeFiles.filter((f) => f.startsWith(".github/"))) {
    // Comments may say "never --accept"; commands may not set or pass it.
    const lines = read(p).split("\n").filter((l) => !/^\s*#/.test(l));
    for (const l of lines) {
      assert.doesNotMatch(l, /HBF_ACCEPT/, `${p}: ${l.trim()}`);
      assert.doesNotMatch(l, /hbf parity[^\n]*--accept/, `${p}: ${l.trim()}`);
    }
  }
});

// The probe sim expected/ figures have one writer, run.mjs --write-expected,
// run by a person who reads the diff (D-227); CI and scripts never pass it.
test("the probe sim expected/ files have one writer, never run by CI or a script", () => {
  const SIM = "tools/skeleton/flexpair_probe/sim/run.mjs";
  const passers = codeFiles.filter((p) => p !== SIM && p !== "tools/test/golden-writers.test.mjs" && /--write-expected/.test(read(p).split("\n").filter((l) => !/^\s*(\/\/|#|\*)/.test(l)).join("\n")));
  assert.deepEqual(passers, [], "no code but run.mjs names --write-expected outside a comment");
  for (const p of ["package.json", ...walk(root).map((x) => relative(root, x)).filter((x) => /(^|\/)package\.json$/.test(x) && !x.includes("node_modules"))]) {
    assert.doesNotMatch(JSON.stringify(JSON.parse(read(p)).scripts ?? {}), /--write-expected/, `${p} scripts`);
  }
  const src = read(SIM);
  assert.match(src, /writeExpected && o\.analysis !== undefined\) throw/, "run.mjs refuses --write-expected with --analysis");
  const d = flat(read("docs/plan/DECISIONS.md"));
  assert.ok(d.includes("node tools/skeleton/flexpair_probe/sim/run.mjs --write-expected"), "D-227 names the writer");
});

test("parity writes exactly the four JSON goldens", () => {
  const src = read("core/src/commands/parity.ts");
  const m = src.match(/export const GOLDEN_FILES = \[([^\]]*)\] as const/);
  assert.ok(m, "GOLDEN_FILES in parity.ts");
  assert.deepEqual([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]), JSON_GOLDENS);
  assert.doesNotMatch(src, /rsvg-convert|\.svg|\.png/, "parity renders nothing");
});

test("under HBF_ACCEPT the reference test writes only section renders into expected/ and compares the SVG", () => {
  const src = read(RENDER_WRITER);
  // Every write goes to a name declared in this file; each must be a section
  // SVG under expected/ or the README, never a JSON golden.
  const writes = [...src.matchAll(/writeFileSync\(\s*(\w+)\s*,/g)].map((x) => x[1]);
  assert.ok(writes.length > 0, "writes found");
  for (const w of writes) {
    if (w === "README") continue;
    const decl = src.match(new RegExp(`const ${w} = path\\.join\\(EXPECTED,\\s*([^)]*)\\)`));
    assert.ok(decl, `write target ${w} is declared under expected/`);
    assert.match(decl[1].trim(), /^`section-key\$\{[^}]+\}\.svg`$/, `write target ${w}`);
  }
  assert.doesNotMatch(src, /writeFileSync\([^)]*\.json/, "no JSON golden written");
  assert.match(src, /expect\(readFileSync\(file, "utf8"\)\)\.toBe\(svg\)/, "the SVG is compared");
  assert.match(src, /spawnSync\("rsvg-convert"/, "the PNG is rendered from the SVG");
  assert.match(src, /D-227/, "the test cites the decision");
});

test("DECISIONS.md D-227 names the four JSON goldens, the render writer and the compared SVG", () => {
  const d = read("docs/plan/DECISIONS.md");
  const start = d.indexOf("\n### D-227 ");
  assert.ok(start >= 0, "D-227 entry");
  const end = d.slice(start + 1).search(/\n##+ /);
  const body = flat(d.slice(start, end < 0 ? undefined : start + 1 + end));
  for (const f of JSON_GOLDENS) assert.ok(body.includes(f), `D-227 names ${f}`);
  assert.ok(body.includes("HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair"), "D-227 names the render writer");
  assert.match(body, /the SVG is the compared golden/);
  assert.match(d, /^\| D-227 \| [^|]+ \| decided \|/m, "index row");
  assert.match(d, /^\| D-152 \| Testing pyramid \| decided, refined by [^|]*D-227/m, "D-152 index names the refinement");
});

test("every plan sentence that makes parity the only updater limits it to the JSON goldens and cites D-227", () => {
  const plan = walk(join(root, "docs", "plan")).filter((p) => p.endsWith(".md"));
  const ONLY = /only (golden )?updater|only way a (JSON )?golden changes|change only through `?(npx --no-install )?hbf parity --accept|Only `hbf parity\s+--accept`/;
  let seen = 0;
  for (const p of plan) {
    const rel = relative(root, p);
    // The decision log: DECISIONS.md and the per-entry files it is generated from (D-569).
    if (rel.endsWith("DECISIONS.md") || rel.startsWith("docs/plan/decisions/")) continue;
    // A paragraph or a table row is the unit a claim and its citation share.
    const units = read(rel).split(/\n\s*\n/).flatMap((u) => (u.trimStart().startsWith("|") ? u.split("\n") : [u]));
    for (const u of units.map(flat)) {
      if (!ONLY.test(u) || !/parity/.test(u)) continue;
      seen++;
      assert.match(u, /D-227/, `${rel}: ${u.slice(0, 160)}`);
      assert.match(u, /JSON golden/, `${rel}: ${u.slice(0, 160)}`);
    }
  }
  assert.ok(seen >= 5, `parity-updater claims found: ${seen}`);
});

test("M-S-T09 step 2 names HBF_ACCEPT as the writer of the section renders and the print card", () => {
  const ms = read("docs/plan/milestones/M-S-walking-skeleton.md");
  const t09 = ms.slice(ms.indexOf("\n## M-S-T09"), ms.indexOf("\n## M-S-T10"));
  const step2 = flat(t09.slice(t09.indexOf("\n2. "), t09.indexOf("\n3. ")));
  assert.match(step2, /HBF_ACCEPT=1 npx vitest run reference\/keys\/flex-pair/);
  assert.match(step2, /section-key<n>\.svg/);
  assert.match(step2, /print card/);
  assert.match(step2, /D-227/);
});
