/* router.js: two layer grid router with negotiated congestion (PathFinder style).
   Terminals are posts through both layers and are hard obstacles for every other net.
   Traces are negotiated: each net may cross another net's clearance zone at a rising
   price until nobody does. Plain script. */
(function (G) {
  'use strict';
  const H = G.PIP = G.PIP || {};

  class Heap {
    constructor(cap) { this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0; }
    clear() { this.n = 0; }
    push(key, val) {
      if (this.n >= this.k.length) { const k = new Float64Array(this.k.length * 2); k.set(this.k); this.k = k; const v = new Int32Array(this.v.length * 2); v.set(this.v); this.v = v; }
      let i = this.n++; const K = this.k, V = this.v;
      while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= key) break; K[i] = K[p]; V[i] = V[p]; i = p; }
      K[i] = key; V[i] = val;
    }
    pop() {
      const K = this.k, V = this.v, top = V[0], last = --this.n, lk = K[last], lv = V[last];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= last) break;
        if (c + 1 < last && K[c + 1] < K[c]) c++;
        if (K[c] >= lk) break;
        K[i] = K[c]; V[i] = V[c]; i = c;
      }
      K[i] = lk; V[i] = lv;
      return top;
    }
  }
  const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
  const DC = [1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2];

  function route(L, opts) {
    const P = L.P, R = P.route, gp = R.grid;
    const t0 = Date.now();
    // bounds
    let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9;
    for (const poly of L.outlinePolys) for (const [x, y] of poly) { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    const x0 = Math.floor(xmin / gp) * gp, y0 = Math.floor(ymin / gp) * gp;
    const nx = Math.ceil((xmax - x0) / gp) + 1, ny = Math.ceil((ymax - y0) / gp) + 1, N = nx * ny;
    const cx = (i) => x0 + i * gp, cy = (j) => y0 + j * gp;
    const cellOf = (x, y) => { const i = Math.round((x - x0) / gp), j = Math.round((y - y0) / gp); return j * nx + i; };
    const nets = L.nets;
    const nN = nets.length;
    // static: -1 free, k net owner, -2 blocked for all, -3 outside
    const stat = new Int16Array(N).fill(-1);
    // outline margin via a coarse inside test per cell
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (!L.inside(cx(i), cy(j), R.margin)) stat[j * nx + i] = -3;
    }
    const stencil = (rmm) => {
      const rc = rmm / gp, k = Math.ceil(rc), out = [];
      for (let dj = -k; dj <= k; dj++) for (let di = -k; di <= k; di++) if (di * di + dj * dj < rc * rc) out.push([di, dj]);
      return out;
    };
    const markStatic = (x, y, rmm, owner) => {
      const rc = rmm / gp, k = Math.ceil(rc) + 1;
      const ic = (x - x0) / gp, jc = (y - y0) / gp;
      for (let j = Math.floor(jc - k); j <= Math.ceil(jc + k); j++) for (let i = Math.floor(ic - k); i <= Math.ceil(ic + k); i++) {
        if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
        if ((i - ic) ** 2 + (j - jc) ** 2 >= rc * rc) continue;
        const c = j * nx + i;
        if (stat[c] === -3) continue;
        if (stat[c] === -1) stat[c] = owner; else if (stat[c] !== owner) stat[c] = -2;
      }
    };
    const safety = 0.15;
    nets.forEach((n, k) => { for (const t of n.terms) markStatic(t.x, t.y, t.r + R.clr + R.w / 2 + safety, k); });
    // terminal cells
    const tcell = nets.map(n => n.terms.map(t => cellOf(t.x, t.y)));
    // trace to trace: centrelines w + clr apart. no extra margin here, or parallel lanes on the
    // 2.54 mm pad pitch read as conflicts; minGap in the model checks the real geometry
    const zoneSt = stencil(R.w + R.clr + 0.02);
    const viaSt = stencil(R.via + R.clr + R.w / 2 + safety);
    const zone = [new Uint8Array(N), new Uint8Array(N)];
    const hist = [new Float32Array(N), new Float32Array(N)];
    const stamp = [new Int32Array(N), new Int32Array(N)];
    let stampId = 1;
    const S = 2 * N * 9;
    const g = new Float64Array(S), par = new Int32Array(S), seen = new Int32Array(S);
    let seenId = 1;
    const heap = new Heap(1 << 16);
    const sols = nets.map(() => null);   // per net: {cells:[[layer,cell]...paths], paths:[...], vias:[...]}

    function applyZone(k, sign) {
      const s = sols[k]; if (!s) return;
      stampId++;
      const mark = (l, c, st) => {
        const i0 = c % nx, j0 = (c / nx) | 0;
        for (const [di, dj] of st) {
          const i = i0 + di, j = j0 + dj;
          if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
          const cc = j * nx + i;
          if (stamp[l][cc] === stampId) continue;
          stamp[l][cc] = stampId;
          zone[l][cc] += sign;
        }
      };
      for (const p of s.paths) for (const [l, c] of p) mark(l, c, zoneSt);
      for (const v of s.vias) { mark(0, v, viaSt); mark(1, v, viaSt); }
    }
    function astar(k, srcSet, goalSet, goalXY, pres) {
      seenId++;
      heap.clear();
      const hx = goalXY[0], hy = goalXY[1];
      const hfun = (c) => { const dx = Math.abs((c % nx) - hx), dy = Math.abs(((c / nx) | 0) - hy); return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)); };
      for (const [l, c] of srcSet) {
        const s = (l * N + c) * 9 + 8;
        seen[s] = seenId; g[s] = 0; par[s] = -1;
        heap.push(hfun(c), s);
      }
      const own = k;
      while (heap.n) {
        const s = heap.pop();
        const d = s % 9, lc = (s - d) / 9, l = lc >= N ? 1 : 0, c = lc - l * N;
        const gs = g[s];
        if (goalSet.has(l * N + c)) return { end: s };
        const i0 = c % nx, j0 = (c / nx) | 0;
        // moves in plane
        for (let m = 0; m < 8; m++) {
          const i = i0 + DX[m], j = j0 + DY[m];
          if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
          const cc = j * nx + i;
          const st = stat[cc];
          const isGoal = goalSet.has(l * N + cc);
          if (!isGoal && (st === -3 || st === -2 || (st >= 0 && st !== own))) continue;
          if (m % 2 === 1) {   // no corner cutting through blocked cells
            const a = stat[j0 * nx + i], b = stat[j * nx + i0];
            if ((a === -3 || a === -2 || (a >= 0 && a !== own)) && (b === -3 || b === -2 || (b >= 0 && b !== own))) continue;
          }
          let cost = DC[m] + hist[l][cc] + pres * zone[l][cc];
          if (d !== 8 && d !== m) { const t = Math.abs(d - m) % 8; cost += (t === 4 ? 4 : t === 2 || t === 6 ? 0.9 : 0.35); }
          const ns = ((l * N + cc) * 9) + m;
          const ng = gs + cost;
          if (seen[ns] === seenId && g[ns] <= ng) continue;
          seen[ns] = seenId; g[ns] = ng; par[ns] = s;
          heap.push(ng + hfun(cc), ns);
        }
        // via
        const ol = 1 - l;
        const st = stat[c];
        const vcost = 7 + pres * (zone[ol][c] + zone[l][c]) * 0.5 + hist[ol][c];
        const ns = ((ol * N + c) * 9) + 8;
        const ng = gs + vcost;
        if (!(seen[ns] === seenId && g[ns] <= ng)) { seen[ns] = seenId; g[ns] = ng; par[ns] = s; heap.push(ng + hfun(c), ns); }
      }
      return null;
    }
    function routeNet(k, pres) {
      const n = nets[k];
      const tc = tcell[k];
      // prim order over terminals
      const order = [0], left = new Set(tc.map((_, i) => i)); left.delete(0);
      const pts = n.terms;
      while (left.size) {
        let best = -1, bd = 1e18;
        for (const i of left) for (const j of order) { const d = (pts[i].x - pts[j].x) ** 2 + (pts[i].y - pts[j].y) ** 2; if (d < bd) { bd = d; best = i; } }
        order.push(best); left.delete(best);
      }
      const tree = new Set();
      const treeList = [];
      const addTree = (l, c) => { const key = l * N + c; if (!tree.has(key)) { tree.add(key); treeList.push([l, c]); } };
      const t0c = tc[order[0]];
      addTree(0, t0c); addTree(1, t0c);
      const paths = [], vias = [];
      let fails = 0;
      for (let q = 1; q < order.length; q++) {
        const ti = order[q], c = tc[ti];
        // goal: the tree; heuristic toward the nearest already connected terminal
        let nearest = order[0], nd = 1e18;
        for (let r = 0; r < q; r++) { const j = order[r]; const d = (pts[ti].x - pts[j].x) ** 2 + (pts[ti].y - pts[j].y) ** 2; if (d < nd) { nd = d; nearest = j; } }
        const gc = tc[nearest];
        const res = astar(k, [[0, c], [1, c]], tree, [gc % nx, (gc / nx) | 0], pres);
        if (!res) { fails++; continue; }
        // unwind
        const seq = [];
        let s = res.end;
        while (s >= 0) { const d = s % 9, lc = (s - d) / 9, l = lc >= N ? 1 : 0; seq.push([l, lc - l * N]); s = par[s]; }
        seq.reverse();
        // split into per layer runs, record vias
        let run = [seq[0]];
        for (let i = 1; i < seq.length; i++) {
          const [l, cc] = seq[i];
          if (l !== run[run.length - 1][0]) { vias.push(cc); paths.push(run); run = [seq[i]]; }
          else run.push(seq[i]);
        }
        paths.push(run);
        for (const [l, cc] of seq) addTree(l, cc);
        addTree(0, c); addTree(1, c);
      }
      return { paths, vias, fails, order };
    }
    // order: shortest nets first (by bbox half perimeter)
    const hp = nets.map(n => { const xs = n.terms.map(t => t.x), ys = n.terms.map(t => t.y); return (Math.max(...xs) - Math.min(...xs)) + (Math.max(...ys) - Math.min(...ys)); });
    const idx = nets.map((_, i) => i).sort((a, b) => hp[a] - hp[b]);
    let pres = 0.6;
    let conflicts = 0, iter = 0, bestConf = 1e9;
    const maxIt = (opts && opts.iters) || R.iters;
    for (iter = 0; iter < maxIt; iter++) {
      for (const k of idx) {
        if (iter > 0 && !netConflicted(k)) continue;
        applyZone(k, -1);
        sols[k] = routeNet(k, pres);
        applyZone(k, +1);
      }
      conflicts = 0;
      for (let k = 0; k < nN; k++) {
        const c = countConf(k, true);
        conflicts += c;
      }
      bestConf = Math.min(bestConf, conflicts);
      if (conflicts === 0) break;
      pres *= 1.7;
    }
    function netConflicted(k) { return countConf(k, false) > 0; }
    function countConf(k, addHist) {
      const s = sols[k]; if (!s) return 0;
      // remove own zone temporarily
      applyZone(k, -1);
      let n = 0;
      for (const p of s.paths) for (const [l, c] of p) if (zone[l][c] > 0) { n++; if (addHist) hist[l][c] += 0.8; }
      for (const v of s.vias) if (zone[0][v] > 0 || zone[1][v] > 0) { n++; if (addHist) { hist[0][v] += 0.8; hist[1][v] += 0.8; } }
      applyZone(k, +1);
      return n;
    }
    // where the leftover conflicts are (for warnings and the viewer)
    const hot = [];
    for (let k = 0; k < nN; k++) {
      const s = sols[k]; if (!s) continue;
      applyZone(k, -1);
      for (const p of s.paths) for (const [l, c] of p) if (zone[l][c] > 0) hot.push({ net: nets[k].name, l, x: cx(c % nx), y: cy((c / nx) | 0) });
      applyZone(k, +1);
    }
    // geometry out
    const out = nets.map((n, k) => {
      const s = sols[k];
      const polys = [[], []];
      for (const run of s.paths) {
        const l = run[0][0];
        let pts = run.map(([, c]) => [cx(c % nx), cy((c / nx) | 0)]);
        // simplify collinear
        const simp = [pts[0]];
        for (let i = 1; i < pts.length - 1; i++) {
          const a = simp[simp.length - 1], b = pts[i], c = pts[i + 1];
          const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
          if (Math.abs(cr) > 1e-9) simp.push(b);
        }
        if (pts.length > 1) simp.push(pts[pts.length - 1]);
        polys[l].push(simp);
      }
      // stubs from exact terminal centre to its grid cell, on both layers
      const stubs = n.terms.map(t => { const c = cellOf(t.x, t.y); return [[t.x, t.y], [cx(c % nx), cy((c / nx) | 0)]]; });
      const vias = s.vias.map(c => [cx(c % nx), cy((c / nx) | 0)]);
      let len = 0;
      for (const l of [0, 1]) for (const p of polys[l]) for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      return { name: n.name, polys, stubs, vias, fails: s.fails, len };
    });
    return { nets: out, conflicts, hot, iters: iter + 1, ms: Date.now() - t0, grid: { nx, ny, gp }, unrouted: out.reduce((a, n) => a + n.fails, 0) };
  }
  H.ROUTER = { route };
})(typeof globalThis !== 'undefined' ? globalThis : this);
