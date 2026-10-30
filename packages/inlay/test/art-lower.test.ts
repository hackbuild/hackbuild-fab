// The art document lowered to painter layers (src/art-lower.ts): each
// BAIL layer to the layer the inlay kind composes, in paint order, with mute
// and cut mapped and the kinds with no inlay route refused with a fix.

import { artLayer, emptyArtDocument, type ArtDocument } from "@hackbuild/spec";
import { describe, expect, test } from "vitest";
import { lowerArtDocument, lowerArtFace, lowerArtLayer } from "../src/art-lower.js";
import { artFaces, artUri, type InlayArt } from "../src/kind.js";

const doc = (front: ArtDocument["faces"]["front"], back: ArtDocument["faces"]["back"] = []): ArtDocument => ({ ...emptyArtDocument(), faces: { front, back } });

describe("lowerArtLayer", () => {
  test("shape, scope, logo and circuit keep their fields and gain nothing", () => {
    expect(lowerArtLayer(artLayer("shape", "s", { shape: "mesa", w: 46, h: 13, dy: -13.5, slot: 2 }))).toEqual({
      kind: "shape", shape: "mesa", w: 46, h: 13, t: 1.2, n: 6, dx: 0, dy: -13.5, rot: 0, slot: 2,
    });
    expect(lowerArtLayer(artLayer("scope", "c", { slot: 4 }))).toEqual({ kind: "scope", a: 3, b: 2, phase: 90, w: 30, h: 22, t: 0.9, dx: 0, dy: 0, rot: 0, slot: 4 });
    expect(lowerArtLayer(artLayer("logo", "l", { brand: "hsl", w: 36, slot: 1, slot2: 2 }))).toEqual({ kind: "logo", brand: "hsl", w: 36, dx: 0, dy: 0, rot: 0, slot: 1, slot2: 2 });
    expect(lowerArtLayer(artLayer("circuit", "k", { seed: 11, slot: 2, slot2: 2 }))).toMatchObject({ kind: "circuit", seed: 11, slot: 2, slot2: 2, clip: "ellipse" });
  });

  test("a path layer maps its bounds centre to (dx, dy), scales to w mm, flips y and turns counter-clockwise", () => {
    const map = (L: ReturnType<typeof lowerArtLayer>, x: number, y: number): [number, number] => {
      const t = (L as { transform: readonly number[] }).transform as [number, number, number, number, number, number];
      return [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]];
    };
    const base = { d: "M0 0 L40 0 L40 30 Z", bx: 0, by: 0, bw: 40, bh: 30, w: 20, dx: 5, dy: -3, slot: 2 };
    const flat = lowerArtLayer(artLayer("path", "p", base));
    expect(flat).toMatchObject({ kind: "path", d: base.d, slot: 2 });
    expect(map(flat, 20, 15).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([5, -3]);
    // a point 10 units right of the centre is 5 mm right at rot 0, 5 mm up at rot 90, and a point 10 units below it is 5 mm below
    expect(map(flat, 30, 15).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([10, -3]);
    expect(map(flat, 20, 25).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([5, -8]);
    const turned = lowerArtLayer(artLayer("path", "p", { ...base, rot: 90 }));
    expect(map(turned, 30, 15).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([5, 2]);
  });

  test("mute lowers to off and stays in the list; through lowers to cut", () => {
    expect(lowerArtLayer(artLayer("shape", "s", { mute: true }))).toMatchObject({ off: true });
    expect(lowerArtLayer(artLayer("shape", "s", { cut: "through" }))).toMatchObject({ cut: true });
    const plain = lowerArtLayer(artLayer("shape", "s")) as unknown as Record<string, unknown>;
    expect("off" in plain).toBe(false);
    expect("cut" in plain).toBe(false);
  });

  test("a pocket, an image and a relief are refused with E_KERNEL and a fix", () => {
    const pocket = () => lowerArtLayer(artLayer("shape", "p", { cut: "pocket", depth: 2.4 }), "/faces/front/0");
    expect(pocket).toThrow(/E_KERNEL \/faces\/front\/0\/cut/);
    expect(() => lowerArtLayer(artLayer("image", "i"))).toThrow(/image layers have no inlay painter yet/);
    expect(() => lowerArtLayer(artLayer("relief", "r"))).toThrow(/relief layers have no inlay painter yet/);
  });
});

describe("lowerArtDocument", () => {
  const d = doc(
    [artLayer("logo", "a", { brand: "hb", w: 26 }), artLayer("text", "b", { text: "hack|.build", font: "marker" }), artLayer("shape", "c", { mute: true })],
    [artLayer("scope", "d")],
  );

  test("both faces in paint order", () => {
    const { front, back } = lowerArtDocument(d);
    expect(front.map((L) => L.kind)).toEqual(["logo", "text", "shape"]);
    expect(back.map((L) => L.kind)).toEqual(["scope"]);
    expect(front[2]).toMatchObject({ off: true });
  });

  test("a muted image or relief is skipped, a live one refused", () => {
    expect(lowerArtFace(doc([artLayer("image", "i", { mute: true }), artLayer("shape", "s")]), "front").map((L) => L.kind)).toEqual(["shape"]);
    expect(() => lowerArtFace(doc([artLayer("image", "i")]), "front")).toThrow(/E_KERNEL/);
  });

  test("a document that fails validation throws E_SCHEMA naming the problems", () => {
    const bad = doc([artLayer("shape", "s", { slot: 0 })]);
    expect(() => lowerArtDocument(bad)).toThrow(/E_SCHEMA \/art .*faces\/front\/0\/slot: slot is 0/);
  });

  test("the lowered layers compose through the inlay kind's artFaces and hash into a stable art uri", () => {
    const { front, back } = lowerArtDocument(doc(
      [artLayer("shape", "s", { shape: "diamond", w: 20, h: 20, slot: 2 }), artLayer("circuit", "c", { seed: 5, w: 20, h: 20, slot: 3, slot2: 3 })],
      [artLayer("scope", "o", { slot: 2 })],
    ));
    const art: InlayArt = {
      grid: { w: 320, h: 320, res: 8 }, layers: { top: front, bed: back }, recipe: "print-forge", boost: 0.15, gap: 0,
      palette: ["#1A1A1A", "#FE0386", "#F5F0E6"], minFeature: 0.6, despeckle: 0.35,
    };
    const faces = artFaces(art);
    expect(new Set(faces.top.art.labels)).toEqual(new Set([0, 2, 3]));
    expect(new Set(faces.bed.art.labels)).toEqual(new Set([0, 2]));
    expect(artUri(art)).toBe(artUri(JSON.parse(JSON.stringify(art)) as InlayArt));
  });
});
