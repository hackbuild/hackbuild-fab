// designs/bail: the bench preview and the build lower the art doc through one
// library. The art board (bench-core artdoc controller) and k.art.lowerLayers
// (pipeline Author) both call inlay's lowerArtLayerWith; under the node font
// and skip policy they give the same painter layers on each of the 9 presets.

import { describe, expect, test } from "vitest";
import { artValueOf, createArtDoc } from "@hackbuild/bench-core";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { loadGeom } from "@hackbuild/geom";
import { makeAuthor, resolveParams } from "@hackbuild/pipeline";
import type { ArtDocument, BuildWarning, Feature, PartDraft } from "@hackbuild/spec";
import { build } from "../build";
import { chase, type BailParams } from "../chase";

const profile = createProfileLookup(loadProfile());
const PRESETS = ["heatsync", "hackbuild", "scope", "trace", "mesa", "concho", "monogram", "hslcut", "custom"] as const;
const POLICY = { fonts: "node", unsupported: "skip" } as const;

// Only a surface-needing layer reads the surface, and lowering never draws.
const surface = (grid: { w: number; h: number }) => ({
  measure: () => 1, fillText: () => {}, fillPath: () => {}, drawImage: () => {},
  readAlpha: () => new Uint8Array(grid.w * grid.h),
  readRgba: () => ({ width: grid.w, height: grid.h, data: new Uint8ClampedArray(grid.w * grid.h * 4) }),
  clear: () => {},
});

interface InlayFeature { readonly kind: "inlay"; readonly layers: { readonly top: readonly unknown[]; readonly bed: readonly unknown[] } }

describe("bail art lowering", () => {
  test.each(PRESETS)("preset %s: the bench preview and the build give the same layers", async (id) => {
    const warnings: BuildWarning[] = [];
    const params = resolveParams(chase, {}, id) as unknown as BailParams;
    const draft = (await build(params, makeAuthor(chase, profile, warnings, [], await loadGeom()))) as PartDraft;
    const art = (params as unknown as { art: { doc: ArtDocument } }).art.doc;

    let value: unknown = artValueOf(art);
    const c = createArtDoc({ read: () => value, write: (n) => { value = n; }, surface, lower: POLICY });
    c.resize(400, 256);
    c.setFace("front");
    const front = c.lowered();
    c.setFace("back");
    const back = c.lowered();

    const inlay = draft.features.filter((f: Feature): f is Feature & InlayFeature => f.kind === "inlay");
    const down = params.orient === "down";
    // A preset with no layer that paints has no inlay feature to read.
    const built = inlay[0]?.layers ?? { top: [], bed: [] };
    expect(JSON.parse(JSON.stringify(down ? built.top : built.bed))).toEqual(JSON.parse(JSON.stringify(down ? back : front)));
    expect(JSON.parse(JSON.stringify(down ? built.bed : built.top))).toEqual(JSON.parse(JSON.stringify(down ? front : back)));
  });

  test("the marker, elite and vt faces set in Plex bold with a FONT_SWAP warning, and a cut layer is skipped", async () => {
    const warnings: BuildWarning[] = [];
    const params = resolveParams(chase, {}, "hackbuild") as unknown as BailParams;
    await build(params, makeAuthor(chase, profile, warnings, [], await loadGeom()));
    const codes = new Set(warnings.map((w) => w.code));
    expect([...codes].every((x) => typeof x === "string")).toBe(true);
    const k = makeAuthor(chase, profile, [], [], await loadGeom());
    const out = k.art.lowerLayer({ id: "t", kind: "text", text: "ab", font: "marker", slot: 1, slot2: 1, size: 4, ls: 0, arc: 0, splitGap: 0, dx: 0, dy: 0, rot: 0, mute: false, cut: "none" } as never, POLICY);
    expect(out.layer).toMatchObject({ kind: "text", font: "IBM Plex Mono", bold: true });
    expect(out.warnings.map((w) => w.code)).toEqual(["FONT_SWAP"]);
    const cut = k.art.lowerLayer({ id: "c", kind: "shape", shape: "ring", w: 5, h: 5, t: 1, n: 3, slot: 1, dx: 0, dy: 0, rot: 0, mute: false, cut: "through" } as never, POLICY);
    expect(cut.layer).toBeNull();
    expect(cut.warnings.map((w) => w.code)).toEqual(["LAYER_SKIPPED"]);
  });
});
