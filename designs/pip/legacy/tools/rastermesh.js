/* rastermesh.js: RASTER IN XY, EXACT IN Z.
 * The kernel behind COLLAR / PLINTH / CRESSET style benches. Every Z slab is a
 * Uint8 label grid (0 = air, 1..n = filament slot). Faces are emitted only where
 * two labels differ, so the per slot meshes never overlap and sum exactly to the
 * solid. Caps merge into greedy rectangles, walls into runs, then every face is
 * conformed to the lattice vertices on its edges and fanned from its centroid,
 * which is what makes the result strictly 2-manifold (edge pairing alone leaves
 * thousands of dangling T junction edges). Corner and edge pinches in the label
 * volume are resolved first by filling one cell, because a voxel set that meets
 * itself diagonally has a non manifold vertex no matter how it is meshed.
 *
 *   const vol = RasterMesh.volume(W, H, px, x0, y0);      // cell size px mm, cell (0,0) at (x0,y0)
 *   vol.addSlab(labelsUint8Array, z0, z1);                 // slabs in ascending z, contiguous
 *   vol.fixPinches();                                      // returns cells changed
 *   const meshes = vol.mesh();                             // {slot: {positions:Float32Array, indices:Uint32Array, tris}}
 *
 * Plain script, no dependencies, runs from file://. See references/kernels.md.
 */
(function (root) {
  'use strict';

  function volume(W, H, px, x0, y0) {
    const slabs = [];
    const V = {
      W, H, px, x0: x0 || 0, y0: y0 || 0, slabs,
      addSlab(labels, z0, z1) {
        if (labels.length !== W * H) throw new Error('slab size mismatch');
        if (slabs.length && Math.abs(slabs[slabs.length - 1].z1 - z0) > 1e-9) throw new Error('slabs must be contiguous in z');
        if (z1 <= z0) throw new Error('slab must have positive height');
        slabs.push({ labels, z0, z1 });
        return V;
      },
      fixPinches: () => fixPinches(V),
      mesh: () => mesh(V),
      slotsUsed() {
        const s = new Set();
        for (const sl of slabs) for (let i = 0; i < sl.labels.length; i++) if (sl.labels[i]) s.add(sl.labels[i]);
        return [...s].sort((a, b) => a - b);
      }
    };
    return V;
  }

  // ------------------------------------------------------------ pinch repair
  // A 2x2x2 window (with an air slab padded above and below and air outside the grid)
  // is well formed for label L when the L cells are face connected within the window
  // AND the not-L cells are face connected within the window. Otherwise two faces meet
  // at an edge or vertex only, which is non manifold, so one cell is flipped to heal it.
  const CUBE_ADJ = [[1, 2, 4], [0, 3, 5], [0, 3, 6], [1, 2, 7], [0, 5, 6], [1, 4, 7], [2, 4, 7], [3, 5, 6]];

  function components(mask) {          // mask: array of 8 booleans, returns component id per cell or -1
    const comp = new Array(8).fill(-1);
    let n = 0;
    for (let s = 0; s < 8; s++) {
      if (!mask[s] || comp[s] >= 0) continue;
      const stack = [s]; comp[s] = n;
      while (stack.length) {
        const c = stack.pop();
        for (const d of CUBE_ADJ[c]) if (mask[d] && comp[d] < 0) { comp[d] = n; stack.push(d); }
      }
      n++;
    }
    return { comp, n };
  }

  function fixPinches(V) {
    const { W, H, slabs } = V;
    const K = slabs.length;
    const lab = (i, j, k) => (k < 0 || k >= K || i < 0 || j < 0 || i >= W || j >= H) ? 0 : slabs[k].labels[j * W + i];
    const set = (i, j, k, v) => { if (k >= 0 && k < K && i >= 0 && j >= 0 && i < W && j < H) slabs[k].labels[j * W + i] = v; };
    const inRange = (ii, jj, kk) => kk >= 0 && kk < K && ii >= 0 && jj >= 0 && ii < W && jj < H;
    let changed = 0;
    let dirty = null;                      // after the first pass only windows near flipped cells are revisited
    for (let pass = 0; pass < 60; pass++) {
      let n = 0;
      const next = new Set();
      const windows = dirty ? [...dirty].map(v => [(v % (W + 2)) - 1, (Math.floor(v / (W + 2)) % (H + 2)) - 1, Math.floor(v / ((W + 2) * (H + 2))) - 1]) : null;
      const total = windows ? windows.length : (K + 1) * (H + 1) * (W + 1);
      for (let w = 0; w < total; w++) {
        let i, j, k;
        if (windows) { [i, j, k] = windows[w]; }
        else { i = (w % (W + 1)) - 1; j = (Math.floor(w / (W + 1)) % (H + 1)) - 1; k = Math.floor(w / ((W + 1) * (H + 1))) - 1; }
        // window cells: bit0 = i+1, bit1 = j+1, bit2 = k+1
        const cells = new Array(8);
        for (let s = 0; s < 8; s++) cells[s] = lab(i + (s & 1), j + ((s >> 1) & 1), k + ((s >> 2) & 1));
        const labels = [...new Set(cells)];
        if (labels.length < 2) continue;
        const at = s => [i + (s & 1), j + ((s >> 1) & 1), k + ((s >> 2) & 1)];
        const flip = (s, v) => {
          const c = at(s); if (!inRange(c[0], c[1], c[2])) return false;
          set(c[0], c[1], c[2], v);
          for (let dk = -1; dk <= 0; dk++) for (let dj = -1; dj <= 0; dj++) for (let di = -1; di <= 0; di++) next.add(((c[2] + dk + 1) * (H + 2) + (c[1] + dj + 1)) * (W + 2) + (c[0] + di + 1));
          return true;
        };
        for (const L of labels) {
          const A = cells.map(c => c === L), B = cells.map(c => c !== L);
          const ca = components(A), cb = components(B);
          if (ca.n <= 1 && cb.n <= 1) continue;
          let done = false;
          // 1. a B cell face adjacent to two A components becomes L (bridges the pinch)
          if (ca.n > 1) for (let s = 0; s < 8 && !done; s++) {
            if (A[s]) continue;
            const seen = new Set();
            for (const d of CUBE_ADJ[s]) if (A[d]) seen.add(ca.comp[d]);
            if (seen.size >= 2) done = flip(s, L);
          }
          // 2. an A cell face adjacent to two B components takes the commonest adjacent B label
          if (!done && cb.n > 1) for (let s = 0; s < 8 && !done; s++) {
            if (!A[s]) continue;
            const seen = new Set(), count = {};
            for (const d of CUBE_ADJ[s]) if (B[d]) { seen.add(cb.comp[d]); count[cells[d]] = (count[cells[d]] || 0) + 1; }
            if (seen.size >= 2) done = flip(s, +Object.keys(count).sort((a, b) => count[b] - count[a])[0]);
          }
          // 3. vertex pinch (single cells at opposite corners): dissolve the smallest A component
          if (!done && ca.n > 1) {
            const size = new Array(ca.n).fill(0);
            for (let s = 0; s < 8; s++) if (A[s]) size[ca.comp[s]]++;
            const order = [...size.keys()].sort((a, b) => size[a] - size[b]);
            for (const c of order) for (let s = 0; s < 8 && !done; s++) {
              if (!A[s] || ca.comp[s] !== c) continue;
              const count = {};
              for (const d of CUBE_ADJ[s]) if (B[d]) count[cells[d]] = (count[cells[d]] || 0) + 1;
              const keys = Object.keys(count);
              if (keys.length) done = flip(s, +keys.sort((a, b) => count[b] - count[a])[0]);
            }
          }
          // 4. same for a B pinch: dissolve the smallest B component into L
          if (!done && cb.n > 1) {
            const size = new Array(cb.n).fill(0);
            for (let s = 0; s < 8; s++) if (B[s]) size[cb.comp[s]]++;
            const order = [...size.keys()].sort((a, b) => size[a] - size[b]);
            for (const c of order) for (let s = 0; s < 8 && !done; s++) if (B[s] && cb.comp[s] === c) done = flip(s, L);
          }
          if (done) { n++; break; }      // window changed, revisit on the next pass
        }
      }
      changed += n;
      if (!n) break;
      dirty = next;
    }
    return changed;
  }

  // ------------------------------------------------------------ meshing
  function greedyRects(mask, W, H) {     // mask Uint8Array W*H (1 = in), returns [i0,j0,i1,j1] exclusive upper
    const used = new Uint8Array(W * H);
    const out = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = j * W + i;
      if (!mask[p] || used[p]) continue;
      let i1 = i;
      while (i1 + 1 < W && mask[p + (i1 + 1 - i)] && !used[p + (i1 + 1 - i)]) i1++;
      let j1 = j;
      outer: while (j1 + 1 < H) {
        for (let x = i; x <= i1; x++) { const q = (j1 + 1) * W + x; if (!mask[q] || used[q]) break outer; }
        j1++;
      }
      for (let y = j; y <= j1; y++) for (let x = i; x <= i1; x++) used[y * W + x] = 1;
      out.push([i, j, i1 + 1, j1 + 1]);
    }
    return out;
  }

  function mesh(V) {
    const { W, H, px, x0, y0, slabs } = V;
    const K = slabs.length;
    const zs = slabs.map(s => s.z0); zs.push(slabs[K - 1].z1);
    const lab = (i, j, k) => (k < 0 || k >= K || i < 0 || j < 0 || i >= W || j >= H) ? 0 : slabs[k].labels[j * W + i];
    const slots = V.slotsUsed();
    const out = {};
    for (const S of slots) {
      // faces: each is {axis:0|1|2, sign:+1|-1, a0,b0,a1,b1, c} in lattice coords
      const faces = [];
      const mask = new Uint8Array(W * H);
      for (let k = 0; k < K; k++) {
        const L = slabs[k].labels;
        // z caps
        for (const sign of [1, -1]) {
          mask.fill(0);
          let any = 0;
          for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
            const p = j * W + i;
            if (L[p] === S && lab(i, j, k + (sign > 0 ? 1 : -1)) !== S) { mask[p] = 1; any = 1; }
          }
          if (!any) continue;
          for (const r of greedyRects(mask, W, H)) faces.push({ axis: 2, sign, a0: r[0], b0: r[1], a1: r[2], b1: r[3], c: sign > 0 ? k + 1 : k });
        }
        // x walls: runs along j at fixed i
        for (const sign of [1, -1]) {
          for (let i = 0; i < W; i++) {
            let j = 0;
            while (j < H) {
              if (L[j * W + i] === S && lab(i + sign, j, k) !== S) {
                let j1 = j;
                while (j1 + 1 < H && L[(j1 + 1) * W + i] === S && lab(i + sign, j1 + 1, k) !== S) j1++;
                faces.push({ axis: 0, sign, a0: j, b0: k, a1: j1 + 1, b1: k + 1, c: sign > 0 ? i + 1 : i });
                j = j1 + 1;
              } else j++;
            }
          }
        }
        // y walls: runs along i at fixed j
        for (const sign of [1, -1]) {
          for (let j = 0; j < H; j++) {
            let i = 0;
            while (i < W) {
              if (L[j * W + i] === S && lab(i, j + sign, k) !== S) {
                let i1 = i;
                while (i1 + 1 < W && L[j * W + i1 + 1] === S && lab(i1 + 1, j + sign, k) !== S) i1++;
                faces.push({ axis: 1, sign, a0: i, b0: k, a1: i1 + 1, b1: k + 1, c: sign > 0 ? j + 1 : j });
                i = i1 + 1;
              } else i++;
            }
          }
        }
      }
      out[S] = triangulate(faces, W, H, K, px, x0, y0, zs);
    }
    return out;
  }

  // corner loops in CCW order seen from outside, as lattice (i, j, k) triples
  function corners(f) {
    const { axis, sign, a0, b0, a1, b1, c } = f;
    let loop;
    if (axis === 2) loop = [[a0, b0, c], [a1, b0, c], [a1, b1, c], [a0, b1, c]];            // +z
    else if (axis === 0) loop = [[c, a0, b0], [c, a1, b0], [c, a1, b1], [c, a0, b1]];       // +x: (x, y, z)
    else loop = [[a0, c, b0], [a0, c, b1], [a1, c, b1], [a1, c, b0]];                       // +y
    if (sign < 0) loop.reverse();
    return loop;
  }

  function triangulate(faces, W, H, K, px, x0, y0, zs) {
    const key = (i, j, k) => (k * (H + 1) + j) * (W + 1) + i;
    const vmap = new Map();
    const pos = [];
    const vid = (i, j, k) => {
      const kk = key(i, j, k);
      let id = vmap.get(kk);
      if (id === undefined) { id = pos.length / 3; vmap.set(kk, id); pos.push(x0 + i * px, y0 + j * px, zs[k]); }
      return id;
    };
    const loops = faces.map(corners);
    for (const lp of loops) for (const c of lp) vid(c[0], c[1], c[2]);      // register every corner first
    const idx = [];
    for (const lp of loops) {
      // conform: walk each edge, insert lattice vertices that exist in this mesh
      const ring = [];
      let cx = 0, cy = 0, cz = 0;
      for (let e = 0; e < 4; e++) {
        const A = lp[e], B = lp[(e + 1) % 4];
        ring.push(vid(A[0], A[1], A[2]));
        const d = [Math.sign(B[0] - A[0]), Math.sign(B[1] - A[1]), Math.sign(B[2] - A[2])];
        const n = Math.abs(B[0] - A[0]) + Math.abs(B[1] - A[1]) + Math.abs(B[2] - A[2]);
        for (let t = 1; t < n; t++) {
          const p = [A[0] + d[0] * t, A[1] + d[1] * t, A[2] + d[2] * t];
          const id = vmap.get(key(p[0], p[1], p[2]));
          if (id !== undefined) ring.push(id);
        }
        cx += x0 + A[0] * px; cy += y0 + A[1] * px; cz += zs[A[2]];
      }
      const c = pos.length / 3;
      pos.push(cx / 4, cy / 4, cz / 4);
      for (let t = 0; t < ring.length; t++) idx.push(c, ring[t], ring[(t + 1) % ring.length]);
    }
    return { positions: new Float32Array(pos), indices: new Uint32Array(idx), tris: idx.length / 3 };
  }

  // ------------------------------------------------------------ raster helpers benches keep reusing
  // paint a canvas alpha mask into a label grid: cells whose alpha > 127 take slot S (only over cells currently == onlyOver, if given)
  function stamp(labels, W, H, alpha, S, onlyOver) {
    for (let p = 0; p < W * H; p++) if (alpha[p * 4 + 3] > 127 && (onlyOver === undefined || labels[p] === onlyOver)) labels[p] = S;
  }
  // remove islands of slot S smaller than minCells, giving them back to `into`
  function despeckle(labels, W, H, S, minCells, into) {
    const seen = new Uint8Array(W * H);
    let removed = 0;
    for (let p0 = 0; p0 < W * H; p0++) {
      if (labels[p0] !== S || seen[p0]) continue;
      const stack = [p0], cells = [];
      seen[p0] = 1;
      while (stack.length) {
        const p = stack.pop(); cells.push(p);
        const i = p % W, j = (p / W) | 0;
        const nb = [];
        if (i > 0) nb.push(p - 1); if (i < W - 1) nb.push(p + 1); if (j > 0) nb.push(p - W); if (j < H - 1) nb.push(p + W);
        for (const q of nb) if (labels[q] === S && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
      if (cells.length < minCells) { for (const p of cells) labels[p] = into; removed++; }
    }
    return removed;
  }
  // morphological open of slot S with a disc of radius r cells: erode then dilate. Kills features thinner than 2r.
  function open(labels, W, H, S, r, into) {
    if (r <= 0) return;
    const disc = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 0.25) disc.push([dx, dy]);
    const isS = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) isS[p] = labels[p] === S ? 1 : 0;
    const er = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let ok = isS[j * W + i];
      for (let d = 0; ok && d < disc.length; d++) {
        const x = i + disc[d][0], y = j + disc[d][1];
        if (x < 0 || y < 0 || x >= W || y >= H || !isS[y * W + x]) ok = 0;
      }
      er[j * W + i] = ok;
    }
    const di = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (!er[j * W + i]) continue;
      for (const [dx, dy] of disc) { const x = i + dx, y = j + dy; if (x >= 0 && y >= 0 && x < W && y < H) di[y * W + x] = 1; }
    }
    for (let p = 0; p < W * H; p++) { if (isS[p] && !di[p]) labels[p] = into; }
  }
  // grow slot S by r cells into cells labelled `over` (stroke boost: thin strokes survive the min feature open)
  function dilate(labels, W, H, S, r, over) {
    if (r <= 0) return;
    const src = labels.slice();
    const disc = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 0.25) disc.push([dx, dy]);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (src[j * W + i] !== S) continue;
      for (const [dx, dy] of disc) { const x = i + dx, y = j + dy; if (x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] === over) labels[y * W + x] = S; }
    }
  }
  // erode slot S by g cells where it touches slot T (colour gap so two colours never share a wall in one line)
  function gap(labels, W, H, S, g, into) {
    if (g <= 0) return;
    const src = labels.slice();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = j * W + i;
      if (src[p] !== S) continue;
      let near = false;
      for (let dy = -g; dy <= g && !near; dy++) for (let dx = -g; dx <= g && !near; dx++) {
        const x = i + dx, y = j + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const q = src[y * W + x];
        if (q !== S && q !== 0 && q !== into) near = true;
      }
      if (near) labels[p] = into;
    }
  }
  function mirrorX(labels, W, H) {
    const out = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) out[j * W + (W - 1 - i)] = labels[j * W + i];
    return out;
  }

  root.RasterMesh = { volume, fixPinches, greedyRects, stamp, despeckle, open, dilate, gap, mirrorX };
})(typeof globalThis !== 'undefined' ? globalThis : this);
