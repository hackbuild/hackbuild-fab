// tools/test-support/plan-root.mjs: where the plan cards are read from, and the
// not-run skip a node test takes when the plan archive is not on the runner.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PLAN_NOT_RUN, planCard, planCards, planDoc, planHere, planRoot, planSkip } from "../test-support/plan-root.mjs";

const root = join(import.meta.dirname, "..", "..");
const dir = mkdtempSync(join(tmpdir(), "hbf-plan-root-"));
const empty = join(dir, "empty");
const plan = join(dir, "plan");
mkdirSync(empty);
mkdirSync(join(plan, "milestones"), { recursive: true });
writeFileSync(join(plan, "MILESTONES.md"), "# milestones\n");
writeFileSync(join(plan, "milestones", "M01-a.md"), "card a\n");
writeFileSync(join(plan, "milestones", "M00-b.md"), "card b\n");
writeFileSync(join(plan, "milestones", "notes.txt"), "not a card\n");
test.after(() => rmSync(dir, { recursive: true, force: true }));

test("HBF_PLAN names the plan folder, with a trailing slash", () => {
  assert.equal(planRoot({ HBF_PLAN: plan }), `${plan}/`);
  assert.equal(planRoot({ HBF_PLAN: `${plan}/` }), `${plan}/`);
});

test("unset, the plan is docs/plan while the cards are there", () => {
  assert.equal(planRoot({}), join(root, "docs/plan/"));
  assert.equal(planRoot({ HBF_PLAN: "" }), join(root, "docs/plan/"));
});

test("a folder without MILESTONES.md holds no plan: the skip is the not-run reason and a read throws", () => {
  const env = { HBF_PLAN: empty };
  assert.equal(planHere(env), false);
  assert.equal(planSkip(env), PLAN_NOT_RUN);
  assert.match(PLAN_NOT_RUN, /not run$/);
  assert.throws(() => planCard("M01-a.md", env), /HBF_PLAN=.*holds no MILESTONES\.md/);
  assert.throws(() => planDoc("MILESTONES.md", env), /plan not found/);
  assert.throws(() => planCards(env), /plan not found/);
});

test("a plan folder reads its docs and cards, cards listed sorted and Markdown only", () => {
  const env = { HBF_PLAN: plan };
  assert.equal(planHere(env), true);
  assert.equal(planSkip(env), false);
  assert.equal(planDoc("MILESTONES.md", env), "# milestones\n");
  assert.equal(planCard("M01-a.md", env), "card a\n");
  assert.deepEqual(planCards(env), ["M00-b.md", "M01-a.md"]);
});
