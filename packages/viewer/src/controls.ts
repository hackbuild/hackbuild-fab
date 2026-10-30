/// <reference lib="dom" />
// Direct manipulation on the stage (bible 9: sliders for parameters, never
// for the camera). Ported from PIP bench/part3.js lines 22 to 98: a z-up
// orbit of theta, phi and distance around a target, drag orbits at 0.008
// rad per px, phi held to plus or minus 1.5 rad, right drag pans by 0.0012 of
// the distance per px, the wheel scales the distance by 1.1 or 0.9 inside 20
// to 1500 mm, double click refits. Touch follows the same numbers: one finger
// orbits, a pinch scales the distance by the change in finger spacing, two
// fingers pan by the moving midpoint. A press that moves at most PICK_SLOP_PX
// is a pick, never an orbit.

/** Orbit around `target`; angles in rad, distance in mm. */
export interface Orbit {
  theta: number;
  phi: number;
  dist: number;
  target: [number, number, number];
}

export type CamName = "iso" | "top" | "front" | "side" | "under";

/**
 * theta and phi per cam, rad. iso, top, front and under are PIP's
 * (part3.js line 29); side is PIP's front turned a quarter about z
 * (inferred, PIP has no side cam).
 */
export const CAMS: Readonly<Record<CamName, readonly [number, number]>> = {
  iso: [-1.2, 0.85],
  top: [-Math.PI / 2, Math.PI / 2 - 0.001],
  front: [-Math.PI / 2, 0.12],
  side: [0, 0.12],
  under: [-1.2, -0.85],
};

export const CAM_NAMES = Object.keys(CAMS) as CamName[];

/** rad per px of drag (PIP part3.js line 85). */
export const ORBIT_RAD_PER_PX = 0.008;
/** phi limit, rad (PIP part3.js line 85). */
export const PHI_LIMIT = 1.5;
/** Pan per px as a fraction of the distance (PIP part3.js line 86). */
export const PAN_PER_PX = 0.0012;
/** Wheel distance factors, out then in, per notch (PIP part3.js line 94). */
export const WHEEL_STEP: readonly [number, number] = [1.1, 0.9];
/** Distance limits, mm (PIP part3.js line 94). */
export const DIST_RANGE: readonly [number, number] = [20, 1500];
/** A fit puts the camera this many times the largest extent away (PIP part3.js line 52). */
export const FIT_FACTOR = 1.75;
/** A press that moves at most this far is a pick, px (inferred). */
export const PICK_SLOP_PX = 4;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function setCam(o: Orbit, cam: CamName): void {
  const [theta, phi] = CAMS[cam];
  o.theta = theta;
  o.phi = phi;
}

/** Camera position for an orbit, z up (PIP part3.js `applyCam`). */
export function eye(o: Orbit): [number, number, number] {
  const [x, y, z] = o.target;
  return [
    x + o.dist * Math.cos(o.phi) * Math.cos(o.theta),
    y + o.dist * Math.cos(o.phi) * Math.sin(o.theta),
    z + o.dist * Math.sin(o.phi),
  ];
}

export function rotate(o: Orbit, dxPx: number, dyPx: number): void {
  o.theta -= dxPx * ORBIT_RAD_PER_PX;
  o.phi = clamp(o.phi + dyPx * ORBIT_RAD_PER_PX, -PHI_LIMIT, PHI_LIMIT);
}

export function zoom(o: Orbit, factor: number): void {
  o.dist = clamp(o.dist * factor, DIST_RANGE[0], DIST_RANGE[1]);
}

/** Moves the target in the view plane: right with dx, up with negative dy. */
export function pan(o: Orbit, dxPx: number, dyPx: number): void {
  const e = eye(o);
  const r = [e[0] - o.target[0], e[1] - o.target[1], e[2] - o.target[2]] as const;
  // right = r x up(z), up' = right x r, as PIP computes them.
  const right = norm([r[1], -r[0], 0]);
  const [ax, ay, az] = right as [number, number, number];
  const up = norm([ay * r[2] - az * r[1], az * r[0] - ax * r[2], ax * r[1] - ay * r[0]]);
  const k = o.dist * PAN_PER_PX;
  for (let i = 0; i < 3; i++) o.target[i] = (o.target[i] as number) + (right[i] as number) * dxPx * k - (up[i] as number) * dyPx * k;
}

function norm(v: readonly number[]): number[] {
  const l = Math.hypot(...v) || 1;
  return v.map((c) => c / l);
}

/** Camera field the fit frames for: vertical fov in degrees and width over height. */
export interface FitView {
  readonly fovDeg: number;
  readonly aspect: number;
}

/**
 * Room left around the bounding sphere when a fit frames it for the
 * stage, as a factor on the distance (inferred; gold G-15 asks only that the
 * projected box stay inside the stage).
 */
export const FIT_MARGIN = 1.08;

/** A commit whose model bounds move by more than this fraction refits (gold G-15, UI.md 12.1). */
export const REFIT_FRACTION = 0.2;

type Box = readonly [readonly number[], readonly number[]];

/**
 * Aims at the centre of a box and backs off FIT_FACTOR times its largest
 * extent (PIP), or further when the stage is narrow: with a camera field
 * given, the box's bounding sphere fits the narrower of the vertical and
 * horizontal half angles, so a wide model on a tall stage stays inside it
 * (G-15). Inside DIST_RANGE.
 */
export function fit(o: Orbit, bbox: Box, view?: FitView): void {
  const [lo, hi] = bbox;
  for (let i = 0; i < 3; i++) o.target[i] = ((lo[i] as number) + (hi[i] as number)) / 2;
  const size = [0, 1, 2].map((i) => (hi[i] as number) - (lo[i] as number));
  let dist = Math.max(...size) * FIT_FACTOR;
  if (view !== undefined && view.aspect > 0) {
    const halfV = (view.fovDeg * Math.PI) / 360;
    const halfH = Math.atan(Math.tan(halfV) * view.aspect);
    const radius = Math.hypot(...size) / 2;
    dist = Math.max(dist, (FIT_MARGIN * radius) / Math.sin(Math.min(halfV, halfH)));
  }
  o.dist = clamp(dist, DIST_RANGE[0], DIST_RANGE[1]);
}

/**
 * True when box `b` differs from `a` by more than REFIT_FRACTION of a's
 * largest extent, in any size or in its centre, on any axis.
 */
export function boundsMoved(a: Box, b: Box): boolean {
  const ext = Math.max(...[0, 1, 2].map((i) => (a[1][i] as number) - (a[0][i] as number)), 1e-9);
  for (let i = 0; i < 3; i++) {
    const sa = (a[1][i] as number) - (a[0][i] as number);
    const sb = (b[1][i] as number) - (b[0][i] as number);
    const ca = ((a[1][i] as number) + (a[0][i] as number)) / 2;
    const cb = ((b[1][i] as number) + (b[0][i] as number)) / 2;
    if (Math.abs(sb - sa) > REFIT_FRACTION * ext || Math.abs(cb - ca) > REFIT_FRACTION * ext) return true;
  }
  return false;
}

export interface ControlHooks {
  /** The orbit changed; render. */
  readonly change: () => void;
  /** A press that did not move: the client point to pick under. */
  readonly pick: (clientX: number, clientY: number) => void;
  /** Double click. */
  readonly refit: () => void;
}

/** Binds pointer, wheel and touch handling on `el`; returns the unbind. */
export function bindControls(el: HTMLElement, o: Orbit, hooks: ControlHooks): () => void {
  const pts = new Map<number, { x: number; y: number; button: number }>();
  let moved = 0;
  let pinch: { span: number; mid: [number, number] } | null = null;

  const spanOf = (): { span: number; mid: [number, number] } => {
    const [a, b] = [...pts.values()];
    if (a === undefined || b === undefined) return { span: 0, mid: [0, 0] };
    return { span: Math.hypot(a.x - b.x, a.y - b.y), mid: [(a.x + b.x) / 2, (a.y + b.y) / 2] };
  };

  const down = (e: PointerEvent): void => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
    el.setPointerCapture?.(e.pointerId);
    if (pts.size === 1) moved = 0;
    pinch = pts.size === 2 ? spanOf() : null;
  };
  const move = (e: PointerEvent): void => {
    const p = pts.get(e.pointerId);
    if (p === undefined) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    moved += Math.hypot(dx, dy);
    if (pts.size === 2 && pinch !== null) {
      const now = spanOf();
      if (now.span > 0 && pinch.span > 0) zoom(o, pinch.span / now.span);
      pan(o, now.mid[0] - pinch.mid[0], now.mid[1] - pinch.mid[1]);
      pinch = now;
    } else if (pts.size === 1) {
      if (p.button === 0) rotate(o, dx, dy);
      else pan(o, dx, dy);
    } else return;
    hooks.change();
  };
  const up = (e: PointerEvent): void => {
    const p = pts.get(e.pointerId);
    pts.delete(e.pointerId);
    pinch = pts.size === 2 ? spanOf() : null;
    if (p !== undefined && pts.size === 0 && p.button === 0 && moved <= PICK_SLOP_PX && e.type === "pointerup") hooks.pick(e.clientX, e.clientY);
  };
  const wheel = (e: WheelEvent): void => {
    e.preventDefault();
    zoom(o, e.deltaY > 0 ? WHEEL_STEP[0] : WHEEL_STEP[1]);
    hooks.change();
  };
  const menu = (e: Event): void => e.preventDefault();
  const dbl = (): void => hooks.refit();

  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("wheel", wheel, { passive: false });
  el.addEventListener("contextmenu", menu);
  el.addEventListener("dblclick", dbl);
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.removeEventListener("wheel", wheel);
    el.removeEventListener("contextmenu", menu);
    el.removeEventListener("dblclick", dbl);
  };
}
