/* geom.js: PIP geometry helpers on manifold-3d. Plain script; needs globalThis.MF (the
   initialised manifold module). Every manifold object created through these helpers or
   through patched prototype methods is tracked and freed by GEO.flush(). */
(function (G) {
  'use strict';
  const H = G.PIP = G.PIP || {};
  const GEO = H.GEO = {};
  let live = [];
  let patched = false;

  function patch() {
    if (patched) return;
    const M = G.MF;
    const skip = new Set(['constructor', 'delete', 'isDeleted', 'deleteLater', 'isAliasOf', 'toString', 'valueOf', 'toLocaleString', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable']);
    const wrapProto = (C) => {
      let P = C.prototype;
      const done = new Set();
      while (P && P !== Object.prototype) {
        for (const k of Object.getOwnPropertyNames(P)) {
          if (skip.has(k) || k.startsWith('_') || done.has(k)) continue;
          const d = Object.getOwnPropertyDescriptor(P, k);
          if (!d || typeof d.value !== 'function') continue;
          done.add(k);
          const f = d.value;
          if (f.__pip) continue;
          const w = function () { const r = f.apply(this, arguments); track(r); return r; };
          w.__pip = true;
          P[k] = w;
        }
        P = Object.getPrototypeOf(P);
      }
    };
    const wrapStatic = (C) => {
      for (const k of Object.getOwnPropertyNames(C)) {
        if (['length', 'name', 'prototype', 'reserveIDs'].includes(k)) continue;
        const f = C[k];
        if (typeof f !== 'function') continue;
        if (f.__pip) continue;
        const w = function () { const r = f.apply(this, arguments); track(r); return r; };
        w.__pip = true; C[k] = w;
      }
    };
    wrapProto(M.Manifold); wrapProto(M.CrossSection);
    wrapStatic(M.Manifold); wrapStatic(M.CrossSection);
    patched = true;
  }
  function track(r) {
    const M = G.MF;
    if (!r) return;
    if (r instanceof M.Manifold || r instanceof M.CrossSection) live.push(r);
    else if (Array.isArray(r)) for (const x of r) track(x);
  }
  GEO.init = function () { patch(); };
  // free everything created since the last flush, except objects in keep
  GEO.flush = function (keep) {
    const ks = new Set(keep || []);
    const next = [];
    for (const o of live) {
      if (ks.has(o)) { next.push(o); continue; }
      try { if (!o.isDeleted()) o.delete(); } catch (e) { /* already gone */ }
    }
    live = next;
  };
  GEO.liveCount = () => live.length;

  const CS = () => G.MF.CrossSection;
  const MN = () => G.MF.Manifold;
  GEO.CS = CS; GEO.MN = MN;

  const SEG = { n: 40 };
  GEO.SEG = SEG;
  function segsFor(r) { return Math.max(12, Math.min(96, Math.round(SEG.n * Math.sqrt(Math.max(r, 0.2) / 3)))); }
  GEO.segsFor = segsFor;

  GEO.empty2 = () => CS().ofPolygons([[]]);
  GEO.empty3 = () => MN().union([]);
  GEO.circle = (r, cx = 0, cy = 0, n) => {
    const k = n || segsFor(r);
    const pts = [];
    // half step rotation keeps vertices off shared support lines (earcut lesson)
    for (let i = 0; i < k; i++) { const a = (i + 0.5) / k * 2 * Math.PI; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return CS().ofPolygons([pts]);
  };
  GEO.rect = (x0, y0, x1, y1) => CS().ofPolygons([[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]]);
  GEO.rectC = (cx, cy, w, h, ang = 0) => {
    const c = Math.cos(ang), s = Math.sin(ang), pts = [];
    for (const [u, v] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) pts.push([cx + u * c - v * s, cy + u * s + v * c]);
    return CS().ofPolygons([pts]);
  };
  GEO.poly = (pts) => {
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return CS().ofPolygons([a < 0 ? pts.slice().reverse() : pts]);
  };
  GEO.union2 = (list) => { const l = list.filter(Boolean); return l.length ? CS().union(l) : GEO.empty2(); };
  GEO.union3 = (list) => { const l = list.filter(Boolean); return l.length ? MN().union(l) : GEO.empty3(); };
  GEO.ext = (cs, z0, z1) => {
    if (z1 - z0 <= 1e-6) return GEO.empty3();
    return cs.simplify(5e-4).extrude(z1 - z0).translate([0, 0, z0]);
  };
  // polyline stroke with round joints and caps: a thin spine polygon offset outward once,
  // so the outline comes from one Clipper offset instead of a union of near tangent capsules
  GEO.stroke = (pts, w) => {
    const e = 0.04, parts = [];
    const clean = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const q = clean[clean.length - 1]; if (Math.hypot(pts[i][0] - q[0], pts[i][1] - q[1]) > 1e-4) clean.push(pts[i]); }
    if (clean.length === 1) return GEO.circle(w / 2, clean[0][0], clean[0][1], segsFor(w / 2));
    for (let i = 1; i < clean.length; i++) {
      const a = clean[i - 1], b = clean[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      const ux = dx / L * e, uy = dy / L * e, nx = -uy, ny = ux;
      parts.push(GEO.poly([[a[0] - ux + nx, a[1] - uy + ny], [a[0] - ux - nx, a[1] - uy - ny], [b[0] + ux - nx, b[1] + uy - ny], [b[0] + ux + nx, b[1] + uy + ny]]));
    }
    return GEO.union2(parts).offset(w / 2 - e, 'Round', 2, segsFor(w / 2) + 8);
  };
  // lathe: profile [[r,z],...] closed polygon in the r>=0 half plane, revolved about z
  GEO.lathe = (prof, cx = 0, cy = 0, n) => {
    const k = n || 64;
    const pts = prof.map(p => [Math.max(0, p[0]), p[1]]);
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    const cs = CS().ofPolygons([a < 0 ? pts.slice().reverse() : pts]);
    return cs.revolve(k, 360).rotate([0, 0, 180 / k]).translate([cx, cy, 0]);
  };
  // annular sector shell between radii, angles in radians, z range
  GEO.sector = (cx, cy, r0, r1, a0, a1, n) => {
    const k = n || Math.max(6, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 32)));
    const pts = [];
    for (let i = 0; i <= k; i++) { const a = a0 + (a1 - a0) * i / k; pts.push([cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]); }
    for (let i = k; i >= 0; i--) { const a = a0 + (a1 - a0) * i / k; pts.push([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)]); }
    return GEO.poly(pts);
  };
  GEO.ring = (cx, cy, r0, r1) => GEO.circle(r1, cx, cy).subtract(GEO.circle(r0, cx, cy));

  // mesh out for export and viewer
  GEO.meshOf = (m) => {
    const mesh = m.getMesh();
    const np = mesh.numProp;
    const vp = mesh.vertProperties;
    const nv = vp.length / np;
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) { pos[3 * i] = vp[np * i]; pos[3 * i + 1] = vp[np * i + 1]; pos[3 * i + 2] = vp[np * i + 2]; }
    return { positions: pos, indices: new Uint32Array(mesh.triVerts), tris: mesh.triVerts.length / 3 };
  };
  GEO.bbox = (m) => { const b = m.boundingBox(); return { min: [b.min[0], b.min[1], b.min[2]], max: [b.max[0], b.max[1], b.max[2]] }; };

  // distance from point to polygon set (for keepout rasters), polys = array of [[x,y]...]
  GEO.segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  GEO.inPoly = (px, py, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  GEO.polysOf = (cs) => cs.toPolygons().map(p => p.map(q => Array.isArray(q) ? q : [q[0], q[1]]));
})(typeof globalThis !== 'undefined' ? globalThis : this);
