/* model.js: PIP solids. Turns the layout and the routes into strictly manifold parts per
   filament slot, the print poses, the plate, the net check and the electrical readouts.
   Assembled frame: x right, y toward the cable edge, z up from the bed. Plain script. */
(function (G) {
  'use strict';
  const H = G.PIP = G.PIP || {};
  const deg = Math.PI / 180;
  const EZ = 0.02;

  function build(P, L, R) {
    const GEO = H.GEO, CS = GEO.CS(), MN = GEO.MN();
    GEO.SEG.n = P.seg || 40;
    const t0 = Date.now();
    const prof = {}; let tl = t0;
    const mark = (k) => { const n = Date.now(); prof[k] = (prof[k] || 0) + n - tl; tl = n; };
    const z = L.z, B = P.board, ztop = z.top, bt = P.stack.bezel, zbt = ztop + bt, lay = P.stack.layer;
    const warn = L.warn.slice(), notes = [];
    if (R.unrouted) warn.push(R.unrouted + ' connections could not be routed, widen the body or move groups apart');
    if (R.conflicts) warn.push('routing left ' + R.conflicts + ' tight spots under the clearance, raise iterations or loosen the grid');
    const outline = H.LAYOUT.outline(P);
    const Rt = P.route;
    const ext = GEO.ext, circle = GEO.circle;
    const cyl = (r, x, y, z0, z1, n) => ext(circle(r, x, y, n), z0, z1);
    const rot2 = (cs, a, x, y) => cs.rotate(a / deg).translate([x, y]);

    // a round cap and a post of nearly the same radius on one centre leave sliver triangles; keep them apart
    const sep = (r) => (Math.abs(r - Rt.w / 2) < 0.12 ? Rt.w / 2 + 0.12 : r);
    // ------------------------------------------------ conductors, per net
    const netSolids = new Map();
    const addNet = (n, m) => { if (!netSolids.has(n)) netSolids.set(n, []); netSolids.get(n).push(m); };
    // each trace layer is one 2D region per net: strokes, stubs and the discs of its posts and vias,
    // closed by 0.01 mm so tangent pieces fuse instead of pinching. posts and vias then run between
    // the layers, starting and ending inside those discs.
    const termsOf = new Map(L.nets.map(n => [n.name, n.terms]));
    for (const rn of R.nets) {
      const terms = termsOf.get(rn.name) || [];
      for (const l of [0, 1]) {
        const zr = l === 0 ? z.l1 : z.l2;
        const cs = rn.polys[l].filter(p => p.length > 1).map(p => GEO.stroke(p, Rt.w));
        for (const st of rn.stubs) cs.push(GEO.stroke(st, Rt.w));
        for (const t of terms) cs.push(circle(sep(t.r) + 0.05, t.x, t.y, 24));
        for (const v of rn.vias) cs.push(circle(sep(Rt.via) + 0.05, v[0], v[1], 24));
        const u = GEO.union2(cs).offset(0.01, 'Miter', 2).offset(-0.01, 'Miter', 2);
        addNet(rn.name, ext(u, zr[0], zr[1]));
      }
      for (const v of rn.vias) addNet(rn.name, cyl(sep(Rt.via), v[0], v[1], z.l1[0] + lay / 2, z.l2[1] - lay / 2, 20));
    }
    for (const n of L.nets) for (const t of n.terms) addNet(n.name, cyl(sep(t.r), t.x, t.y, z.l1[0] + lay / 2, z.floor + EZ, 20));
    mark('traces');
    const tpu = [], ctpu = [], cav = [], envAdd = [], bodyAdd = [];
    const fd = L.flex, F = P.flex;
    const zf = z.flexFloor;
    const clickFloor = L.click ? Math.max(z.floor, Math.floor((z.clickFloor + 1e-6) / lay) * lay) : 0;
    const C = P.clicky, cd = L.click;
    const vTopEff = cd ? ztop - C.flangeT - clickFloor : 0;
    const capTravel = cd ? cd.cg + 0.6 : 0;
    const elements = [], caps = [];
    const btnInfo = [];

    for (const b of L.btns) {
      if (b.type === 'flex') {
        const off = b.termOff, cg2 = F.colGap / 2;
        const colTop = zf + F.Hs - fd.gap;
        const half = (sgn) => circle(fd.colR, b.x, b.y, 40).intersect(sgn > 0 ? GEO.rect(b.x + cg2, b.y - 5, b.x + 5, b.y + 5) : GEO.rect(b.x - 5, b.y - 5, b.x - cg2, b.y + 5));
        addNet(b.id, ext(half(1), z.pl[0], colTop));
        addNet('GND', ext(half(-1), z.pl[0], colTop));
        addNet(b.id, ext(GEO.rect(b.x + cg2 + 0.3, b.y - 0.6, b.x + off, b.y + 0.6), z.pl[0], z.floor + EZ));
        addNet('GND', ext(GEO.rect(b.x - off, b.y - 0.6, b.x - cg2 - 0.3, b.y + 0.6), z.pl[0], z.floor + EZ));
        const inner = fd.rh + fd.gap * Math.tan(fd.a);
        if (fd.colR + 0.6 > inner) warn.push(b.id + ': contact column nearly touches the cone wall');
        // TPU cone, pedestal ring, cap, flare and face
        const rIn = fd.rsb - fd.wallH;
        const zc0 = zf + F.Hs, zc1 = zc0 + F.cap;
        const kt = (zc0 + EZ - zf) / F.Hs;
        // cone and its buried foot ring as one revolved profile
        // kinks sit a hair inside the well so no profile vertex lands on a cavity face
        const zIn = zf + EZ * F.Hs / Math.max(0.1, rIn - fd.rh);
        tpu.push(GEO.lathe([[rIn - EZ, z.floor - lay], [fd.rsb, z.floor - lay], [fd.rsb, zf + EZ], [fd.rsb + (fd.rnt - fd.rsb) * kt, zc0 + EZ],
          [rIn + (fd.rh - rIn) * kt, zc0 + EZ], [rIn - EZ, zIn]], b.x, b.y, 64));
        if (zf > z.floor + 1e-6) cav.push(cyl(rIn, b.x, b.y, z.floor, zf + EZ, 64));
        ctpu.push(cyl(fd.rnt + 0.3, b.x, b.y, zc0, zc1, 64));
        const zA = zc1 + lay;
        // key top: collar over the cap, 45 degree flare, face disc, one profile
        tpu.push(GEO.lathe([[0, zc1 - EZ], [fd.rnt, zc1 - EZ], [fd.rnt, zA], [fd.rFace, zA + fd.flare], [fd.rFace, zf + fd.keyH], [0, zf + fd.keyH]], b.x, b.y, 64));
        cav.push(cyl(fd.wellR, b.x, b.y, zf, ztop + EZ, 64));
        btnInfo.push({ id: b.id, type: 'flex', travel: fd.gap, keyTop: zf + fd.keyH, colTop, capZ: zc0 });
      } else if (b.type === 'clicky') {
        const a = b.ang, ca = Math.cos(a), sa = Math.sin(a);
        // the slot is only snug under the end blocks; over the arch span it opens out so nothing
        // the spring does can touch a wall
        const slotW = C.w + C.slotClr, len = cd.len + C.endClr, wideW = C.w + C.slotClr + C.relief;
        cav.push(ext(GEO.rectC(b.x, b.y, len, slotW, a), clickFloor, ztop + EZ));
        cav.push(ext(GEO.rectC(b.x, b.y, C.l + 0.6, wideW, a), clickFloor, ztop + EZ));
        cav.push(cyl(b.r, b.x, b.y, ztop - C.flangeT - capTravel, ztop + EZ, 64));
        // half pads flush with the slot floor
        const padU = [0.3, 2.3], padV = Math.min(0.75, slotW / 2 - 0.1);
        for (const sgn of [1, -1]) {
          const um = sgn * (padU[0] + padU[1]) / 2;
          const cs = GEO.rectC(b.x + ca * um, b.y + sa * um, padU[1] - padU[0], 2 * padV, a);
          addNet(sgn > 0 ? b.id : 'GND', ext(cs, z.pl[0], clickFloor + EZ));
        }
        // a rib under each end block, keyed into a groove in the block: the arch thrusts its ends
        // outward, and a spring whose ends can move does not snap, it just flattens
        for (const sgn of [1, -1]) {
          const um = sgn * (C.l / 2 + C.eb / 2);
          bodyAdd.push(ext(GEO.rectC(b.x + ca * um, b.y + sa * um, C.rib, slotW - 0.1, a), clickFloor - EZ, clickFloor + 0.6));
        }
        elements.push({ id: b.id, x: b.x, y: b.y, a });
        caps.push({ id: b.id, x: b.x, y: b.y });
        btnInfo.push({ id: b.id, type: 'clicky', travel: cd.cg, a });
      } else if (b.type === 'touch') {
        const T = P.touch, rc = T.d / 2 - T.rim;
        envAdd.push(cyl(T.d / 2, b.x, b.y, ztop - EZ, zbt, 64));
        const zt0 = zbt - 0.72;
        const disc = circle(rc, b.x, b.y, 64);
        const xs = rc - T.spine / 2, pitch = T.finger + T.gap;
        const sense = [GEO.rect(b.x - rc - 1, b.y - rc - 1, b.x - rc + T.spine, b.y + rc + 1)];
        const drive = [GEO.rect(b.x + rc - T.spine, b.y - rc - 1, b.x + rc + 1, b.y + rc + 1)];
        const nF = Math.floor((2 * rc) / pitch);
        const y0 = b.y - (nF - 1) * pitch / 2;
        for (let k = 0; k < nF; k++) {
          const yy = y0 + k * pitch;
          if (k % 2 === 0) sense.push(GEO.rect(b.x - rc, yy - T.finger / 2, b.x + rc - T.spine - T.gap, yy + T.finger / 2));
          else drive.push(GEO.rect(b.x - rc + T.spine + T.gap, yy - T.finger / 2, b.x + rc, yy + T.finger / 2));
        }
        const sC = GEO.union2(sense).intersect(disc), dC = GEO.union2(drive).intersect(disc);
        addNet(b.id, ext(sC, zt0, zbt + EZ));
        addNet('3V3', ext(dC, zt0, zbt + EZ));
        addNet(b.id, cyl(P.route.post, b.x - xs, b.y, z.floor - EZ, zt0 + EZ, 20));
        addNet('3V3', cyl(P.route.post, b.x + xs, b.y, z.floor - EZ, zt0 + EZ, 20));
        btnInfo.push({ id: b.id, type: 'touch', fingers: nF, area: sC.area() + dC.area() });
      } else if (b.type === 'stick') {
        const S = L.stick, SP = P.stick;
        const dirs = [['RIGHT', 0], ['UP', 90], ['LEFT', 180], ['DOWN', 270]];
        const pad = GEO.sector(0, 0, S.Rw - EZ, S.Rw + 1.7, -S.sectHalf, S.sectHalf);
        for (const [n, ang] of dirs) {
          addNet(n, ext(rot2(pad, ang * deg, b.x, b.y), S.padZ[0], S.padZ[1]));
          const pr = S.Rw + 1.1;
          addNet(n, cyl(P.route.post, b.x + pr * Math.cos(ang * deg), b.y + pr * Math.sin(ang * deg), z.floor - EZ, S.padZ[0] + 0.3, 20));
        }
        addNet('GND', ext(GEO.ring(b.x, b.y, S.Rw - EZ, S.Rw + 3.9), S.comZ[0], S.comZ[1]));
        const cr = S.Rw + 2.9;
        addNet('GND', cyl(P.route.post, b.x + cr * Math.cos(45 * deg), b.y + cr * Math.sin(45 * deg), z.floor - EZ, S.comZ[0] + 0.3, 20));
        if (S.padZ[0] < z.floor + 0.24) warn.push('stick: wall pads start below the well floor, raise the neck');
        // core: anchor foot, neck, lower cone, band (conductive), upper cone, stem
        const zfA = z.pl[0] + lay, zfB = zfA + lay;
        tpu.push(cyl(5.0, b.x, b.y, zfA, zfB, 64));
        tpu.push(cyl(S.footR, b.x, b.y, zfB - EZ, z.stickFloor + EZ, 48));
        const sc = stickClear(P, L);
        const inplace = SP.top !== 'press';
        const stemTop = zbt + sc.stemAbove;
        // the stem runs unbroken through the band: the conductive TPU is a collar on the outside of
        // it, not the whole section. it used to be the whole section, and that is where one snapped
        const rc = Math.min(S.stemR, S.rbt - 1.0);
        const zLead = S.zb0 - (S.rbl - rc);
        tpu.push(GEO.lathe([[0, z.stickFloor], [S.neckR, z.stickFloor], [S.neckR, S.zp], [rc, S.zp + (rc - S.neckR)], [rc, S.zb1 + EZ], [0, S.zb1 + EZ]], b.x, b.y, 64));
        ctpu.push(GEO.lathe([[rc, zLead], [S.rbl, S.zb0], [S.rbt, S.zb1], [rc, S.zb1]], b.x, b.y, 64));
        const zu = S.zb1;
        if (S.rbt - rc < 1.0) warn.push('stick: the conductive collar is under 1 mm thick, raise the band radius or narrow the stem');
        if (inplace) {
          // thumb pad printed with the stick, TOGGLE style: stem, then a bowl with a dished top
          const capR = SP.capD / 2, zFl = Math.max(zu + 0.24, sc.capBot);
          const tp = thumbProfile(P, S.stemR, zFl, capR);
          tpu.push(GEO.lathe([[0, zu], [S.stemR, zu], ...tp.pts, [0, tp.pts[tp.pts.length - 1][1]]], b.x, b.y, 96));
        } else {
          tpu.push(GEO.lathe([[0, zu], [S.stemR, zu], [S.stemR, stemTop - 0.6], [S.stemR - 0.6, stemTop], [0, stemTop]], b.x, b.y, 64));
        }
        cav.push(cyl(S.Rw, b.x, b.y, z.floor, ztop + EZ, 96));
        // the anchor ring above the foot stays PETG: cut only the foot bore through it
        if (!inplace) caps.push({ id: 'STICK', stick: true, x: b.x, y: b.y, stemTop });
        btnInfo.push({ id: 'STICK', type: 'stick', gap: S.restGap, tilt: SP.tilt });
      }
    }

    // ------------------------------------------------ board seat
    const bd = L.board, pk = L.pocketRect;
    const boardZ = z.floor + (B.mode === 'wire' ? B.bumpH : B.bumpH);
    const boardTop = boardZ + B.T;
    const recC = boardTop + B.usbH / 2;
    const halfH = P.shape.H / 2;
    const pocketFloor = B.mode === 'wire' ? z.floor + B.bumpH : z.floor;
    cav.push(ext(GEO.rect(pk.x0, pk.y0, pk.x1, pk.y1), pocketFloor, ztop + EZ));
    if (B.mode === 'wire') cav.push(ext(GEO.rect(pk.x0, bd.y1 - 0.5, pk.x1, pk.y1), z.floor, ztop + EZ));
    const rowX = B.W / 2 - B.inset;
    if (B.window) {
      const pads = L.pads, yT = Math.min(...pads.map(p => p.y));
      cav.push(ext(GEO.rect(bd.cx - rowX + 1.3, bd.cy + yT + 1.3, bd.cx + rowX - 1.3, bd.y1 - 0.4), z.floor - 2 * lay, ztop));
    }
    const notchW = 12.5, notchZ0 = Math.max(z.pl[0] + lay, recC - 3.6);
    const notchTop = Math.min(zbt, Math.max(ztop, recC + 3.6));   // carry the opening into the bezel on a low body
    cav.push(ext(GEO.rect(bd.cx - notchW / 2, bd.y1 - 0.3, bd.cx + notchW / 2, halfH + 6), notchZ0, ztop + EZ));
    if (B.mode !== 'wire') {
      for (const bm of L.bumps) addNet(bm.net, cyl((B.bumpW + 0.2) / 2, bm.x, bm.y, z.floor - EZ, z.floor + B.bumpH, 24));
    }
    if (L.cavity) {
      const cv = L.cavity;
      cav.push(ext(GEO.rect(cv.x0, cv.y0, cv.x1, cv.y1), z.floor, ztop + EZ));
      const Cp = P.cups;
      for (const c of L.cups) {
        const cup = cyl(Cp.od / 2, c.x, c.y, z.floor - EZ, z.floor + Cp.h, 32).subtract(cyl(Cp.bore / 2, c.x, c.y, z.floor + 0.72, z.floor + Cp.h + 1, 16));
        addNet(c.net, cup);
      }
    }
    // bezel peg sockets
    const pegR = 1.5, pegLen = Math.max(1.2, Math.min(3.0, ztop - z.floor - 0.6));
    for (const p of L.pegs) cav.push(cyl(pegR + 0.05, p.x, p.y, ztop - pegLen - 0.3, ztop + EZ, 24));

    mark('buttons');
    // ------------------------------------------------ nets: union, connectivity and clearance check
    const nets = [];
    for (const [name, list] of netSolids) {
      const m = GEO.union3(list);
      const comps = m.decompose();
      nets.push({ name, m, parts: comps.length, vol: m.volume() });
      if (comps.length !== 1) warn.push('net ' + name + ' is in ' + comps.length + ' pieces');
    }
    mark('netunion');
    const shorts = [], pairs = [];
    let minGap = Infinity;
    for (let i = 0; i < nets.length; i++) for (let j = i + 1; j < nets.length; j++) {
      const g = nets[i].m.minGap(nets[j].m, 1.0);
      if (g < minGap) minGap = g;
      pairs.push({ a: nets[i].name, b: nets[j].name, g });
      if (g < 0.3) shorts.push(nets[i].name + '/' + nets[j].name + ' ' + g.toFixed(2));
    }
    if (shorts.length) warn.push('clearance under 0.3 mm: ' + shorts.join(', '));

    mark('mingap');
    // ------------------------------------------------ body parts, exact partition
    const ctpuM = GEO.union3(ctpu);
    const tpuM = GEO.union3(tpu).subtract(ctpuM);
    const condM = GEO.union3(nets.map(n => n.m)).subtract(ctpuM).subtract(tpuM);
    let env = ext(outline, 0, ztop);
    if (envAdd.length) env = env.add(GEO.union3(envAdd));
    let shellM = env.subtract(GEO.union3(cav));
    if (bodyAdd.length) shellM = shellM.add(GEO.union3(bodyAdd));
    shellM = shellM.subtract(condM).subtract(tpuM).subtract(ctpuM);
    const stray = GEO.union3([condM, tpuM, ctpuM]).subtract(env.add(GEO.union3(cav))).volume();
    if (stray > 0.5) notes.push('parts above the body: ' + stray.toFixed(1) + ' mm3 (keys and stick, expected)');

    mark('body');
    // ------------------------------------------------ bezel
    const bz = [];
    let plate = chamferTop(outline, ztop, zbt, P.shape.bezelChamfer, lay);
    const holes = [];
    for (const b of L.btns) {
      let r = b.bezR;
      if (b.type === 'stick') r = stickClear(P, L).hole;
      if (b.type === 'touch') r = P.touch.d / 2 + 0.3;
      holes.push(circle(r, b.x, b.y, 64));
    }
    if (holes.length) plate = plate.subtract(ext(GEO.union2(holes), ztop - EZ, zbt + EZ));
    if (notchTop > ztop + 1e-6) plate = plate.subtract(ext(GEO.rect(bd.cx - notchW / 2, bd.y1 - 0.3, bd.cx + notchW / 2, halfH + 6), ztop - EZ, notchTop));
    // press ribs over the castellation rows
    const ribs = [];
    const ribBot = boardTop - (B.mode === 'wire' ? 0.1 : B.press);
    if (ztop - ribBot > 0.05) for (const s of [-1, 1]) {
      const cx = bd.cx + s * (B.W / 2 - 0.8);
      ribs.push(ext(GEO.rect(cx - 0.5, bd.y0 + 1.0, cx + 0.5, bd.y1 - 5.0), ribBot, ztop + EZ));
    } else notes.push('board top is level with the body top, no press ribs');
    const pegs = L.pegs.map(p => ext(circle(pegR - 0.05, p.x, p.y, 24).subtract(GEO.rect(p.x - 0.2, p.y - 3, p.x + 0.2, p.y + 3)), ztop - pegLen, ztop + EZ));
    let bezM = GEO.union3([plate, ...ribs, ...pegs]);
    // inlays: labels (slot 2 ink) and the mark (ink + pink)
    const ink2 = [], pink2 = [];
    if (P.bezel.labels) {
      const lh = P.bezel.labelH, sw = 0.64;
      const stroke = (t) => GEO.union2(t.lines.map(l => GEO.stroke(l, sw)));
      const gc = (g) => P.groups[g];
      for (const b of L.btns) {
        if (b.group === 'face') {
          const g = gc('face'), d = Math.hypot(b.x - g.x, b.y - g.y) || 1;
          const k = (b.bezR + 1.4 + lh / 2) / d;
          ink2.push(stroke(H.FONT.textLines(b.id, b.x + (b.x - g.x) * k, b.y + (b.y - g.y) * k, lh)));
        } else if (b.group === 'menu') {
          ink2.push(stroke(H.FONT.textLines(b.id, b.x, b.y - b.bezR - 1.4 - lh / 2, lh * 0.8)));
        } else if (b.group === 'shoulder') {
          ink2.push(stroke(H.FONT.textLines(b.id, b.x, b.y - b.bezR - 1.4 - lh / 2, lh)));
        } else if (b.group === 'left' && b.arrow !== undefined) {
          const g = gc('left'), a = b.arrow * deg, dd = g.pitch - b.bezR - 2.0, s = 1.3;
          const cx = g.x + dd * Math.cos(a), cy = g.y + dd * Math.sin(a);
          const pts = [[s, 0], [-s * 0.8, s], [-s * 0.8, -s]].map(([u, v]) => [cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)]);
          ink2.push(GEO.poly(pts));
        }
      }
    }
    if (P.bezel.mark) {
      const ms = Math.min(15, B.W - 3);
      for (const p of H.MARK.mark(bd.cx, bd.cy - 1.5, ms)) (p.fill === 'pink' ? pink2 : ink2).push(GEO.poly(p.pts));
    }
    const inkCS = GEO.union2(ink2).intersect(outline.offset(-1.6, 'Round'));
    const pinkCS = GEO.union2(pink2).subtract(inkCS);
    const inkM = inkCS.isEmpty() ? null : ext(inkCS, zbt - 0.48, zbt).intersect(plate);
    const pinkM = pinkCS.isEmpty() ? null : ext(pinkCS, zbt - 0.72, zbt).intersect(plate);
    if (inkM) bezM = bezM.subtract(inkM);
    if (pinkM) bezM = bezM.subtract(pinkM);
    bz.push({ name: 'bezel', slot: 1, m: bezM });
    if (inkM && !inkM.isEmpty()) bz.push({ name: 'bezel-ink', slot: 2, m: inkM });
    if (pinkM && !pinkM.isEmpty()) bz.push({ name: 'bezel-pink', slot: 3, m: pinkM });

    mark('bezel');
    // ------------------------------------------------ click elements and caps
    const elemParts = [], capParts = [];
    let elem2 = null;
    if (elements.length) {
      elem2 = clickElement2D(P, cd, vTopEff, ztop - clickFloor - 0.12);
      for (const e of elements) {
        const place = (cs) => ext(cs, -C.w / 2, C.w / 2).rotate([90, 0, 0]).rotate([0, 0, e.a / deg]).translate([e.x, e.y, clickFloor]);
        elemParts.push({ id: e.id, frame: place(elem2.frame), tip: place(elem2.tip) });
      }
    }
    for (const c of caps) {
      if (c.stick) {
        const sc = stickClear(P, L), SP = P.stick;
        const zb = zbt + sc.bossLift, zd = zbt + sc.diskLift, zt = zd + SP.capH;
        const capR = SP.capD / 2, rs = SP.stemD / 2 + 1.4;
        const tp = thumbProfile(P, rs, zb + 0.4, capR);
        const body = GEO.lathe([[0, zb], [rs, zb], ...tp.pts, [0, tp.pts[tp.pts.length - 1][1]]], c.x, c.y, 96);
        const bore = cyl(SP.stemD / 2 + 0.05, c.x, c.y, zb - 1, c.stemTop + 0.2, 32);
        capParts.push({ id: 'STICK', slot: 3, m: body.subtract(bore), stick: true });
      } else {
        const zb = ztop - C.flangeT, zt = zbt + C.protrude;
        const body = GEO.union3([cyl(C.cap / 2 + C.flange, c.x, c.y, zb, zb + C.flangeT, 64), chamferTop(circle(C.cap / 2, c.x, c.y, 64), zb + C.flangeT - EZ, zt, 0.48, lay)]);
        capParts.push({ id: c.id, slot: C.capMat === 'petg' ? 1 : 3, m: body });
      }
    }

    mark('elements');
    // ------------------------------------------------ objects, poses, plate
    const objects = [];
    const bodyParts = [{ name: 'shell', slot: 1, m: shellM }, { name: 'traces', slot: 2, m: condM }];
    if (!tpuM.isEmpty()) bodyParts.push({ name: 'flex', slot: 3, m: tpuM });
    if (!ctpuM.isEmpty()) bodyParts.push({ name: 'contacts', slot: 4, m: ctpuM });
    objects.push({ name: 'body', parts: bodyParts, pose: (m) => m, explode: 0 });
    objects.push({ name: 'bezel', parts: bz, pose: (m) => m.rotate([180, 0, 0]).translate([0, 0, zbt]), explode: 22 });
    if (elemParts.length) {
      const fr = GEO.union3(elemParts.map(e => e.frame)), tp = GEO.union3(elemParts.map(e => e.tip));
      const k = elemParts.length, pitch = elem2.hMax + 3;
      const flat = (cs) => GEO.union3(elemParts.map((e, i) => ext(cs, 0, C.w).translate([0, i * pitch, 0])));
      objects.push({ name: 'click-elements', parts: [{ name: 'springs', slot: 1, m: fr }, { name: 'tips', slot: 4, m: tp }],
        posed: [{ name: 'springs', slot: 1, m: flat(elem2.frame) }, { name: 'tips', slot: 4, m: flat(elem2.tip) }], explode: 8, count: k });
    }
    const cp = capParts.filter(c => !c.stick);
    if (cp.length) {
      objects.push({ name: 'click-caps', parts: [{ name: 'caps', slot: cp[0].slot, m: GEO.union3(cp.map(c => c.m)) }],
        pose: (m) => m.translate([0, 0, -(ztop - C.flangeT)]), explode: 30 });
    }
    const sp = capParts.find(c => c.stick);
    if (sp) {
      objects.push({ name: 'stick-cap', parts: [{ name: 'thumb', slot: 3, m: sp.m }],
        pose: (m) => m.rotate([180, 0, 0]), explode: 34 });
    }
    const out = { objects: [], warn, notes, ms: 0, netMeshes: nets.map(n => ({ name: n.name, mesh: GEO.meshOf(n.m) })) };
    const bedW = P.print.bedW, bedD = P.print.bedD;
    let cursorY = 6, curX = 6, rowH = 0;
    // collapse sliver triangles left where near tangent solids met; moves no vertex more than 1e-4 mm
    const tidy = (m) => m.simplify(1e-4);
    for (const o of objects) {
      o.parts.forEach(p => { p.m = tidy(p.m); });
      if (o.posed) o.posed.forEach(p => { p.m = tidy(p.m); });
      o.parts = o.parts.filter(p => !p.m.isEmpty());
      if (o.posed) o.posed = o.posed.filter(p => !p.m.isEmpty());
      if (!o.parts.length) continue;
      const asm = o.parts.map(p => ({ name: p.name, slot: p.slot, mesh: GEO.meshOf(p.m), vol: p.m.volume() }));
      let posed = o.posed || o.parts.map(p => ({ name: p.name, slot: p.slot, m: o.pose(p.m) }));
      const all = GEO.union3(posed.map(p => p.m));
      const bb = GEO.bbox(all);
      const cx = (bb.min[0] + bb.max[0]) / 2, cy = (bb.min[1] + bb.max[1]) / 2;
      const w = bb.max[0] - bb.min[0], d = bb.max[1] - bb.min[1];
      posed = posed.map(p => ({ name: p.name, slot: p.slot, m: p.m.translate([-cx, -cy, -bb.min[2]]) }));
      if (curX + w > bedW - 6 && curX > 6) { curX = 6; cursorY += rowH + 6; rowH = 0; }
      const place = [curX + w / 2, cursorY + d / 2, 0];
      curX += w + 6; rowH = Math.max(rowH, d);
      const volP = posed.reduce((a, p) => a + p.m.volume(), 0), volA = asm.reduce((a, p) => a + p.vol, 0);
      if (Math.abs(volP - volA) > 1e-3 * Math.max(1, volA)) warn.push(o.name + ': print pose volume differs from the assembly');
      out.objects.push({
        name: o.name, explode: o.explode, count: o.count || 1,
        asm, print: posed.map(p => ({ name: p.name, slot: p.slot, mesh: GEO.meshOf(p.m), vol: p.m.volume() })),
        place, size: [w, d, bb.max[2] - bb.min[2]]
      });
    }
    const plateD = cursorY + rowH + 6;
    out.plate = { w: bedW, d: bedD, used: plateD, fits: plateD <= bedD && out.objects.every(o => o.size[0] <= bedW - 12) };
    if (!out.plate.fits) warn.push('the plate does not fit the bed, print the bezel on a second plate');

    mark('meshes');
    // ------------------------------------------------ readouts
    const Ph = P.phys;
    const rho = Ph.rhoC * 1e-2, rhoZ = Ph.rhoCz * 1e-2, rhoT = Ph.rhoT * 1e-2;
    const Atr = Rt.w * P.stack.trace * 1e-6;
    const netLen = new Map(R.nets.map(n => [n.name, n.len + n.stubs.reduce((a, s) => a + Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]), 0)]));
    const netVias = new Map(R.nets.map(n => [n.name, n.vias.length]));
    const Rtrace = (n) => (netLen.get(n) || 0) * 1e-3 * rho / Atr;
    const Rpost = (h, r) => rhoZ * h * 1e-3 / (Math.PI * (r * 1e-3) ** 2);
    const hPost = z.floor - z.l1[0];
    const gndR = Rtrace('GND') + 2 * Rpost(hPost, Rt.post);
    const rows = [];
    for (const bi of btnInfo) {
      const ids = bi.type === 'stick' ? ['UP', 'LEFT', 'RIGHT', 'DOWN'] : [bi.id];
      for (const id of ids) {
        let Rsw = 0, extra = 0;
        const Rn = Rtrace(id) + 2 * Rpost(hPost, Rt.post) + (netVias.get(id) || 0) * Rpost(z.l2[1] - z.l1[0], Rt.via);
        if (bi.type === 'flex') {
          extra = 2 * Rpost(bi.colTop - z.floor, fd.colR * 0.7);
          Rsw = rhoT * (F.colGap + fd.colR) * 1e-3 / (F.cap * 1e-3 * fd.colR * 2e-3) + 2 * rhoT * F.cap * 1e-3 / (Math.PI * (fd.colR * 1e-3) ** 2 / 2);
        } else if (bi.type === 'clicky') {
          extra = 2 * Rpost(Math.max(0.1, clickFloor - z.pl[0]), 0.8);
          Rsw = rhoT * (C.tip / 2 + 0.6) * 1e-3 / (cd.tipExp * 1e-3 * C.w * 1e-3) + 2 * rhoT * cd.tipExp * 1e-3 / (1.3e-3 * C.w * 1e-3);
        } else if (bi.type === 'stick') {
          const S = L.stick;
          extra = Rpost(S.padZ[0] - z.floor, Rt.post) + Rpost(S.comZ[0] - z.floor, Rt.post);
          Rsw = rhoT * S.span * 1e-3 / (P.stick.bandH * 1e-3 * 2e-3) * 0.5;
        } else if (bi.type === 'touch') {
          extra = Rpost(ztop + bt - z.floor, Rt.post);
        }
        const common = bi.type === 'touch' ? Rtrace('3V3') + 2 * Rpost(hPost, Rt.post) : gndR;
        const total = Rn + extra + Rsw + common;
        const pin = P.pins[id];
        const Cpf = Ph.cpin + (netLen.get(id) || 0) * 0.02 + 1;
        let read;
        if (bi.type === 'touch') {
          const Rskin = 20e6 + total;
          const tau = Rskin * Cpf * 1e-12;
          read = { tauMs: tau * 1e3, wait: Ph.waitTouch, settle: 1 - Math.exp(-Ph.waitTouch * 1e-3 / tau), ok: Ph.waitTouch * 1e-3 > 3 * tau, reject: Ph.waitTouch * 1e-3 / (3 * Cpf * 1e-12) };
        } else {
          const tau = total * Cpf * 1e-12;
          // anything that links the pin to the rail below reject ohms also crosses inside the wait,
          // so a smear or a string under that reads as a key held down
          read = { tauMs: tau * 1e3, wait: Ph.waitMech, settle: 1, ok: Ph.waitMech * 1e-3 > 5 * tau, reject: Ph.waitMech * 1e-3 / (5 * Cpf * 1e-12) };
        }
        rows.push({ id, pin, type: bi.type, len: netLen.get(id) || 0, R: total, Rsw, C: Cpf, read });
      }
    }
    const droop = Ph.leak * 1e-9 * Ph.waitTouch * 1e-3 / (Ph.cpin * 1e-12);
    const rejectMin = Math.min(...rows.map(r => r.read.reject));
    pairs.sort((x, y) => x.g - y.g);
    out.elec = { rows, droop, rejectMin, minGap, pairs: pairs.slice(0, 8), gndLen: netLen.get('GND') || 0, nets: nets.map(n => ({ name: n.name, parts: n.parts, vol: n.vol })) };
    if (droop > 1.0) warn.push('idle droop ' + droop.toFixed(2) + ' V over the touch wait at ' + Ph.leak + ' nA of pin leakage, shorten the wait');
    for (const r of rows) if (!r.read.ok) warn.push(r.id + ': path ' + (r.R / 1e6).toFixed(1) + ' Mohm does not settle inside the ' + r.read.wait + ' ms read, widen the traces or lengthen the wait');
    const mech = {};
    if (cd) mech.click = { peak: cd.fe.peak, valley: cd.fe.valley, drop: cd.fe.drop, dPeak: cd.fe.dPeak, dValley: cd.fe.dValley, cg: cd.cg, eStop: cd.eStop, bistable: cd.fe.bistable, curve: cd.fe.pts.map(p => [p.d, p.F]), floor: clickFloor, vTop: vTopEff };
    if (L.types.has('flex')) mech.flex = { gap: fd.gap, Hs: F.Hs, keyH: fd.keyH, floor: zf, rsb: fd.rsb, wall: fd.wallH };
    if (L.stick) mech.stick = { Rw: L.stick.Rw, gap: L.stick.restGap, padZ: L.stick.padZ, comZ: L.stick.comZ, hole: stickClear(P, L).hole };
    if (cd && cd.fe.bistable) warn.push('click springs are bistable at this rise, keys will latch down');
    if (cd && !cd.fe.snap) warn.push('click springs do not snap at this rise, raise Q above 2');
    // ------------------------------------------------ fits: every clearance and interference,
    // with what the printer is expected to do to it (holes come out about 0.15 small, pegs 0.05 big)
    const fits = [];
    const fit = (group, name, value, ok, note) => fits.push({ group, name, value, ok, note: note || '' });
    const mm = (v) => v.toFixed(2) + ' mm';
    fit('traces', 'trace width', mm(Rt.w), Rt.w >= 0.8, Rt.w >= 0.8 ? 'about ' + Math.round(Rt.w / 0.42) + ' lines at a 0.4 nozzle' : 'under two lines wide');
    fit('traces', 'net to net, measured', isFinite(minGap) ? mm(minGap) : 'n/a', minGap >= 0.4, 'closest any two nets get anywhere, in plane or between layers');
    fit('traces', 'insulation between layers', mm(P.stack.iso), P.stack.iso >= 0.72, Math.round(P.stack.iso / lay) + ' layers of PETG between a trace and the one crossing it'
      + (P.stack.iso < 0.72 ? '; two layers is thin, one bad layer bridges them' : ''));
    fit('traces', 'PETG over layer 2', mm(z.floor - z.l2[1]), (z.floor - z.l2[1]) >= 0.72, 'what separates a trace from a key pad or a bump');
    if (L.types.has('flex')) {
      const b0 = L.btns.find(b => b.type === 'flex');
      fit('flex key', 'contact gap', mm(fd.gap), fd.gap >= 1.2, (100 * fd.gap / F.Hs).toFixed(0) + ' percent of the cone');
      fit('flex key', 'cap bridge', mm(F.hole), F.hole <= 4.5, 'conductive TPU spanning the hole, unsupported');
      fit('flex key', 'split between halves', mm(F.colGap), F.colGap >= 0.6, 'exposed, a string across it reads as a press');
      fit('flex key', 'column to cone wall', mm(fd.rh + fd.gap * Math.tan(fd.a) - fd.colR), fd.rh + fd.gap * Math.tan(fd.a) - fd.colR > 0.5, 'at the top of the column');
      fit('flex key', 'face through bezel hole', mm(2 * ((b0 ? b0.bezR : fd.rFace + 0.5) - fd.rFace)), true, 'diametral, the bezel drops over the key');
      fit('flex key', 'stands proud of the bezel', mm(F.protrude), F.protrude >= 0.8, '');
    }
    if (cd) {
      fit('click spring', 'slot at the end blocks', mm(C.slotClr), C.slotClr >= 0.2 && C.slotClr <= 0.6, 'diametral, snug so the spring stands up straight');
      fit('click spring', 'slot over the arch', mm(C.slotClr + C.relief), C.slotClr + C.relief >= 1.0, 'diametral, the beams never touch a wall');
      fit('click spring', 'slot length over spring', mm(C.endClr), C.endClr >= 0.2, 'the ribs locate it, not the slot ends');
      fit('click spring', 'rib in the block groove', mm(0.4), true, 'keys each end block down to the floor so the arch cannot spread');
      fit('click spring', 'under the bezel', mm(0.12), true, 'the bezel holds the end blocks down');
      fit('click spring', 'cap through bezel hole', mm(0.5), true, 'diametral');
      fit('click spring', 'cap flange in its well', mm(0.8), true, 'diametral');
      fit('click spring', 'travel to contact', mm(cd.cg), cd.cg > 0.6, 'snap peaks at ' + mm(cd.fe.dPeak));
      fit('click spring', 'tip over each pad', mm(C.tip / 2 - 0.3), C.tip / 2 - 0.3 > 0.5, 'pads split by 0.60 mm');
      fit('click spring', 'beam thickness', mm(C.t), C.t >= 0.4, C.t < 0.6 ? 'one line, needs thin wall handling on' : '');
      fit('click spring', 'strain at the stop', (cd.eStop * 100).toFixed(1) + ' percent', cd.eStop <= 0.025, 'PETG fatigues above about 2.5');
    }
    if (L.types.has('touch')) {
      fit('touch pad', 'comb gap', mm(P.touch.gap), P.touch.gap >= 0.6, 'exposed, skin bridges it');
      fit('touch pad', 'finger width', mm(P.touch.finger), P.touch.finger >= 0.6, '');
      fit('touch pad', 'boss through the bezel', mm(0.6), true, 'diametral, flush with the bezel top');
    }
    if (L.stick) {
      const S = L.stick, sc = stickClear(P, L);
      fit('stick', 'band to wall at rest', mm(S.restGap), S.restGap >= 0.4, 'closes at ' + P.stick.tilt + ' degrees of tilt');
      fit('stick', 'band on the wall pad', mm(S.span / 2 - P.stick.padGap / 2), S.span / 2 - P.stick.padGap / 2 > 0.5, 'and the same on the common ring above');
      fit('stick', 'contact arc, one degree past', (S.arcHalf * 2 / deg).toFixed(0) + ' deg', S.arcHalf > 8 * deg, 'zero at the contact angle itself, it grows as you push');
      fit('stick', 'contact arc at full tilt', (S.arcOver * 2 / deg).toFixed(0) + ' deg', S.arcOver > 15 * deg, '');
      fit('stick', 'diagonals reach two pads', S.eightWay ? 'yes' : 'no', S.eightWay, 'pads are ' + (S.sectHalf * 2 / deg).toFixed(0) + ' deg wide, split by ' + mm(P.stick.padGap));
      fit('stick', 'pad to common ring', mm(S.comZ[0] - S.padZ[1]), (S.comZ[0] - S.padZ[1]) >= 0.4, 'the band bridges this');
      if (sc.inplace) {
        fit('stick', 'bezel hole over the thumb pad', mm(2 * (sc.hole - P.stick.capD / 2)), sc.hole > P.stick.capD / 2, 'diametral, the bezel drops over it after printing');
        fit('stick', 'pad rim above the bezel', mm(sc.lift), sc.lift > 0.3, 'the rim is the only part that has to clear at ' + (P.stick.tilt + P.stick.over) + ' degrees');
        fit('stick', 'dish depth', mm(Math.min(P.stick.capDish, 2.4)), true, P.stick.capRings + ' grip rings, underside stays at 45 degrees');
        fit('stick', 'pad diameter', mm(P.stick.capD), P.stick.capD >= 12 && P.stick.capD <= 22, 'a console thumb top is 18 to 20');
      } else {
        fit('stick', 'cap socket on the stem', mm(0.1), true, 'diametral before printing, a press fit after');
        fit('stick', 'cap above the bezel', mm(sc.diskLift), true, '');
      }
      const rc = Math.min(S.stemR, S.rbt - 1.0);
      fit('stick', 'conductive collar thickness', mm(S.rbt - rc), S.rbt - rc >= 1.0, 'a collar on the stem, the stem itself runs through unbroken');
      const arm = (sc.inplace ? sc.capBot + P.stick.capH : zbt + sc.diskLift) - S.zb1;
      const Zsec = Math.PI * Math.pow(2 * S.stemR, 3) / 32;
      const sigma = 20 * arm / Zsec;
      fit('stick', 'stem stress at a 20 N side push', sigma.toFixed(1) + ' MPa', sigma < 15, 'TPU 95A parts break somewhere around 30, and the print is weaker than the spec');
      fit('stick', 'well wall to the outline', mm(0.6), true, '');
    }
    fit('board', 'pocket around the board', mm(B.clr), B.clr >= 0.15, 'each side');
    if (B.mode !== 'wire') {
      fit('board', 'bump height', mm(B.bumpH), B.bumpH >= 0.24, 'conductive PLA under each used pad');
      fit('board', 'bezel squeeze on the board', mm(B.press), B.press > 0 && B.press <= 0.5, 'interference, the ribs hold it on the bumps');
      fit('board', 'bump to bump', mm(B.pitch - B.bumpW - 0.2), B.pitch - B.bumpW - 0.2 >= 0.6, 'exposed, adjacent pads are different nets');
    }
    if (B.window) fit('board', 'clearance under the board', mm(B.bumpH + 2 * lay), true, 'window recessed into the pocket floor');
    fit('board', 'USB opening', mm(notchW) + ' wide', notchW >= 11, 'a plug overmould is usually 11 to 12 mm');
    fit('board', 'USB opening height', mm(notchTop - notchZ0), notchTop - notchZ0 >= 7.0, 'a USB C plug overmould is about 7 mm tall' + (notchTop > ztop + 1e-6 ? ', the opening carries on into the bezel' : ''));
    if (L.cups.length) {
      fit('wire cups', 'bore', mm(P.cups.bore), P.cups.bore >= 0.8, 'melt a wire in, or drive an M1.2 self tapper');
      const cupGap = P.cups.pitch - P.cups.od, lane = Rt.w + 2 * Rt.clr;
      fit('wire cups', 'cup to cup', mm(cupGap), cupGap >= 1.2, cupGap >= lane ? 'a trace can pass between them' : 'traces route around the row, not between the cups');
    }
    if (L.pegs.length) {
      fit('bezel', 'peg in its socket', mm(0.1), true, 'diametral before printing; holes come out about 0.15 small, so expect a press');
      fit('bezel', 'peg length', mm(pegLen), pegLen >= 1.2, 'socket is 0.3 mm deeper');
    }
    const feats = [Rt.w];
    if (cd) feats.push(C.t);
    if (L.types.has('flex')) feats.push(F.colGap, P.flex.wall);
    if (L.types.has('touch')) feats.push(P.touch.gap, P.touch.finger);
    if (L.stick) feats.push(P.stick.padGap);
    const minFeat = Math.min(...feats);
    fit('print', 'smallest feature', mm(minFeat), minFeat >= 0.4, minFeat < 0.6 ? 'under one nozzle width, check it slices' : '');
    out.fits = fits;
    for (const f of fits) if (!f.ok) warn.push(f.group + ': ' + f.name + ' is ' + f.value + (f.note ? ', ' + f.note : ''));
    out.mech = mech;
    out.z = { floor: z.floor, top: ztop, bezelTop: zbt, l1: z.l1, l2: z.l2, pad: z.pl, board: boardZ, boardTop, recC, clickFloor, flexFloor: zf };
    out.btnInfo = btnInfo;
    out.dims = { W: P.shape.W, H: P.shape.H, T: zbt };
    GEO.flush([]);
    mark('readouts');
    out.prof = prof;
    out.ms = Date.now() - t0;
    return out;
  }

  // stepped top chamfer, one layer per step, exactly what the printer lays down
  function chamferTop(cs, z0, z1, c, lay) {
    const GEO = H.GEO;
    const n = Math.max(0, Math.min(Math.round(c / lay), Math.floor((z1 - z0) / lay) - 1));
    if (!n) return GEO.ext(cs, z0, z1);
    const parts = [GEO.ext(cs, z0, z1 - n * lay + EZ)];
    for (let i = 1; i <= n; i++) {
      const o = cs.offset(-c * i / n, 'Round');
      if (o.isEmpty()) break;
      parts.push(GEO.ext(o, z1 - (n - i + 1) * lay, z1 - (n - i) * lay + (i < n ? EZ : 0)));
    }
    return GEO.union3(parts);
  }

  function stickClear(P, L) {
    const S = L.stick, SP = P.stick, zbt = L.z.top + P.stack.bezel;
    const ts = S.ts, h = zbt - S.zp;
    const bossR = SP.stemD / 2 + 1.4;
    if (SP.top !== 'press') {
      // the thumb pad sits as low as it can: only its rim has to clear the bezel at full tilt,
      // the stem and the underside of the bowl swing inside the hole
      const capR = SP.capD / 2, rs = S.stemR, hole = capR + 0.8;
      const clears = (capBot) => {
        for (let i = 0; i <= 24; i++) {
          const r = capR * i / 24, z = capBot + Math.max(0, r - rs);
          const d = r * Math.cos(ts) + (z - S.zp) * Math.sin(ts);
          const zr = S.zp - r * Math.sin(ts) + (z - S.zp) * Math.cos(ts);
          if (d > hole && zr < zbt + 0.3) return false;
        }
        return true;
      };
      let lo = zbt - capR, hi = zbt + capR + 4;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (clears(mid)) hi = mid; else lo = mid; }
      const capBot = hi, zRim = capBot + (capR - rs);
      return { hole, inplace: true, capBot, zRim, lift: zRim - zbt, bossLift: 0, diskLift: 0, stemAbove: zRim - zbt + SP.capH };
    }
    const hole = S.stemR / Math.cos(ts) + (h + 0.5) * Math.tan(ts) + 0.3;
    const bossLift = Math.max(0.6, bossR * Math.sin(ts) + (h + 0.6) * (1 - Math.cos(ts)) + 0.3);
    const diskLift = Math.max(bossLift + 1.2, SP.capD / 2 * Math.sin(ts) + (h + bossLift) * (1 - Math.cos(ts)) + 0.4);
    const stemAbove = diskLift + 1.0;
    return { hole, inplace: false, bossLift, diskLift, stemAbove };
  }

  // the thumb top: a 45 degree underside, a rounded rim, a shallow dish with concentric grip rings.
  // the dish is an upward face, so its angle is free; only the underside has to stay printable
  function thumbProfile(P, rs, zFl, capR) {
    const SP = P.stick, rim = SP.capH, dish = Math.min(SP.capDish, 2.4);
    const zRim = zFl + (capR - rs), zTop = zRim + rim;
    const pts = [[rs, zFl], [capR - 0.45, zRim - 0.45], [capR, zRim + 0.1], [capR, zTop - 0.35], [capR - 0.35, zTop]];
    const zAt = (r) => zTop - dish * (1 - (r / capR) * (r / capR));
    const n = Math.max(0, Math.round(SP.capRings || 0));
    const rOuter = capR - 0.35, step = rOuter / (n ? n + 1 : 1);
    for (let k = 0; k < n; k++) {
      const r1 = rOuter - step * (k + 0.35), r2 = r1 - 0.55;
      pts.push([r1, zAt(r1)], [r1, zAt(r1) + 0.35], [r2, zAt(r2) + 0.35], [r2, zAt(r2)]);
    }
    pts.push([0, zAt(0)]);
    return { pts, zRim, zTop };
  }
  // the click spring in its own frame: u along the slot, v up from the slot floor
  function clickElement2D(P, cd, vTop, hBlock) {
    const GEO = H.GEO, C = P.clicky, h = cd.h, t = C.t, l = C.l;
    const arch = (vb) => {
      const up = [], dn = [], n = 64;
      for (let i = 0; i <= n; i++) {
        const u = -l / 2 - 0.4 + (l + 0.8) * i / n;
        const uu = Math.max(-l / 2, Math.min(l / 2, u));
        const v = vb + h / 2 * (1 + Math.cos(2 * Math.PI * uu / l));
        up.push([u, v + t / 2]); dn.push([u, v - t / 2]);
      }
      return GEO.poly(up.concat(dn.reverse()));
    };
    const blocks = [GEO.rect(l / 2, 0, l / 2 + C.eb, hBlock), GEO.rect(-l / 2 - C.eb, 0, -l / 2, hBlock)];
    const keyW = C.rib + 0.4, keyH = 0.8;
    const grooves = [1, -1].map(sgn => { const um = sgn * (l / 2 + C.eb / 2); return GEO.rect(um - keyW / 2, -0.01, um + keyW / 2, keyH); });
    const shuttle = GEO.rect(-C.sw / 2, cd.cg + cd.tipExp, C.sw / 2, vTop);
    const y0 = cd.cg + cd.tipExp, y1 = y0 + cd.dove;
    const dove = GEO.poly([[-0.6, y0 - 0.01], [0.6, y0 - 0.01], [0.9, y1], [-0.9, y1]]);
    const tip = GEO.union2([GEO.rect(-C.tip / 2, cd.cg, C.tip / 2, y0 + 0.01), dove]);
    const frame = GEO.union2([...blocks, arch(cd.va), arch(cd.vb), shuttle]).subtract(tip).subtract(GEO.union2(grooves));
    return { frame, tip, hMax: Math.max(hBlock, vTop), len: l + 2 * C.eb };
  }

  H.MODEL = { build, chamferTop, stickClear, clickElement2D, thumbProfile };
})(typeof globalThis !== 'undefined' ? globalThis : this);
