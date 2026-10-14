// Handle geometry, hit testing and the snap rules of the art board.
// Ported from the KNUCKLE face editor, part6.js lines 402 to 560 (lineage
// inlay.face-editor/knuckle-part6, the canonical copy): mm2px and px2mm
// (406, 407), layerHandles (433 to 442), insideBox (443), hitTest (444 to
// 450), the move snap (526 to 530) and the rotate snap (536 to 540).
// Nothing here touches the DOM; coordinates are canvas css pixels with y
// down and model mm with y up.

/** Half size of a corner square, px (part6.js:405 HANDLE). */
export const HANDLE = 5;
/** Stem from the top edge midpoint to the rotate dot, px (part6.js:405 ROT_STEM). */
export const ROT_STEM = 26;
/** Hit radius of a corner or the dot, px (part6.js:405 HIT). */
export const HIT = 9;
/** Move snaps an axis to the board centre within this many mm (part6.js:529). */
export const CENTRE_SNAP_MM = 0.6;
/** Moves land on a grid of this many mm (part6.js:530, round(x 4) / 4). */
export const MOVE_STEP_MM = 0.25;
/** Rotation snaps to these angles, degrees (part6.js:539). */
export const ROT_SNAPS = [-180, -90, 0, 90, 180] as const;
/** within this many degrees (part6.js:539) */
export const ROT_SNAP_DEG = 4;
/** shift rounds rotation to this many degrees (part6.js:539) */
export const ROT_SHIFT_DEG = 15;

export type Px = readonly [number, number];

/** Layer bounds in the layer's own frame, mm (placement removed). */
export interface BBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Where a layer sits: its centre in board mm and its rotation, degrees counter-clockwise. */
export interface Placement {
  readonly dx: number;
  readonly dy: number;
  readonly rot: number;
}

/** The view transform: board mm to canvas px (part6.js FE.scale, FE.ox, FE.oy). */
export interface View {
  readonly scale: number;
  readonly ox: number;
  readonly oy: number;
}

export interface Handles {
  readonly bb: BBox;
  /** bottom left, bottom right, top right, top left in the layer frame, px */
  readonly corners: readonly [Px, Px, Px, Px];
  /** midpoint of the top edge, px */
  readonly top: Px;
  /** the rotate dot, ROT_STEM px beyond top along the layer's +y, px */
  readonly dot: Px;
  /** the placement centre, px */
  readonly centre: Px;
}

export const mm2px = (v: View, x: number, y: number): Px => [v.ox + x * v.scale, v.oy - y * v.scale];
export const px2mm = (v: View, px: number, py: number): Px => [(px - v.ox) / v.scale, -(py - v.oy) / v.scale];

export function layerHandles(bb: BBox, at: Placement, v: View): Handles {
  const r = at.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const to = (x: number, y: number): Px => mm2px(v, at.dx + x * c - y * s, at.dy + x * s + y * c);
  const corners = [to(bb.x0, bb.y0), to(bb.x1, bb.y0), to(bb.x1, bb.y1), to(bb.x0, bb.y1)] as const;
  const top = to((bb.x0 + bb.x1) / 2, bb.y1);
  // the layer's +y in screen px (y down) is (-sin, -cos)
  return { bb, corners, top, dot: [top[0] - s * ROT_STEM, top[1] - c * ROT_STEM], centre: mm2px(v, at.dx, at.dy) };
}

/** Point inside the convex quad of the corners, edges included (part6.js:443). */
export function insideBox(h: Pick<Handles, "corners">, px: number, py: number): boolean {
  const q = h.corners;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i]!, b = q[(i + 1) % 4]!;
    const cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
    if (cr === 0) continue;
    if (sign === 0) sign = Math.sign(cr);
    else if (Math.sign(cr) !== sign) return false;
  }
  return true;
}

export type Hit<Id> =
  | { readonly mode: "rotate"; readonly id: Id }
  | { readonly mode: "scale"; readonly id: Id; readonly corner: number }
  | { readonly mode: "move"; readonly id: Id }
  | { readonly mode: "select"; readonly id: Id }
  | { readonly mode: "none" };

/**
 * The selected layer's dot, then its corners, then its box; else the
 * topmost layer (last in paint order) whose box holds the point
 * (part6.js:444 to 450).
 */
export function hitTest<Id>(order: readonly Id[], sel: Id | null, handlesOf: (id: Id) => Handles | null, px: number, py: number): Hit<Id> {
  if (sel !== null) {
    const h = handlesOf(sel);
    if (h !== null) {
      if (Math.hypot(px - h.dot[0], py - h.dot[1]) <= HIT) return { mode: "rotate", id: sel };
      for (let i = 0; i < 4; i++) if (Math.hypot(px - h.corners[i]![0], py - h.corners[i]![1]) <= HIT) return { mode: "scale", id: sel, corner: i };
      if (insideBox(h, px, py)) return { mode: "move", id: sel };
    }
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const h = handlesOf(order[i]!);
    if (h !== null && insideBox(h, px, py)) return { mode: "select", id: order[i]! };
  }
  return { mode: "none" };
}

export interface Mods {
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

/** A rotation in degrees after the snap rules, rounded to a whole degree (part6.js:537 to 540). */
export function snapRotation(deg: number, m: Mods): number {
  let d = ((deg + 180) % 360 + 360) % 360 - 180;
  if (m.shiftKey) d = Math.round(d / ROT_SHIFT_DEG) * ROT_SHIFT_DEG;
  else if (!m.altKey) for (const s of ROT_SNAPS) if (Math.abs(d - s) < ROT_SNAP_DEG) d = s;
  return Math.round(d) || 0;
}

export interface MoveResult {
  readonly x: number;
  readonly y: number;
  readonly snapped: { readonly x: boolean; readonly y: boolean };
}

/**
 * A move from (x0, y0) by (ddx, ddy) mm: shift keeps the dominant axis,
 * each axis within CENTRE_SNAP_MM of the board centre lands on it unless
 * alt is down, and the result sits on the MOVE_STEP_MM grid (part6.js:525
 * to 530).
 */
export function snapMove(x0: number, y0: number, ddx: number, ddy: number, m: Mods): MoveResult {
  let dx = ddx, dy = ddy;
  if (m.shiftKey) {
    if (Math.abs(dx) > Math.abs(dy)) dy = 0;
    else dx = 0;
  }
  let x = x0 + dx, y = y0 + dy;
  let sx = false, sy = false;
  if (!m.altKey) {
    if (Math.abs(x) < CENTRE_SNAP_MM) { x = 0; sx = true; }
    if (Math.abs(y) < CENTRE_SNAP_MM) { y = 0; sy = true; }
  }
  const grid = 1 / MOVE_STEP_MM;
  return { x: Math.round(x * grid) / grid, y: Math.round(y * grid) / grid, snapped: { x: sx, y: sy } };
}
