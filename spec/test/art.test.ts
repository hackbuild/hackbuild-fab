// spec/test/art.test.ts
// spec/art.ts: the art document of the art param. Layer fields and defaults
// against BAIL's lay() factories (bail.html:1128 to 1140), the content
// address against canonicalize and sha256Hex, and the validator's paths.

import { describe, expect, test } from "vitest";
import {
  ART_BRANDS, ART_CUTS, ART_FACES, ART_FONTS, ART_KIND_DEFAULTS, ART_LAYER_BASE_DEFAULTS, ART_LAYER_KINDS, ART_SHAPES,
  artDocumentIssues, artDocumentSchema, artDocumentUri, artDocumentValue, artLayer, emptyArtDocument,
  type ArtDocument,
} from "../art";
import { canonicalize, sha256Hex } from "../jcs";

const doc = (): ArtDocument => ({
  schema: "hbf.art",
  version: 1,
  faces: {
    front: [
      artLayer("logo", "L10", { brand: "hb", w: 26, dy: 4, slot: 1, slot2: 2 }),
      artLayer("text", "L11", { text: "hack|.build", font: "marker", size: 4.8, dy: -12.4, splitGap: 0.4 }),
    ],
    back: [artLayer("text", "L12", { text: "MAKE THINGS", font: "vt", size: 5.5, arc: 15.6, ls: 0.6, slot: 2 })],
  },
});

describe("the layer set", () => {
  test("BAIL's seven kinds and the path kind of a dropped svg, two faces, three cuts, five fonts, 13 shapes and 2 marks", () => {
    expect([...ART_LAYER_KINDS]).toEqual(["text", "shape", "logo", "scope", "circuit", "path", "image", "relief"]);
    expect([...ART_FACES]).toEqual(["front", "back"]);
    expect([...ART_CUTS]).toEqual(["none", "through", "pocket"]);
    expect([...ART_FONTS]).toEqual(["marker", "plexb", "plex", "elite", "vt"]);
    expect(ART_SHAPES).toHaveLength(13);
    expect([...ART_BRANDS]).toEqual(["hb", "hsl"]);
  });

  test("every layer carries id, kind, dx, dy, rot, slot, slot2, cut, depth and mute, then its own fields", () => {
    for (const kind of ART_LAYER_KINDS) {
      const L = artLayer(kind, "x") as unknown as Record<string, unknown>;
      for (const k of ["id", "kind", "dx", "dy", "rot", "slot", "slot2", "cut", "depth", "mute"]) expect(L, `${kind} ${k}`).toHaveProperty(k);
      for (const k of Object.keys(ART_KIND_DEFAULTS[kind])) expect(L, `${kind} ${k}`).toHaveProperty(k);
    }
  });

  test("defaults are BAIL's: lay() base and each factory", () => {
    expect(ART_LAYER_BASE_DEFAULTS).toEqual({ dx: 0, dy: 0, rot: 0, slot: 1, slot2: 2, cut: "none", depth: 1.2, mute: false });
    expect(ART_KIND_DEFAULTS.text).toMatchObject({ font: "plexb", size: 4, ls: 0, arc: 0, splitGap: 0.6 });
    expect(ART_KIND_DEFAULTS.shape).toMatchObject({ w: 20, h: 20, t: 1.2, n: 6 });
    expect(ART_KIND_DEFAULTS.logo).toMatchObject({ w: 30 });
    expect(ART_KIND_DEFAULTS.scope).toEqual({ a: 3, b: 2, phase: 90, w: 30, h: 22, t: 0.9 });
    expect(ART_KIND_DEFAULTS.circuit).toEqual({ seed: 7, w: 34, h: 40, pitch: 2.4, tw: 0.8, pad: 2.2, drill: 0.7, density: 1, clip: "ellipse" });
  });

  test("artLayer takes the id from the caller and lets the kind and id win over an override", () => {
    const L = artLayer("shape", "S1", { shape: "sun", w: 30 });
    expect(L).toMatchObject({ id: "S1", kind: "shape", shape: "sun", w: 30, h: 20 });
  });

  test("every default layer validates", () => {
    for (const kind of ART_LAYER_KINDS) {
      const d: ArtDocument = { ...emptyArtDocument(), faces: { front: [artLayer(kind, "a")], back: [] } };
      expect(artDocumentIssues(d), kind).toEqual([]);
    }
  });
});

describe("content address", () => {
  test("hbf://art/<sha256 of the canonical JSON>, the address kind.ts gives art", () => {
    const d = doc();
    expect(artDocumentUri(d)).toBe(`hbf://art/${sha256Hex(canonicalize(d))}`);
    expect(artDocumentUri(d)).toMatch(/^hbf:\/\/art\/[0-9a-f]{64}$/);
  });

  test("key order does not move the address; one field does", () => {
    const d = doc();
    const shuffled = JSON.parse(JSON.stringify(d), (_k, v: unknown) => (v !== null && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v)) as ArtDocument;
    expect(artDocumentUri(shuffled)).toBe(artDocumentUri(d));
    const moved: ArtDocument = { ...d, faces: { ...d.faces, front: [{ ...d.faces.front[0]!, dx: 0.25 }, d.faces.front[1]!] } };
    expect(artDocumentUri(moved)).not.toBe(artDocumentUri(d));
  });

  test("the param value holds the uri and the kind layers", () => {
    const d = doc();
    expect(artDocumentValue(d)).toEqual({ uri: artDocumentUri(d), kind: "layers" });
  });
});

describe("validation", () => {
  test("a good document passes and survives a JSON round trip with its address", () => {
    const d = doc();
    expect(artDocumentIssues(d)).toEqual([]);
    const back = JSON.parse(JSON.stringify(d)) as ArtDocument;
    expect(artDocumentIssues(back)).toEqual([]);
    expect(artDocumentUri(back)).toBe(artDocumentUri(d));
    expect(artDocumentSchema["~standard"].validate(d)).toEqual({ value: d });
  });

  test("an issue names the layer field by path", () => {
    const d = doc();
    const bad = JSON.parse(JSON.stringify(d)) as { faces: { front: Record<string, unknown>[] } };
    bad.faces.front[0]!["slot"] = 0;
    bad.faces.front[1]!["font"] = "comic";
    bad.faces.front[1]!["size"] = Number.NaN;
    const issues = artDocumentIssues(bad);
    expect(issues.map((i) => (i.path ?? []).join("/")).sort()).toEqual(["faces/front/0/slot", "faces/front/1/font", "faces/front/1/size"]);
    expect(issues.find((i) => i.path?.[3] === "slot")!.message).toBe("slot is 0, expected a whole number from 1");
  });

  test("an unknown kind, a repeated id and a missing field are refused", () => {
    const base = doc();
    expect(artDocumentIssues({ ...base, faces: { front: [{ kind: "sticker" }], back: [] } })[0]!.message).toMatch(/^kind sticker, expected one of text, shape/);
    const twice = { ...base, faces: { front: [artLayer("scope", "dup")], back: [artLayer("scope", "dup")] } };
    expect(artDocumentIssues(twice).map((i) => i.message)).toEqual(["id dup appears twice; ids are unique across both faces"]);
    const { w: _w, ...noW } = artLayer("logo", "n") as unknown as Record<string, unknown>;
    expect(artDocumentIssues({ ...base, faces: { front: [noW], back: [] } }).map((i) => i.message)).toEqual(["w is missing, expected a number above 0"]);
  });

  test("the format name and version are checked first", () => {
    expect(artDocumentIssues({ schema: "x", version: 2, faces: { front: [], back: [] } }).map((i) => i.path?.[0])).toEqual(["schema", "version"]);
    expect(artDocumentIssues(null)).toHaveLength(1);
    expect(artDocumentIssues({ schema: "hbf.art", version: 1 })[0]!.path).toEqual(["faces"]);
  });
});
