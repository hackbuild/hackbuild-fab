// Scene severed-deck (M07-T14): the M07-T04 connectivity fixture as a sheet
// scene, so nest.pack and export.run show the refusal on the command line.
// The items are packages/nest/test/fixtures/severed-deck.json as written
// (a 200 x 20 mm deck whose 4 mm channel runs edge to edge, and the same
// deck with the channel stopped 3 mm short); nothing is typed here. The
// sheet is the envelope of machine sheet600 (profile), and the margin and
// gap are the SLUG page's sheet controls, the only settings on record for
// that machine (slug.html lines 176 and 177). The deck is refused before
// anything is placed, so neither number reaches a layout. Kerf mode none:
// sheet600 has no kerf until a coupon is cut (D-101).
//
// This file imports node, types and its sibling scene only, so Node strips
// it without a build.

import { readFileSync } from "node:fs";
import type { NestItem, NestRequest, ProfileLookup } from "@hackbuild/spec";
import type { SheetScene } from "../src/scene.js";
import { slugSheetControls } from "./slug-sheets.js";

const FIXTURE = new URL("../test/fixtures/severed-deck.json", import.meta.url);
const MACHINE = "sheet600";

export function severedDeckScene(profile: ProfileLookup): SheetScene {
  const items = (JSON.parse(readFileSync(FIXTURE, "utf8")) as { items: NestItem[] }).items;
  const env = profile.machine(MACHINE).envelope;
  if (!("sheet" in env)) throw new Error(`scene severed-deck: machine ${MACHINE} has no sheet envelope`);
  const c = slugSheetControls();
  const request: NestRequest = {
    items, sheet: [env.sheet[0], env.sheet[1]], margin: c.margin, gap: c.gap,
    mode: "fill", rotations: [0, 90], partInPart: false, seed: 0,
  };
  return {
    id: "severed-deck", request, machine: MACHINE, kerfMode: "none", write: { arcs: false },
    prefix: "severed-deck", labels: { ply3: "ply" }, qualifier: "computed",
    sources: [
      "items: packages/nest/test/fixtures/severed-deck.json (M07-T04, synthetic, after the OGEE R12 deck)",
      `sheet: profile machine ${MACHINE} sheet envelope`,
      "margin, gap: fab-knowledge:originals/slug/files/slug.html lines 176 and 177 (nGap, nMar)",
    ],
  };
}
