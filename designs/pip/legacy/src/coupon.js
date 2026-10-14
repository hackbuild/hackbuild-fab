/* coupon.js: the test coupon. Everything PIP depends on electrically, in one small plate:
   trace runs of known length, a crossing between the two buried layers, exposed splits at three
   gaps, a bump pair at the board pitch, one flex key and one click spring. Print it, measure it,
   then type what you measured into step 3. Plain script. */
(function (G) {
  'use strict';
  const H = G.PIP = G.PIP || {};
  const EZ = 0.02, deg = Math.PI / 180;

  function build(P) {
    const GEO = H.GEO, ext = GEO.ext, circle = GEO.circle;
    GEO.SEG.n = P.seg || 40;
    const lay = P.stack.layer, S = P.stack, Rt = P.route;
    const z = {};
    z.f0 = S.skin;
    z.l1 = [z.f0, z.f0 + S.trace];
    z.i1 = [z.l1[1], z.l1[1] + S.iso];
    z.l2 = [z.i1[1], z.i1[1] + S.trace];
    z.i2 = [z.l2[1], z.l2[1] + S.iso];
    z.pl = [z.i2[1], z.i2[1] + S.pad];
    z.floor = z.pl[1];
    const fd = H.LAYOUT.flexDims(P), cd = H.LAYOUT.clickerDims(P);
    const F = P.flex, C = P.clicky;
    const need = [z.floor + fd.keyH - F.protrude, z.floor + cd.vTop + C.flangeT, z.floor + 5];
    const ztop = Math.ceil(Math.max(...need) / lay) * lay;
    const W = 134, D = 70;
    const outline = GEO.rectC(0, 0, W, D, 0);
    const cyl = (r, x, y, z0, z1, n) => ext(circle(r, x, y, n), z0, z1);
    const nets = new Map(), cav = [], tpu = [], ctpu = [], labels = [], bodyAdd = [];
    const add = (n, m) => { if (!nets.has(n)) nets.set(n, []); nets.get(n).push(m); };
    const pads = [];
    // a measuring pad: flush conductive square at the top, a post down to layer 1
    function pad(num, x, y, net) {
      pads.push({ num, x, y, net });
      add(net, ext(GEO.rectC(x, y, 6, 6, 0), ztop - 1.2, ztop + EZ));
      add(net, cyl(1.2, x, y, z.l1[0], ztop - 1.0, 20));
      labels.push({ t: String(num), x: x, y: y - 5.6, h: 2.6 });
    }
    const runOn = (net, pts, l) => {
      const zr = l === 0 ? z.l1 : z.l2;
      add(net, ext(GEO.stroke(pts, Rt.w), zr[0], zr[1]));
    };
    const note = (t, x, y) => labels.push({ t, x, y, h: 2.4 });

    // ---- cell 1: two trace runs of known length on layer 1
    const x1 = -54;
    pad(1, x1 - 6, 24, 'T20'); pad(2, x1 + 6, 24, 'T20');
    runOn('T20', [[x1 - 6, 24], [x1 - 6, 14], [x1 + 6, 14], [x1 + 6, 24]], 0);   // 32 mm
    const len1 = 32;
    pad(3, x1 - 6, 4, 'T80'); pad(4, x1 + 6, 4, 'T80');
    const serp = [[x1 - 6, 4]];
    let yy = -2, len2 = 6;
    for (let k = 0; k < 4; k++) {                      // boustrophedon, 10 mm wide legs
      serp.push([x1 + (k % 2 ? 6 : -6), yy], [x1 + (k % 2 ? 6 : -6), yy - 5], [x1 + (k % 2 ? -6 : 6), yy - 5]);
      len2 += 12 + 5 + 12; yy -= 5;
    }
    serp.push([x1 + 6, 4]);
    runOn('T80', serp, 0);
    const len2s = 6 + 4 * 29 + Math.abs(4 - yy);
    note('trace', x1, 30);

    // ---- cell 2: a crossing between layer 1 and layer 2
    const x2 = -26;
    pad(5, x2 - 8, 22, 'XA'); pad(6, x2 + 8, 22, 'XA');
    runOn('XA', [[x2 - 8, 22], [x2 - 8, 6], [x2 + 8, 6], [x2 + 8, 22]], 0);
    pad(7, x2 - 8, -22, 'XB'); pad(8, x2 + 8, -22, 'XB');
    runOn('XB', [[x2 - 8, -22], [x2 - 8, -2], [x2 + 8, -2], [x2 + 8, -22]], 1);
    runOn('XA', [[x2 - 8, 6], [x2 + 8, 6]], 0);
    runOn('XB', [[x2 - 8, -2], [x2 + 8, -2]], 1);
    // the two lanes cross where the L1 run turns across the L2 run
    runOn('XA', [[x2, 6], [x2, -10]], 0);
    runOn('XB', [[x2 - 6, -2], [x2 + 6, -2]], 1);
    note('cross', x2, 30);

    // ---- cell 3: exposed splits at three gaps, the same shape as a click pad pair
    const x3 = 0;
    [[0.6, 16, 9, 10], [0.8, 2, 11, 12], [1.0, -12, 13, 14]].forEach(([g, y, na, nb]) => {
      const an = 'S' + Math.round(g * 10) + 'a', bn = 'S' + Math.round(g * 10) + 'b';
      pad(na, x3 - 9, y, an); pad(nb, x3 + 9, y, bn);
      add(an, ext(GEO.rect(x3 - 4, y - 1.5, x3 - g / 2, y + 1.5), z.floor - 0.72, z.floor + EZ));
      add(bn, ext(GEO.rect(x3 + g / 2, y - 1.5, x3 + 4, y + 1.5), z.floor - 0.72, z.floor + EZ));
      runOn(an, [[x3 - 9, y], [x3 - 3, y]], 0);
      runOn(bn, [[x3 + 9, y], [x3 + 3, y]], 0);
      add(an, cyl(0.7, x3 - 3, y, z.l1[0], z.floor + EZ, 16));
      add(bn, cyl(0.7, x3 + 3, y, z.l1[0], z.floor + EZ, 16));
      note(g.toFixed(1), x3, y + 4.4);
    });
    cav.push(ext(GEO.rect(x3 - 6, -16, x3 + 6, 20), z.floor, ztop + EZ));   // open well over the splits
    note('splits', x3, 30);

    // ---- cell 4: a bump pair at the board pad pitch, with the anti smear groove between
    const x4 = 26, yb = -8;
    pad(15, x4 - 8, 16, 'BA'); pad(16, x4 + 8, 16, 'BB');
    const pitch = P.board.pitch, bd = P.board.bumpW + 0.2;
    add('BA', cyl(bd / 2, x4 - pitch / 2, yb, z.floor - EZ, z.floor + P.board.bumpH, 24));
    add('BB', cyl(bd / 2, x4 + pitch / 2, yb, z.floor - EZ, z.floor + P.board.bumpH, 24));
    runOn('BA', [[x4 - 8, 16], [x4 - pitch / 2, 16], [x4 - pitch / 2, yb]], 0);
    runOn('BB', [[x4 + 8, 16], [x4 + pitch / 2, 16], [x4 + pitch / 2, yb]], 0);
    add('BA', cyl(0.7, x4 - pitch / 2, yb, z.l1[0], z.floor, 16));
    add('BB', cyl(0.7, x4 + pitch / 2, yb, z.l1[0], z.floor, 16));
    cav.push(ext(GEO.rect(x4 - 7, yb - 6, x4 + 7, yb + 6), z.floor, ztop + EZ));
    cav.push(ext(GEO.rect(x4 - 0.3, yb - 6, x4 + 0.3, yb + 6), z.floor - 0.4, z.floor + 1));  // groove
    note('bumps', x4, 30);
    note('groove', x4, yb - 8.5);

    // ---- cell 5: one flex key and one click spring, wired out to pads
    const x5 = 54, yk = 18;
    pad(17, x5 + 9, 32, 'KA'); pad(18, x5 - 9, 32, 'KB');
    const zf = ztop + F.protrude - fd.keyH;
    const off = fd.colR + 0.55 + Rt.post, cg2 = F.colGap / 2;
    const half = (sgn) => circle(fd.colR, x5, yk, 40).intersect(sgn > 0 ? GEO.rect(x5 + cg2, yk - 6, x5 + 6, yk + 6) : GEO.rect(x5 - 6, yk - 6, x5 - cg2, yk + 6));
    add('KA', ext(half(1), z.pl[0], zf + F.Hs - fd.gap));
    add('KB', ext(half(-1), z.pl[0], zf + F.Hs - fd.gap));
    add('KA', ext(GEO.rect(x5 + cg2 + 0.3, yk - 0.6, x5 + off, yk + 0.6), z.pl[0], z.floor + EZ));
    add('KB', ext(GEO.rect(x5 - off, yk - 0.6, x5 - cg2 - 0.3, yk + 0.6), z.pl[0], z.floor + EZ));
    add('KA', cyl(Rt.post, x5 + off, yk, z.l1[0], z.floor + EZ, 20));
    add('KB', cyl(Rt.post, x5 - off, yk, z.l1[0], z.floor + EZ, 20));
    runOn('KA', [[x5 + 9, 32], [x5 + 9, yk], [x5 + off, yk]], 0);
    runOn('KB', [[x5 - 9, 32], [x5 - 9, yk], [x5 - off, yk]], 0);
    const rIn = fd.rsb - fd.wallH, zc0 = zf + F.Hs, zc1 = zc0 + F.cap;
    const kt = (zc0 + EZ - zf) / F.Hs, zIn = zf + EZ * F.Hs / Math.max(0.1, rIn - fd.rh);
    tpu.push(GEO.lathe([[rIn - EZ, z.floor - lay], [fd.rsb, z.floor - lay], [fd.rsb, zf + EZ], [fd.rsb + (fd.rnt - fd.rsb) * kt, zc0 + EZ],
      [rIn + (fd.rh - rIn) * kt, zc0 + EZ], [rIn - EZ, zIn]], x5, yk, 64));
    if (zf > z.floor + 1e-6) cav.push(cyl(rIn, x5, yk, z.floor, zf + EZ, 64));
    ctpu.push(cyl(fd.rnt + 0.3, x5, yk, zc0, zc1, 64));
    const zA = zc1 + lay;
    tpu.push(GEO.lathe([[0, zc1 - EZ], [fd.rnt, zc1 - EZ], [fd.rnt, zA], [fd.rFace, zA + fd.flare], [fd.rFace, zf + fd.keyH], [0, zf + fd.keyH]], x5, yk, 64));
    cav.push(cyl(fd.wellR, x5, yk, zf, ztop + EZ, 64));
    note('flex key', x5, 27);

    // the click spring stands along y so its slot stays inside the slab
    const yc = -10, clickFloor = Math.max(z.floor, Math.floor((ztop - C.flangeT - cd.vTop + 1e-6) / lay) * lay);
    const vTopEff = ztop - C.flangeT - clickFloor;
    pad(19, x5 + 7, -30, 'CA'); pad(20, x5 - 7, -30, 'CB');
    const slotW = C.w + C.slotClr, len = cd.len + C.endClr;
    cav.push(ext(GEO.rectC(x5, yc, slotW, len, 0), clickFloor, ztop + EZ));
    cav.push(ext(GEO.rectC(x5, yc, C.w + C.slotClr + C.relief, C.l + 0.6, 0), clickFloor, ztop + EZ));
    cav.push(cyl(C.cap / 2 + C.flange + 0.4, x5, yc, ztop - C.flangeT - (cd.cg + 0.6), ztop + EZ, 64));
    for (const sgn of [1, -1]) {
      const vm = yc + sgn * (C.l / 2 + C.eb / 2);
      bodyAdd.push(ext(GEO.rectC(x5, vm, slotW - 0.1, C.rib, 0), clickFloor - EZ, clickFloor + 0.6));
    }
    const padV = Math.min(0.75, slotW / 2 - 0.1);
    for (const sgn of [1, -1]) {
      const n = sgn > 0 ? 'CA' : 'CB';
      add(n, ext(GEO.rectC(x5, yc + sgn * 1.3, 2 * padV, 2.0, 0), z.pl[0], clickFloor + EZ));
      add(n, cyl(0.6, x5, yc + sgn * 1.6, z.l1[0], clickFloor + EZ, 16));
      runOn(n, [[x5 + sgn * 7, -30], [x5 + sgn * 7, yc + sgn * 1.6], [x5, yc + sgn * 1.6]], 0);
    }
    note('click', x5 + 12, yc);

    // ---- solids
    const ctpuM = GEO.union3(ctpu);
    const tpuM = GEO.union3(tpu).subtract(ctpuM);
    const netList = [...nets.entries()].map(([name, list]) => ({ name, m: GEO.union3(list) }));
    const condM = GEO.union3(netList.map(n => n.m)).subtract(ctpuM).subtract(tpuM);
    let shell = ext(outline, 0, ztop).subtract(GEO.union3(cav));
    if (bodyAdd.length) shell = shell.add(GEO.union3(bodyAdd));
    shell = shell.subtract(condM).subtract(tpuM).subtract(ctpuM);
    const eng = [];
    for (const l of labels) {
      const t = H.FONT.textLines(l.t, l.x, l.y, l.h);
      for (const line of t.lines) eng.push(GEO.stroke(line, 0.6));
    }
    if (eng.length) shell = shell.subtract(ext(GEO.union2(eng), ztop - 0.48, ztop + EZ));
    // click spring and cap as separate parts, same as the controller
    const e2 = H.MODEL.clickElement2D(P, cd, vTopEff, ztop - clickFloor - 0.12);
    const springs = ext(e2.frame, 0, C.w), tips = ext(e2.tip, 0, C.w);
    const capBody = GEO.union3([cyl(C.cap / 2 + C.flange, 0, 0, 0, C.flangeT, 64),
      H.MODEL.chamferTop(circle(C.cap / 2, 0, 0, 64), C.flangeT - EZ, C.flangeT + 2.4 + C.protrude, 0.48, lay)]);

    const shorts = [];
    let minGap = Infinity;
    for (let i = 0; i < netList.length; i++) for (let j = i + 1; j < netList.length; j++) {
      const g = netList[i].m.minGap(netList[j].m, 1.0);
      if (g < minGap) minGap = g;
      if (g < 0.3) shorts.push(netList[i].name + '/' + netList[j].name);
    }
    if (G.__couponNets) G.__couponNets(netList);
    const parts = (o) => o.map(p => ({ name: p.name, slot: p.slot, mesh: GEO.meshOf(p.m), vol: p.m.volume() }));
    const objects = [
      { name: 'coupon', place: [W / 2 + 6, D / 2 + 6, 0], size: [W, D, ztop], parts: [{ name: 'slab', slot: 1, m: shell }, { name: 'traces', slot: 2, m: condM }, { name: 'key', slot: 3, m: tpuM }, { name: 'contact', slot: 4, m: ctpuM }] },
      { name: 'coupon-spring', place: [W + 26, 20, 0], size: [e2.len, e2.hMax, C.w], parts: [{ name: 'spring', slot: 1, m: springs.translate([-e2.len / 2, 0, 0]) }, { name: 'tip', slot: 4, m: tips.translate([-e2.len / 2, 0, 0]) }] },
      { name: 'coupon-cap', place: [W + 26, 46, 0], size: [C.cap + 2 * C.flange, C.cap + 2 * C.flange, C.flangeT + 2.4 + C.protrude], parts: [{ name: 'cap', slot: C.capMat === 'petg' ? 1 : 3, m: capBody }] }
    ].map(o => ({ name: o.name, place: o.place, size: o.size, count: 1, asm: parts(o.parts), print: parts(o.parts) }));

    const Ph = P.phys, Atr = Rt.w * S.trace * 1e-6;
    const Rper = (Ph.rhoC * 1e-2) / Atr * 1e-3;   // ohm per mm of trace
    const out = {
      objects, pads, z, ztop, minGap, shorts,
      expect: { len1, len2: len2s, Rper, R1: Rper * len1, R2: Rper * len2s, iso: S.iso, splits: [0.6, 0.8, 1.0], pitch },
      plate: { w: P.print.bedW, d: P.print.bedD, used: Math.max(D + 12, 60), fits: true },
      warn: shorts.length ? ['coupon nets too close: ' + shorts.join(', ')] : [],
      dims: { W, H: D, T: ztop }
    };
    GEO.flush([]);
    return out;
  }

  function card(P, K) {
    const e = K.expect, r = (v) => v >= 1e6 ? (v / 1e6).toFixed(2) + ' Mohm' : (v / 1e3).toFixed(0) + ' kohm';
    const L = [];
    L.push('PIP TEST COUPON', '========================================',
      'print this before the controller. it carries every electrical feature the controller',
      'depends on, at the same stack: traces ' + P.route.w + ' mm wide and ' + P.stack.trace + ' mm thick,',
      P.stack.iso + ' mm of PETG between the two buried layers, pads flush at ' + K.z.floor.toFixed(2) + ' mm.',
      '', 'size ' + K.dims.W + ' x ' + K.dims.H + ' x ' + K.dims.T.toFixed(2) + ' mm, plus the click spring and its cap.',
      '', 'measure with a meter on the numbered pads (numbers are engraved beside them).', '');
    const line = (a, b) => '  ' + a + ' '.repeat(Math.max(1, 34 - a.length)) + b;
    L.push('trace runs, layer 1',
      line('1 to 2   (' + e.len1.toFixed(0) + ' mm of trace)', 'expect about ' + r(e.R1)),
      line('3 to 4   (' + e.len2.toFixed(0) + ' mm of trace)', 'expect about ' + r(e.R2)),
      '  to turn a reading into ohm cm: ohms x ' + (P.route.w * P.stack.trace).toFixed(2) + ' (the trace section in mm2) / length in mm x 0.1.',
      '  type that into step 3 of the bench as the in plane figure.', '',
      'crossing, layer 1 against layer 2',
      line('5 to 6', 'a trace on layer 1, a few hundred kohm'),
      line('7 to 8', 'the same on layer 2, through its pad posts'),
      line('5 to 7', 'must read open. anything under 50 Mohm is'),
      '                                   a bridge through the ' + e.iso + ' mm of insulation,',
      '                                   so add a layer of insulation in step 4.', '',
      'exposed splits (the gap a key closes)',
      line('9 to 10  (0.6 mm gap)', 'must read open'),
      line('11 to 12 (0.8 mm gap)', 'must read open'),
      line('13 to 14 (1.0 mm gap)', 'must read open'),
      '  any of these reading under about 5 Mohm means stringing or smear across the gap.',
      '  clean it with a knife and read again; if it comes back, use a wider split.', '',
      'bump pair at the board pitch (' + e.pitch + ' mm), groove between them',
      line('15 to 16', 'must read open'),
      '  press a scrap of stripped wire across both bumps: you should then read a few hundred kohm.', '',
      'flex key',
      line('17 to 18 released', 'open'),
      line('17 to 18 pressed', 'a few hundred kohm to a few Mohm'),
      '  press it fifty times and watch the pressed figure; it should not drift much.', '',
      'click spring',
      '  drop the spring into its slot, tip down, then the cap on top.',
      line('19 to 20 released', 'open'),
      line('19 to 20 pressed', 'a few hundred kohm to a few Mohm'),
      '  it should click. if it latches down, lower the rise in step 2; if it feels dead, raise it.',
      '  measure a beam with calipers first: they are drawn ' + P.clicky.t.toFixed(2) + ' mm. if they come out thinner,',
      '  raise the beam setting by the difference, the force goes with the cube of it.',
      '  out of the slot the spring feels soft, and that is expected: an arch only snaps when its',
      '  ends cannot move, which is what the ribs and the bezel are for.', '',
      'then: type the numbers you measured into step 3 (materials and read timing) and rebuild.',
      'the key wait in the firmware should be about five times the slowest settle the bench reports.');
    return L.join('\n') + '\n';
  }

  H.COUPON = { build, card };
})(typeof globalThis !== 'undefined' ? globalThis : this);
