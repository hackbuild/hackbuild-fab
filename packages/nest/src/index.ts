// @hackbuild/nest: sheet and plate layouts (D-137, D-138). Tier 1; M07.
// The contract types live in spec/nest.ts and are re-exported here so a
// caller of nest imports one package.

export type {
  DeclaredHole, HubDecl, KerfMode, NestGroupBy, NestItem, NestMode, NestRequest, NestResult, Packer, Placement, QuarterTurn, SortOrder,
} from "@hackbuild/spec";
export { nest, nestTrials, validate, type Trial } from "./sheet-loop.js";
export { shelfPack } from "./shelf.js";
export { findFit, maxrectsPack, ORDER_LIST, SORT_ORDERS, splitFree, type Fit, type Rect } from "./maxrects.js";
export { AUTO_GAP_MAX, AUTO_GAP_MIN, autoGap, type AutoGap, type GapTrial } from "./autogap.js";
export { layoutHash, sortPlacements } from "./hash.js";
export { extentOf, placeRings, turnsOf, type Box, type Frame, type PackFn, type Packing, type Spot, type Turn } from "./box.js";
export { OFFSET_MITER_LIMIT, classifyRings, compensate, interiorPoint, partProfile, type PartProfile, type RingClass } from "./profile.js";
export {
  beamOf, chkSht01, chkSht02, chkSht07, connect, kerfNext, kerfPointer, minFeatureOf, packSheets,
  type ConnectedPart, type Connectivity, type PackOptions, type PackOutcome, type SheetFinding,
} from "./connect.js";
export {
  CONTAIN_TOLERANCE, composePlacement, cutOrder, innerTurns, keyOf, nestHoles, ringsById, type Inner, type Nesting,
} from "./part-in-part.js";
export { ARC_TOL, CIRCLE_TOL, bulgeOf, fitArcs, openRing, wholeCircle, type Circle, type Segment } from "./arcs.js";
export {
  BULGE_DECIMALS, COORD_DECIMALS, CUT_LAYERS, drawSheets, fixed, sheetEntities, writeDxf,
  type CutEntity, type CutLayer, type SheetDrawing, type SheetPart, type Vertex, type WriteOptions,
} from "./dxf.js";
export { pathOf, writeSvgCut } from "./svg.js";
export { cutScene, packScene, sheetNames, type CutScene, type CutSheet, type SheetName, type SheetScene } from "./scene.js";
export { packPlates, plateLayouts, printableParts, type PlateInstanceOut, type PlateLayoutOut, type PlatePart, type PlateScene } from "./plates.js";
export {
  assemblyReport, assignSteps, requireSteps, stepLayout, stepSpans, unassignedItems, type AssemblyReport, type SheetSteps,
} from "./assembly-order.js";
