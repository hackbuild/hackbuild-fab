// The drawn content box of an SVG cut twin, for the extents rule of
// CHK-SHT-03 (COTTER audit_dxf.py compared the DXF extents with its SVG
// twin within 0.6 mm). Path data with absolute M, L, A and Z, the twin
// nest writes; an arc is bounded by its ends and the axis extremes it
// passes (SVG 1.1 implementation notes F.6.5, no x axis rotation). The box
// is in model coordinates: when the root carries no scale(1,-1), y is
// flipped back about the viewBox height. Written beside the DXF reader, and
// like it imports nothing from packages/nest.

import { arcExtremes, type Box } from "./dxf-reader.js";

function arcPoints(a: readonly [number, number], b: readonly [number, number], r0: number, large: boolean, sweepCcw: boolean): [number, number][] {
  const x1p = (a[0] - b[0]) / 2, y1p = (a[1] - b[1]) / 2;
  const d2 = x1p * x1p + y1p * y1p;
  if (d2 === 0) return [[a[0], a[1]]];
  let r = Math.abs(r0);
  const lam = d2 / (r * r);
  if (lam > 1) r *= Math.sqrt(lam);
  let co = Math.sqrt(Math.max(0, r * r * r * r - r * r * d2) / (r * r * d2));
  if (large === sweepCcw) co = -co;
  const cx = co * y1p + (a[0] + b[0]) / 2;
  const cy = -co * x1p + (a[1] + b[1]) / 2;
  const t0 = Math.atan2(a[1] - cy, a[0] - cx);
  let d = Math.atan2(b[1] - cy, b[0] - cx) - t0;
  if (sweepCcw && d < 0) d += 2 * Math.PI;
  if (!sweepCcw && d > 0) d -= 2 * Math.PI;
  return arcExtremes(cx, cy, r, t0, d);
}

/** Box of one path's data. */
export function pathBox(d: string): Box {
  const toks = d.match(/[MLAZ]|-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? [];
  const pts: [number, number][] = [];
  let cur: [number, number] = [0, 0];
  let cmd = "";
  for (let i = 0; i < toks.length;) {
    const t = toks[i]!;
    if (/^[MLAZ]$/.test(t)) {
      cmd = t;
      i++;
      if (t === "Z") continue;
    }
    if (cmd === "M" || cmd === "L") {
      cur = [Number(toks[i]), Number(toks[i + 1])];
      pts.push(cur);
      i += 2;
    } else if (cmd === "A") {
      const end: [number, number] = [Number(toks[i + 5]), Number(toks[i + 6])];
      pts.push(...arcPoints(cur, end, Number(toks[i]), toks[i + 3] === "1", toks[i + 4] === "1"));
      cur = end;
      i += 7;
    } else {
      throw new Error(`SVG path command ${JSON.stringify(cmd)} is not read by the CHK-SHT-03 twin rule`);
    }
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

/** Content box of a twin in model coordinates; null when it draws no path. */
export function svgContentBox(svg: string): Box | null {
  const boxes = [...svg.matchAll(/<path[^>]*\sd="([^"]*)"/g)].map((m) => pathBox(m[1]!));
  if (boxes.length === 0) return null;
  const x0 = Math.min(...boxes.map((b) => b[0])), x1 = Math.max(...boxes.map((b) => b[2]));
  let y0 = Math.min(...boxes.map((b) => b[1])), y1 = Math.max(...boxes.map((b) => b[3]));
  if (!svg.includes("scale(1,-1)")) {
    const h = Number(/viewBox="[-\d.]+ [-\d.]+ [-\d.]+ ([-\d.]+)"/.exec(svg)?.[1] ?? 0);
    [y0, y1] = [h - y1, h - y0];
  }
  return [x0, y0, x1, y1];
}
