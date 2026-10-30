// The art document controller against a held value, no surface: shape, scope
// and circuit paint at cell centres, so bounds, hits and the preview need no
// canvas. Numbers are worked from the rules in hit.ts (centre snap 0.6 mm,
// 0.25 mm grid, rotate snaps) and the board fit, 0.84 of the canvas.

import { describe, expect, test } from "vitest";
import { artDocumentIssues, artDocumentUri, type ArtValue } from "@hackbuild/spec";
import { createArtDoc, IMAGE_DROP_LINE, layerFields, readSvgPaths, type ArtDocController } from "../../src/index.js";

function held(): { c: ArtDocController; writes: ArtValue[]; value: () => unknown } {
  let v: unknown = null;
  const writes: ArtValue[] = [];
  const c = createArtDoc({ read: () => v, write: (n) => { v = n; writes.push(n); } });
  c.resize(400, 256);
  return { c, writes, value: () => v };
}

describe("art document controller", () => {
  test("add, select, remove and reorder write a value whose uri is the hash of its document", () => {
    const { c, writes } = held();
    const a = c.add("shape", { shape: "ring", dx: -10 });
    const b = c.add("scope");
    expect(c.selected()?.id).toBe(b);
    expect(c.layers().map((L) => L.id)).toEqual([a, b]);
    const last = writes.at(-1)!;
    expect(last.kind).toBe("layers");
    expect(last.uri).toBe(artDocumentUri(last.doc!));
    expect(artDocumentIssues(last.doc)).toEqual([]);
    expect(c.reorder(a, 1)).toBe(true);
    expect(c.layers().map((L) => L.id)).toEqual([b, a]);
    expect(c.remove(b)).toBe(true);
    expect(c.selected()).toBeNull();
    expect(c.layers().map((L) => L.id)).toEqual([a]);
  });

  test("the same edits give the same uri, and a different edit gives another", () => {
    const one = held(), two = held();
    for (const h of [one, two]) { const id = h.c.add("shape", { dx: 4 }); h.c.rotateTo(id, 30, { altKey: true }); }
    expect(one.c.uri()).toBe(two.c.uri());
    const id = one.c.layers()[0]!.id;
    one.c.rotateTo(id, 31, { altKey: true });
    expect(one.c.uri()).not.toBe(two.c.uri());
  });

  test("faces hold their own layers and ids stay unique across both", () => {
    const { c } = held();
    const a = c.add("shape");
    c.setFace("back");
    const b = c.add("shape");
    expect(b).not.toBe(a);
    expect(c.layers().map((L) => L.id)).toEqual([b]);
    expect(c.state().counts).toEqual({ front: 1, back: 1 });
    expect(c.copyToOtherFace(b)).not.toBeNull();
    expect(c.state().counts).toEqual({ front: 2, back: 1 });
  });

  test("move snaps to the centre line within 0.6 mm and to the 0.25 mm grid; alt turns the snap off", () => {
    const { c } = held();
    const id = c.add("shape", { dx: 5, dy: 3 });
    c.moveBy(id, -4.7, 0.13);
    expect(c.selected()).toMatchObject({ dx: 0, dy: 3.25 });
    c.moveBy(id, -0.2, 0);
    expect(c.selected()?.dx).toBe(0);
    c.moveBy(id, 0.3, 0, { altKey: true });
    expect(c.selected()?.dx).toBe(0.25);
  });

  test("rotate snaps within 4 degrees, shift to 15, alt to none", () => {
    const { c } = held();
    const id = c.add("shape");
    c.rotateTo(id, 87);
    expect(c.selected()?.rot).toBe(90);
    c.rotateTo(id, 37, { shiftKey: true });
    expect(c.selected()?.rot).toBe(30);
    c.rotateTo(id, 87, { altKey: true });
    expect(c.selected()?.rot).toBe(87);
  });

  test("scale takes w and h, and t unless shift; a text scale takes size above its floor", () => {
    const { c } = held();
    const id = c.add("shape", { w: 20, h: 10, t: 2 });
    c.scaleBy(id, 1.5);
    expect(c.selected()).toMatchObject({ w: 30, h: 15, t: 3 });
    c.scaleBy(id, 2, true);
    expect(c.selected()).toMatchObject({ w: 60, h: 30, t: 3 });
    const t = c.add("text", { size: 4 });
    c.scaleBy(t, 0.1);
    expect((c.selected() as { size: number }).size).toBe(1.5);
  });

  test("a refused field names the field and the legal form and leaves the document alone", () => {
    const { c } = held();
    const id = c.add("shape");
    const before = c.uri();
    expect(c.set(id, "slot", 0)).toMatch(/^slot is 0, expected a whole number from 1/);
    expect(c.set(id, "nope", 1)).toBe(`layer ${id} has no field nope`);
    expect(c.uri()).toBe(before);
    expect(c.set(id, "w", 12)).toBeNull();
    expect(c.uri()).not.toBe(before);
  });

  test("a drag writes once, on pointer up, and the shown document follows the pointer meanwhile", () => {
    const { c, writes } = held();
    const id = c.add("shape", { shape: "rect", w: 20, h: 20, dx: 0, dy: 0 });
    const n = writes.length;
    const v = c.view();
    const at = (x: number, y: number) => ({ x: v.ox + x * v.scale, y: v.oy - y * v.scale, button: 0, shiftKey: false, altKey: true });
    c.pointerDown(at(0, 0));
    expect(c.drag()?.mode).toBe("move");
    c.pointerMove(at(10, 5));
    expect(c.layers()[0]).toMatchObject({ id, dx: 10, dy: 5 });
    expect(writes.length).toBe(n);
    c.pointerUp();
    expect(writes.length).toBe(n + 1);
    expect(writes.at(-1)!.doc!.faces.front[0]).toMatchObject({ dx: 10, dy: 5 });
  });

  test("the rotate dot turns the layer about its centre", () => {
    const { c } = held();
    c.add("shape", { shape: "rect", w: 20, h: 20 });
    const v = c.view();
    const dot = c.handles()!.dot;
    c.pointerDown({ x: dot[0], y: dot[1], button: 0, shiftKey: false, altKey: true });
    expect(c.drag()?.mode).toBe("rotate");
    // the dot sits above the centre; moving it to the right of the centre turns the layer a quarter turn clockwise
    c.pointerMove({ x: v.ox + 100, y: v.oy, button: 0, shiftKey: false, altKey: true });
    c.pointerUp();
    expect(c.selected()?.rot).toBe(-90);
  });

  test("bounds follow the painted cells: a layer moved to dx 12 draws round 12 mm", () => {
    const { c } = held();
    const id = c.add("shape", { shape: "rect", w: 10, h: 6, dx: 12, dy: -4 });
    const bb = c.bbox(c.selected()!)!;
    expect((bb.x0 + bb.x1) / 2).toBeCloseTo(0, 1);
    expect(bb.x1 - bb.x0).toBeCloseTo(11, 0);
    // the preview paints the cell at (12, -4): grid centre is at (w/2, h/2) cells, 4 cells per mm
    const { face } = c.raster();
    const { w, h, labels } = face.art;
    const cell = (x: number, y: number): number => labels[Math.floor(h / 2 + y * 4) * w + Math.floor(w / 2 + x * 4)]!;
    expect(cell(12, -4)).toBe(1);
    expect(cell(0, 0)).toBe(0);
    expect(id).toBeTruthy();
  });

  test("an asymmetric shape paints where its bounds say, so rows read the right way up", () => {
    const { c } = held();
    c.add("shape", { shape: "steps", w: 20, h: 20, n: 4, dy: 8 });
    const bb = c.bbox(c.selected()!)!;
    const { face } = c.raster();
    const { w, h, labels } = face.art;
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (labels[j * w + i]) { const y = (j + 0.5 - h / 2) / 4; lo = Math.min(lo, y); hi = Math.max(hi, y); }
    expect(lo).toBeGreaterThan(8 + bb.y0 - 0.8);
    expect(hi).toBeLessThan(8 + bb.y1 + 0.8);
    expect((lo + hi) / 2).toBeCloseTo(8 + (bb.y0 + bb.y1) / 2, 0);
  });

  test("keys: arrows nudge 0.25 mm and 5 mm with shift, delete removes, ] raises", () => {
    const { c } = held();
    const a = c.add("shape", { dx: 3, dy: 3 });
    c.add("scope");
    c.select(a);
    const k = (key: string, shiftKey = false) => ({ key, shiftKey, ctrlKey: false, metaKey: false, altKey: false });
    expect(c.key(k("ArrowRight"))).toBe(true);
    expect(c.selected()?.dx).toBe(3.25);
    c.key(k("ArrowUp", true));
    expect(c.selected()?.dy).toBe(8);
    c.key(k("]"));
    expect(c.layers()[1]?.id).toBe(a);
    c.key(k("Delete"));
    expect(c.layers().length).toBe(1);
  });

  test("a raster drop is refused with a line and adds no layer; a bad svg says why", () => {
    const { c, writes } = held();
    expect(c.dropRaster("a.png")).toBeNull();
    expect(c.notes()[0]).toBe(`a.png: ${IMAGE_DROP_LINE}`);
    expect(c.dropSvg("<svg></svg>")).toBeNull();
    expect(c.notes()[0]).toMatch(/no path elements/);
    expect(writes.length).toBe(0);
  });

  test("an svg drop becomes one path layer with bounds, a width of 24 mm on the long side, and the doc stays valid", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><path d="M0 0 L100 0 L100 50 L0 50 Z"/><path d="M10 10 L20 10 L20 20 Z" transform="rotate(5)"/><circle r="3"/></svg>`;
    const got = readSvgPaths(svg);
    expect(got.ok && got.paths).toMatchObject({ bx: 0, by: 0, bw: 100, bh: 50, skipped: 2 });
    const { c, writes } = held();
    const id = c.dropSvg(svg)!;
    expect(c.selected()).toMatchObject({ id, kind: "path", w: 24 });
    expect(artDocumentIssues(writes.at(-1)!.doc)).toEqual([]);
    expect(c.notes()[0]).toMatch(/2 svg elements skipped/);
    expect(readSvgPaths(`<svg><path d="M0 0 A5 5 0 0 1 10 0"/></svg>`)).toMatchObject({ ok: false });
  });

  test("a value written by another hand (undo) is what the controller shows after refresh", () => {
    let v: unknown = null;
    const c = createArtDoc({ read: () => v, write: (n) => { v = n; } });
    const id = c.add("shape");
    const first = v;
    c.set(id, "w", 40);
    expect((c.selected() as { w: number }).w).toBe(40);
    v = first;
    c.refresh();
    expect((c.layers()[0] as { w: number }).w).toBe(20);
  });
});

describe("layer fields", () => {
  test("each kind lists place, its own fields, slots and cut; depth only for a pocket", () => {
    const keys = (k: Parameters<typeof layerFields>[0], cut?: string) => layerFields(k, cut).map((f) => f.key);
    expect(keys("shape")).toEqual(["dx", "dy", "rot", "shape", "w", "h", "t", "n", "slot", "cut"]);
    expect(keys("text", "pocket")).toContain("depth");
    expect(keys("text")).toContain("slot2");
    expect(keys("path")).toEqual(["dx", "dy", "rot", "w", "slot", "cut"]);
    expect(layerFields("shape").find((f) => f.key === "shape")?.options).toContain("saguaro");
  });
});
