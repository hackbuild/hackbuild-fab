/* boss.js: the BOSS brick standard and the shared builders. Needs kernel.js (K). */
(function (root) {
  'use strict';
  const K = root.K;
  const L = 0.24; // layer height everything vertical snaps to
  const snap = (z, up) => (up ? Math.ceil(z / L - 1e-6) : Math.round(z / L)) * L;

  // ---------- the standard ----------
  // LEGO compatible: 8 mm pitch, 4.8 studs, 1.8 tall, plate 3.2, brick 9.6.
  // BOSS column stack (z from the bed): socket ring, flange, post through the body, stud on top.
  const STD = {
    P: 8.0, studD: 4.8, studH: 1.8, plateH: 3.2, brickH: 9.6,
    sockH: 2.4,        // socket ring height (a 1.8 stud plus 0.6 headroom)
    sockID_flex: 4.6,  // conductive TPU ring: 0.2 interference on a 4.8 stud, the TPU stretches
    sockID_rigid: 5.0, // PETG ring: prints about 4.85, a locate fit on a 4.8 stud
    sockOD: 6.6,       // 1.4 mm of PETG between neighbouring rings at 8 mm pitch
    flangeH: 0.72,     // conductive disc on the ring: contact face and mechanical lock
    postD: 3.0,        // through post
    padW: 1.8, boreD: 0.9, boreInPad: 1.2,   // press mode pin contact: 0.64 square pin in a 0.9 bore (prints about 0.75)
    L1: 3.36, traceT: 0.72, gapT: 0.48,       // L1 3.36..4.08, PETG 4.08..4.56, L2 4.56..5.28
    traceW: 1.0, clr: 0.6, cell: 0.4,
    voidID_plain: 5.0
  };
  STD.L2 = STD.L1 + STD.traceT + STD.gapT;
  STD.padTop = STD.L2 + STD.traceT; // 5.28: pads span both trace layers

  // filament slots, by role. Colours are the hack.build set; cTPU is drawn dark grey so it reads apart from cPLA.
  const SLOTS = [
    { id: 1, role: 'structure', name: 'PETG', type: 'PETG', color: '#f5f0e6', rho: 0 },
    { id: 2, role: 'conductor', name: 'conductive PLA', type: 'PLA', color: '#1a1a1a', rho: 30 },      // ohm cm, Protopasta in plane
    { id: 3, role: 'flex', name: 'TPU 95A', type: 'TPU', color: '#FE0386', rho: 0 },
    { id: 4, role: 'flex conductor', name: 'conductive TPU', type: 'TPU', color: '#4a4a4a', rho: 1500 } // ohm cm, Eel class
  ];
  const S = { PETG: 1, CPLA: 2, TPU: 3, CTPU: 4, VOID: 0 };
  const isCond = slot => slot === S.CPLA || slot === S.CTPU;

  // resistance of a bar: rho ohm cm, length mm, area mm2
  const barR = (rho, len, area) => (rho * 10) * len / area; // ohm cm -> ohm mm

  // ---------- Body: negative space builder ----------
  // features are (slot, mpoly, z0, z1). PETG = outline minus every feature per z band. Slot 0 = void.
  class Body {
    constructor(name, outline, z0, z1) { this.name = name; this.outline = outline; this.z0 = z0; this.z1 = z1; this.feats = []; this.extra = []; this.taps = []; this.notes = []; this.fits = []; }
    feature(slot, mp, z0, z1, tag) { if (mp && mp.length && z1 > z0 + 1e-9) this.feats.push({ slot, mp, z0, z1, tag: tag || '' }); return this; }
    // a prism that lives outside the body outline or z range (studs on top, strap tails). Same slot rules.
    outside(slot, mp, z0, z1, tag) { if (mp && mp.length && z1 > z0 + 1e-9) this.extra.push({ slot, mp, z0, z1, tag: tag || '' }); return this; }
    tap(name, x, y, z) { this.taps.push({ name, x, y, z }); return this; }
    fit(label, value, lo, hi, unit) { this.fits.push({ label, value, lo, hi, unit: unit || 'mm', ok: value >= lo - 1e-9 && value <= hi + 1e-9 }); return this; }
    note(s) { this.notes.push(s); return this; }
    // returns {meshes: {slot: Mesh}, errors}
    build(prefix) {
      prefix = prefix || this.name;
      const meshes = {}; const errors = [];
      const get = slot => meshes[slot] || (meshes[slot] = new K.Mesh(prefix + ' ' + (SLOTS[slot - 1] ? SLOTS[slot - 1].name : 's' + slot), slot));
      // cross slot overlap check on features (different non void slots must not overlap in xy within a shared z band)
      const all = this.feats.concat(this.extra);
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a.slot === b.slot || a.slot === 0 || b.slot === 0) continue;
        if (!(a.z0 < b.z1 - 0.005 && b.z0 < a.z1 - 0.005)) continue;
        const ar = K.mArea(K.intersect(a.mp, b.mp));
        if (ar > 1e-3) errors.push('overlap ' + a.tag + ' (slot ' + a.slot + ') with ' + b.tag + ' (slot ' + b.slot + ') ' + ar.toFixed(2) + ' mm2');
      }
      // PETG bands
      const zs = new Set([this.z0, this.z1]);
      for (const f of this.feats) { if (f.z0 > this.z0 && f.z0 < this.z1) zs.add(f.z0); if (f.z1 > this.z0 && f.z1 < this.z1) zs.add(f.z1); }
      const zl = Array.from(zs).sort((a, b) => a - b);
      for (let i = 0; i + 1 < zl.length; i++) if (zl[i + 1] - zl[i] < 0.015) errors.push('z breakpoints ' + zl[i].toFixed(3) + ' and ' + zl[i + 1].toFixed(3) + ' are closer than the band overlap');
      const petg = get(S.PETG);
      for (let i = 0; i + 1 < zl.length; i++) {
        const za = zl[i], zb = zl[i + 1], zm = (za + zb) / 2;
        const zlo = i === 0 ? za : za - 0.013; // the band overlaps the one below, so any feature alive in that overlap zone is cut out too (no cross slot overlap)
        const cut = this.feats.filter(f => f.z0 < zb - 1e-6 && f.z1 > zlo + 1e-6).map(f => f.mp);
        let mp = this.outline;
        if (cut.length) mp = K.diff(this.outline, K.union.apply(null, cut));
        if (!mp.length) continue;
        petg.prism(mp, i === 0 ? za : za - 0.013, zb, { kind: 'body' });
      }
      // features into their slot meshes (voids are not meshed)
      for (const f of this.feats.concat(this.extra)) {
        if (f.slot === 0) continue;
        get(f.slot).prism(f.mp, f.z0, f.z1, { kind: f.tag, shrink: f.slot !== S.PETG });
      }
      // top stud prisms of PETG that sit above z1 are 'extra' with slot 1; they overlap the body by 0.02 (caller)
      for (const m of Object.values(meshes)) for (const w of m.warnings) errors.push(w);
      return { meshes, errors };
    }
  }

  // ---------- column stack ----------
  // a conductive through column at (cx, cy): cTPU socket ring at the bottom, cPLA flange + post + stud.
  // opts: {stud: true, socket: true, top: z of the body top, name, ringSlot}
  function column(body, cx, cy, o) {
    o = o || {};
    const top = o.top === undefined ? body.z1 : o.top;
    const n = 48, rid = o.ringSlot || S.CTPU;
    const idFlex = o.sockID || STD.sockID_flex;
    if (o.socket !== false) {
      body.feature(rid, K.ring2(cx, cy, STD.sockOD / 2, idFlex / 2, n), 0, STD.sockH, 'socket ' + (o.name || ''));
      body.feature(S.VOID, K.circle(cx, cy, idFlex / 2, n), 0, STD.sockH, 'socket void');
      body.feature(S.CPLA, K.circle(cx, cy, STD.sockOD / 2, n), STD.sockH, STD.sockH + STD.flangeH, 'flange ' + (o.name || ''));
    }
    const z0 = o.socket !== false ? STD.sockH + STD.flangeH - 0.02 : (o.postZ0 === undefined ? STD.L1 : o.postZ0);
    const studOn = o.stud !== false;
    const postTop = studOn ? top : (o.postTop === undefined ? STD.padTop : o.postTop);
    body.feature(S.CPLA, K.circle(cx, cy, STD.postD / 2, n), z0, postTop, 'post ' + (o.name || ''));
    if (studOn) { body.outside(S.CPLA, K.circle(cx, cy, STD.postD / 2, n), top - 0.02, top + 0.02, 'post tip'); body.outside(S.CPLA, K.circle(cx, cy, STD.studD / 2, n), top, top + STD.studH, 'stud ' + (o.name || '')); }
    if (o.name) { body.tap(o.name, cx, cy, postTop - 0.5); if (o.socket !== false) body.tap(o.name + '.sock', cx + (STD.sockOD + idFlex) / 4, cy, STD.sockH / 2); }
    return body;
  }
  // a plain (insulating) column: PETG socket void at the bottom and a PETG stud on top
  function plainColumn(body, cx, cy, o) {
    o = o || {}; const top = o.top === undefined ? body.z1 : o.top; const n = 48;
    if (o.socket !== false) body.feature(S.VOID, K.circle(cx, cy, STD.voidID_plain / 2, n), 0, STD.sockH, 'plain socket void');
    if (o.stud !== false) body.outside(S.PETG, K.circle(cx, cy, STD.studD / 2, n), top - 0.02, top + STD.studH, 'plain stud');
    return body;
  }
  // press mode pin contact pad at (cx,cy): cPLA block spanning both trace layers, bore in its upper part
  function pinPad(body, cx, cy, name) {
    const n = 24;
    const sq = K.rectC(cx, cy, STD.padW, STD.padW);
    body.feature(S.CPLA, sq, STD.L1, STD.padTop, 'pad ' + name);
    body.feature(S.CPLA, K.diff(sq, K.circle(cx, cy, STD.boreD / 2, n)), STD.padTop - 0.02, STD.padTop + STD.boreInPad, 'pad bore ' + name);
    body.feature(S.VOID, K.circle(cx, cy, STD.boreD / 2, n), STD.padTop, body.z1 + 1, 'pin bore ' + name);
    body.tap(name, cx, cy, STD.L1 + 0.3);
    return body;
  }

  // ---------- router ----------
  // A* on a 0.4 mm grid, two layers, traces 1.0 wide with 0.6 clearance. Obstacles: circles and rects.
  // nets: [{name, a:[x,y], b:[x,y], own:[obstacle indices this net may enter]}]
  function route(cfg) {
    const cell = cfg.cell || STD.cell, w = cfg.traceW || STD.traceW, clr = cfg.clr === undefined ? STD.clr : cfg.clr;
    const x0 = cfg.x0, y0 = cfg.y0, nx = Math.ceil((cfg.x1 - x0) / cell), ny = Math.ceil((cfg.y1 - y0) / cell);
    const nl = cfg.layers || 2;
    const d = clr + w / 2;              // obstacle dilation
    const dt = w + clr;                 // trace to trace centre spacing block radius
    const grids = []; for (let l = 0; l < nl; l++) grids.push(new Uint8Array(nx * ny));
    const ownMask = new Uint8Array(nx * ny);
    const cx = i => x0 + (i + 0.5) * cell, cy = j => y0 + (j + 0.5) * cell;
    const stampShape = (g, ob, dil, val) => {
      if (ob.shape === 'circle') {
        const r = ob.r + dil, i0 = Math.max(0, Math.floor((ob.cx - r - x0) / cell)), i1 = Math.min(nx - 1, Math.ceil((ob.cx + r - x0) / cell));
        const j0 = Math.max(0, Math.floor((ob.cy - r - y0) / cell)), j1 = Math.min(ny - 1, Math.ceil((ob.cy + r - y0) / cell));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = cx(i) - ob.cx, dy = cy(j) - ob.cy; if (dx * dx + dy * dy <= r * r) g[j * nx + i] = val; }
      } else {
        const i0 = Math.max(0, Math.floor((ob.x0 - dil - x0) / cell)), i1 = Math.min(nx - 1, Math.ceil((ob.x1 + dil - x0) / cell));
        const j0 = Math.max(0, Math.floor((ob.y0 - dil - y0) / cell)), j1 = Math.min(ny - 1, Math.ceil((ob.y1 + dil - y0) / cell));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const px = cx(i), py = cy(j); if (px >= ob.x0 - dil && px <= ob.x1 + dil && py >= ob.y0 - dil && py <= ob.y1 + dil) g[j * nx + i] = val; }
      }
    };
    const obs = cfg.obstacles || [];
    // static grid per layer: border keep-out, keep-in region
    const base = []; for (let l = 0; l < nl; l++) base.push(new Uint8Array(nx * ny));
    const bk = Math.ceil(d / cell);
    for (const g of base) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (i < bk || j < bk || i >= nx - bk || j >= ny - bk) g[j * nx + i] = 1;
    if (cfg.keepIn) { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (!K.pointIn(cfg.keepIn, cx(i), cy(j))) for (const g of base) g[j * nx + i] = 1; }
    // per obstacle stamps cached (dilated) so per net grids are cheap to assemble
    const obStamp = obs.map(ob => { const g = new Uint8Array(nx * ny); stampShape(g, ob, d, 1); const cells = []; for (let k = 0; k < g.length; k++) if (g[k]) cells.push(k); return { cells, layers: ob.layers || null }; });
    const toCell = p => [Math.min(nx - 1, Math.max(0, Math.round((p[0] - x0) / cell - 0.5))), Math.min(ny - 1, Math.max(0, Math.round((p[1] - y0) / cell - 0.5)))];
    const nets = (cfg.nets || []).map((n, i) => ({ n, i, len: Math.abs(n.a[0] - n.b[0]) + Math.abs(n.a[1] - n.b[1]) }));
    nets.sort((p, q) => p.len - q.len); // shortest first: short traces claim the lanes next to the pads, long ones route around them
    const bendCost = cfg.bendCost === undefined ? 4 : cfg.bendCost;
    // committed routes: per net index, the layer and the stamped cell list
    const committed = new Map();
    const traceGrid = []; const owner = []; for (let l = 0; l < nl; l++) { traceGrid.push(new Uint8Array(nx * ny)); owner.push(new Int16Array(nx * ny).fill(-1)); }
    const rr = Math.ceil(dt / cell), r2 = (dt / cell) * (dt / cell);
    const stampCells = (cells) => { const out = []; const seen = new Uint8Array(nx * ny); for (const [i, j] of cells) for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) { if (di * di + dj * dj > r2) continue; const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < ny) { const k = jj * nx + ii; if (!seen[k]) { seen[k] = 1; out.push(k); } } } return out; };
    const rebuildTraces = () => { for (let l = 0; l < nl; l++) { traceGrid[l].fill(0); owner[l].fill(-1); } for (const [idx, c] of committed) for (const k of c.stamp) { traceGrid[c.layer][k] = 1; owner[c.layer][k] = idx; } };
    const gridFor = (n, l, withTraces) => {
      const g = base[l].slice();
      const own = new Set(n.own || []);
      obStamp.forEach((st, oi) => { if (own.has(oi)) return; if (st.layers && !st.layers.includes(l)) return; for (const k of st.cells) g[k] = 1; });
      if (withTraces) { const t = traceGrid[l]; for (let k = 0; k < g.length; k++) if (t[k]) g[k] = 1; }
      return g;
    };
    const tryNet = (n, soft) => {
      let best = null;
      const order = [0, 1].slice(0, nl); if (n.prefer) order.reverse();
      for (const l of order) {
        if (n.layer !== undefined && n.layer !== l) continue;
        const g = gridFor(n, l, !soft);
        const s = toCell(n.a), t = toCell(n.b);
        const p = astar(g, soft ? traceGrid[l] : null, nx, ny, s, t, bendCost, soft ? 60 : 0);
        if (p && (!best || p.cost < best.cost)) best = { layer: l, cells: p.cells, cost: p.cost };
        if (p && n.prefer !== undefined && !soft) break; // preferred layer found: take it
      }
      return best;
    };
    const commit = (idx, n, best) => { committed.set(idx, { n, layer: best.layer, cells: best.cells, stamp: stampCells(best.cells) }); for (const k of committed.get(idx).stamp) { traceGrid[best.layer][k] = 1; owner[best.layer][k] = idx; } };
    const failed = [];
    let rips = 0; const maxRips = cfg.maxRips === undefined ? 60 : cfg.maxRips;
    const queue = nets.slice();
    while (queue.length) {
      const { n, i: idx } = queue.shift();
      let best = tryNet(n, false);
      if (!best && n.prefer !== undefined) { const m = Object.assign({}, n); delete m.prefer; best = tryNet(m, false); }
      if (best) { commit(idx, n, best); continue; }
      // rip up: route through committed traces at a cost, rip whatever the path crosses, then reroute those
      if (rips < maxRips) {
        const m = Object.assign({}, n); delete m.prefer;
        const sb = tryNet(m, true);
        if (sb) {
          const victims = new Set(); for (const [ci, cj] of sb.cells) { const o = owner[sb.layer][cj * nx + ci]; if (o >= 0 && o !== idx) victims.add(o); }
          for (const v of victims) committed.delete(v);
          rebuildTraces();
          commit(idx, n, sb);
          for (const v of victims) { rips++; const ent = nets.find(e => e.i === v); if (ent) queue.push(ent); }
          continue;
        }
      }
      failed.push(n.name);
    }
    const results = [];
    for (const [idx, c] of committed) {
      const n = c.n; const pts = [[n.a[0], n.a[1]]];
      let prev = null, dir = null;
      for (let k = 0; k < c.cells.length; k++) {
        const cc = c.cells[k], p = [cx(cc[0]), cy(cc[1])];
        if (prev) { const nd = [Math.sign(p[0] - prev[0]), Math.sign(p[1] - prev[1])]; if (dir && (nd[0] !== dir[0] || nd[1] !== dir[1])) pts.push(prev); dir = nd; }
        prev = p;
      }
      pts.push(prev); pts.push([n.b[0], n.b[1]]);
      const clean = [pts[0]]; for (let k = 1; k < pts.length; k++) { const q = clean[clean.length - 1]; if (Math.hypot(pts[k][0] - q[0], pts[k][1] - q[1]) > 0.25) clean.push(pts[k]); }
      let len = 0; for (let k = 1; k < clean.length; k++) len += Math.hypot(clean[k][0] - clean[k - 1][0], clean[k][1] - clean[k - 1][1]);
      results.push({ name: n.name, layer: c.layer, pts: clean, len });
    }
    results.sort((p, q) => nets.findIndex(e => e.n.name === p.name) - nets.findIndex(e => e.n.name === q.name));
    root.BOSS.lastRoute = { cfg, base: traceGrid, nx, ny, cell, x0, y0, paths: results, failed, rips };
    return { paths: results, failed };
  }
  function astar(g, soft, nx, ny, s, t, bendCost, softCost) {
    const N = nx * ny; const free = k => g[k] === 0; const sc = soft ? softCost : 0;
    const sk = s[1] * nx + s[0], tk = t[1] * nx + t[0];
    if (!free(sk) || !free(tk)) { return null; }
    const dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), pdir = new Int8Array(N).fill(-1);
    // binary heap
    const hk = [], hv = []; const push = (k, v) => { hk.push(k); hv.push(v); let i = hk.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= hv[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; } };
    const pop = () => { const k = hk[0]; const lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < hk.length && hv[a] < hv[m]) m = a; if (b < hk.length && hv[b] < hv[m]) m = b; if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]; i = m; } } return k; };
    const h = k => Math.abs((k % nx) - t[0]) + Math.abs(((k / nx) | 0) - t[1]);
    dist[sk] = 0; push(sk, h(sk));
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (hk.length) {
      const k = pop(); if (k === tk) break;
      const i = k % nx, j = (k / nx) | 0;
      for (let di = 0; di < 4; di++) {
        const ii = i + D[di][0], jj = j + D[di][1]; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const kk = jj * nx + ii; if (!free(kk)) continue;
        const nd = dist[k] + 1 + (pdir[k] >= 0 && pdir[k] !== di ? bendCost : 0) + (soft && soft[kk] ? sc : 0);
        if (nd < dist[kk]) { dist[kk] = nd; prev[kk] = k; pdir[kk] = di; push(kk, nd + h(kk)); }
      }
    }
    if (dist[tk] === Infinity) return null;
    const cells = []; for (let k = tk; k !== -1; k = prev[k]) cells.push([k % nx, (k / nx) | 0]); cells.reverse();
    return { cells, cost: dist[tk] };
  }

  // stroke a routed path into its trace layer feature
  function traceFeature(body, path, name) {
    const z0 = path.layer === 0 ? STD.L1 : STD.L2;
    body.feature(S.CPLA, K.stroke(path.pts, STD.traceW, 'round', 16), z0, z0 + STD.traceT, 'trace ' + name);
    return barR(SLOTS[1].rho, path.len, STD.traceW * STD.traceT);
  }

  root.BOSS = { STD, SLOTS, S, L, snap, isCond, barR, Body, column, plainColumn, pinPad, route, traceFeature };
})(typeof globalThis !== 'undefined' ? globalThis : this);
