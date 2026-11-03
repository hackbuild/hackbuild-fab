// The art doc (spec/art.ts) lowered to the layers the inlay kind
// composes. A face's layers become painter layers in the same order: BAIL's
// own mapping of a layer to what it paints (bail.html partsOf and slotFor,
// 1282 to 1296, and paintLayer, 1408 to 1496), kept in one place so a design
// reads the art doc and not the painters. Lineage bail.bench/inlay-art-doc.
//
// What lowers: text, shape, logo, scope, circuit, path, and an image, which
// decodes its PNG data uri, quantizes it by colour mode and traces each slot's
// pixels into a path layer (imageToPaths), so node and a page paint it alike.
// A palette image needs the slot colours in the policy and lowers to one path
// layer per slot it hits; every other layer lowers to one painter layer. A
// muted layer lowers with off set and stays in the list, so the content
// address of the lowered art still names every layer. cut "through" lowers to
// a cut layer, which the inlay kind refuses today (kind.ts artFaces). cut
// "pocket" and the relief kind have no inlay route yet and are refused with a
// fix.

import {
  artDocumentIssues, commandError,
  type ArtDocument, type ArtFace, type ArtFont, type ArtImageLayer, type ArtLayer,
} from "@hackbuild/spec";
import { TRACE_TOLERANCE_PX, simplifyLoop, trace } from "@hackbuild/geom";
import type { PaintLayer } from "./face.js";
import type { Affine } from "./surface.js";
import { dataUriBytes, decodePng } from "./png.js";
import { quantize } from "./quantize.js";
import type { TextLayer } from "./layers/text.js";

/** The CSS family and weight a BAIL font key sets (bail.html FONTS and FONTW, 1068 and 1069). BAIL sets plexb at weight 600; the node face table holds 400 and 700, so plexb lowers to 700. */
export const ART_FONT_FACES: Readonly<Record<ArtFont, { readonly family: string; readonly bold: boolean }>> = {
  marker: { family: "Permanent Marker", bold: false },
  plexb: { family: "IBM Plex Mono", bold: true },
  plex: { family: "IBM Plex Mono", bold: false },
  elite: { family: "Special Elite", bold: false },
  vt: { family: "VT323", bold: false },
};

/** How a lowering treats what the node route cannot paint. */
export interface LowerPolicy {
  /** "face" (default) names each font as the art doc asks. "node" sets a face the node text route lacks (packages/geom/src/text/outline.ts TEXT_FACES) in IBM Plex Mono bold and returns a FONT_SWAP warning. */
  readonly fonts?: "face" | "node";
  /** "refuse" (default) throws E_KERNEL for a cut pocket, a palette image without a palette, or a relief layer. "skip" drops a cut layer, such an image or a relief layer and returns a LAYER_SKIPPED warning. */
  readonly unsupported?: "refuse" | "skip";
  /** Slot colours as #rgb or #rrggbb, slot 1 first. A palette image sends each pixel to the nearest of them (bail.html:1480 to 1486). */
  readonly palette?: readonly string[];
}

export interface LowerWarning {
  readonly code: "FONT_SWAP" | "LAYER_SKIPPED";
  readonly text: string;
}

/** One layer lowered under a policy: its painter layers in paint order (none when skipped, one per slot hit for a palette image, one otherwise) and the warnings it raised. */
export interface LoweredLayer {
  readonly layers: readonly PaintLayer[];
  readonly warnings: readonly LowerWarning[];
}

/**
 * Font keys whose face the node text route carries. A key outside it falls to Plex bold under the "node" font policy.
 * A list, so the art lowering a page bundles never pulls geom's glyph tables; test/art-lower.test.ts holds it equal to
 * geom TEXT_FACES.
 */
export const NODE_ART_FONTS: ReadonlySet<ArtFont> = new Set<ArtFont>(["plex", "plexb", "marker", "elite", "vt"]);

function refuse(path: string, got: unknown, expected: string, hint: string): never {
  throw commandError({ code: "E_KERNEL", path, got, expected, record: "kernels/art-inlay", hint });
}

/** One layer to its one painter layer. `path` is the layer's place in the art doc, for the error. The default policy refuses what has no painter; see LowerPolicy. A palette image that hits more than one slot is refused here; lowerArtLayerWith returns all of its layers. */
export function lowerArtLayer(L: ArtLayer, path = "", policy: LowerPolicy = {}): PaintLayer {
  const out = lowerArtLayerWith(L, path, policy).layers;
  if (out.length === 0) refuse(`${path}/kind`, L.kind, "a layer the policy lowers", `layer ${L.id}: skipped`);
  if (out.length > 1) refuse(`${path}/mode`, `${out.length} painter layers`, "one painter layer", `layer ${L.id}: a palette image lowers to one layer per slot; call lowerArtLayerWith or lowerArtLayersWith`);
  return out[0]!;
}

/** One layer under a policy, with the warnings the policy raised. */
export function lowerArtLayerWith(L: ArtLayer, path = "", policy: LowerPolicy = {}): LoweredLayer {
  const skip = policy.unsupported === "skip";
  const warnings: LowerWarning[] = [];
  const done = (...layers: PaintLayer[]): LoweredLayer => ({ layers, warnings });
  const noPalette = L.kind === "image" && L.mode === "palette" && (policy.palette ?? []).length === 0;
  if (skip && L.cut !== "none") {
    warnings.push({ code: "LAYER_SKIPPED", text: `layer ${L.id} cuts the slide (${L.cut}); the inlay kind carves no cut yet, so it is skipped` });
    return done();
  }
  if (skip && (L.kind === "relief" || noPalette)) {
    warnings.push({ code: "LAYER_SKIPPED", text: L.kind === "relief" ? `layer ${L.id} is a relief layer; the relief painter is not built, so it is skipped` : `layer ${L.id} is a palette image and the lowering was given no slot colours, so it is skipped` });
    return done();
  }
  if (L.cut === "pocket") {
    refuse(`${path}/cut`, "pocket", "none or through", `layer ${L.id}: the inlay kind carves no pocket yet; set cut to none, or through if the layer should cut the part`);
  }
  const flags = { ...(L.cut === "through" ? { cut: true } : {}), ...(L.mute ? { off: true } : {}) };
  const place = { dx: L.dx, dy: L.dy, rot: L.rot };
  switch (L.kind) {
    case "text": {
      const swap = policy.fonts === "node" && !NODE_ART_FONTS.has(L.font);
      const font = swap ? ART_FONT_FACES.plexb : ART_FONT_FACES[L.font];
      if (swap) warnings.push({ code: "FONT_SWAP", text: `layer ${L.id} asks for ${ART_FONT_FACES[L.font].family}; the node text route lacks that face, so it is set in Plex bold` });
      const arc = L.arc !== 0;
      const t: TextLayer = {
        kind: "text", text: L.text, slot: L.slot,
        // An arc sets one colour, as BAIL does: the pipe splits runs only on a straight line (bail.html:1429 to 1434).
        ...(!arc && L.text.includes("|") ? { accent: L.slot2 } : {}),
        font: font.family, ...(font.bold ? { bold: true } : {}), size: L.size, runGap: arc ? 0 : L.splitGap,
        mode: arc ? "arc" : "straight", ...(arc ? { arcR: Math.abs(L.arc), arcDeg: L.arc > 0 ? 90 : -90, flip: L.arc < 0, anchored: true } : {}),
        ...place, baseline: "middle", ls: L.ls, ...flags,
      };
      return done(t);
    }
    case "shape":
      return done({ kind: "shape", shape: L.shape, w: L.w, h: L.h, t: L.t, n: L.n, ...place, slot: L.slot, ...flags });
    case "logo":
      return done({ kind: "logo", brand: L.brand, w: L.w, ...place, slot: L.slot, slot2: L.slot2, ...flags });
    case "scope":
      return done({ kind: "scope", a: L.a, b: L.b, phase: L.phase, w: L.w, h: L.h, t: L.t, ...place, slot: L.slot, ...flags });
    case "circuit":
      return done({
        kind: "circuit", seed: L.seed, w: L.w, h: L.h, pitch: L.pitch, tw: L.tw, pad: L.pad, drill: L.drill, density: L.density, clip: L.clip,
        ...place, slot: L.slot, slot2: L.slot2, ...flags,
      });
    case "path": {
      // Units to mm about the centre of the bounds, y flipped (the file is y down), then turned and placed.
      const k = L.w / L.bw, cx = L.bx + L.bw / 2, cy = L.by + L.bh / 2;
      const r = L.rot * Math.PI / 180, s = k * Math.sin(r), c = k * Math.cos(r);
      const a = c, b = s, cc = s, d = -c;
      return done({ kind: "path", d: L.d, transform: [a, b, cc, d, L.dx - (a * cx + cc * cy), L.dy - (b * cx + d * cy)], slot: L.slot, ...flags });
    }
    case "image": {
      if (noPalette) return refuse(`${path}/mode`, "palette", "mono or silhouette, or slot colours in the policy", `layer ${L.id}: a palette image sends each pixel to its nearest slot colour; pass the slot colours as palette in the lowering policy, or set mode to mono or silhouette`);
      const t = imageToPaths(L, policy.palette);
      const k = L.w / t.width, cx = t.width / 2, cy = t.height / 2;
      const r = L.rot * Math.PI / 180, s = k * Math.sin(r), c = k * Math.cos(r);
      const a = c, b = s, cc = s, d = -c;
      const transform: Affine = [a, b, cc, d, L.dx - (a * cx + cc * cy), L.dy - (b * cx + d * cy)];
      return done(...t.paths.map((q): PaintLayer => ({ kind: "path", d: q.d, transform, slot: q.slot, ...flags })));
    }
    case "relief":
      return refuse(`${path}/kind`, L.kind, "text, shape, logo, scope, circuit, path or image", `layer ${L.id}: relief layers have no inlay painter yet; remove the layer or mute it`);
  }
}

/** An image layer traced to SVG path data per slot, pixel units, y down. */
export interface ImagePaths {
  /** One entry per slot the image hits, slot ascending; mono and silhouette always give one entry, d empty when nothing hits. */
  readonly paths: readonly { readonly slot: number; readonly d: string }[];
  readonly width: number;
  readonly height: number;
}

/**
 * An image layer's PNG traced per slot. The PNG quantizes as the inlay image
 * painter does (quantize.ts, COLLAR's colour modes; pixels under alpha 120
 * stay empty): mono hits luminance at or under thr (at or over with invert)
 * in the layer's slot, silhouette takes alpha alone in that slot, and palette
 * sends each pixel to the nearest of `slots` (slot 1 first), the body colour
 * included, as BAIL paints a palette image (bail.html:1480 to 1486). Each
 * slot's pixels trace along pixel edges and simplify at geom's trace
 * tolerance; each path fills even-odd, so holes need no winding.
 */
export function imageToPaths(L: ArtImageLayer, slots: readonly string[] = []): ImagePaths {
  const img = decodePng(dataUriBytes(L.src));
  const { width: w, height: h } = img;
  const labels = L.mode === "palette"
    // body 0 matches no slot, so a pixel nearest the body colour keeps its slot and paints over the art under it
    ? quantize(img, "palette", { res: 1, slots, body: 0 }).labels
    : L.mode === "mono"
      ? quantize(img, "mono", { res: 1, slot: L.slot, thr: L.thr * 255, invert: L.invert }).labels
      : quantize(img, "alpha", { res: 1, slot: L.slot }).labels;
  const hit = L.mode === "palette" ? [...new Set(labels)].filter((v) => v !== 0).sort((a, b) => a - b) : [L.slot];
  const paths = hit.map((slot) => {
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i += 1) mask[i] = labels[i] === slot ? 1 : 0;
    const parts: string[] = [];
    for (const loop of trace({ w, h, d: mask })) {
      const s = simplifyLoop(loop, TRACE_TOLERANCE_PX);
      if (s === null) continue;
      parts.push(`M${s.map((p) => `${p[0]} ${p[1]}`).join(" L")} Z`);
    }
    return { slot, d: parts.join(" ") };
  });
  return { paths, width: w, height: h };
}

/** One face's layers in paint order. Muted image and relief layers are skipped; every other muted layer lowers with off set. */
export function lowerArtFace(doc: ArtDocument, face: ArtFace, policy: LowerPolicy = {}): PaintLayer[] {
  return lowerArtFaceWith(doc, face, policy).layers;
}

/** A list of layers under a policy: painter layers in paint order and the warnings in layer order. A skip policy drops muted image and relief layers with their warning too. `base` is the list's path in the art doc, for errors. */
export function lowerArtLayersWith(layers: readonly ArtLayer[], base = "", policy: LowerPolicy = {}): { readonly layers: PaintLayer[]; readonly warnings: LowerWarning[] } {
  const out: PaintLayer[] = [];
  const warnings: LowerWarning[] = [];
  layers.forEach((L, i) => {
    if (policy.unsupported !== "skip" && L.mute && (L.kind === "image" || L.kind === "relief")) return;
    const r = lowerArtLayerWith(L, `${base}/${i}`, policy);
    warnings.push(...r.warnings);
    out.push(...r.layers);
  });
  return { layers: out, warnings };
}

/** One face under a policy; see lowerArtLayersWith. */
export function lowerArtFaceWith(doc: ArtDocument, face: ArtFace, policy: LowerPolicy = {}): { readonly layers: PaintLayer[]; readonly warnings: LowerWarning[] } {
  return lowerArtLayersWith(doc.faces[face], `/faces/${face}`, policy);
}

/** Both faces, front and back, after the art doc is checked: a bad one throws E_SCHEMA naming the first problems. */
export function lowerArtDocument(doc: ArtDocument, policy: LowerPolicy = {}): { readonly front: PaintLayer[]; readonly back: PaintLayer[] } {
  const issues = artDocumentIssues(doc);
  if (issues.length > 0) {
    throw commandError({
      code: "E_SCHEMA", path: "/art", got: `${issues.length} problem${issues.length === 1 ? "" : "s"}`, expected: "an art doc of spec/art.ts",
      record: "kernels/art-inlay", hint: issues.slice(0, 3).map((i) => `${(i.path ?? []).map(String).join("/")}: ${i.message}`).join("; "),
    });
  }
  return { front: lowerArtFace(doc, "front", policy), back: lowerArtFace(doc, "back", policy) };
}
