// Split two composed faces into one art body per slot (M03-T06). Ported from
// COLLAR buildMesh and labelSlab (collar.html:1221 to 1258 and 1368 to 1517,
// lineage collar.bench/inlay-split): the front art fills the top band
// [thk - depth, thk], the mirrored back art the bottom band [0, depth], a
// cut removes art through the full thickness, and a cell of the host slot
// stays host. Every slot comes from one label volume through the raster
// route, so neighbouring slots share their boundary exactly; the host body
// is carved by the stage 5 partition (art before body, D-047), never here.
// Per-slot volume is cells x cell area x band height (estimateVolume,
// collar.html:1508 to 1517), reported as metrics (D-049).

import {
  commandError, qualify, sha256Hex,
  type BodyDraft, type MachineView, type Metric, type Mm, type ShapeDecl,
} from "@hackbuild/spec";
import type { RasterMask } from "@hackbuild/mesh";
import type { ComposedFace } from "./face.js";
import { mirrorFace } from "./mirror.js";

/** The part the art is inlaid into. */
export interface SplitHost {
  /** Body id stem; art bodies read "<id>.slot<n>". */
  readonly id: string;
  /** Part thickness, mm. */
  readonly thk: Mm;
  /** The host body's slot; art cells of this slot stay host. */
  readonly slot: number;
  /** The active preset (KernelCtx.machineView); depth must be a whole number of its layers. */
  readonly machine: Pick<MachineView, "id" | "layerHeight">;
  /** Profile material id per slot, index slot - 1 (chase.materials order). */
  readonly materials: readonly string[];
}

export type RasterShape = Extract<ShapeDecl, { readonly route: "raster" }>;

export interface SplitBodies {
  /** One body per art slot, ascending, role art, all on `shape`. */
  readonly bodies: readonly BodyDraft[];
  /** The shared label volume: bottom band, the air between, top band. */
  readonly shape: RasterShape;
  /** Every mask uri `shape` names, for StageInput.mask. */
  readonly masks: ReadonlyMap<string, RasterMask>;
  /** Through-cut cells in model orientation (front holes and mirrored back holes), for the host; null when none. */
  readonly holes: Uint8Array | null;
  /** inlay.<slot>.volume per art slot, mm3. */
  readonly metrics: readonly Metric[];
}

/** Content-addressed uri of a label grid (D-050): sha256 over width, height (u32 little endian) and the labels. */
export function maskUri(m: RasterMask): string {
  const bytes = new Uint8Array(8 + m.labels.length);
  const dv = new DataView(bytes.buffer);
  dv.setUint32(0, m.width, true);
  dv.setUint32(4, m.height, true);
  bytes.set(m.labels, 8);
  return `hbf://mask/${sha256Hex(bytes)}`;
}

/** Layers in the depth, or E_SCHEMA naming the layer height. */
function layersIn(depth: Mm, host: SplitHost): number {
  const lh = host.machine.layerHeight;
  const n = depth / lh;
  const k = Math.round(n);
  if (!(depth > 0) || k < 1 || Math.abs(n - k) > 1e-6) {
    const lo = Math.max(1, Math.floor(n + 1e-6));
    const near = [lo, lo + 1].map((x) => +(x * lh).toFixed(6));
    throw commandError({
      code: "E_SCHEMA", path: "/depth", got: depth,
      expected: `a whole number of ${lh} mm layers (preset ${host.machine.id})`,
      hint: `inlay depth ${depth} mm is not a whole number of ${lh} mm layers on preset ${host.machine.id}; set ${near[0]} or ${near[1]} mm (computed)`,
    });
  }
  return k;
}

function art(face: ComposedFace, holes: Uint8Array | null, hostSlot: number): Uint8Array {
  const src = face.art.labels;
  const out = new Uint8Array(src.length);
  for (let p = 0; p < src.length; p++) {
    const s = src[p]!;
    if (s === 0 || s === hostSlot || (holes !== null && holes[p])) continue;
    out[p] = s;
  }
  return out;
}

/**
 * One art body per slot from the front face and the back face as read in
 * hand. The back face is mirrored here, at extrude, and nowhere else; the
 * inputs are left as given.
 */
export function splitBodies(front: ComposedFace, back: ComposedFace, depth: Mm, host: SplitHost): SplitBodies {
  const { w, h, res } = front.art;
  if (back.art.w !== w || back.art.h !== h || back.art.res !== res) {
    throw commandError({ code: "E_SCHEMA", path: "/back/art", got: [back.art.w, back.art.h, back.art.res], expected: `${w} x ${h} cells at ${res} cells per mm, as the front`, hint: "compose both faces on one grid" });
  }
  layersIn(depth, host);
  if (!(2 * depth <= host.thk + 1e-9)) {
    throw commandError({ code: "E_SCHEMA", path: "/depth", got: depth, expected: `at most half the thickness, ${host.thk / 2} mm`, hint: `front and back bands overlap; set the depth to ${host.thk / 2} mm or less, or thicken the part` });
  }
  const bed = mirrorFace(back);
  const n = w * h;
  let holes: Uint8Array | null = null;
  if (front.holes !== null || bed.holes !== null) {
    holes = new Uint8Array(n);
    for (let p = 0; p < n; p++) if ((front.holes?.[p] ?? 0) || (bed.holes?.[p] ?? 0)) holes[p] = 1;
  }
  const top = art(front, holes, host.slot);
  const bottom = art(bed, holes, host.slot);

  const px = 1 / res;
  const origin = [-w / (2 * res), -h / (2 * res)] as const;
  const masks = new Map<string, RasterMask>();
  const put = (labels: Uint8Array): string => {
    const m: RasterMask = { width: w, height: h, labels, origin };
    const uri = maskUri(m);
    masks.set(uri, m);
    return uri;
  };
  const layers: { mask: string; z: readonly [Mm, Mm] }[] = [{ mask: put(bottom), z: [0, depth] }];
  if (host.thk - 2 * depth > 1e-9) layers.push({ mask: put(new Uint8Array(n)), z: [depth, host.thk - depth] });
  layers.push({ mask: put(top), z: [host.thk - depth, host.thk] });
  const shape: RasterShape = { route: "raster", layers, res: px };

  const cells = new Map<number, { front: number; back: number }>();
  const count = (labels: Uint8Array, side: "front" | "back"): void => {
    for (const s of labels) {
      if (s === 0) continue;
      const c = cells.get(s) ?? { front: 0, back: 0 };
      c[side]++;
      cells.set(s, c);
    }
  };
  count(top, "front");
  count(bottom, "back");
  const slots = [...cells.keys()].sort((a, b) => a - b);
  const area = px * px;
  const bodies: BodyDraft[] = [];
  const metrics: Metric[] = [];
  for (const s of slots) {
    const material = host.materials[s - 1];
    if (material === undefined) {
      throw commandError({ code: "E_SCHEMA", path: `/materials/${s - 1}`, got: null, expected: `a profile material for slot ${s}`, hint: `art paints slot ${s}; add a material for it or repaint the art` });
    }
    bodies.push({ id: `${host.id}.slot${s}`, role: "art", slot: s, material, base: shape });
    const c = cells.get(s)!;
    metrics.push({
      id: `inlay.${s}.volume`, value: (c.front + c.back) * area * depth, unit: "mm3",
      note: `slot ${s}: ${c.front} front and ${c.back} back cells x ${area} mm2 x ${depth} mm (computed)`,
      drivenBy: ["/depth"], gate: "informational", group: "inlay", ...qualify([]),
    });
  }
  return { bodies, shape, masks, holes, metrics };
}
