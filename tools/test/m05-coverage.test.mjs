// M05-T17 step 3 (D-105, MILESTONES.md rule 5): every check whose run body
// landed in M05 names a reference in that reference's README covers list,
// and the reference's expected/ records a result of that check that is not
// a skip, so the cover is a run and not a claim. The ids are read from the
// card's step 3 text, and the R54 copper rows from the gate ids the run
// bodies in packages/checks/src/copper report under, never from the covers
// lines under test. A check with no such reference is listed in GAPS with
// its reason; a gap that closes, or a listed id the step stops naming,
// fails until GAPS is updated.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { planCard, planSkip } from "../test-support/plan-root.mjs";

const root = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");

// CHK-NET-06 closed with reference/keys/midi-pad, whose GP26 wiper is read by adc (K-04).
const GAPS = {};

/** CHK ids the M05-T17 step 3 text names, "CHK-NET-01, -02" short forms expanded. */
export function stepIds(card) {
  const section = card.split(/^## /m).find((s) => s.startsWith("M05-T17 "));
  const step = section?.match(/^3\. Coverage:([\s\S]*?)(?=^\d+\. )/m);
  if (!step) return null;
  const text = step[1].replace(/\s+/g, " ");
  const out = new Set();
  for (const m of text.matchAll(/(CHK-[A-Z0-9]+)-(\d\d)((?:(?:,| and|, and) -\d\d(?: \([^)]*\))?)*)/g)) {
    out.add(`${m[1]}-${m[2]}`);
    for (const n of m[3].matchAll(/-(\d\d)/g)) out.add(`${m[1]}-${n[1]}`);
  }
  return [...out].sort();
}

/** Check ids the copper run bodies report gates under. */
function copperIds() {
  const dir = "packages/checks/src/copper";
  const src = readdirSync(join(root, dir)).filter((f) => f.endsWith(".ts")).map((f) => read(`${dir}/${f}`)).join("\n");
  return [...new Set([...src.matchAll(/"(CHK-NET-\d\d)"/g)].map((m) => m[1]))].sort();
}

/** reference/<area>/<id> with the ids its README covers line names. */
function covers() {
  const out = [];
  for (const area of readdirSync(join(root, "reference"), { withFileTypes: true }).filter((e) => e.isDirectory())) {
    for (const ref of readdirSync(join(root, "reference", area.name), { withFileTypes: true }).filter((e) => e.isDirectory())) {
      const rel = `reference/${area.name}/${ref.name}`;
      if (!existsSync(join(root, rel, "README.md"))) continue;
      const m = /^covers:\s*\[([^\]]*)\]\s*$/m.exec(read(`${rel}/README.md`));
      if (m) out.push({ rel, ids: m[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")) });
    }
  }
  return out;
}

/** Every object in the reference's expected/*.json that names check id, with its outcome. */
function outcomes(rel, id) {
  const dir = join(root, rel, "expected");
  if (!existsSync(dir)) return [];
  const found = [];
  const walk = (x) => {
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (x === null || typeof x !== "object") return;
    if (x.id === id || x.check === id || x.checkId === id) found.push(x.verdict ?? (x.ok === true ? "pass" : x.ok === false ? "fail" : "named"));
    for (const v of Object.values(x)) walk(v);
  };
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) walk(JSON.parse(readFileSync(join(dir, f), "utf8")));
  return found;
}

// The plan cards come from the plan archive (tools/test-support/plan-root.mjs); a test that
// reads them skips as not run on a runner without it.
const SKIP = planSkip();

test("step 3 names the M05 net checks and CHK-3MF-08", { skip: SKIP }, () => {
  const ids = stepIds(planCard("M05-circuit-copper.md"));
  assert.ok(ids, "M05-T17 step 3 not found");
  for (const id of ["CHK-NET-01", "CHK-NET-13", "CHK-NET-28", "CHK-NET-29", "CHK-3MF-08"]) assert.ok(ids.includes(id), `step 3 lost ${id}`);
  assert.ok(ids.length >= 15, `step 3 names ${ids.length} ids`);
});

test("every check M05 landed names a reference whose goldens run it", { skip: SKIP }, () => {
  const ids = [...new Set([...stepIds(planCard("M05-circuit-copper.md")), ...copperIds()])].sort();
  const refs = covers();
  const gaps = [];
  for (const id of ids) {
    const runs = refs.filter((r) => r.ids.includes(id) && outcomes(r.rel, id).some((o) => o !== "skip"));
    if (runs.length === 0) gaps.push(id);
  }
  assert.deepEqual(gaps, Object.keys(GAPS).sort(), `uncovered: ${gaps.join(", ")}`);
  for (const id of Object.keys(GAPS)) assert.ok(ids.includes(id), `${id} is in GAPS but step 3 no longer names it`);
});

test("a covered id needs a non-skip result: a skip-only or absent golden does not count", (t) => {
  const refs = covers();
  const flex = refs.find((r) => r.rel === "reference/keys/flex-pair");
  if (!flex) { t.skip("reference/keys/flex-pair has no covers line"); return; }
  assert.ok(outcomes(flex.rel, "CHK-NET-06").length > 0, "flex-pair records CHK-NET-06");
  assert.ok(outcomes(flex.rel, "CHK-NET-06").every((o) => o === "skip"), "flex-pair runs CHK-NET-06");
  assert.deepEqual(outcomes(flex.rel, "CHK-NOPE-01"), []);
  assert.deepEqual(stepIds("## M05-T17 x\n3. Coverage: CHK-NET-01, -02 and -28 (ceiling), CHK-3MF-08.\n4. next\n"), ["CHK-3MF-08", "CHK-NET-01", "CHK-NET-02", "CHK-NET-28"]);
});
