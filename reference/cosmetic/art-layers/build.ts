// reference/cosmetic/art-layers/build.ts
// The art-layers build: a prism blank in slot 1 and one `inlay` feature per
// art slot, each carrying the whole art, both faces, under its content
// address (packages/inlay/src/kind.ts artUri), as cosmetic/coin-inlay does.
// The layers are the lowered form of the art document in packages/inlay/test/
// art-layers.test.ts (spec/art.ts, lowered by packages/inlay/src/
// art-lower.ts): a build.ts may import only spec, so it writes the
// painter layers as data, and that test holds them equal to the document.
//
// Front face as read in hand, three rows of six cells (pitch 16 mm by 20 mm
// at the default): row 1 ring, rect, ellipse, frame, diamond, chevrons;
// row 2 grid, sun, saguaro, mesa, zigzag, steps; row 3 arrow, scope,
// circuit, the hack.build mark and a line of text across the last two
// cells. Back face: two arcs of text, spaced text and an arrow. Slots
// alternate 2 and 3 along each row, so every kind paints at least once and
// each art slot has islands on both faces.

import { canonicalize, commandError, defineBuild, sha256Hex, type FaceFrame } from "@hackbuild/spec";
import { chase } from "./chase";

/** Slots the art paints. */
const SLOT = { body: 1, pink: 2, cream: 3 } as const;

/** The face the text is set in: a family the node text route carries, bold. */
const TEXT = { font: "IBM Plex Mono", bold: true } as const;

const SHAPES = [
  ["ring", "rect", "ellipse", "frame", "diamond", "chevrons"],
  ["grid", "sun", "saguaro", "mesa", "zigzag", "steps"],
  ["arrow"],
] as const;

export const build = defineBuild(chase, (p, k) => {
  const m = k.machine("ffc5p");
  const layers = Math.round(p.depth / m.layerHeight);
  if (layers < 1 || Math.abs(layers * m.layerHeight - p.depth) > 1e-6) {
    throw commandError({
      code: "E_SCHEMA", path: "/depth", got: p.depth, expected: `a whole number of ${m.layerHeight} mm layers on ${m.id}`,
      hint: `set depth to ${(Math.max(1, Math.floor(p.depth / m.layerHeight)) * m.layerHeight).toFixed(2)} or ${((Math.floor(p.depth / m.layerHeight) + 1) * m.layerHeight).toFixed(2)} mm (computed)`,
    });
  }
  const pitchX = (p.w - 4) / 6, rowY = [20, 0, -20] as const;
  if (p.size + 2 > pitchX || p.h / 2 < rowY[0] + p.size / 2 + 1) {
    throw commandError({
      code: "E_SCHEMA", path: "/size", got: p.size, expected: `shapes inside their cell: under ${(pitchX - 2).toFixed(1)} mm across and ${(2 * (p.h / 2 - 1 - rowY[0])).toFixed(1)} mm tall`,
      hint: "make the shapes smaller or the plate larger",
    });
  }
  const cx = (c: number): number => -p.w / 2 + 2 + pitchX * (c + 0.5);
  const S = p.size, t = p.stroke;
  const plate = k.body("plate", { role: "body", slot: SLOT.body, material: "petg", base: { route: "prism", outline: [k.ring.roundRect(p.w, p.h, 2)], z: [0, p.thk] } });
  const top: FaceFrame = { origin: [0, 0, p.thk], normal: [0, 0, 1], u: [1, 0, 0] };
  const palette = [...chase.materials].sort((a, b) => a.slot - b.slot).map((s) => s.preview);

  // One shape layer per cell; extents follow BAIL's presets (ellipse and arrow are wider than tall).
  const shape = (name: string, col: number, row: number, slot: number) => {
    const w = name === "saguaro" ? 0.86 * S : S, h = name === "ellipse" ? 0.7 * S : name === "arrow" ? 0.55 * S : S;
    const stroke = name === "grid" ? 0.8 : name === "sun" ? 1.4 : t;
    return { kind: "shape", shape: name, w, h, t: stroke, n: name === "grid" ? 4 : name === "sun" ? 4 : name === "steps" ? 3 : name === "zigzag" ? 3 : 4, dx: cx(col), dy: rowY[row]!, rot: 0, slot };
  };
  const front: unknown[] = [];
  SHAPES[0].forEach((name, c) => front.push(shape(name, c, 0, c % 2 === 0 ? SLOT.pink : SLOT.cream)));
  SHAPES[1].forEach((name, c) => front.push(shape(name, c, 1, c % 2 === 0 ? SLOT.cream : SLOT.pink)));
  front.push(shape("arrow", 0, 2, SLOT.pink));
  front.push({ kind: "scope", a: 3, b: 2, phase: 90, w: S, h: 0.86 * S, t: 0.8, dx: cx(1), dy: rowY[2], rot: 0, slot: SLOT.cream });
  front.push({ kind: "circuit", seed: p.seed, w: S, h: S, pitch: 2.4, tw: 0.8, pad: 2.2, drill: 0.7, density: 1, clip: "ellipse", dx: cx(2), dy: rowY[2], rot: 0, slot: SLOT.pink, slot2: SLOT.cream });
  front.push({ kind: "logo", brand: "hb", w: S, dx: cx(3), dy: rowY[2], rot: 0, slot: SLOT.cream, slot2: SLOT.pink });
  front.push({
    kind: "text", text: "hack|.build", slot: SLOT.pink, accent: SLOT.cream, font: TEXT.font, bold: TEXT.bold, size: 4, runGap: 0.6,
    mode: "straight", dx: (cx(4) + cx(5)) / 2, dy: rowY[2], rot: 0, baseline: "middle", ls: 0.3,
  });
  const arc = (text: string, radius: number, slot: number) => ({
    kind: "text", text, slot, font: TEXT.font, bold: TEXT.bold, size: 5, runGap: 0, mode: "arc",
    arcR: Math.abs(radius), arcDeg: radius > 0 ? 90 : -90, flip: radius < 0, anchored: true, dx: 0, dy: 0, rot: 0, baseline: "middle", ls: 0.6,
  });
  const back = [
    arc("MAKE THINGS", 24, SLOT.pink),
    arc("BREAK THINGS", -24, SLOT.cream),
    {
      kind: "text", text: "REPEAT", slot: SLOT.pink, font: TEXT.font, bold: TEXT.bold, size: 6, runGap: 0, mode: "straight",
      dx: 0, dy: 6, rot: 0, baseline: "middle", ls: 0.5,
    },
    { ...shape("arrow", 0, 2, SLOT.cream), dx: 0, dy: -6, w: 1.6 * S },
  ];

  const art = {
    grid: { w: Math.round(p.w * p.cells), h: Math.round(p.h * p.cells), res: p.cells },
    layers: { top: front, bed: back },
    recipe: "print-forge",
    boost: p.boost,
    gap: p.gap,
    palette,
    minFeature: p.minF,
    despeckle: k.profile.constant("despeckle.factor").value,
  };
  const uri = `hbf://art/${sha256Hex(canonicalize(art))}`;
  const inlay = (name: string, slot: number) => k.bind({
    kind: "inlay" as const, id: `inlay.${name}`, body: plate.id, art: uri, face: top, slot,
    depthLayers: layers, minFeature: art.minFeature, despeckle: art.despeckle,
    grid: art.grid, layers: art.layers, recipe: art.recipe, boost: art.boost, gap: art.gap, palette: art.palette,
    material: "petg",
  }, { depthLayers: "/depth", minFeature: "/minF" });
  return k.part({
    id: "plate", name: "art layers", process: "fdm", machine: "ffc5p",
    bodies: [plate],
    features: [inlay("pink", SLOT.pink), inlay("cream", SLOT.cream)],
    faces: [k.face("plate.top", top)],
  });
});
