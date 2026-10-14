// The nest scene manifest (M07-T14): every scene id nest.pack and export.run
// take by --scene, its kind and how it loads. A sheet scene runs through
// cutScene to DXF and SVG; a plate scene through packPlates to 3MF plates.
// core imports this file by path until M10 moves scene items into build.ts;
// it is the one list of scene ids, so a scene not named here does not run.
//
// This file imports spec and its sibling scenes only, so Node strips it
// without a build.

import { commandError, didYouMean, type ProfileLookup } from "@hackbuild/spec";
import type { SheetScene } from "../src/scene.js";
import type { PlateScene } from "../src/plates.js";
import { DRIVES, ogee16PlatesScene, type Drive } from "./ogee16-r16p-plates.js";
import { severedDeckScene } from "./severed-deck.js";
import { slugSheetsCompleteScene } from "./slug-sheets-complete.js";
import { slugSheetsScene } from "./slug-sheets.js";

/** Scene params a call may set, by name; each scene names the ones it reads. */
export type SceneParams = Readonly<Record<string, unknown>>;

export type SceneEntry =
  | { readonly id: string; readonly kind: "sheet"; readonly params: readonly string[]; load(profile: ProfileLookup, p: SceneParams): SheetScene }
  | { readonly id: string; readonly kind: "plate"; readonly params: readonly string[]; load(profile: ProfileLookup, p: SceneParams): PlateScene };

function drive(p: SceneParams): Drive {
  const d = p["drive"] ?? "knobs";
  if (!(DRIVES as readonly unknown[]).includes(d)) {
    throw commandError({ code: "E_REF", path: "/params/drive", got: d, didYouMean: didYouMean(String(d), DRIVES), hint: `set drive to ${DRIVES.join(" or ")}` });
  }
  return d as Drive;
}

export const SCENES: readonly SceneEntry[] = [
  { id: "slug-sheets", kind: "sheet", params: [], load: () => slugSheetsScene() },
  { id: "slug-sheets-complete", kind: "sheet", params: [], load: () => slugSheetsCompleteScene() },
  { id: "severed-deck", kind: "sheet", params: [], load: (profile) => severedDeckScene(profile) },
  { id: "ogee16-r16p-plates", kind: "plate", params: ["drive"], load: (profile, p) => ogee16PlatesScene(profile, drive(p)) },
];
