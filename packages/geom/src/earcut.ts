// Linked-list ear clipping, a port of earcut 2.2.4 as vendored by KNUCKLE
// (x/knuckle/knuckle-src.zip member part0_earcut.js), with the triangulation
// wrapper the mesh kernel record asks for (knowledge/kernels/mesh-kernel.md
// sections 2 and 3).
//
// earcut: ISC License, Copyright (c) 2016, Mapbox.
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
// THE SOFTWARE IS PROVIDED "AS IS" AND ISC DISCLAIMS ALL WARRANTIES WITH
// REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL ISC BE LIABLE FOR ANY
// SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
// IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

import type { Ring, Vec2 } from "@hackbuild/spec";
import { MESH_GRID_PER_MM } from "@hackbuild/spec";
import { EARCUT_ROTATION_TABLE } from "./unit-circle.table.js";

class Node {
  prev: Node;
  next: Node;
  z = 0;
  prevZ: Node | null = null;
  nextZ: Node | null = null;
  steiner = false;
  constructor(
    readonly i: number,
    readonly x: number,
    readonly y: number,
  ) {
    this.prev = this;
    this.next = this;
  }
}

/**
 * earcut 2.2.4: triangulate a flat coordinate array with hole start indices
 * (in vertices). Returns vertex index triples, already divided by dim.
 */
export function earcut(data: ArrayLike<number>, holeIndices?: readonly number[] | null, dim = 2): number[] {
  const hasHoles = holeIndices !== null && holeIndices !== undefined && holeIndices.length > 0;
  const outerLen = hasHoles ? holeIndices[0]! * dim : data.length;
  let outerNode = linkedList(data, 0, outerLen, dim, true);
  const triangles: number[] = [];
  if (outerNode === null || outerNode.next === outerNode.prev) return triangles;

  let minX = 0;
  let minY = 0;
  let invSize = 0;
  if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

  // z-order hashing only pays off above 80 vertices
  if (data.length > 80 * dim) {
    let maxX = data[0]!;
    let maxY = data[1]!;
    minX = maxX;
    minY = maxY;
    for (let i = dim; i < outerLen; i += dim) {
      const x = data[i]!;
      const y = data[i + 1]!;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    invSize = Math.max(maxX - minX, maxY - minY);
    invSize = invSize !== 0 ? 32767 / invSize : 0;
  }

  earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);
  return triangles;
}

function linkedList(data: ArrayLike<number>, start: number, end: number, dim: number, clockwise: boolean): Node | null {
  let last: Node | null = null;
  if (clockwise === signedArea(data, start, end, dim) > 0) {
    for (let i = start; i < end; i += dim) last = insertNode(i, data[i]!, data[i + 1]!, last);
  } else {
    for (let i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i]!, data[i + 1]!, last);
  }
  if (last !== null && equals(last, last.next)) {
    removeNode(last);
    last = last.next;
  }
  return last;
}

function filterPoints(start: Node, end?: Node): Node {
  let stop = end ?? start;
  let p = start;
  let again: boolean;
  do {
    again = false;
    if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
      removeNode(p);
      p = stop = p.prev;
      if (p === p.next) break;
      again = true;
    } else {
      p = p.next;
    }
  } while (again || p !== stop);
  return stop;
}

function earcutLinked(start: Node | null, triangles: number[], dim: number, minX: number, minY: number, invSize: number, pass: number): void {
  if (start === null) return;
  let ear = start;
  if (pass === 0 && invSize !== 0) indexCurve(ear, minX, minY, invSize);

  let stop = ear;
  while (ear.prev !== ear.next) {
    const prev = ear.prev;
    const next = ear.next;
    if (invSize !== 0 ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
      triangles.push((prev.i / dim) | 0, (ear.i / dim) | 0, (next.i / dim) | 0);
      removeNode(ear);
      ear = next.next;
      stop = next.next;
      continue;
    }
    ear = next;
    if (ear === stop) {
      if (pass === 0) {
        earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);
      } else if (pass === 1) {
        const cured = cureLocalIntersections(filterPoints(ear), triangles, dim);
        earcutLinked(cured, triangles, dim, minX, minY, invSize, 2);
      } else if (pass === 2) {
        splitEarcut(ear, triangles, dim, minX, minY, invSize);
      }
      break;
    }
  }
}

function isEar(ear: Node): boolean {
  const a = ear.prev;
  const b = ear;
  const c = ear.next;
  if (area(a, b, c) >= 0) return false;
  const ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
  const x0 = ax < bx ? (ax < cx ? ax : cx) : bx < cx ? bx : cx;
  const y0 = ay < by ? (ay < cy ? ay : cy) : by < cy ? by : cy;
  const x1 = ax > bx ? (ax > cx ? ax : cx) : bx > cx ? bx : cx;
  const y1 = ay > by ? (ay > cy ? ay : cy) : by > cy ? by : cy;
  let p = c.next;
  while (p !== a) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.next;
  }
  return true;
}

function isEarHashed(ear: Node, minX: number, minY: number, invSize: number): boolean {
  const a = ear.prev;
  const b = ear;
  const c = ear.next;
  if (area(a, b, c) >= 0) return false;
  const ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
  const x0 = ax < bx ? (ax < cx ? ax : cx) : bx < cx ? bx : cx;
  const y0 = ay < by ? (ay < cy ? ay : cy) : by < cy ? by : cy;
  const x1 = ax > bx ? (ax > cx ? ax : cx) : bx > cx ? bx : cx;
  const y1 = ay > by ? (ay > cy ? ay : cy) : by > cy ? by : cy;
  const minZ = zOrder(x0, y0, minX, minY, invSize);
  const maxZ = zOrder(x1, y1, minX, minY, invSize);
  const blocks = (q: Node): boolean =>
    q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1 && q !== a && q !== c && pointInTriangle(ax, ay, bx, by, cx, cy, q.x, q.y) && area(q.prev, q, q.next) >= 0;

  let p = ear.prevZ;
  let n = ear.nextZ;
  while (p !== null && p.z >= minZ && n !== null && n.z <= maxZ) {
    if (blocks(p)) return false;
    p = p.prevZ;
    if (blocks(n)) return false;
    n = n.nextZ;
  }
  while (p !== null && p.z >= minZ) {
    if (blocks(p)) return false;
    p = p.prevZ;
  }
  while (n !== null && n.z <= maxZ) {
    if (blocks(n)) return false;
    n = n.nextZ;
  }
  return true;
}

function cureLocalIntersections(begin: Node, triangles: number[], dim: number): Node {
  let start = begin;
  let p = start;
  do {
    const a = p.prev;
    const b = p.next.next;
    if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
      triangles.push((a.i / dim) | 0, (p.i / dim) | 0, (b.i / dim) | 0);
      removeNode(p);
      removeNode(p.next);
      p = start = b;
    }
    p = p.next;
  } while (p !== start);
  return filterPoints(p);
}

function splitEarcut(start: Node, triangles: number[], dim: number, minX: number, minY: number, invSize: number): void {
  let a = start;
  do {
    let b = a.next.next;
    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        let c = splitPolygon(a, b);
        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next);
        earcutLinked(a, triangles, dim, minX, minY, invSize, 0);
        earcutLinked(c, triangles, dim, minX, minY, invSize, 0);
        return;
      }
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}

function eliminateHoles(data: ArrayLike<number>, holeIndices: readonly number[], outer: Node, dim: number): Node {
  const queue: Node[] = [];
  for (let i = 0, len = holeIndices.length; i < len; i++) {
    const start = holeIndices[i]! * dim;
    const end = i < len - 1 ? holeIndices[i + 1]! * dim : data.length;
    const list = linkedList(data, start, end, dim, false);
    if (list === null) continue;
    if (list === list.next) list.steiner = true;
    queue.push(getLeftmost(list));
  }
  queue.sort((a, b) => a.x - b.x);
  let outerNode = outer;
  for (const hole of queue) outerNode = eliminateHole(hole, outerNode);
  return outerNode;
}

function eliminateHole(hole: Node, outerNode: Node): Node {
  const bridge = findHoleBridge(hole, outerNode);
  if (bridge === null) return outerNode;
  const bridgeReverse = splitPolygon(bridge, hole);
  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next);
}

// David Eberly's algorithm for finding a bridge between a hole and the outer polygon
function findHoleBridge(hole: Node, outerNode: Node): Node | null {
  let p = outerNode;
  const hx = hole.x;
  const hy = hole.y;
  let qx = -Infinity;
  let m: Node | null = null;
  do {
    if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      const x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
      if (x <= hx && x > qx) {
        qx = x;
        m = p.x < p.next.x ? p : p.next;
        if (x === hx) return m;
      }
    }
    p = p.next;
  } while (p !== outerNode);
  if (m === null) return null;

  const stop = m;
  const mx = m.x;
  const my = m.y;
  let tanMin = Infinity;
  p = m;
  do {
    if (hx >= p.x && p.x >= mx && hx !== p.x && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
      const tan = Math.abs(hy - p.y) / (hx - p.x);
      if (locallyInside(p, hole) && (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))) {
        m = p;
        tanMin = tan;
      }
    }
    p = p.next;
  } while (p !== stop);
  return m;
}

function sectorContainsSector(m: Node, p: Node): boolean {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}

function indexCurve(start: Node, minX: number, minY: number, invSize: number): void {
  let p = start;
  do {
    if (p.z === 0) p.z = zOrder(p.x, p.y, minX, minY, invSize);
    p.prevZ = p.prev;
    p.nextZ = p.next;
    p = p.next;
  } while (p !== start);
  p.prevZ!.nextZ = null;
  p.prevZ = null;
  sortLinked(p);
}

// Simon Tatham's linked list merge sort
function sortLinked(head: Node): Node {
  let list: Node | null = head;
  let inSize = 1;
  let numMerges: number;
  do {
    let p: Node | null = list;
    list = null;
    let tail: Node | null = null;
    numMerges = 0;
    while (p !== null) {
      numMerges++;
      let q: Node | null = p;
      let pSize = 0;
      for (let i = 0; i < inSize; i++) {
        pSize++;
        q = q.nextZ;
        if (q === null) break;
      }
      let qSize = inSize;
      while (pSize > 0 || (qSize > 0 && q !== null)) {
        let e: Node;
        if (pSize !== 0 && (qSize === 0 || q === null || p!.z <= q.z)) {
          e = p!;
          p = p!.nextZ;
          pSize--;
        } else {
          e = q!;
          q = q!.nextZ;
          qSize--;
        }
        if (tail !== null) tail.nextZ = e;
        else list = e;
        e.prevZ = tail;
        tail = e;
      }
      p = q;
    }
    tail!.nextZ = null;
    inSize *= 2;
  } while (numMerges > 1);
  return list!;
}

function zOrder(px: number, py: number, minX: number, minY: number, invSize: number): number {
  let x = ((px - minX) * invSize) | 0;
  let y = ((py - minY) * invSize) | 0;
  x = (x | (x << 8)) & 0x00ff00ff;
  x = (x | (x << 4)) & 0x0f0f0f0f;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;
  y = (y | (y << 8)) & 0x00ff00ff;
  y = (y | (y << 4)) & 0x0f0f0f0f;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;
  return x | (y << 1);
}

function getLeftmost(start: Node): Node {
  let p = start;
  let leftmost = start;
  do {
    if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
    p = p.next;
  } while (p !== start);
  return leftmost;
}

function pointInTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, px: number, py: number): boolean {
  return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
}

function isValidDiagonal(a: Node, b: Node): boolean {
  return (
    a.next.i !== b.i &&
    a.prev.i !== b.i &&
    !intersectsPolygon(a, b) &&
    ((locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && (area(a.prev, a, b.prev) !== 0 || area(a, b.prev, b) !== 0)) ||
      (equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0))
  );
}

function area(p: Node, q: Node, r: Node): number {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

function equals(p1: Node, p2: Node): boolean {
  return p1.x === p2.x && p1.y === p2.y;
}

function intersects(p1: Node, q1: Node, p2: Node, q2: Node): boolean {
  const o1 = sign(area(p1, q1, p2));
  const o2 = sign(area(p1, q1, q2));
  const o3 = sign(area(p2, q2, p1));
  const o4 = sign(area(p2, q2, q1));
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

function onSegment(p: Node, q: Node, r: Node): boolean {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

function sign(num: number): number {
  return num > 0 ? 1 : num < 0 ? -1 : 0;
}

function intersectsPolygon(a: Node, b: Node): boolean {
  let p = a;
  do {
    if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b)) return true;
    p = p.next;
  } while (p !== a);
  return false;
}

function locallyInside(a: Node, b: Node): boolean {
  return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

function middleInside(a: Node, b: Node): boolean {
  let p = a;
  let inside = false;
  const px = (a.x + b.x) / 2;
  const py = (a.y + b.y) / 2;
  do {
    if (p.y > py !== p.next.y > py && p.next.y !== p.y && px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x) inside = !inside;
    p = p.next;
  } while (p !== a);
  return inside;
}

// link two vertices with a bridge; a split leaves two polygons, a hole bridge one
function splitPolygon(a: Node, b: Node): Node {
  const a2 = new Node(a.i, a.x, a.y);
  const b2 = new Node(b.i, b.x, b.y);
  const an = a.next;
  const bp = b.prev;
  a.next = b;
  b.prev = a;
  a2.next = an;
  an.prev = a2;
  b2.next = a2;
  a2.prev = b2;
  bp.next = b2;
  b2.prev = bp;
  return b2;
}

function insertNode(i: number, x: number, y: number, last: Node | null): Node {
  const p = new Node(i, x, y);
  if (last !== null) {
    p.next = last.next;
    p.prev = last;
    last.next.prev = p;
    last.next = p;
  }
  return p;
}

function removeNode(p: Node): void {
  p.next.prev = p.prev;
  p.prev.next = p.next;
  if (p.prevZ !== null) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ !== null) p.nextZ.prevZ = p.prevZ;
}

function signedArea(data: ArrayLike<number>, start: number, end: number, dim: number): number {
  let sum = 0;
  for (let i = start, j = end - dim; i < end; i += dim) {
    sum += (data[j]! - data[i]!) * (data[i + 1]! + data[j + 1]!);
    j = i;
  }
  return sum;
}

// ---- the wrapper ----

/** One outline to triangulate: the outer ring and its holes, flagged by position. */
export interface Outline {
  readonly outer: Ring;
  readonly holes?: readonly Ring[];
}

export interface Triangulation {
  /** Every input vertex, outer ring first then each hole, outer counter-clockwise and holes clockwise, mm. */
  readonly points: readonly Vec2[];
  /** Ring start offsets into points: rings[k] starts at ringStarts[k]. */
  readonly ringStarts: readonly number[];
  /** Counter-clockwise index triples into points. */
  readonly triangles: Uint32Array;
  /** True when the triangle count is n + 2h - 2 (n vertices, h holes), the count of a cap with no vertex dropped. */
  readonly complete: boolean;
  /** Triangles whose doubled area is below DEGENERATE_AREA2, count. */
  readonly degenerate: number;
  /** Attempt that produced this result, 0 to ATTEMPTS - 1. */
  readonly attempt: number;
}

/** Rotation of the triangulated copy, radians, so rows of holes never share a support line (BOSS kernel.js triangulatePoly). */
export const ROTATION = 0.37;
/** Jitter half-amplitude on retries, mm: 0.1 micron, keyed on coordinates (mesh kernel record section 3). */
export const JITTER = 1e-4;
/** Rotation added per retry, radians; attempt k triangulates at ROTATION + k * ROTATION_STEP. */
export const ROTATION_STEP = 0.001;
/** Attempts before the last result is returned as it stands (BLOCKS kernel.js _prismPoly, tries < 14, lineage mesh.prism/blocks-1). */
export const ATTEMPTS = 14;
/** Doubled triangle area treated as zero, mm2 (BOSS kernel.js triangulatePoly). */
export const DEGENERATE_AREA2 = 1e-10;

function area2(ring: Ring): number {
  let s = 0;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) s += ring[j]![0] * ring[i]![1] - ring[i]![0] * ring[j]![1];
  return s;
}

/** Integer hash of a grid coordinate pair and attempt, in [-0.5, 0.5). Platform independent. */
function gridHash(x: number, y: number, attempt: number): number {
  let h = Math.imul(Math.round(x * MESH_GRID_PER_MM) | 0, 0x9e3779b1) ^ Math.imul(Math.round(y * MESH_GRID_PER_MM) | 0, 0x85ebca77) ^ Math.imul(attempt + 1, 0xc2b2ae3d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296 - 0.5;
}

function attemptOnce(points: readonly Vec2[], holeStarts: readonly number[], attempt: number, ringCount: number): Triangulation & { readonly ringStarts: readonly number[] } {
  // cos and sin of ROTATION + attempt * ROTATION_STEP from the committed table
  // (D-175): a one-ulp trig difference between engines would move the rotated
  // copy and could change which triangulation earcut returns.
  const c = EARCUT_ROTATION_TABLE[2 * attempt]!;
  const s = EARCUT_ROTATION_TABLE[2 * attempt + 1]!;
  const flat = new Float64Array(points.length * 2);
  points.forEach(([x, y], i) => {
    const jx = attempt > 0 ? 2 * JITTER * gridHash(x, y, attempt) : 0;
    const jy = attempt > 0 ? 2 * JITTER * gridHash(y, x, attempt) : 0;
    flat[2 * i] = x * c - y * s + jx;
    flat[2 * i + 1] = x * s + y * c + jy;
  });
  const raw = earcut(flat, holeStarts.length > 0 ? holeStarts : null, 2);
  const out = new Uint32Array(raw.length);
  let degenerate = 0;
  for (let t = 0; t < raw.length; t += 3) {
    const a = raw[t]!;
    const b = raw[t + 1]!;
    const d = raw[t + 2]!;
    const [ax, ay] = points[a]!;
    const [bx, by] = points[b]!;
    const [dx, dy] = points[d]!;
    const ar = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    if (Math.abs(ar) < DEGENERATE_AREA2) degenerate++;
    out[t] = a;
    if (ar >= 0) {
      out[t + 1] = b;
      out[t + 2] = d;
    } else {
      out[t + 1] = d;
      out[t + 2] = b;
    }
  }
  if (degenerate > 0) degenerate = flipDegenerate(points, out);
  const expect = points.length + 2 * (ringCount - 1) - 2;
  return { points, ringStarts: [0, ...holeStarts], triangles: out, complete: out.length / 3 === expect, degenerate, attempt };
}

const doubledArea = (points: readonly Vec2[], a: number, b: number, c: number): number => {
  const [ax, ay] = points[a]!;
  const [bx, by] = points[b]!;
  const [cx, cy] = points[c]!;
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
};

/**
 * Remove zero-area triangles in place by edge flips. Three vertices from
 * different rings on one line (hole tops in a row) give a triangle a, b, c
 * with b on the segment a to c. Flipping the long edge a to c with the
 * neighbour a, c, d gives a, b, d and b, c, d: no vertex is added and every
 * index still points at an original vertex. A run of zero-area triangles
 * on one line is unwound from the end that borders a proper triangle.
 * Returns the count left.
 */
function flipDegenerate(points: readonly Vec2[], tris: Uint32Array): number {
  const n = tris.length / 3;
  const key = (u: number, v: number): number => (u < v ? u * points.length + v : v * points.length + u);
  const isDegenerate = (t: number): boolean => Math.abs(doubledArea(points, tris[3 * t]!, tris[3 * t + 1]!, tris[3 * t + 2]!)) < DEGENERATE_AREA2;
  const set = (t: number, a: number, b: number, c: number): void => {
    const ccw = doubledArea(points, a, b, c) >= 0;
    tris[3 * t] = a;
    tris[3 * t + 1] = ccw ? b : c;
    tris[3 * t + 2] = ccw ? c : b;
  };
  for (let round = 0; round < 4 * n; round++) {
    const edges = new Map<number, number[]>();
    for (let t = 0; t < n; t++) {
      for (let k = 0; k < 3; k++) {
        const e = key(tris[3 * t + k]!, tris[3 * t + ((k + 1) % 3)]!);
        const list = edges.get(e);
        if (list === undefined) edges.set(e, [t]);
        else list.push(t);
      }
    }
    let flipped = false;
    for (let t = 0; t < n && !flipped; t++) {
      if (!isDegenerate(t)) continue;
      const v = [tris[3 * t]!, tris[3 * t + 1]!, tris[3 * t + 2]!];
      const len = (i: number): number => {
        const [x0, y0] = points[v[(i + 1) % 3]!]!;
        const [x1, y1] = points[v[(i + 2) % 3]!]!;
        return Math.hypot(x1 - x0, y1 - y0);
      };
      const mid = [0, 1, 2].reduce((m, i) => (len(i) > len(m) ? i : m), 0);
      const b = v[mid]!;
      const a = v[(mid + 1) % 3]!;
      const c = v[(mid + 2) % 3]!;
      const u = (edges.get(key(a, c)) ?? []).find((x) => x !== t);
      if (u === undefined) continue;
      const d = [tris[3 * u]!, tris[3 * u + 1]!, tris[3 * u + 2]!].find((x) => x !== a && x !== c);
      // a neighbour on the same line would give two zero-area triangles back; take it once its other side is fixed
      if (d === undefined || d === b || isDegenerate(u)) continue;
      set(t, a, b, d);
      set(u, b, c, d);
      flipped = true;
    }
    if (!flipped) break;
  }
  let left = 0;
  for (let t = 0; t < n; t++) if (isDegenerate(t)) left++;
  return left;
}

/**
 * Triangulate one outline for a cap. Which ring is a hole comes from its
 * position (outer first, then holes), never from its area sign: each ring is
 * reoriented, outer counter-clockwise and holes clockwise. Indices point at
 * the original vertices, so walls built from the same rings share them and
 * bridge edges never become geometry. Attempt 0 triangulates a rotated copy;
 * later attempts add a 0.1 micron jitter keyed on each vertex's grid
 * coordinates, so a vertex shared by two parts moves the same way in both.
 * A caller that checks more than the caps (BLOCKS _prismPoly audits the
 * whole shell, kernel.js line 265) passes accept: an attempt it rejects is
 * retried like a degenerate one, up to ATTEMPTS, and the last attempt is
 * returned either way.
 */
export function triangulate(outline: Outline, accept?: (t: Triangulation) => boolean): Triangulation {
  const rings: Ring[] = [outline.outer, ...(outline.holes ?? [])];
  const points: Vec2[] = [];
  const holeStarts: number[] = [];
  rings.forEach((ring, k) => {
    if (k > 0) holeStarts.push(points.length);
    const a = area2(ring);
    const flip = k === 0 ? a < 0 : a > 0;
    const oriented = flip ? [...ring].reverse() : ring;
    for (const p of oriented) points.push(p);
  });
  let best = attemptOnce(points, holeStarts, 0, rings.length);
  for (let attempt = 1; attempt < ATTEMPTS && (best.degenerate > 0 || !best.complete || (accept !== undefined && !accept(best))); attempt++) {
    best = attemptOnce(points, holeStarts, attempt, rings.length);
  }
  return best;
}
