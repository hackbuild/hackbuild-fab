// reference/cosmetic/coin-inlay/build.ts
// The coin-inlay build (M03-T08 step 5): a prism blank in slot 1 and one
// `inlay` feature per art slot. Each feature carries the whole art, both
// faces, so the kind splits it into one body per slot as COLLAR does, and
// names it by its content address (packages/inlay/src/kind.ts artUri). The
// layer count, the mark transform and that address are computed here, never
// in chase.ts (D-178).
//
// The mark paths are the two paths of hackbuild-mark.svg verbatim (viewBox
// 117 103 800 800; the wrench at translate(498, 314), the arc at
// translate(490, 121)), the same strings as COLLAR's LOGO_WRENCH and
// LOGO_ARC (collar.html lines 605 and 606); lineage brand.mark/seed-svg.
// The view box centre (517, 503) sits on the coin centre and its 800 units
// span markSpan mm; SVG y runs down, model y up, so the y scale is negative.
//
// Initials are a COLLAR text layer (collar.html:1010 to 1072, the inlay
// TextLayer) on the back face in the pink slot, centred on the coin with
// SPRUE's middle baseline (sprue.html:1088). They are set from the vendored
// IBM Plex Mono table in packages/geom, the one face node carries. An empty
// string adds no layer, so the art, its uri and every body equal the coin
// without the param.
//
// Hygiene is the print-forge recipe (INLAY part2.js:206 to 217, lineage
// inlay.parts/inlay-kind-recipe): it opens each slot at the min feature,
// the one recipe whose output CHK-INL-01 can pass on art with sharp
// corners. collar-v5 has no open step, so every corner of the mark would
// read as a stroke under the floor (M03-T08 card defects).

import { canonicalize, commandError, defineBuild, sha256Hex, type FaceFrame } from "@hackbuild/spec";
import { chase } from "./chase";

/** hackbuild-mark.svg, verbatim. */
const MARK = {
  viewBox: [117, 103, 800, 800],
  arc: {
    at: [490, 121],
    d: "m0 0h38l34 3 29 5 25 6 26 8 21 8 20 9 20 10 23 14 19 13 12 10 11 9 16 15 9 9 7 8 9 10 15 20 18 27 13 23 13 28 10 26 8 26 6 27 4 27 2 25v29l-2 28-5 32-6 27-8 27-10 25-12 25-10 17-13 19-10 13-11 13-7 8-9 10-20 20-8 7-15 13-16 12-19 13-13 8-18 10-27 13-29 11-24 7-24 5-27 4-24 2h-25l-27-3-20-4-16-5-12-6-8-7-7-10-4-8-2-10v-13l4-13 7-12 11-11 14-8 12-3h16l24 3 23 1 25-1 22-3 30-7 18-6 25-11 22-12 21-14 10-8 13-11 13-13 9-11 10-13 10-15 12-22 9-20 10-30 6-27 3-19 2-26v-20l-3-29-6-26-8-24-8-18-11-21-14-21-11-14-9-10-7-8-16-16-11-9-15-12-17-11-14-8-16-8-14-6-24-8-22-5-21-3-12-1h-37l-25 3-20 4-20 6-21 8-24 12-19 12-12 9-11 9-10 9-17 17-9 11-14 19-11 18-11 21-10 26-6 21-4 19-2 15-1 14v25l2 22 3 20v10l-4 16-7 11-6 7-13 9-13 5-5 1h-14l-12-3-12-6-10-9-6-7-7-14-4-18-3-26-1-16v-36l3-30 5-28 8-29 11-29 13-28 14-24 14-21 10-14 13-16 12-14 30-30 11-9 15-12 24-16 21-12 23-11 27-10 23-7 27-6 27-4z",
  },
  wrench: {
    at: [498, 314],
    d: "m0 0h25l14 3 6 4 3 4 1 8-4 8-11 10-20 16-14 12-14 14-10 14-8 16-4 15-1 6v20l4 18 5 13 6 11 9 12 6 7 11 9 14 9 16 7 16 4 8 1h15l16-3 16-6 14-8 13-10 13-12 9-9 2-3h2l2-4 11-12 7-9 5-4 9-2 9 3 6 7 2 5 1 9-3 25-5 23-7 21-13 27-10 15-8 10-9 10-12 12-14 11-18 11-23 11-19 6-23 5-21 2h-17l-23-2-14-2h-19l-16 4-12 7-10 8-63 63-9 8-13 8-13 6-11 3h-20l-15-4-17-9-11-9-9-11-7-15-2-10v-16l3-13 6-11 11-14 16-16 7-8 69-69 6-9 4-13-1-9-7-24-3-21v-31l3-22 6-21 7-17 11-19 10-13 11-12 13-13 16-12 16-10 19-10 19-7 19-5z",
  },
} as const;

/** Slots the art paints: the wrench, the arc and the back ring. */
const SLOT = { body: 1, wrench: 2, arc: 3, ring: 3, text: 2 } as const;

/** The face the initials are set in: a family the node text route carries, bold. */
const TEXT_FACE = { font: "IBM Plex Mono", bold: true } as const;

/** SVG matrix for one mark path: path units to model mm, the view box centre at the origin, y up. */
function markTransform(at: readonly [number, number], span: number): [number, number, number, number, number, number] {
  const [x0, y0, w, h] = MARK.viewBox;
  const s = span / w;
  const cx = x0 + w / 2, cy = y0 + h / 2;
  return [s, 0, 0, -s, (at[0] - cx) * s, -(at[1] - cy) * s];
}

export const build = defineBuild(chase, (p, k) => {
  const m = k.machine("ffc5p");
  const layers = Math.round(p.depth / m.layerHeight);
  if (layers < 1 || Math.abs(layers * m.layerHeight - p.depth) > 1e-6) {
    throw commandError({
      code: "E_SCHEMA", path: "/depth", got: p.depth, expected: `a whole number of ${m.layerHeight} mm layers on ${m.id}`,
      hint: `set depth to ${(Math.max(1, Math.floor(p.depth / m.layerHeight)) * m.layerHeight).toFixed(2)} or ${((Math.floor(p.depth / m.layerHeight) + 1) * m.layerHeight).toFixed(2)} mm (computed)`,
    });
  }
  if (p.ringOut <= p.ringIn || p.ringOut >= p.dia / 2) {
    throw commandError({
      code: "E_SCHEMA", path: "/ringOut", got: p.ringOut, expected: `above ring inner ${p.ringIn} and under the blank radius ${p.dia / 2} mm`,
      hint: "keep the back ring inside the blank",
    });
  }
  const R = p.dia / 2;
  const coin = k.body("coin", { role: "body", slot: SLOT.body, material: "petg", base: { route: "prism", outline: [k.ring.circle(R)], z: [0, p.thk] } });
  const top: FaceFrame = { origin: [0, 0, p.thk], normal: [0, 0, 1], u: [1, 0, 0] };
  const palette = [...chase.materials].sort((a, b) => a.slot - b.slot).map((s) => s.preview);
  const art = {
    grid: { w: p.res, h: p.res, res: p.res / p.dia },
    layers: {
      top: [
        { kind: "path", d: MARK.arc.d, transform: markTransform(MARK.arc.at, p.markSpan), slot: SLOT.arc },
        { kind: "path", d: MARK.wrench.d, transform: markTransform(MARK.wrench.at, p.markSpan), slot: SLOT.wrench },
      ],
      // As read in hand with the coin turned over; the kind mirrors it at extrude.
      bed: [
        { kind: "ring", slot: SLOT.ring, r0: p.ringIn, r1: p.ringOut, seg: p.ringSeg, duty: p.ringDuty },
        ...(p.initials === "" ? [] : [{
          kind: "text", text: p.initials, slot: SLOT.text, font: TEXT_FACE.font, bold: TEXT_FACE.bold, size: p.textSize,
          runGap: 0, mode: "straight", dx: 0, dy: 0, rot: 0, baseline: "middle",
        }]),
      ],
    },
    recipe: "print-forge",
    boost: p.boost,
    gap: p.gap,
    palette,
    minFeature: p.minF,
    despeckle: k.profile.constant("despeckle.factor").value,
  };
  const uri = `hbf://art/${sha256Hex(canonicalize(art))}`;
  const inlay = (name: string, slot: number) => k.bind({
    kind: "inlay" as const, id: `inlay.${name}`, body: coin.id, art: uri, face: top, slot,
    depthLayers: layers, minFeature: art.minFeature, despeckle: art.despeckle,
    grid: art.grid, layers: art.layers, recipe: art.recipe, boost: art.boost, gap: art.gap, palette: art.palette,
    material: "petg",
  }, { depthLayers: "/depth", minFeature: "/minF" });
  return k.part({
    id: "coin", name: "coin inlay", process: "fdm", machine: "ffc5p",
    bodies: [coin],
    features: [inlay("pink", SLOT.wrench), inlay("cream", SLOT.arc)],
    faces: [k.face("coin.top", top)],
  });
});
