/* BOSS.bench app. Plain script, runs from file://. Globals: K, BOSS, PARTS, SIM, EXPORT, Orca3MF, THREE, JSZip. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const B = BOSS, S = B.S;
  const SLOT_HEX = () => B.SLOTS.map(s => s.color);

  // ---------- viewer ----------
  const V = {};
  function initViewer() {
    const canvas = $('#stage canvas.three');
    V.canvas = canvas;
    V.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    V.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    V.scene = new THREE.Scene();
    V.camera = new THREE.PerspectiveCamera(38, 1, 1, 4000);
    V.target = new THREE.Vector3(0, 0, 5);
    V.sph = { r: 160, theta: 0.7, phi: 1.05 }; // spherical about target, z up
    V.camera.up.set(0, 0, 1);
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x202020, 0.9); V.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(80, -120, 200); V.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffe0f0, 0.35); fill.position.set(-120, 100, 60); V.scene.add(fill);
    V.root = new THREE.Group(); V.scene.add(V.root);         // part view
    V.world = new THREE.Group(); V.scene.add(V.world);       // scene view
    V.overlay = new THREE.Group(); V.scene.add(V.overlay);   // ghosts, highlights, net colours
    // ground grid for the scene view: 8 mm cells
    const gridMat = new THREE.LineBasicMaterial({ color: 0xfe0386, transparent: true, opacity: 0.35 });
    const gpts = []; const N = 40; for (let i = -N; i <= N; i++) { gpts.push(i * 8, -N * 8, 0, i * 8, N * 8, 0, -N * 8, i * 8, 0, N * 8, i * 8, 0); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gpts, 3));
    V.grid = new THREE.LineSegments(gg, gridMat); V.grid.visible = false; V.scene.add(V.grid);
    const gplane = new THREE.Mesh(new THREE.PlaneGeometry(N * 16, N * 16), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85 })); gplane.position.z = -0.05; V.gplane = gplane; gplane.visible = false; V.scene.add(gplane);
    V.raycaster = new THREE.Raycaster();
    resize(); window.addEventListener('resize', resize);
    // orbit
    let drag = null;
    canvas.addEventListener('pointerdown', e => { canvas.focus(); if (V.onDown && V.onDown(e)) return; drag = { x: e.clientX, y: e.clientY, b: e.button, pan: e.button === 2 || e.shiftKey }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (V.onMove && V.onMove(e)) return; if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (drag.pan) { const s = V.sph.r / 600; const right = new THREE.Vector3(), up = new THREE.Vector3(); V.camera.getWorldDirection(up); right.crossVectors(up, V.camera.up).normalize(); up.crossVectors(right, up).normalize(); V.target.addScaledVector(right, -dx * s).addScaledVector(up, dy * s); }
      else { V.sph.theta -= dx * 0.008; V.sph.phi = Math.min(Math.PI - 0.05, Math.max(0.05, V.sph.phi - dy * 0.008)); }
      V.dirty = true; });
    canvas.addEventListener('pointerup', e => { if (V.onUp && V.onUp(e)) { drag = null; return; } drag = null; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); V.sph.r = Math.min(1500, Math.max(20, V.sph.r * (e.deltaY > 0 ? 1.12 : 0.89))); V.dirty = true; }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    V.dirty = true;
    (function loop() { requestAnimationFrame(loop); if (V.dirty || V.anim) { V.dirty = false; placeCamera(); V.renderer.render(V.scene, V.camera); } })();
  }
  function resize() { const w = V.canvas.clientWidth || 300, h = V.canvas.clientHeight || 300; V.renderer.setSize(w, h, false); V.camera.aspect = w / h; V.camera.updateProjectionMatrix(); V.dirty = true; }
  function placeCamera() {
    const { r, theta, phi } = V.sph;
    V.camera.position.set(V.target.x + r * Math.sin(phi) * Math.cos(theta), V.target.y + r * Math.sin(phi) * Math.sin(theta), V.target.z + r * Math.cos(phi));
    V.camera.lookAt(V.target);
  }
  function camPreset(name) {
    if (name === 'iso') { V.sph.theta = 0.7; V.sph.phi = 1.05; }
    else if (name === 'top') { V.sph.theta = -Math.PI / 2; V.sph.phi = 0.06; }
    else if (name === 'front') { V.sph.theta = -Math.PI / 2; V.sph.phi = Math.PI / 2 - 0.05; }
    else if (name === 'under') { V.sph.theta = 0.7; V.sph.phi = Math.PI - 0.6; }
    V.dirty = true;
  }
  function fitTo(box) { const size = new THREE.Vector3(); box.getSize(size); const c = new THREE.Vector3(); box.getCenter(c); V.target.copy(c); V.sph.r = Math.max(40, Math.max(size.x, size.y, size.z) * 1.9); V.dirty = true; }
  // geometry cache keyed by mesh object identity
  const geoCache = new WeakMap();
  function geoFor(mesh) {
    let g = geoCache.get(mesh); if (g) return g;
    const t = mesh.typed(); g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(t.positions, 3)); g.setIndex(new THREE.BufferAttribute(t.indices, 1));
    g = g.toNonIndexed(); g.computeVertexNormals(); geoCache.set(mesh, g); return g;
  }
  const matCache = {};
  function matFor(slot, xray) {
    const key = slot + (xray ? 'x' : '');
    if (matCache[key]) { matCache[key].color.set(SLOT_HEX()[slot - 1]); return matCache[key]; }
    const hex = SLOT_HEX()[slot - 1];
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: slot === S.TPU || slot === S.CTPU ? 0.9 : 0.55, metalness: 0.02, transparent: !!xray, opacity: xray ? 0.18 : 1, depthWrite: !xray, side: THREE.DoubleSide });
    matCache[key] = m; return m;
  }
  // a THREE group for one part object (list of meshes) in part local coordinates
  function groupFor(obj, xray) {
    const g = new THREE.Group();
    for (const m of obj.meshes) { const mesh = new THREE.Mesh(geoFor(m), matFor(m.slot, xray && m.slot === S.PETG)); mesh.userData.slot = m.slot; g.add(mesh); }
    return g;
  }
  function showPart(part, xray) {
    while (V.root.children.length) V.root.remove(V.root.children[0]);
    if (!part) return;
    let ox = 0; const box = new THREE.Box3();
    part.objects.forEach((o, k) => {
      const g = groupFor(o, xray);
      if (k > 0) { const b = new THREE.Box3().setFromObject(g); const prevW = box.max.x - box.min.x; g.position.x = (isFinite(prevW) ? box.max.x : 0) - b.min.x + 8; }
      V.root.add(g); box.expandByObject(g);
    });
    V.grid.visible = false; V.gplane.visible = false; V.world.visible = false; V.root.visible = true;
    fitTo(box);
  }

  // ---------- state ----------
  const state = { step: 0, part: { id: 'seat', params: {} }, built: null, xray: false, scene: null, tool: 'move', sel: null, live: true, printWhat: 'part', result: null };
  const ui = { building: false, dirty: true, timer: null, undo: [], redo: [], suppress: false };
  let currentPart = null;

  function snapshot() { return JSON.stringify({ part: state.part, scene: sceneJson() }); }
  function pushUndo() { if (ui.suppress) return; const s = snapshot(); if (ui.undo[ui.undo.length - 1] === s) return; ui.undo.push(s); if (ui.undo.length > 80) ui.undo.shift(); ui.redo = []; }
  function restore(s) { ui.suppress = true; const d = JSON.parse(s); state.part = d.part; loadScene(d.scene); buildParams(); scheduleBuild(true); ui.suppress = false; }

  // ---------- part step ----------
  function catalogEntry(id) { return PARTS.CATALOG.find(c => c.id === id); }
  function buildGallery() {
    const g = $('#gallery'); g.innerHTML = '';
    for (const c of PARTS.CATALOG) {
      const d = document.createElement('div'); d.className = 'gal' + (c.id === state.part.id ? ' on' : ''); d.innerHTML = '<div class="k">' + c.name + '</div><div class="t">' + c.blurb + '</div>';
      d.onclick = () => { pushUndo(); state.part = { id: c.id, params: {} }; buildGallery(); buildParams(); scheduleBuild(true); };
      g.appendChild(d);
    }
  }
  function paramsOf() { const c = catalogEntry(state.part.id); return Object.assign(PARTS.defaults(c.params), state.part.params); }
  function buildParams() {
    const c = catalogEntry(state.part.id); const box = $('#params'); box.innerHTML = '';
    const p = paramsOf();
    const groupOn = { press: p.mount === 'press', snap: p.mount === 'snap', custom: p.board === 'custom', shape: true };
    for (const sch of c.params) {
      if (sch.group && groupOn[sch.group] === false) continue;
      if (sch.type === 'pinset') { box.appendChild(pinsetUI(p)); continue; }
      if (sch.type === 'nets') { box.appendChild(netsUI(p)); continue; }
      const row = document.createElement('div'); row.className = 'row';
      const lab = document.createElement('label'); lab.textContent = sch.label; row.appendChild(lab);
      if (sch.type === 'select') {
        const sel = document.createElement('select'); for (const [v, t] of sch.options) { const o = document.createElement('option'); o.value = v; o.textContent = t; if (String(v) === String(p[sch.k])) o.selected = true; sel.appendChild(o); }
        sel.onchange = () => { pushUndo(); state.part.params[sch.k] = isNaN(+sel.value) || sel.value === '' ? sel.value : +sel.value; buildParams(); scheduleBuild(); };
        row.appendChild(sel);
      } else if (sch.type === 'bool') {
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!p[sch.k]; cb.onchange = () => { pushUndo(); state.part.params[sch.k] = cb.checked; scheduleBuild(); }; row.appendChild(cb);
      } else {
        const r = document.createElement('input'); r.type = 'range'; r.min = sch.min; r.max = sch.max; r.step = sch.step; r.value = p[sch.k];
        const n = document.createElement('input'); n.type = 'number'; n.min = sch.min; n.max = sch.max; n.step = sch.step; n.value = p[sch.k];
        r.oninput = () => { n.value = r.value; }; r.onchange = () => { pushUndo(); state.part.params[sch.k] = +r.value; scheduleBuild(); };
        n.onchange = () => { pushUndo(); r.value = n.value; state.part.params[sch.k] = +n.value; scheduleBuild(); };
        row.appendChild(r); row.appendChild(n); if (sch.unit) { const u = document.createElement('span'); u.className = 'u'; u.textContent = sch.unit; row.appendChild(u); }
      }
      box.appendChild(row);
    }
  }
  function pinsetUI(p) {
    const wrap = document.createElement('div');
    const bd = PARTS.BOARDS[p.board]; if (!bd) return wrap;
    const bdEff = p.board === 'custom' ? Object.assign({}, bd, { n: p.cn | 0, w: p.cw, l: p.cl, rowX: p.crow }) : bd;
    const pins = PARTS.boardPins(bdEff);
    const selNames = p.pins && p.pins.length ? p.pins : (bd.defaultPins || pins.map(q => q.name));
    const h = document.createElement('div'); h.className = 'note'; h.textContent = 'pins that get a column (stud + socket). fewer pins, smaller brick.'; wrap.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'pins';
    const L = pins.filter(q => q.side === 'L'), R = pins.filter(q => q.side === 'R');
    for (let k = 0; k < Math.max(L.length, R.length); k++) for (const q of [L[k], R[k]]) {
      if (!q) { grid.appendChild(document.createElement('span')); continue; }
      const idx = pins.indexOf(q); const key = q.name + '#' + idx;
      const lab = document.createElement('label'); if (bd.rails && bd.rails[q.name] !== undefined) lab.className = 'rail';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = selNames.includes(q.name) || selNames.includes(key);
      cb.onchange = () => { pushUndo(); const cur = pins.map((qq, i) => (i === idx ? cb.checked : (grid.querySelectorAll('input')[pinOrder(pins, i)] || {}).checked)); state.part.params.pins = pins.map((qq, i) => qq.name + '#' + i).filter((_, i) => cur[i]); scheduleBuild(); };
      lab.appendChild(cb); lab.appendChild(document.createTextNode(q.name)); grid.appendChild(lab);
    }
    wrap.appendChild(grid);
    const btns = document.createElement('div'); btns.className = 'btns';
    const all = document.createElement('button'); all.className = 'ghost'; all.textContent = 'all pins'; all.onclick = () => { pushUndo(); state.part.params.pins = pins.map((q, i) => q.name + '#' + i); buildParams(); scheduleBuild(); };
    const none = document.createElement('button'); none.className = 'ghost'; none.textContent = 'rails + 4 io'; none.onclick = () => { pushUndo(); const keep = pins.filter(q => bd.rails[q.name] !== undefined).slice(0, 3).concat(pins.filter(q => bd.rails[q.name] === undefined).slice(0, 4)); state.part.params.pins = keep.map(q => q.name + '#' + pins.indexOf(q)); buildParams(); scheduleBuild(); };
    btns.appendChild(all); btns.appendChild(none); wrap.appendChild(btns);
    return wrap;
  }
  function pinOrder(pins, i) { // index of pin i in the interleaved grid (L0 R0 L1 R1 ...)
    const q = pins[i]; const side = q.side; const L = pins.filter(x => x.side === 'L'), R = pins.filter(x => x.side === 'R');
    return side === 'L' ? L.indexOf(q) * 2 : R.indexOf(q) * 2 + 1;
  }
  function netsUI(p) {
    const wrap = document.createElement('div');
    const cols = p.cols | 0, rows = p.rows | 0; const nets = p.nets || [];
    const h = document.createElement('div'); h.className = 'note'; h.textContent = 'paint studs into nets: pick a net colour, click cells. traces run inside the plate between the members.'; wrap.appendChild(h);
    const chips = document.createElement('div'); chips.className = 'chips';
    const cur = { n: wrap.cur || 0 };
    for (let n = 0; n < 8; n++) { const b = document.createElement('button'); b.className = 'chip' + (n === cur.n ? ' on' : ''); b.textContent = 'net ' + (n + 1); b.onclick = () => { cur.n = n; chips.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === n)); }; chips.appendChild(b); }
    wrap.appendChild(chips);
    const grid = document.createElement('div'); grid.className = 'gridpad'; grid.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    for (let j = rows - 1; j >= 0; j--) for (let i = 0; i < cols; i++) {
      const d = document.createElement('div'); const ni = nets.findIndex(nt => nt.some(c => c[0] === i && c[1] === j)); if (ni >= 0) { d.className = 'n' + (ni % 8); d.textContent = ni + 1; }
      d.onclick = () => { pushUndo(); const nn = nets.map(nt => nt.filter(c => !(c[0] === i && c[1] === j))); if (ni !== cur.n) { while (nn.length <= cur.n) nn.push([]); nn[cur.n].push([i, j]); } state.part.params.nets = nn; buildParams(); scheduleBuild(); };
      grid.appendChild(d);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function scheduleBuild(now) { ui.dirty = true; clearTimeout(ui.timer); ui.timer = setTimeout(doBuild, now ? 10 : 320); }
  function doBuild() {
    if (ui.building) { scheduleBuild(); return; }
    ui.building = true; ui.dirty = false;
    const t0 = performance.now(); let part = null;
    try { part = PARTS.make(state.part.id, paramsOf()); } catch (e) { console.error(e); setStatus({ err: 'build failed: ' + e.message }); ui.building = false; return; }
    currentPart = part; state.built = part;
    const ms = Math.round(performance.now() - t0);
    if (state.step === 0 || state.step === 1 || (state.step === 3 && state.printWhat === 'part')) showPart(part, state.xray);
    renderReadout(part, ms);
    ui.building = false;
    refreshPalette();
    if (state.step === 3) refreshPrintList();
  }
  function renderReadout(part, ms) {
    const r = $('#readout'); r.innerHTML = ''; for (const [k, v] of part.readout || []) { const a = document.createElement('div'); a.textContent = k; const b = document.createElement('b'); b.textContent = v; r.appendChild(a); r.appendChild(b); }
    const ck = $('#checks'); ck.innerHTML = '';
    const warns = (part.warnings || []).filter(w => !w.startsWith('note')); const notes = (part.warnings || []).filter(w => w.startsWith('note'));
    const badFits = (part.fits || []).filter(f => !f.ok);
    if (!warns.length && !badFits.length) { const d = document.createElement('div'); d.className = 'oks'; d.textContent = 'manifold, nets and fits all pass (' + (part.fits || []).length + ' fits checked)'; ck.appendChild(d); }
    else { const w = document.createElement('div'); w.className = 'warns'; for (const x of warns) { const d = document.createElement('div'); d.textContent = x; w.appendChild(d); } for (const f of badFits) { const d = document.createElement('div'); d.textContent = f.label + ': ' + (+f.value).toFixed(2) + ' (want ' + f.lo + ' to ' + f.hi + ')'; w.appendChild(d); } ck.appendChild(w); }
    for (const n of notes) { const d = document.createElement('div'); d.className = 'note'; d.textContent = n.replace(/^note: /, ''); ck.appendChild(d); }
    $('#hookup').textContent = (part.hookup || []).join(' ');
    $('#bom').textContent = (part.bom || []).length ? 'needs: ' + part.bom.join('; ') : '';
    let bx = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const o of part.objects) for (const m of o.meshes) { const b = m.bounds(); for (let k = 0; k < 3; k++) { bx[k] = Math.min(bx[k], b[k]); bx[k + 3] = Math.max(bx[k + 3], b[k + 3]); } }
    $('#sDims').textContent = (bx[3] - bx[0]).toFixed(1) + ' x ' + (bx[4] - bx[1]).toFixed(1) + ' x ' + (bx[5] - bx[2]).toFixed(2) + ' mm';
    $('#sTris').textContent = part.tris.toLocaleString() + ' tris';
    $('#sMs').textContent = ms + ' ms';
    setStatus({ ok: warns.length || badFits.length ? null : 'checks pass', warn: warns.length + badFits.length ? (warns.length + badFits.length) + ' warnings' : null, fits: (bx[3] - bx[0]) <= 250 && (bx[4] - bx[1]) <= 250 ? 'fits bed' : null, err: (bx[3] - bx[0]) > 250 || (bx[4] - bx[1]) > 250 ? 'over the bed' : null });
  }
  function setStatus(o) {
    const c = $('#sChips'); c.innerHTML = '';
    const add = (cls, t) => { if (!t) return; const d = document.createElement('span'); d.className = 'c ' + cls; d.textContent = t; c.appendChild(d); };
    add('ok', o.ok); add('ok', o.fits); add('warn', o.warn); add('err', o.err);
  }
  function legend() {
    const l = $('#legend'); l.innerHTML = '';
    B.SLOTS.forEach(s => { const d = document.createElement('div'); const i = document.createElement('i'); i.style.background = s.color; d.appendChild(i); d.appendChild(document.createTextNode(s.id + ' ' + s.name)); l.appendChild(d); });
  }
  window.BENCH_PART = { state, ui, V, showPart, scheduleBuild, doBuild, buildParams, buildGallery, paramsOf, pushUndo, restore, snapshot, setStatus, legend, camPreset, fitTo, groupFor, geoFor, matFor, catalogEntry, get currentPart() { return currentPart; } };
  // scene helpers are defined in app2.js and attached to BENCH_PART
  function sceneJson() { return window.BENCH_SCENE ? window.BENCH_SCENE.toJson() : null; }
  function loadScene(j) { if (window.BENCH_SCENE) window.BENCH_SCENE.fromJson(j); }
  function refreshPalette() { if (window.BENCH_SCENE) window.BENCH_SCENE.refreshPalette(); }
  function refreshPrintList() { if (window.BENCH_PRINT) window.BENCH_PRINT.refresh(); }
  window.BENCH_PART.initViewer = initViewer;
})();
