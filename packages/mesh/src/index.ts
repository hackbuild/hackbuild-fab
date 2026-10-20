export { BuildRunner, free, keep, kernel, liveCount, loadManifold, Scope, scope, withScope } from "./wasm.js";
export type { BuildHandle, BuildOutcome, Deletable } from "./wasm.js";
export { flipCaps, union, unionReport } from "./union.js";
export type { UnionReport } from "./union.js";
export { audit, MIN_TRIANGLE_AREA_MM2 } from "./audit.js";
export type { AuditOptions, MeshAudit } from "./audit.js";
export { decodeHbfm, encodeHbfm, HBFM_HEADER_BYTES, HBFM_MAGIC, HBFM_VERSION, hbfmLength } from "./hbfm.js";
export { bounds, isWatertight, meshHash, meshOf, meshRef, signedVolume, snap, snapMesh, snapWeld } from "./hash.js";
export { shellGroups, type ShellGroup } from "./shells.js";
export { worstOverlap, type OverlapGroup, type WorstOverlap } from "./overlap.js";
/** spec/jcs.ts sha256Hex (D-206), re-exported for callers that load only this package (tools/determinism). */
export { sha256Hex } from "@hackbuild/spec";
export type { MeshData } from "./hash.js";
export {
  PRISM_RETRIES, cleanRing, joinMeshes, meshError, outlineComponents, prismFromComponents, prismMesh, snappedZ,
} from "./routes/prism.js";
export type { PrismMesh, RouteWarning } from "./routes/prism.js";
export { BAND_OVERLAP_IDS, bandOverlap, checkBandOverlaps, stackMesh } from "./routes/stack.js";
export type { StackMesh, StackRun } from "./routes/stack.js";
export { prismWithEdges, type EdgePrism, type StackShape } from "./edge-stack.js";
export { junctionFillet, type Junction } from "./junction.js";
export { HEAL_FREEZE_FLIPS, HEAL_MAX_PASSES, HEAL_WARN_PERCENT, fixPinches, greedyRects, meshSlots, raster, slotsUsed } from "./routes/raster.js";
export type { HealReport, RasterResult, RasterSlab, RasterVolume } from "./routes/raster.js";
export {
  DEFAULT_SEGMENTS, EDGE_COLUMN_HALF, RADIAL_FIELDS, checkProfile, profileReport, radialField, revolveRows, revolveShape, thetaList,
} from "./routes/revolve.js";
export type { FieldDef, FieldParams, ProfileReport, RadialField, RevolveRow } from "./routes/revolve.js";
export { capTriangles, loftMesh, orientSections, skinRings } from "./routes/loft.js";
export type { LoftSection } from "./routes/loft.js";
export { rmfFrames, sweepMesh } from "./routes/sweep.js";
export type { Frame, SweepOptions } from "./routes/sweep.js";
export { IMPORTED_ROUTE, MM_PER_UNIT, importSoup, importStl, readStl, stlEncoding } from "./routes/imported.js";
export type { FileUnit, ImportEncoding, ImportedBody, ImportedPart, SoupPart, StlEncoding } from "./routes/imported.js";
export { importGlb, readGlb, readGlbChunks } from "./routes/imported-glb.js";
export { ADJACENCY_MIN_MM2, MESH_ROUTE_DEFS, runStages, stageImported, toManifold } from "./stages.js";
export type { BodyCutters, ImportedStageBody, ImportedStageOutput, RasterMask, StageInput, StageOutput, StagedBody } from "./stages.js";
export { assemblePart, partContentHashOf, stagePart } from "./partir.js";
export type { BuiltPart, UnhashedPart } from "./partir.js";
export { pitchCeiling } from "./constraints/pitch-ceiling.js";

import type { ConstraintDef } from "@hackbuild/spec";
import { pitchCeiling } from "./constraints/pitch-ceiling.js";

/** The ConstraintDefs this package owns, collected by core at load (D-044, M01 package placement). */
export const constraintDefs: readonly ConstraintDef[] = [pitchCeiling];
export { POCKET_CHECK_IDS, POCKET_KIND_VERSION, POCKET_REFERENCE, pocketKind } from "./kinds/pocket.js";
export { SPRING_CHECK_IDS, SPRING_KIND_VERSION, SPRING_REFERENCE, springKind } from "./kinds/spring.js";
