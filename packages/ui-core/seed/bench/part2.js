/* part2.js: state, face composer, kernel glue. Depends on RasterMesh (rastermesh.js). */
'use strict';
const BENCH = globalThis.BENCH = {};   // public hooks for tests: BENCH.build(), BENCH.exportBytes(kind), BENCH.state()

// ------------------------------------------------------------ state
const FONTS = { marker: 'Permanent Marker', plex: 'IBM Plex Mono', elite: 'Special Elite', vt: 'VT323' };
const PALETTE = ['#1A1A1A', '#FFFFFF', '#FE0386', '#F5F0E6'];

function blankState() {
  return {
    rev: 1,
    blank: { shape: 'round', size: 44, thk: 3.6, inlay: 1.2 },
    rim: { on: true, w: 2.2 },
    colour: { n: 3, body: 1, rim: 3,
      slots: [{ color: '#1A1A1A', type: 'PETG', name: 'black' }, { color: '#FFFFFF', type: 'PETG', name: 'white' },
              { color: '#FE0386', type: 'PETG', name: 'pink' }, { color: '#F5F0E6', type: 'PETG', name: 'cream' }] },
    faces: { front: [], back: [] },
    print: { layer: 0.24, minF: 0.6, boost: 0.15, gap: 0, despeckle: true, res: 8, auto: true, writeFilaments: true,
      pattern: 'Generic {TYPE} @FF C5P', printer: 'Flashforge Creator 5 Pro 0.4 nozzle', process: '0.24mm Standard @FF C5' },
    plate: { count: 1, bedW: 256, bedD: 256 },
    ui: { face: 'front', sel: null, step: 0, visited: [true, false, false, false], cam: 'iso' }
  };
}
function exampleState() {
  const s = blankState();
  s.faces.front = [
    { id: 'L1', kind: 'shape', shape: 'ring', w: 36, h: 36, t: 1.4, dx: 0, dy: 0, rot: 0, slot: 3, cut: false },
    { id: 'L2', kind: 'text', text: 'hack|.build', font: 'marker', size: 5, dx: 0, dy: -1, rot: 0, slot: 2, slot2: 3, splitGap: 0.8, arc: 0, ls: 0, cut: false }
  ];
  s.faces.back = [
    { id: 'L3', kind: 'text', text: 'MAKE THINGS', font: 'vt', size: 6, dx: 0, dy: 0, rot: 0, slot: 2, slot2: 2, splitGap: 0, arc: 14, ls: 1, cut: false },
    { id: 'L4', kind: 'text', text: 'BREAK THINGS', font: 'vt', size: 6, dx: 0, dy: 0, rot: 0, slot: 2, slot2: 2, splitGap: 0, arc: -14, ls: 1, cut: false },
    { id: 'L5', kind: 'text', text: '2026', font: 'plex', size: 5, dx: 0, dy: -1.5, rot: 0, slot: 3, slot2: 3, splitGap: 0, arc: 0, ls: 0, cut: false }
  ];
  return s;
}
let ST = blankState();
let uid = 10;
const newId = () => 'L' + (uid++);

function getP(path) { return path.split('.').reduce((o, k) => o[k], ST); }
function setP(path, v) { const ks = path.split('.'); const o = ks.slice(0, -1).reduce((o, k) => o[k], ST); o[ks[ks.length - 1]] = v; }

// ------------------------------------------------------------ history (undo / redo)
const HIST = { stack: [], i: -1, max: 80, t: null };
function snapshot() {
  clearTimeout(HIST.t);
  HIST.t = setTimeout(() => {
    const s = JSON.stringify({ blank: ST.blank, rim: ST.rim, colour: ST.colour, faces: ST.faces, print: ST.print, plate: ST.plate });
    if (HIST.stack[HIST.i] === s) return;
    HIST.stack = HIST.stack.slice(0, HIST.i + 1);
    HIST.stack.push(s);
    if (HIST.stack.length > HIST.max) HIST.stack.shift();
    HIST.i = HIST.stack.length - 1;
  }, 450);
}
function restore(s) {
  const o = JSON.parse(s);
  Object.assign(ST, o);
  ST.ui.sel = null;
  UI.refreshAll();
  commit();
}
function undo() { if (HIST.i > 0) { HIST.i--; restore(HIST.stack[HIST.i]); } }
function redo() { if (HIST.i < HIST.stack.length - 1) { HIST.i++; restore(HIST.stack[HIST.i]); } }

// ------------------------------------------------------------ blank shapes (signed distance, negative inside, mm)
const SHAPES = {
  round: (x, y, R) => Math.hypot(x, y) - R,
  square: (x, y, R) => Math.max(Math.abs(x), Math.abs(y)) - R,
  squircle: (x, y, R) => Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(y), 4), 0.25) - R,
  hex: (x, y, R) => { const a = R * Math.cos(Math.PI / 6); const ax = Math.abs(x), ay = Math.abs(y); return Math.max(ay, ax * Math.sin(Math.PI / 3) + ay * 0.5) - a; },
  pick: (x, y, R) => {            // 351 style teardrop: circle top, pointed bottom
    const r = R * 0.86, cy = R * 0.16;
    const d1 = Math.hypot(x, y - cy) - r;
    const tip = -R * 1.05, k = (r + 0.0) / (cy - tip);
    const yy = y - tip, d2 = Math.abs(x) - k * yy;
    return y > cy ? d1 : Math.max(d2, -yy - 0.001 + 0);
  }
};

// ------------------------------------------------------------ face composer
const IMG = new Map();                    // src -> HTMLImageElement
function imageFor(src) {
  if (IMG.has(src)) return IMG.get(src);
  const im = new Image();
  im.onload = () => commit();
  im.src = src;
  IMG.set(src, im);
  return im;
}

// paint one layer as an alpha mask onto ctx (W x H canvas covering size mm, y up). Returns nothing.
function paintLayer(ctx, L, res, size, part) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(res, -res);                    // mm to px, y up
  ctx.translate(L.dx || 0, L.dy || 0);
  ctx.rotate((L.rot || 0) * Math.PI / 180);
  ctx.fillStyle = '#000';
  if (L.kind === 'shape') {
    const w = L.w, h = L.h, t = L.t;
    ctx.beginPath();
    if (L.shape === 'rect') ctx.rect(-w / 2, -h / 2, w, h);
    else if (L.shape === 'ellipse') ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (L.shape === 'ring') { ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.ellipse(0, 0, w / 2 - t, h / 2 - t, 0, 0, Math.PI * 2, true); }
    else if (L.shape === 'frame') { ctx.rect(-w / 2, -h / 2, w, h); ctx.rect(-w / 2 + t, -h / 2 + t, w - 2 * t, h - 2 * t); }
    else if (L.shape === 'diamond') { ctx.moveTo(0, h / 2); ctx.lineTo(w / 2, 0); ctx.lineTo(0, -h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath(); }
    else if (L.shape === 'chevrons') { for (let i = -1; i <= 1; i++) { const x = i * w * 0.4; ctx.moveTo(x - w * 0.16, -h / 2); ctx.lineTo(x, 0); ctx.lineTo(x - w * 0.16, h / 2); ctx.lineTo(x - w * 0.16 + t, h / 2); ctx.lineTo(x + t, 0); ctx.lineTo(x - w * 0.16 + t, -h / 2); ctx.closePath(); } }
    ctx.fill('evenodd');
  } else if (L.kind === 'text') {
    ctx.scale(1, -1);                      // text draws y down
    const font = (L.size * 1) + 'px "' + FONTS[L.font] + '"';
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const ls = L.ls || 0;
    const segs = String(L.text || '').split('|');
    const measure = s => { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls; return w; };
    if (L.arc) {
      // characters along an arc of radius |arc|; positive = text on top reading clockwise, negative = bottom
      const r = Math.abs(L.arc), up = L.arc > 0;
      const txt = segs.join('');
      const total = measure(txt);
      let a = -total / 2 / r;
      for (const ch of txt) {
        const cw = ctx.measureText(ch).width + ls;
        const mid = a + cw / 2 / r;
        ctx.save();
        if (up) { ctx.rotate(mid); ctx.translate(0, -r); }
        else { ctx.rotate(-mid); ctx.translate(0, r); }          // bottom arc: glyphs stay upright, read left to right
        if (part === 0) ctx.fillText(ch, -cw / 2 + ls / 2, 0);
        ctx.restore();
        a += cw / r;
      }
    } else {
      const gap = segs.length > 1 ? (L.splitGap || 0) : 0;
      const ws = segs.map(measure);
      const total = ws.reduce((a, b) => a + b, 0) + gap * (segs.length - 1);
      let x = -total / 2;
      segs.forEach((s, i) => {
        if (i === part || (part === 0 && segs.length === 1)) {
          let xx = x;
          for (const ch of s) { ctx.fillText(ch, xx, 0); xx += ctx.measureText(ch).width + ls; }
        }
        x += ws[i] + gap;
      });
    }
  } else if (L.kind === 'image') {
    const im = imageFor(L.src);
    if (im.complete && im.naturalWidth) {
      const w = L.w, h = L.w * im.naturalHeight / im.naturalWidth;
      ctx.scale(1, -1);
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
      // threshold: dark pixels become ink. mono = luminance below thr; silhouette = any alpha
      const W2 = ctx.canvas.width, H2 = ctx.canvas.height;
      ctx.restore(); ctx.save();
      const d = ctx.getImageData(0, 0, W2, H2), p = d.data;
      const thr = (L.thr === undefined ? 0.5 : L.thr) * 255;
      for (let i = 0; i < p.length; i += 4) {
        const a = p[i + 3];
        const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        let on = a > 40 && (L.mode === 'silhouette' ? true : (L.invert ? lum > thr : lum < thr));
        p[i] = p[i + 1] = p[i + 2] = 0; p[i + 3] = on ? 255 : 0;
      }
      ctx.putImageData(d, 0, 0);
    }
  }
  ctx.restore();
}

// compose one face into a label grid. Returns {labels, cuts, W, H, px}
function composeFace(faceName, res) {
  const size = ST.blank.size, R = size / 2, W = Math.ceil(size * res) + 2, H = W, px = 1 / res;
  const x0 = -W * px / 2, y0 = -H * px / 2;
  const sdf = SHAPES[ST.blank.shape];
  const bodyS = ST.colour.body, rimS = ST.rim.on ? ST.colour.rim : ST.colour.body, rimW = ST.rim.on ? ST.rim.w : 0;
  const labels = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const d = sdf(x0 + (i + 0.5) * px, y0 + (j + 0.5) * px, R);
    if (d > 0) continue;
    labels[j * W + i] = d > -rimW ? rimS : bodyS;
  }
  const cuts = new Uint8Array(W * H);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const layers = ST.faces[faceName];
  // label rows run y up (row 0 = bottom, same as the mesh kernel); canvas rows run down, so flip on stamp
  const stampInto = (alpha, S, cut) => {
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = j * W + i, q = ((H - 1 - j) * W + i) * 4 + 3;
      if (alpha[q] > 127) { if (cut) cuts[p] = 1; else if (labels[p] === bodyS) labels[p] = S; }
    }
  };
  for (const L of layers) {
    if (L.mute) continue;
    const parts = (L.kind === 'text' && String(L.text).includes('|') && !L.arc) ? 2 : 1;
    for (let part = 0; part < parts; part++) {
      ctx.clearRect(0, 0, W, H);
      paintLayer(ctx, L, res, size, part);
      const S = part === 0 ? L.slot : (L.slot2 || L.slot);
      stampInto(ctx.getImageData(0, 0, W, H).data, S, L.cut);
    }
  }
  // hygiene per non body slot: min feature open, despeckle, colour gap
  const boost = Math.round((ST.print.boost || 0) * res);
  const r = Math.max(0, Math.floor(ST.print.minF / 2 * res));
  const minCells = Math.round(0.35 * Math.PI * Math.pow(ST.print.minF / 2 * res, 2));
  const g = Math.round(ST.print.gap * res);
  for (let S = 1; S <= ST.colour.n; S++) {
    if (S === bodyS) continue;
    if (boost) RasterMesh.dilate(labels, W, H, S, boost, bodyS);
    RasterMesh.open(labels, W, H, S, r, bodyS);
    if (ST.print.despeckle) RasterMesh.despeckle(labels, W, H, S, minCells, bodyS);
    if (g) RasterMesh.gap(labels, W, H, S, g, bodyS);
  }
  // the rim band must survive hygiene: re-stamp it (it is exact geometry, not art)
  if (ST.rim.on) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const d = sdf(x0 + (i + 0.5) * px, y0 + (j + 0.5) * px, R);
    if (d <= 0 && d > -rimW) labels[j * W + i] = rimS;
  }
  for (let p = 0; p < W * H; p++) if (cuts[p]) labels[p] = 0;
  return { labels, cuts, W, H, px, x0, y0 };
}

// ------------------------------------------------------------ build (label grids -> slabs -> meshes)
const MODEL = { meshes: null, dirty: true, building: false, queued: false, ms: 0, tris: 0, warnings: [], slabs: null };
function snapLayers(v) { const L = ST.print.layer; return Math.round(Math.max(L, Math.round(v / L) * L) * 1e4) / 1e4; }

function build() {
  const t0 = performance.now();
  const res = ST.print.res;
  const front = composeFace('front', res);
  const backF = composeFace('back', res);
  const W = front.W, H = front.H, px = front.px;
  // bed facing face is read from the other side once flipped: mirror in X
  const back = RasterMesh.mirrorX(backF.labels, W, H);
  const backCuts = RasterMesh.mirrorX(backF.cuts, W, H);
  const cuts = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) cuts[p] = front.cuts[p] | backCuts[p];
  const thk = snapLayers(ST.blank.thk);
  let inlay = snapLayers(ST.blank.inlay);
  const warnings = [];
  if (inlay * 2 >= thk) { inlay = snapLayers(Math.max(ST.print.layer, (thk - ST.print.layer) / 2)); warnings.push('inlay depth clamped to leave a solid core'); }
  // solid core slab: body and rim only (art removed), cuts kept
  const bodyS = ST.colour.body, rimS = ST.rim.on ? ST.colour.rim : bodyS;
  const mid = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) { const v = front.labels[p]; mid[p] = v === 0 ? 0 : (v === rimS ? rimS : bodyS); }
  for (let p = 0; p < W * H; p++) if (cuts[p]) { front.labels[p] = 0; back[p] = 0; mid[p] = 0; }
  // art only lives in the top and bottom slabs; anything in mid that is not body or rim already reset above
  const vol = RasterMesh.volume(W, H, px, front.x0, front.y0);
  vol.addSlab(back, 0, inlay).addSlab(mid, inlay, thk - inlay).addSlab(front.labels, thk - inlay, thk);
  const heal = vol.fixPinches();
  const meshes = vol.mesh();
  let tris = 0;
  for (const s in meshes) tris += meshes[s].tris;
  if (heal.changed > W * H * 0.002) warnings.push(heal.changed + ' pinch cells healed, art is at the resolution limit');
  if (!heal.converged) warnings.push(heal.illFormed + ' pinch windows left unhealed after ' + heal.frozen + ' cells froze, mesh is not manifold there');
  if (ST.print.minF < 0.4) warnings.push('min feature under 0.4 mm will not print on a 0.4 nozzle');
  MODEL.meshes = meshes; MODEL.tris = tris; MODEL.ms = performance.now() - t0; MODEL.warnings = warnings; MODEL.dirty = false;
  MODEL.dims = { size: ST.blank.size, thk, inlay, W, H };
  MODEL.faces = { front: front.labels, back: backF.labels, W, H, px };
  if (MODEL.ms > 2500) warnings.push('build over 2.5 s, drop resolution');
  return meshes;
}

// COMMIT MODEL: touch() = live preview only, commit() = change locked in, rebuild scheduled
let buildTimer = null;
function touch(delay) { UI.preview(delay); }
function commit() {
  MODEL.dirty = true;
  ST.rev++;
  snapshot();
  UI.preview(0);
  if (!ST.print.auto) { UI.status(); return; }
  clearTimeout(buildTimer);
  buildTimer = setTimeout(runBuild, 320);
}
function runBuild() {
  if (MODEL.building) { MODEL.queued = true; return; }
  MODEL.building = true;
  UI.status('building');
  setTimeout(() => {
    try { build(); VIEW.update(); } catch (e) { console.error(e); MODEL.warnings = ['build failed: ' + e.message]; }
    MODEL.building = false;
    UI.status();
    UI.preview(0);                       // swap the quick preview for the exact print raster
    if (MODEL.queued) { MODEL.queued = false; runBuild(); }
  }, 0);
}
function ensureMesh() {
  if (MODEL.dirty || !MODEL.meshes) { build(); VIEW.update(); UI.status(); }
  return MODEL.meshes;
}
BENCH.build = () => { build(); VIEW.update(); UI.status(); return MODEL; };
BENCH.state = () => ST;
BENCH.model = () => MODEL;
