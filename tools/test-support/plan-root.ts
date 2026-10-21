// The plan card reader for vitest files; plan-root.mjs holds the one
// implementation the node tests share. A vitest file importing this module is
// an owner file (.github/scripts/owner-files.mjs): hosted runners leave it out
// and report it not run.
export { PLAN_ARCHIVED, PLAN_NOT_RUN, PLAN_VAR, planCard, planCards, planDoc, planHere, planPath, planRoot, planSkip } from "./plan-root.mjs";
