// @hackbuild/profile: every number a build reads, with provenance, through
// ProfileLookup (spec/profile.ts). Rows live in packages/profile/data; the
// only write path for a measured row is a person entering a coupon result.

export {
  PROFILE_DATA, SLICE, createProfileLookup, loadProfile, sectionResistance, tablesFromData,
  tablesFromSeed,
} from "./lookup.js";
export type {
  FilamentFallback, FilamentPreset, ProfileData, ProfileReadRow, ProfileTables, SkeletonLookup,
} from "./lookup.js";
export {
  FIT_MOTIONS, GAP_PAIR, LAYER_MATCH_MM, applyLoss, gapRows, invertLoss, loadLoss, lossRowId, pickLoss,
} from "./loss.js";
export type { GapRows, GapSide, LossPick } from "./loss.js";
export { findFit, loadFits, sideOf } from "./fits.js";
export type { DroppedFit, FitTable } from "./fits.js";
export { LAYER_TOL_MM, PRESET_ID, layerIndex, layerTop, layerTopsAround, loadMachines, snapLayer } from "./machines.js";
export { findConstant, loadConstants } from "./constants.js";
export type { ConstantTable, MovedConstant } from "./constants.js";
export {
  PROVENANCE_METHODS, checkProvenance, profileError, provenanceError, refError, schemaError, tierRank,
} from "./provenance.js";
export type { ErrorDetail, ProfileError, ProvenanceRules } from "./provenance.js";
export { flexFatigueFloor, materialFamily } from "./constraints/flex-fatigue-floor.js";
export { printabilityFloor } from "./constraints/printability-floor.js";
export { fitBand } from "./constraints/fit-band.js";
export {
  FIT_MODELS, OGEE16_FITS_V1, fitModel, inLegacyBand, legacyAfterLoss, legacyBand,
} from "./fits/ogee16-fits-v1.js";
export type { LegacyFitBand, LegacyFitModel } from "./fits/ogee16-fits-v1.js";

import type { ConstraintDef } from "@hackbuild/spec";
import { flexFatigueFloor } from "./constraints/flex-fatigue-floor.js";
import { printabilityFloor } from "./constraints/printability-floor.js";
import { fitBand } from "./constraints/fit-band.js";

/** The ConstraintDefs this package owns, collected by core at load (D-044, M01 package placement). */
export const constraintDefs: readonly ConstraintDef[] = [printabilityFloor, flexFatigueFloor, fitBand];
export { fabHouseWarnings, loadFabHouses } from "./fab-houses.js";
export type { FabDeclaration, FabHouseRow } from "./fab-houses.js";
