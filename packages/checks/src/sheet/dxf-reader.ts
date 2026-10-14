// A DXF reader for CHK-SHT-03, written from the DXF reference (group code
// pairs: a code line, then a value line; sections opened by 0 SECTION and
// 2 <name>, closed by 0 ENDSEC; header variables named by code 9; one
// entity per code 0 record in ENTITIES). It shares no code with the writer
// in packages/nest: tools/tiers.json refuses any import of nest from this
// folder, so a fault in the writer cannot hide in the check that reads its
// output (M07-T06 step 5, D-138).
//
// Read: header variables (the first value after each code 9), and every
// top-level entity of ENTITIES with its type, handle (5), layer (8) and
// the pairs that follow. Geometry: LWPOLYLINE vertices (10, 20) with
// bulges (42) and the closed bit of 70; POLYLINE with the VERTEX records
// up to its SEQEND; LINE, CIRCLE and ARC. Text and anything else count as
// entities with no extents.

/** One code and its value, both as written, trimmed. */
export type GroupPair = readonly [number, string];

export interface DxfEntity {
  readonly type: string;
  /** Code 5, hex; null when the record has none. */
  readonly handle: string | null;
  /** Code 8; null when the record has none. */
  readonly layer: string | null;
  readonly pairs: readonly GroupPair[];
}

export interface DxfFile {
  /** Header variables by name, first value after the name. */
  readonly header: ReadonlyMap<string, string>;
  /** Top-level ENTITIES records in file order; VERTEX and SEQEND appear as their own records. */
  readonly entities: readonly DxfEntity[];
}

/** A polyline as read: vertices, the bulge leaving each, and the closed bit. */
export interface DxfPolyline {
  readonly type: "LWPOLYLINE" | "POLYLINE";
  readonly pts: readonly (readonly [number, number])[];
  readonly bulges: readonly number[];
  readonly closed: boolean;
}

/** Splits text into group code pairs; refuses a code line that is not an integer. */
export function groupPairs(text: string): GroupPair[] {
  const lines = text.split(/\r?\n/);
  const out: GroupPair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = lines[i]!.trim();
    if (!/^-?\d+$/.test(code)) throw new Error(`DXF line ${i + 1}: group code ${JSON.stringify(code)} is not an integer`);
    out.push([Number(code), lines[i + 1]!.trim()]);
  }
  return out;
}

export function readDxf(text: string): DxfFile {
  const pairs = groupPairs(text);
  const header = new Map<string, string>();
  const entities: { type: string; handle: string | null; layer: string | null; pairs: GroupPair[] }[] = [];
  let section: string | null = null;
  let variable: string | null = null;
  let cur: (typeof entities)[number] | null = null;
  for (let k = 0; k < pairs.length; k++) {
    const [code, value] = pairs[k]!;
    if (code === 0 && value === "SECTION") {
      section = pairs[k + 1]?.[1] ?? null;
      cur = null;
      k++;
      continue;
    }
    if (code === 0 && value === "ENDSEC") {
      section = null;
      cur = null;
      continue;
    }
    if (section === "HEADER") {
      if (code === 9) variable = value;
      else if (variable !== null && !header.has(variable)) header.set(variable, value);
    } else if (section === "ENTITIES") {
      if (code === 0) {
        cur = { type: value, handle: null, layer: null, pairs: [] };
        entities.push(cur);
      } else if (cur !== null) {
        if (code === 5 && cur.handle === null) cur.handle = value;
        if (code === 8 && cur.layer === null) cur.layer = value;
        cur.pairs.push([code, value]);
      }
    }
  }
  return { header, entities };
}

const num = (e: DxfEntity, code: number, fallback = 0): number => {
  const p = e.pairs.find(([c]) => c === code);
  return p === undefined ? fallback : Number(p[1]);
};

/** LWPOLYLINE and POLYLINE entities as vertex lists. */
export function polylines(f: DxfFile): DxfPolyline[] {
  const out: DxfPolyline[] = [];
  const ents = f.entities;
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i]!;
    if (e.type === "LWPOLYLINE") {
      const pts: [number, number][] = [];
      const bulges: number[] = [];
      for (const [c, v] of e.pairs) {
        if (c === 10) {
          pts.push([Number(v), 0]);
          bulges.push(0);
        } else if (c === 20 && pts.length > 0) pts[pts.length - 1]![1] = Number(v);
        else if (c === 42 && bulges.length > 0) bulges[bulges.length - 1] = Number(v);
      }
      out.push({ type: "LWPOLYLINE", pts, bulges, closed: (num(e, 70) & 1) === 1 });
    } else if (e.type === "POLYLINE") {
      const pts: [number, number][] = [];
      const bulges: number[] = [];
      for (i++; i < ents.length && ents[i]!.type === "VERTEX"; i++) {
        pts.push([num(ents[i]!, 10), num(ents[i]!, 20)]);
        bulges.push(num(ents[i]!, 42));
      }
      out.push({ type: "POLYLINE", pts, bulges, closed: (num(e, 70) & 1) === 1 });
    }
  }
  return out;
}

/** An axis-aligned box, mm: x0, y0, x1, y1. */
export type Box = readonly [number, number, number, number];

/** The points of an arc that bound it: its ends and every axis extreme it passes. */
export function arcExtremes(cx: number, cy: number, r: number, start: number, sweep: number): [number, number][] {
  const out: [number, number][] = [[cx + r * Math.cos(start), cy + r * Math.sin(start)], [cx + r * Math.cos(start + sweep), cy + r * Math.sin(start + sweep)]];
  for (let k = -8; k <= 8; k++) {
    const t = (k * Math.PI) / 2;
    const s = sweep === 0 ? -1 : (t - start) / sweep;
    if (s > 0 && s < 1) out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return out;
}

/** Points that bound the segment from a to b under a bulge (tan of a quarter of the signed sweep). */
function bulgePoints(a: readonly [number, number], b: readonly [number, number], bulge: number): [number, number][] {
  if (bulge === 0) return [[a[0], a[1]], [b[0], b[1]]];
  const sweep = 4 * Math.atan(bulge);
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (chord === 0) return [[a[0], a[1]]];
  const r = chord / (2 * Math.sin(Math.abs(sweep) / 2));
  // centre: from the chord midpoint along the left normal by r cos(sweep/2), signed with the sweep
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const h = (r * Math.cos(sweep / 2)) * Math.sign(sweep);
  const nx = -(b[1] - a[1]) / chord, ny = (b[0] - a[0]) / chord;
  const cx = mx + nx * h, cy = my + ny * h;
  return arcExtremes(cx, cy, r, Math.atan2(a[1] - cy, a[0] - cx), sweep);
}

/** Extents of the drawn geometry: polylines with bulges, LINE, CIRCLE, ARC. Null when nothing is drawn. */
export function extents(f: DxfFile): Box | null {
  const pts: [number, number][] = [];
  for (const p of polylines(f)) {
    const n = p.pts.length;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      if (last && !p.closed) {
        pts.push([p.pts[i]![0], p.pts[i]![1]]);
        continue;
      }
      pts.push(...bulgePoints(p.pts[i]!, p.pts[(i + 1) % n]!, p.bulges[i] ?? 0));
    }
  }
  for (const e of f.entities) {
    if (e.type === "LINE") pts.push([num(e, 10), num(e, 20)], [num(e, 11), num(e, 21)]);
    else if (e.type === "CIRCLE") {
      const r = num(e, 40);
      pts.push([num(e, 10) - r, num(e, 20) - r], [num(e, 10) + r, num(e, 20) + r]);
    } else if (e.type === "ARC") {
      const a0 = (num(e, 50) * Math.PI) / 180;
      let a1 = (num(e, 51) * Math.PI) / 180;
      while (a1 <= a0) a1 += 2 * Math.PI;
      pts.push(...arcExtremes(num(e, 10), num(e, 20), num(e, 40), a0, a1 - a0));
    }
  }
  if (pts.length === 0) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}
