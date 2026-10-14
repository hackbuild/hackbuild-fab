/* kernel.js: exact prism geometry for BOSS. Plain script, works from file://.
 * Depends on globals: earcut (earcut@2.2.4 UMD), polygonClipping (polygon-clipping UMD).
 *
 * Polygon convention: a "mpoly" is polygon-clipping's MultiPolygon: [[outer, hole, hole], [outer, ...]].
 * Rings are arrays of [x, y]. Orientation is normalised by clean(): outer CCW, holes CW.
 *
 * Mesh: one filament slot, made of watertight prisms that may overlap each other (the slicer unions
 * them). Every prism is audited at build time: every undirected edge shared by exactly two faces.
 * Parts of different slots must never overlap; that is the caller's job (see boss.js Body).
 */
(function (root) {
  'use strict';
  const EC = root.earcut, PC = root.polygonClipping;
  if (!EC || !PC) throw new Error('kernel.js needs earcut and polygonClipping on the page');

  const TAU = Math.PI * 2;
  const EPSA = 1e-7; // area epsilon for degenerate rings

  // ---------- rings and polygons ----------
  function area(ring) {
    let a = 0;
    for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) a += (ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]);
    return a / 2;
  }
  function cleanRing(ring, tol) {
    tol = tol || 5e-6;
    const out = [];
    for (const p0 of ring) {
      const p = [Math.round(p0[0] * 1e6) / 1e6, Math.round(p0[1] * 1e6) / 1e6]; // snap to the writer's 6 decimal grid: what the validator sees is what we triangulate
      const q = out[out.length - 1];
      if (q && Math.abs(q[0] - p[0]) < tol && Math.abs(q[1] - p[1]) < tol) continue;
      out.push(p);
    }
    while (out.length > 1 && Math.abs(out[0][0] - out[out.length - 1][0]) < tol && Math.abs(out[0][1] - out[out.length - 1][1]) < tol) out.pop();
    // strip collinear midpoints (earcut skips them, which leaves wall T junctions against caps)
    let changed = true;
    while (changed && out.length > 3) {
      changed = false;
      for (let i = 0; i < out.length; i++) {
        const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length];
        const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
        if (Math.abs(cr) / l < 2e-5) { out.splice(i, 1); changed = true; break; }
      }
    }
    return out;
  }
  // normalise a polygon: outer CCW, holes CW, drop degenerate rings
  function cleanPoly(poly) {
    const rings = [];
    for (let i = 0; i < poly.length; i++) {
      const r = cleanRing(poly[i]);
      if (r.length < 3) { if (i === 0) return null; continue; }
      const a = area(r);
      if (Math.abs(a) < EPSA) { if (i === 0) return null; continue; }
      if (i === 0 ? a < 0 : a > 0) r.reverse();
      rings.push(r);
    }
    return rings.length ? rings : null;
  }
  function cleanMulti(mp) {
    const out = [];
    for (const p of (mp || [])) { const c = cleanPoly(p); if (c) out.push(c); }
    return out;
  }
  // constructors (all return mpoly)
  function circle(cx, cy, r, n, rot) {
    n = n || 48; rot = rot === undefined ? Math.PI / n : rot; // half step rotation: no vertex exactly on an axis line
    const ring = [];
    for (let i = 0; i < n; i++) { const t = rot + i * TAU / n; ring.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
    return [[ring]];
  }
  function rect(x0, y0, x1, y1) {
    if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { const t = y0; y0 = y1; y1 = t; }
    return [[[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]]];
  }
  function rectC(cx, cy, w, h) { return rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2); }
  function rrect(cx, cy, w, h, r, n) {
    n = n || 8; r = Math.min(r, w / 2, h / 2);
    if (r <= 0) return rectC(cx, cy, w, h);
    const ring = [];
    const cs = [[cx + w / 2 - r, cy + h / 2 - r, 0], [cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2], [cx - w / 2 + r, cy - h / 2 + r, Math.PI], [cx + w / 2 - r, cy - h / 2 + r, 3 * Math.PI / 2]];
    for (const [px, py, t0] of cs) for (let i = 0; i <= n; i++) { const t = t0 + i * (Math.PI / 2) / n; ring.push([px + r * Math.cos(t), py + r * Math.sin(t)]); }
    return [[ring]];
  }
  function polygon(pts) { return [[pts.map(p => [p[0], p[1]])]]; }
  function ring2(cx, cy, ro, ri, n) {
    return diff(circle(cx, cy, ro, n), circle(cx, cy, ri, n));
  }
  // polyline stroke: union of segment rectangles plus round joints (cap: 'round' | 'butt')
  function stroke(pts, w, cap, n) {
    n = n || 24; cap = cap || 'round';
    const hw = w / 2, parts = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      if (l < 1e-6) continue;
      const nx = -dy / l * hw, ny = dx / l * hw;
      parts.push([[[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]]]);
      if (i > 0) parts.push(circle(a[0], a[1], hw + 0.03, n)[0]); // 0.03 over: the joint circle crosses the rect edges instead of touching them, so the union has no pinch vertices
    }
    if (cap === 'round') { parts.push(circle(pts[0][0], pts[0][1], hw + 0.03, n)[0]); parts.push(circle(pts[pts.length - 1][0], pts[pts.length - 1][1], hw + 0.03, n)[0]); }
    return union.apply(null, parts.map(p => [p]));
  }
  // booleans (any number of mpolys)
  function union() {
    const args = Array.prototype.slice.call(arguments).filter(a => a && a.length);
    if (!args.length) return [];
    if (args.length === 1) return cleanMulti(args[0]);
    return cleanMulti(PC.union.apply(null, args));
  }
  function diff(a) {
    const args = Array.prototype.slice.call(arguments, 1).filter(b => b && b.length);
    if (!a || !a.length) return [];
    if (!args.length) return cleanMulti(a);
    return cleanMulti(PC.difference.apply(null, [a].concat(args)));
  }
  function intersect(a, b) { if (!a || !a.length || !b || !b.length) return []; return cleanMulti(PC.intersection(a, b)); }
  function mArea(mp) { let s = 0; for (const p of (mp || [])) for (let i = 0; i < p.length; i++) s += (i === 0 ? 1 : 1) * area(p[i]); return s; } // holes are CW so they subtract
  function translateM(mp, dx, dy) { return mp.map(p => p.map(r => r.map(q => [q[0] + dx, q[1] + dy]))); }
  function rotateM(mp, ang, cx, cy) {
    cx = cx || 0; cy = cy || 0; const c = Math.cos(ang), s = Math.sin(ang);
    return mp.map(p => p.map(r => r.map(q => { const x = q[0] - cx, y = q[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; })));
  }
  function mirrorXM(mp) { return cleanMulti(mp.map(p => p.map(r => r.map(q => [-q[0], q[1]])))); }
  // move every vertex of a ring 'd' away from the material side (outer rings CCW, holes CW: the right hand normal always points out of the material)
  const INSET = 1e-3; // 1 um: above the meshing nudge (2e-4) and the float32 boolean tolerance, 240x under a layer
  function insetRing(ring, d) {
    const n = ring.length, out = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = ring[(i + n - 1) % n], v = ring[i], c = ring[(i + 1) % n];
      let e1x = v[0] - a[0], e1y = v[1] - a[1], e2x = c[0] - v[0], e2y = c[1] - v[1];
      const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
      const n1x = e1y / l1, n1y = -e1x / l1, n2x = e2y / l2, n2y = -e2x / l2; // right hand normals
      let bx = n1x + n2x, by = n1y + n2y; const bl = Math.hypot(bx, by);
      if (bl < 1e-9) { bx = n1x; by = n1y; } else { bx /= bl; by /= bl; }
      const cosH = Math.max(0.3, bx * n1x + by * n1y);
      out[i] = [v[0] - d * bx / cosH, v[1] - d * by / cosH];
    }
    return out;
  }
  function bboxM(mp) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of mp) for (const q of p[0]) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    return [x0, y0, x1, y1];
  }
  function pointIn(mp, x, y) {
    let inside = false;
    for (const p of mp) {
      let inOuter = false;
      for (let k = 0; k < p.length; k++) {
        const r = p[k]; let c = false;
        for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
          if (((r[i][1] > y) !== (r[j][1] > y)) && (x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0])) c = !c;
        }
        if (k === 0) { inOuter = c; if (!c) break; } else if (c) { inOuter = false; break; }
      }
      if (inOuter) inside = true;
    }
    return inside;
  }

  // ---------- triangulation ----------
  function triangulatePoly(poly, jitterSeed) {
    // poly: cleaned rings. Returns index triples into the concatenated vertex list, CCW (positive area).
    const flat = [], holes = []; let off = 0;
    const rot = 0.37 + (jitterSeed || 0) * 0.001; // rotate a copy so rows of holes never share a support line
    const c = Math.cos(rot), s = Math.sin(rot);
    const h = (v, k) => { // per vertex hash jitter, tiny, deterministic
      if (!jitterSeed) return 0;
      let x = Math.sin(v * 12.9898 + k * 78.233) * 43758.5453; return (x - Math.floor(x) - 0.5) * 2e-6 * jitterSeed;
    };
    for (let k = 0; k < poly.length; k++) {
      if (k > 0) holes.push(off);
      for (const p of poly[k]) { flat.push(p[0] * c - p[1] * s + h(p[0], p[1]), p[0] * s + p[1] * c + h(p[1], p[0])); off++; }
    }
    const tri = EC(flat, holes.length ? holes : null, 2);
    const pts = []; for (let k = 0; k < poly.length; k++) for (const p of poly[k]) pts.push(p);
    const out = []; let zero = 0;
    for (let i = 0; i < tri.length; i += 3) {
      const a = tri[i], b = tri[i + 1], d = tri[i + 2];
      const pa = pts[a], pb = pts[b], pd = pts[d];
      const ar = (pb[0] - pa[0]) * (pd[1] - pa[1]) - (pb[1] - pa[1]) * (pd[0] - pa[0]);
      // the writer rounds to 6 decimals: test the triangle exactly as the validator will see it. never dropped (that opens the shell), the caller retries
      if (Math.abs(ar) < 1e-10) zero++; // vertices are on the 6 decimal grid already, so a nonzero area here stays nonzero in the file
      if (ar >= 0) out.push(a, b, d); else out.push(a, d, b);
    }
    // Euler check: a polygon with h holes and n vertices triangulates to n + 2h - 2 triangles
    const expect = pts.length + 2 * (poly.length - 1) - 2;
    return { tri: out, n: pts.length, pts, zero, complete: out.length / 3 === expect };
  }

  // ---------- Mesh ----------
  class Mesh {
    constructor(name, slot) {
      this.name = name; this.slot = slot; // slot: 1 based filament index
      this.pos = []; this.idx = []; this.prisms = []; // prisms: {mp, z0, z1, kind} for the net checker
      this.nshells = 0; this.warnings = [];
    }
    get tris() { return this.idx.length / 3; }
    _addShell(pos, idx) {
      const base = this.pos.length / 3;
      for (let i = 0; i < pos.length; i++) this.pos.push(pos[i]);
      for (let i = 0; i < idx.length; i++) this.idx.push(idx[i] + base);
      this.nshells++;
    }
    // extrude an mpoly from z0 to z1. Each polygon becomes its own closed shell.
    prism(mp, z0, z1, opts) {
      opts = opts || {};
      if (z1 <= z0 + 1e-9) return this;
      let polys = cleanMulti(mp);
      if (opts.shrink) {
        // insert epsilon: 10 ppm homothety about each polygon's bbox centre plus 10 nm off each end face, so a face shared
        // with the matrix mesh is never exactly coplanar (exact coplanar faces read as sliver overlaps in float32 booleans)
        polys = polys.map(poly => poly.map(ring => insetRing(ring, INSET)));
        z0 += INSET; z1 -= INSET;
      }
      for (const poly of polys) this._prismPoly(poly, z0, z1, opts.axis || 'z');
      if (opts.record !== false) this.prisms.push({ mp: polys, z0, z1, kind: opts.kind || 'prism' });
      return this;
    }
    _prismPoly(poly, z0, z1, axis) {
      let t = null, ok = false, tries = 0;
      const n = poly.reduce((s, r) => s + r.length, 0);
      const pos = new Array(n * 6), idx = [];
      for (tries = 0; tries < 6 && !ok; tries++) {
        idx.length = 0;
        if (tries >= 3) { // physical nudge, 0.2 um, invisible to the printer: breaks true collinear triples
          const hs = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233 + tries * 3.7) * 43758.5453; return (x - Math.floor(x) - 0.5) * 4e-4; }; // per position hash: rows of identical holes get different nudges
          poly = poly.map((r, k) => r.map((p, i) => [p[0] + hs(p[0], p[1] + k), p[1] + hs(p[1], p[0] - k)]));
        }
        t = triangulatePoly(poly, tries);
        if ((t.zero || !t.complete) && tries < 5) continue;
        if (t.zero || !t.complete) this.warnings.push('cap triangulation degenerate after retries (' + t.zero + ' slivers, kept): ' + this.name);
        // vertices: ring vertices at z0 then at z1
        let k = 0;
        for (const p of t.pts) { pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = z0; pos[(k + n) * 3] = p[0]; pos[(k + n) * 3 + 1] = p[1]; pos[(k + n) * 3 + 2] = z1; k++; }
        // top cap CCW (as produced), bottom cap reversed
        for (let i = 0; i < t.tri.length; i += 3) { idx.push(t.tri[i] + n, t.tri[i + 1] + n, t.tri[i + 2] + n); idx.push(t.tri[i], t.tri[i + 2], t.tri[i + 1]); }
        // walls: rings are outer CCW, holes CW, so the same quad formula faces outward for both
        let off = 0;
        for (const r of poly) {
          const m = r.length;
          for (let i = 0; i < m; i++) {
            const a = off + i, b = off + (i + 1) % m;
            idx.push(a, b, b + n); idx.push(a, b + n, a + n);
          }
          off += m;
        }
        ok = auditIndexed(idx, n * 2).ok;
        if (!ok && tries === 5) this.warnings.push('prism not manifold after retries: ' + this.name);
      }
      if (axis === 'x') { for (let i = 0; i < pos.length; i += 3) { const x = pos[i], y = pos[i + 1], z = pos[i + 2]; pos[i] = z; pos[i + 1] = x; pos[i + 2] = y; } }
      else if (axis === 'y') { for (let i = 0; i < pos.length; i += 3) { const x = pos[i], y = pos[i + 1], z = pos[i + 2]; pos[i] = y; pos[i + 1] = z; pos[i + 2] = x; } }
      // axis mapping (x: local (u,v,w) -> (w,u,v)) is a cyclic permutation, orientation preserved
      this._addShell(pos, idx);
    }
    // revolve a closed profile [[r,z],...] (r >= 0) about the vertical axis through (cx,cy), n segments
    revolve(profile, cx, cy, n, opts) {
      opts = opts || {}; n = n || 48;
      let prof = cleanRing(profile);
      if (opts.shrink) { let zl = Infinity, zh = -Infinity; for (const q of prof) { zl = Math.min(zl, q[1]); zh = Math.max(zh, q[1]); } const zc = (zl + zh) / 2; prof = prof.map(q => [Math.max(0, q[0] - INSET), zc + (q[1] - zc) * (1 - 2 * INSET / Math.max(1e-9, zh - zl))]); }
      if (area(prof) < 0) prof.reverse();
      const m = prof.length;
      const pos = [], idx = [];
      const vid = []; // per profile vertex: array of n indices or single pole index
      for (let i = 0; i < m; i++) {
        const [r, z] = prof[i];
        if (r < 1e-6) { vid.push([pos.length / 3]); pos.push(cx, cy, z); }
        else { const arr = []; for (let k = 0; k < n; k++) { const t = k * TAU / n + Math.PI / n; arr.push(pos.length / 3); pos.push(cx + r * Math.cos(t), cy + r * Math.sin(t), z); } vid.push(arr); }
      }
      for (let i = 0; i < m; i++) {
        const j = (i + 1) % m, A = vid[i], B = vid[j];
        if (A.length === 1 && B.length === 1) continue; // edge on the axis
        for (let k = 0; k < n; k++) {
          const k2 = (k + 1) % n;
          if (A.length === 1) idx.push(A[0], B[k2], B[k]);
          else if (B.length === 1) idx.push(A[k], A[k2], B[0]);
          else { idx.push(A[k], A[k2], B[k2]); idx.push(A[k], B[k2], B[k]); }
        }
      }
      if (signedVolume(pos, idx) < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
      const au = auditIndexed(idx, pos.length / 3); if (!au.ok) this.warnings.push('revolve not manifold: ' + this.name + ' ' + au.bad);
      this._addShell(pos, idx);
      let rmax = 0, z0 = Infinity, z1 = -Infinity; for (const [r, z] of prof) { rmax = Math.max(rmax, r); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      if (opts.record !== false) this.prisms.push({ mp: circle(cx, cy, rmax, n), z0, z1, kind: opts.kind || 'revolve' });
      return this;
    }
    // frustum cylinder helper
    cyl(cx, cy, r0, r1, z0, z1, n) { return this.revolve([[0, z0], [r0, z0], [r1, z1], [0, z1]], cx, cy, n); }
    merge(other) { this._addShell(other.pos, other.idx); this.prisms.push.apply(this.prisms, other.prisms); this.nshells += other.nshells - 1; this.warnings.push.apply(this.warnings, other.warnings); return this; }
    transform(fn) { // fn(x,y,z) -> [x,y,z]; flips winding if det < 0 (detected by volume sign)
      const p = this.pos; for (let i = 0; i < p.length; i += 3) { const q = fn(p[i], p[i + 1], p[i + 2]); p[i] = q[0]; p[i + 1] = q[1]; p[i + 2] = q[2]; }
      if (signedVolume(this.pos, this.idx) < 0) for (let i = 0; i < this.idx.length; i += 3) { const t = this.idx[i + 1]; this.idx[i + 1] = this.idx[i + 2]; this.idx[i + 2] = t; }
      return this;
    }
    translate(dx, dy, dz) { const p = this.pos; for (let i = 0; i < p.length; i += 3) { p[i] += dx; p[i + 1] += dy; p[i + 2] += dz; } for (const pr of this.prisms) { pr.mp = translateM(pr.mp, dx, dy); pr.z0 += dz; pr.z1 += dz; } return this; }
    rotateZ(ang, cx, cy) { const c = Math.cos(ang), s = Math.sin(ang); cx = cx || 0; cy = cy || 0; return this.transform((x, y, z) => { x -= cx; y -= cy; return [cx + x * c - y * s, cy + x * s + y * c, z]; }); }
    flipZ(zTop) { return this.transform((x, y, z) => [x, y, zTop - z]); } // print pose: upside down
    bounds() {
      const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; const p = this.pos;
      for (let i = 0; i < p.length; i += 3) { for (let k = 0; k < 3; k++) { if (p[i + k] < b[k]) b[k] = p[i + k]; if (p[i + k] > b[k + 3]) b[k + 3] = p[i + k]; } }
      return b;
    }
    volume() { return signedVolume(this.pos, this.idx); }
    typed() { return { name: this.name, slot: this.slot, positions: new Float32Array(this.pos), indices: new Uint32Array(this.idx) }; }
    clone() { const m = new Mesh(this.name, this.slot); m.pos = this.pos.slice(); m.idx = this.idx.slice(); m.prisms = this.prisms.map(p => ({ mp: p.mp, z0: p.z0, z1: p.z1, kind: p.kind })); m.nshells = this.nshells; m.warnings = this.warnings.slice(); return m; }
    // full audit with vertex merge, the way a slicer sees it
    audit(tol) { return auditMerged(this.pos, this.idx, tol || 1e-4); }
  }

  function signedVolume(pos, idx) {
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    return v / 6;
  }
  function auditIndexed(idx, nv) {
    const cnt = new Map(); let bad = 0, dir = 0;
    const dirSet = new Set();
    for (let i = 0; i < idx.length; i += 3) {
      const t = [idx[i], idx[i + 1], idx[i + 2]];
      if (t[0] === t[1] || t[1] === t[2] || t[0] === t[2]) { bad++; continue; }
      for (let k = 0; k < 3; k++) {
        const a = t[k], b = t[(k + 1) % 3];
        const key = a < b ? a * nv + b : b * nv + a;
        cnt.set(key, (cnt.get(key) || 0) + 1);
        const dk = a * nv + b; if (dirSet.has(dk)) dir++; dirSet.add(dk);
      }
    }
    for (const v of cnt.values()) if (v !== 2) bad++;
    return { ok: bad === 0 && dir === 0, bad, dir };
  }
  function auditMerged(pos, idx, tol) {
    const key = new Map(); const remap = new Int32Array(pos.length / 3); let nv = 0;
    const q = 1 / tol;
    for (let i = 0; i < pos.length / 3; i++) {
      const k = Math.round(pos[i * 3] * q) + ',' + Math.round(pos[i * 3 + 1] * q) + ',' + Math.round(pos[i * 3 + 2] * q);
      let id = key.get(k); if (id === undefined) { id = nv++; key.set(k, id); } remap[i] = id;
    }
    const m = new Uint32Array(idx.length); for (let i = 0; i < idx.length; i++) m[i] = remap[idx[i]];
    const r = auditIndexed(m, nv); r.vertsMerged = pos.length / 3 - nv; r.volume = signedVolume(pos, idx);
    return r;
  }

  // ---------- net checker: union find over conductive prisms ----------
  function zOverlap(a, b, tol) { return a.z0 <= b.z1 + tol && b.z0 <= a.z1 + tol; }
  function netCheck(meshes, taps, opts) {
    // meshes: Mesh[] of conductive slots. taps: [{name, x, y, z}] declared terminals.
    // returns {nets: [[tapNames]], nodeOf: name -> net index, count}
    opts = opts || {}; const tol = opts.tol === undefined ? 0.02 : opts.tol;
    const items = [];
    for (const m of meshes) for (const p of m.prisms) items.push({ m, p, bb: bboxM(p.mp) });
    const parent = items.map((_, i) => i);
    const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      if (!zOverlap(A.p, B.p, tol)) continue;
      if (A.bb[2] < B.bb[0] - 1e-6 || B.bb[2] < A.bb[0] - 1e-6 || A.bb[3] < B.bb[1] - 1e-6 || B.bb[3] < A.bb[1] - 1e-6) continue;
      const inter = intersect(A.p.mp, B.p.mp);
      if (mArea(inter) > 1e-4) join(i, j);
    }
    const tapNet = {};
    for (const t of taps) {
      let hit = -1;
      for (let i = 0; i < items.length && hit < 0; i++) {
        const P = items[i].p; if (t.z < P.z0 - tol || t.z > P.z1 + tol) continue;
        if (pointIn(P.mp, t.x, t.y)) hit = find(i);
      }
      tapNet[t.name] = hit;
    }
    const groups = {};
    for (const t of taps) { const k = tapNet[t.name]; (groups[k] = groups[k] || []).push(t.name); }
    return { tapNet, groups, roots: new Set(items.map((_, i) => find(i))).size };
  }

  // per z band pairwise overlap between different slots (area based, fast sanity check)
  function crossSlotOverlap(meshes) {
    const hits = [];
    for (let i = 0; i < meshes.length; i++) for (let j = i + 1; j < meshes.length; j++) {
      const A = meshes[i], B = meshes[j]; if (A.slot === B.slot) continue;
      for (const pa of A.prisms) for (const pb of B.prisms) {
        if (!(pa.z0 < pb.z1 - 0.005 && pb.z0 < pa.z1 - 0.005)) continue;
        const inter = intersect(pa.mp, pb.mp); const ar = mArea(inter);
        if (ar > 1e-3) hits.push({ a: A.name, b: B.name, area: ar, z: [Math.max(pa.z0, pb.z0), Math.min(pa.z1, pb.z1)] });
      }
    }
    return hits;
  }

  root.K = { TAU, area, cleanRing, cleanPoly, cleanMulti, circle, rect, rectC, rrect, polygon, ring2, stroke, union, diff, intersect, mArea, translateM, rotateM, mirrorXM, bboxM, pointIn, triangulatePoly, Mesh, signedVolume, auditIndexed, auditMerged, netCheck, crossSlotOverlap };
})(typeof globalThis !== 'undefined' ? globalThis : this);
