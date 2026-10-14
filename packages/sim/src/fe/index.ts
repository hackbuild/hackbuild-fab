// packages/sim/src/fe: the corotational beam FE (SNAPFE) and the PIP click
// spring readouts. Headless; imports spec only (M01-T01, D-045).

export { curve, solveLin, summarize } from "./snapfe.js";
export type { BeamInput, Curve, CurvePoint, ElementInput, Summary } from "./snapfe.js";
export { CLICK_FE, CLICK_RULE_IDS, clickReadout, clickRigid, clickRules } from "./click.js";
export type { ClickReadout, ClickRules, ClickSpring } from "./click.js";
