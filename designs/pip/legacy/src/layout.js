/* layout.js: PIP parameters, RP2040-Zero pad table and the layout solver.
   Coordinates: x right, y toward the cable edge, z up from the bed, mm. */
(function (G) {
  'use strict';
  const H = G.PIP = G.PIP || {};
  const deg = Math.PI / 180;

  // Waveshare RP2040-Zero, top view, USB toward +y, origin at board centre.
  // 23 castellations on one 2.54 grid inset 1.38 from the edges (0.6 in between rows).
  function zeroPads(B) {
    const hw = B.W / 2, hl = B.L / 2, xL = -hw + B.inset, xR = hw - B.inset, yT = -hl + B.inset;
    const left = ['5V', 'GND', '3V3', 'GP29', 'GP28', 'GP27', 'GP26', 'GP15', 'GP14'];
    const tail = ['GP13', 'GP12', 'GP11', 'GP10', 'GP9'];
    const right = ['GP8', 'GP7', 'GP6', 'GP5', 'GP4', 'GP3', 'GP2', 'GP1', 'GP0'];
    const pads = [];
    const yTop = yT + 8 * B.pitch;
    left.forEach((n, k) => pads.push({ name: n, x: xL, y: yTop - k * B.pitch, edge: 'L', num: k + 1 }));
    tail.forEach((n, k) => pads.push({ name: n, x: xL + (k + 1) * B.pitch, y: yT, edge: 'T', num: 10 + k }));
    right.forEach((n, k) => pads.push({ name: n, x: xR, y: yT + k * B.pitch, edge: 'R', num: 15 + k }));
    return pads;
  }
  const GPIOS = ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9', 'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15', 'GP26', 'GP27', 'GP28', 'GP29'];

  function defaults() {
    return {
      shape: { style: 'stadium', W: 150, H: 64, drop: 14, corner: 10, bezelChamfer: 0.96 },
      stack: { layer: 0.24, skin: 0.72, trace: 0.72, iso: 0.96, pad: 0.72, bezel: 2.4 },
      route: { w: 1.4, clr: 0.8, grid: 0.5, via: 0.8, post: 0.6, margin: 3.0, iters: 24 },
      groups: {
        left: { on: true, kind: 'dpad', type: 'flex', x: -44, y: 1, pitch: 14 },
        face: { on: true, type: 'clicky', x: 42, y: 1, pitch: 17 },
        menu: { on: true, type: 'touch', x: 0, y: -15, pitch: 17 },
        shoulder: { on: false, type: 'flex', x: 27, y: 22 }
      },
      flex: { face: 10, Hs: 4.0, alpha: 40, wall: 0.6, hole: 3.6, cap: 0.72, faceT: 1.2, protrude: 2.6, gapPct: 45, colGap: 0.8 },
      clicky: { l: 24, t: 0.55, Q: 2.0, w: 1.6, g: 1.0, sw: 3.0, eb: 2.2, tip: 3.2, cap: 10, rib: 0.8, flange: 1.2, flangeT: 1.0, protrude: 3.0, E: 1900, slotClr: 0.3, relief: 1.2, endClr: 0.4, capMat: 'tpu' },
      touch: { d: 12, finger: 1.0, gap: 0.8, spine: 1.8, rim: 0.6 },
      stick: { neckD: 3.0, neckH: 2.4, bandR: 4.8, bandH: 2.4, tilt: 14, over: 3, stemD: 6.0, capD: 15, capH: 1.2, capDish: 1.6, capRings: 3, top: 'inplace', padGap: 0.8 },
      board: { mode: 'press', L: 23.5, W: 18.0, T: 1.0, pitch: 2.54, inset: 1.38, usbH: 3.26, usbOver: 0.8, bumpW: 1.5, bumpH: 0.48, clr: 0.3, press: 0.3, window: true },
      cups: { od: 3.2, bore: 1.0, h: 3.0, pitch: 5.2, perRow: 6 },
      bezel: { on: true, labels: true, mark: true, pins: true, labelH: 2.4 },
      pins: { UP: 'GP29', LEFT: 'GP28', RIGHT: 'GP27', DOWN: 'GP26', X: 'GP3', A: 'GP4', Y: 'GP5', B: 'GP6', SELECT: 'GP12', START: 'GP10', L: 'GP15', R: 'GP1' },
      // Yousu conductive PLA and TPU: 100 to 200 kohm across 10 cm of 1.75 mm filament,
      // which is 240 to 480 ohm cm as extruded; printed parts are worse, so in plane 500 and
      // across layers 2000, on the same ratio Protopasta report between moulded and printed
      phys: { rhoC: 500, rhoCz: 2000, rhoT: 400, cpin: 7, leak: 1, waitMech: 0.2, waitTouch: 1.5 },
      slots: [
        { color: '#F4F1EA', type: 'PETG', name: 'white PETG' },
        { color: '#1A1A1A', type: 'PLA', name: 'conductive PLA' },
        { color: '#FE0386', type: 'TPU', name: 'pink TPU 95A' },
        { color: '#6E6E6E', type: 'TPU', name: 'conductive TPU' }
      ],
      print: { printer: 'Flashforge Creator 5 Pro 0.4 nozzle', process: '0.24mm Standard @FF C5', pattern: 'Generic {TYPE} @FF C5P', writeFilaments: true, bedW: 256, bedD: 256 },
      seg: 40
    };
  }

  const snapUp = (v, q) => Math.ceil(v / q - 1e-9) * q;
  const snapN = (v, q) => Math.round(v / q) * q;

  function outline(P) {
    const GEO = H.GEO, S = P.shape;
    const W = S.W, Hh = S.H, cx = W / 2 - Hh / 2;
    if (S.style === 'slab') {
      const r = Math.min(S.corner, Hh / 2 - 0.5, W / 2 - 0.5);
      return GEO.union2([GEO.rect(-W / 2 + r, -Hh / 2, W / 2 - r, Hh / 2), GEO.rect(-W / 2, -Hh / 2 + r, W / 2, Hh / 2 - r),
        GEO.circle(r, -W / 2 + r, -Hh / 2 + r), GEO.circle(r, W / 2 - r, -Hh / 2 + r), GEO.circle(r, -W / 2 + r, Hh / 2 - r), GEO.circle(r, W / 2 - r, Hh / 2 - r)]);
    }
    const n = 96;
    const stad = GEO.MN && H.GEO.CS().hull([GEO.circle(Hh / 2, -cx, 0, n), GEO.circle(Hh / 2, cx, 0, n)]);
    if (S.style === 'grips') {
      const r2 = Hh / 2 - 4;
      const lobeL = H.GEO.CS().hull([GEO.circle(Hh / 2, -cx, 0, n), GEO.circle(r2, -cx + 6, -S.drop, n)]);
      const lobeR = H.GEO.CS().hull([GEO.circle(Hh / 2, cx, 0, n), GEO.circle(r2, cx - 6, -S.drop, n)]);
      return GEO.union2([stad, lobeL, lobeR]);
    }
    return stad;
  }

  // ---- clicky element geometry in its own (u along slot, v up) frame, heights only
  function clickerDims(P) {
    const C = P.clicky;
    const h = C.Q * C.t;
    const fe = H.clickCurve(P);
    // contact just after the valley starts: 85 percent of the valley travel, never before the peak
    const cg = Math.max(fe.dPeak + 0.15, 0.85 * fe.dValley);
    const tipExp = 0.8, dove = 1.2;
    const va = cg + tipExp + dove + 0.4 - h + C.t / 2;
    const vb = va + C.t + C.g;
    const stemH = cg + 0.45;
    const vTop = vb + h + C.t / 2 + stemH;
    const blockTop = vb + C.t + 0.8;
    const len = C.l + 2 * C.eb;
    let eStop = 0;
    for (const p of fe.pts) if (p.d <= cg + 0.3 + 1e-9) eStop = Math.max(eStop, p.e);
    return { h, cg, tipExp, dove, va, vb, stemH, vTop, blockTop, len, fe, eStop };
  }
  let feCache = { key: '', val: null };
  H.clickCurve = function (P) {
    const C = P.clicky;
    const key = [C.l, C.t, C.Q, C.w, C.E, C.sw].join(',');
    if (feCache.key === key) return feCache.val;
    const r = H.SNAPFE_RIGID(P);
    feCache = { key, val: r };
    return r;
  };
  // FE with the shuttle modelled as a rigid centre of half width sw/2
  H.SNAPFE_RIGID = function (P) {
    const C = P.clicky;
    const lEff = Math.max(4, C.l - C.sw * 0.5);   // a rigid centre shortens the flexing span
    const r = G.SNAPFE.summarize({ l: lEff, h: C.Q * C.t, t: C.t, w: C.w, E: C.E, nel: 18, steps: 56, dmax: 2.0, arches: 2 });
    return r;
  };

  function stickDims(P, zwf) {
    const S = P.stick;
    const th = S.tilt * deg, ts = (S.tilt + S.over) * deg;
    const neckR = S.neckD / 2, stemR = S.stemD / 2;
    const zp = zwf + S.neckH;
    const rbl = S.bandR, zb0 = zp + (rbl - neckR);
    const rbt = rbl - S.bandH * Math.tan(th), zb1 = zb0 + S.bandH;
    const rbm = (rbl + rbt) / 2, zbm = (zb0 + zb1) / 2 - zp;
    const Rw = rbm * Math.cos(th) + zbm * Math.sin(th);
    const zc = zp + (-rbm * Math.sin(th) + zbm * Math.cos(th));
    const span = S.bandH / Math.cos(th);
    // the same split above as around: it is an exposed gap on the well wall, and a string across it
    // would hold a direction pressed for ever
    const padZ = [zc - span / 2 - 0.8, zc - S.padGap / 2];
    const comZ = [zc + S.padGap / 2, zc + span / 2 + 0.8];
    const restGap = Rw - rbl;
    // how far round the wall the band actually touches: at the tilt angle it is a line, and the
    // contact only gains width as the stick is pushed past it into the wall
    const arcAt = (t) => {
      const pen = rbl * Math.cos(t) + (zb0 - zp) * Math.sin(t) - Rw;
      if (pen <= 0) return 0;
      const Re = rbl * Rw / Math.max(0.01, Rw - rbl);
      return Math.asin(Math.min(1, Math.sqrt(2 * Re * pen) / Rw));
    };
    const arcOver = arcAt(ts), arcHalf = arcAt(th + 1 * deg);
    // four wall pads, as wide as the split gap allows, so a diagonal push lands on two of them
    const sectHalf = Math.max(20 * deg, 45 * deg - (S.padGap / 2) / Rw);
    const eightWay = arcHalf + sectHalf > 45 * deg;
    const collarRise = rbt * Math.sin(ts) + (zb1 - zp) * Math.cos(ts);
    const topNeed = Math.max(comZ[1] + 0.48, zp + collarRise + 0.4);
    const footR = neckR + 2.0;
    return { th, ts, neckR, stemR, zp, rbl, zb0, rbt, zb1, rbm, zbm, Rw, zc, span, padZ, comZ, restGap, topNeed, footR, arcOver, arcHalf, sectHalf, eightWay };
  }

  function flexDims(P) {
    const F = P.flex, a = F.alpha * deg;
    const wallH = F.wall / Math.sin((90 - F.alpha) * deg);   // horizontal thickness of the cone wall
    const rh = F.hole / 2, rnt = rh + wallH;
    const rsb = rnt + F.Hs * Math.tan(a);
    const gap = Math.max(1.2, F.gapPct / 100 * F.Hs);
    const rFace = F.face / 2;
    const flare = Math.max(0, rFace - rnt);
    const keyH = F.Hs + F.cap + 0.24 + flare + F.faceT;
    const colR = Math.max(0.9, rh - 0.2);
    return { a, wallH, rh, rnt, rsb, gap, rFace, flare, keyH, colR, wellR: rsb + 0.6 };
  }

  // ---------------------------------------------------------------- layout
  function layout(P) {
    const L = { P, warn: [], notes: [] };
    const S = P.stack, lay = S.layer;
    // stack
    const z = {};
    z.f0 = S.skin; z.l1 = [z.f0, z.f0 + S.trace]; z.i1 = [z.l1[1], z.l1[1] + S.iso];
    z.l2 = [z.i1[1], z.i1[1] + S.trace]; z.i2 = [z.l2[1], z.l2[1] + S.iso];
    z.pl = [z.i2[1], z.i2[1] + S.pad];
    z.floor = z.pl[1];                           // lowest button floor, pads flush here
    L.z = z;
    const B = P.board;
    const pads = zeroPads(B);
    L.pads = pads;
    const halfH = P.shape.H / 2;
    // board placement: USB edge flush toward the cable edge
    const by = halfH - B.usbOver - B.L / 2;
    L.board = { cx: 0, cy: by, x0: -B.W / 2, x1: B.W / 2, y0: by - B.L / 2, y1: by + B.L / 2 };
    const zpf = z.floor;
    const pocketNeed = zpf + B.bumpH + B.T + B.usbH + B.clr;
    // buttons
    const btns = [];
    const Gp = P.groups;
    const add = (b) => btns.push(b);
    if (Gp.left.on) {
      const g = Gp.left, p = g.pitch;
      if (g.kind === 'stick') {
        add({ id: 'STICK', group: 'left', type: 'stick', x: g.x, y: g.y });
      } else {
        add({ id: 'UP', group: 'left', type: g.type, x: g.x, y: g.y + p, ang: 90 * deg, arrow: 90 });
        add({ id: 'DOWN', group: 'left', type: g.type, x: g.x, y: g.y - p, ang: 90 * deg, arrow: 270 });
        add({ id: 'LEFT', group: 'left', type: g.type, x: g.x - p, y: g.y, ang: 0, arrow: 180 });
        add({ id: 'RIGHT', group: 'left', type: g.type, x: g.x + p, y: g.y, ang: 0, arrow: 0 });
      }
    }
    if (Gp.face.on) {
      const g = Gp.face, p = g.pitch;
      add({ id: 'X', group: 'face', type: g.type, x: g.x, y: g.y + p, ang: 90 * deg });
      add({ id: 'B', group: 'face', type: g.type, x: g.x, y: g.y - p, ang: 90 * deg });
      add({ id: 'Y', group: 'face', type: g.type, x: g.x - p, y: g.y, ang: 0 });
      add({ id: 'A', group: 'face', type: g.type, x: g.x + p, y: g.y, ang: 0 });
    }
    if (Gp.menu.on) {
      const g = Gp.menu, p = g.pitch;
      add({ id: 'SELECT', group: 'menu', type: g.type, x: g.x - p / 2, y: g.y, ang: 90 * deg });
      add({ id: 'START', group: 'menu', type: g.type, x: g.x + p / 2, y: g.y, ang: 90 * deg });
    }
    if (Gp.shoulder.on) {
      const g = Gp.shoulder;
      add({ id: 'L', group: 'shoulder', type: g.type, x: -Math.abs(g.x), y: g.y, ang: 0 });
      add({ id: 'R', group: 'shoulder', type: g.type, x: Math.abs(g.x), y: g.y, ang: 0 });
    }
    L.btns = btns;
    const types = new Set(btns.map(b => b.type));
    L.types = types;
    // heights
    const fd = flexDims(P); L.flex = fd;
    const bt = S.bezel;
    const needs = [pocketNeed, z.floor + 1.44];
    let cd = null;
    if (types.has('clicky')) { cd = clickerDims(P); L.click = cd; needs.push(z.floor + cd.vTop + P.clicky.flangeT); }
    if (types.has('flex')) needs.push(z.floor + fd.keyH - P.flex.protrude - bt);
    let sd = null;
    if (types.has('stick')) { sd = stickDims(P, z.floor + 0.24); needs.push(sd.topNeed); }
    if (P.board.mode !== 'press') needs.push(z.floor + P.cups.h + 0.6);
    let ztop = snapUp(Math.max(...needs), lay);
    z.top = ztop; z.bez = [ztop, ztop + bt];
    L.pocket = { zf: zpf, need: pocketNeed };
    // per type floors
    z.flexFloor = snapN(Math.max(z.floor, ztop + bt + P.flex.protrude - fd.keyH), lay);
    if (cd) z.clickFloor = Math.max(z.floor, ztop - P.clicky.flangeT - cd.vTop);
    if (sd) { L.stick = stickDims(P, z.floor + 0.24); z.stickFloor = z.floor + 0.24; }
    // button details
    for (const b of btns) {
      b.pin = P.pins[b.id] || null;
      if (b.id === 'STICK') b.pins = [P.pins.UP, P.pins.LEFT, P.pins.RIGHT, P.pins.DOWN];
      if (b.type === 'flex') { b.r = fd.wellR; b.bezR = fd.rFace + 0.5; }
      if (b.type === 'clicky') { b.r = P.clicky.cap / 2 + P.clicky.flange + 0.4; b.bezR = P.clicky.cap / 2 + 0.25; }
      if (b.type === 'touch') { b.r = P.touch.d / 2; b.bezR = P.touch.d / 2 + 0.3; }
      if (b.type === 'stick') { b.r = L.stick.Rw; b.bezR = L.stick.stemR / Math.cos(L.stick.ts) + (ztop - L.stick.zp) * Math.tan(L.stick.ts) + 0.2; }
    }
    // cavities for collision checks: circles and rotated rects
    const cav = [];
    for (const b of btns) {
      if (b.type === 'stick') cav.push({ kind: 'c', x: b.x, y: b.y, r: L.stick.Rw + 3.5, who: b.id });
      else cav.push({ kind: 'c', x: b.x, y: b.y, r: b.r, who: b.id });
    }
    const bd = L.board;
    const pk = { x0: bd.x0 - B.clr, x1: bd.x1 + B.clr, y0: bd.y0 - B.clr, y1: halfH + 2 };
    L.pocketRect = pk;
    cav.push({ kind: 'r', x0: pk.x0, x1: pk.x1, y0: pk.y0, y1: pk.y1, who: 'pocket' });
    // cups
    L.cups = [];
    if (B.mode !== 'press') {
      const C = P.cups;
      const nets = [];
      for (const b of btns) { if (b.id === 'STICK') nets.push(...['UP', 'LEFT', 'RIGHT', 'DOWN']); else nets.push(b.id); }
      const commons = [];
      if ([...types].some(t => t !== 'touch')) commons.push('GND');
      if (types.has('touch')) commons.push('3V3');
      // cups follow the board's pad order (down the left column, along the tail, up the right)
      // so the traces from pads to cups nest instead of crossing
      const padNum = (n) => { const pin = (n === 'GND' || n === '3V3') ? n : P.pins[n]; const pp = pads.find(q => q.name === pin); return pp ? pp.num : 99; };
      const list = [...commons, ...nets].sort((a, b) => padNum(a) - padNum(b));
      const per = C.perRow;
      const rows = Math.ceil(list.length / per);
      const w = (Math.min(per, list.length) - 1) * C.pitch;
      const ytop = pk.y0 - 3.2;
      list.forEach((n, i) => {
        const r = Math.floor(i / per), c = i % per;
        L.cups.push({ net: n, num: i + 1, x: -w / 2 + c * C.pitch, y: ytop - r * C.pitch });
      });
      const cy0 = ytop - (rows - 1) * C.pitch - C.od / 2 - 1.2;
      L.cavity = { x0: Math.min(pk.x0, -w / 2 - C.od / 2 - 1.2), x1: Math.max(pk.x1, w / 2 + C.od / 2 + 1.2), y0: cy0, y1: pk.y0 + 0.5 };
      cav.push({ kind: 'r', ...L.cavity, who: 'cavity' });
    }
    // clicky slot orientation: try radial, then the listed fallbacks, pick first without collisions
    const outlinePolys = H.GEO.polysOf(outline(P));
    L.outlinePolys = outlinePolys;
    const inside = (x, y, m) => {
      let ok = false;
      for (const poly of outlinePolys) if (H.GEO.inPoly(x, y, poly)) ok = !ok;
      if (!ok) return false;
      for (const poly of outlinePolys) for (let i = 0; i < poly.length; i++) {
        const a = poly[i], q = poly[(i + 1) % poly.length];
        if (H.GEO.segDist(x, y, a[0], a[1], q[0], q[1]) < m) return false;
      }
      return true;
    };
    L.inside = inside;
    const rectCorners = (cx, cy, w, h, a) => {
      const c = Math.cos(a), s = Math.sin(a);
      return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]);
    };
    const circRectHit = (cx, cy, r, poly) => {
      if (H.GEO.inPoly(cx, cy, poly)) return true;
      for (let i = 0; i < 4; i++) { const a = poly[i], q = poly[(i + 1) % 4]; if (H.GEO.segDist(cx, cy, a[0], a[1], q[0], q[1]) < r) return true; }
      return false;
    };
    const rectRectHit = (p1, p2) => {
      const axes = [];
      for (const p of [p1, p2]) for (let i = 0; i < 2; i++) { const a = p[i], q = p[i + 1]; axes.push([-(q[1] - a[1]), q[0] - a[0]]); }
      for (const [ax, ay] of axes) {
        const pr = (p) => p.map(v => v[0] * ax + v[1] * ay);
        const A = pr(p1), Bb = pr(p2);
        if (Math.max(...A) < Math.min(...Bb) || Math.max(...Bb) < Math.min(...A)) return false;
      }
      return true;
    };
    const slotW = P.clicky.w + P.clicky.slotClr + P.clicky.relief;   // the widest part of the slot, over the arch
    const wall = 1.2;
    L.slots = [];
    if (cd) {
      for (const b of btns) {
        if (b.type !== 'clicky') continue;
        const gc = P.groups[b.group];
        const radial = Math.atan2(b.y - gc.y, b.x - gc.x);
        const tries = [];
        if (b.group === 'shoulder') tries.push(0, 90 * deg);
        else if (b.group === 'menu') tries.push(90 * deg, 0);
        else tries.push(radial, radial + 90 * deg, 0, 90 * deg);
        tries.push(45 * deg, 135 * deg);
        let chosen = null;
        for (const a of tries) {
          const len = cd.len + P.clicky.endClr;
          const poly = rectCorners(b.x, b.y, len + 2 * wall, slotW + 2 * wall, a);
          let bad = false;
          for (const c of cav) {
            if (c.who === b.id) continue;
            if (c.kind === 'c' && circRectHit(c.x, c.y, c.r, poly)) { bad = true; break; }
            if (c.kind === 'r' && rectRectHit(poly, [[c.x0, c.y0], [c.x1, c.y0], [c.x1, c.y1], [c.x0, c.y1]])) { bad = true; break; }
            if (c.kind === 'p' && rectRectHit(poly, c.poly)) { bad = true; break; }
          }
          const ends = rectCorners(b.x, b.y, len, slotW, a);
          if (!bad && ends.every(p => inside(p[0], p[1], 1.6))) { chosen = a; cav.push({ kind: 'p', poly, who: b.id + '-slot' }); break; }
        }
        if (chosen === null) { chosen = tries[0]; L.warn.push(b.id + ': no clear direction for its click element slot'); }
        b.ang = chosen;
        L.slots.push({ id: b.id, x: b.x, y: b.y, a: chosen, len: cd.len + P.clicky.endClr, w: slotW });
      }
    }
    // pairwise collisions of round cavities and containment
    for (let i = 0; i < cav.length; i++) {
      const c = cav[i];
      if (c.kind === 'c') {
        if (!inside(c.x, c.y, c.r + 1.6)) L.warn.push(c.who + ' is too close to the edge');
        for (let j = i + 1; j < cav.length; j++) {
          const d = cav[j];
          if (d.kind === 'c' && Math.hypot(c.x - d.x, c.y - d.y) < c.r + d.r + wall) L.warn.push(c.who + ' overlaps ' + d.who);
          if (d.kind === 'r') {
            const nx = Math.max(d.x0, Math.min(c.x, d.x1)), ny = Math.max(d.y0, Math.min(c.y, d.y1));
            if (Math.hypot(c.x - nx, c.y - ny) < c.r + wall) L.warn.push(c.who + ' overlaps the ' + d.who);
          }
        }
      }
    }
    L.cav = cav;

    // ---------------- nets and terminals
    const nets = new Map();
    const net = (name) => { if (!nets.has(name)) nets.set(name, { name, terms: [], pad: null }); return nets.get(name); };
    const R = P.route;
    const term = (n, x, y, r, what) => net(n).terms.push({ x, y, r: r || R.post, what });
    const mech = btns.filter(b => b.type !== 'touch');
    const touch = btns.filter(b => b.type === 'touch');
    if (mech.length) net('GND');
    if (touch.length) net('3V3');
    for (const b of btns) {
      if (b.type === 'flex') {
        const off = fd.colR + 0.55 + R.post;
        term(b.id, b.x + off, b.y, R.post, 'flex+'); term('GND', b.x - off, b.y, R.post, 'flex-');
        b.termOff = off;
      } else if (b.type === 'clicky') {
        const c = Math.cos(b.ang), s = Math.sin(b.ang), o = 1.6;
        term(b.id, b.x + c * o, b.y + s * o, R.post, 'pad+'); term('GND', b.x - c * o, b.y - s * o, R.post, 'pad-');
      } else if (b.type === 'touch') {
        const Tc = P.touch, rc = Tc.d / 2 - Tc.rim, xs = rc - Tc.spine / 2;
        term(b.id, b.x - xs, b.y, R.post, 'sense'); term('3V3', b.x + xs, b.y, R.post, 'drive');
      } else if (b.type === 'stick') {
        const sdd = L.stick, pr = sdd.Rw + 1.1;
        const dirs = [['RIGHT', 0], ['UP', 90], ['LEFT', 180], ['DOWN', 270]];
        for (const [n, a] of dirs) term(n, b.x + pr * Math.cos(a * deg), b.y + pr * Math.sin(a * deg), R.post, 'wall');
        const cr = sdd.Rw + 2.65;
        term('GND', b.x + cr * Math.cos(45 * deg), b.y + cr * Math.sin(45 * deg), R.post, 'com');
        b.pins = dirs.map(d => P.pins[d[0]]);
      }
    }
    // board side
    const usedPins = new Map();
    const logical = [];
    for (const b of btns) {
      if (b.id === 'STICK') logical.push('UP', 'LEFT', 'RIGHT', 'DOWN'); else logical.push(b.id);
    }
    for (const n of logical) {
      const pin = P.pins[n];
      if (!pin) { L.warn.push(n + ' has no pin'); continue; }
      if (usedPins.has(pin)) L.warn.push(pin + ' is assigned to both ' + usedPins.get(pin) + ' and ' + n);
      usedPins.set(pin, n);
    }
    if (nets.has('GND')) usedPins.set('GND', 'GND');
    if (nets.has('3V3')) usedPins.set('3V3', '3V3');
    L.usedPins = usedPins;
    L.bumps = [];
    if (B.mode !== 'wire') {
      for (const p of pads) {
        if (!usedPins.has(p.name)) continue;
        const nn = usedPins.get(p.name);
        const x = bd.cx + p.x, y = bd.cy + p.y;
        L.bumps.push({ net: nn, pad: p, x, y });
        term(nn, x, y, R.post, 'bump');
        nets.get(nn).pad = p.name;
      }
    }
    for (const c of L.cups) { if (nets.has(c.net)) term(c.net, c.x, c.y, 0.8, 'cup'); }
    for (const [n, o] of nets) { if (!o.pad && usedPins.has(P.pins[n] || n)) o.pad = P.pins[n] || n; }
    L.nets = [...nets.values()].filter(n => n.terms.length >= 2);
    for (const n of nets.values()) if (n.terms.length < 2) L.warn.push('net ' + n.name + ' has one terminal');
    // bezel pins: pick spots far from everything
    L.pegs = [];
    if (P.bezel.on && P.bezel.pins) {
      const cands = [];
      const Wd = P.shape.W;
      for (let x = -Wd / 2 + 6; x <= Wd / 2 - 6; x += 2) for (const y of [halfH - 5.5, -halfH + 5.5, 0, halfH - 9, -halfH + 9]) cands.push([x, y]);
      const clearOf = (x, y, r) => {
        if (!inside(x, y, 3.2)) return false;
        for (const c of cav) {
          if (c.kind === 'c' && Math.hypot(x - c.x, y - c.y) < c.r + r) return false;
          if (c.kind === 'r' && x > c.x0 - r && x < c.x1 + r && y > c.y0 - r && y < c.y1 + r) return false;
          if (c.kind === 'p' && circRectHit(x, y, r, c.poly)) return false;
        }
        return true;
      };
      const want = [[-Wd / 2, 0], [Wd / 2, 0], [-Wd / 4, halfH], [Wd / 4, halfH], [-Wd / 4, -halfH], [Wd / 4, -halfH]];
      for (const [wx, wy] of want) {
        let best = null, bd2 = 1e9;
        for (const [x, y] of cands) {
          if (!clearOf(x, y, 4.2)) continue;
          if (L.pegs.some(p => Math.hypot(p.x - x, p.y - y) < 20)) continue;
          const d = Math.hypot(x - wx, y - wy);
          if (d < bd2) { bd2 = d; best = { x, y }; }
        }
        if (best) L.pegs.push(best);
      }
      for (const p of L.pegs) cav.push({ kind: 'c', x: p.x, y: p.y, r: 2.4, who: 'peg' });
    }
    return L;
  }

  H.LAYOUT = { defaults, layout, outline, zeroPads, GPIOS, clickerDims, stickDims, flexDims, snapUp, snapN };
})(typeof globalThis !== 'undefined' ? globalThis : this);
