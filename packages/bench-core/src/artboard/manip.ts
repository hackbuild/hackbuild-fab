// What a drag, a nudge and a duplicate do to each layer kind: the art
// board's kind registry, one manipulator per inlay layer kind. Straight
// text, images and paths follow the KNUCKLE editor (part6.js:519 to 541,
// lineage inlay.face-editor/knuckle-part6). Arc text and rings have no x
// and y, so they follow COLLAR (collar.html:2659 to 2679, lineage
// collar.bench/ui-core-artboard): a drag sets arc text's radius and centre
// angle and a ring's centre radius, the dot shifts arc text's centre angle.
// The clamps below are the editors' own limits; whether the result prints
// is for the inlay checks (CHK-INL-01 to 04) to prove.

import { ART_RADIUS_FLOOR, type ImageLayer, type Layer, type PathLayer, type RingLayer, type TextLayer } from "@hackbuild/inlay";
import { imageKey, type Rows } from "./bbox-cache.js";
import { snapMove, snapRotation, type Mods, type MoveResult, type Placement } from "./hit.js";

/** A layer on the board: an inlay layer with an id the host owns. */
export type ArtLayer = Layer & { id: string };

/** The board in mm: the art area's width and height and the art radius arc text and rings live inside. */
export interface BoardFrame {
  readonly w: number;
  readonly h: number;
  /** art radius, mm (inlay artRadius) */
  readonly rArt: number;
  /** largest arc text radius, mm; COLLAR allows R_ART + keep (collar.html:2661). Default rArt. */
  readonly arcRMax?: number;
}

/** A drag in progress, as the manipulators see it. */
export interface MoveCtx {
  /** pointer travel since pointer down, mm */
  readonly ddx: number;
  readonly ddy: number;
  /** pointer now, board mm */
  readonly mx: number;
  readonly my: number;
  readonly mods: Mods;
  readonly frame: BoardFrame;
}

/** Text size floor, mm (part6.js:533). */
export const TEXT_SIZE_MIN = 1.5;
/** Image scale range, fraction of the art diameter (collar.html:2673). */
export const IMAGE_SCALE_RANGE = [0.05, 1.6] as const;
/** Ring outer radius floor and the least ring width, mm (collar.html:2675). */
export const RING_R1_MIN = 0.4;
export const RING_W_MIN = 0.2;
/** A duplicate lands this far right and down, mm (part6.js:386). */
export const DUP_OFFSET_MM = 2;
/** Arc text: degrees per arrow press, shift for the larger step (collar.html:3158). */
export const ARC_NUDGE_DEG = [1, 5] as const;

export interface Manipulator<L extends Layer> {
  /** Row order of the layer's render (ring rows run top down, inlay layers/ring.ts). */
  readonly rows: Rows;
  /** Where the handles sit; identity for a layer drawn in board coordinates. */
  placement(L: L): Placement;
  /** The layer with its placement removed: what the bbox renders and keys on. */
  unplaced(L: L): L;
  /** Apply a move; returns which axes snapped to the board centre. */
  move(L: L, start: L, m: MoveCtx): MoveResult["snapped"];
  /** Scale by the ratio k of pointer distance from the centre now and at pointer down. */
  scale(L: L, start: L, k: number, m: MoveCtx): void;
  /** Rotate by da degrees from where the drag started. */
  rotate(L: L, start: L, da: number, mods: Mods): void;
  /** Arrow keys: ax, ay in -1, 0, 1 with step mm. */
  nudge(L: L, ax: number, ay: number, step: number, shift: boolean, frame: BoardFrame): void;
  /** Shift a duplicate so it does not sit on its source. */
  offset(L: L): void;
}

const NO_SNAP = { x: false, y: false } as const;
const r1 = (v: number): number => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const arcMax = (f: BoardFrame): number => f.arcRMax ?? f.rArt;

/** dx, dy and rot in degrees: straight text and images (part6.js). */
function placed<L extends { dx: number; dy: number; rot?: number }>(scale: (L: L, s: L, k: number) => void): Omit<Manipulator<L & Layer>, "rows"> {
  return {
    placement: (L) => ({ dx: L.dx, dy: L.dy, rot: L.rot ?? 0 }),
    unplaced: (L) => ({ ...L, dx: 0, dy: 0, rot: 0 }),
    move(L, s, m) {
      const r = snapMove(s.dx, s.dy, m.ddx, m.ddy, m.mods);
      L.dx = r.x;
      L.dy = r.y;
      return r.snapped;
    },
    scale: (L, s, k) => scale(L, s, k),
    rotate(L, s, da, mods) {
      L.rot = snapRotation((s.rot ?? 0) + da, mods);
    },
    nudge(L, ax, ay, step) {
      L.dx += ax * step;
      L.dy += ay * step;
    },
    offset(L) {
      L.dx += DUP_OFFSET_MM;
      L.dy -= DUP_OFFSET_MM;
    },
  };
}

const straight = placed<TextLayer>((L, s, k) => {
  L.size = Math.max(TEXT_SIZE_MIN, r1(s.size * k));
});

/** Arc text sits in board coordinates on its circle (collar.html:2660 to 2662, 2678, 3158). */
const arc: Omit<Manipulator<TextLayer>, "rows"> = {
  placement: () => ({ dx: 0, dy: 0, rot: 0 }),
  unplaced: (L) => ({ ...L, dx: 0, dy: 0, rot: 0 }),
  move(L, _s, m) {
    L.arcR = clamp(Math.hypot(m.mx, m.my), ART_RADIUS_FLOOR, arcMax(m.frame));
    L.arcDeg = Math.round(Math.atan2(m.my, m.mx) * 180 / Math.PI) || 0;
    return NO_SNAP;
  },
  scale: straight.scale,
  rotate(L, s, da, mods) {
    L.arcDeg = snapRotation((s.arcDeg ?? 0) + da, mods);
  },
  nudge(L, ax, ay, step, shift, frame) {
    L.arcR = clamp((L.arcR ?? 0) + ay * step, ART_RADIUS_FLOOR, arcMax(frame));
    L.arcDeg = (L.arcDeg ?? 0) + ax * ARC_NUDGE_DEG[shift ? 1 : 0];
  },
  offset() {},
};

const textManip: Manipulator<TextLayer> = {
  rows: "bottom",
  placement: (L) => (L.mode === "arc" ? arc : straight).placement(L),
  unplaced: (L) => (L.mode === "arc" ? arc : straight).unplaced(L),
  move: (L, s, m) => (L.mode === "arc" ? arc : straight).move(L, s, m),
  scale: (L, s, k, m) => straight.scale(L, s, k, m),
  rotate: (L, s, da, mods) => (L.mode === "arc" ? arc : straight).rotate(L, s, da, mods),
  nudge: (L, ax, ay, step, shift, f) => (L.mode === "arc" ? arc : straight).nudge(L, ax, ay, step, shift, f),
  offset: (L) => (L.mode === "arc" ? arc : straight).offset(L),
};

const imageManip: Manipulator<ImageLayer> = {
  rows: "bottom",
  ...placed<ImageLayer>((L, s, k) => {
    L.scale = Number(clamp((s.scale ?? 1) * k, IMAGE_SCALE_RANGE[0], IMAGE_SCALE_RANGE[1]).toFixed(3));
  }),
};

/** A ring is centred on the board: a drag moves its centre radius and keeps its width (collar.html:2663 to 2666, 2675). */
const ringManip: Manipulator<RingLayer> = {
  rows: "top",
  placement: () => ({ dx: 0, dy: 0, rot: 0 }),
  unplaced: (L) => L,
  move(L, s, m) {
    const w = Math.abs(s.r1 - s.r0);
    const c = clamp(Math.hypot(m.mx, m.my), w / 2, m.frame.rArt);
    L.r0 = Math.max(0, c - w / 2);
    L.r1 = c + w / 2;
    return NO_SNAP;
  },
  scale(L, s, k, m) {
    L.r1 = Number(clamp(s.r1 * k, RING_R1_MIN, m.frame.rArt).toFixed(2));
    L.r0 = Number(clamp(s.r0 * k, 0, L.r1 - RING_W_MIN).toFixed(2));
  },
  rotate() {},
  nudge(L, _ax, ay, step, _shift, frame) {
    const w = L.r1 - L.r0;
    L.r1 = clamp(L.r1 + ay * step, w, frame.rArt);
    L.r0 = L.r1 - w;
  },
  offset() {},
};

/** A path's placement is the translation of its transform; it has no rotation field. */
const pathManip: Manipulator<PathLayer> = {
  rows: "bottom",
  placement: (L) => ({ dx: L.transform[4], dy: L.transform[5], rot: 0 }),
  unplaced: (L) => ({ ...L, transform: [L.transform[0], L.transform[1], L.transform[2], L.transform[3], 0, 0] }),
  move(L, s, m) {
    const r = snapMove(s.transform[4], s.transform[5], m.ddx, m.ddy, m.mods);
    L.transform = [L.transform[0], L.transform[1], L.transform[2], L.transform[3], r.x, r.y];
    return r.snapped;
  },
  scale(L, s, k) {
    const t = s.transform, q = (v: number): number => Math.round(v * k * 1e4) / 1e4;
    L.transform = [q(t[0]), q(t[1]), q(t[2]), q(t[3]), L.transform[4], L.transform[5]];
  },
  rotate() {},
  nudge(L, ax, ay, step) {
    const t = L.transform;
    L.transform = [t[0], t[1], t[2], t[3], t[4] + ax * step, t[5] + ay * step];
  },
  offset(L) {
    const t = L.transform;
    L.transform = [t[0], t[1], t[2], t[3], t[4] + DUP_OFFSET_MM, t[5] - DUP_OFFSET_MM];
  },
};

type Registry = { readonly [K in Layer["kind"]]: Manipulator<Extract<Layer, { kind: K }>> };

/** The manipulator registry: one entry per inlay layer kind. */
export const MANIPULATORS: Registry = { text: textManip, image: imageManip, ring: ringManip, path: pathManip };

export function manipulator(L: Layer): Manipulator<Layer> {
  return MANIPULATORS[L.kind] as Manipulator<Layer>;
}

/** The layer as plain JSON: an image object becomes its identity key. */
export function plain(L: Layer): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(L)) {
    out[k] = v !== null && typeof v === "object" && !Array.isArray(v) ? imageKey(v) : v;
  }
  return out;
}

/** A copy whose fields can change without touching the source; an image is shared. */
export function copyLayer<L extends Layer>(L: L): L {
  const c = { ...L };
  if ("transform" in c) (c as PathLayer).transform = [...(c as PathLayer).transform];
  return c;
}
