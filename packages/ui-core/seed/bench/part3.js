/* part3.js: exports, viewer, UI, boot. Depends on Orca3MF, RasterMesh, THREE, JSZip and part2.js. */
'use strict';

// ------------------------------------------------------------ plate layout (simple shelf packer)
function plateLayout() {
  const n = ST.plate.count, s = ST.blank.size + 6, cols = Math.max(1, Math.floor(ST.plate.bedW / s));
  const rows = Math.ceil(n / cols);
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    out.push([ST.plate.bedW / 2 + (c - (Math.min(n, cols) - 1) / 2) * s, ST.plate.bedD / 2 + (r - (rows - 1) / 2) * s, 0]);
  }
  const fits = cols >= 1 && rows * s <= ST.plate.bedD;
  return { positions: out, fits };
}

// ------------------------------------------------------------ exports
function partsFromModel() {
  const meshes = ensureMesh();
  const parts = [];
  for (const s of Object.keys(meshes).map(Number).sort((a, b) => a - b)) {
    const sl = ST.colour.slots[s - 1];
    parts.push({ name: (sl.name || ('slot' + s)) + '-' + s, slot: s, positions: meshes[s].positions, indices: meshes[s].indices });
  }
  return parts;
}
function pkgConfig() {
  return {
    filaments: ST.colour.slots.slice(0, ST.colour.n),
    printer: { printer_settings_id: ST.print.printer, print_settings_id: ST.print.process },
    presetPattern: ST.print.pattern, writeFilaments: ST.print.writeFilaments, layerHeight: ST.print.layer,
    title: 'inlay', objects: [{ name: 'inlay', positions: plateLayout().positions, parts: partsFromModel() }]
  };
}
async function export3mf() { VIEW.paused = true; try { const pkg = Orca3MF.build(pkgConfig()); return await pkg.zip(); } finally { VIEW.paused = false; } }
async function exportStlZip() {
  VIEW.paused = true;
  try {
    const cfg = pkgConfig();
    const z = new JSZip();
    for (const p of cfg.objects[0].parts) z.file('inlay-' + p.name + '.stl', Orca3MF.stl(p));
    z.file('print-card.txt', Orca3MF.printCard(cfg));
    z.file('design.json', designJson());
    return await z.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  } finally { VIEW.paused = false; }
}
function designJson() { return JSON.stringify({ app: 'inlay-bench', v: 1, state: { blank: ST.blank, rim: ST.rim, colour: ST.colour, faces: ST.faces, print: ST.print, plate: ST.plate } }, null, 1); }
function loadDesign(txt) {
  const o = JSON.parse(txt);
  const s = o.state || o;
  const fresh = blankState();
  Object.assign(fresh, { blank: s.blank, rim: s.rim, colour: s.colour, faces: s.faces, print: Object.assign(fresh.print, s.print), plate: s.plate || fresh.plate });
  ST = fresh;
  UI.refreshAll();
  commit();
}
function facesPng() {
  const f = MODEL.faces; if (!f) return null;
  const cv = document.createElement('canvas'); cv.width = f.W * 2 + 20; cv.height = f.H + 20;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, cv.width, cv.height);
  [['front', 10], ['back', f.W + 20]].forEach(([k, ox]) => {
    const im = ctx.createImageData(f.W, f.H);
    for (let j = 0; j < f.H; j++) for (let i = 0; i < f.W; i++) {
      const v = f[k][j * f.W + i], q = ((f.H - 1 - j) * f.W + i) * 4;
      if (!v) { im.data[q + 3] = 0; continue; }
      const c = ST.colour.slots[v - 1].color;
      im.data[q] = parseInt(c.slice(1, 3), 16); im.data[q + 1] = parseInt(c.slice(3, 5), 16); im.data[q + 2] = parseInt(c.slice(5, 7), 16); im.data[q + 3] = 255;
    }
    ctx.putImageData(im, ox, 10);
  });
  return cv;
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
BENCH.exportBytes = async kind => {          // test hook: base64 of the export
  let blob;
  if (kind === '3mf') blob = await export3mf();
  else if (kind === 'stl') blob = await exportStlZip();
  else if (kind === 'card') blob = new Blob([Orca3MF.printCard(pkgConfig())]);
  else if (kind === 'json') blob = new Blob([designJson()]);
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
};

// ------------------------------------------------------------ three viewer (own orbit, no OrbitControls dependency)
const VIEW = {};
(function () {
  const cv = document.querySelector('#stage canvas.three');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 1, 2000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(60, -80, 120); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe0f0, 0.35); fill.position.set(-80, 60, 40); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.3); rim.position.set(0, 0, -100); scene.add(rim);
  const group = new THREE.Group(); scene.add(group);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  plate.position.z = -0.05; scene.add(plate);
  const orbit = { theta: -0.9, phi: 0.95, dist: 120, target: new THREE.Vector3(0, 0, 1.8), explode: 0 };
  function applyCam() {
    const t = orbit.target;
    cam.position.set(t.x + orbit.dist * Math.cos(orbit.phi) * Math.cos(orbit.theta), t.y + orbit.dist * Math.cos(orbit.phi) * Math.sin(orbit.theta), t.z + orbit.dist * Math.sin(orbit.phi));
    cam.up.set(0, 0, 1); cam.lookAt(t);
  }
  const presets = { iso: [-0.9, 0.95], top: [-Math.PI / 2, Math.PI / 2 - 0.001], front: [-Math.PI / 2, 0.08], under: [-0.9, -0.95] };
  VIEW.preset = k => { if (k === 'explode') { orbit.explode = orbit.explode ? 0 : 1; VIEW.update(); return; } const p = presets[k]; if (p) { orbit.theta = p[0]; orbit.phi = p[1]; applyCam(); } };
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, b: e.button }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.b === 0) { orbit.theta -= dx * 0.008; orbit.phi = Math.max(-1.5, Math.min(1.5, orbit.phi + dy * 0.008)); }
    else { const r = new THREE.Vector3().subVectors(cam.position, orbit.target); const right = new THREE.Vector3().crossVectors(r, cam.up).normalize(); const up = new THREE.Vector3().crossVectors(right, r).normalize(); orbit.target.addScaledVector(right, dx * orbit.dist * 0.0015).addScaledVector(up, -dy * orbit.dist * 0.0015); }
    applyCam();
  });
  cv.addEventListener('pointerup', () => drag = null);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); orbit.dist = Math.max(20, Math.min(800, orbit.dist * (e.deltaY > 0 ? 1.1 : 0.9))); applyCam(); }, { passive: false });
  cv.addEventListener('dblclick', () => { orbit.target.set(0, 0, (MODEL.dims ? MODEL.dims.thk : 3.6) / 2); orbit.dist = Math.max(60, ST.blank.size * 2.7); applyCam(); });
  function resize() {
    const w = cv.clientWidth || 600, h = cv.clientHeight || 400;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(cv);
  VIEW.update = function () {
    while (group.children.length) { const m = group.children.pop(); m.geometry.dispose(); m.material.dispose(); }
    const meshes = MODEL.meshes; if (!meshes) return;
    const thk = MODEL.dims.thk;
    for (const s in meshes) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(meshes[s].positions, 3));
      g.setIndex(new THREE.BufferAttribute(meshes[s].indices, 1));
      g.computeVertexNormals();
      let col = ST.colour.slots[s - 1].color;
      if (col.toUpperCase() === '#FFFFFF') col = '#F4F1EA';      // pure white washes out in the viewer
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.55, metalness: 0.05, flatShading: true }));
      if (orbit.explode) m.position.z = (s - 1) * thk * 1.2;
      group.add(m);
    }
    plate.scale.set(ST.blank.size * 1.6, ST.blank.size * 1.6, 1);
    VIEW.legend();
  };
  VIEW.legend = function () {
    const el = document.getElementById('legend');
    el.innerHTML = ST.colour.slots.slice(0, ST.colour.n).map((sl, i) => '<div><i style="background:' + sl.color + '"></i>' + (i + 1) + ' ' + (sl.name || sl.type) + (i + 1 === ST.colour.body ? ' body' : '') + (ST.rim.on && i + 1 === ST.colour.rim ? ' rim' : '') + '</div>').join('');
  };
  VIEW.paused = false;                       // exports pause rendering: a software GL frame between zip chunks costs seconds
  function loop() { if (!VIEW.paused) renderer.render(scene, cam); requestAnimationFrame(loop); }
  resize(); applyCam(); loop();
  VIEW.snapshot = () => cv.toDataURL('image/png');
})();

// ------------------------------------------------------------ UI
const UI = {};
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const GUIDES = [
    ['STEP 1 ART', 'lay text, images and shapes on each face. drag them on the face canvas. changes lock in on release and rebuild the model.'],
    ['STEP 2 SHAPE', 'pick the blank, its size and thickness, the rim band, and how deep the inlays go.'],
    ['STEP 3 COLOUR', 'say how many filaments you will load and which slot is the body and the rim. art already points at slot numbers.'],
    ['STEP 4 PRINT', 'layer height, print hygiene, plate copies. export the 3MF project with the filaments set up, or STLs as a fallback.']
  ];
  // ---- steps
  function go(step) {
    ST.ui.step = step; ST.ui.visited[step] = true;
    $$('#steps button').forEach(b => { const s = +b.dataset.step; b.classList.toggle('on', s === step); b.classList.toggle('done', ST.ui.visited[s] && s !== step); });
    $$('.pane').forEach(p => p.classList.toggle('on', +p.dataset.pane === step));
    $('#guide b').textContent = GUIDES[step][0]; $('#guideText').textContent = GUIDES[step][1];
    $('#stage').classList.toggle('art', step === 0);
    if (step === 0) UI.preview(0);
  }
  $$('#steps button').forEach(b => b.onclick = () => go(+b.dataset.step));
  $$('[data-go]').forEach(b => b.onclick = () => go(+b.dataset.go));
  $$('#cams button').forEach(b => b.onclick = () => { $$('#cams button').forEach(x => x.classList.toggle('on', x === b)); VIEW.preset(b.dataset.cam); });
  // ---- generic bindings: every [data-p] input reads/writes ST; range = touch on input, commit on change
  function bindAll() {
    $$('[data-p]').forEach(el => {
      const p = el.dataset.p;
      const read = () => { const v = getP(p); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
      read();
      el._read = read;
      const write = () => { let v; if (el.type === 'checkbox') v = el.checked; else if (el.type === 'number' || el.type === 'range') v = +el.value; else if (el.tagName === 'SELECT' && !isNaN(+el.value)) v = +el.value; else v = el.value; setP(p, v); $$('[data-p="' + p + '"]').forEach(o => { if (o !== el && o._read) o._read(); }); };
      if (el.type === 'range') { el.addEventListener('input', () => { write(); touch(); }); el.addEventListener('change', () => { write(); commit(); }); }
      else el.addEventListener('change', () => { write(); commit(); });
    });
  }
  // ---- shape chips, slot count chips, face chips
  $$('#shapes .chip').forEach(b => b.onclick = () => { ST.blank.shape = b.dataset.shape; $$('#shapes .chip').forEach(x => x.classList.toggle('on', x === b)); commit(); });
  $$('#nslots .chip').forEach(b => b.onclick = () => { ST.colour.n = +b.dataset.n; if (ST.colour.body > ST.colour.n) ST.colour.body = 1; if (ST.colour.rim > ST.colour.n) ST.colour.rim = ST.colour.n; for (const f of ['front', 'back']) for (const L of ST.faces[f]) { if (L.slot > ST.colour.n) L.slot = ST.colour.n; if (L.slot2 > ST.colour.n) L.slot2 = ST.colour.n; } renderSlots(); commit(); });
  $$('[data-face]').forEach(b => b.onclick = () => { ST.ui.face = b.dataset.face; ST.ui.sel = null; $$('[data-face]').forEach(x => x.classList.toggle('on', x === b)); renderLayers(); renderProps(); UI.preview(0); });
  function renderSlots() {
    $$('#nslots .chip').forEach(x => x.classList.toggle('on', +x.dataset.n === ST.colour.n));
    const host = $('#slots'); host.innerHTML = '';
    for (let i = 0; i < ST.colour.n; i++) {
      const sl = ST.colour.slots[i];
      const row = document.createElement('div'); row.className = 'slot';
      row.innerHTML = '<span class="n">' + (i + 1) + '</span><input type="color" value="' + sl.color + '"><input type="text" value="' + sl.name.replace(/"/g, '&quot;') + '" placeholder="name"><select>' + Object.keys(Orca3MF.MATERIALS).map(m => '<option' + (m === sl.type ? ' selected' : '') + '>' + m + '</option>').join('') + '</select><span class="role">' + (i + 1 === ST.colour.body ? 'body' : (ST.rim.on && i + 1 === ST.colour.rim ? 'rim' : usedBy(i + 1))) + '</span>';
      const [c, t, s] = row.querySelectorAll('input,select');
      c.addEventListener('input', () => { sl.color = c.value.toUpperCase(); VIEW.update(); UI.preview(0); });
      c.addEventListener('change', () => { snapshot(); });
      t.addEventListener('change', () => { sl.name = t.value; snapshot(); VIEW.legend(); });
      s.addEventListener('change', () => { sl.type = s.value; snapshot(); });
      host.appendChild(row);
    }
    ['colour.body', 'colour.rim'].forEach(p => { const sel = $('[data-p="' + p + '"]'); sel.innerHTML = ''; for (let i = 1; i <= ST.colour.n; i++) sel.innerHTML += '<option value="' + i + '">' + i + ' ' + (ST.colour.slots[i - 1].name || '') + '</option>'; sel.value = getP(p); });
  }
  function usedBy(s) { const f = []; for (const k of ['front', 'back']) if (ST.faces[k].some(L => L.slot === s || L.slot2 === s)) f.push(k); return f.join('+'); }
  // ---- layers
  function layers() { return ST.faces[ST.ui.face]; }
  function sel() { return layers().find(L => L.id === ST.ui.sel) || null; }
  function layerTitle(L) { return L.kind === 'text' ? L.text : L.kind === 'shape' ? L.shape + ' ' + L.w + 'x' + L.h : 'image'; }
  function renderLayers() {
    const host = $('#layerList'); host.innerHTML = '';
    layers().slice().reverse().forEach(L => {
      const d = document.createElement('div'); d.className = 'layer' + (L.id === ST.ui.sel ? ' on' : '') + (L.mute ? ' mute' : '');
      d.innerHTML = '<span class="k">' + (L.cut ? 'cut' : L.kind) + '</span><span class="t" id="t-' + L.id + '">' + layerTitle(L).replace(/</g, '&lt;') + '</span><span class="k">s' + L.slot + '</span><button class="x" title="delete">x</button>';
      d.onclick = e => { if (e.target.classList.contains('x')) { del(L.id); return; } ST.ui.sel = L.id; renderLayers(); renderProps(); UI.preview(0); };
      host.appendChild(d);
    });
  }
  function del(id) { const a = layers(); const i = a.findIndex(L => L.id === id); if (i >= 0) a.splice(i, 1); if (ST.ui.sel === id) ST.ui.sel = null; renderLayers(); renderProps(); commit(); }
  function add(kind, extra) {
    const base = { id: newId(), kind, dx: 0, dy: 0, rot: 0, slot: ST.colour.n >= 3 ? 3 : 2, cut: false, mute: false };
    let L;
    if (kind === 'text') L = Object.assign(base, { text: 'TEXT', font: 'marker', size: 6, slot2: 2, splitGap: 0.6, arc: 0, ls: 0 });
    else if (kind === 'shape') L = Object.assign(base, { shape: 'ring', w: 20, h: 20, t: 1.2 });
    else L = Object.assign(base, { w: 20, mode: 'mono', thr: 0.5, invert: false, src: '' }, extra || {});
    layers().push(L); ST.ui.sel = L.id; renderLayers(); renderProps(); commit();
  }
  $$('[data-add]').forEach(b => b.onclick = () => { if (b.dataset.add === 'image') $('#drop').click(); else add(b.dataset.add); });
  // ---- props: patched in place for text so focus is never lost
  function renderProps() {
    const host = $('#props'); const L = sel();
    if (!L) { host.innerHTML = '<div class="note">select or add a layer</div>'; return; }
    const slotOpts = s => { let o = ''; for (let i = 1; i <= ST.colour.n; i++) o += '<option value="' + i + '"' + (i === s ? ' selected' : '') + '>' + i + ' ' + (ST.colour.slots[i - 1].name || '') + '</option>'; return o; };
    const rows = [];
    const num = (k, lab, min, max, step, unit) => rows.push('<div class="row"><label>' + lab + '</label><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + L[k] + '"><input type="number" data-k="' + k + '" step="' + step + '" value="' + L[k] + '"><span class="u">' + (unit || '') + '</span></div>');
    if (L.kind === 'text') {
      rows.push('<div class="row"><label>text</label><input type="text" data-k="text" value="' + String(L.text).replace(/"/g, '&quot;') + '"></div>');
      rows.push('<div class="note">a | splits the text into two slots, e.g. hack|.build</div>');
      rows.push('<div class="row"><label>font</label><select data-k="font">' + Object.keys(FONTS).map(f => '<option value="' + f + '"' + (f === L.font ? ' selected' : '') + '>' + FONTS[f] + '</option>').join('') + '</select></div>');
      num('size', 'size', 2, 30, 0.5, 'mm'); num('ls', 'spacing', -1, 3, 0.1, 'mm'); num('arc', 'arc radius', -40, 40, 0.5, 'mm'); num('splitGap', 'split gap', 0, 4, 0.1, 'mm');
      rows.push('<div class="row"><label>slot after |</label><select data-k="slot2">' + slotOpts(L.slot2) + '</select></div>');
    } else if (L.kind === 'shape') {
      rows.push('<div class="row"><label>shape</label><select data-k="shape">' + ['ring', 'rect', 'ellipse', 'frame', 'diamond', 'chevrons'].map(s => '<option' + (s === L.shape ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>');
      num('w', 'width', 1, 120, 0.5, 'mm'); num('h', 'height', 1, 120, 0.5, 'mm'); num('t', 'stroke', 0.4, 20, 0.1, 'mm');
    } else {
      rows.push('<div class="row"><label>mode</label><select data-k="mode"><option value="mono"' + (L.mode === 'mono' ? ' selected' : '') + '>mono threshold</option><option value="silhouette"' + (L.mode === 'silhouette' ? ' selected' : '') + '>silhouette</option></select></div>');
      num('w', 'width', 2, 120, 0.5, 'mm'); num('thr', 'threshold', 0.05, 0.95, 0.05, '');
      rows.push('<div class="row"><label>invert</label><input type="checkbox" data-k="invert"' + (L.invert ? ' checked' : '') + '><span class="u"></span></div>');
    }
    num('dx', 'x', -60, 60, 0.25, 'mm'); num('dy', 'y', -60, 60, 0.25, 'mm'); num('rot', 'rotate', -180, 180, 1, 'deg');
    rows.push('<div class="row"><label>slot</label><select data-k="slot">' + slotOpts(L.slot) + '</select></div>');
    rows.push('<div class="row"><label>cut through</label><input type="checkbox" data-k="cut"' + (L.cut ? ' checked' : '') + '><span class="u"></span></div>');
    rows.push('<div class="row"><label>mute</label><input type="checkbox" data-k="mute"' + (L.mute ? ' checked' : '') + '><span class="u"></span></div>');
    rows.push('<div class="btns"><button class="ghost" data-act="dup">duplicate</button><button class="ghost" data-act="up">raise</button><button class="ghost" data-act="down">lower</button><button class="ghost" data-act="other">copy to other face</button></div>');
    host.innerHTML = rows.join('');
    host.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k;
      const write = () => { let v; if (el.type === 'checkbox') v = el.checked; else if (el.type === 'number' || el.type === 'range') v = +el.value; else if (el.tagName === 'SELECT' && !isNaN(+el.value)) v = +el.value; else v = el.value; L[k] = v; host.querySelectorAll('[data-k="' + k + '"]').forEach(o => { if (o !== el && o.type !== 'checkbox') o.value = v; }); const t = document.getElementById('t-' + L.id); if (t) t.textContent = layerTitle(L); };
      if (el.type === 'range') { el.addEventListener('input', () => { write(); touch(); }); el.addEventListener('change', () => { write(); commit(); }); }
      else if (el.type === 'text') { el.addEventListener('input', () => { write(); touch(240); }); el.addEventListener('change', () => { write(); commit(); }); }
      else el.addEventListener('change', () => { write(); renderLayers(); commit(); });
    });
    host.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const a = layers(), i = a.indexOf(L);
      if (b.dataset.act === 'dup') { const c = JSON.parse(JSON.stringify(L)); c.id = newId(); c.dx += 2; c.dy -= 2; a.splice(i + 1, 0, c); ST.ui.sel = c.id; }
      if (b.dataset.act === 'up' && i < a.length - 1) { a.splice(i, 1); a.splice(i + 1, 0, L); }
      if (b.dataset.act === 'down' && i > 0) { a.splice(i, 1); a.splice(i - 1, 0, L); }
      if (b.dataset.act === 'other') { const c = JSON.parse(JSON.stringify(L)); c.id = newId(); ST.faces[ST.ui.face === 'front' ? 'back' : 'front'].push(c); }
      renderLayers(); renderProps(); commit();
    });
  }
  // ---- image drop
  const drop = $('#drop');
  const fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*';
  drop.onclick = () => fileIn.click();
  fileIn.onchange = () => { if (fileIn.files[0]) loadImage(fileIn.files[0]); fileIn.value = ''; };
  ['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  document.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (!f) return; if (/\.json$/i.test(f.name)) f.text().then(loadDesign); else if (f.type.startsWith('image/') || /\.svg$/i.test(f.name)) loadImage(f); });
  function loadImage(file) { const r = new FileReader(); r.onload = () => { if (ST.ui.step !== 0) go(0); add('image', { src: r.result, w: Math.min(30, ST.blank.size * 0.6) }); }; r.readAsDataURL(file); }
  // ---- face editor: exact print raster after a build, quick preview while dragging, direct manipulation handles
  const fcv = $('#face canvas'), fctx = fcv.getContext('2d');
  const FE = { base: 1, zoom: 1, panX: 0, panY: 0, scale: 1, ox: 0, oy: 0, drag: null, hover: null, handles: null, cache: new Map() };
  const HANDLE = 5, ROT_STEM = 26, HIT = 9;
  UI.FE = FE;                            // test hook
  const mm2px = (x, y) => [FE.ox + x * FE.scale, FE.oy - y * FE.scale];
  const px2mm = (px, py) => [(px - FE.ox) / FE.scale, -(py - FE.oy) / FE.scale];
  let prevTimer = null;
  UI.preview = function (delay) { clearTimeout(prevTimer); prevTimer = setTimeout(drawPreview, delay || 0); };

  // bbox of a layer in its own frame (dx, dy, rot stripped): render the mask alone at 3 px/mm, take the bounds. Cached by signature.
  function layerBBox(L) {
    const sig = JSON.stringify(Object.assign({}, L, { dx: 0, dy: 0, rot: 0, id: 0, slot: 0, slot2: 0, cut: 0, mute: 0 })) + '|' + ST.blank.size;
    if (FE.cache.has(sig)) return FE.cache.get(sig);
    const res = 3, ext = Math.max(ST.blank.size, 2 * ((L.w || 0) + Math.abs(L.arc || 0) + (L.size || 0))) + 4;
    const W = Math.ceil(ext * res), cv = document.createElement('canvas'); cv.width = W; cv.height = W;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const parts = (L.kind === 'text' && String(L.text).includes('|') && !L.arc) ? 2 : 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let part = 0; part < parts; part++) {
      ctx.clearRect(0, 0, W, W);
      paintLayer(ctx, Object.assign({}, L, { dx: 0, dy: 0, rot: 0 }), res, ext, part);
      const d = ctx.getImageData(0, 0, W, W).data;
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) if (d[(j * W + i) * 4 + 3] > 127) {
        const x = (i + 0.5 - W / 2) / res, y = (W / 2 - j - 0.5) / res;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    const bb = x0 > x1 ? null : { x0: x0 - 0.5, y0: y0 - 0.5, x1: x1 + 0.5, y1: y1 + 0.5 };
    FE.cache.set(sig, bb);
    if (FE.cache.size > 200) FE.cache.delete(FE.cache.keys().next().value);
    return bb;
  }
  // screen space corners of a layer's rotated bbox, plus the rotate dot
  function layerHandles(L) {
    const bb = layerBBox(L); if (!bb) return null;
    const r = (L.rot || 0) * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    const loc = [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x1, bb.y1], [bb.x0, bb.y1]];
    const corners = loc.map(([x, y]) => mm2px(L.dx + x * c - y * sn, L.dy + x * sn + y * c));
    const top = [(bb.x0 + bb.x1) / 2, bb.y1];
    const topPx = mm2px(L.dx + top[0] * c - top[1] * sn, L.dy + top[0] * sn + top[1] * c);
    // stem points outward along the layer's local +y (screen up when rot = 0)
    const ux = -sn, uy = -c;   // local +y in screen space (screen y down)
    const dotPx = [topPx[0] + ux * ROT_STEM, topPx[1] + uy * ROT_STEM];
    return { bb, corners, top: topPx, dot: dotPx, centre: mm2px(L.dx, L.dy) };
  }
  function insideBox(h, px, py) {          // point in the rotated quad via cross products
    const q = h.corners; let s = 0;
    for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; const cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]); if (i === 0) s = Math.sign(cr); else if (Math.sign(cr) !== s && cr !== 0) return false; }
    return true;
  }
  function hitTest(px, py) {
    const L = sel();
    if (L) {
      const h = layerHandles(L);
      if (h) {
        if (Math.hypot(px - h.dot[0], py - h.dot[1]) <= HIT) return { mode: 'rotate', L };
        for (let i = 0; i < 4; i++) if (Math.hypot(px - h.corners[i][0], py - h.corners[i][1]) <= HIT) return { mode: 'scale', L, corner: i };
        if (insideBox(h, px, py)) return { mode: 'move', L };
      }
    }
    const a = layers();
    for (let i = a.length - 1; i >= 0; i--) { const h = layerHandles(a[i]); if (h && insideBox(h, px, py)) return { mode: 'select', L: a[i] }; }
    return { mode: 'none' };
  }
  function drawPreview() {
    if (ST.ui.step !== 0) return;
    const w = fcv.clientWidth || 400, h = fcv.clientHeight || 400;
    if (fcv.width !== w || fcv.height !== h) { fcv.width = w; fcv.height = h; }
    // exact raster when the build is current, quick 4 px/mm composition otherwise
    const exact = !FE.drag && MODEL.faces && !MODEL.dirty && !MODEL.building && MODEL.faces[ST.ui.face];
    const f = exact ? { labels: MODEL.faces[ST.ui.face], cuts: null, W: MODEL.faces.W, H: MODEL.faces.H, px: MODEL.faces.px } : composeFace(ST.ui.face, 4);
    FE.base = Math.min(w, h) * 0.86 / (f.W * f.px);
    FE.scale = FE.base * FE.zoom; FE.ox = w / 2 + FE.panX; FE.oy = h / 2 + FE.panY;
    fctx.clearRect(0, 0, w, h);
    const im = fctx.createImageData(f.W, f.H);
    for (let j = 0; j < f.H; j++) for (let i = 0; i < f.W; i++) {
      const v = f.labels[j * f.W + i], q = ((f.H - 1 - j) * f.W + i) * 4;
      if (!v) { if (f.cuts && f.cuts[j * f.W + i]) { im.data[q] = 40; im.data[q + 1] = 40; im.data[q + 2] = 40; im.data[q + 3] = 255; } continue; }
      const c = ST.colour.slots[v - 1].color;
      im.data[q] = parseInt(c.slice(1, 3), 16); im.data[q + 1] = parseInt(c.slice(3, 5), 16); im.data[q + 2] = parseInt(c.slice(5, 7), 16); im.data[q + 3] = 255;
    }
    const tmp = document.createElement('canvas'); tmp.width = f.W; tmp.height = f.H; tmp.getContext('2d').putImageData(im, 0, 0);
    fctx.imageSmoothingEnabled = false;
    const px = f.px * FE.scale, ox = FE.ox - f.W * px / 2, oy = FE.oy - f.H * px / 2;
    fctx.drawImage(tmp, ox, oy, f.W * px, f.H * px);
    // snap guides while moving
    if (FE.drag && FE.drag.mode === 'move' && FE.drag.snapped) {
      fctx.strokeStyle = 'rgba(166,226,46,.7)'; fctx.setLineDash([3, 3]); fctx.lineWidth = 1;
      if (FE.drag.snapped.x) { fctx.beginPath(); fctx.moveTo(FE.ox, 0); fctx.lineTo(FE.ox, h); fctx.stroke(); }
      if (FE.drag.snapped.y) { fctx.beginPath(); fctx.moveTo(0, FE.oy); fctx.lineTo(w, FE.oy); fctx.stroke(); }
      fctx.setLineDash([]);
    }
    const L = sel();
    FE.handles = null;
    if (L) {
      const hd = layerHandles(L);
      if (hd) {
        FE.handles = hd;
        fctx.strokeStyle = '#FE0386'; fctx.lineWidth = 1.5; fctx.setLineDash([6, 4]);
        fctx.beginPath(); hd.corners.forEach((c, i) => i ? fctx.lineTo(c[0], c[1]) : fctx.moveTo(c[0], c[1])); fctx.closePath(); fctx.stroke();
        fctx.setLineDash([]);
        fctx.beginPath(); fctx.moveTo(hd.top[0], hd.top[1]); fctx.lineTo(hd.dot[0], hd.dot[1]); fctx.stroke();
        fctx.fillStyle = '#FE0386';
        for (const c of hd.corners) fctx.fillRect(c[0] - HANDLE, c[1] - HANDLE, HANDLE * 2, HANDLE * 2);
        fctx.beginPath(); fctx.arc(hd.dot[0], hd.dot[1], HANDLE + 1, 0, Math.PI * 2); fctx.fill();
        fctx.fillStyle = '#0a0a0a'; fctx.beginPath(); fctx.arc(hd.dot[0], hd.dot[1], 2.5, 0, Math.PI * 2); fctx.fill();
        if (FE.drag && FE.drag.mode === 'rotate') { fctx.fillStyle = '#a6e22e'; fctx.font = '15px VT323'; fctx.fillText(Math.round(L.rot) + ' deg', hd.dot[0] + 12, hd.dot[1] + 5); }
        if (FE.drag && FE.drag.mode === 'scale') { fctx.fillStyle = '#a6e22e'; fctx.font = '15px VT323'; fctx.fillText(((hd.bb.x1 - hd.bb.x0)).toFixed(1) + ' x ' + (hd.bb.y1 - hd.bb.y0).toFixed(1) + ' mm', hd.corners[2][0] + 10, hd.corners[2][1] + 14); }
      }
    }
    fctx.fillStyle = '#9a9184'; fctx.font = '15px VT323';
    fctx.fillText(ST.ui.face.toUpperCase() + ' ' + ST.blank.size + ' mm' + (exact ? '  print raster' : '  preview') + (FE.zoom !== 1 ? '  x' + FE.zoom.toFixed(1) : ''), 10, 20);
  }
  function localPos(e) { const r = fcv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  fcv.addEventListener('pointerdown', e => {
    const [px, py] = localPos(e);
    fcv.setPointerCapture(e.pointerId);
    if (e.button !== 0) { FE.drag = { mode: 'pan', x: e.clientX, y: e.clientY, panX: FE.panX, panY: FE.panY }; return; }
    const ht = hitTest(px, py);
    if (ht.mode === 'none') { ST.ui.sel = null; renderLayers(); renderProps(); FE.drag = null; UI.preview(0); return; }
    if (ht.mode === 'select') { ST.ui.sel = ht.L.id; renderLayers(); renderProps(); }
    const L = ht.L;
    const [mx, my] = px2mm(px, py);
    FE.drag = { mode: ht.mode === 'select' ? 'move' : ht.mode, L, x: e.clientX, y: e.clientY, dx: L.dx, dy: L.dy, rot: L.rot || 0,
      size: L.size, w: L.w, h: L.h, t: L.t, d0: Math.max(0.5, Math.hypot(mx - L.dx, my - L.dy)), a0: Math.atan2(my - L.dy, mx - L.dx), snapped: null };
    UI.preview(0);
  });
  fcv.addEventListener('pointermove', e => {
    const [px, py] = localPos(e);
    if (!FE.drag) {
      const ht = hitTest(px, py);
      fcv.style.cursor = ht.mode === 'rotate' ? 'crosshair' : ht.mode === 'scale' ? 'nwse-resize' : ht.mode === 'move' ? 'grab' : ht.mode === 'select' ? 'pointer' : 'default';
      return;
    }
    const D = FE.drag;
    if (D.mode === 'pan') { FE.panX = D.panX + (e.clientX - D.x); FE.panY = D.panY + (e.clientY - D.y); UI.preview(0); return; }
    const L = D.L;
    const [mx, my] = px2mm(px, py);
    if (D.mode === 'move') {
      let ddx = (e.clientX - D.x) / FE.scale, ddy = -(e.clientY - D.y) / FE.scale;
      if (e.shiftKey) { if (Math.abs(ddx) > Math.abs(ddy)) ddy = 0; else ddx = 0; }     // axis lock
      let nx = D.dx + ddx, ny = D.dy + ddy;
      D.snapped = { x: false, y: false };
      if (!e.altKey) { if (Math.abs(nx) < 0.6) { nx = 0; D.snapped.x = true; } if (Math.abs(ny) < 0.6) { ny = 0; D.snapped.y = true; } }
      L.dx = Math.round(nx * 4) / 4; L.dy = Math.round(ny * 4) / 4;
    } else if (D.mode === 'scale') {
      const k = Math.max(0.15, Math.hypot(mx - L.dx, my - L.dy) / D.d0);
      if (L.kind === 'text') L.size = Math.max(1.5, Math.round(D.size * k * 10) / 10);
      else if (L.kind === 'shape') { L.w = Math.max(1, Math.round(D.w * k * 10) / 10); L.h = Math.max(1, Math.round(D.h * k * 10) / 10); if (!e.shiftKey) L.t = Math.max(0.4, Math.round(D.t * k * 10) / 10); }
      else L.w = Math.max(2, Math.round(D.w * k * 10) / 10);
    } else if (D.mode === 'rotate') {
      let deg = D.rot + (Math.atan2(my - L.dy, mx - L.dx) - D.a0) * 180 / Math.PI;
      deg = ((deg + 180) % 360 + 360) % 360 - 180;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      else if (!e.altKey) { for (const s of [-180, -90, 0, 90, 180]) if (Math.abs(deg - s) < 4) deg = s; }
      L.rot = Math.round(deg);
    }
    touch(0);
  });
  const endDrag = () => { if (!FE.drag) return; const m = FE.drag.mode; FE.drag = null; if (m === 'pan') { UI.preview(0); return; } renderProps(); commit(); };
  fcv.addEventListener('pointerup', endDrag);
  fcv.addEventListener('pointercancel', endDrag);
  fcv.addEventListener('contextmenu', e => e.preventDefault());
  fcv.addEventListener('wheel', e => {
    e.preventDefault();
    const [px, py] = localPos(e);
    const [mx, my] = px2mm(px, py);
    FE.zoom = Math.max(0.5, Math.min(8, FE.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
    FE.scale = FE.base * FE.zoom;
    const w = fcv.clientWidth, h = fcv.clientHeight;
    FE.panX = px - w / 2 - mx * FE.scale; FE.panY = py - h / 2 + my * FE.scale;   // zoom about the cursor
    UI.preview(0);
  }, { passive: false });
  fcv.addEventListener('dblclick', e => {
    const L = sel();
    if (L && L.kind === 'text') { const t = $('#props input[data-k="text"]'); if (t) { t.focus(); t.select(); } return; }
    FE.zoom = 1; FE.panX = 0; FE.panY = 0; UI.preview(0);
  });
  document.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea,select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    const L = sel(); if (!L || ST.ui.step !== 0) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); $('#props [data-act="dup"]').click(); return; }
    if (e.key === '[') { $('#props [data-act="down"]').click(); return; }
    if (e.key === ']') { $('#props [data-act="up"]').click(); return; }
    const s = e.shiftKey ? 5 : 0.25;
    if (e.key === 'ArrowLeft') L.dx -= s; else if (e.key === 'ArrowRight') L.dx += s; else if (e.key === 'ArrowUp') L.dy += s; else if (e.key === 'ArrowDown') L.dy -= s;
    else if (e.key === 'Delete' || e.key === 'Backspace') { del(L.id); return; } else return;
    e.preventDefault(); renderProps(); commit();
  });
  new ResizeObserver(() => UI.preview(0)).observe(fcv);
  // ---- status + readout
  UI.status = function (msg) {
    $('#sDims').textContent = MODEL.dims ? (MODEL.dims.size + ' x ' + MODEL.dims.thk.toFixed(2) + ' mm, inlay ' + MODEL.dims.inlay.toFixed(2)) : '-';
    $('#sTris').textContent = MODEL.tris ? MODEL.tris.toLocaleString() + ' tris' : '-';
    $('#sMs').textContent = msg ? msg : (MODEL.ms ? Math.round(MODEL.ms) + ' ms' : '');
    const chips = [];
    const lay = plateLayout();
    chips.push('<span class="c ' + (lay.fits ? 'ok' : 'err') + '">' + (lay.fits ? 'fits bed' : 'over bed') + '</span>');
    chips.push('<span class="c ' + (MODEL.dirty ? 'warn' : 'ok') + '">' + (MODEL.dirty ? 'mesh stale' : 'mesh current') + '</span>');
    for (const w of MODEL.warnings) chips.push('<span class="c warn">' + w + '</span>');
    $('#sChips').innerHTML = chips.join('');
    if (MODEL.dims) {
      const v = {}; for (const s in MODEL.meshes) v[s] = Orca3MF.signedVolume(MODEL.meshes[s]);
      const grams = Object.keys(v).map(s => (s + ': ' + (v[s] / 1000 * Orca3MF.MATERIALS[ST.colour.slots[s - 1].type].density * ST.plate.count).toFixed(1) + ' g')).join('  ');
      $('#readout').innerHTML = '<div>layers <span>' + Math.round(MODEL.dims.thk / ST.print.layer) + '</span></div><div>inlay layers <span>' + Math.round(MODEL.dims.inlay / ST.print.layer) + '</span></div><div>copies <span>' + ST.plate.count + '</span></div><div>grid <span>' + MODEL.dims.W + '</span></div><div style="grid-column:1/3">' + grams + '</div>';
    }
  };
  // ---- header buttons
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
  $('#bSave').onclick = () => download(new Blob([designJson()], { type: 'application/json' }), 'inlay-design.json');
  const jsonIn = document.createElement('input'); jsonIn.type = 'file'; jsonIn.accept = '.json';
  $('#bOpen').onclick = () => jsonIn.click();
  jsonIn.onchange = () => { if (jsonIn.files[0]) jsonIn.files[0].text().then(loadDesign); jsonIn.value = ''; };
  $('#bGuide').onclick = () => $('#welcome').classList.remove('hide');
  $('#wBlank').onclick = () => { ST = blankState(); UI.refreshAll(); $('#welcome').classList.add('hide'); commit(); };
  $('#wExample').onclick = () => { ST = exampleState(); UI.refreshAll(); $('#welcome').classList.add('hide'); commit(); };
  $('#bBuild').onclick = () => { MODEL.dirty = true; runBuild(); };
  $('#b3mf').onclick = async () => download(await export3mf(), 'inlay.3mf');
  $('#bStl').onclick = async () => download(await exportStlZip(), 'inlay-stl.zip');
  $('#bCard').onclick = () => download(new Blob([Orca3MF.printCard(pkgConfig())], { type: 'text/plain' }), 'print-card.txt');
  $('#bPng').onclick = () => { ensureMesh(); facesPng().toBlob(b => download(b, 'inlay-faces.png')); };
  UI.refreshAll = function () {
    $$('[data-p]').forEach(el => el._read && el._read());
    $$('#shapes .chip').forEach(x => x.classList.toggle('on', x.dataset.shape === ST.blank.shape));
    $$('[data-face]').forEach(x => x.classList.toggle('on', x.dataset.face === ST.ui.face));
    renderSlots(); renderLayers(); renderProps(); go(ST.ui.step);
  };
  UI.renderSlots = renderSlots; UI.go = go; UI.add = add;
  bindAll();
})();

// ------------------------------------------------------------ boot: fonts first, or canvas fillText silently falls back
(async function boot() {
  try { await Promise.all(Object.values(FONTS).map(f => document.fonts.load('16px "' + f + '"'))); } catch (e) { console.warn('fonts', e); }
  UI.refreshAll();
  snapshot();
  runBuild();
  BENCH.ready = true;
})();
