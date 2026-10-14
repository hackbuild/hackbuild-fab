// The two BLOCKS brick standards (blocks.md 5.1, boss.md 5.1), as the
// originals declare them. Neither is a profile row: each is the original's
// own design standard, cited by file and line, and both ship as presets
// with no default until a print decides (D-087, M06-T07 correction row).
// Every value is mm, a design value of the original.

import { rrect6 } from "./geometry.js";

export interface BrickStandard {
  readonly id: "blocks-html" | "boss-v1";
  /** Layer height every z of the standard lands on, mm. */
  readonly layer: number;
  /** Stud pitch, mm. */
  readonly P: number;
  readonly studD: number;
  readonly studH: number;
  readonly plateH: number;
  readonly brickH: number;
  /** Socket ring height, mm. */
  readonly sockH: number;
  /** Conductive flange on the ring, mm. */
  readonly flangeH: number;
  /** Flex ring inner diameter: 0.2 interference on a 4.8 stud, mm. */
  readonly sockIDflex: number;
  readonly sockOD: number;
  /** Flush pad diameter under a column with no socket, mm (BLOCKS only; BOSS has no pad). */
  readonly padD: number | null;
  readonly postD: number;
  /** Top of the flange, mm. */
  readonly flangeTop: number;
  readonly L1: number;
  readonly L2: number;
  readonly traceT: number;
  readonly gapT: number;
  /** Pad tops and bore floors, mm. */
  readonly padTop: number;
  /** Where each value is declared in the original. */
  readonly source: string;
}

const um = rrect6;

/** blocks.js lines 14 to 44: the BLOCKS (blocks.html) standard; z values derived and rounded to the micron as lines 40 to 44 round them. */
export const BLOCKS_HTML: BrickStandard = (() => {
  const sockH = 2.2, flangeH = 0.6, isoT = 0.4, traceT = 0.6, gapT = 0.4;
  const flangeTop = um(sockH + flangeH);
  const L1 = um(flangeTop + isoT);
  const L2 = um(L1 + traceT + gapT);
  return {
    id: "blocks-html", layer: 0.2, P: 8.0, studD: 4.8, studH: 1.8, plateH: 3.2, brickH: 9.6,
    sockH, flangeH, sockIDflex: 4.6, sockOD: 6.6, padD: 5.6, postD: 3.0,
    flangeTop, L1, L2, traceT, gapT, padTop: um(L2 + traceT),
    source: "originals/blocks/files/src-extracted/blocks.js lines 14 to 44 (STD), line 13 (L)",
  };
})();

/** boss.js lines 5 and 11 to 25: the BOSS v1 standard. */
export const BOSS_V1: BrickStandard = (() => {
  const L1 = 3.36, traceT = 0.72, gapT = 0.48;
  const L2 = L1 + traceT + gapT;
  return {
    id: "boss-v1", layer: 0.24, P: 8.0, studD: 4.8, studH: 1.8, plateH: 3.2, brickH: 9.6,
    sockH: 2.4, flangeH: 0.72, sockIDflex: 4.6, sockOD: 6.6, padD: null, postD: 3.0,
    flangeTop: 2.4 + 0.72, L1, L2, traceT, gapT, padTop: L2 + traceT,
    source: "originals/boss/files/boss-src/src/boss.js line 5 (L) and lines 11 to 25 (STD)",
  };
})();

export const BRICK_STANDARDS = { "blocks-html": BLOCKS_HTML, "boss-v1": BOSS_V1 } as const;
export type BrickStandardId = keyof typeof BRICK_STANDARDS;

