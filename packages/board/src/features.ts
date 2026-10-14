// The board feature namespace (D-061, M08-T12 step 1): one row per kind of
// spec/board-features.ts BOARD_FEATURE_KINDS, naming where the kind lives
// in the record, which writer draws it in each format, which check proves
// it and which reference exercises it. A cell that holds no implementation
// starts "none:" and says why, so a gap is a stated fact and never a blank.
// packages/board/test/features.test.ts holds every named field, writer,
// check and reference to what exists in the tree.

import type { BoardFeatureKind } from "@hackbuild/spec";

export interface BoardFeatureRow {
  readonly kind: BoardFeatureKind;
  /** Top-level BoardRecord key the kind lives under (a qualifier may follow a space), or "none: <why>". */
  readonly record: string;
  /** Writer as "<repo path>:<function>", or "none: <why>". */
  readonly gerber: string;
  readonly kicad: string;
  readonly circuitJson: string;
  /** Check id, or "none: <why>". */
  readonly check: string;
  /** Reference directories under reference/boards that exercise the kind. */
  readonly references: readonly string[];
  /** The design the corpus shows the feature on. */
  readonly evidence: string;
}

const CJ_WAITS = "none: the Circuit JSON writer is M08-T11, which waits on the owner's Node 24 decision for the tscircuit family";

export const BOARD_FEATURES: readonly BoardFeatureRow[] = [
  {
    kind: "outline", record: "board", gerber: "tools/py/board/direct/gerber.py:write_stroke", kicad: "packages/board/src/writers/kicad.ts:kicadText",
    circuitJson: CJ_WAITS, check: "CHK-BRD-07", references: ["spindle-r1", "shunt-art"], evidence: "SPINDLE, SHUNT, AUGER",
  },
  {
    kind: "routedSlot", record: "slots kind routed", gerber: "reference/boards/shunt-art/gen.py:slot_contour",
    kicad: "none: kicadText draws no slot; SHUNT has no KiCad export", circuitJson: CJ_WAITS,
    check: "CHK-BRD-01", references: ["shunt-art"], evidence: "SHUNT lanyard 14.0 x 3.5 r 1.75",
  },
  {
    kind: "npthMount", record: "holes role mount", gerber: "tools/py/board/direct/excellon.py:write_excellon",
    kicad: "packages/board/src/writers/kicad.ts:kicadText", circuitJson: CJ_WAITS,
    check: "CHK-BRD-01", references: ["spindle-r1", "shunt-art"], evidence: "SPINDLE 4 x 2.70, SHUNT 4 x 3.20",
  },
  {
    kind: "keepout", record: "keepouts kind keepout", gerber: "none: a plain keepout draws nothing on a fab layer",
    kicad: "none: kicadExtrasOf writes the antenna keepout only; no reference carries a plain keepout", circuitJson: CJ_WAITS,
    check: "none: copper inside a keepout has no registered check; AUGER's four keepouts arrive with the tscircuit backend (M08-T10)",
    references: [], evidence: "AUGER 4 keepouts",
  },
  {
    kind: "antennaKeepout", record: "keepouts kind antenna", gerber: "tools/py/board/direct/pour.py:bottom_pour",
    kicad: "packages/board/src/writers/kicad.ts:kicadExtrasOf", circuitJson: CJ_WAITS,
    check: "CHK-BRD-21", references: ["spindle-r1"], evidence: "SPINDLE ANT_KEEP",
  },
  {
    kind: "silkString", record: "silk", gerber: "tools/py/board/direct/textpoly.py:text_polys", kicad: "packages/board/src/writers/kicad.ts:kicadExtrasOf",
    circuitJson: CJ_WAITS, check: "CHK-BRD-01", references: ["spindle-r1", "shunt-art"], evidence: "SHUNT textpoly",
  },
  {
    kind: "artLayer", record: "none: SHUNT's art stays in board.json; the record holds no art field yet",
    gerber: "tools/py/board/direct/gerber.py:FlashGerber", kicad: "none: SHUNT has no KiCad export", circuitJson: CJ_WAITS,
    check: "CHK-BRD-01", references: ["shunt-art"], evidence: "SHUNT data matrix",
  },
  {
    kind: "registrationMark", record: "none: SPINDLE R1 has no REGISTER mark; the v5 that has one is not ported",
    gerber: "none: no ported generator draws one", kicad: "none: no ported generator draws one", circuitJson: CJ_WAITS,
    check: "none: copper builds carry no check for a fab-layer mark (card table)", references: [], evidence: "SPINDLE v5 REGISTER",
  },
  {
    kind: "castellatedSeat", record: "pads holeDx", gerber: "tools/py/board/direct/pad.py:pad", kicad: "packages/board/src/writers/kicad.ts:kicadText",
    circuitJson: CJ_WAITS, check: "CHK-BRD-02", references: ["spindle-r1"], evidence: "SPINDLE U1",
  },
  {
    kind: "solderJumper", record: "jumpers", gerber: "tools/py/board/direct/pad.py:pad", kicad: "packages/board/src/writers/kicad.ts:kicadText",
    circuitJson: CJ_WAITS, check: "CHK-BRD-20", references: ["spindle-r1"], evidence: "TRUNNION SJ1, SPINDLE JP1",
  },
  {
    kind: "maskOpening", record: "none: no ported board opens mask over art; TACK is not ported",
    gerber: "none: no ported generator draws one", kicad: "none: no ported generator draws one", circuitJson: CJ_WAITS,
    check: "none: the card table names no check", references: [], evidence: "TACK mask art",
  },
  {
    kind: "thermalSlot", record: "slots kind thermal", gerber: "none: no direct-route board carries one; AUGER's NTC cutouts are tscircuit (M08-T10)",
    kicad: "none: kicadText draws no slot", circuitJson: CJ_WAITS,
    check: "none: the slot keepout has no registered check", references: [], evidence: "AUGER NTC cutouts 1.4 x 12, 8 x 1.4",
  },
  {
    kind: "bareLead", record: "none: lead landings read gates.json placements and the reference's models.json, never the record",
    gerber: "none: a bare lead draws nothing", kicad: "none: a bare lead draws nothing", circuitJson: "none: a bare lead has no Circuit JSON element",
    check: "CHK-BRD-19", references: ["shunt-art"], evidence: "SHIM, SHUNT lead landings",
  },
  {
    kind: "declaredBridge", record: "bridges", gerber: "none: a bridge is copper or a part already drawn", kicad: "none: a bridge is copper or a part already drawn",
    circuitJson: CJ_WAITS, check: "CHK-BRD-21", references: ["shunt-art"], evidence: "SHIM switch, SHUNT gold bar",
  },
];
