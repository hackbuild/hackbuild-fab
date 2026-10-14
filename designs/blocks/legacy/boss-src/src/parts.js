/* parts.js: BOSS part generators. Each returns
 *  { id, kind, name, cols, rows, top, objects:[{name, meshes:[Mesh], pose:{flip,dx,dy}}], ports:{name:{i,j,top,bottom}},
 *    model:{elements:[], controls:[]}, readout:[[k,v]], bom:[], hookup:[], warnings:[], fits:[], net:{} }
 */
(function (root) {
  'use strict';
  const K = root.K, B = root.BOSS, STD = B.STD, S = B.S;
  const P = STD.P;
  const cx = (i, cols) => (i - (cols - 1) / 2) * P, cy = (j, rows) => (j - (rows - 1) / 2) * P;
  const rho = slot => B.SLOTS[slot - 1].rho;
  const fmtR = r => r >= 1e6 ? (r / 1e6).toFixed(2) + ' Mohm' : r >= 1e3 ? (r / 1e3).toFixed(1) + ' kohm' : r.toFixed(0) + ' ohm';

  // ---------- boards ----------
  const BOARDS = {
    c3mini: { name: 'ESP32-C3 SuperMini', w: 18.0, l: 22.4, t: 1.0, pitch: 2.54, rowX: 8.75, n: 8, castellated: true, usb: '+y',
      left: ['5V', 'GND', '3V3', 'IO4', 'IO3', 'IO2', 'IO1', 'IO0'], right: ['IO5', 'IO6', 'IO7', 'IO8', 'IO9', 'IO10', 'IO20', 'IO21'],
      rails: { '5V': 5.0, 'GND': 0, '3V3': 3.3 }, adc: ['IO0', 'IO1', 'IO2', 'IO3', 'IO4', 'IO5'], vio: 3.3, touch: false },
    pico: { name: 'Raspberry Pi Pico', w: 21.0, l: 51.0, t: 1.0, pitch: 2.54, rowX: 8.89, n: 20, castellated: true, usb: '+y',
      left: ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND', 'GP6', 'GP7', 'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12', 'GP13', 'GND', 'GP14', 'GP15'],
      right: ['VBUS', 'VSYS', 'GND', '3V3_EN', '3V3', 'ADC_VREF', 'GP28', 'GND', 'GP27', 'GP26', 'RUN', 'GP22', 'GND', 'GP21', 'GP20', 'GP19', 'GP18', 'GND', 'GP17', 'GP16'],
      rails: { 'VBUS': 5.0, 'VSYS': 5.0, 'GND': 0, '3V3': 3.3 }, adc: ['GP26', 'GP27', 'GP28'], vio: 3.3, touch: false,
      defaultPins: ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9', 'GP10', 'VBUS', 'VSYS', 'GND', '3V3', 'GP28', 'GP27', 'GP26', 'GP22', 'GP21', 'GP20', 'GP19', 'GP18'] },
    teensy40: { name: 'Teensy 4.0', w: 17.78, l: 35.56, t: 1.6, pitch: 2.54, rowX: 7.62, n: 14, castellated: false, usb: '+y',
      left: ['GND', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      right: ['Vin', 'GND', '3.3V', '23', '22', '21', '20', '19', '18', '17', '16', '15', '14', '13'],
      rails: { 'Vin': 5.0, 'GND': 0, '3.3V': 3.3 }, adc: ['14', '15', '16', '17', '18', '19', '20', '21', '22', '23'], vio: 3.3, touch: true },
    custom: { name: 'custom board', w: 18, l: 24, t: 1.0, pitch: 2.54, rowX: 8.75, n: 8, castellated: true, usb: '+y', left: null, right: null, rails: {}, adc: [], vio: 3.3, touch: false }
  };
  const boardPins = (bd) => {
    const left = bd.left || Array.from({ length: bd.n }, (_, k) => 'L' + (k + 1));
    const right = bd.right || Array.from({ length: bd.n }, (_, k) => 'R' + (k + 1));
    const pins = [];
    for (let k = 0; k < bd.n; k++) { const y = (bd.n - 1) / 2 * bd.pitch - k * bd.pitch; pins.push({ name: left[k], side: 'L', k, x: -bd.rowX, y }); }
    for (let k = 0; k < bd.n; k++) { const y = (bd.n - 1) / 2 * bd.pitch - k * bd.pitch; pins.push({ name: right[k], side: 'R', k, x: bd.rowX, y }); }
    return pins;
  };

  // ---------- shared brick scaffolding ----------
  function brickBody(name, cols, rows, top) {
    const W = cols * P, H = rows * P;
    const outline = K.rrect(0, 0, W, H, 0.6, 3); // tiny corner radius so the outline never shares a support line with a hole row
    return new B.Body(name, outline, 0, top);
  }
  const portName = (i, j) => 'C' + (i + 1) + '.' + (j + 1);

  function finish(part, body, prefix, extraMeshes) {
    const built = body.build(prefix);
    for (const em of (extraMeshes || [])) { if (built.meshes[em.slot]) built.meshes[em.slot].merge(em); else built.meshes[em.slot] = em; }
    const meshes = Object.values(built.meshes).sort((a, b) => a.slot - b.slot);
    part.objects = part.objects || [];
    part.objects.unshift({ name: prefix, meshes });
    part.warnings = (part.warnings || []).concat(built.errors);
    part.fits = body.fits; part.notes = body.notes;
    // manifold audit per mesh
    for (const m of meshes) { const a = m.audit(); if (!a.ok) part.warnings.push(m.name + ': ' + a.bad + ' bad edges after vertex merge'); }
    // net check on conductive meshes
    const cond = meshes.filter(m => B.isCond(m.slot));
    if (cond.length && body.taps.length) {
      part.net = K.netCheck(cond, body.taps);
      for (const [a, b] of (part.expectJoined || [])) if (part.net.tapNet[a] !== part.net.tapNet[b] || part.net.tapNet[a] < 0) part.warnings.push('OPEN: ' + a + ' is not joined to ' + b);
      const roots = {};
      for (const t of body.taps) { const r = part.net.tapNet[t.name]; if (r < 0) { part.warnings.push('tap ' + t.name + ' hits no conductor'); continue; } const base = t.name.replace(/\.(sock|pin|pad|bump|top|comb|leg|t)$/, ''); (roots[r] = roots[r] || new Set()).add(base); }
      const groups = Object.values(roots).map(s => Array.from(s));
      for (const g of groups) if (g.length > 1 && !(part.allowShared || []).some(set => g.every(n => set.includes(n)))) part.warnings.push('SHORT: ' + g.join(' + '));
    }
    let tris = 0; for (const o of part.objects) for (const m of o.meshes) tris += m.tris;
    part.tris = tris;
    return part;
  }

  // ---------- SEAT ----------
  function autosize(bd, mount, nSel, hinge) {
    // width: board plus rails/hooks must clear the studs of the outer column rows
    const halfNeed = mount === 'snap' ? bd.w / 2 + 0.2 + 1.2 + (hinge === 'pin' ? 0.3 + 4.4 : 1.6 + 0.9) + 0.3 : bd.w / 2 + 0.8;
    let cols = 4; while ((cols - 1) * P / 2 - STD.studD / 2 - 0.4 < halfNeed) cols++;
    const halfLen = bd.l / 2 + (mount === 'snap' ? 3.2 : 1.2);
    let rows = 3; while ((rows - 1) * P / 2 - STD.studD / 2 - 0.4 < halfLen) rows++;
    const perSide = (c, r) => r + 2 * Math.floor((c - 2) / 2);
    while (perSide(cols, rows) < nSel) { if ((cols + 1) * rows <= cols * (rows + 1) && perSide(cols + 1, rows) > perSide(cols, rows)) cols++; else rows++; }
    // lane budget: traces leave the pad row outward and stack in lanes (0.8 pitch, two layers) between the pads and the outer posts
    const laneStart = bd.rowX + STD.padW / 2 + STD.clr + STD.traceW / 2;
    const lanes = c => Math.floor(((c - 1) * P / 2 - STD.postD / 2 - STD.clr - STD.traceW / 2 - laneStart) / 0.8) + 1;
    while (lanes(cols) < Math.ceil(nSel / 2) + 2) cols++;
    return { cols, rows, lanes: lanes(cols) };
  }
  function seatTargets(cols, rows) {
    // perimeter positions for the left and right sides, ordered top to bottom (matching pin order, USB at +y)
    const e = Math.floor((cols - 2) / 2);
    const mk = side => {
      const sx = side === 'L' ? -1 : 1, list = [];
      const endXs = []; for (let q = 1; q <= e; q++) endXs.push(sx * (cols - 1 - 2 * q) / 2 * P * -1); // from centre outward
      // top end (centre outward), then the side column from top to bottom, then bottom end (outward to centre)
      const endTop = endXs.map(x => ({ i: Math.round(x / P + (cols - 1) / 2), j: rows - 1 }));
      const endBot = endXs.map(x => ({ i: Math.round(x / P + (cols - 1) / 2), j: 0 })).reverse();
      const sideI = side === 'L' ? 0 : cols - 1;
      const sideCol = []; for (let j = rows - 1; j >= 0; j--) sideCol.push({ i: sideI, j });
      return endTop.concat(sideCol, endBot);
    };
    return { L: mk('L'), R: mk('R') };
  }
  const SEAT_PARAMS = [
    { k: 'board', label: 'board', type: 'select', options: Object.keys(BOARDS).map(k => [k, BOARDS[k].name]), def: 'c3mini' },
    { k: 'mount', label: 'mount', type: 'select', options: [['press', 'press fit header pins'], ['snap', 'bare board, snap frame']], def: 'press' },
    { k: 'pinLen', label: 'pin length', min: 3, max: 8, step: 0.5, def: 6, unit: 'mm', group: 'press' },
    { k: 'hinge', label: 'lid hinge', type: 'select', options: [['pin', 'filament pin hinge'], ['none', 'four hooks, no hinge']], def: 'pin', group: 'snap' },
    { k: 'cw', label: 'custom width', min: 10, max: 40, step: 0.1, def: 18, unit: 'mm', group: 'custom' },
    { k: 'cl', label: 'custom length', min: 10, max: 80, step: 0.1, def: 24, unit: 'mm', group: 'custom' },
    { k: 'cn', label: 'custom pins/side', min: 2, max: 24, step: 1, def: 8, group: 'custom' },
    { k: 'crow', label: 'custom row half spacing', min: 4, max: 20, step: 0.01, def: 8.75, unit: 'mm', group: 'custom' },
    { k: 'pins', label: 'pins with columns', type: 'pinset', def: null }
  ];
  function seat(p) {
    p = Object.assign(defaults(SEAT_PARAMS), p || {});
    let bd = Object.assign({}, BOARDS[p.board] || BOARDS.c3mini);
    if (p.board === 'custom') { bd.w = p.cw; bd.l = p.cl; bd.n = p.cn; bd.rowX = p.crow; }
    const pins = boardPins(bd);
    const selNames = p.pins && p.pins.length ? p.pins : (bd.defaultPins || pins.map(q => q.name));
    const selected = pins.map((q, idx) => selNames.includes(q.name) || selNames.includes(q.name + '#' + idx));
    const nSelL = pins.filter((q, i) => q.side === 'L' && selected[i]).length, nSelR = pins.filter((q, i) => q.side === 'R' && selected[i]).length;
    const sz = autosize(bd, p.mount, Math.max(nSelL, nSelR), p.hinge);
    const cols = sz.cols, rows = sz.rows;
    const part = { id: 'seat', kind: 'seat', name: 'SEAT ' + bd.name + ' ' + p.mount, cols, rows, params: p, board: bd, readout: [], bom: [], hookup: [], warnings: [], expectJoined: [], ports: {}, pinMap: [], model: { elements: [], controls: [] } };
    const snapMode = p.mount === 'snap';
    // heights
    let top;
    if (snapMode) top = STD.brickH; else top = B.snap(STD.padTop + STD.boreInPad + (p.pinLen - STD.boreInPad), true);
    const body = brickBody('seat', cols, rows, top);
    part.top = top;
    const T = seatTargets(cols, rows);
    // choose a centred window of targets for each side
    const pick = (list, n) => { const s = Math.max(0, Math.floor((list.length - n) / 2)); return list.slice(s, s + n); };
    const tl = pick(T.L, nSelL), tr = pick(T.R, nSelR);
    const used = new Set();
    let li = 0, ri = 0;
    const nets = [], obstacles = [];
    const padHalf = STD.padW / 2;
    // pins: pads or bumps, and the column they map to
    for (let idx = 0; idx < pins.length; idx++) {
      const q = pins[idx];
      if (!snapMode) {
        if (selected[idx]) B.pinPad(body, q.x, q.y, q.name + '.pin');
        else body.feature(S.VOID, K.circle(q.x, q.y, STD.boreD / 2, 24), STD.padTop, top + 1, 'plain bore');
      } else if (selected[idx]) {
        // contact bump under the castellation / pad ring: 1.4 (y) x 2.0 (x), rises 0.48 above the deck
        const bx = q.side === 'L' ? -(bd.w / 2 - 1.0) : (bd.w / 2 - 1.0);
        body.feature(S.CPLA, K.rectC(bx, q.y, 2.0, 1.4), STD.L1, top + 0.48, 'bump ' + q.name);
        body.tap(q.name + '.pin', bx, q.y, STD.L1 + 0.3);
        q.x = bx;
      }
      if (!selected[idx]) continue;
      obstacles.push({ shape: 'rect', x0: q.x - (snapMode ? 1.0 : padHalf), y0: q.y - (snapMode ? 0.7 : padHalf), x1: q.x + (snapMode ? 1.0 : padHalf), y1: q.y + (snapMode ? 0.7 : padHalf) });
      const tgt = q.side === 'L' ? tl[li++] : tr[ri++];
      const X = cx(tgt.i, cols), Y = cy(tgt.j, rows);
      used.add(tgt.i + ',' + tgt.j);
      B.column(body, X, Y, { name: q.name, top });
      part.ports[q.name] = { i: tgt.i, j: tgt.j, top: true, bottom: true, pin: q.name };
      part.pinMap.push({ pin: q.name, col: portName(tgt.i, tgt.j), i: tgt.i, j: tgt.j });
      obstacles.push({ shape: 'circle', cx: X, cy: Y, r: STD.postD / 2 });
      nets.push({ name: q.name, a: [q.x, q.y], b: [X, Y], own: [obstacles.length - 2, obstacles.length - 1], prefer: (q.k % 2) });
      part.expectJoined.push([q.name + '.pin', q.name]);
    }
    // the seat zone on top: board, rails, hooks, knuckles (snap) or the header footprint (press)
    let zoneHalfW = snapMode ? bd.w / 2 + 4.6 : bd.w / 2 + 0.6, zoneHalfL = snapMode ? bd.l / 2 + 3.4 : bd.l / 2 + 0.6;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (used.has(i + ',' + j)) continue;
      const X = cx(i, cols), Y = cy(j, rows);
      const inZone = Math.abs(X) < zoneHalfW + STD.studD / 2 && Math.abs(Y) < zoneHalfL + STD.studD / 2;
      B.plainColumn(body, X, Y, { top, stud: !inZone });
    }
    // route
    const half = (cols * P) / 2, halfL = (rows * P) / 2;
    const r = B.route({ x0: -half, y0: -halfL, x1: half, y1: halfL, obstacles, nets: nets.map(n => Object.assign({}, n)), layers: 2 });
    for (const path of r.paths) {
      const R = B.traceFeature(body, path, path.name);
      const pinR = R + B.barR(rho(S.CPLA), top - STD.L1, Math.PI * (STD.postD / 2) ** 2) + 400; // trace + post + socket contact estimate
      part.model.elements.push({ type: 'R', a: 'pin:' + path.name, b: path.name, R: pinR });
    }
    for (const f of r.failed) part.warnings.push('ROUTE FAILED: ' + f);
    // snap frame
    const extra = [];
    if (snapMode) {
      const railH = 0.48 + bd.t + 0.3, railT = 1.2, rx = bd.w / 2 + 0.2;
      const zr0 = top - 0.02, zr1 = top + railH;
      // long rails with a gap in the middle? full length, PETG, outside the bumps
      for (const sx of [-1, 1]) body.outside(S.PETG, K.rect(sx * rx, -bd.l / 2 - 0.2, sx * (rx + railT), bd.l / 2 + 0.2), zr0, zr1, 'rail');
      // end walls: solid at -y, notched 10 wide at the USB end (+y)
      const ey = bd.l / 2 + 0.2;
      body.outside(S.PETG, K.rect(-rx - railT, -ey - railT, rx + railT, -ey + 0.02), zr0, zr1, 'end wall');
      body.outside(S.PETG, K.rect(-rx - railT, ey - 0.02, -5, ey + railT), zr0, zr1, 'end wall usb');
      body.outside(S.PETG, K.rect(5, ey - 0.02, rx + railT, ey + railT), zr0, zr1, 'end wall usb');
      // hook pockets in the body top (right side, and left side when there is no hinge)
      const hookY = [-(bd.l / 2 - 5), (bd.l / 2 - 5)];
      const hookX0 = rx + railT + 0.3, hookW = 1.6, pocketD = 3.0;
      const hookSides = p.hinge === 'pin' ? [1] : [-1, 1];
      for (const sx of hookSides) for (const hy of hookY) {
        const x0 = sx > 0 ? hookX0 : -(hookX0 + hookW), x1 = x0 + hookW;
        body.feature(S.VOID, K.rect(x0, hy - 3.4, x1, hy + 3.4), top - pocketD, top + 0.1, 'hook pocket');
        // undercut ledge: the pocket widens outward by 0.6 in its lowest 0.8
        const ux0 = sx > 0 ? x1 : x0 - 0.6, ux1 = sx > 0 ? x1 + 0.6 : x0;
        body.feature(S.VOID, K.rect(ux0, hy - 3.4, ux1, hy + 3.4), top - pocketD, top - pocketD + 0.8, 'hook undercut');
      }
      // hinge knuckles on the body (-x side)
      const lidT = 2.4, axisZ = top + railH + lidT / 2, kR = 2.2;
      const kx = -(rx + railT + 0.3 + kR); // knuckle centre x
      if (p.hinge === 'pin') {
        for (const ky of [-(bd.l / 2 - 4), (bd.l / 2 - 4)]) {
          // block from the body top up to the axis, then the round knuckle with its bore, extruded along y
          const prof = K.union(K.rect(kx - kR, top - 0.02, kx + kR, axisZ), K.circle(kx, axisZ, kR, 32)); // in (x,z)
          const withBore = K.diff(prof, K.circle(kx, axisZ, 1.0, 24));
          const m = new K.Mesh('seat knuckle', S.PETG); m.prism(withBore, ky - 3.0, ky + 3.0, { axis: 'y', kind: 'knuckle' });
          extra.push(m);
        }
      }
      // LID: printed flat beside the body, inner face up, at -x
      const lw = 2 * (rx + railT) + (p.hinge === 'pin' ? 0 : 2 * (hookW + 0.6 + 0.3)) , ll = bd.l + 2 * (0.2 + railT);
      const lid = new B.Body('lid', K.rrect(0, 0, lw + (p.hinge === 'pin' ? 2 * (0.3 + 2 * kR) : 0), ll, 0.6, 3), 0, lidT);
      // window: leaves 4 mm bars over each pad row and 3 mm end bars, open at the USB end for the connector
      const win = K.union(K.rect(-(bd.w / 2 - 4.0), -(bd.l / 2 - 3.0), bd.w / 2 - 4.0, bd.l / 2 - 3.0), K.rect(-5, bd.l / 2 - 3.5, 5, ll / 2 + 1));
      lid.feature(S.VOID, win, -1, lidT + 1, 'window');
      // ribs (TPU) over the bumps, standing up in print pose (they hang down when the lid is folded over)
      const ribH = 0.72, span = (bd.n - 1) * bd.pitch + 2.0;
      for (const sx of [-1, 1]) lid.outside(S.TPU, K.rectC(sx * (bd.w / 2 - 1.0), 0, 1.2, span), lidT, lidT + ribH, 'rib');
      // hooks (TPU): stand on the lid outside the rail line, barb inward at the tip
      const hookLen = lidT + railH + pocketD - 0.4;
      for (const sx of hookSides) for (const hy of hookY) {
        const x0 = sx > 0 ? hookX0 + 0.2 : -(hookX0 + hookW - 0.2), x1 = x0 + hookW - 0.4;
        lid.outside(S.TPU, K.rect(x0, hy - 3.0, x1, hy + 3.0), lidT, lidT + hookLen, 'hook');
        const bx0 = sx > 0 ? x1 - 0.02 : x0 - 0.5, bx1 = sx > 0 ? x1 + 0.5 : x0 + 0.02;
        lid.outside(S.TPU, K.rect(bx0, hy - 3.0, bx1, hy + 3.0), lidT + hookLen - 0.8, lidT + hookLen, 'barb');
      }
      if (p.hinge === 'pin') {
        // lid knuckle along the -x edge between the body knuckles, bore along y
        const lkx = -(lw / 2 + 0.3 + kR);
        const prof = K.diff(K.union(K.rect(lkx, 0, lkx + kR + 0.3, lidT), K.circle(lkx, lidT / 2, kR, 32)), K.circle(lkx, lidT / 2, 1.0, 24));
        const m = new K.Mesh('lid knuckle', S.PETG); m.prism(prof, -(bd.l / 2 - 7.3), (bd.l / 2 - 7.3), { axis: 'y', kind: 'knuckle' });
        const lb = lid.build('lid'); if (lb.meshes[S.PETG]) lb.meshes[S.PETG].merge(m); else lb.meshes[S.PETG] = m; const lm = Object.values(lb.meshes).sort((a, b) => a.slot - b.slot);
        part.objects = [{ name: 'lid', meshes: lm, pose: { dx: -(half + lw / 2 + 2 * kR + 4), dy: 0 } }];
        part.warnings.push.apply(part.warnings, lb.errors);
        part.bom.push('2 x 8 mm of 1.75 mm filament as hinge pins (push in from the gap between the knuckle pairs)');
      } else {
        const lb = lid.build('lid'); part.objects = [{ name: 'lid', meshes: Object.values(lb.meshes), pose: { dx: -(half + lw / 2 + 4), dy: 0 } }];
        part.warnings.push.apply(part.warnings, lb.errors);
      }
      body.fit('rib press onto board', 0.3, 0.2, 0.6);
      body.fit('rail to stud clearance', (cols - 1) * P / 2 - STD.studD / 2 - (rx + railT + (p.hinge === 'pin' ? 0.3 + 2 * kR : hookW + 0.9)), 0.3, 99);
      body.fit('bump pitch web', bd.pitch - 1.4, 0.6, 99);
      part.readout.push(['board rests on', '2 x ' + nSelL + '/' + nSelR + ' contact bumps, 0.48 proud'], ['lid', p.hinge === 'pin' ? 'pin hinge + 2 hooks' : '4 hooks']);
      if (!bd.castellated) part.warnings.push('note: ' + bd.name + ' is not castellated; the bumps land on the underside annular rings, fine for a bare board');
    } else {
      body.fit('pin bore engagement', p.pinLen - 0.02, 3, 12);
      body.fit('pad web between pins', bd.pitch - STD.padW, 0.6, 99);
      part.readout.push(['header sits', 'on the deck, pins ' + p.pinLen + ' mm into 0.9 bores, tips in cPLA cups'], ['seat height', top.toFixed(2) + ' mm (' + Math.round(top / B.L) + ' layers)']);
    }
    part.readout.push(['brick', cols + ' x ' + rows + ' studs, ' + (cols * P) + ' x ' + (rows * P) + ' mm'], ['columns', (nSelL + nSelR) + ' conductive, ' + (cols * rows - (nSelL + nSelR)) + ' plain'], ['routed', r.paths.length + '/' + nets.length + ' on ' + (r.paths.filter(q => q.layer === 0).length) + ' L1 / ' + (r.paths.filter(q => q.layer === 1).length) + ' L2']);
    const Rs = part.model.elements.map(e => e.R); if (Rs.length) part.readout.push(['pin to stud R', fmtR(Math.min.apply(null, Rs)) + ' to ' + fmtR(Math.max.apply(null, Rs))]);
    part.hookup.push('every selected pin owns one perimeter column: stud on top, socket underneath, same net.', 'printed cPLA paths are kilohm class: fine for GPIO, ADC, touch and I2C with pull ups; not for motor or amp power.');
    part.bom.push(bd.name + (snapMode ? ' bare' : ' with male headers fitted'));
    // sim model: board pins are nodes 'pin:NAME'
    part.model.board = { key: p.board, name: bd.name, rails: bd.rails, adc: bd.adc, vio: bd.vio, pins: pins.filter((q, i) => selected[i]).map(q => q.name) };
    part.allowShared = [];
    return finish(part, body, 'seat', extra);
  }

  // ---------- PLATE ----------
  const PLATE_PARAMS = [
    { k: 'cols', label: 'columns', min: 2, max: 24, step: 1, def: 8 },
    { k: 'rows', label: 'rows', min: 2, max: 24, step: 1, def: 8 },
    { k: 'nets', label: 'nets', type: 'nets', def: [] } // [[ [i,j], [i,j], ... ], ...]
  ];
  function plate(p) {
    p = Object.assign(defaults(PLATE_PARAMS), p || {});
    const cols = p.cols | 0, rows = p.rows | 0;
    const thk = 3.6; // 15 layers: 0.96 floor, L1 0.96..1.68, gap, L2 2.16..2.88, 0.72 roof
    const L1 = 0.96, L2 = 2.16;
    const part = { id: 'plate', kind: 'plate', name: 'PLATE ' + cols + 'x' + rows, cols, rows, top: thk, params: p, readout: [], bom: [], hookup: [], warnings: [], ports: {}, expectJoined: [], model: { elements: [], controls: [] }, allowShared: [] };
    const body = new B.Body('plate', K.rrect(0, 0, cols * P, rows * P, 0.6, 3), 0, thk);
    const inNet = new Map();
    (p.nets || []).forEach((net, ni) => net.forEach(c => inNet.set(c[0] + ',' + c[1], ni)));
    const obstacles = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const X = cx(i, cols), Y = cy(j, rows), key = i + ',' + j, name = portName(i, j);
      if (inNet.has(key)) {
        body.feature(S.CPLA, K.circle(X, Y, STD.postD / 2, 48), L1, thk, 'post ' + name);
        body.outside(S.CPLA, K.circle(X, Y, STD.postD / 2, 48), thk - 0.02, thk + 0.02, 'post tip');
        body.outside(S.CPLA, K.circle(X, Y, STD.studD / 2, 48), thk, thk + STD.studH, 'stud ' + name);
        body.tap(name, X, Y, thk + 0.5);
        part.ports[name] = { i, j, top: true, bottom: false };
        obstacles.push({ shape: 'circle', cx: X, cy: Y, r: STD.postD / 2 });
      } else body.outside(S.PETG, K.circle(X, Y, STD.studD / 2, 48), thk - 0.02, thk + STD.studH, 'plain stud');
    }
    // route every net as a chain (nearest neighbour order)
    const nets = [];
    (p.nets || []).forEach((net, ni) => {
      const cells = net.slice(); if (cells.length < 2) return;
      const done = [cells.shift()];
      while (cells.length) {
        const last = done[done.length - 1]; let bi = 0, bd = Infinity;
        cells.forEach((c, k) => { const d = Math.abs(c[0] - last[0]) + Math.abs(c[1] - last[1]); if (d < bd) { bd = d; bi = k; } });
        const nx = cells.splice(bi, 1)[0];
        const oa = obstacles.findIndex(o => Math.abs(o.cx - cx(last[0], cols)) < 0.01 && Math.abs(o.cy - cy(last[1], rows)) < 0.01);
        const ob = obstacles.findIndex(o => Math.abs(o.cx - cx(nx[0], cols)) < 0.01 && Math.abs(o.cy - cy(nx[1], rows)) < 0.01);
        nets.push({ name: 'N' + (ni + 1) + '.' + done.length, a: [cx(last[0], cols), cy(last[1], rows)], b: [cx(nx[0], cols), cy(nx[1], rows)], own: [oa, ob], netIdx: ni, from: portName(last[0], last[1]), to: portName(nx[0], nx[1]) });
        done.push(nx);
        part.allowShared.push(done.map(c => portName(c[0], c[1])));
      }
    });
    const half = cols * P / 2, halfL = rows * P / 2;
    const r = B.route({ x0: -half, y0: -halfL, x1: half, y1: halfL, obstacles, nets, layers: 2 });
    for (const path of r.paths) {
      const z0 = path.layer === 0 ? L1 : L2;
      body.feature(S.CPLA, K.stroke(path.pts, STD.traceW, 'round', 16), z0, z0 + STD.traceT, 'trace ' + path.name);
      const n = nets.find(q => q.name === path.name);
      part.model.elements.push({ type: 'R', a: n.from, b: n.to, R: B.barR(rho(S.CPLA), path.len, STD.traceW * STD.traceT) });
      part.expectJoined.push([n.from, n.to]);
    }
    for (const f of r.failed) { part.warnings.push('ROUTE FAILED: ' + f); }
    part.readout.push(['plate', cols + ' x ' + rows + ', ' + (cols * P) + ' x ' + (rows * P) + ' x ' + thk + ' mm'], ['nets', (p.nets || []).length + ', ' + r.paths.length + ' traces routed']);
    if (r.paths.length) { const Rs = part.model.elements.map(e => e.R); part.readout.push(['trace R', fmtR(Math.min.apply(null, Rs)) + ' to ' + fmtR(Math.max.apply(null, Rs))]); }
    part.hookup.push('studs in a net are joined by buried cPLA traces; every other stud is plain PETG.');
    return finish(part, body, 'plate');
  }

  // ---------- WIRE ----------
  const WIRE_PARAMS = [
    { k: 'shape', label: 'shape', type: 'select', options: [['straight', 'straight'], ['arc', 'arc'], ['spiral', 'spiral (coiled flat)'], ['zigzag', 'zigzag'], ['s', 'S bend']], def: 'straight' },
    { k: 'len', label: 'length', min: 10, max: 400, step: 1, def: 80, unit: 'mm' },
    { k: 'core', label: 'core material', type: 'select', options: [[4, 'conductive TPU (flex)'], [2, 'conductive PLA (stiffer, 50x lower R)']], def: 4 },
    { k: 'coreW', label: 'core width', min: 0.8, max: 2.4, step: 0.1, def: 1.2, unit: 'mm' },
    { k: 'sheathW', label: 'sheath width', min: 2.0, max: 5.0, step: 0.1, def: 3.2, unit: 'mm' },
    { k: 'endA', label: 'end A', type: 'select', options: [['stud', 'stud cap'], ['bare', 'bare core']], def: 'stud' },
    { k: 'endB', label: 'end B', type: 'select', options: [['stud', 'stud cap'], ['bare', 'bare core']], def: 'stud' },
    { k: 'radius', label: 'arc / bend radius', min: 5, max: 100, step: 1, def: 30, unit: 'mm', group: 'shape' },
    { k: 'amp', label: 'zigzag amplitude', min: 3, max: 30, step: 0.5, def: 8, unit: 'mm', group: 'shape' },
    { k: 'period', label: 'zigzag period', min: 6, max: 60, step: 0.5, def: 16, unit: 'mm', group: 'shape' },
    { k: 'pitch', label: 'spiral pitch', min: 4, max: 12, step: 0.5, def: 5.5, unit: 'mm', group: 'shape' }
  ];
  function wirePath(p) {
    const L = p.len, pts = [];
    const add = (x, y) => pts.push([x, y]);
    if (p.shape === 'straight') { add(0, 0); add(L, 0); }
    else if (p.shape === 'arc') {
      const R = Math.max(p.radius, p.sheathW), sweep = Math.min(L / R, Math.PI * 1.9), n = Math.max(8, Math.ceil(sweep * R / 2));
      for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + sweep * i / n; add(R * Math.cos(t), R + R * Math.sin(t)); }
    } else if (p.shape === 'spiral') {
      // archimedean r = r0 + b*theta, arc length integrated numerically until L
      const b = p.pitch / (2 * Math.PI), r0 = Math.max(4, p.sheathW * 1.2); let th = 0, s = 0; add(r0, 0);
      while (s < L) { const r = r0 + b * th; const dth = 1.2 / r; th += dth; s += Math.hypot(r * dth, b * dth); const rr = r0 + b * th; add(rr * Math.cos(th), rr * Math.sin(th)); }
    } else if (p.shape === 'zigzag') {
      const A = p.amp, T = p.period; let s = 0, x = 0; add(0, 0);
      const seg = Math.hypot(T / 2, 2 * A); let up = 1;
      while (s < L) { s += seg; x += T / 2; add(x, up * A); up = -up; }
      const last = pts[pts.length - 1]; pts.push([last[0] + 3, last[1] > 0 ? A : -A]);
    } else if (p.shape === 's') {
      const R = Math.max(p.radius, p.sheathW), n = 12; const l1 = Math.max(5, (L - Math.PI * R) / 2);
      add(0, 0); add(l1, 0);
      for (let i = 1; i <= n; i++) { const t = -Math.PI / 2 + Math.PI / 2 * i / n; add(l1 + R * Math.cos(t), R + R * Math.sin(t)); }
      for (let i = 1; i <= n; i++) { const t = Math.PI / 2 * i / n; add(l1 + 2 * R - R * Math.cos(t), R + R * Math.sin(t)); }
      add(2 * l1 + 2 * R, 2 * R);
    }
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return { pts, len };
  }
  function trimPath(pts, d0, d1) {
    // shorten a polyline by d0 at the start and d1 at the end
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1]; const at = s => { s = Math.max(0, Math.min(L, s)); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]); return [pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])]; };
    const out = [at(d0)]; for (let i = 0; i < pts.length; i++) if (cum[i] > d0 && cum[i] < L - d1) out.push(pts[i]); out.push(at(L - d1));
    return out;
  }
  function wire(p) {
    p = Object.assign(defaults(WIRE_PARAMS), p || {});
    const path = wirePath(p);
    const pts = path.pts, coreSlot = +p.core;
    const part = { id: 'wire', kind: 'wire', name: 'WIRE ' + p.shape + ' ' + Math.round(path.len) + ' mm', params: p, readout: [], bom: [], hookup: [], warnings: [], ports: {}, model: { elements: [], controls: [] }, objects: [] };
    const zS = 1.92, zc0 = 0.48, zc1 = 1.44, capSq = 7.6, capH = STD.sockH + STD.flangeH + 2.16, n = 32;
    const sheath = new K.Mesh('wire sheath TPU', S.TPU), core = new K.Mesh('wire core ' + (coreSlot === S.CTPU ? 'cTPU' : 'cPLA'), coreSlot);
    const capMeshes = coreSlot === S.CTPU ? core : new K.Mesh('wire cap conductor cTPU', S.CTPU);
    const ends = [p.endA, p.endB];
    const trim = ends.map(e => e === 'bare' ? 5 : 0);
    const sp = trimPath(pts, trim[0], trim[1]);
    const coreMP = K.stroke(pts, p.coreW, 'round', 16), sheathMP = K.stroke(sp, p.sheathW, 'round', 24);
    const A = pts[0], Bp = pts[pts.length - 1];
    let capUnion = [];
    const capFeatures = [];
    ends.forEach((e, ei) => {
      if (e !== 'stud') return;
      const c = ei === 0 ? A : Bp;
      const sq = K.rrect(c[0], c[1], capSq, capSq, 0.8, 4);
      capUnion = K.union(capUnion, K.rrect(c[0], c[1], capSq - 0.04, capSq - 0.04, 0.8, 4));
      // conductor: socket ring, flange, post, stud; core joins the ring (same mesh if cTPU core)
      const ringMP = K.ring2(c[0], c[1], STD.sockOD / 2, STD.sockID_flex / 2, n);
      capFeatures.push({ c, sq, ringMP });
    });
    // sheath bands with the core cut out of the middle band and cap footprints cut out entirely
    const sheathNoCaps = K.diff(sheathMP, capUnion);
    // sandwich: full bands abut the core exactly, the holed band overlaps the full ones (same slot) by 0.02
    sheath.prism(sheathNoCaps, 0, zc0, { kind: 'sheath' });
    sheath.prism(K.diff(sheathNoCaps, coreMP), zc0 - 0.02, zc1 + 0.02, { kind: 'sheath' });
    sheath.prism(sheathNoCaps, zc1, zS, { kind: 'sheath' });
    // caps: TPU body around the conductor column, minus the core channel in the core band
    for (const cf of capFeatures) {
      const col = K.circle(cf.c[0], cf.c[1], STD.sockOD / 2, n);
      const bodyMP = K.diff(cf.sq, col);
      sheath.prism(bodyMP, 0, zc0, { kind: 'cap' });
      sheath.prism(K.diff(bodyMP, coreMP), zc0 - 0.02, zc1 + 0.02, { kind: 'cap' });
      sheath.prism(K.diff(bodyMP, K.circle(cf.c[0], cf.c[1], STD.postD / 2 + 0.01, n)), zc1, capH, { kind: 'cap' });
      // conductor stack (cTPU so the ring grips): ring, then a solid post to the top, then the stud
      capMeshes.prism(cf.ringMP, 0, STD.sockH, { kind: 'ring', shrink: true });
      capMeshes.prism(col, STD.sockH - 0.02, STD.sockH + STD.flangeH, { kind: 'flange', shrink: true });
      capMeshes.prism(K.circle(cf.c[0], cf.c[1], STD.postD / 2, n), STD.sockH + STD.flangeH - 0.02, capH + 0.02, { kind: 'post', shrink: true });
      capMeshes.prism(K.circle(cf.c[0], cf.c[1], STD.studD / 2, n), capH, capH + STD.studH, { kind: 'stud', shrink: true });
      // core end inside the cap: if the core is cPLA it stops at the ring wall; the ring is cTPU either way
    }
    // core: full path, but if the core is cPLA it must not overlap the cTPU ring: cut the ring's inner void region
    let coreFinal = coreMP;
    // the core must not cross the socket cavity (the stud goes there): a cTPU core ends in the ring wall, a cPLA core ends at the ring's outer face
    for (const cf of capFeatures) coreFinal = K.diff(coreFinal, K.circle(cf.c[0], cf.c[1], coreSlot === S.CTPU ? STD.sockID_flex / 2 + 0.3 : STD.sockOD / 2, n));
    core.prism(coreFinal, zc0, zc1, { kind: 'core', shrink: true });
    const meshes = [sheath, core]; if (capMeshes !== core && capFeatures.length) meshes.push(capMeshes);
    part.objects.push({ name: 'wire', meshes });
    const R = B.barR(rho(coreSlot), path.len, p.coreW * (zc1 - zc0));
    part.model.elements.push({ type: 'R', a: 'A', b: 'B', R });
    part.ports.A = { end: 'A', top: p.endA === 'stud', bottom: p.endA === 'stud' }; part.ports.B = { end: 'B', top: p.endB === 'stud', bottom: p.endB === 'stud' };
    part.len = path.len; part.pts = pts;
    const bb = sheath.bounds();
    part.readout.push(['path length', path.len.toFixed(1) + ' mm'], ['footprint', (bb[3] - bb[0]).toFixed(1) + ' x ' + (bb[4] - bb[1]).toFixed(1) + ' mm'], ['core R', fmtR(R)], ['verdict', R < 1e5 ? 'signal and ADC fine' : R < 1e6 ? 'digital fine, ADC needs a 100 nF at the pin' : 'digital only (slow edges), no analog']);
    part.hookup.push('stud caps plug onto any BOSS or LEGO stud and take a stud on top; bare ends clip, tape or screw down.');
    for (const m of meshes) { const a = m.audit(); if (!a.ok) part.warnings.push(m.name + ': ' + a.bad + ' bad edges'); }
    part.tris = meshes.reduce((s, m) => s + m.tris, 0);
    part.fits = [{ label: 'sheath wall each side', value: (p.sheathW - p.coreW) / 2, lo: 0.6, hi: 99, unit: 'mm', ok: (p.sheathW - p.coreW) / 2 >= 0.6 }];
    return part;
  }

  // ---------- component bricks ----------
  // helper: a cols x rows brick with conductive columns at given cells and plain columns elsewhere
  function compBase(id, cols, rows, condCells, top, noStud) {
    const body = brickBody(id, cols, rows, top);
    const ports = {}; const posts = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const X = cx(i, cols), Y = cy(j, rows), key = i + ',' + j, name = portName(i, j);
      const cc = condCells.find(c => c.i === i && c.j === j);
      const studOn = !(noStud || []).some(c => c.i === i && c.j === j);
      if (cc) { B.column(body, X, Y, { name: cc.name, top, stud: studOn }); ports[cc.name] = { i, j, top: studOn, bottom: true }; posts.push({ shape: 'circle', cx: X, cy: Y, r: STD.postD / 2, name: cc.name, X, Y }); }
      else B.plainColumn(body, X, Y, { top, stud: studOn });
    }
    return { body, ports, posts };
  }
  function routeTo(body, posts, nets, cols, rows, extraObs) {
    const half = cols * P / 2, halfL = rows * P / 2;
    const obstacles = posts.map(q => ({ shape: 'circle', cx: q.cx, cy: q.cy, r: q.r })).concat(extraObs || []);
    const rn = nets.map(n => { const ti = posts.findIndex(q => q.name === n.to); return { name: n.name, a: n.from, b: [posts[ti].X, posts[ti].Y], own: [ti].concat(n.ownExtra || []), layer: n.layer }; });
    const r = B.route({ x0: -half, y0: -halfL, x1: half, y1: halfL, obstacles, nets: rn, layers: 2 });
    const Rs = {}; for (const path of r.paths) Rs[path.name] = B.traceFeature(body, path, path.name);
    return { r, Rs, obstacles };
  }
  const postR = top => B.barR(rho(S.CPLA), top - STD.L1, Math.PI * (STD.postD / 2) ** 2) + 400;

  // JUMPER: 1 x n pass through; bus mode joins every column on L1
  const JUMPER_PARAMS = [{ k: 'n', label: 'length (studs)', min: 1, max: 8, step: 1, def: 2 }, { k: 'bus', label: 'join all (bus)', type: 'bool', def: false }, { k: 'h', label: 'height', type: 'select', options: [[3.2, 'plate 3.2'], [9.6, 'brick 9.6']], def: 9.6 }];
  function jumper(p) {
    p = Object.assign(defaults(JUMPER_PARAMS), p || {});
    const n = p.n | 0, top = +p.h >= 9 ? STD.brickH : 6.0;
    const cells = []; for (let i = 0; i < n; i++) cells.push({ i, j: 0, name: portName(i, 0) });
    const { body, ports, posts } = compBase('jumper', n, 1, cells, top);
    const part = { id: 'jumper', kind: 'brick', name: (p.bus ? 'BUS ' : 'JUMPER ') + '1x' + n, cols: n, rows: 1, top, params: p, ports, readout: [], bom: [], hookup: [], warnings: [], expectJoined: [], model: { elements: [], controls: [] }, allowShared: [] };
    if (p.bus && n > 1) {
      // L1 bar through all posts
      body.feature(S.CPLA, K.rectC(0, 0, (n - 1) * P + STD.postD, 1.6), STD.L1, STD.L1 + STD.traceT, 'bus bar');
      for (let i = 0; i + 1 < n; i++) { part.model.elements.push({ type: 'R', a: cells[i].name, b: cells[i + 1].name, R: B.barR(rho(S.CPLA), P, 1.6 * STD.traceT) }); part.expectJoined.push([cells[i].name, cells[i + 1].name]); }
      part.allowShared.push(cells.map(c => c.name));
    }
    for (const c of cells) part.model.elements.push({ type: 'pass', a: c.name, R: postR(top) });
    part.readout.push(['columns', n + (p.bus ? ' joined' : ' isolated')], ['through R', fmtR(postR(top))]);
    part.hookup.push(p.bus ? 'a printed bus bar: every stud on this brick is one net.' : 'each stud passes straight through to the socket under it: a spacer that keeps the wiring.');
    return finish(part, body, 'jumper');
  }

  // TOUCH: 2x2 with a flush cPLA pad on top, one column
  const TOUCH_PARAMS = [{ k: 'padW', label: 'pad size', min: 8, max: 13, step: 0.5, def: 12, unit: 'mm' }];
  function touch(p) {
    p = Object.assign(defaults(TOUCH_PARAMS), p || {});
    const top = STD.brickH, cols = 2, rows = 2;
    const { body, ports, posts } = compBase('touch', cols, rows, [{ i: 0, j: 0, name: 'PAD' }], top, [{ i: 0, j: 0 }, { i: 1, j: 0 }, { i: 0, j: 1 }, { i: 1, j: 1 }]);
    const part = { id: 'touch', kind: 'brick', name: 'TOUCH 2x2', cols, rows, top, params: p, ports, readout: [], bom: [], hookup: [], warnings: [], expectJoined: [['PAD.top', 'PAD']], model: { elements: [], controls: [{ k: 'touched', label: 'finger on pad', type: 'bool', def: false }] } };
    const padZ = top - STD.traceT;
    body.feature(S.CPLA, K.rrect(0, 0, p.padW, p.padW, 1.5, 6), padZ, top, 'pad');
    body.feature(S.CPLA, K.circle(0, 0, STD.postD / 2, 32), STD.L1, padZ + 0.02, 'pad post');
    body.tap('PAD.top', 0, 0, top - 0.3);
    const { r, Rs } = routeTo(body, posts, [{ name: 'pad', from: [0, 0], to: 'PAD', ownExtra: [posts.length] }], cols, rows, [{ shape: 'circle', cx: 0, cy: 0, r: STD.postD / 2 }]);
    // the pad post at the centre is an obstacle for nothing else; own it
    for (const f of r.failed) part.warnings.push('ROUTE FAILED ' + f);
    const R = (Rs.pad || 0) + postR(top);
    const C = 8.854e-12 * 3.0 * (80e-6) / 0.5e-3 * 1e12; // pF: grounded fingertip 80 mm2 through 0.5 mm of skin/air, er 3
    part.model.elements.push({ type: 'touch', a: 'PAD', R, dC: C });
    part.readout.push(['pad', p.padW + ' x ' + p.padW + ' mm cPLA, flush'], ['lead R', fmtR(R)], ['touch delta C', C.toFixed(1) + ' pF class']);
    part.hookup.push('touch pin (Teensy touchRead, ESP32 S2/S3 touch) or RC charge time on any GPIO with 1 M to 3V3; the C3 and Pico have no touch peripheral, use RC timing.');
    return finish(part, body, 'touch');
  }

  // FORCE: 2x2 interdigitated comb on top, two columns, plus a cTPU membrane part that drops into a rim
  const FORCE_PARAMS = [{ k: 'fingers', label: 'fingers', min: 4, max: 10, step: 1, def: 6 }];
  function force(p) {
    p = Object.assign(defaults(FORCE_PARAMS), p || {});
    const top = STD.brickH, cols = 2, rows = 2;
    const { body, ports, posts } = compBase('force', cols, rows, [{ i: 0, j: 0, name: 'A' }, { i: 1, j: 1, name: 'B' }], top, [{ i: 0, j: 0 }, { i: 1, j: 0 }, { i: 0, j: 1 }, { i: 1, j: 1 }]);
    const part = { id: 'force', kind: 'brick', name: 'FORCE 2x2', cols, rows, top, params: p, ports, readout: [], bom: [], hookup: [], warnings: [], expectJoined: [['A.comb', 'A'], ['B.comb', 'B']], model: { elements: [], controls: [{ k: 'force', label: 'press force', type: 'range', min: 0, max: 10, step: 0.1, def: 0, unit: 'N' }] }, objects: [] };
    const padZ = top - STD.traceT, W = 11.0, nf = p.fingers | 0, fw = 1.0, gap = (W - nf * fw) / (nf - 1);
    // comb: A spine on the -y edge with fingers up, B spine on +y with fingers down, interleaved
    const fingersA = [], fingersB = [];
    for (let k = 0; k < nf; k++) { const x = -W / 2 + fw / 2 + k * (fw + gap); (k % 2 === 0 ? fingersA : fingersB).push(K.rectC(x, k % 2 === 0 ? -1.0 : 1.0, fw, W - 2.0 - 0.2)); }
    const combA = K.union.apply(null, [K.rectC(0, -W / 2 + 0.5, W, 1.0)].concat(fingersA)), combB = K.union.apply(null, [K.rectC(0, W / 2 - 0.5, W, 1.0)].concat(fingersB));
    body.feature(S.CPLA, combA, padZ, top, 'comb A'); body.feature(S.CPLA, combB, padZ, top, 'comb B');
    body.feature(S.CPLA, K.circle(0, -W / 2 + 0.5, STD.postD / 2 - 0.2, 32), STD.L1, padZ + 0.02, 'post A'); body.feature(S.CPLA, K.circle(0, W / 2 - 0.5, STD.postD / 2 - 0.2, 32), STD.L1, padZ + 0.02, 'post B');
    body.tap('A.comb', 0, -W / 2 + 0.5, top - 0.3); body.tap('B.comb', 0, W / 2 - 0.5, top - 0.3);
    const eo = [{ shape: 'circle', cx: 0, cy: -W / 2 + 0.5, r: STD.postD / 2 }, { shape: 'circle', cx: 0, cy: W / 2 - 0.5, r: STD.postD / 2 }];
    const { r, Rs } = routeTo(body, posts, [{ name: 'a', from: [0, -W / 2 + 0.5], to: 'A', ownExtra: [posts.length] }, { name: 'b', from: [0, W / 2 - 0.5], to: 'B', ownExtra: [posts.length + 1] }], cols, rows, eo);
    for (const f of r.failed) part.warnings.push('ROUTE FAILED ' + f);
    // rim on top to locate the membrane: 0.8 wall, 1.2 tall, pocket W+1.0
    const rimIn = W + 1.0, rimOut = rimIn + 1.6;
    body.outside(S.PETG, K.diff(K.rrect(0, 0, rimOut, rimOut, 1.0, 4), K.rrect(0, 0, rimIn, rimIn, 0.6, 4)), top - 0.02, top + 1.2, 'rim');
    // membrane: TPU sheet W+0.8 square, 0.96 thick, cTPU disc 0.48 on its underside (exported flipped); it rests on a 0.24 ledge so it hovers 0.24 over the comb
    const mem = new K.Mesh('force membrane TPU', S.TPU), memC = new K.Mesh('force membrane cTPU', S.CTPU);
    const mw = rimIn - 0.4;
    const disc = K.rrect(0, 0, W - 1.0, W - 1.0, 1.0, 4);
    mem.prism(K.diff(K.rrect(0, 0, mw, mw, 0.6, 4), disc), 0, 0.48 + 0.02, { kind: 'membrane' });
    mem.prism(K.rrect(0, 0, mw, mw, 0.6, 4), 0.48, 1.2, { kind: 'membrane' });
    memC.prism(disc, 0, 0.48, { kind: 'membrane disc', shrink: true });
    part.objects.push({ name: 'membrane', meshes: [mem, memC], pose: { dx: 22, dy: 0, flip: true, h: 1.2 } });
    const Rlead = ((Rs.a || 0) + (Rs.b || 0)) / 2 + postR(top);
    part.model.elements.push({ type: 'force', a: 'A', b: 'B', Rlead, Rmin: 2e3, Rmax: 5e6 });
    part.readout.push(['comb', nf + ' fingers, ' + gap.toFixed(2) + ' mm gaps'], ['membrane', 'cTPU disc face down on a TPU sheet, drops into the rim'], ['lead R', fmtR(Rlead)]);
    part.hookup.push('divider: A to 3V3, B to ADC with 10 k to GND; press harder, more comb bridged, lower R.');
    body.fit('comb gap', gap, 0.6, 3);
    return finish(part, body, 'force');
  }

  // BUTTON: 2x2, in place TPU cone with a cTPU cap, two half column contacts inside (FEELER in place cone rules)
  const BUTTON_PARAMS = [{ k: 'capD', label: 'cone top hole', min: 2.5, max: 5, step: 0.5, def: 3.5, unit: 'mm' }, { k: 'coneD', label: 'cone base', min: 10, max: 15, step: 0.5, def: 13, unit: 'mm' }];
  function button(p) {
    p = Object.assign(defaults(BUTTON_PARAMS), p || {});
    const top = STD.brickH, cols = 2, rows = 2;
    const { body, ports, posts } = compBase('button', cols, rows, [{ i: 0, j: 0, name: 'A' }, { i: 1, j: 1, name: 'B' }], top, [{ i: 0, j: 0 }, { i: 1, j: 0 }, { i: 0, j: 1 }, { i: 1, j: 1 }]);
    const part = { id: 'button', kind: 'brick', name: 'BUTTON 2x2', cols, rows, top, params: p, ports, readout: [], bom: [], hookup: [], warnings: [], expectJoined: [['A.pad', 'A'], ['B.pad', 'B']], model: { elements: [], controls: [{ k: 'pressed', label: 'pressed', type: 'bool', def: false }] } };
    // cavity: well in the body top, 3.7 deep, cone stands on the deck around it
    const cavD = 3.7, wellR = p.coneD / 2 - 1.2, deckZ = top - cavD;
    body.feature(S.VOID, K.circle(0, 0, wellR, 48), deckZ, top + 1, 'well');
    // contacts: two half columns rising from L1 to the contact level, split by a 1.2 slot, each with its own post
    const gapC = Math.max(1.2, Math.min(0.5 * cavD, 0.45 * cavD)); // 45 percent of the cavity, never under 1.2
    const contactTop = top + 2.0 - gapC; // the cap sits about 2.0 above the deck when relaxed
    const halfR = 2.4;
    const hA = K.diff(K.circle(0, 0, halfR, 32), K.rect(-halfR - 1, -0.6, halfR + 1, 0.6), K.rect(-halfR - 1, 0, halfR + 1, halfR + 1));
    const hB = K.diff(K.circle(0, 0, halfR, 32), K.rect(-halfR - 1, -0.6, halfR + 1, 0.6), K.rect(-halfR - 1, -halfR - 1, halfR + 1, 0));
    body.feature(S.CPLA, hA, STD.L1, contactTop, 'contact A'); body.feature(S.CPLA, hB, STD.L1, contactTop, 'contact B');
    body.tap('A.pad', 0, -1.5, contactTop - 0.2); body.tap('B.pad', 0, 1.5, contactTop - 0.2);
    const eo = [{ shape: 'circle', cx: 0, cy: 0, r: halfR }];
    const { r, Rs } = routeTo(body, posts, [{ name: 'a', from: [0, -1.5], to: 'A', ownExtra: [posts.length] }, { name: 'b', from: [0, 1.5], to: 'B', ownExtra: [posts.length] }], cols, rows, eo);
    for (const f of r.failed) part.warnings.push('ROUTE FAILED ' + f);
    // cone: TPU, 40 degree walls, 0.6 wall (parallel offset), stands on a pedestal ring on the deck at the well edge
    const th = 40 * Math.PI / 180, wall = 0.6, hw = wall / Math.sin(th);
    const rBase = p.coneD / 2, rTop = p.capD / 2 + hw, coneH = (rBase - rTop) * Math.tan(th);
    const zc0 = top, zc1 = top + coneH;
    const cone = new K.Mesh('button cone TPU', S.TPU);
    cone.revolve([[rBase - hw, zc0], [rBase, zc0], [rTop, zc1], [rTop - hw, zc1]], 0, 0, 48, { shrink: true });
    // cap: cTPU disc bridged over the top hole, 3 layers, the contact face is its underside
    const cap = new K.Mesh('button cap cTPU', S.CTPU);
    // the cap side follows the cone's inner wall exactly (same profile line, same segment count), so it is supported at every layer and never overlaps the TPU
    const rIn = z => rTop - hw + (zc1 - z) / Math.tan(th);
    cap.revolve([[0, zc1 - 0.72], [rIn(zc1 - 0.72), zc1 - 0.72], [rTop - hw, zc1], [0, zc1]], 0, 0, 48, { shrink: true });
    cap.transform((x, y, z) => { const r = Math.hypot(x, y) || 1; const s = Math.max(0, r - 1.5e-3) / r; return [x * s, y * s, z]; }); // the cap sits inside the (already shrunk) cone wall
    const travel = (zc1 - 0.72) - contactTop;
    part.model.elements.push({ type: 'switch', a: 'A', b: 'B', ctrl: 'pressed', Ron: 3e3 + (Rs.a || 0) + (Rs.b || 0) + 2 * postR(top) });
    part.readout.push(['cone', p.coneD + ' base, ' + coneH.toFixed(1) + ' tall, 40 deg, 0.6 wall'], ['travel to contact', travel.toFixed(2) + ' mm (cavity ' + cavD + ')'], ['on R', fmtR(3e3 + (Rs.a || 0) + (Rs.b || 0) + 2 * postR(top))]);
    body.fit('travel under half the cavity', travel, 1.2, cavD / 2 + 0.3);
    part.hookup.push('A to GPIO with INPUT_PULLUP, B to GND; reads LOW when pressed. The cap bridges two cPLA half columns.');
    return finish(part, body, 'button', [cone, cap]);
  }

  // SLIDER: 2x4 finger pot: cTPU resistive track beside a cPLA collector bus, both flush in the top (GIB finger mode)
  const SLIDER_PARAMS = [{ k: 'trackW', label: 'track width', min: 2.5, max: 5, step: 0.5, def: 3.5, unit: 'mm' }];
  function slider(p) {
    p = Object.assign(defaults(SLIDER_PARAMS), p || {});
    const top = STD.brickH, cols = 4, rows = 2;
    const noStud = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) noStud.push({ i, j });
    const { body, ports, posts } = compBase('slider', cols, rows, [{ i: 0, j: 0, name: 'A' }, { i: 3, j: 0, name: 'B' }, { i: 0, j: 1, name: 'W' }], top, noStud);
    const part = { id: 'slider', kind: 'brick', name: 'SLIDER 2x4', cols, rows, top, params: p, ports, readout: [], bom: [], hookup: [], warnings: [], expectJoined: [['A.t', 'A'], ['B.t', 'B'], ['W.t', 'W']], model: { elements: [], controls: [{ k: 'pos', label: 'finger position', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5 }, { k: 'down', label: 'finger down', type: 'bool', def: false }] }, allowShared: [['A', 'B', 'A.t', 'B.t']] };
    const padZ = top - STD.traceT, tl = 26, tw = p.trackW;
    const ty = -2.0, by = ty + tw / 2 + 0.8 + 1.0; // track centre and bus centre (bus 2.0 wide, 0.8 gap)
    body.feature(S.CTPU, K.rrect(0, ty, tl, tw, 0.6, 4), padZ, top, 'track');
    body.feature(S.CPLA, K.rrect(0, by, tl, 2.0, 0.5, 4), padZ, top, 'bus');
    // track end lands (cPLA under the track ends) and posts
    for (const [x, nm] of [[-tl / 2 + 1.5, 'A'], [tl / 2 - 1.5, 'B']]) { body.feature(S.CPLA, K.rectC(x, ty, 2.4, tw - 0.4), STD.L1, padZ, 'land ' + nm); body.tap(nm + '.t', x, ty, top - 0.3); }
    body.feature(S.CPLA, K.circle(-tl / 2 + 1.5, by, 0.9, 24), STD.L1, padZ + 0.02, 'bus post'); body.tap('W.t', 0, by, top - 0.3);
    const eo = [{ shape: 'rect', x0: -tl / 2 + 0.3, y0: ty - tw / 2, x1: -tl / 2 + 2.7, y1: ty + tw / 2 }, { shape: 'rect', x0: tl / 2 - 2.7, y0: ty - tw / 2, x1: tl / 2 - 0.3, y1: ty + tw / 2 }, { shape: 'circle', cx: -tl / 2 + 1.5, cy: by, r: 1.0 }];
    const { r, Rs } = routeTo(body, posts, [{ name: 'a', from: [-tl / 2 + 1.5, ty], to: 'A', ownExtra: [posts.length] }, { name: 'b', from: [tl / 2 - 1.5, ty], to: 'B', ownExtra: [posts.length + 1] }, { name: 'w', from: [-tl / 2 + 1.5, by], to: 'W', ownExtra: [posts.length + 2] }], cols, rows, eo);
    for (const f of r.failed) part.warnings.push('ROUTE FAILED ' + f);
    const Rtrack = B.barR(rho(S.CTPU), tl - 3, tw * STD.traceT);
    part.model.elements.push({ type: 'pot', a: 'A', b: 'B', w: 'W', R: Rtrack, Rskin: 3e5, Rlead: (Rs.w || 0) + postR(top), ctrl: 'pos', on: 'down' });
    part.readout.push(['track', tl + ' x ' + tw + ' mm cTPU, ' + fmtR(Rtrack) + ' end to end'], ['wiper', 'your fingertip bridges track to bus, about 300 kohm of skin'], ['lead R', fmtR((Rs.w || 0) + postR(top))]);
    part.hookup.push('A to 3V3, B to GND, W to ADC. Read W with A/B swapped too to detect no touch (GIB finger mode).');
    return finish(part, body, 'slider');
  }

  // LAMP: 1x3 holding a 5 mm LED in the middle, legs into cPLA cups, end columns A (anode) and K
  const LAMP_PARAMS = [{ k: 'ledD', label: 'LED body', type: 'select', options: [[5.0, '5 mm'], [3.0, '3 mm']], def: 5.0 }];
  function lamp(p) {
    p = Object.assign(defaults(LAMP_PARAMS), p || {});
    const top = STD.brickH, cols = 3, rows = 1, ledD = +p.ledD;
    const { body, ports, posts } = compBase('lamp', cols, rows, [{ i: 0, j: 0, name: 'A' }, { i: 2, j: 0, name: 'K' }], top, [{ i: 1, j: 0 }]);
    const part = { id: 'lamp', kind: 'brick', name: 'LAMP 1x3', cols, rows, top, params: p, ports, readout: [], bom: [ledD + ' mm LED, legs trimmed to 8 mm'], hookup: [], warnings: [], expectJoined: [['A.leg', 'A'], ['K.leg', 'K']], model: { elements: [], controls: [] } };
    // LED bore: body + 0.4, 5 deep from the top; legs at +-1.27 in y? legs are along x here: bores 0.9, cups at L1
    const bore = ledD + 0.4;
    body.feature(S.VOID, K.circle(0, 0, bore / 2, 48), top - 5.0, top + 1, 'led bore');
    for (const [x, nm] of [[-1.27, 'A'], [1.27, 'K']]) {
      const sq = K.rectC(x, 0, 1.8, 1.8);
      body.feature(S.CPLA, sq, STD.L1, STD.padTop, 'cup ' + nm);
      body.feature(S.CPLA, K.diff(sq, K.circle(x, 0, 0.45, 20)), STD.padTop - 0.02, STD.padTop + 1.2, 'cup bore ' + nm);
      body.feature(S.VOID, K.circle(x, 0, 0.45, 20), STD.padTop, top - 5.0 + 0.01, 'leg bore ' + nm);
      body.tap(nm + '.leg', x, 0, STD.L1 + 0.3);
    }
    const eo = [{ shape: 'rect', x0: -1.27 - 0.9, y0: -0.9, x1: -1.27 + 0.9, y1: 0.9 }, { shape: 'rect', x0: 1.27 - 0.9, y0: -0.9, x1: 1.27 + 0.9, y1: 0.9 }];
    const { r, Rs } = routeTo(body, posts, [{ name: 'a', from: [-1.27, 0], to: 'A', ownExtra: [posts.length] }, { name: 'k', from: [1.27, 0], to: 'K', ownExtra: [posts.length + 1] }], cols, rows, eo);
    for (const f of r.failed) part.warnings.push('ROUTE FAILED ' + f);
    const Rl = (Rs.a || 0) + (Rs.k || 0) + 2 * postR(top);
    part.model.elements.push({ type: 'led', a: 'A', k: 'K', vf: 2.0, Rs: Rl });
    part.readout.push(['LED', ledD + ' mm in a ' + bore + ' bore, legs 1.27 apart into 0.9 cups'], ['series R (printed)', fmtR(Rl)], ['at 3.3 V', ((3.3 - 2.0) / Rl * 1e3).toFixed(2) + ' mA: ' + ((3.3 - 2.0) / Rl * 1e3 > 0.3 ? 'visible' : 'dim, use a 5 V rail or a wider trace')]);
    part.hookup.push('A to a GPIO (or 5V), K to GND. The printed path is the series resistor, no discrete resistor needed.');
    return finish(part, body, 'lamp');
  }

  // RESISTOR: 1x2, cPLA meander flush in the top between the two columns, with cuttable trim bridges
  const RES_PARAMS = [{ k: 'legs', label: 'meander legs', min: 3, max: 9, step: 2, def: 5 }, { k: 'legW', label: 'trace width', min: 0.8, max: 2.0, step: 0.1, def: 1.0, unit: 'mm' }];
  function resistor(p) {
    p = Object.assign(defaults(RES_PARAMS), p || {});
    const top = STD.brickH, cols = 2, rows = 1;
    const { body, ports, posts } = compBase('resistor', cols, rows, [{ i: 0, j: 0, name: 'A' }, { i: 1, j: 0, name: 'B' }], top, [{ i: 0, j: 0 }, { i: 1, j: 0 }]);
    const part = { id: 'resistor', kind: 'brick', name: 'RESISTOR 1x2', cols, rows, top, params: p, ports, readout: [], bom: [], hookup: [], warnings: [], expectJoined: [['A', 'B']], model: { elements: [], controls: [{ k: 'cuts', label: 'bridges cut', type: 'range', min: 0, max: (p.legs | 0) - 1, step: 1, def: 0 }] }, allowShared: [['A', 'B']] };
    const padZ = top - STD.traceT, legs = p.legs | 0, w = p.legW, span = 5.0, pitch = (12.0 - w) / (legs - 1);
    // meander in the top face between the posts: legs along y, bridges (short bars) between consecutive legs at alternating ends,
    // plus a cut-able direct bridge across each pair at the far end that shorts the pair until cut
    const pts = []; let x = -6.0 + w / 2;
    for (let k = 0; k < legs; k++) { const yA = (k % 2 === 0) ? -span / 2 : span / 2, yB = -yA; if (k === 0) pts.push([x, yA]); else pts.push([x, yA]); pts.push([x, yB]); x += pitch; }
    let mp = K.stroke(pts, w, 'round', 12);
    // trim bridges: a bar across each leg pair at the end opposite the meander bend so cutting it inserts that pair
    const bridges = [];
    for (let k = 0; k + 1 < legs; k++) { const xa = -6.0 + w / 2 + k * pitch, xb = xa + pitch, yE = (k % 2 === 0) ? -span / 2 : span / 2; const br = K.rectC((xa + xb) / 2, -yE, pitch, 0.8); mp = K.union(mp, br); bridges.push(br); }
    body.feature(S.CPLA, mp, padZ, top, 'meander');
    const post = (xx, nm) => { body.feature(S.CPLA, K.circle(xx, 0, STD.postD / 2 - 0.3, 24), STD.L1, padZ + 0.02, 'post ' + nm); };
    // connect the ends to the columns via L1
    const x0 = pts[0][0], y0 = pts[0][1], x1 = pts[pts.length - 1][0], y1 = pts[pts.length - 1][1];
    body.feature(S.CPLA, K.circle(x0, y0, 0.9, 16), STD.L1, padZ + 0.02, 'end post A'); body.feature(S.CPLA, K.circle(x1, y1, 0.9, 16), STD.L1, padZ + 0.02, 'end post B');
    const eo = [{ shape: 'circle', cx: x0, cy: y0, r: 1.0 }, { shape: 'circle', cx: x1, cy: y1, r: 1.0 }];
    const { r } = routeTo(body, posts, [{ name: 'a', from: [x0, y0], to: 'A', ownExtra: [posts.length] }, { name: 'b', from: [x1, y1], to: 'B', ownExtra: [posts.length + 1] }], cols, rows, eo);
    for (const f of r.failed) part.warnings.push('ROUTE FAILED ' + f);
    const Rleg = B.barR(rho(S.CPLA), span + pitch, w * STD.traceT);
    const Rmin = B.barR(rho(S.CPLA), 12.0, w * STD.traceT) + 2 * postR(top);
    part.model.elements.push({ type: 'trim', a: 'A', b: 'B', R0: Rmin, Rstep: Rleg, ctrl: 'cuts' });
    part.readout.push(['uncut', fmtR(Rmin)], ['per bridge cut', '+' + fmtR(Rleg)], ['all cut', fmtR(Rmin + (legs - 1) * Rleg)]);
    part.hookup.push('cut a bridge with a knife to add one meander leg. Uncut it is a fat short; ' + (legs - 1) + ' cuts is the full meander.');
    return finish(part, body, 'resistor');
  }

  function defaults(schema) { const o = {}; for (const s of schema) o[s.k] = s.def; return o; }

  const CATALOG = [
    { id: 'seat', name: 'SEAT', blurb: 'board carrier: pins to perimeter studs', fn: seat, params: SEAT_PARAMS, group: 'boards' },
    { id: 'plate', name: 'PLATE', blurb: 'base plate with printed nets between studs', fn: plate, params: PLATE_PARAMS, group: 'boards' },
    { id: 'wire', name: 'WIRE', blurb: 'TPU sheath, conductive core, stud caps', fn: wire, params: WIRE_PARAMS, group: 'wires' },
    { id: 'jumper', name: 'JUMPER', blurb: '1xN pass through or bus bar', fn: jumper, params: JUMPER_PARAMS, group: 'bricks' },
    { id: 'touch', name: 'TOUCH', blurb: '2x2 capacitive pad', fn: touch, params: TOUCH_PARAMS, group: 'bricks' },
    { id: 'force', name: 'FORCE', blurb: '2x2 comb plus cTPU membrane', fn: force, params: FORCE_PARAMS, group: 'bricks' },
    { id: 'button', name: 'BUTTON', blurb: '2x2 in place TPU cone switch', fn: button, params: BUTTON_PARAMS, group: 'bricks' },
    { id: 'slider', name: 'SLIDER', blurb: '2x4 finger pot', fn: slider, params: SLIDER_PARAMS, group: 'bricks' },
    { id: 'lamp', name: 'LAMP', blurb: '1x3 LED holder', fn: lamp, params: LAMP_PARAMS, group: 'bricks' },
    { id: 'resistor', name: 'RESISTOR', blurb: '1x2 trimmable meander', fn: resistor, params: RES_PARAMS, group: 'bricks' }
  ];
  const byId = id => CATALOG.find(c => c.id === id);
  function make(id, params) { const c = byId(id); if (!c) throw new Error('no part ' + id); const part = c.fn(params); part.catalog = c; return part; }

  root.PARTS = { CATALOG, BOARDS, boardPins, make, byId, defaults, cx, cy, portName, fmtR, wirePath };
})(typeof globalThis !== 'undefined' ? globalThis : this);
