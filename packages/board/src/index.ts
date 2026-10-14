export * from "./record.js";
export { STEPS_PER_MM, canonicalOrder, canonicalRecord, hashedForm, quantise, recordHash, withHash } from "./record-hash.js";
export { NET_RE, PIN_RE, REF_RE, boardRecordSchema, parseBoardRecord } from "./record.zod.js";
export { boardAdapter, boardMetrics } from "./part.js";
export { DIRECT_GATES, DIRECT_RECORD, directArgs, directFailure, directSuccess, type BoardDraft, type DirectFile, type DirectGates, type DirectResult } from "./backends/direct.js";
export { kicadExtrasOf, kicadText, writeKicad, type KicadExtras } from "./writers/kicad.js";
export { TOUCH_TOL_MM, connectivity, gapBetween, insideRing, padShape, recordCopper, touches, type Connectivity, type CopperItem, type CopperKeepout, type CopperPour, type CopperShort, type Pt, type Shape } from "./connect.js";
export { READBACK_TOL_MM, kicadCounts, readbackKicad, type KicadReadback } from "./readers/kicad.js";
export {
  BOM_HEADER, CPL_DIALECTS, CPL_HEADER, csvField, csvText, uncsvText, footprintOf, parseCsv, readBom, readCpl, readNetlist, writeBom, writeCpl, writeNetlist,
  type BomRow, type CplDialect, type CplRow,
} from "./writers/assembly.js";
export { BOARD_FEATURES, type BoardFeatureRow } from "./features.js";
