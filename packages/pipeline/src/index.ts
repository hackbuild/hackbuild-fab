// @hackbuild/pipeline: the build and check pipeline core's part.build and a
// baked bench page share (D-264). No node API and no DOM: a caller hands it
// the workspace data, and core or the bake reads the files.

export { canonicalOrMissing, hashOf } from "./hash.js";
export { resolveFace } from "./face-frame.js";
export { mechApply, type MechCtx } from "./mech-apply.js";
export { AUTHOR_CIRCLE_SEGMENTS, AUTHOR_CORNER_SEGMENTS, deriveTargets, machineView, makeAuthor } from "./author.js";
export { mergeApplied, type MergeCtx } from "./applied-merge.js";
export { PACKAGE_KINDS, kernelKindsOf, type KernelKinds } from "./kinds.js";
export { draftProblem, plainProblem } from "./draft.js";
export { registerSolvers, simClickCurve } from "./solvers.js";
export { defaultsOf, resolveParams, type Values } from "./params.js";
export {
  M00_PART_CHECKS, gatedSkips, m00Versions, preconditionOrder, registryHashOf, runPartChecks, seedRows, stamp,
  type ExportPart, type M00PartCheck, type PartCheckInput, type RegistryEntries, type SeedRow,
} from "./part-checks.js";
export { adapterOf, fullProfile, stageDesign, stageInputsOf, stageMesh, type Generated, type StageInputs, type StageKinds } from "./stage.js";
export {
  allCheckIds, assembleBuild, checkDefs, checkVersions, declares3mf, export3mf, featureSchemaProblem, graphKinds, kindsUsed, mergeWarnings,
  packageCheckIds, readRow, registryDefs, runAllChecks, runBuildRegistry, runChecks, sheetMachineView, threeMfConfig, threeMfInput,
  type AllChecked, type AssembleOptions, type Built, type Checked, type Design, type DraftRun, type Meshed, type Rebuild, type Workspace,
} from "./build.js";
export {
  PAGE_EXPORTS, createPageBuild, pageDesign, runDraft,
  type DraftKinds, type PageBuild, type PageExportKind, type PageFacts, type PageFile, type PageInput, type PageMesh, type PageResult,
} from "./page.js";
