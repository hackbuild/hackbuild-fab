// The art doc (spec/art.ts) lowered to the layers the inlay kind
// composes. A face's layers become painter layers in the same order: BAIL's
// own mapping of a layer to what it paints (bail.html partsOf and slotFor,
// 1282 to 1296, and paintLayer, 1408 to 1496), kept in one place so a design
// reads the art doc and not the painters. Lineage bail.bench/inlay-art-doc.
//
// What lowers: text, shape, logo, scope, circuit and path. A muted layer lowers
// with off set and stays in the list, so the content address of the lowered
// art still names every layer. cut "through" lowers to a cut layer, which
// the inlay kind refuses today (kind.ts artFaces). cut "pocket" and the
// image and relief kinds have no inlay route yet and are refused with a fix.

import {
  artDocumentIssues, commandError,
  type ArtDocument, type ArtFace, type ArtFont, type ArtLayer,
} from "@hackbuild/spec";
import type { PaintLayer } from "./face.js";
import type { TextLayer } from "./layers/text.js";

/** The CSS family and weight a BAIL font key sets (bail.html FONTS and FONTW, 1068 and 1069). BAIL sets plexb at weight 600; the node face table holds 400 and 700, so plexb lowers to 700. */
export const ART_FONT_FACES: Readonly<Record<ArtFont, { readonly family: string; readonly bold: boolean }>> = {
  marker: { family: "Permanent Marker", bold: false },
  plexb: { family: "IBM Plex Mono", bold: true },
  plex: { family: "IBM Plex Mono", bold: false },
  elite: { family: "Special Elite", bold: false },
  vt: { family: "VT323", bold: false },
};

function refuse(path: string, got: unknown, expected: string, hint: string): never {
  throw commandError({ code: "E_KERNEL", path, got, expected, record: "kernels/art-inlay", hint });
}

/** One layer to its painter layer. `path` is the layer's place in the art doc, for the error. */
export function lowerArtLayer(L: ArtLayer, path = ""): PaintLayer {
  if (L.cut === "pocket") {
    refuse(`${path}/cut`, "pocket", "none or through", `layer ${L.id}: the inlay kind carves no pocket yet; set cut to none, or through if the layer should cut the part`);
  }
  const flags = { ...(L.cut === "through" ? { cut: true } : {}), ...(L.mute ? { off: true } : {}) };
  const place = { dx: L.dx, dy: L.dy, rot: L.rot };
  switch (L.kind) {
    case "text": {
      const font = ART_FONT_FACES[L.font];
      const arc = L.arc !== 0;
      const t: TextLayer = {
        kind: "text", text: L.text, slot: L.slot,
        // An arc sets one colour, as BAIL does: the pipe splits runs only on a straight line (bail.html:1429 to 1434).
        ...(!arc && L.text.includes("|") ? { accent: L.slot2 } : {}),
        font: font.family, ...(font.bold ? { bold: true } : {}), size: L.size, runGap: arc ? 0 : L.splitGap,
        mode: arc ? "arc" : "straight", ...(arc ? { arcR: Math.abs(L.arc), arcDeg: L.arc > 0 ? 90 : -90, flip: L.arc < 0, anchored: true } : {}),
        ...place, baseline: "middle", ls: L.ls, ...flags,
      };
      return t;
    }
    case "shape":
      return { kind: "shape", shape: L.shape, w: L.w, h: L.h, t: L.t, n: L.n, ...place, slot: L.slot, ...flags };
    case "logo":
      return { kind: "logo", brand: L.brand, w: L.w, ...place, slot: L.slot, slot2: L.slot2, ...flags };
    case "scope":
      return { kind: "scope", a: L.a, b: L.b, phase: L.phase, w: L.w, h: L.h, t: L.t, ...place, slot: L.slot, ...flags };
    case "circuit":
      return {
        kind: "circuit", seed: L.seed, w: L.w, h: L.h, pitch: L.pitch, tw: L.tw, pad: L.pad, drill: L.drill, density: L.density, clip: L.clip,
        ...place, slot: L.slot, slot2: L.slot2, ...flags,
      };
    case "path": {
      // Units to mm about the centre of the bounds, y flipped (the file is y down), then turned and placed.
      const k = L.w / L.bw, cx = L.bx + L.bw / 2, cy = L.by + L.bh / 2;
      const r = L.rot * Math.PI / 180, s = k * Math.sin(r), c = k * Math.cos(r);
      const a = c, b = s, cc = s, d = -c;
      return { kind: "path", d: L.d, transform: [a, b, cc, d, L.dx - (a * cx + cc * cy), L.dy - (b * cx + d * cy)], slot: L.slot, ...flags };
    }
    case "image":
    case "relief":
      return refuse(`${path}/kind`, L.kind, "text, shape, logo, scope or circuit", `layer ${L.id}: ${L.kind} layers have no inlay painter yet; remove the layer or mute it`);
  }
}

/** One face's layers in paint order. Muted image and relief layers are skipped; every other muted layer lowers with off set. */
export function lowerArtFace(doc: ArtDocument, face: ArtFace): PaintLayer[] {
  const out: PaintLayer[] = [];
  doc.faces[face].forEach((L, i) => {
    if (L.mute && (L.kind === "image" || L.kind === "relief")) return;
    out.push(lowerArtLayer(L, `/faces/${face}/${i}`));
  });
  return out;
}

/** Both faces, front and back, after the art doc is checked: a bad one throws E_SCHEMA naming the first problems. */
export function lowerArtDocument(doc: ArtDocument): { readonly front: PaintLayer[]; readonly back: PaintLayer[] } {
  const issues = artDocumentIssues(doc);
  if (issues.length > 0) {
    throw commandError({
      code: "E_SCHEMA", path: "/art", got: `${issues.length} problem${issues.length === 1 ? "" : "s"}`, expected: "an art doc of spec/art.ts",
      record: "kernels/art-inlay", hint: issues.slice(0, 3).map((i) => `${(i.path ?? []).map(String).join("/")}: ${i.message}`).join("; "),
    });
  }
  return { front: lowerArtFace(doc, "front"), back: lowerArtFace(doc, "back") };
}
