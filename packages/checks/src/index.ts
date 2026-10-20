// @hackbuild/checks, tier 2: the check registry (M04-T01). The M-S
// skeleton (M-S-T06) stays exported until core moves check.run onto
// runRegistry; its run bodies are the ones the registry modules call.
export * from "./skeleton/index.js";
export { CHECK_ID_ALIASES, canonicalKind, isAlias, resolveCheckId } from "./aliases.js";
export { ASSERTION_TYPES, CHECK_LEVELS, CHECK_STATUSES, JOINT_KINDS, LEGAL_KINDS, MILESTONE_IDS, loadSeed, seedRow, type SeedCheck } from "./loader.js";
export {
  SEVERITY_LABEL, SOLID_KERNEL, blocksExport, bySeverity, failedOn, failedPreconditions, findingLabel, gatedBy, partsOfResult, partsOfTarget,
  preconditionIds, preconditionReason, readsSolid, runOrder, withSeverity, type GateFields, type SeverityLabel,
} from "./severity.js";
export { KERNEL_LANDS, TARGET_LANDS, skipMilestone, skipReason, type SkipInputs } from "./skip.js";
export {
  defineCheck, producedLevels, registerChecks, runRegistry, stamp, targetsFor,
  type AnyCheckModule, type CheckModule, type CheckSources, type RegisteredCheck, type RegistryReport, type RegistryRun, type TargetSet,
} from "./registry.js";
export {
  NO_BOARD_VIEW, NO_CIRCUIT, NO_EXTRACTION, NO_MESH, viewsOf, type ArtifactRebuild, type BoardView, type CircuitView, type LandingInput, type ReparseReport, type InsertMeasure, type InsertableAssertion, type InterferenceDecl, type InterferenceView, type KernelViews, type Rebuilt, type RegistryCtx, type StatedSource,
} from "./views.js";
export { art02Findings, statedSource, zipEpoch } from "./defs/art/CHK-ART-02.js";
export { CHECK_MODULES } from "./defs/index.js";
export { prt01Finding, PRT01_CONSTRAINT } from "./defs/prt/CHK-PRT-01.js";
export { prt03Finding, prt03OfPart, PRT03_CONSTRAINT, OVERLAP_CEILING_MM3, SUM_TOLERANCE } from "./defs/prt/CHK-PRT-03.js";
export { prt18Finding, DEFAULT_PIECES, PRT18_CONSTRAINT } from "./defs/prt/CHK-PRT-18.js";
export { prt19Finding, LIFT_TOL_MM, PRT19_CONSTRAINT, type Piece } from "./defs/prt/CHK-PRT-19.js";
export { IMPORT_PATH_CHECKS, IMPORT_PATH_CONSTRAINT } from "./defs/prt/import-path.js";
export { fitRowsOf, hasFitsRows, type FitRowEval } from "./defs/fit/CHK-FIT-01.js";
export { reportHash, reportHashInput, reportObject, sortFindings, type ReportHashInput, type ReportObject } from "./report-hash.js";
export { QUALIFIERS, headingSlug, headingSlugs, isQualified, numberLine, numberLines, originFromSeed, parseRecordId, type OriginRecord } from "./origin.js";
export {
  PAGE_MILESTONE, checkPage, checkPageMarkdown, coversOf, indexMarkdown, kernelsAt, levelsAt, originGapsMarkdown, renderCheckPage,
  type CheckPage, type ReferenceCovers,
} from "./page.js";
export { gridAt, gridInterval, nearestInterval, nearestMultiple, nearestSet, tidy } from "./nearest.js";
export {
  byConstraintDim, dimOf, dimsOfCheck, drivenPointers, paramSlots, valueAt,
  type Driven, type DrivenSources, type NumericField, type ParamSlot,
} from "./driven-by.js";
export { proposeFix, queryCalls, type FixInput, type FixOutcome, type Prediction } from "./fix.js";
export * from "./copper/index.js";
// The route and buried stack net checks (M05-T10).
export { runNet01 } from "./net/net01.js";
export { NET_FLOOR, netFloor, pairFindings, runNet02Solid } from "./net/net02.js";
export { runNet11 } from "./net/net11.js";
export { routeFinding, runNet12 } from "./net/net12.js";
// CHK-3MF-08 on the package, with the Part IR when the build is at hand (M05-T20).
export { BEAM_CONSTANTS, interlockingDefaults, run3mf08 } from "./3mf/chk-3mf-08.js";
export { conductorPackageChecks } from "./3mf/package-checks.js";
