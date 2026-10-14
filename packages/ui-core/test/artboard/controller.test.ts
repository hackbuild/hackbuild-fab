// M03-T12 step 7: the headless half of the art board on synthetic events
// against a stub surface. Expected numbers are worked here from the rules
// in the card table and the KNUCKLE editor (part6.js:402 to 560): cell
// centres at (i + 0.5 - w / 2) / res, the 0.84 fit, the handle constants,
// the snap and nudge steps.

import { describe, expect, test } from "vitest";
import type { ImageLayer, RgbaImage } from "@hackbuild/inlay";
import { createArtBoard, type ArtBoard, type ArtBoardOptions } from "../../src/artboard/controller.js";
import { BBoxCache } from "../../src/artboard/bbox-cache.js";
import { hitTest, insideBox, layerHandles, mm2px, px2mm, snapMove, snapRotation } from "../../src/artboard/hit.js";
import { keyAction } from "../../src/artboard/keys.js";
import type { ArtLayer } from "../../src/artboard/manip.js";
import { ADVANCE, CAP, stubSurface, type StubSurface } from "./stub-surface.js";

const IMG: RgbaImage = { width: 10, height: 10, data: new Uint8ClampedArray(400).fill(255) };

function layers(): ArtLayer[] {
  return [
    { id: "R", kind: "ring", slot: 1, r0: 17, r1: 19 },
    { id: "I", kind: "image", img: IMG, mode: "alpha", slot: 2, scale: 0.25, dx: -8, dy: -8, rot: 0 },
    { id: "T", kind: "text", text: "HACK", slot: 1, font: "stub", size: 5, runGap: 0, mode: "straight", dx: 0, dy: 6, rot: 0 },
    { id: "A", kind: "text", text: "ARC", slot: 1, font: "stub", size: 3, runGap: 0, mode: "arc", arcR: 14, arcDeg: -90, dx: 0, dy: 0, rot: 0 },
  ];
}

interface Rig {
  b: ArtBoard;
  list: ArtLayer[];
  surfaces: StubSurface[];
  log: { type: string; v: unknown }[];
}

function rig(extra: Partial<ArtBoardOptions> = {}): Rig {
  const list = layers();
  const surfaces: StubSurface[] = [];
  const log: { type: string; v: unknown }[] = [];
  const b = createArtBoard({
    frame: { w: 40, h: 40, rArt: 18 },
    layers: list,
    surface: (g) => {
      const s = stubSurface(g);
      surfaces.push(s);
      return s;
    },
    dropLayer: (img, x, y, id): ImageLayer & { id: string } => ({ id, kind: "image", img, mode: "alpha", slot: 1, scale: 0.5, dx: x, dy: y, rot: 0 }),
    ...extra,
  });
  for (const t of ["select", "touch", "commit", "focusText"] as const) b.on(t, (v: unknown) => log.push({ type: t, v }));
  return { b, list, surfaces, log };
}

const get = (r: Rig, id: string): ArtLayer => r.list.find((L) => L.id === id)!;
const P = (x: number, y: number, o: { button?: number; shiftKey?: boolean; altKey?: boolean } = {}) => ({ x, y, button: o.button ?? 0, shiftKey: o.shiftKey ?? false, altKey: o.altKey ?? false });
const K = (key: string, o: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean } = {}) => ({ key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...o });

// 400 x 400 canvas, 40 mm board: 400 / 40 x 0.84 = 8.4 px per mm, origin at (200, 200)
const S = 8.4;
// the quick raster for bounds is (2 x 40 + 8) x 4 = 352 cells square at 4 per mm
const cell = (k: number): number => (k + 0.5 - 176) / 4;
// "HACK" at 5 mm: 4 x 0.6 x 5 = 12 mm wide from -6, cap 3.5 mm above the baseline
const TW = 4 * ADVANCE * 5, TC = CAP * 5;
const T_BB = { x0: cell(Math.ceil(176 - 0.5 - TW / 2 * 4)) - 0.5, x1: cell(Math.floor(176 - 0.5 + TW / 2 * 4)) + 0.5, y0: cell(176) - 0.5, y1: cell(Math.floor(176 - 0.5 + TC * 4)) + 0.5 };

describe("handle geometry", () => {
  test("text bounds are the mask bounds of the layer drawn alone, padded 0.5 mm", () => {
    const r = rig();
    expect(T_BB).toEqual({ x0: -6.375, x1: 6.375, y0: -0.375, y1: 3.875 });
    expect(r.b.bbox(get(r, "T"))).toEqual(T_BB);
  });

  test("ring corners, top and dot in canvas px at the default view", () => {
    const r = rig();
    r.b.select("R");
    const h = r.b.handles()!;
    // outermost painted cell centre inside r1 19 is 18.875; plus 0.5 pad
    const e = 19.375 * S;
    expect(h.corners.map((c) => c.map((v) => +v.toFixed(6)))).toEqual([[200 - e, 200 + e], [200 + e, 200 + e], [200 + e, 200 - e], [200 - e, 200 - e]]);
    expect(h.top.map((v) => +v.toFixed(6))).toEqual([200, 200 - e]);
    expect(h.dot.map((v) => +v.toFixed(6))).toEqual([200, +(200 - e - 26).toFixed(6)]);
    expect(h.centre).toEqual([200, 200]);
  });

  test("handles turn with the layer: at 90 degrees the dot sits left of the top", () => {
    const h = layerHandles({ x0: -10, y0: -5, x1: 10, y1: 5 }, { dx: 0, dy: 0, rot: 90 }, { scale: 10, ox: 200, oy: 200 });
    expect(h.top.map((v) => Math.round(v))).toEqual([150, 200]);
    expect(h.dot.map((v) => Math.round(v))).toEqual([124, 200]);
    expect(h.corners[0].map((v) => Math.round(v))).toEqual([250, 300]);
  });

  test("mm2px and px2mm invert, y up in mm and down in px", () => {
    const v = { scale: 8.4, ox: 210, oy: 190 };
    expect(mm2px(v, 1, 1)).toEqual([218.4, 181.6]);
    const [x, y] = px2mm(v, 218.4, 181.6);
    expect(x).toBeCloseTo(1, 12);
    expect(y).toBeCloseTo(1, 12);
  });

  test("insideBox takes a rotated quad and its edges", () => {
    const q = { corners: [[0, 10], [10, 0], [20, 10], [10, 20]] as const };
    expect(insideBox(q, 10, 10)).toBe(true);
    expect(insideBox(q, 1, 1)).toBe(false);
    expect(insideBox(q, 5, 5)).toBe(true);
  });
});

describe("hit testing", () => {
  test("dot within 9 px rotates, a corner scales, the box moves, else the topmost box selects", () => {
    const r = rig();
    r.b.select("T");
    const h = r.b.handles()!;
    expect(r.b.cursor(h.dot[0] + 9, h.dot[1])).toBe("crosshair");
    expect(r.b.cursor(h.dot[0] + 9.5, h.dot[1])).toBe("pointer");
    expect(r.b.cursor(h.corners[1][0] - 8, h.corners[1][1] + 1)).toBe("nwse-resize");
    expect(r.b.cursor(h.centre[0], h.centre[1] - 5)).toBe("grab");
    expect(r.b.cursor(5, 395)).toBe("default");
  });

  test("hitTest prefers the selected layer's handles, then the last painted layer", () => {
    const box = (x: number) => ({ bb: { x0: 0, y0: 0, x1: 1, y1: 1 }, corners: [[x, 40], [x + 40, 40], [x + 40, 0], [x, 0]] as const, top: [x + 20, 0] as const, dot: [x + 20, -26] as const, centre: [x + 20, 20] as const });
    const boxes: Record<string, ReturnType<typeof box>> = { a: box(0), b: box(20) };
    expect(hitTest(["a", "b"], null, (id) => boxes[id]!, 30, 20)).toEqual({ mode: "select", id: "b" });
    expect(hitTest(["a", "b"], "a", (id) => boxes[id]!, 30, 20)).toEqual({ mode: "move", id: "a" });
    expect(hitTest(["a", "b"], "a", (id) => boxes[id]!, 20, -20)).toEqual({ mode: "rotate", id: "a" });
    expect(hitTest(["a", "b"], "a", (id) => boxes[id]!, 47, 2)).toEqual({ mode: "scale", id: "a", corner: 2 });
    expect(hitTest(["a", "b"], "a", (id) => boxes[id]!, 90, 90)).toEqual({ mode: "none" });
  });

  test("a click selects the topmost layer and emits select; empty board deselects", () => {
    const r = rig();
    const c = mm2px(r.b.view(), -8, -8);
    r.b.pointerDown(P(c[0], c[1]));
    r.b.pointerUp();
    expect(r.b.selected()?.id).toBe("I");
    r.b.pointerDown(P(5, 395));
    r.b.pointerUp();
    expect(r.b.selected()).toBeNull();
    expect(r.log.filter((e) => e.type === "select").map((e) => e.v)).toEqual(["I", null]);
    expect(r.log.some((e) => e.type === "commit")).toBe(false);
  });
});

describe("snap rules", () => {
  test("rotation snaps within 4 degrees, shift rounds to 15, alt keeps the angle", () => {
    const n = { shiftKey: false, altKey: false };
    expect(snapRotation(93, n)).toBe(90);
    expect(snapRotation(86, n)).toBe(86);
    expect(snapRotation(86.5, n)).toBe(90);
    expect(snapRotation(183, n)).toBe(-180);
    expect(snapRotation(52, { shiftKey: true, altKey: false })).toBe(45);
    expect(snapRotation(93, { shiftKey: false, altKey: true })).toBe(93);
  });

  test("moves snap to the centre within 0.6 mm unless alt, lock with shift, land on 0.25", () => {
    const n = { shiftKey: false, altKey: false };
    expect(snapMove(0, 6, 0.59, 0, n)).toEqual({ x: 0, y: 6, snapped: { x: true, y: false } });
    expect(snapMove(0, 6, 0.61, 0, n)).toEqual({ x: 0.5, y: 6, snapped: { x: false, y: false } });
    expect(snapMove(0, 6, 0.3, 0, { shiftKey: false, altKey: true })).toEqual({ x: 0.25, y: 6, snapped: { x: false, y: false } });
    expect(snapMove(0, 6, 3, 1, { shiftKey: true, altKey: false }).y).toBe(6);
    expect(snapMove(0, 6, 1, 3, { shiftKey: true, altKey: false }).x).toBe(0);
  });
});

/** Drag from a to b in px, one move, with modifiers on the move. */
function dragPx(r: Rig, a: readonly number[], b: readonly number[], o: { button?: number; shiftKey?: boolean; altKey?: boolean } = {}): void {
  r.b.pointerDown(P(a[0]!, a[1]!, { button: o.button ?? 0 }));
  r.b.pointerMove(P(b[0]!, b[1]!, o));
  r.b.pointerUp();
}

/** Pointer at `deg` degrees about T's centre, 5 mm out, in px. */
function atAngle(r: Rig, deg: number): readonly [number, number] {
  const L = get(r, "T") as { dx: number; dy: number };
  const a = deg * Math.PI / 180;
  return mm2px(r.b.view(), L.dx + 5 * Math.cos(a), L.dy + 5 * Math.sin(a));
}

describe("drags through the controller", () => {
  test.each([
    ["no modifier at 93 degrees commits 90", 93, {}, 90],
    ["shift at 52 degrees commits 45", 52, { shiftKey: true }, 45],
    ["alt at 93 degrees commits 93", 93, { altKey: true }, 93],
  ])("rotate: %s", (_n, deg, mods, want) => {
    const r = rig();
    r.b.select("T");
    // the dot sits on the layer's +y, at 90 degrees about the centre
    dragPx(r, r.b.handles()!.dot, atAngle(r, 90 + deg), mods);
    const c = r.log.filter((e) => e.type === "commit");
    expect(c).toHaveLength(1);
    expect((c[0]!.v as { reason: string }).reason).toBe("drag");
    expect((get(r, "T") as { rot: number }).rot).toBe(want);
  });

  test("move: 30 px right and 20 px up lands on the 0.25 grid", () => {
    const r = rig();
    r.b.select("T");
    const c = r.b.handles()!.centre;
    dragPx(r, [c[0], c[1] - 5], [c[0] + 30, c[1] - 25]);
    const L = get(r, "T") as { dx: number; dy: number };
    expect(L.dx).toBe(Math.round(30 / S * 4) / 4);
    expect(L.dy).toBe(Math.round((6 + 20 / S) * 4) / 4);
  });

  test("move: centre snap shows its guide; alt disables it; shift locks the axis", () => {
    const r = rig();
    r.b.select("T");
    const c = r.b.handles()!.centre, at = [c[0], c[1] - 5];
    r.b.pointerDown(P(at[0]!, at[1]!));
    r.b.pointerMove(P(at[0]! + 0.3 * S, at[1]!));
    expect((get(r, "T") as { dx: number }).dx).toBe(0);
    expect(r.b.drag()).toEqual({ mode: "move", snapped: { x: true, y: false } });
    r.b.pointerMove(P(at[0]! + 0.3 * S, at[1]!, { altKey: true }));
    expect((get(r, "T") as { dx: number }).dx).toBe(0.25);
    r.b.pointerMove(P(at[0]! + 30, at[1]! - 10, { shiftKey: true }));
    expect((get(r, "T") as { dy: number }).dy).toBe(6);
    r.b.pointerUp();
    expect(r.log.filter((e) => e.type === "touch")).toHaveLength(3);
  });

  test("scale: a corner pulled to twice its distance doubles the text size", () => {
    const r = rig();
    r.b.select("T");
    const h = r.b.handles()!, c = h.centre, k = h.corners[2];
    dragPx(r, k, [c[0] + 2 * (k[0] - c[0]), c[1] + 2 * (k[1] - c[1])]);
    expect((get(r, "T") as { size: number }).size).toBe(10);
  });

  test("scale: the floor keeps text at 1.5 mm and image scale inside 0.05 to 1.6", () => {
    const r = rig();
    r.b.select("T");
    let h = r.b.handles()!;
    dragPx(r, h.corners[2], h.centre);
    expect((get(r, "T") as { size: number }).size).toBe(1.5);
    r.b.select("I");
    h = r.b.handles()!;
    const k = h.corners[2], c = h.centre;
    dragPx(r, k, [c[0] + 20 * (k[0] - c[0]), c[1] + 20 * (k[1] - c[1])]);
    expect((get(r, "I") as { scale: number }).scale).toBe(1.6);
  });

  test("arc text: a drag sets arcR and arcDeg; the dot shifts arcDeg", () => {
    const r = rig();
    r.b.select("A");
    const h = r.b.handles()!;
    const mid = [(h.corners[0][0] + h.corners[2][0]) / 2, (h.corners[0][1] + h.corners[2][1]) / 2];
    dragPx(r, mid, mm2px(r.b.view(), 0, 10));
    expect(get(r, "A")).toMatchObject({ arcR: 10, arcDeg: 90, dx: 0, dy: 0 });
    // past the art radius the radius clamps to rArt 18
    dragPx(r, r.b.handles()!.centre.map((v, i) => v + (i ? -10 * S : 0)), mm2px(r.b.view(), 30, 0));
    expect(get(r, "A")).toMatchObject({ arcR: 18, arcDeg: 0 });
  });

  test("ring: a drag moves the centre radius and keeps the width; a corner scales both radii", () => {
    const r = rig();
    r.b.select("R");
    dragPx(r, mm2px(r.b.view(), 5, 0), mm2px(r.b.view(), 10, 0));
    expect(get(r, "R")).toMatchObject({ r0: 9, r1: 11 });
    const h = r.b.handles()!, k = h.corners[2];
    dragPx(r, k, [200 + (k[0] - 200) / 2, 200 + (k[1] - 200) / 2]);
    expect(get(r, "R")).toMatchObject({ r0: 4.5, r1: 5.5 });
  });

  test("right or middle drag pans and commits nothing", () => {
    const r = rig();
    dragPx(r, [100, 100], [130, 80], { button: 2 });
    expect(r.b.view()).toMatchObject({ panX: 30, panY: -20 });
    dragPx(r, [100, 100], [90, 100], { button: 1 });
    expect(r.b.view()).toMatchObject({ panX: 20, panY: -20 });
    expect(r.log).toEqual([]);
  });

  test("a press with no change commits nothing; every move touches", () => {
    const r = rig();
    r.b.select("T");
    const c = r.b.handles()!.centre;
    r.b.pointerDown(P(c[0], c[1] - 5));
    r.b.pointerUp();
    expect(r.log).toEqual([]);
  });
});

describe("wheel zoom", () => {
  test("one notch in is x1.1 about the cursor; the range is 0.5 to 8", () => {
    const r = rig();
    const before = px2mm(r.b.view(), 300, 100);
    r.b.wheel({ x: 300, y: 100, deltaY: -100 });
    expect(r.b.view().zoom).toBeCloseTo(1.1, 12);
    const after = px2mm(r.b.view(), 300, 100);
    expect(after[0]).toBeCloseTo(before[0], 9);
    expect(after[1]).toBeCloseTo(before[1], 9);
    r.b.wheel({ x: 300, y: 100, deltaY: 100 });
    expect(r.b.view().zoom).toBeCloseTo(0.99, 12);
    for (let i = 0; i < 40; i++) r.b.wheel({ x: 300, y: 100, deltaY: -100 });
    expect(r.b.view().zoom).toBe(8);
    for (let i = 0; i < 60; i++) r.b.wheel({ x: 300, y: 100, deltaY: 100 });
    expect(r.b.view().zoom).toBe(0.5);
  });

  test("double click resets the view, or focuses a selected text layer", () => {
    const r = rig();
    r.b.wheel({ x: 300, y: 100, deltaY: -100 });
    r.b.dblclick();
    expect(r.b.view()).toMatchObject({ zoom: 1, panX: 0, panY: 0 });
    r.b.select("T");
    r.b.dblclick();
    expect(r.log).toEqual([{ type: "focusText", v: "T" }]);
  });
});

describe("keys", () => {
  test("arrows nudge 0.25 mm, shift 5 mm, each a commit", () => {
    const r = rig();
    r.b.select("T");
    expect(r.b.key(K("ArrowRight"))).toBe(true);
    expect((get(r, "T") as { dx: number }).dx).toBe(0.25);
    r.b.key(K("ArrowRight", { shiftKey: true }));
    expect((get(r, "T") as { dx: number }).dx).toBe(5.25);
    r.b.key(K("ArrowDown"));
    r.b.key(K("ArrowLeft"));
    expect(get(r, "T")).toMatchObject({ dx: 5, dy: 5.75 });
    expect(r.log.filter((e) => e.type === "commit").map((e) => (e.v as { reason: string }).reason)).toEqual(["nudge", "nudge", "nudge", "nudge"]);
  });

  test("arc text: up and down move the radius, left and right the angle", () => {
    const r = rig();
    r.b.select("A");
    r.b.key(K("ArrowUp"));
    r.b.key(K("ArrowRight", { shiftKey: true }));
    expect(get(r, "A")).toMatchObject({ arcR: 14.25, arcDeg: -85 });
  });

  test("Delete and Backspace remove the selection", () => {
    const r = rig();
    r.b.select("T");
    r.b.key(K("Delete"));
    r.b.select("I");
    r.b.key(K("Backspace"));
    expect(r.list.map((L) => L.id)).toEqual(["R", "A"]);
    expect(r.b.selected()).toBeNull();
  });

  test("ctrl or cmd D duplicates after the source, offset 2 mm right and down, and selects it", () => {
    const r = rig();
    r.b.select("T");
    r.b.key(K("d", { ctrlKey: true }));
    expect(r.list.map((L) => L.id)).toEqual(["R", "I", "T", "L5", "A"]);
    expect(get(r, "L5")).toMatchObject({ kind: "text", dx: 2, dy: 4, text: "HACK" });
    expect(r.b.selected()?.id).toBe("L5");
    r.b.key(K("D", { metaKey: true }));
    expect(r.list).toHaveLength(6);
  });

  test("brackets reorder; ends stay put", () => {
    const r = rig();
    r.b.select("T");
    r.b.key(K("]"));
    expect(r.list.map((L) => L.id)).toEqual(["R", "I", "A", "T"]);
    r.b.key(K("]"));
    expect(r.list.map((L) => L.id)).toEqual(["R", "I", "A", "T"]);
    r.b.key(K("["));
    r.b.key(K("["));
    expect(r.list.map((L) => L.id)).toEqual(["R", "T", "I", "A"]);
  });

  test("keys need a selection, and ctrl with an arrow is the host's", () => {
    const r = rig();
    expect(r.b.key(K("ArrowRight"))).toBe(false);
    r.b.select("T");
    expect(r.b.key(K("ArrowRight", { ctrlKey: true }))).toBe(false);
    expect(keyAction(K("z", { ctrlKey: true }))).toBeNull();
    expect(keyAction(K("x"))).toBeNull();
  });
});

describe("drop, raster and the bounds cache", () => {
  test("a drop lands at the cursor in mm and selects the new image", () => {
    const r = rig();
    r.b.drop(250, 150, IMG);
    const L = r.list.at(-1) as { id: string; dx: number; dy: number };
    expect(L.dx).toBeCloseTo(50 / S, 12);
    expect(L.dy).toBeCloseTo(50 / S, 12);
    expect(r.b.selected()?.id).toBe(L.id);
    expect(r.log.map((e) => e.type)).toEqual(["select", "commit"]);
  });

  test("the exact raster shows when set, the 4 per mm preview while dragging, and a change drops the exact one", () => {
    const r = rig();
    const exact = { art: { w: 400, h: 400, res: 10, labels: new Uint8Array(160000) }, holes: null };
    r.b.setExact(exact);
    expect(r.b.raster().mode).toBe("exact");
    r.b.select("T");
    const c = r.b.handles()!.centre;
    r.b.pointerDown(P(c[0], c[1] - 5));
    r.b.pointerMove(P(c[0] + 20, c[1] - 5));
    const p = r.b.raster();
    expect(p.mode).toBe("preview");
    expect([p.face.art.w, p.face.art.h, p.face.art.res]).toEqual([160, 160, 4]);
    r.b.pointerUp();
    expect(r.b.raster().mode).toBe("preview");
    r.b.setExact(exact);
    expect(r.b.state().raster).toEqual({ mode: "exact", res: 10 });
  });

  test("bounds are cached by the layer minus its placement", () => {
    const r = rig();
    r.b.bbox(get(r, "T"));
    const paints = (): number => r.surfaces.reduce((s, x) => s + x.paints, 0);
    const n = paints();
    const L = get(r, "T"), T = L as { dx: number; dy: number; rot: number; size: number };
    T.dx = 7; T.dy = -3; T.rot = 45;
    r.b.bbox(L);
    expect(paints()).toBe(n);
    T.size = 6;
    r.b.bbox(L);
    expect(paints()).toBe(n + 1);
  });

  test("the cache holds at most 200 entries and drops the oldest", () => {
    const c = new BBoxCache();
    let renders = 0;
    const bb = { x0: 0, y0: 0, x1: 1, y1: 1 };
    for (let i = 0; i < 250; i++) c.get({ i }, () => (renders++, bb));
    expect(c.size).toBe(200);
    c.get({ i: 249 }, () => (renders++, bb));
    expect(renders).toBe(250);
    c.get({ i: 0 }, () => (renders++, bb));
    expect(renders).toBe(251);
  });

  test("state() is plain JSON with the image as its identity", () => {
    const r = rig();
    const s = r.b.state();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(s.layers[1]!["img"]).toMatch(/^image#\d+$/);
  });
});
