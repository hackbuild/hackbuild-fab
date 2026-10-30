// The property rows of an art layer: which fields the panel offers per kind,
// with their kind of control, step and options. The fields themselves are
// the keys of spec ART_KIND_DEFAULTS; this table only says how each is
// edited, so a new key in the spec shows up as a row of its value's type.
// Enum options are the spec's own lists. Rows follow BAIL's property panel
// (bail.html:2786 to 2877, lineage bail.bench/ui-art-state).

import {
  ART_BRANDS, ART_CUTS, ART_FONTS, ART_IMAGE_MODES, ART_KIND_DEFAULTS, ART_LAYER_BASE_DEFAULTS, ART_SHAPES,
  type ArtLayerKind,
} from "@hackbuild/spec";

export type ArtFieldType = "number" | "int" | "text" | "bool" | "enum" | "slot";

export interface ArtFieldDef {
  readonly key: string;
  readonly label: string;
  readonly type: ArtFieldType;
  readonly step?: number;
  readonly min?: number;
  readonly options?: readonly string[];
}

const ENUMS: Readonly<Record<string, readonly string[]>> = {
  font: ART_FONTS, shape: ART_SHAPES, brand: ART_BRANDS, clip: ["ellipse", "rect"], mode: ART_IMAGE_MODES, cut: ART_CUTS,
};
const INTS: ReadonlySet<string> = new Set(["n", "a", "b", "seed"]);
const STEPS: Readonly<Record<string, number>> = { phase: 5, density: 0.1, thr: 0.05, arc: 1, rot: 1, dx: 0.25, dy: 0.25, ls: 0.1, size: 0.5 };
const LABELS: Readonly<Record<string, string>> = {
  dx: "x", dy: "y", rot: "turn", ls: "spacing", splitGap: "split gap", tw: "trace", thr: "threshold", slot2: "slot 2", t: "stroke",
};
/** Keys the panel leaves out: the document keeps them, a person edits them elsewhere. */
const HIDDEN: ReadonlySet<string> = new Set(["id", "kind", "d", "bx", "by", "bw", "bh", "src"]);
/** Kinds whose second slot paints something; the rest ignore slot2, so no row. */
const SLOT2: ReadonlySet<ArtLayerKind> = new Set(["text", "logo", "circuit"]);

function def(key: string, sample: unknown): ArtFieldDef {
  const label = LABELS[key] ?? key;
  if (key === "slot" || key === "slot2") return { key, label, type: "slot", min: 1 };
  const options = ENUMS[key];
  if (options !== undefined) return { key, label, type: "enum", options };
  if (typeof sample === "boolean") return { key, label, type: "bool" };
  if (typeof sample === "string") return { key, label, type: "text" };
  if (INTS.has(key)) return { key, label, type: "int", step: 1, min: 1 };
  return { key, label, type: "number", step: STEPS[key] ?? 0.5 };
}

/** The rows for a layer of `kind`, in panel order: place, kind fields, slots and cut. */
export function layerFields(kind: ArtLayerKind, cut = "none"): ArtFieldDef[] {
  const base = ART_LAYER_BASE_DEFAULTS as Readonly<Record<string, unknown>>;
  const own = ART_KIND_DEFAULTS[kind] as Readonly<Record<string, unknown>>;
  const rows = [
    ...["dx", "dy", "rot"].map((k) => def(k, base[k])),
    ...Object.keys(own).filter((k) => !HIDDEN.has(k)).map((k) => def(k, own[k])),
    def("slot", 1),
    ...(SLOT2.has(kind) ? [def("slot2", 1)] : []),
    def("cut", "none"),
    ...(cut === "pocket" ? [def("depth", 1.2)] : []),
  ];
  return rows;
}
