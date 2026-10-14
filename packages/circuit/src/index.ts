export { circuitError, conductorGraph, footprint, legOf, polylineLength, postLeg, pressedPath, ringArea } from "./path1d.js";
export type { CircuitError } from "./path1d.js";
export type { ConductorGraph, Footprint, PathLeg, PressedPath } from "./path1d.js";
export { flexCapBridgeOhm, rcCrossingUs, rcTauUs } from "./flex-switch.js";
export type { FlexCapBridgeInput, RcCrossingInput } from "./flex-switch.js";
export { KEY_SETTLE_TAUS, SETTLE_TAUS, chargeRelease, classify, floatPoint, pullupEnds, solveKeys } from "./release.js";
export type { ChargeReleaseRead, FloatPointInput, KeyNetPoint, SolveKeysInput, SolveKeysOutput } from "./release.js";
export {
  LED_PWL_LEGACY, NODAL_LEAK_S, NODAL_MAX_ITERATIONS, NODAL_MIN_OHM, NODAL_OPEN_OHM, NODAL_PIVOT_MIN, NODAL_STEP_V, solveDc,
} from "./dc/nodal.js";
export type { DcElement, DcNetwork, DcSolution } from "./dc/nodal.js";
// Read models on port (M05-T05, D-078).
export {
  adcRead, benchSkinOhm, chargeReleaseRead, columnScan, distinguishable, dividerV, emitWait, fullScaleCounts, ladderLevels, ladderRead,
  nodeCapPf, pulldownFloorOhm, pullupRead, ratiometricRead, rejectOhmAt, settlingWait, shippedWait, smallestStep, swappedPair, touchPathOhm, traceCapRule,
} from "./read/index.js";
export type {
  AdcBand, AdcReadInput, AdcReadOutputs, ChargeReleaseInput, ColumnScanInput, ColumnScanOutputs, LadderReadInput, LadderReadOutputs,
  PullupReadInput, PullupReadOutputs, RatiometricReadInput, RatiometricReadOutputs, TraceCapRule,
} from "./read/index.js";
// Net extraction and per-direction resistance from built conductive bodies (M05-T04).
export { CONDUCTIVE_ROLES, NET_GAP_SEARCH, bodyOfConductor, boxGap, extractNets, netGaps, touchDistance } from "./extract/nets.js";
export type { ExtractInput, Extraction, Lead, NetComponent, NetGap, NetPiece, NetSolids, Tap, TouchDistance } from "./extract/nets.js";
// The actuated state: a contact's press and the apartExcept net graphs (M05-T19).
export { apartExcept, contactTouch, movedMesh, pressOf } from "./extract/actuated.js";
export type { ActuatedInput, ApartExcept, ContactTouch, NetGraphState, Press, TerminalApproach } from "./extract/actuated.js";
// The conductor feature kind on the stage path (M05-T10).
export { CONDUCTOR_CHECK_IDS, CONDUCTOR_KIND_VERSION, CONDUCTOR_REFERENCE, conductorKind, strokeSegment } from "./kinds/conductor.js";
export { netRecord, readPath } from "./extract/resistance.js";
export type { NetInput, ReadPath } from "./extract/resistance.js";
export { traceResistanceFloor } from "./constraints/trace-resistance-floor.js";
export {
  PULLUP_DIM, maxPathOhm, mcuRowOf, minPullupOhm, pullupLowRead, pullupPathBudget, pullupRange, pullupVerdict, voltsText, whole,
} from "./constraints/pullup-low-read.js";
export type { PathBudget, PullupRange, PullupVerdict } from "./constraints/pullup-low-read.js";
// eecircuit-engine loads only when loadSpice() runs (D-086, M05-T01); importing these names never resolves it.
export { EECIRCUIT_LICENCE, crossingUs, loadSpice, ngspiceVersion, nodeVolts, spiceBuildInputs } from "./spice/engine.js";
export type { SpiceEngine, SpiceResult, SpiceVector } from "./spice/engine.js";
export { toNetlist } from "./spice/netlist.js";
export type { OperatingPointInput, SpiceAnalysis, SpiceElement, SpiceNode } from "./spice/netlist.js";

// circuit.solve's port pass: pressed paths, read models and operating points per hookup entry (M05-T06).
export { chargePort, pickEnds, pressedPathOf, solvePorts, spiceDivider } from "./solve/ports.js";
export type {
  AdcPort, ChargeHookup, ChargePort, ChargePortInput, DividerEngine, PortSolve, PortSolveInput, PressedDivider, PressedPathOhm, PullupEnds, PullupPort,
} from "./solve/ports.js";
// Declared PIP key paths, the PIP drive reproduction (M05-T11).
export { driveKeys, drivePortFeatures, solveDriveScene } from "./solve/drive-scene.js";
export type { DriveKey, DriveSolve, DriveSolveInput } from "./solve/drive-scene.js";
// BOSS legacy scenes solved as their element lists, the BLOCKS reproduction (M05-T07).
export { LEGACY_PATH_TIER, bossDigital, bossHint, bossNetwork, bossScene, legacyPortId, sceneVolts, solveLegacyScenes, solveScene, stateAt } from "./solve/legacy-scene.js";
export type { BossScene, HintBand, LegacyMcuRead, LegacySceneRow, LegacySolve, LegacySolveInput } from "./solve/legacy-scene.js";
// Declared series nets, the Capricate reproduction (M05-T12).
export { seriesPortId, solveSeriesScene } from "./solve/series-scene.js";
export type { SeriesPort } from "./solve/series-scene.js";
export {
  CAPACITIVE_CEILING_ID, CAPACITIVE_LEN_DIM, CAPACITIVE_NET_DIM, capacitiveCeiling, capacitivePathCeiling,
} from "./constraints/capacitive-path-ceiling.js";

import type { ConstraintDef } from "@hackbuild/spec";
import { traceResistanceFloor } from "./constraints/trace-resistance-floor.js";
import { pullupLowRead } from "./constraints/pullup-low-read.js";
import { capacitivePathCeiling } from "./constraints/capacitive-path-ceiling.js";

/** The ConstraintDefs this package owns, collected by core at load (D-044, M01 package placement). */
export const constraintDefs: readonly ConstraintDef[] = [traceResistanceFloor, pullupLowRead, capacitivePathCeiling];
export { TERMINAL_KIND_VERSION, TERMINAL_REFERENCE, contactKind, padKind, portKind } from "./kinds/terminals.js";
