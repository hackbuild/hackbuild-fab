/* snapfe.js: corotational beam FE for a double curved beam click element (PIP).
   Half model of one cosine arch, centre rotation and axial motion held by the shuttle
   (so the antisymmetric mode is suppressed, as in a double beam). Displacement control
   at the centre. Units mm, N, MPa. Plain script, exposes SNAPFE on globalThis. */
(function (G) {
  'use strict';
  function solveLin(K, f, n) {            // dense gaussian elimination with partial pivot
    const A = K.map(r => r.slice()); const b = f.slice();
    for (let i = 0; i < n; i++) {
      let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      if (p !== i) { [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; }
      const d = A[i][i]; if (Math.abs(d) < 1e-300) return null;
      for (let r = i + 1; r < n; r++) { const m = A[r][i] / d; if (!m) continue; for (let c = i; c < n; c++) A[r][c] -= m * A[i][c]; b[r] -= m * b[i]; }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
    return x;
  }
  // p: {l span, h rise, t thickness (bending), w width, E, nel, dmax (fraction of h), steps}
  function curve(p) {
    const ne = p.nel || 16, nn = ne + 1, nd = nn * 3;
    const E = p.E, A = p.w * p.t, I = p.w * p.t * p.t * p.t / 12;
    const X = [], Y = [];
    for (let i = 0; i < nn; i++) { const x = (p.l / 2) * i / ne; X.push(x); Y.push(p.h / 2 * (1 - Math.cos(2 * Math.PI * x / p.l))); }
    const L0 = [], b0 = [];
    for (let e = 0; e < ne; e++) { const dx = X[e + 1] - X[e], dy = Y[e + 1] - Y[e]; L0.push(Math.hypot(dx, dy)); b0.push(Math.atan2(dy, dx)); }
    const U = new Array(nd).fill(0);
    // fixed: node0 all three; centre node: u and theta held, v prescribed
    const fixed = new Set([0, 1, 2, 3 * ne, 3 * ne + 2]);
    const vdof = 3 * ne + 1;
    const free = []; for (let i = 0; i < nd; i++) if (!fixed.has(i) && i !== vdof) free.push(i);
    const nf = free.length, fidx = new Map(free.map((d, k) => [d, k]));
    function assemble() {
      const K = Array.from({ length: nd }, () => new Array(nd).fill(0));
      const F = new Array(nd).fill(0);
      let emax = 0;
      for (let e = 0; e < ne; e++) {
        const d = [3 * e, 3 * e + 1, 3 * e + 2, 3 * e + 3, 3 * e + 4, 3 * e + 5];
        const x1 = X[e] + U[d[0]], y1 = Y[e] + U[d[1]], x2 = X[e + 1] + U[d[3]], y2 = Y[e + 1] + U[d[4]];
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), c = dx / L, s = dy / L;
        const cb0 = Math.cos(b0[e]), sb0 = Math.sin(b0[e]);
        const al = Math.atan2(s * cb0 - c * sb0, c * cb0 + s * sb0);
        const t1 = U[d[2]] - al, t2 = U[d[5]] - al, ul = L - L0[e];
        const k = E * I / L0[e];
        const N = E * A / L0[e] * ul, M1 = k * (4 * t1 + 2 * t2), M2 = k * (2 * t1 + 4 * t2);
        const eps = Math.abs(ul / L0[e]) + (p.t / 2) * Math.max(Math.abs(4 * t1 + 2 * t2), Math.abs(2 * t1 + 4 * t2)) / L0[e];
        if (eps > emax) emax = eps;
        const B = [[-c, -s, 0, c, s, 0], [-s / L, c / L, 1, s / L, -c / L, 0], [-s / L, c / L, 0, s / L, -c / L, 1]];
        const D = [[E * A / L0[e], 0, 0], [0, 4 * k, 2 * k], [0, 2 * k, 4 * k]];
        const q = [N, M1, M2];
        const r = [-c, -s, 0, c, s, 0], z = [s, -c, 0, -s, c, 0];
        for (let a = 0; a < 6; a++) {
          F[d[a]] += B[0][a] * q[0] + B[1][a] * q[1] + B[2][a] * q[2];
          for (let bb = 0; bb < 6; bb++) {
            let v = 0;
            for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) v += B[i][a] * D[i][j] * B[j][bb];
            v += N / L * z[a] * z[bb] + (M1 + M2) / (L * L) * (r[a] * z[bb] + z[a] * r[bb]);
            K[d[a]][d[bb]] += v;
          }
        }
      }
      return { K, F, emax };
    }
    const out = [];
    const steps = p.steps || 60, dmax = (p.dmax || 2.2) * p.h;
    let ok = true;
    for (let st = 0; st <= steps; st++) {
      U[vdof] = -dmax * st / steps;
      let conv = false, res;
      for (let it = 0; it < 40; it++) {
        res = assemble();
        const Kf = free.map(i => free.map(j => res.K[i][j]));
        const rf = free.map(i => -res.F[i]);
        let nr = 0; for (const v of rf) nr = Math.max(nr, Math.abs(v));
        if (nr < 1e-9 * E * A) { conv = true; break; }
        const du = solveLin(Kf, rf, nf); if (!du) break;
        let m = 0; for (let k = 0; k < nf; k++) { U[free[k]] += du[k]; m = Math.max(m, Math.abs(du[k])); }
        if (m < 1e-12) { conv = true; break; }
      }
      if (!conv) { ok = false; }
      res = res || assemble();
      // reaction at the prescribed dof = internal force there; half model: whole arch = 2 halves meeting, force on shuttle per arch = 2 * F
      out.push({ d: -U[vdof], F: -2 * res.F[vdof], e: res.emax });
    }
    return { pts: out, ok };
  }
  // two arches in the element: total force = 2 * per arch. peak = FIRST local max, valley = min after it up to 2h
  function summarize(p) {
    const r = curve(p); const pts = r.pts.map(q => ({ d: q.d, F: q.F * (p.arches || 2), e: q.e }));
    let pki = 0;
    for (let i = 1; i < pts.length - 1; i++) { if (pts[i].F >= pts[i - 1].F && pts[i].F > pts[i + 1].F) { pki = i; break; } }
    const lim = 2 * p.h;
    let snap = pki > 0, vl = Infinity, vli = pki;
    if (snap) for (let i = pki; i < pts.length && pts[i].d <= lim + 1e-9; i++) if (pts[i].F < vl) { vl = pts[i].F; vli = i; }
    const pk = snap ? pts[pki].F : 0;
    let emax = 0; for (const q of pts) if (q.d <= lim + 1e-9) emax = Math.max(emax, q.e);
    return { pts, ok: r.ok, snap, peak: pk, dPeak: snap ? pts[pki].d : 0, valley: snap ? vl : 0, dValley: snap ? pts[vli].d : 0,
      drop: snap && pk > 0 ? 1 - vl / pk : 0, bistable: snap && vl < 0, emax };
  }
  G.SNAPFE = { curve, summarize };
})(typeof globalThis !== 'undefined' ? globalThis : this);
