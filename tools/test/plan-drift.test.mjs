// Plan drift: numbers and commands typed into docs/plan that a later milestone changed in code.
// Each test reads the plan text and the thing it describes, and fails when they disagree, so
// a card defect a report names cannot stay in the card. Added by the implementation audit of
// 2026-10-05 (findings on CHECKS.md, the M-1, M-S and M00 cards, TESTING.md and the M00 report).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));

const counts = json("docs/plan/counts.json");
// The seeded rows; rows entered later carry enteredBy (M04-T12) and CHECKS.md counts them in section 9.
const seed = json("packages/checks/seed/checks.seed.json").checks.filter((r) => r.enteredBy === undefined);
const CHECKS = read("docs/plan/CHECKS.md");
const M1 = read("docs/plan/milestones/M-1-housekeeping.md");
const MS = read("docs/plan/milestones/M-S-walking-skeleton.md");
const M00 = read("docs/plan/milestones/M00-foundation.md");
const TESTING = read("docs/plan/TESTING.md");
const REPOS = read("docs/plan/REPOS.md");
const CI = read(".github/workflows/ci.yml");

/** Text of one `## <heading prefix>` section up to the next `## `. */
function section(md, prefix) {
  const start = md.indexOf(`\n## ${prefix}`);
  assert.ok(start >= 0, `section ${prefix} present`);
  const next = md.indexOf("\n## ", start + 4);
  return md.slice(start, next < 0 ? undefined : next);
}

/** Every match of re in text; fails when there is none, so a reworded sentence is noticed. */
function all(text, re, what) {
  const m = [...text.matchAll(re)];
  assert.ok(m.length > 0, `${what}: pattern ${re} found`);
  return m;
}

const tally = (rows, key) => rows.reduce((o, r) => ((o[key(r)] = (o[key(r)] ?? 0) + 1), o), {});

test("CHECKS.md seeded counts equal counts.json", () => {
  const { total, block, warn, entered } = counts.checks;
  for (const m of all(CHECKS, /Counts as of [\d-]+: (\d+) block, (\d+) warn, 0 note over the (\d+) seeded rows/g, "section 3")) {
    assert.deepEqual([+m[1], +m[2], +m[3]], [block, warn, total], m[0]);
  }
  for (const m of all(CHECKS, /\((\d+) rows: (\d+) block, (\d+) warn/g, "section 5 note")) {
    assert.deepEqual([+m[1], +m[2], +m[3]], [total, block, warn], m[0]);
  }
  for (const m of all(CHECKS, /^\| total \| \| \| (\d+) \| (\d+) \|/gm, "section 5 total")) {
    assert.deepEqual([+m[1], +m[2]], [total, entered], m[0]);
  }
  for (const m of all(CHECKS, /All (\d+) rows with the v4 title/g, "section 6")) assert.equal(+m[1], total, m[0]);
});

test("CHECKS.md family table seeded column equals the seed per prefix", () => {
  const byPrefix = tally(seed, (r) => r.id.split("-")[1]);
  const fam = section(CHECKS, "5.");
  let rows = 0;
  for (const line of fam.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (!/^[A-Z0-9]{2,3}$/.test(cells[1] ?? "") || cells[1] === "prefix") continue;
    rows++;
    assert.equal(+cells[4], byPrefix[cells[1]] ?? 0, `${cells[1]} seeded`);
  }
  assert.ok(rows >= 13, "family rows parsed");
});

test("CHECKS.md legal-kind breakdown equals the seed", () => {
  const k = tally(seed, (r) => r.legalKind);
  const [m] = all(CHECKS, /equality for all (\d+) rows \(boolean (\d+), interval (\d+), set (\d+), multipleOf (\d+)/g, "legal kinds");
  assert.deepEqual([+m[1], +m[2], +m[3], +m[4], +m[5]], [seed.length, k.boolean ?? 0, k.interval ?? 0, k.set ?? 0, k.multipleOf ?? 0], m[0]);
});

test("CHECKS.md flex-pair CHK-PRT-04 wall equals the expected report", () => {
  const f = json("reference/keys/flex-pair/expected/report.json").findings.find((x) => x.id === "CHK-PRT-04");
  const [m] = all(CHECKS, /flex-pair walls\s+\((\d+(?:\.\d+)?) mm at defaults/g, "PRT-04 note");
  assert.equal(+m[1], Math.round(f.measured * 100) / 100, m[0]);
});

test("CHECKS.md section 15 lists no seeded id as entered by this file", () => {
  const seeded = new Set(seed.map((r) => r.id));
  for (const line of section(CHECKS, "15.").split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (!/^entered by this file/.test(cells[2] ?? "")) continue;
    for (const id of cells[1].match(/CHK-[A-Z0-9]+-\d{2}/g) ?? []) assert.ok(!seeded.has(id), `${id} is seeded, not appended`);
  }
});

test("M-1 counts acceptance command exits 0", () => {
  const card = section(M1, "M-1-T");
  const m = M1.match(/`(node -e 'const c=require\("\.\/docs\/plan\/counts\.json"\);[^`]*')`/);
  assert.ok(m && card, "counts node -e line present");
  const script = m[1].slice("node -e '".length, -1);
  execFileSync(process.execPath, ["-e", script], { cwd: root });
});

test("M-1 seed-conformance acceptance counts equal counts.json", () => {
  const [m] = all(M1, /asserts (\d+) checks \((\d+) block, (\d+) warn\), 0 empty `origin\.what`, (\d+) with origin\.date, (\d+) with legalKind/g, "T07 acceptance");
  const { total, block, warn } = counts.checks;
  assert.deepEqual([+m[1], +m[2], +m[3], +m[4], +m[5]], [total, block, warn, total, total], m[0]);
});

test("setup-uv pin in the M-1 card and TESTING.md equals ci.yml", () => {
  const ci = new Set([...CI.matchAll(/astral-sh\/setup-uv@(\S+)/g)].map((m) => m[1]));
  assert.equal(ci.size, 1, "one setup-uv pin in ci.yml");
  const [pin] = ci;
  for (const [name, text] of [["M-1", M1], ["TESTING.md", TESTING]]) {
    for (const m of all(text, /astral-sh\/setup-uv@([\w.]+)/g, name)) assert.equal(m[1], pin, `${name}: ${m[0]}`);
  }
});

test("M-1 node-version-file acceptance holds against ci.yml", () => {
  assert.ok(!/\| grep -c 'node-version-file: \.nvmrc' [^\n]*-> \d+;/.test(M1), "no fixed job count for node-version-file");
  assert.ok((CI.match(/node-version-file: \.nvmrc/g) ?? []).length >= 1);
  assert.equal((CI.match(/node-version:/g) ?? []).length, 0);
});

test("M-S T10 prints the file the flex-pair print card writes", () => {
  const readme = read("reference/keys/flex-pair/README.md");
  const file = readme.match(/^- file: (out\/\S+\.3mf),/m)?.[1];
  assert.ok(file, "print card file line");
  const t10 = section(MS, "M-S-T10");
  const inputs = t10.slice(t10.indexOf("Inputs:"), t10.indexOf("Steps:"));
  assert.match(inputs, new RegExp(`reference/keys/flex-pair/${file.replace(/[.]/g, "\\.")}\\b`));
});

test("M-S T06 result count equals the expected report", () => {
  const n = json("reference/keys/flex-pair/expected/report.json").findings.length;
  const words = { six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const t06 = section(MS, "M-S-T06");
  const acc = t06.slice(t06.indexOf("Acceptance:"));
  const [m] = all(acc, /exit\s+0, (\w+) results/g, "T06 check.run row");
  assert.equal(words[m[1]] ?? +m[1], n, m[0]);
});

test("M-S Exit T06 row names every skip and warn in the expected report", () => {
  const findings = json("reference/keys/flex-pair/expected/report.json").findings;
  const row = section(MS, "Exit").split("\n").find((l) => /\| T06 \|/.test(l));
  assert.ok(row, "Exit T06 row present");
  for (const v of ["skip", "warn"]) {
    const want = findings.filter((f) => f.verdict === v).map((f) => f.id).sort();
    const got = [...row.matchAll(new RegExp(`(CHK-[A-Z0-9]+-\\d+) ${v}\\b`, "g"))].map((m) => m[1]).sort();
    assert.deepEqual(got, want, `${v} ids in: ${row}`);
  }
});

test("M-S T07 acceptance writes the 3MF before validating it", () => {
  const t07 = section(MS, "M-S-T07");
  const acc = t07.slice(t07.indexOf("Acceptance:"));
  const write = acc.search(/hbf\s+export\.run reference\/keys\/flex-pair/);
  const validate = acc.indexOf("validate_3mf.py --overlap");
  assert.ok(write >= 0 && write < validate, "an export.run line precedes the validator line");
});

test("determinism legs in M00-T14, TESTING.md 7 and REPOS.md equal the ci.yml node matrix", () => {
  const legs = [...CI.matchAll(/os: (\S+), kind: node/g)].map((m) => m[1]).sort();
  assert.ok(legs.length >= 2, "ci.yml node legs");
  const t14 = section(M00, "M00-T14");
  const step1 = t14.slice(t14.indexOf("1. "), t14.indexOf("\n2. "));
  const det = section(TESTING, "7.");
  const reposRow = REPOS.split("\n").find((l) => l.startsWith("| `determinism` and `determinism-compare` |")) ?? "";
  for (const [name, text] of [["M00-T14 step 1", step1], ["TESTING.md 7", det], ["REPOS.md", reposRow]]) {
    for (const os of legs) assert.ok(text.includes(`\`${os}\``), `${name} names ${os}`);
  }
});

test("TESTING.md 6.1 corpus modes equal the corpus manifest", () => {
  const manifest = json("tools/corpus/3mf/manifest.json");
  const rows = manifest.rows ?? manifest;
  const modeOf = (dir) => new Set(rows.filter((r) => r.path.startsWith(dir)).map((r) => r.mode));
  for (const [label, dir] of [["BOSS", "boss/"], ["SPRUE plates", "sprue/"], ["legacy bench exports", "legacy/"]]) {
    const line = TESTING.split("\n").find((l) => l.startsWith(`| ${label} |`));
    assert.ok(line, `${label} row`);
    const mode = line.split("|")[3].trim().replace(/`/g, "");
    const modes = modeOf(dir);
    assert.ok(modes.size >= 1, `${dir} rows in the manifest`);
    for (const m of modes) assert.ok(m === mode || m.startsWith(mode), `${label}: TESTING.md ${mode}, manifest ${m}`);
  }
});

test("M00-T06 replay line matches the sweep's own replay comment", () => {
  const src = read("packages/mesh/test/sweep.property.ts");
  const replay = src.match(/Replay: (FC_SEED=<s> FC_PATH=<p> FC_FAMILY=<f>)/)?.[1];
  assert.ok(replay, "sweep replay comment");
  const t06 = section(M00, "M00-T06").replace(/\s+/g, " ");
  assert.ok(t06.includes(replay), "card names the replay environment");
  assert.ok(!t06.includes("--seed <s>"), "no CLI seed flag");
});

test("M00-T02 preset ids are the ids the profile loads", () => {
  const t02 = section(M00, "M00-T02");
  for (const id of ["ffc5p_20260819", "ffc5p-n025_20260819"]) {
    assert.ok(t02.includes(id), `card names ${id}`);
    assert.ok(read("docs/plan/PROFILE.md").includes(id), `PROFILE.md names ${id}`);
  }
});

test("M00-T10 fixture size is within 15 percent of the corpus on disk", () => {
  let bytes = 0;
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      if (n === "__pycache__") continue;
      const p = join(d, n);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else bytes += s.size;
    }
  };
  const dir = join(root, "tools/corpus/3mf");
  if (!existsSync(dir)) return;
  walk(dir);
  const [m] = all(section(M00, "M00-T10"), /the fixture set is about (\d+) MB/g, "fixture size");
  const mb = bytes / 2 ** 20;
  assert.ok(Math.abs(+m[1] - mb) / mb <= 0.15, `card ${m[1]} MB, disk ${mb.toFixed(1)} MiB`);
});

test("every M00 deliverable MILESTONES.md assigns has an M00 card and Exit row", () => {
  // MILESTONES.md 1.3: "M00 adds the gate, the D-178 reader and sandbox".
  assert.match(read("docs/plan/MILESTONES.md"), /M00 adds the gate, the D-178 reader and sandbox/);
  const card = M00.match(/\n## (M00-T\d+) [^\n]*\n[\s\S]*?(?=\n## )/g)?.find((c) => /D-178/.test(c.split("Steps:")[0]) && /source\.ts/.test(c));
  assert.ok(card, "an M00 card carries the D-178 reader and sandbox");
  const id = card.match(/## (M00-T\d+)/)[1];
  const exit = section(M00, "Exit");
  assert.ok(exit.includes(`| ${id} | \`npm test -w packages/chase`), "Exit row for the chase source reader");
  assert.ok(exit.includes(`| ${id} | \`npm test -w core -- sandbox`), "Exit row for the build sandbox");
  assert.ok(exit.includes("reader.fuzz.prop.test.ts"), "Exit row for the reader fuzz job");
});

// The report is dated; its value is not tied to the golden, which later fixes may regenerate.
// .hbf-notes is gitignored, so a fresh checkout skips this test.
test("M00 report CHK-NET-02 clearance is computed, not measured", { skip: !existsSync(join(root, ".hbf-notes/m00-report.md")) && ".hbf-notes absent" }, () => {
  const report = read(".hbf-notes/m00-report.md");
  const row = report.split("\n").find((l) => l.startsWith("| CHK-NET-02 least clearance |"));
  assert.ok(row, "clearance row");
  assert.ok(!/measured/.test(row), "no measured qualifier on a figure computed from the build polygons (D-007)");
  for (const cell of row.split("|").slice(2, 4)) assert.match(cell, /\(computed/, `qualifier in ${cell.trim()}`);
});

// D-223 propagation: the flex-pair reference is the PIP flex cone key on four slots and the
// revolve route. Plan prose that restates the slot count, the routes or the CHK-KEY-01 band must
// read the reference, and the skeleton numbers (cone 3.2 built at 3.36, band 1.344 to 1.680) may
// appear only where the same paragraph names the spec fixture they still hold for.
const flexChase = read("reference/keys/flex-pair/chase.ts");
const flexBuild = read("reference/keys/flex-pair/build.ts");
const SLOT_WORDS = { 2: "two", 3: "three", 4: "four", 5: "five" };

test("flex-pair slot count in PLAN.md section 3 and CLAUDE.md equals the reference chase", () => {
  const slots = new Set([...flexChase.matchAll(/\{ slot: (\d+), material:/g)].map((m) => +m[1])).size;
  assert.ok(slots >= 1, "chase slots parsed");
  const word = SLOT_WORDS[slots];
  for (const [name, text] of [["PLAN.md", read("docs/plan/PLAN.md")], ["CLAUDE.md", read("CLAUDE.md")]]) {
    for (const m of all(text.replace(/\s+/g, " "), /(\w+)-slot 3MF/g, name)) assert.equal(m[1], word, `${name}: ${m[0]}`);
  }
});

test("MILESTONES.md M-S pins and build.ts freeze name every route the flex-pair reference runs", () => {
  const routes = new Set([...flexBuild.matchAll(/route: "(\w+)"/g)].map((m) => m[1]));
  assert.ok(routes.has("revolve"), "reference runs the revolve route (D-223)");
  const ms = read("docs/plan/MILESTONES.md").split("\n");
  const pins = ms.find((l) => l.startsWith("| M-S | manifold-3d")) ?? "";
  const freeze = ms.find((l) => l.startsWith("| build.ts | M-S |")) ?? "";
  const specRow = read("spec/README.md").split("\n").find((l) => l.startsWith("| `build.ts` | draft | M-S |")) ?? "";
  for (const [name, row] of [["MILESTONES.md pins", pins], ["MILESTONES.md 1.5", freeze], ["spec/README.md", specRow]]) {
    assert.ok(row, `${name} row present`);
    for (const r of routes) assert.ok(row.includes(r), `${name} names the ${r} route`);
  }
});

test("skeleton CHK-KEY-01 band appears only beside the spec fixture it holds for", () => {
  const docs = [
    "CLAUDE.md",
    ...readdirSync(join(root, "docs/plan")).filter((n) => n.endsWith(".md")).map((n) => `docs/plan/${n}`),
    ...readdirSync(join(root, "docs/plan/milestones")).filter((n) => n.endsWith(".md")).map((n) => `docs/plan/milestones/${n}`),
  ].filter((p) => p !== "docs/plan/DECISIONS.md"); // the D-223 Supersedes row records old to new
  let seen = 0;
  for (const p of docs) {
    for (const para of read(p).split(/\n\s*\n|\n(?=\|)/)) {
      const flat = para.replace(/\s+/g, " ");
      if (!/1\.344 to 1\.680|built at 3\.36|builds it at 3\.36|snaps to 3\.36/.test(flat)) continue;
      seen++;
      assert.match(flat, /spec fixture/, `${p}: skeleton band outside a spec fixture note: ${flat.slice(0, 160)}`);
    }
  }
  assert.ok(seen >= 1, "the spec fixture note is still present somewhere");
});

// Audit of 2026-10-08 (plan-drift lens): generated counts, decision numbers, the D-234
// dependency, the D-232 and D-233 retired figures, the README verified block format,
// profile constants and the virtual print runs the cards name.

// The derived job reads the staged tree (counts.mjs reads index blobs), so this test checks out
// the staged counts inputs into a temp folder, reruns counts.mjs there and compares its output
// with the staged counts.json and PLAN.md. The input list is counts.test.mjs's INPUTS.
const COUNT_INPUTS = read("tools/test/counts.test.mjs").match(/const INPUTS = \[([\s\S]*?)\];/)[1].match(/"[^"]+"/g).map((s) => JSON.parse(s));
const inGit = (() => {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() !== "";
  } catch {
    return false;
  }
})();

test("staged counts.json and PLAN.md Appendix B equal a fresh counts.mjs run", { skip: !inGit && "not a git checkout" }, () => {
  assert.ok(COUNT_INPUTS.length >= 10, "counts inputs parsed");
  const tmp = execFileSync("mktemp", ["-d"], { encoding: "utf8" }).trim();
  try {
    const files = execFileSync("git", ["-C", root, "ls-files", "-z", "--cached", "--", ...COUNT_INPUTS], { encoding: "utf8", maxBuffer: 1 << 26 });
    execFileSync("git", ["-C", root, "checkout-index", "-z", "--stdin", `--prefix=${tmp}/`], { input: files });
    execFileSync(process.execPath, [join(root, "tools/counts.mjs"), `--root=${tmp}`], { encoding: "utf8" });
    for (const p of ["docs/plan/counts.json", "docs/plan/PLAN.md"]) {
      const staged = execFileSync("git", ["-C", root, "show", `:${p}`], { encoding: "utf8", maxBuffer: 1 << 26 });
      assert.equal(readFileSync(join(tmp, p), "utf8"), staged, `${p} is stale: run node tools/counts.mjs and stage it`);
    }
  } finally {
    execFileSync("rm", ["-rf", tmp]);
  }
});

test("the latest flex-pair reportHash a decision records equals the golden", () => {
  const golden = json("reference/keys/flex-pair/expected/report.json").reportHash;
  const moves = [...read("docs/plan/DECISIONS.md").matchAll(/reportHash ([0-9a-f]{8}) becomes ([0-9a-f]{8})/g)];
  assert.ok(moves.length >= 1, "a reportHash move is recorded");
  const last = moves.at(-1);
  assert.equal(last[2], golden.slice(0, 8), `${last[0]}; golden ${golden.slice(0, 8)}`);
});

test("M04's exit B dependency reads provisional (D-234) in MILESTONES.md and PLAN.md", () => {
  const ms = read("docs/plan/MILESTONES.md");
  const plan = read("docs/plan/PLAN.md");
  for (const [name, text] of [["MILESTONES.md", ms], ["PLAN.md", plan]]) {
    assert.doesNotMatch(text.replace(/\s+/g, " "), /M04 waits/, `${name} says M04 waits`);
  }
  const rows = ms.split("\n").filter((l) => l.startsWith("| M04 |") && l.includes("M-S exit B"));
  assert.ok(rows.length >= 2, "Part 1 and Part 4 M04 rows");
  for (const r of rows) assert.match(r, /M-S exit B \(provisional, D-234\)/, r);
  assert.match(ms, /MSB -->\|provisional, D-234\| M04/, "mermaid edge labelled");
  const exitB = ms.split("\n").find((l) => l.startsWith("| M-S exit B |")) ?? "";
  assert.match(exitB, /D-234/, exitB);
  for (const para of [...ms.split(/\n\s*\n/), ...plan.split(/\n\s*\n/)]) {
    const flat = para.replace(/\s+/g, " ");
    if (/M04 (needs|on) M-S exit B/.test(flat)) assert.match(flat, /D-234/, flat.slice(0, 200));
  }
});

test("the retired OGEE 577 and the unverified SLUG 126 of 128 carry their decisions", () => {
  const files = [
    ...readdirSync(join(root, "docs/plan")).filter((n) => n.endsWith(".md") && n !== "DECISIONS.md").map((n) => `docs/plan/${n}`),
    "docs/plan/milestones/M04-checks-project.md",
  ];
  let seen577 = 0;
  let seen126 = 0;
  for (const p of files) {
    for (const para of read(p).split(/\n\s*\n|\n(?=\|)/)) {
      const flat = para.replace(/\s+/g, " ");
      // The Appendix B decision entries row is written by tools/counts.mjs; its count passed 577 at D-578.
      if (/(?<![\d.])577(?![\d.])/.test(flat) && !flat.startsWith("| decision entries |")) {
        seen577++;
        assert.match(flat, /D-233/, `${p}: 577 without D-233: ${flat.slice(0, 200)}`);
      }
      if (/126 of 128/.test(flat)) {
        seen126++;
        assert.match(flat, /D-232/, `${p}: 126 of 128 without D-232: ${flat.slice(0, 200)}`);
      }
    }
  }
  assert.ok(seen577 >= 1 && seen126 >= 1, "the figures are still cited somewhere");
});

test("every verified-block heading in a README maps to a DOCS.md 9.3 lead line", () => {
  const docs = section(read("docs/plan/DOCS.md"), "9. READMEs");
  const s93 = docs.slice(docs.indexOf("### 9.3"));
  const leads = [...s93.matchAll(/^\| `([^`,:]+)[^`]*` \| `(\w+)` \|/gm)].map((m) => [m[1], m[2]]);
  assert.ok(leads.length >= 4, "9.3 lead lines parsed");
  const required = leads.filter(([, f]) => f !== "simulated").map(([l]) => l);
  // A README the M11-T03 card records as out of step is excused until its owner converts it.
  const m11 = read("docs/plan/milestones/M11-reference.md");
  const t03 = m11.slice(m11.indexOf("\n## M11-T03"), m11.indexOf("\n## M11-T04"));
  const excused = new Set([...t03.matchAll(/out of step with DOCS\.md 9\.3: `([^`]+README\.md)`/g)].map((m) => m[1]));
  const readmes = execFileSync("git", ["-C", root, "ls-files", "*README.md"], { encoding: "utf8" }).split("\n").filter(Boolean);
  let blocks = 0;
  for (const p of readmes) {
    const md = read(p);
    const at = md.indexOf("\n## What is verified, and what is not");
    if (at < 0) continue;
    blocks++;
    const next = md.indexOf("\n## ", at + 4);
    const heads = [...md.slice(at, next < 0 ? undefined : next).matchAll(/^### (.+)$/gm)].map((m) => m[1]);
    if (excused.has(p)) continue;
    for (const h of heads) {
      const lead = h.startsWith("Measured on") ? "Measured on a printed body" : leads.find(([l]) => h.startsWith(l.split(" ").slice(0, 3).join(" ")))?.[0];
      assert.ok(lead, `${p}: heading "${h}" has no 9.3 lead line`);
    }
    for (const l of required) assert.ok(heads.some((h) => h.startsWith(l.split(" ").slice(0, 3).join(" "))), `${p}: list "${l}" missing`);
  }
  assert.ok(blocks >= 7, "README verified blocks found");
});

test("CHECKS.md names no profile constant as listed in PROFILE.md that PROFILE.md lacks", () => {
  const profile = read("docs/plan/PROFILE.md");
  for (const row of CHECKS.split("\n").filter((l) => l.startsWith("|") && /PROFILE\.md lists/.test(l))) {
    for (const m of row.matchAll(/`([a-z][\w]*\.[\w.]+)`/g)) assert.ok(profile.includes(`\`${m[1]}\``), `${m[1]}: ${row.slice(0, 160)}`);
  }
});

test("every profile constant a check reads is listed in PROFILE.md 10.1", () => {
  const rows = json("packages/profile/data/constants.json").constants.filter((r) => /read by CHK-/.test(r.provenance.source));
  assert.ok(rows.length >= 1, "constants read by a check");
  const s101 = section(read("docs/plan/PROFILE.md"), "10.");
  for (const r of rows) assert.ok(s101.includes(`| \`${r.id}\` | ${r.value} |`), `${r.id} missing from PROFILE.md 10.1`);
});

// The evidence folder lives outside the repo, so a fresh checkout skips this test.
const { sourcePath } = await import(new URL('../test-support/originals-root.ts', import.meta.url).href);
const VP = sourcePath("fab-knowledge:evidence/virtual-print");
test("every M04 virtual-print run folder is named in a docs card", { skip: !existsSync(VP) && "evidence absent" }, () => {
  const cards = readdirSync(join(root, "docs/plan/milestones")).map((n) => read(`docs/plan/milestones/${n}`)).join("\n");
  const runs = readdirSync(VP).filter((n) => /^m0\d-t\d+$/.test(n));
  assert.ok(runs.length >= 1, "run folders");
  for (const r of runs) assert.ok(cards.includes(`virtual-print/${r}/`), `${r} is named in no card`);
});
