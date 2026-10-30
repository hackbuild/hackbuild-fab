// spec/art.ts
/**
 * Status: draft until the art board lands (plan v11 section 4.3 step b).
 * Source: the owner's BAIL bench, layers as bail.html lay() makes them
 * (line 1128 and the factories to 1140), lineage bail.bench/spec-art.
 */
// The art document: what an `art` chase param points at when it holds a
// layer stack. Two faces, front and back, each a list of layers in paint
// order, later over earlier. Every layer carries id, kind, dx, dy, rot,
// slot, slot2, cut, depth and mute, then the fields of its kind. The document
// is plain JSON, content addressed the way packages/inlay/src/kind.ts
// addresses art, hbf://art/<sha256 of canonical JSON>, and the param value
// holds that uri with kind "layers". A design reads layers from the document
// the host resolves; the chase never holds an expression (D-178).
//
// Face, slot and unit meaning follow BAIL. front is the face people see and
// back the other, each laid out as read from its own side. slot and slot2 are
// 1-based filament slots; what each kind paints into them is in the kind's
// own comment. dx and dy are mm, rot is degrees counter-clockwise, depth is
// the pocket depth in mm and matters only when cut is "pocket".
// Version 1, 2026-10-30.

import { canonicalize, sha256Hex } from "./jcs.js";
import type { SchemaIssue, SchemaLike, SchemaResult } from "./schema.js";
import type { Deg, Mm } from "./ids.js";

/** The document format name and version a reader checks first. */
export const ART_DOCUMENT_SCHEMA = "hbf.art" as const;
export const ART_DOCUMENT_VERSION = 1 as const;

export const ART_FACES = ["front", "back"] as const;
export type ArtFace = (typeof ART_FACES)[number];

/** How a layer acts: inlay paints its slot, through removes material everywhere, pocket removes it to `depth` (bail.html:1128). */
export const ART_CUTS = ["none", "through", "pocket"] as const;
export type ArtCut = (typeof ART_CUTS)[number];

/** Layer kinds. path holds the paths of a dropped SVG. image and relief are typed here for BAIL documents and have no painter yet. */
export const ART_LAYER_KINDS = ["text", "shape", "logo", "scope", "circuit", "path", "image", "relief"] as const;
export type ArtLayerKind = (typeof ART_LAYER_KINDS)[number];

/** Font keys of bail.html FONTS (line 1068): marker Permanent Marker, plexb IBM Plex Mono bold, plex IBM Plex Mono, elite Special Elite, vt VT323. */
export const ART_FONTS = ["marker", "plexb", "plex", "elite", "vt"] as const;
export type ArtFont = (typeof ART_FONTS)[number];

/** The 13 shape kinds of bail.html SHAPE_KINDS (line 1072). */
export const ART_SHAPES = ["ring", "rect", "ellipse", "frame", "diamond", "chevrons", "grid", "sun", "saguaro", "mesa", "zigzag", "steps", "arrow"] as const;
export type ArtShape = (typeof ART_SHAPES)[number];

/** Mark ids of the logo registry in packages/inlay (hack.build, HeatSync Labs). */
export const ART_BRANDS = ["hb", "hsl"] as const;
export type ArtBrand = (typeof ART_BRANDS)[number];

/** Image colour modes of bail.html (line 2836): mono threshold, silhouette, palette. */
export const ART_IMAGE_MODES = ["mono", "silhouette", "palette"] as const;
export type ArtImageMode = (typeof ART_IMAGE_MODES)[number];

/** The fields every layer carries. */
export interface ArtLayerBase<K extends ArtLayerKind> {
  /** Unique within the document; the editor keeps it stable across edits. */
  readonly id: string;
  readonly kind: K;
  readonly dx: Mm;
  readonly dy: Mm;
  readonly rot: Deg;
  /** First filament slot, 1-based. */
  readonly slot: number;
  /** Second filament slot, 1-based; kinds with one paint ignore it. */
  readonly slot2: number;
  readonly cut: ArtCut;
  /** Pocket depth, mm; read when cut is "pocket". */
  readonly depth: Mm;
  /** Muted layers stay in the document and paint nothing. */
  readonly mute: boolean;
}

/**
 * Text. A pipe in `text` splits it: the run after the pipe takes slot2 and
 * splitGap mm of air goes in at the split. arc is a signed radius in mm: 0
 * sets the text straight, above 0 along the top of a circle, below 0 along
 * the bottom, centred on (dx, dy); an arc ignores the pipe and uses slot only.
 */
export interface ArtTextLayer extends ArtLayerBase<"text"> {
  readonly text: string;
  readonly font: ArtFont;
  /** em size, mm */
  readonly size: Mm;
  /** letter spacing, mm */
  readonly ls: Mm;
  /** signed arc radius, mm */
  readonly arc: Mm;
  /** air at each pipe split, mm */
  readonly splitGap: Mm;
}

/** A shape of the 13 in ART_SHAPES; w, h its extent, t stroke or gap, n a count. slot paints it. */
export interface ArtShapeLayer extends ArtLayerBase<"shape"> {
  readonly shape: ArtShape;
  readonly w: Mm;
  readonly h: Mm;
  readonly t: Mm;
  readonly n: number;
}

/** A registered mark, w mm across. hb: slot the arc, slot2 the wrench. hsl: slot the flames and arrow, slot2 the sun disc. */
export interface ArtLogoLayer extends ArtLayerBase<"logo"> {
  readonly brand: ArtBrand;
  readonly w: Mm;
}

/** A Lissajous trace x = w/2 sin(a u + phase), y = h/2 sin(b u), t mm wide, in slot. */
export interface ArtScopeLayer extends ArtLayerBase<"scope"> {
  readonly a: number;
  readonly b: number;
  readonly phase: Deg;
  readonly w: Mm;
  readonly h: Mm;
  readonly t: Mm;
}

/** Seeded traces: slot the traces, slot2 the pads, the body colour the drills. The seed fixes the board. */
export interface ArtCircuitLayer extends ArtLayerBase<"circuit"> {
  readonly seed: number;
  readonly w: Mm;
  readonly h: Mm;
  readonly pitch: Mm;
  /** trace width, mm */
  readonly tw: Mm;
  /** pad diameter, mm */
  readonly pad: Mm;
  /** drill diameter, mm */
  readonly drill: Mm;
  readonly density: number;
  readonly clip: "ellipse" | "rect";
}

/**
 * SVG path data from a dropped file, filled even-odd in slot. d is in the file's own units (y down); bx, by, bw and bh are its bounds in those
 * units, and w is the width the bounds take in mm, so the scale is w / bw. The layer turns about the centre of the bounds.
 */
export interface ArtPathLayer extends ArtLayerBase<"path"> {
  readonly d: string;
  readonly bx: number;
  readonly by: number;
  readonly bw: number;
  readonly bh: number;
  readonly w: Mm;
}

/** A raster or vector image, w mm across. src is a data uri or an hbf:// uri the host resolves. mono and silhouette paint slot; palette sends each pixel to the nearest filament slot. */
export interface ArtImageLayer extends ArtLayerBase<"image"> {
  readonly src: string;
  readonly mode: ArtImageMode;
  readonly w: Mm;
  /** luminance threshold, 0 to 1 */
  readonly thr: number;
  readonly invert: boolean;
}

/** Placeholder for BAIL's relief cameo (bail.html:1133). No painter reads it here; the fields are carried so a BAIL document round-trips. */
export interface ArtReliefLayer extends ArtLayerBase<"relief"> {
  readonly src: string;
  readonly depthSrc: string;
  readonly source: "depth" | "luma" | "inflate";
  readonly model: string;
  readonly device: "auto" | "webgpu" | "wasm";
  readonly w: Mm;
  readonly height: Mm;
  readonly base: Mm;
  readonly bgcut: number;
  readonly gamma: number;
  readonly smooth: Mm;
  readonly detail: number;
  readonly roll: Mm;
  readonly inset: Mm;
  readonly thr: number;
  readonly invert: boolean;
  readonly mode: "smooth" | "terrace";
  readonly split: number;
}

export type ArtLayer = ArtTextLayer | ArtShapeLayer | ArtLogoLayer | ArtScopeLayer | ArtCircuitLayer | ArtPathLayer | ArtImageLayer | ArtReliefLayer;
export type ArtLayerOf<K extends ArtLayerKind> = Extract<ArtLayer, { readonly kind: K }>;

/** The art document. */
export interface ArtDocument {
  readonly schema: typeof ART_DOCUMENT_SCHEMA;
  readonly version: typeof ART_DOCUMENT_VERSION;
  readonly faces: { readonly [F in ArtFace]: readonly ArtLayer[] };
}

/** The value of an `art` chase param (spec/chase.ts ParamFieldSpec "art"): the uri of what was dropped and what it is. */
export type ArtValue = {
  readonly uri: string;
  readonly kind: "svg" | "png" | "text" | "layers";
  /** The document a "layers" uri names, carried so a build and a saved design need no store; its hash is the uri. */
  readonly doc?: ArtDocument;
};

/** hbf://art/<sha256 of the canonical JSON of a document> (packages/inlay/src/kind.ts artUri). */
export type ArtUri = `hbf://art/${string}`;

/** The content address of a document: the same bytes give the same uri on every machine. */
export function artDocumentUri(doc: ArtDocument): ArtUri {
  return `hbf://art/${sha256Hex(canonicalize(doc))}`;
}

/** The param value that points at a document. */
export function artDocumentValue(doc: ArtDocument): ArtValue {
  return { uri: artDocumentUri(doc), kind: "layers" };
}

/** An empty document: both faces with no layers. */
export function emptyArtDocument(): ArtDocument {
  return { schema: ART_DOCUMENT_SCHEMA, version: ART_DOCUMENT_VERSION, faces: { front: [], back: [] } };
}

/** What lay() puts on every layer before its kind's fields (bail.html:1128). */
export const ART_LAYER_BASE_DEFAULTS = { dx: 0, dy: 0, rot: 0, slot: 1, slot2: 2, cut: "none", depth: 1.2, mute: false } as const;

/** The kind fields BAIL's factories T, SH, LOGO, SCOPE, CIRC and RELIEF start from (bail.html:1129 to 1140); image from add() (line 2778). */
export const ART_KIND_DEFAULTS = {
  text: { text: "", font: "plexb", size: 4, ls: 0, arc: 0, splitGap: 0.6 },
  shape: { shape: "ring", w: 20, h: 20, t: 1.2, n: 6 },
  logo: { brand: "hb", w: 30 },
  scope: { a: 3, b: 2, phase: 90, w: 30, h: 22, t: 0.9 },
  circuit: { seed: 7, w: 34, h: 40, pitch: 2.4, tw: 0.8, pad: 2.2, drill: 0.7, density: 1, clip: "ellipse" },
  path: { d: "", bx: 0, by: 0, bw: 10, bh: 10, w: 24 },
  image: { src: "", mode: "mono", w: 24, thr: 0.5, invert: false },
  relief: {
    src: "", depthSrc: "", source: "depth", model: "onnx-community/depth-anything-v2-small", device: "auto", w: 30, height: 2.4, base: 0.24,
    bgcut: 0.25, gamma: 1, smooth: 0.3, detail: 0.15, roll: 1.2, inset: 0.6, thr: 0.5, invert: false, mode: "smooth", split: 1,
  },
} as const;

/** A layer of `kind` with BAIL's defaults, then `over`. The id is the caller's: a content addressed document cannot take it from a counter. */
export function artLayer<K extends ArtLayerKind>(kind: K, id: string, over: Partial<Omit<ArtLayerOf<K>, "id" | "kind">> = {}): ArtLayerOf<K> {
  return { ...ART_LAYER_BASE_DEFAULTS, ...ART_KIND_DEFAULTS[kind], ...over, id, kind } as unknown as ArtLayerOf<K>;
}

// ---- validation ----

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const oneOf = (list: readonly string[], v: unknown): boolean => typeof v === "string" && list.includes(v);

type Rule = (v: unknown) => string | null;
const need = (ok: (v: unknown) => boolean, expected: string): Rule => (v) => (ok(v) ? null : expected);
const rNum = need(num, "a number");
const rPos = need((v) => num(v) && v > 0, "a number above 0");
const rNonNeg = need((v) => num(v) && v >= 0, "a number from 0");
const rInt1 = need((v) => num(v) && Number.isInteger(v) && v >= 1, "a whole number from 1");
const rInt = need((v) => num(v) && Number.isInteger(v), "a whole number");
const rStr = need((v) => typeof v === "string", "a string");
const rBool = need((v) => typeof v === "boolean", "true or false");
const rEnum = (list: readonly string[]): Rule => need((v) => oneOf(list, v), `one of ${list.join(", ")}`);
const rUnit = need((v) => num(v) && v >= 0 && v <= 1, "a number from 0 to 1");

const BASE_RULES: Readonly<Record<string, Rule>> = {
  id: need((v) => typeof v === "string" && v.length > 0, "a non-empty string"),
  dx: rNum, dy: rNum, rot: rNum, slot: rInt1, slot2: rInt1, cut: rEnum(ART_CUTS), depth: rNonNeg, mute: rBool,
};

const KIND_RULES: Readonly<Record<ArtLayerKind, Readonly<Record<string, Rule>>>> = {
  text: { text: rStr, font: rEnum(ART_FONTS), size: rPos, ls: rNum, arc: rNum, splitGap: rNonNeg },
  shape: { shape: rEnum(ART_SHAPES), w: rPos, h: rPos, t: rPos, n: rInt1 },
  logo: { brand: rEnum(ART_BRANDS), w: rPos },
  scope: { a: rInt1, b: rInt1, phase: rNum, w: rPos, h: rPos, t: rPos },
  circuit: { seed: rInt, w: rPos, h: rPos, pitch: rPos, tw: rPos, pad: rNonNeg, drill: rNonNeg, density: rNonNeg, clip: rEnum(["ellipse", "rect"]) },
  path: { d: rStr, bx: rNum, by: rNum, bw: rPos, bh: rPos, w: rPos },
  image: { src: rStr, mode: rEnum(ART_IMAGE_MODES), w: rPos, thr: rUnit, invert: rBool },
  relief: {
    src: rStr, depthSrc: rStr, source: rEnum(["depth", "luma", "inflate"]), model: rStr, device: rEnum(["auto", "webgpu", "wasm"]), w: rPos, height: rPos, base: rNonNeg,
    bgcut: rNum, gamma: rPos, smooth: rNonNeg, detail: rNum, roll: rNonNeg, inset: rNonNeg, thr: rUnit, invert: rBool, mode: rEnum(["smooth", "terrace"]), split: rUnit,
  },
};

/** Every problem of a candidate document: the format fields, then each layer's fields by path. */
export function artDocumentIssues(value: unknown): SchemaIssue[] {
  const out: SchemaIssue[] = [];
  if (!isRecord(value)) return [{ message: "an art document is an object" }];
  if (value["schema"] !== ART_DOCUMENT_SCHEMA) out.push({ message: `schema ${String(value["schema"])}, expected ${ART_DOCUMENT_SCHEMA}`, path: ["schema"] });
  if (value["version"] !== ART_DOCUMENT_VERSION) out.push({ message: `version ${String(value["version"])}, expected ${ART_DOCUMENT_VERSION}`, path: ["version"] });
  const faces = value["faces"];
  if (!isRecord(faces)) return [...out, { message: "faces holds front and back lists", path: ["faces"] }];
  const seen = new Set<string>();
  for (const face of ART_FACES) {
    const list = faces[face];
    if (!Array.isArray(list)) { out.push({ message: `${face} is a list of layers`, path: ["faces", face] }); continue; }
    list.forEach((L: unknown, i) => {
      const at = ["faces", face, i] as const;
      if (!isRecord(L)) { out.push({ message: "a layer is an object", path: at }); return; }
      const kind = L["kind"];
      if (!oneOf(ART_LAYER_KINDS, kind)) { out.push({ message: `kind ${String(kind)}, expected one of ${ART_LAYER_KINDS.join(", ")}`, path: [...at, "kind"] }); return; }
      for (const [k, rule] of [...Object.entries(BASE_RULES), ...Object.entries(KIND_RULES[kind as ArtLayerKind])]) {
        const bad = rule(L[k]);
        if (bad !== null) out.push({ message: `${k} is ${JSON.stringify(L[k]) ?? "missing"}, expected ${bad}`, path: [...at, k] });
      }
      const id = L["id"];
      if (typeof id === "string" && id.length > 0) {
        if (seen.has(id)) out.push({ message: `id ${id} appears twice; ids are unique across both faces`, path: [...at, "id"] });
        seen.add(id);
      }
    });
  }
  return out;
}

/** A Standard Schema v1 validator over the document. */
export const artDocumentSchema: SchemaLike<unknown, ArtDocument> = {
  "~standard": {
    version: 1,
    vendor: "hackbuild-spec",
    validate: (value: unknown): SchemaResult<ArtDocument> => {
      const issues = artDocumentIssues(value);
      return issues.length > 0 ? { issues } : { value: value as ArtDocument };
    },
  },
};
