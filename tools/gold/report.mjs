#!/usr/bin/env node
// The gold report (TESTING.md 8.5 Report, D-212): one verdict per rule per
// bench from the harness outputs. It runs no test. The rule ids and the
// harness column are parsed from the eight tables of TESTING.md 8.5, so a
// new G row needs no second list here.
//
// Inputs, under --root (default the repo root):
//   out/smoke/gold-playwright.json  hook and smoke results (Playwright JSON reporter)
//   out/smoke/gold.json             applicability: per bench and rule, applies false with a reason
//   out/test/gold-vitest.json       node, liveness, contract and unit results (vitest --reporter=json)
//   out/smoke/runtime.json          runtime rows per bench, graded on target and fail column:
//                                   { "<bench>": [{ measure, value, unit, target, failed, rules? }] }
//   out/checks/<bench>.json         check rows: the named CHK id's verdict on that bench
//   out/lint/gold-static.json       static rows per bench (tools/gold/static.mjs)
//   out/review/looked.json          person rows
//   tools/gold/calibration.json     with --calibrate: expected verdicts on the gold benches
//
// Grading per bench and rule, in order: n/a when gold.json records the
// predicate false (a reason is required); fail when any result for the
// rule and bench failed; not run when a harness the row names has no
// result, a skipped result, a timeout or a missing input file; pass when
// every harness passed. A runtime row under its fail bound but over its
// numeric target grades over target (D-213 keeps the fail column; the M09
// Exit row states the target), which exits 1 like fail. A runtime row
// tagged with no rule (rules: []) is a D-213 budget no G row names; it is
// graded into the bench's `runtime` list and exits 1 on fail or over
// target unless --only narrows the run. A person row is pass only with a looked.json entry
// for that bench and build hash, otherwise person pending, which never
// fails the job.
//
// Usage: node tools/gold/report.mjs [--only G-03,G-14..G-18] [--bench <id>]
//          [--origin fab|legacy] [--out <file>] [--calibrate] [--root <dir>]
//          [--rules <TESTING.md>]
// --origin keeps the benches gold.json records with that origin: the
// zero-fail run grades fab bakes only, and a legacy page is graded
// report-only against the calibration (D-265).
// Exit: 0 when no applicable rule in scope is fail, over target or not run; 1 otherwise;
// 2 on bad input; 70 on an internal error. With --calibrate, 1 only when a
// rule expected to pass on a gold bench grades fail or not run.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");

export class BadInput extends Error {}

const ID = /^G-\d{2}$/;
const HARNESS_INPUT = {
  hook: "playwright", smoke: "playwright",
  node: "vitest", liveness: "vitest", contract: "vitest", unit: "vitest",
  runtime: "runtime", check: "check", static: "static", person: "person",
};

/** The rule rows of TESTING.md 8.5: id, harnesses, assertion, and the CHK id a check row names. */
export function parseRules(text) {
  const start = text.indexOf("### 8.5 Gold suite");
  if (start < 0) throw new BadInput("TESTING.md has no section 8.5 Gold suite");
  const end = text.indexOf("#### Calibration", start);
  const body = text.slice(start, end < 0 ? undefined : end);
  const rules = [];
  for (const line of body.split("\n")) {
    const m = /^\| (G-\d{2}) \| ([^|]+) \| ([^|]+) \|/.exec(line);
    if (m === null) continue;
    const harness = [...new Set(m[2].split(",").map((h) => h.trim().split(/\s+/)[0]))];
    for (const h of harness) if (!(h in HARNESS_INPUT)) throw new BadInput(`${m[1]} names unknown harness ${h}`);
    const chk = /CHK-[A-Z0-9]+-\d{2}/.exec(m[3]);
    rules.push({ id: m[1], harness, assertion: m[3].trim(), touch: /\btouch\b/.test(m[2]), chk: chk === null ? null : chk[0] });
  }
  if (rules.length === 0) throw new BadInput("TESTING.md 8.5 holds no G rows");
  return rules;
}

/** `G-03,G-14..G-18` to a set of ids. */
export function parseIds(spec) {
  const out = new Set();
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const r = /^G-(\d{2})(?:\.\.G-(\d{2}))?$/.exec(part);
    if (r === null) throw new BadInput(`--only: ${part} is not G-NN or G-NN..G-NN`);
    const a = Number(r[1]);
    const b = r[2] === undefined ? a : Number(r[2]);
    for (let i = a; i <= b; i += 1) out.add(`G-${String(i).padStart(2, "0")}`);
  }
  return out;
}

const readJson = (file) => {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new BadInput(`${file}: ${e.message}`);
  }
};

const idOf = (title) => /^(G-\d{2})\b/.exec(title.trim())?.[1] ?? null;

/** Flattens the Playwright JSON report to {id, bench, status, message, evidence}. */
export function playwrightResults(report, file) {
  const out = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      const id = idOf(spec.title);
      if (id === null) continue;
      for (const t of spec.tests ?? []) {
        const notes = [...(t.annotations ?? []), ...(t.results ?? []).flatMap((r) => r.annotations ?? [])];
        const bench = notes.find((a) => a.type === "bench")?.description ?? null;
        const last = (t.results ?? []).at(-1);
        const status = last?.status ?? (t.status === "skipped" ? "skipped" : "missing");
        const skip = notes.find((a) => a.type === "skip")?.description ?? null;
        const message = status === "skipped" ? skip ?? "skipped" : (last?.errors?.[0]?.message ?? last?.error?.message ?? "").split("\n")[0];
        out.push({ id, bench, status, message, evidence: `${spec.file ?? file}:${spec.line ?? 0}` });
      }
    }
    for (const s of suite.suites ?? []) walk(s);
  };
  for (const s of report.suites ?? []) walk(s);
  return out;
}

/** Flattens a vitest JSON report; `[bench:<id>]` in the full name scopes a test to one bench. */
export function vitestResults(report, file) {
  const out = [];
  for (const f of report.testResults ?? []) {
    for (const a of f.assertionResults ?? []) {
      const id = idOf(a.title ?? "") ?? idOf(a.fullName ?? "");
      if (id === null) continue;
      const bench = /\[bench:([^\]]+)\]/.exec(a.fullName ?? a.title ?? "")?.[1] ?? null;
      const status = a.status === "passed" ? "passed" : a.status === "failed" ? "failed" : "skipped";
      out.push({ id, bench, status, message: (a.failureMessages?.[0] ?? "").split("\n")[0], evidence: f.name ?? file });
    }
  }
  return out;
}

/** One runtime row against D-213: fail at the fail bound, over target past a numeric target, else pass. */
export function runtimeGrade(row) {
  if (row.failed === true) return "fail";
  const target = typeof row.target === "number" ? row.target : Number(row.target);
  if (typeof row.value === "number" && Number.isFinite(target) && row.value > target) return "over target";
  return "pass";
}

const runtimeReason = (r, grade) => (grade === "fail"
  ? `${r.measure} ${r.value} ${r.unit ?? ""} over its fail bound ${r.failBound ?? ""}${r.note ? `, ${r.note}` : ""} (measured)`
  : `${r.measure} ${r.value} ${r.unit ?? ""} over target ${r.target}, under fail bound ${r.failBound ?? "unknown"} (measured)`).replace(/\s+/g, " ").replace(/ ,/g, ",");

function gradeRows({ rules, bench, gold, inputs, root }) {
  const rows = [];
  for (const rule of rules) {
    const app = gold?.rules?.[rule.id];
    if (app !== undefined && app.applies === false) {
      if (typeof app.reason !== "string" || app.reason.trim() === "") throw new BadInput(`gold.json: ${bench.id} ${rule.id} is n/a without a reason`);
      rows.push({ id: rule.id, harness: rule.harness.join(", "), verdict: "n/a", reason: app.reason, evidence: inputs.goldFile });
      continue;
    }
    const halves = rule.harness.map((h) => gradeHarness(rule, h, bench, inputs, root));
    const failed = halves.find((x) => x.verdict === "fail");
    const notRun = halves.find((x) => x.verdict === "not run");
    const over = halves.find((x) => x.verdict === "over target");
    const pending = halves.find((x) => x.verdict === "person pending");
    const pick = failed ?? notRun ?? over ?? pending ?? null;
    if (pick === null) rows.push({ id: rule.id, harness: rule.harness.join(", "), verdict: "pass", evidence: halves.map((x) => x.evidence).join("; ") });
    else rows.push({ id: rule.id, harness: rule.harness.join(", "), verdict: pick.verdict, reason: `${pick.harness}: ${pick.reason}`, evidence: pick.evidence });
  }
  return rows;
}

function fromResults(rule, h, bench, src, file) {
  if (src === null) return { harness: h, verdict: "not run", reason: `missing ${file}`, evidence: file };
  const all = src.filter((r) => r.id === rule.id);
  if (all.length === 0) throw new BadInput(`no harness for ${rule.id} (${h}) in ${file}`);
  const mine = all.filter((r) => r.bench === null || r.bench === bench.id);
  if (mine.length === 0) return { harness: h, verdict: "not run", reason: `no ${h} result for ${bench.id}`, evidence: file };
  const fail = mine.find((r) => r.status === "failed" || r.status === "unexpected");
  if (fail) return { harness: h, verdict: "fail", reason: fail.message || "failed", evidence: fail.evidence };
  const hang = mine.find((r) => r.status === "timedOut" || r.status === "interrupted");
  if (hang) return { harness: h, verdict: "not run", reason: hang.status === "timedOut" ? "hang" : "interrupted", evidence: hang.evidence };
  const skip = mine.find((r) => r.status !== "passed");
  if (skip) return { harness: h, verdict: "not run", reason: skip.message || "skipped", evidence: skip.evidence };
  return { harness: h, verdict: "pass", evidence: mine.map((r) => r.evidence).join(", ") };
}

function gradeHarness(rule, h, bench, inputs, root) {
  const kind = HARNESS_INPUT[h];
  if (kind === "playwright") return fromResults(rule, h, bench, inputs.playwright, inputs.playwrightFile);
  if (kind === "vitest") return fromResults(rule, h, bench, inputs.vitest, inputs.vitestFile);
  if (kind === "runtime") {
    if (inputs.runtime === null) return { harness: h, verdict: "not run", reason: `missing ${inputs.runtimeFile}`, evidence: inputs.runtimeFile };
    // A row tagged with rule ids grades only those rules; an untagged row grades every runtime rule.
    const rows = (Array.isArray(inputs.runtime[bench.id]) ? inputs.runtime[bench.id] : []).filter((r) => !Array.isArray(r.rules) || r.rules.includes(rule.id));
    if (rows.length === 0) return { harness: h, verdict: "not run", reason: `no runtime rows for ${bench.id}`, evidence: inputs.runtimeFile };
    for (const grade of ["fail", "over target"]) {
      const bad = rows.find((r) => runtimeGrade(r) === grade);
      if (bad) return { harness: h, verdict: grade, reason: runtimeReason(bad, grade), evidence: inputs.runtimeFile };
    }
    return { harness: h, verdict: "pass", evidence: inputs.runtimeFile };
  }
  if (kind === "check") {
    const file = path.join(root, "out/checks", `${bench.id}.json`);
    const rel = path.relative(root, file);
    const rep = readJson(file);
    if (rep === null) return { harness: h, verdict: "not run", reason: `missing ${rel}`, evidence: rel };
    if (rule.chk === null) throw new BadInput(`${rule.id} is a check row that names no CHK id`);
    const found = (rep.findings ?? rep.results ?? []).filter((f) => f.id === rule.chk);
    if (found.some((f) => f.verdict === "fail")) return { harness: h, verdict: "fail", reason: `${rule.chk} fails on ${bench.id}`, evidence: rel };
    if (found.some((f) => f.verdict === "pass" || f.verdict === "warn")) return { harness: h, verdict: "pass", evidence: rel };
    return { harness: h, verdict: "not run", reason: `${rule.chk} did not run on ${bench.id}`, evidence: rel };
  }
  if (kind === "static") {
    if (inputs.static === null) return { harness: h, verdict: "not run", reason: `missing ${inputs.staticFile}`, evidence: inputs.staticFile };
    const all = Object.values(inputs.static.benches ?? {}).flat();
    if (!all.some((r) => r.id === rule.id)) throw new BadInput(`no harness for ${rule.id} (static) in ${inputs.staticFile}`);
    const row = (inputs.static.benches?.[bench.id] ?? []).find((r) => r.id === rule.id);
    if (row === undefined) return { harness: h, verdict: "not run", reason: `no static result for ${bench.id}`, evidence: inputs.staticFile };
    if (row.result === "fail") return { harness: h, verdict: "fail", reason: row.message ?? "static lint failed", evidence: inputs.staticFile };
    if (row.result !== "pass") return { harness: h, verdict: "not run", reason: row.message ?? `static result ${row.result}`, evidence: inputs.staticFile };
    return { harness: h, verdict: "pass", evidence: inputs.staticFile };
  }
  // person
  const seen = (inputs.looked ?? []).some((e) => e.bench === bench.id && e.buildHash === bench.buildHash && e.looked === true);
  return seen ? { harness: h, verdict: "pass", evidence: inputs.lookedFile } : { harness: h, verdict: "person pending", reason: "pending", evidence: inputs.lookedFile };
}

function totals(rows) {
  const t = { rules: rows.length, pass: 0, applicable: 0, na: 0, notRun: 0, fail: 0, overTarget: 0, personPending: 0 };
  for (const r of rows) {
    if (r.verdict === "n/a") t.na += 1;
    else t.applicable += 1;
    if (r.verdict === "pass") t.pass += 1;
    if (r.verdict === "not run") t.notRun += 1;
    if (r.verdict === "fail") t.fail += 1;
    if (r.verdict === "over target") t.overTarget += 1;
    if (r.verdict === "person pending") t.personPending += 1;
  }
  return t;
}

export function summary(b) {
  const t = b.totals;
  const head = t.na === 0 && t.notRun === 0 && t.fail === 0 && t.overTarget === 0 && t.personPending === 0
    ? `gold ${b.bench} ${t.pass} of ${t.rules}`
    : `gold ${b.bench} ${t.pass} of ${t.applicable}, n/a ${t.na}, not run ${t.notRun}, fail ${t.fail}${t.overTarget === 0 ? "" : `, over target ${t.overTarget}`}`;
  const lines = [head];
  for (const r of b.rows) {
    if (r.verdict === "pass") continue;
    if (r.verdict === "n/a") lines.push(`n/a ${r.id}: ${r.reason}`);
    else if (r.verdict === "person pending") lines.push(`not run ${r.id} ${r.reason}`);
    else lines.push(`${r.verdict} ${r.id} ${r.reason}`);
  }
  for (const r of b.runtime ?? []) if (r.verdict !== "pass") lines.push(`runtime ${r.verdict} ${r.reason}`);
  return lines;
}

/** Runs the report; returns { code, lines, report }. Throws BadInput on bad input. */
export function run(argv, env = {}) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i < 0 ? null : argv[i + 1] ?? null;
  };
  const root = path.resolve(arg("--root") ?? env.root ?? REPO);
  const rulesFile = path.resolve(arg("--rules") ?? path.join(REPO, "docs/plan/TESTING.md"));
  const rules = parseRules(readFileSync(rulesFile, "utf8"));
  const known = new Set(rules.map((r) => r.id));
  const only = arg("--only") === null ? null : parseIds(arg("--only"));
  for (const id of only ?? []) if (!known.has(id)) throw new BadInput(`--only names ${id}, which TESTING.md 8.5 lacks`);
  const calibrate = argv.includes("--calibrate");
  const inputs = {
    playwrightFile: "out/smoke/gold-playwright.json",
    goldFile: "out/smoke/gold.json",
    vitestFile: "out/test/gold-vitest.json",
    runtimeFile: "out/smoke/runtime.json",
    staticFile: "out/lint/gold-static.json",
    lookedFile: "out/review/looked.json",
  };
  const pw = readJson(path.join(root, inputs.playwrightFile));
  inputs.playwright = pw === null ? null : playwrightResults(pw, inputs.playwrightFile);
  const vt = readJson(path.join(root, inputs.vitestFile));
  inputs.vitest = vt === null ? null : vitestResults(vt, inputs.vitestFile);
  inputs.runtime = readJson(path.join(root, inputs.runtimeFile));
  inputs.static = readJson(path.join(root, inputs.staticFile));
  inputs.looked = readJson(path.join(root, inputs.lookedFile));
  for (const r of [...(inputs.playwright ?? []), ...(inputs.vitest ?? [])]) {
    if (!known.has(r.id)) throw new BadInput(`${r.evidence}: test titled ${r.id}, which TESTING.md 8.5 lacks`);
  }
  for (const r of Object.values(inputs.static?.benches ?? {}).flat()) if (!known.has(r.id)) throw new BadInput(`${inputs.staticFile}: ${r.id} is not in TESTING.md 8.5`);

  const gold = readJson(path.join(root, inputs.goldFile));
  let benches = gold?.benches ?? null;
  if (benches === null) {
    const ids = [...new Set((inputs.playwright ?? []).map((r) => r.bench).filter((b) => b !== null))];
    benches = ids.map((id) => ({ id, buildHash: null, rules: {} }));
  }
  if (!Array.isArray(benches)) throw new BadInput(`${inputs.goldFile}: benches is not a list`);
  for (const b of benches) for (const id of Object.keys(b.rules ?? {})) if (!known.has(id)) throw new BadInput(`${inputs.goldFile}: ${b.id} lists ${id}, which TESTING.md 8.5 lacks`);
  const pick = arg("--bench");
  if (pick !== null) benches = benches.filter((b) => b.id === pick);
  const origin = arg("--origin");
  if (origin !== null) {
    if (origin !== "fab" && origin !== "legacy") throw new BadInput(`--origin ${origin}: fab or legacy`);
    benches = benches.filter((b) => b.origin === origin);
  }
  if (benches.length === 0) throw new BadInput(pick === null && origin === null ? "no benches: gold.json is missing and no test names a bench" : `no bench ${pick ?? `of origin ${origin}`} in the inputs`);

  const out = benches.map((b) => {
    const rows = gradeRows({ rules, bench: b, gold: b, inputs, root });
    const untagged = (Array.isArray(inputs.runtime?.[b.id]) ? inputs.runtime[b.id] : []).filter((r) => Array.isArray(r.rules) && r.rules.length === 0);
    const runtime = untagged.map((r) => {
      const verdict = runtimeGrade(r);
      return { measure: r.measure, verdict, ...(verdict === "pass" ? {} : { reason: runtimeReason(r, verdict) }), evidence: inputs.runtimeFile };
    });
    return { bench: b.id, buildHash: b.buildHash ?? null, rows, runtime, totals: totals(rows) };
  });
  const lines = out.flatMap(summary);

  let code = 0;
  if (calibrate) {
    const cal = readJson(path.join(root, "tools/gold/calibration.json")) ?? readJson(path.join(REPO, "tools/gold/calibration.json"));
    if (cal === null) throw new BadInput("--calibrate: tools/gold/calibration.json is missing");
    for (const b of out) {
      for (const r of b.rows) {
        const exp = (cal.rows ?? []).find((c) => c.bench === b.bench && c.id === r.id);
        if (exp === undefined) continue;
        r.expect = exp.expect;
        r.agrees = exp.expect === r.verdict;
        if (exp.expect === "pass" && (r.verdict === "fail" || r.verdict === "not run")) {
          code = 1;
          lines.push(`suite defect ${b.bench} ${r.id}: the study note records pass (${exp.note}:${exp.line}), graded ${r.verdict}`);
        } else if (exp.expect === "fail" && r.verdict === "fail") lines.push(`expected fail ${b.bench} ${r.id}`);
      }
    }
  } else {
    // A known failure is a fab row a decision holds failing. It grades fail
    // in the report without failing the run, and fails the run once it
    // passes, so the list only shrinks (plan v10 section 7).
    const held = readJson(path.join(root, "tools/gold/known.json"))?.rows ?? [];
    for (const b of out) {
      for (const r of b.rows) {
        if (only !== null && !only.has(r.id)) continue;
        const k = held.find((h) => h.bench === b.bench && h.id === r.id);
        if (k !== undefined && r.verdict === "fail") {
          r.known = k.decision;
          lines.push(`known failure ${b.bench} ${r.id}: held by ${k.decision}, ${k.reason}`);
          continue;
        }
        if (k !== undefined && r.verdict === "pass") {
          code = 1;
          lines.push(`known failure now passes ${b.bench} ${r.id}: remove it from tools/gold/known.json (${k.decision})`);
        }
        if (r.verdict === "fail" || r.verdict === "not run" || r.verdict === "over target") code = 1;
      }
      if (only === null && b.runtime.some((r) => r.verdict !== "pass")) code = 1;
    }
  }
  const report = { generated: "tools/gold/report.mjs", rules: rulesFile === path.join(REPO, "docs/plan/TESTING.md") ? "docs/plan/TESTING.md 8.5" : rulesFile, only: only === null ? null : [...only], benches: out };
  const outFile = path.resolve(root, arg("--out") ?? (calibrate ? "out/smoke/gold-report.json" : "out/gold/report.json"));
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(report, null, 1)}\n`);
  return { code, lines, report };
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { code, lines } = run(process.argv.slice(2));
    for (const l of lines) console.log(l);
    process.exit(code);
  } catch (e) {
    if (e instanceof BadInput) {
      console.error(`gold report: bad input: ${e.message}`);
      process.exit(2);
    }
    console.error(`gold report: internal error: ${e instanceof Error ? e.stack : String(e)}`);
    process.exit(70);
  }
}
