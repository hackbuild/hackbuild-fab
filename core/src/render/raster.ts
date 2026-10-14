// An orthographic z-buffer rasterizer over Part IR triangles (M00-T13
// step 11). Flat shading per triangle, one colour per slot; the section
// view keeps the half behind the mid plane and paints a hatched cap where
// the nearest surface faces away, which on a closed mesh is the cut. No
// browser and no three, so it runs on the macOS 12 machine (RISKS.md
// R-24). Only basic float arithmetic and sqrt, both correctly rounded, so
// the pixels depend only on the triangles.

export type View = "top" | "front" | "iso" | "section";

export const VIEWS: readonly View[] = ["top", "front", "iso", "section"];

export type Rgb = readonly [number, number, number];

export interface RenderMesh {
  readonly positions: ArrayLike<number>;
  readonly triangles: ArrayLike<number>;
  readonly colour: Rgb;
}

type V3 = readonly [number, number, number];

interface Camera {
  readonly right: V3;
  readonly up: V3;
  /** Toward the viewer; a larger dot product is nearer. */
  readonly toward: V3;
}

const norm = (v: V3): V3 => {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: ArrayLike<number>, o = 0): number => a[0] * b[o]! + a[1] * b[o + 1]! + a[2] * b[o + 2]!;

const ISO_TOWARD = norm([1, -1, 1]);
const ISO_RIGHT = norm(cross([0, 0, 1], ISO_TOWARD));

const CAMERAS: Readonly<Record<View, Camera>> = {
  top: { right: [1, 0, 0], up: [0, 1, 0], toward: [0, 0, 1] },
  front: { right: [1, 0, 0], up: [0, 0, 1], toward: [0, -1, 0] },
  section: { right: [1, 0, 0], up: [0, 0, 1], toward: [0, -1, 0] },
  iso: { right: ISO_RIGHT, up: cross(ISO_TOWARD, ISO_RIGHT), toward: ISO_TOWARD },
};

/** Light direction for the flat shade, toward the light. */
const LIGHT = norm([0.35, -0.55, 0.76]);
/** Ambient share of the shade; the rest is Lambert from LIGHT. */
const AMBIENT = 0.38;
/** Margin around the fitted bounds, share of the shorter image side. */
const MARGIN = 0.06;
/** Section cap hatch pitch, px. */
const HATCH_PX = 6;

/** Background: --hb-paper #f5f0e6. */
export const PAPER: Rgb = [0xf5, 0xf0, 0xe6];

/** #rrggbb or #rrggbbaa to RGB; anything else is mid grey. */
export function parseColour(hex: string): Rgb {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  return m === null ? [128, 128, 128] : [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
}

/** Draw one view of the meshes into a width x height RGB buffer. */
export function renderView(meshes: readonly RenderMesh[], view: View, width: number, height: number): Uint8Array {
  const cam = CAMERAS[view];
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i += 1) rgb.set(PAPER, i * 3);
  const depth = new Float64Array(width * height).fill(Number.NEGATIVE_INFINITY);

  // Fit the projected bounds; the section plane is the middle of the y extent.
  let lo = [Infinity, Infinity];
  let hi = [-Infinity, -Infinity];
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const m of meshes) {
    for (let o = 0; o < m.positions.length; o += 3) {
      const sx = dot(cam.right, m.positions, o);
      const sy = dot(cam.up, m.positions, o);
      lo = [Math.min(lo[0]!, sx), Math.min(lo[1]!, sy)];
      hi = [Math.max(hi[0]!, sx), Math.max(hi[1]!, sy)];
      yLo = Math.min(yLo, m.positions[o + 1]!);
      yHi = Math.max(yHi, m.positions[o + 1]!);
    }
  }
  if (!(hi[0]! >= lo[0]!)) return rgb;
  const margin = MARGIN * Math.min(width, height);
  const scale = Math.min((width - 2 * margin) / Math.max(hi[0]! - lo[0]!, 1e-9), (height - 2 * margin) / Math.max(hi[1]! - lo[1]!, 1e-9));
  const cx = (lo[0]! + hi[0]!) / 2;
  const cy = (lo[1]! + hi[1]!) / 2;
  // Fragments nearer than the plane (y below the middle) are cut away in the section.
  const cutDepth = view === "section" ? -((yLo + yHi) / 2) : Number.POSITIVE_INFINITY;

  for (const m of meshes) {
    const t = m.triangles;
    const p = m.positions;
    for (let k = 0; k < t.length; k += 3) {
      const a = 3 * t[k]!;
      const b = 3 * t[k + 1]!;
      const c = 3 * t[k + 2]!;
      const e1: V3 = [p[b]! - p[a]!, p[b + 1]! - p[a + 1]!, p[b + 2]! - p[a + 2]!];
      const e2: V3 = [p[c]! - p[a]!, p[c + 1]! - p[a + 1]!, p[c + 2]! - p[a + 2]!];
      const n = cross(e1, e2);
      const nl = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
      if (nl === 0) continue;
      const facing = dot(cam.toward, n) > 0;
      const lambert = Math.max(0, dot(LIGHT, n) / nl);
      const shade = AMBIENT + (1 - AMBIENT) * lambert;
      const xs = [a, b, c].map((o) => width / 2 + (dot(cam.right, p, o) - cx) * scale);
      const ys = [a, b, c].map((o) => height / 2 - (dot(cam.up, p, o) - cy) * scale);
      const zs = [a, b, c].map((o) => dot(cam.toward, p, o));
      const area = (xs[1]! - xs[0]!) * (ys[2]! - ys[0]!) - (xs[2]! - xs[0]!) * (ys[1]! - ys[0]!);
      if (area === 0) continue;
      const x0 = Math.max(0, Math.floor(Math.min(xs[0]!, xs[1]!, xs[2]!)));
      const x1 = Math.min(width - 1, Math.ceil(Math.max(xs[0]!, xs[1]!, xs[2]!)));
      const y0 = Math.max(0, Math.floor(Math.min(ys[0]!, ys[1]!, ys[2]!)));
      const y1 = Math.min(height - 1, Math.ceil(Math.max(ys[0]!, ys[1]!, ys[2]!)));
      for (let y = y0; y <= y1; y += 1) {
        const py = y + 0.5;
        for (let x = x0; x <= x1; x += 1) {
          const px = x + 0.5;
          const w0 = ((xs[1]! - px) * (ys[2]! - py) - (xs[2]! - px) * (ys[1]! - py)) / area;
          const w1 = ((xs[2]! - px) * (ys[0]! - py) - (xs[0]! - px) * (ys[2]! - py)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * zs[0]! + w1 * zs[1]! + w2 * zs[2]!;
          if (z > cutDepth) continue;
          const i = y * width + x;
          if (z <= depth[i]!) continue;
          depth[i] = z;
          let f = shade;
          if (!facing) f = (x + y) % HATCH_PX < 2 ? 0.32 : 0.6;
          rgb[3 * i] = Math.min(255, Math.round(m.colour[0] * f));
          rgb[3 * i + 1] = Math.min(255, Math.round(m.colour[1] * f));
          rgb[3 * i + 2] = Math.min(255, Math.round(m.colour[2] * f));
        }
      }
    }
  }
  return rgb;
}

/** The four views on one sheet, two by two: top, front, iso, section. */
export function renderSheet(meshes: readonly RenderMesh[], width: number, height: number): Uint8Array {
  const w = Math.floor(width / 2);
  const h = Math.floor(height / 2);
  const out = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i += 1) out.set(PAPER, i * 3);
  VIEWS.forEach((v, k) => {
    const tile = renderView(meshes, v, w, h);
    const ox = (k % 2) * w;
    const oy = Math.floor(k / 2) * h;
    for (let y = 0; y < h; y += 1) out.set(tile.subarray(y * w * 3, (y + 1) * w * 3), ((oy + y) * width + ox) * 3);
  });
  return out;
}
