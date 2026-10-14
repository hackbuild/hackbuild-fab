// pin-free-balance-beam body: STIPPLE R17b's link, made the way the page
// makes it. The original carries no outline generator (record section 1,
// "generator source MISSING"; the 27 outlines in DATA.parts, line 117, are
// the only copy). Its body is geomOf("link") (lines 186 to 194): the
// DATA.parts.link rings extruded to depth T (DATA.P.T, the "T" flag) by
// THREE.ExtrudeGeometry. The port declares the same ring as a prism of
// depth t on the face, outer ring counter-clockwise as the prism route
// reads it. The ring is the original's at NOSE_R 2, BOSS_R 1.6, CROWN_R 6,
// CROWN_HX 2.5, LINK_UND 1.2 and LINK_L 12 (DATA.P); the page cannot
// redraw it at other values, so neither can the port, and apply() warns
// when those params move. test/legacy/record-balance-beam.mjs records the
// ring and the mesh the page builds; test/balance-beam.body.test.ts holds
// this file to that record.

import type { ApplyIn, BodyDraft, BuildWarning, MechanismApplyOut, Vec2 } from "@hackbuild/spec";
import { wind } from "../tumbler/generate.js";
import type { Values } from "../derive/common.js";

/** DATA.parts.link.rings[0].o of stipple-r17b.html line 117, mm, in the page's order; no holes. */
export const STIPPLE_LINK_RING: readonly Vec2[] = [
  [-7.176, 1.618], [-6.618, 1.902], [-6, 2], [-2.5, 2], [-2.5, 5.6], [-2.063, 5.6], [-1.854, 5.706], [0, 6],
  [1.854, 5.706], [2.063, 5.6], [2.5, 5.6], [2.5, 2], [6, 2], [6, 1.6], [6.494, 1.522], [6.94, 1.294],
  [7.294, 0.94], [7.522, 0.494], [7.6, 0], [7.522, -0.494], [7.294, -0.94], [6.94, -1.294], [6.494, -1.522], [6, -1.6],
  [5.506, -1.522], [5.06, -1.294], [4.706, -0.94], [4.478, -0.494], [4.4, 0], [4.478, 0.494], [4.706, 0.94], [4.726, 0.961],
  [4.4, 0.9], [2.5, 0.9], [2.5, 0.5], [0.768, 0.5], [-1, -0.35], [-3.8, -1.55], [-5.288, -1.854], [-5.382, -1.902],
  [-6, -2], [-6.618, -1.902], [-7.176, -1.618], [-7.618, -1.176], [-7.902, -0.618], [-8, 0], [-8, 1.2], [-7.323, 1.471],
];

/** The DATA.P values the ring was drawn at, by def param key. */
export const STIPPLE_LINK_DRAWN_AT: Readonly<Record<string, number>> = { noseR: 2, bossR: 1.6, crownR: 6, linkL: 12 };

/** apply(): the link cut from sheet t at the face origin, as geomOf builds it. */
export function balanceBeamApply(input: ApplyIn<Values>): MechanismApplyOut {
  const p = input.params;
  const o = input.face.origin;
  const ring = wind(STIPPLE_LINK_RING.map((q): Vec2 => [q[0] + o[0], q[1] + o[1]]), true);
  const body: BodyDraft = { id: "link", role: "body", slot: 1, material: "", base: { route: "prism", outline: [ring], z: [o[2], o[2] + p["t"]!] } };
  const warnings: BuildWarning[] = Object.entries(STIPPLE_LINK_DRAWN_AT)
    .filter(([k, v]) => p[k] !== v)
    .map(([k, v]): BuildWarning => ({
      code: "LINK_OUTLINE",
      text: `link outline is the original's ring drawn at ${k} ${v} mm; ${k} ${p[k]} mm moves the numbers, not the body`,
      param: `/${k}`,
    }));
  return { bodies: [body], features: [], metrics: [], assertions: [], warnings };
}
