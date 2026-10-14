// The vinyl copper kernel (M05-T14): the KEYWAY family's helpers, text and
// logo kernel, draft evaluation, layer emit, stack declaration, lane
// ranker, ladder rule and weedability proof.

export { AREA_EPS, QUAD_SEGS, ROUND_SEGMENTS, TIE_MM, Vinyl, area2, tightestPairs, boxRing, centroid, circleRing, components, contains, cutLength, distance, holes, interiorPoint, intersects, islands, overlapArea, pointIn, rrRing } from "./helpers.js";
export type { AnnulusOptions, Radius } from "./helpers.js";
export { glyphPath, parseWoff2 } from "./font.js";
export type { BrotliDecompress, Font, FontPoint, Glyph } from "./font.js";
export { CURVE_POINTS, FALLBACK_CAP, MISSING_ADVANCE, boundsOf, documentPaths, logoPaths, pathGeom, pathRings, ringsToGeom, textGeom } from "./svgpath.js";
export type { Anchor } from "./svgpath.js";
export { docSize, polyPath, simplifyRing, svgDoc } from "./emit-svg.js";
export type { PathOptions, SvgDoc, SvgItem } from "./emit-svg.js";
export { evaluateDraft, netIslands, placeFan, shapeEvaluator } from "./draft.js";
export type {
  AuditProbe, BoardRegions, ClipFieldDecl, Coord, FanDecl, FieldDecl, FingerDecl, FontWeight, LayerDecl, LayerItem, MaskDecl, PlacedFan, Pt,
  RadiusSpec, Shape, SheetRole, SliderDecl, TerminalDecl, VinylBoard, VinylDraft, VinylInputs, WiperDecl, ZoneDecl,
} from "./draft.js";
export type { ErodeStyle, GateKind, GateStep, MsgVars, SampleWindow } from "./program.js";
export { OUTLINE_REGISTRATION, SHEET_FACE, SPEC_ROLE, emitLayers, stackDecl } from "./stack.js";
export type { EmittedLayer } from "./stack.js";
export { assignLanes, rankLanes, rankLanesGreedy } from "./lanes.js";
export type { LaneInput, LaneNet, LaneResult, LaneVersion, RailAxis } from "./lanes.js";
export { ladderAudit, ladderGap } from "./ladder.js";
export type { LadderAudit, LadderDecl, LadderOptions, LadderRow } from "./ladder.js";
export { weedProof } from "./weed.js";
export type { WeedNet, WeedProof } from "./weed.js";
