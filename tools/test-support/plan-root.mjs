// Where the plan cards are read from: the milestone cards, MILESTONES.md,
// RISKS.md and extractions.md (PLAN.md section 5 bullet 1 moves them out of
// the public repo into the sibling fab-knowledge/plan-archive/). HBF_PLAN names
// the folder when set; else docs/plan while the cards are still there; else
// the sibling archive. A folder without MILESTONES.md holds no plan: a node
// test then skips with PLAN_NOT_RUN, so a hosted runner reports the plan-drift
// guards not run, never passed. planDoc and planCard throw when the plan is
// absent, so a read outside a skipped test fails loudly.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const PLAN_VAR = "HBF_PLAN";
export const PLAN_NOT_RUN = "plan archive not on this runner: not run";
/** The top-level plan files that move with the cards; a test listing docs/plan reads these through planDoc instead. */
export const PLAN_ARCHIVED = Object.freeze(["MILESTONES.md", "RISKS.md", "extractions.md"]);

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const NEAR = fileURLToPath(new URL("../../../", import.meta.url));

const slashed = (dir) => (dir.endsWith("/") ? dir : `${dir}/`);

/** The plan folder this runner reads, with a trailing slash; it may not exist. */
export function planRoot(env = process.env) {
  const set = env[PLAN_VAR];
  if (set !== undefined && set !== "") return slashed(set);
  if (existsSync(`${REPO}docs/plan/milestones`)) return `${REPO}docs/plan/`;
  return `${NEAR}fab-knowledge/plan-archive/`;
}

/** True when the plan folder holds MILESTONES.md. */
export function planHere(env = process.env) {
  return existsSync(`${planRoot(env)}MILESTONES.md`);
}

/** The node:test skip option: false when the plan is here, else the not-run reason. */
export function planSkip(env = process.env) {
  return planHere(env) ? false : PLAN_NOT_RUN;
}

function requirePlan(env) {
  if (!planHere(env)) {
    const set = env[PLAN_VAR];
    const why = set === undefined || set === "" ? `${PLAN_VAR} is unset and ${planRoot(env)} holds no MILESTONES.md` : `${PLAN_VAR}=${set} holds no MILESTONES.md`;
    throw new Error(`plan not found: ${why}. set ${PLAN_VAR} to a copy of the plan archive`);
  }
  return planRoot(env);
}

/** The path of a plan file relative to the plan folder, e.g. "MILESTONES.md"; throws when the plan is absent. */
export function planPath(rel, env = process.env) {
  return `${requirePlan(env)}${rel}`;
}

/** The text of a plan file relative to the plan folder, e.g. "MILESTONES.md" or "extractions.md". */
export function planDoc(rel, env = process.env) {
  return readFileSync(planPath(rel, env), "utf8");
}

/** The text of one milestone card by file name, e.g. "M05-circuit-copper.md". */
export function planCard(name, env = process.env) {
  return planDoc(`milestones/${name}`, env);
}

/** Every milestone card file name, sorted. */
export function planCards(env = process.env) {
  return readdirSync(planPath("milestones", env)).filter((n) => n.endsWith(".md")).sort();
}
