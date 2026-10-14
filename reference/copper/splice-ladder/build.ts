// reference/copper/splice-ladder/build.ts
// SPLICE rev C as declarations (M05-T14): the cut file to read, the net
// names in its path order, the pitch and the width. packages/copper reads
// the file through the D-166 sanitiser and audits the ladder and the
// weedability; nothing here touches geometry.

import type { LadderDecl } from "@hackbuild/copper";
import type { SpliceParams } from "./chase.surface";

export function build(p: SpliceParams): LadderDecl {
  return { source: "legacy/splice-copper.svg", nets: p.nets.split(/\s+/).filter((n) => n.length > 0), pitch: p.pitch, width: p.width };
}
