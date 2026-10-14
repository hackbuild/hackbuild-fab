/* BOSS sim: a scene of parts on an 8 mm world grid, LEGO stacking, contact nets, and a DC solver.
 * Nets are made by physical contact only: a socket sitting on a stud at the same cell and height, a wire cap on a stud.
 * Inside each part the generator's model (resistors, switch, LED, pot, force, trim, touch, board pins) does the electrics.
 * Solver: modified nodal analysis, Newton iteration for the LED, resistive everything else. */
(function (root) {
  'use strict';
  const P = 8;
  const SUPPLY = { id: 'supply', name: 'SUPPLY 1x2', cols: 2, rows: 1, top: 9.6, virtual: true, blurb: 'sim only: 3V3 and GND studs so a scene without a board still runs',
    ports: { 'V+': { i: 0, j: 0, top: true, bottom: false }, 'GND': { i: 1, j: 0, top: true, bottom: false } },
    model: { elements: [{ type: 'V', a: 'V+', b: 'GND', V: 3.3 }], controls: [{ k: 'volts', label: 'volts', type: 'range', min: 1.5, max: 5, step: 0.1, def: 3.3 }] } };

  // rotate a local cell of a cols x rows part by r quarter turns CCW; returns [i, j, w, h]
  function rotCell(i, j, cols, rows, r) {
    let c = cols, rw = rows;
    for (let k = 0; k < (r & 3); k++) { const ni = rw - 1 - j, nj = i; i = ni; j = nj; const t = c; c = rw; rw = t; }
    return [i, j, c, rw];
  }
  function footprint(inst) { const [, , w, h] = rotCell(0, 0, inst.part.cols, inst.part.rows, inst.rot); return { w, h }; }
  function worldCell(inst, i, j) { const [ri, rj] = rotCell(i, j, inst.part.cols, inst.part.rows, inst.rot); return [inst.ci + ri, inst.cj + rj]; }
  function cells(inst) { const out = []; const fp = footprint(inst); for (let dj = 0; dj < fp.h; dj++) for (let di = 0; di < fp.w; di++) out.push([inst.ci + di, inst.cj + dj]); return out; }
  function overlaps(a, b) { const fa = footprint(a), fb = footprint(b); return a.ci < b.ci + fb.w && b.ci < a.ci + fa.w && a.cj < b.cj + fb.h && b.cj < a.cj + fa.h; }

  class Scene {
    constructor() { this.insts = []; this.wires = []; this.uid = 1; this.pinModes = {}; this.controls = {}; }
    add(part, ci, cj, rot) {
      const inst = { uid: this.uid++, part, ci, cj, rot: rot & 3, z: 0, ctrl: {} };
      for (const c of (part.model && part.model.controls) || []) inst.ctrl[c.k] = c.def;
      this.insts.push(inst); this.settle(inst); return inst;
    }
    remove(inst) { this.insts = this.insts.filter(q => q !== inst); this.wires = this.wires.filter(w => w.a.inst !== inst && w.b.inst !== inst); this.settleAll(); }
    move(inst, ci, cj, rot) { inst.ci = ci; inst.cj = cj; if (rot !== undefined) inst.rot = rot & 3; this.lift(inst); }
    // stacking: instances settle in insertion order; each rests on the highest earlier instance under its footprint, else the ground
    settle(inst) { this.settleAll(); }
    settleAll() {
      for (let k = 0; k < this.insts.length; k++) {
        const inst = this.insts[k]; let z = 0;
        for (let q = 0; q < k; q++) { const o = this.insts[q]; if (overlaps(inst, o)) z = Math.max(z, o.z + o.part.top); }
        inst.z = z;
      }
    }
    lift(inst) { this.insts = this.insts.filter(q => q !== inst); this.insts.push(inst); this.settleAll(); }
    addWire(part, a, b) { const w = { uid: this.uid++, part, a, b }; this.wires.push(w); return w; }
    // contacts: bottom port of X at world cell c meets top port of Y at c when X sits exactly on Y
    nets() {
      const uf = new Map(); const find = k => { let r = k; while (uf.has(r) && uf.get(r) !== r) r = uf.get(r); let c = k; while (uf.has(c) && uf.get(c) !== r) { const n = uf.get(c); uf.set(c, r); c = n; } if (!uf.has(k)) uf.set(k, r); return r; };
      const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) uf.set(ra, rb); };
      const node = (inst, port) => 'n' + inst.uid + ':' + port;
      const topAt = new Map(); // key cell,z -> [{inst, port}]
      for (const inst of this.insts) for (const pn in inst.part.ports) {
        const p = inst.part.ports[pn]; const [wi, wj] = worldCell(inst, p.i, p.j); find(node(inst, pn));
        if (p.top) { const key = wi + ',' + wj + ',' + (inst.z + inst.part.top).toFixed(2); if (!topAt.has(key)) topAt.set(key, []); topAt.get(key).push({ inst, port: pn }); }
      }
      const contacts = [];
      for (const inst of this.insts) for (const pn in inst.part.ports) {
        const p = inst.part.ports[pn]; if (!p.bottom) continue;
        const [wi, wj] = worldCell(inst, p.i, p.j); const key = wi + ',' + wj + ',' + inst.z.toFixed(2);
        for (const t of topAt.get(key) || []) { if (t.inst === inst) continue; union(node(inst, pn), node(t.inst, t.port)); contacts.push({ a: { inst, port: pn }, b: t }); }
      }
      for (const w of this.wires) { union(node(w.a.inst, w.a.port), 'w' + w.uid + 'a'); union(node(w.b.inst, w.b.port), 'w' + w.uid + 'b'); find('w' + w.uid + 'a'); find('w' + w.uid + 'b'); }
      return { find, node, contacts, keys: Array.from(uf.keys()) };
    }
    // build and solve the circuit; returns per net voltage, per element current, pin readings
    solve() {
      const N = this.nets();
      const nodeIds = new Map(); const idOf = k => { const r = N.find(k); if (!nodeIds.has(r)) nodeIds.set(r, nodeIds.size); return nodeIds.get(r); };
      const R = [], V = [], diodes = [];
      const addR = (a, b, r, tag) => { if (r < 1e-3) r = 1e-3; R.push({ a: idOf(a), b: idOf(b), r, tag }); };
      const addV = (a, b, v, tag) => V.push({ a: idOf(a), b: idOf(b), v, tag });
      const readings = { pins: [], leds: [], touch: [], elements: [] };
      let gndKey = null;
      for (const inst of this.insts) {
        const m = inst.part.model || { elements: [] }; const nd = p => N.node(inst, p);
        const ctrl = inst.ctrl || {};
        for (const e of m.elements || []) {
          if (e.type === 'R') addR(e.a.startsWith('pin:') ? 'p' + inst.uid + ':' + e.a.slice(4) : nd(e.a), nd(e.b), e.R, inst.uid + ':' + e.a + '-' + e.b);
          else if (e.type === 'switch') addR(nd(e.a), nd(e.b), ctrl[e.ctrl] ? e.Ron : 1e9, inst.uid + ':switch');
          else if (e.type === 'trim') addR(nd(e.a), nd(e.b), e.R0 + (ctrl[e.ctrl] | 0) * e.Rstep, inst.uid + ':trim');
          else if (e.type === 'force') { const f = +ctrl.force || 0; const r = e.Rlead + (f <= 0.05 ? 1e9 : e.Rmin + (e.Rmax - e.Rmin) / (1 + f * 6)); addR(nd(e.a), nd(e.b), r, inst.uid + ':force'); readings.elements.push({ inst, label: 'FSR', value: fmtR(r) }); }
          else if (e.type === 'pot') { const pos = Math.min(1, Math.max(0, +ctrl[e.ctrl])); const t = 't' + inst.uid; addR(nd(e.a), t, Math.max(1, e.R * pos), inst.uid + ':potA'); addR(t, nd(e.b), Math.max(1, e.R * (1 - pos)), inst.uid + ':potB'); addR(nd(e.w), t, ctrl[e.on] ? e.Rskin + e.Rlead : 1e9, inst.uid + ':wiper'); }
          else if (e.type === 'led') { diodes.push({ a: idOf(nd(e.a)), k: idOf(nd(e.k)), vf: e.vf, rs: e.Rs, inst }); }
          else if (e.type === 'touch') { if (gndKey && ctrl.touched) addR(nd(e.a), gndKey, 3e5, inst.uid + ':finger'); readings.touch.push({ inst, port: e.a, touched: !!ctrl.touched }); }
          else if (e.type === 'V') { addV(nd(e.a), nd(e.b), +ctrl.volts || e.V, inst.uid + ':supply'); gndKey = gndKey || nd(e.b); }
        }
        if (m.board) {
          const bd = m.board;
          for (const pn of bd.pins) {
            const pinNode = 'p' + inst.uid + ':' + pn; const mode = (this.pinModes[inst.uid] || {})[pn] || (bd.rails[pn] !== undefined ? 'RAIL' : 'IN');
            if (bd.rails[pn] !== undefined) { addV(pinNode, 'gnd' + inst.uid, bd.rails[pn], 'rail ' + pn); if (bd.rails[pn] === 0) gndKey = gndKey || pinNode; }
            else if (mode === 'OUT_H') addV(pinNode, 'gnd' + inst.uid, bd.vio, 'out ' + pn);
            else if (mode === 'OUT_L') addV(pinNode, 'gnd' + inst.uid, 0, 'out ' + pn);
            else if (mode === 'PULLUP') addR(pinNode, 'vio' + inst.uid, 50e3, 'pullup ' + pn);
            else addR(pinNode, 'gnd' + inst.uid, 1e9, 'hiZ ' + pn); // IN / ADC: high impedance
            readings.pins.push({ inst, pin: pn, mode, node: pinNode });
          }
          addV('vio' + inst.uid, 'gnd' + inst.uid, bd.vio, 'vio');
          gndKey = gndKey || 'gnd' + inst.uid;
        }
      }
      for (const w of this.wires) { const e = (w.part.model.elements || []).find(q => q.type === 'R'); addR('w' + w.uid + 'a', 'w' + w.uid + 'b', e ? e.R : 1e3, 'wire ' + w.uid); }
      if (gndKey === null) { return { ok: false, reason: 'nothing powers this scene: add a SEAT with a board or the SUPPLY brick', volts: {}, readings }; }
      const gnd = idOf(gndKey);
      const n = nodeIds.size, m = V.length;
      // Newton iteration for diodes
      let vd = diodes.map(() => 1.8);
      let x = null;
      for (let it = 0; it < 40; it++) {
        const size = n + m; const A = new Float64Array(size * size), z = new Float64Array(size);
        const stamp = (i, j, v) => { A[i * size + j] += v; };
        const stampR = (a, b, r) => { const g = 1 / r; stamp(a, a, g); stamp(b, b, g); stamp(a, b, -g); stamp(b, a, -g); };
        for (const r of R) stampR(r.a, r.b, r.r);
        diodes.forEach((d, di) => {
          // piecewise linear LED: off below vf, (v - vf) / Rs above it (Rs is the printed series path plus 20 ohm)
          const rs = d.rs + 20, v = vd[di];
          const on = v > d.vf;
          const g = on ? 1 / rs : 1e-9, ieq = on ? -d.vf / rs : 0;
          stamp(d.a, d.a, g); stamp(d.k, d.k, g); stamp(d.a, d.k, -g); stamp(d.k, d.a, -g);
          z[d.a] -= ieq; z[d.k] += ieq;
        });
        V.forEach((s, k) => { const r = n + k; stamp(s.a, r, 1); stamp(s.b, r, -1); stamp(r, s.a, 1); stamp(r, s.b, -1); z[r] = s.v; });
        // ground: replace row/col of gnd with identity
        for (let j = 0; j < size; j++) { A[gnd * size + j] = 0; }
        A[gnd * size + gnd] = 1; z[gnd] = 0;
        // tiny conductance to ground from every node keeps floating nets defined
        for (let i = 0; i < n; i++) if (i !== gnd) A[i * size + i] += 1e-12;
        x = solveDense(A, z, size);
        if (!x) return { ok: false, reason: 'singular circuit', volts: {}, readings };
        let maxd = 0;
        diodes.forEach((d, di) => { const vnew = x[d.a] - x[d.k]; const step = vnew - vd[di]; maxd = Math.max(maxd, Math.abs(step)); vd[di] = vnew; });
        if (maxd < 1e-4) break;
      }
      const volt = id => x[id];
      const volts = {}; for (const [k, id] of nodeIds) volts[k] = volt(id);
      const netVolt = key => volt(idOf(key));
      // readings
      for (const p of readings.pins) { p.v = netVolt(p.node); p.adc = Math.round(Math.min(1, Math.max(0, p.v / (p.inst.part.model.board.vio))) * 4095); p.digital = p.v > p.inst.part.model.board.vio * 0.5 ? 'HIGH' : 'LOW'; }
      for (const d of diodes) { const v = volt(d.a) - volt(d.k); const i = v > d.vf ? (v - d.vf) / (d.rs + 20) : 0; readings.leds.push({ inst: d.inst, mA: i * 1e3, v }); }
      for (const r of R) { const i = (volt(r.a) - volt(r.b)) / r.r; r.i = i; }
      const elemI = R.map(r => ({ tag: r.tag, mA: r.i * 1e3 }));
      return { ok: true, volts, netVolt, find: N.find, node: N.node, contacts: N.contacts, readings, elements: elemI, gndKey };
    }
  }
  function solveDense(A, b, n) {
    const M = Float64Array.from(A), x = Float64Array.from(b);
    for (let c = 0; c < n; c++) {
      let piv = c, best = Math.abs(M[c * n + c]);
      for (let r = c + 1; r < n; r++) { const v = Math.abs(M[r * n + c]); if (v > best) { best = v; piv = r; } }
      if (best < 1e-18) return null;
      if (piv !== c) { for (let j = 0; j < n; j++) { const t = M[c * n + j]; M[c * n + j] = M[piv * n + j]; M[piv * n + j] = t; } const t = x[c]; x[c] = x[piv]; x[piv] = t; }
      const d = M[c * n + c];
      for (let r = c + 1; r < n; r++) { const f = M[r * n + c] / d; if (!f) continue; for (let j = c; j < n; j++) M[r * n + j] -= f * M[c * n + j]; x[r] -= f * x[c]; }
    }
    for (let c = n - 1; c >= 0; c--) { let s = x[c]; for (let j = c + 1; j < n; j++) s -= M[c * n + j] * x[j]; x[c] = s / M[c * n + c]; }
    return x;
  }
  function fmtR(r) { return r >= 1e6 ? (r / 1e6).toFixed(2) + ' Mohm' : r >= 1e3 ? (r / 1e3).toFixed(1) + ' kohm' : Math.round(r) + ' ohm'; }

  root.SIM = { Scene, SUPPLY, rotCell, footprint, worldCell, cells, overlaps, fmtR, P };
})(typeof globalThis !== 'undefined' ? globalThis : this);
