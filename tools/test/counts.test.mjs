import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repo, "tools/counts.mjs");

const INPUTS = [
  "packages/checks/seed/checks.seed.json",
  "packages/mechanisms/seed/mechanisms.seed.yaml",
  "packages/archetypes/seed/archetypes.seed.yaml",
  "packages/mechanisms/src/defs",
  "packages/archetypes/src/defs",
  "packages/archetypes/src/aliases.ts",
  "registry/tools.json",
  "tools/seed-manifest.json",
  "tools/counts.external.json",
  "spec/commands.ts",
  "knowledge",
  "docs/plan/PLAN.md",
  "docs/plan/DECISIONS.md",
  "docs/plan/CHECKS.md",
  "packages/ui/package.json",
  "tools/vendor",
];

function tempCopy() {
  const dir = mkdtempSync(join(tmpdir(), "hbf-counts-"));
  for (const p of INPUTS) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    cpSync(join(repo, p), join(dir, p), { recursive: true });
  }
  return dir;
}

const run = (dir) => execFileSync(process.execPath, [script, `--root=${dir}`], { encoding: "utf8" });
const outputs = (dir) => ["docs/plan/counts.json", "docs/plan/PLAN.md"].map((p) => readFileSync(join(dir, p)));
const counts = (dir) => JSON.parse(readFileSync(join(dir, "docs/plan/counts.json"), "utf8"));

test("two runs give byte-identical output", () => {
  const dir = tempCopy();
  try {
    run(dir);
    const first = outputs(dir);
    run(dir);
    const second = outputs(dir);
    assert.ok(first[0].equals(second[0]), "counts.json changed on the second run");
    assert.ok(first[1].equals(second[1]), "PLAN.md changed on the second run");
    const plan = first[1].toString("utf8");
    assert.equal(plan.split("<!-- counts:begin -->").length, 2, "one begin marker");
    assert.equal(plan.split("<!-- counts:end -->").length, 2, "one end marker");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("changing one check's severity moves checks.block and checks.warn", () => {
  const dir = tempCopy();
  try {
    run(dir);
    const before = counts(dir).checks;
    const seedPath = join(dir, "packages/checks/seed/checks.seed.json");
    const seed = JSON.parse(readFileSync(seedPath, "utf8"));
    const target = seed.checks.find((c) => c.severity === "block");
    assert.ok(target, "the seed holds a block check");
    target.severity = "warn";
    writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
    run(dir);
    const after = counts(dir).checks;
    assert.equal(after.block, before.block - 1);
    assert.equal(after.warn, before.warn + 1);
    assert.equal(after.total, before.total);
    const plan = readFileSync(join(dir, "docs/plan/PLAN.md"), "utf8");
    assert.match(plan, new RegExp(`\\| seeded checks \\| ${after.total} \\(${after.block} block, ${after.warn} warn\\)`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a hand-edited Appendix B count is reverted", () => {
  const dir = tempCopy();
  try {
    run(dir);
    const planPath = join(dir, "docs/plan/PLAN.md");
    const good = readFileSync(planPath, "utf8");
    const total = counts(dir).tools.total;
    const edited = good.replace(`| registry tools | ${total} (`, `| registry tools | ${total + 1} (`);
    assert.notEqual(edited, good, "the registry tools row is in the generated table");
    writeFileSync(planPath, edited);
    run(dir);
    assert.equal(readFileSync(planPath, "utf8"), good);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The M00 verifier ran the derived row without `git add -A` while 82 files sat
// untracked under knowledge/designs/; counts stayed clean in that form and
// drifted in the card's form (D-222). An untracked counted file now fails the run.
test("an untracked file under knowledge/ fails the run until it is staged", () => {
  const dir = tempCopy();
  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    git("init", "-q");
    git("add", "-A");
    run(dir);
    git("add", "-A");
    const before = counts(dir).knowledge;
    const stray = join(dir, "knowledge/designs-probe/record.md");
    mkdirSync(dirname(stray), { recursive: true });
    writeFileSync(stray, "one two three\n");
    writeFileSync(join(dir, "knowledge/.DS_Store"), "x");
    let failed = null;
    try { run(dir); } catch (e) { failed = e; }
    assert.ok(failed, "counts exits non-zero with an untracked knowledge file");
    assert.match(String(failed.stderr), /1 untracked files under knowledge\/ .*knowledge\/designs-probe\/record\.md/);
    assert.deepEqual(counts(dir).knowledge, before, "the untracked file is not counted");
    git("add", "-A");
    run(dir);
    const after = counts(dir).knowledge;
    assert.equal(after.files, before.files + 1);
    assert.equal(after.words, before.words + 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The global verifier of 2026-10-06 ran the derived row while other agents
// held unstaged edits (D-230 in DECISIONS.md, words in knowledge/designs/);
// counts read the working tree and rewrote PLAN.md although nothing staged had
// moved. In a git checkout counts now read the staged blob of every source.
test("an unstaged edit to a staged source does not move the counts", () => {
  const dir = tempCopy();
  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    git("init", "-q");
    git("add", "-A");
    run(dir);
    git("add", "-A");
    const before = counts(dir);
    const plan = readFileSync(join(dir, "docs/plan/PLAN.md"), "utf8");
    const decisions = join(dir, "docs/plan/DECISIONS.md");
    const next = String(before.decisions.last + 1).padStart(3, "0");
    writeFileSync(decisions, readFileSync(decisions, "utf8") + `\n### D-${next} Probe\n`);
    const record = join(dir, "knowledge/designs/INDEX.md");
    writeFileSync(record, readFileSync(record, "utf8") + "\nfour more probe words\n");
    run(dir);
    assert.deepEqual(counts(dir), before, "unstaged edits leave counts.json unmoved");
    assert.equal(readFileSync(join(dir, "docs/plan/PLAN.md"), "utf8"), plan, "unstaged edits leave PLAN.md unmoved");
    git("add", "-A");
    run(dir);
    const after = counts(dir);
    assert.equal(after.decisions.total, before.decisions.total + 1);
    assert.equal(after.decisions.last, before.decisions.last + 1);
    assert.equal(after.knowledge.files, before.knowledge.files);
    assert.equal(after.knowledge.words, before.knowledge.words + 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The M-S report found "149 with the seeded rows": entered plus seeded counted
// CHK-NET-29 twice, since it is entered in CHECKS.md 9.4 and seeded. The row now
// counts distinct ids, and a newly seeded id that is already entered leaves it unmoved.
test("entered checks with the seeded rows counts distinct ids", () => {
  const dir = tempCopy();
  try {
    run(dir);
    const before = counts(dir).checks;
    assert.ok(before.enteredAndSeeded.includes("CHK-NET-29"), "CHK-NET-29 is entered and seeded");
    assert.equal(before.enteredWithSeeded, before.entered + before.total - before.enteredAndSeeded.length);
    const md = readFileSync(join(dir, "docs/plan/CHECKS.md"), "utf8");
    const seedPath = join(dir, "packages/checks/seed/checks.seed.json");
    const seed = JSON.parse(readFileSync(seedPath, "utf8"));
    const seeded = new Set(seed.checks.map((c) => c.id));
    const sec9 = md.slice(md.indexOf("\n## 9."));
    const extra = [...sec9.matchAll(/^\| *`?(CHK-[A-Z0-9]+-\d+)/gm)].map((m) => m[1]).find((id) => !seeded.has(id));
    assert.ok(extra, "an entered id that is not seeded");
    seed.checks.push({ ...seed.checks[0], id: extra });
    writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
    run(dir);
    const after = counts(dir).checks;
    assert.equal(after.total, before.total + 1);
    assert.equal(after.entered, before.entered);
    assert.equal(after.enteredWithSeeded, before.enteredWithSeeded, "an id in both is counted once");
    assert.ok(after.enteredAndSeeded.includes(extra));
    const plan = readFileSync(join(dir, "docs/plan/PLAN.md"), "utf8");
    assert.match(plan, new RegExp(`\\| entered checks \\| ${after.entered} in CHECKS\\.md section 9 [^|]*, ${after.enteredWithSeeded} distinct with the seeded rows \\(`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// M09-T02: the bench layer adds at least the nine classes of D-116 to the
// 0.2.0 stylesheet; the 0.2.0 figure is the external snapshot row, so the
// vendored tarball is held against a number this tool does not compute.
test("hackbuild-ui class count reads the vendored tarball and rises by the nine bench classes", () => {
  const dir = tempCopy();
  try {
    run(dir);
    const ui = counts(dir).ui;
    assert.ok(ui, "packages/ui depends on @virgilvox/hackbuild-ui");
    const base = JSON.parse(readFileSync(join(repo, "tools/counts.external.json"), "utf8")).find((r) => r.key === "hackbuildUi.hbClasses");
    assert.ok(ui.hbClasses >= Number(base.value) + 9, `${ui.hbClasses} classes, 0.2.0 had ${base.value}`);
    const plan = readFileSync(join(dir, "docs/plan/PLAN.md"), "utf8");
    assert.match(plan, new RegExp(`\\| hackbuild-ui \`\\.hb-\` classes \\| ${ui.hbClasses} in the stylesheet`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hackbuild-ui class count follows the stylesheet inside the tarball", () => {
  const dir = tempCopy();
  try {
    const stage = join(dir, "stage");
    mkdirSync(join(stage, "package/dist/styles"), { recursive: true });
    writeFileSync(join(stage, "package/dist/styles/hackbuild.css"), ".hb-a{ color:red } .hb-b .hb-a{ } .hb-c-d:hover{ }\n");
    writeFileSync(join(stage, "package/package.json"), "{}\n");
    execFileSync("tar", ["-czf", join(dir, "tools/vendor/probe.tgz"), "-C", stage, "package"]);
    const pkgPath = join(dir, "packages/ui/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.dependencies["@virgilvox/hackbuild-ui"] = "file:../../tools/vendor/probe.tgz";
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    run(dir);
    assert.equal(counts(dir).ui.hbClasses, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
