// M07-T13: nest items as a jagua-rs 1.0.0 strip packing instance, and a
// sparrow solution read back as nest Placements. Evaluation only (D-137);
// nothing under packages/ imports this file.
//
// The frame. jagua-rs grows every item by half of min_item_separation and
// shrinks the strip by the same half (jagua-rs 1.0.0 src/io/import.rs
// with_min_item_separation), so a part keeps the separation from the strip
// edge as well as from its neighbours. nest keeps `margin` from the sheet
// edge and `gap` between parts (box.ts Frame). With the separation set to
// the gap, a strip of height H - 2 margin + 2 gap, shifted by margin - gap,
// keeps every part at least `margin` from the sheet edge. For OGEE16, where
// margin equals gap (cutfiles.py GAP), that is the card's strip of 400 cut
// at 600 exactly; for SLUG (margin 6, gap 4) it is 396 cut at 596.
//
// Items enter by their outer ring only (jagua-rs 1.0.0 rejects item holes);
// parts nest's own part-in-part pass put inside a hole ride with their host
// (M07-T13 step 2, part-in-part.ts composePlacement).

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// @hackbuild/spec ships as source with extensionless imports; the hbf CLI's resolve hook reads them
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
register(pathToFileURL(path.join(ROOT, "core/dist/resolve-hook.js")).href, import.meta.url);
const { classifyRings, extentOf, placeRings } = await import("@hackbuild/nest");

/** Turns the evaluation allows, deg, the card's 0, 90, 180, 270 (M07-T13 step 1). */
export const QUARTER_TURNS = [0, 90, 180, 270];

/** Vertex tolerance of the read back: sparrow stores transformations in f32, mm. */
export const READBACK_TOL = 1e-3;

/**
 * The strip a sheet becomes. `cut` is the largest x a kept part may reach in
 * strip coordinates; `shift` moves strip coordinates onto the sheet.
 */
export function stripFrame({ sheet, margin, gap }) {
  const [W, H] = sheet;
  const shift = margin - gap;
  if (shift < 0) throw new Error(`margin ${margin} below gap ${gap}: the strip would put a part closer to the edge than the margin`);
  return { stripHeight: H - 2 * shift, cut: W - margin - shift, shift, sheet: [W, H], margin, gap };
}

/** The outer ring of a part: its one ring at depth 0 (profile.ts classifyRings), consecutive repeats dropped. */
export function outerRing(rings) {
  const top = classifyRings(rings).filter((c) => c.depth === 0);
  if (top.length !== 1) throw new Error(`a part with ${top.length} rings at depth 0; sparrow takes one outer ring per item`);
  const out = [];
  for (const p of top[0].ring) {
    const q = out[out.length - 1];
    if (q === undefined || q[0] !== p[0] || q[1] !== p[1]) out.push([p[0], p[1]]);
  }
  while (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
}

const keyOf = (id, copy) => `${id}\u0000${copy}`;

/**
 * One instance for the roots left to place. A root that carries parts in
 * its holes is its own item with demand 1, so its inners stay with it; the
 * other roots of an id share one item whose demand is their count. Item ids
 * count from 0 in root order.
 */
export function toInstance(name, roots, ringsOf, frame, inners, rotations = QUARTER_TURNS) {
  const classes = [];
  const byId = new Map();
  for (const box of roots) {
    const carries = (inners.get(keyOf(box.id, box.copy)) ?? []).length > 0;
    if (!carries && byId.has(box.id)) {
      byId.get(box.id).boxes.push(box);
      continue;
    }
    const c = { id: classes.length, part: box.id, boxes: [box] };
    classes.push(c);
    if (!carries) byId.set(box.id, c);
  }
  const instance = {
    name,
    min_item_separation: frame.gap,
    strip_height: frame.stripHeight,
    items: classes.map((c) => ({
      id: c.id,
      demand: c.boxes.length,
      orientation: { rotation: { mode: "discrete", angles: rotations } },
      shape: { type: "simple_polygon", data: outerRing(ringsOf(c.part)) },
    })),
  };
  return { instance, classes };
}

/** A sparrow rotation, deg, as a quarter turn; anything else is refused. */
export function quarterOf(deg) {
  const q = Math.round(deg / 90);
  if (Math.abs(deg - 90 * q) > 1e-3) throw new Error(`rotation ${deg} deg is not a quarter turn`);
  return (((q % 4) + 4) % 4) * 90;
}

/** A point rotated counter-clockwise by a quarter turn, then moved. */
function transform([x, y], rot, [tx, ty]) {
  if (rot === 90) return [tx - y, ty + x];
  if (rot === 180) return [tx - x, ty - y];
  if (rot === 270) return [tx + y, ty - x];
  return [tx + x, ty + y];
}

const clean = (v) => (Object.is(v, -0) ? 0 : v);

/**
 * The solution of one strip as placed parts in strip coordinates. Copies of
 * a class are handed out by position (x, then y), so the copy numbers never
 * depend on the order sparrow lists its placements. Each placement is
 * checked against nest's own rule: placeRings at the bbox corner and turn
 * found here must give the rings sparrow's transformation gives, within
 * READBACK_TOL.
 */
export function readSolution(output, classes, ringsOf) {
  const placed = output.solution.layout.placed_items.map((pi) => {
    const c = classes[pi.item_id];
    if (c === undefined) throw new Error(`placed item ${pi.item_id} is not in the instance`);
    const t = pi.transformation;
    if (t.reflected) throw new Error(`item ${pi.item_id} came back reflected; the instance allows no reflection`);
    const rot = quarterOf(t.rotation);
    const rings = ringsOf(c.part).map((ring) => ring.map((p) => transform(p, rot, t.translation)));
    const e = extentOf(rings);
    const at = [clean(e.x0), clean(e.y0)];
    const again = placeRings(ringsOf(c.part), at, rot);
    let worst = 0;
    rings.forEach((ring, r) => ring.forEach(([x, y], k) => {
      worst = Math.max(worst, Math.abs(x - again[r][k][0]), Math.abs(y - again[r][k][1]));
    }));
    if (worst > READBACK_TOL) throw new Error(`item ${c.part}: placeRings differs from the sparrow transformation by ${worst} mm`);
    return { cls: c, rot, at, w: e.w, h: e.h, outer: outerRing(rings) };
  });
  placed.sort((a, b) => a.cls.id - b.cls.id || a.at[0] - b.at[0] || a.at[1] - b.at[1]);
  const used = new Map();
  for (const p of placed) {
    const n = used.get(p.cls.id) ?? 0;
    p.box = p.cls.boxes[n];
    if (p.box === undefined) throw new Error(`class ${p.cls.id} placed more than its demand ${p.cls.boxes.length}`);
    used.set(p.cls.id, n + 1);
  }
  for (const c of classes) {
    if ((used.get(c.id) ?? 0) !== c.boxes.length) throw new Error(`class ${c.id} (${c.part}) placed ${used.get(c.id) ?? 0} of ${c.boxes.length}`);
  }
  return placed;
}
