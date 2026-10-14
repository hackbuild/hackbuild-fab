// The pad and net record (D-089) lives in spec/board-features.ts, the one
// contract both backends fill and every CHK-BRD kernel reads; this file
// re-exports it so a check author imports from @hackbuild/board alone.
export type {
  BoardBackend, BoardRecord, BoardSide, CopperLayer, PadShape, RecordBridge, RecordHole, RecordJumper,
  RecordModel, RecordNet, RecordPad, RecordPart, RecordRead, RecordTrack, RecordVia,
} from "@hackbuild/spec";

/** The key every writer and net member uses for a pad: "U1.GPIO20". */
export function padKey(p: { readonly ref: string; readonly pin: string }): string {
  return `${p.ref}.${p.pin}`;
}

/** The pad feature id a board Part carries for a drilled pad (CHK-BRD-02's target): "pad.U1.GPIO20". */
export function padFeatureId(p: { readonly ref: string; readonly pin: string }): string {
  return `pad.${p.ref}.${p.pin}`;
}
