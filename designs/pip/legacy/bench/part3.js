/* part3.js: viewer (own orbit, press simulation, xray, section, plate), rail UI, boot. */
'use strict';
const SLOT_VIEW = (c) => { c = String(c).toUpperCase(); if (c === '#FFFFFF') return '#F4F1EA'; if (c === '#1A1A1A' || c === '#000000') return '#3a3a3a'; return c; };
const NET_COL = ['#7fdbff', '#a6e22e', '#ffb020', '#39b8ff', '#c78bff', '#ff6f59', '#4fe3c1', '#ffd23f', '#ff8fd0', '#8fd14f', '#6fa8ff', '#ff9f1c'];

// ------------------------------------------------------------ viewer
const VIEW = globalThis.VIEW = {};
(function () {
  const cv = document.querySelector('#stage canvas.three');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 3000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(60, -90, 140); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe0f0, 0.4); fill.position.set(-90, 70, 50); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(0, 30, -120); scene.add(rim);
  const group = new THREE.Group(); scene.add(group);
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  bed.position.z = -0.05; scene.add(bed);
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);   // keeps the far half, the cut faces the front camera
  const orbit = { theta: -1.2, phi: 0.85, dist: 260, target: new THREE.Vector3(0, 0, 6) };
  function applyCam() {
    const t = orbit.target;
    cam.position.set(t.x + orbit.dist * Math.cos(orbit.phi) * Math.cos(orbit.theta), t.y + orbit.dist * Math.cos(orbit.phi) * Math.sin(orbit.theta), t.z + orbit.dist * Math.sin(orbit.phi));
    cam.up.set(0, 0, 1); cam.lookAt(t);
  }
  const presets = { iso: [-1.2, 0.85], top: [-Math.PI / 2, Math.PI / 2 - 0.001], front: [-Math.PI / 2, 0.12], under: [-1.2, -0.85] };
  VIEW.preset = function (k) {
    if (k === 'explode') { UIS.explode = !UIS.explode; VIEW.update(); return; }
    if (k === 'xray') { UIS.xray = !UIS.xray; VIEW.update(); return; }
    if (k === 'section') {
      UIS.section = !UIS.section;
      if (UIS.section && MODEL) {
        const b = MODEL.L.btns.find(x => x.id === UIS.focus) || MODEL.L.btns.find(x => x.type === 'stick') || MODEL.L.btns[0];
        orbit.theta = -Math.PI / 2 + 0.35; orbit.phi = 0.3;
        if (b) { orbit.target.set(b.x, b.y, MODEL.M.z.top / 2); orbit.dist = 90; }
        applyCam();
      } else VIEW.fit();
      VIEW.update(); return;
    }
    if (k === 'plate') { UIS.plate = !UIS.plate; VIEW.update(); VIEW.fit(); return; }
    const p = presets[k]; if (p) { orbit.theta = p[0]; orbit.phi = p[1]; applyCam(); }
  };
  VIEW.fit = function () {
    if (!MODEL) return;
    const M = MODEL.M;
    if (UIS.plate) { orbit.target.set(M.plate.w / 2, M.plate.d / 2, 0); orbit.dist = Math.max(M.plate.w, M.plate.d) * 2.1; orbit.theta = -Math.PI / 2 + 0.25; orbit.phi = 1.05; }
    else { orbit.target.set(0, 0, M.z.top / 2); orbit.dist = Math.max(ST.shape.W, ST.shape.H) * 1.75; }
    applyCam();
  };
  // ---- press simulation: vertex groups per logical key
  let items = [];          // {mesh, base: Float32Array, groups}
  let netMeshes = [];      // {name, mesh}
  let keyIndex = [];       // {id, x, y, r, group}
  function pickKey(e) {
    if (!MODEL || UIS.plate) return null;
    const rect = cv.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(v, cam);
    const hits = rc.intersectObjects(group.children, false);
    if (!hits.length) return null;
    const p = hits[0].point;
    let best = null, bd = 1e9;
    for (const k of keyIndex) {
      const d = Math.hypot(p.x - k.x, p.y - k.y);
      if (d < k.r && d < bd) { bd = d; best = k; }
    }
    if (!best) return null;
    if (best.stick) {
      const a = Math.atan2(p.y - best.y, p.x - best.x) * 180 / Math.PI;
      const dir = a > -45 && a <= 45 ? 'RIGHT' : a > 45 && a <= 135 ? 'UP' : a > -135 && a <= -45 ? 'DOWN' : 'LEFT';
      return dir;
    }
    return best.id;
  }
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    const k = e.button === 0 ? pickKey(e) : null;
    drag = { x: e.clientX, y: e.clientY, b: e.button, key: k };
    cv.setPointerCapture(e.pointerId);
    if (k) { UIS.press.add(k); UIS.focus = k; VIEW.pressed(); UI.padRefresh(); }
  });
  cv.addEventListener('pointermove', e => {
    if (!drag || drag.key) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.b === 0) { orbit.theta -= dx * 0.008; orbit.phi = Math.max(-1.5, Math.min(1.5, orbit.phi + dy * 0.008)); }
    else { const r = new THREE.Vector3().subVectors(cam.position, orbit.target); const right = new THREE.Vector3().crossVectors(r, cam.up).normalize(); const up = new THREE.Vector3().crossVectors(right, r).normalize(); orbit.target.addScaledVector(right, dx * orbit.dist * 0.0012).addScaledVector(up, -dy * orbit.dist * 0.0012); }
    applyCam();
  });
  const up = () => { if (drag && drag.key) { UIS.press.delete(drag.key); VIEW.pressed(); UI.padRefresh(); } drag = null; };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); orbit.dist = Math.max(20, Math.min(1500, orbit.dist * (e.deltaY > 0 ? 1.1 : 0.9))); applyCam(); }, { passive: false });
  cv.addEventListener('dblclick', () => VIEW.fit());
  function resize() {
    const w = cv.clientWidth || 600, h = cv.clientHeight || 400;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(cv);

  function geom(mesh) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mesh.positions), 3));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    g.computeVertexNormals();
    return g;
  }
  function clear() {
    while (group.children.length) { const m = group.children.pop(); m.geometry.dispose(); m.material.dispose(); }
    items = []; netMeshes = [];
  }
  // which vertices move for which key, and how
  function vertexGroups(objName, partName, pos) {
    const { L, M } = MODEL;
    const out = [];
    const n = pos.length / 3;
    const C = ST.clicky;
    for (const b of L.btns) {
      const bi = M.btnInfo.find(x => x.id === b.id);
      const idx = [], w = [];
      if (b.type === 'flex' && objName === 'body' && (partName === 'flex' || partName === 'contacts')) {
        const zf = M.mech.flex.floor, Hs = M.mech.flex.Hs, rr = M.mech.flex.rsb + 0.4;
        for (let i = 0; i < n; i++) {
          const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
          if (z < zf - 1e-3 || Math.hypot(x - b.x, y - b.y) > rr) continue;
          idx.push(i); w.push(Math.min(1, (z - zf) / Hs));
        }
        out.push({ ids: [b.id], kind: 'dz', idx, w, travel: bi.travel + 0.12 });
      } else if (b.type === 'clicky' && (objName === 'click-caps' || objName === 'click-elements')) {
        const a = b.ang, ca = Math.cos(a), sa = Math.sin(a), l = C.l, trav = M.mech.click.cg + 0.15;
        for (let i = 0; i < n; i++) {
          const x = pos[3 * i] - b.x, y = pos[3 * i + 1] - b.y;
          if (objName === 'click-caps') { if (Math.hypot(x, y) < C.cap / 2 + C.flange + 0.3) { idx.push(i); w.push(1); } continue; }
          const u = x * ca + y * sa, s = -x * sa + y * ca;
          if (Math.abs(s) > C.w / 2 + 0.05 || Math.abs(u) > l / 2) continue;
          idx.push(i); w.push(Math.abs(u) <= C.sw / 2 + 0.01 ? 1 : (1 + Math.cos(2 * Math.PI * u / l)) / 2);
        }
        out.push({ ids: [b.id], kind: 'dz', idx, w, travel: trav });
      } else if (b.type === 'stick' && ((objName === 'body' && (partName === 'flex' || partName === 'contacts')) || objName === 'stick-cap')) {
        const S = L.stick, rr = Math.max(S.Rw, ST.stick.capD / 2 + 1.5);
        for (let i = 0; i < n; i++) {
          const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
          if (Math.hypot(x - b.x, y - b.y) > (objName === 'stick-cap' ? 40 : rr) || z < S.zp) continue;
          idx.push(i); w.push(1);
        }
        out.push({ ids: ['UP', 'DOWN', 'LEFT', 'RIGHT'], kind: 'tilt', idx, w, cx: b.x, cy: b.y, cz: S.zp, ang: S.th });
      }
    }
    return out.filter(g => g.idx.length);
  }
  VIEW.pressed = function () {
    for (const it of items) {
      const pa = it.mesh.geometry.attributes.position, arr = pa.array, base = it.base;
      let dirty = false;
      for (const g of it.groups) {
        const act = g.ids.filter(id => UIS.press.has(id));
        const on = act.length > 0;
        if (!on && !g.moved) continue;
        dirty = true; g.moved = on;
        if (g.kind === 'dz') {
          const d = on ? g.travel : 0;
          for (let k = 0; k < g.idx.length; k++) { const i = g.idx[k]; arr[3 * i] = base[3 * i]; arr[3 * i + 1] = base[3 * i + 1]; arr[3 * i + 2] = base[3 * i + 2] - d * g.w[k]; }
        } else {
          let tx = 0, ty = 0;
          for (const id of act) { if (id === 'UP') ty += 1; if (id === 'DOWN') ty -= 1; if (id === 'RIGHT') tx += 1; if (id === 'LEFT') tx -= 1; }
          const L = Math.hypot(tx, ty);
          for (let k = 0; k < g.idx.length; k++) {
            const i = g.idx[k];
            let x = base[3 * i] - g.cx, y = base[3 * i + 1] - g.cy, z = base[3 * i + 2] - g.cz;
            if (L > 0) {
              const ux = tx / L, uy = ty / L, th = g.ang, r = x * ux + y * uy, q = -x * uy + y * ux;
              const r2 = r * Math.cos(th) + z * Math.sin(th), z2 = -r * Math.sin(th) + z * Math.cos(th);
              x = r2 * ux - q * uy; y = r2 * uy + q * ux; z = z2;
            }
            arr[3 * i] = x + g.cx; arr[3 * i + 1] = y + g.cy; arr[3 * i + 2] = z + g.cz;
          }
        }
      }
      if (dirty) { pa.needsUpdate = true; it.mesh.geometry.computeVertexNormals(); }
    }
    // net highlight
    const hot = new Set();
    for (const id of UIS.press) { hot.add(id); hot.add(MODEL && MODEL.L.btns.some(b => b.id === id && b.type === 'touch') ? '3V3' : 'GND'); }
    for (const nm of netMeshes) {
      const h = hot.has(nm.name), dim = hot.size > 0 && !h;
      nm.mesh.material.emissive.set(h ? 0x661133 : 0x000000);
      nm.mesh.material.color.set(h ? '#FE0386' : nm.col);
      nm.mesh.material.transparent = dim; nm.mesh.material.opacity = dim ? 0.22 : 1; nm.mesh.material.needsUpdate = true;
    }
  };
  VIEW.update = function () {
    clear();
    if (!MODEL) return;
    const { M, L } = MODEL;
    const clipOn = UIS.section && !UIS.plate;
    const focusB = L.btns.find(b => b.id === UIS.focus) || L.btns.find(b => b.type === 'stick' && ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(UIS.focus)) || L.btns[0];
    clip.constant = focusB ? -focusB.y : 0;
    const planes = clipOn ? [clip] : [];
    keyIndex = L.btns.map(b => ({ id: b.id, x: b.x, y: b.y, r: Math.max(b.bezR || 5, 5) + 1, stick: b.type === 'stick' }));
    for (const o of M.objects) {
      const parts = UIS.plate ? o.print : o.asm;
      for (const p of parts) {
        if (UIS.xray && !UIS.plate && p.slot === 2 && o.name === 'body') continue;
        const g = geom(p.mesh);
        const col = SLOT_VIEW(ST.slots[p.slot - 1].color);
        const ghost = UIS.xray && !UIS.plate && p.slot === 1;
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.6, metalness: 0.05, flatShading: true, transparent: ghost, opacity: ghost ? 0.13 : 1, depthWrite: !ghost, side: clipOn ? THREE.DoubleSide : THREE.FrontSide, clippingPlanes: planes });
        const m = new THREE.Mesh(g, mat);
        if (UIS.plate) m.position.set(o.place[0], o.place[1], 0);
        else if (UIS.explode) m.position.z = o.explode;
        if (UIS.xray && !UIS.plate && o.name === 'bezel') m.visible = false;
        group.add(m);
        if (!UIS.plate) items.push({ mesh: m, base: new Float32Array(p.mesh.positions), groups: vertexGroups(o.name, p.name, p.mesh.positions) });
      }
    }
    if (UIS.xray && !UIS.plate) {
      M.netMeshes.forEach((nm, i) => {
        const col = nm.name === 'GND' ? '#d9d9d9' : nm.name === '3V3' ? '#ff5c4d' : NET_COL[i % NET_COL.length];
        const m = new THREE.Mesh(geom(nm.mesh), new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.5, flatShading: true, clippingPlanes: planes, side: clipOn ? THREE.DoubleSide : THREE.FrontSide }));
        if (UIS.explode) m.position.z = 0;
        group.add(m);
        netMeshes.push({ name: nm.name, mesh: m, col });
      });
    }
    if (UIS.plate) { bed.scale.set(M.plate.w, M.plate.d, 1); bed.position.set(M.plate.w / 2, M.plate.d / 2, -0.05); }
    else { bed.scale.set(ST.shape.W * 1.5, ST.shape.H * 1.9, 1); bed.position.set(0, 0, -0.05); }
    VIEW.pressed();
    VIEW.legend();
  };
  VIEW.legend = function () {
    const el = document.getElementById('legend');
    const roles = ['body, bezel', 'traces, ink', 'keys, pink', 'contacts'];
    let h = ST.slots.map((sl, i) => '<div><i style="background:' + sl.color + '"></i>' + (i + 1) + ' ' + sl.name + ' <span style="opacity:.6">' + roles[i] + '</span></div>').join('');
    if (UIS.xray && MODEL) h += '<div style="margin-top:4px;color:#a6e22e">xray: nets in colour, shell ghosted</div>';
    if (UIS.section) h += '<div style="color:#ffb020">section through ' + (UIS.focus || 'the first key') + '</div>';
    if (UIS.plate && MODEL) h += '<div style="color:' + (MODEL.M.plate.fits ? '#a6e22e' : '#ffb020') + '">plate ' + MODEL.M.plate.w + ' x ' + MODEL.M.plate.d + (MODEL.M.plate.fits ? ', fits' : ', does not fit') + '</div>';
    el.innerHTML = h;
  };
  VIEW.paused = false;
  function loop() { if (!VIEW.paused) renderer.render(scene, cam); requestAnimationFrame(loop); }
  resize(); applyCam(); loop();
  VIEW.snapshot = () => cv.toDataURL('image/png');
  VIEW.orbit = orbit;
})();

// ------------------------------------------------------------ UI
const UI = globalThis.UI = {};
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const GUIDES = [
    ['STEP 1 LAYOUT', 'shape the body and place the button groups. each group picks its own switch: flex cone, click spring or touch comb.'],
    ['STEP 2 BUTTONS', 'tune the keys you picked. the click spring curve is solved from its numbers; hold a key in the drive pad to see it move.'],
    ['STEP 3 BOARD', 'seat the RP2040-Zero on press fit bumps or wire it to cups, map the pins, then take the wiring drawing and the firmware.'],
    ['STEP 4 PRINT', 'set the buried trace stack and routing, check the filaments, and export the 3MF with every part on its head.']
  ];
  const fmt = (v, d = 2) => (v === undefined || v === null || isNaN(v)) ? '-' : (+v).toFixed(d);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function go(step) {
    UIS.step = step; UIS.visited[step] = true;
    $$('#steps button').forEach(b => { const s = +b.dataset.step; b.classList.toggle('on', s === step); b.classList.toggle('done', UIS.visited[s] && s !== step); });
    $$('.pane').forEach(p => p.classList.toggle('on', +p.dataset.pane === step));
    $('#guide b').textContent = GUIDES[step][0]; $('#guideText').textContent = GUIDES[step][1];
    if (step === 1) drawCurve();
  }
  UI.go = go;
  $$('#steps button').forEach(b => b.onclick = () => go(+b.dataset.step));
  $$('[data-go]').forEach(b => b.onclick = () => go(+b.dataset.go));
  $$('#cams button').forEach(b => b.onclick = () => {
    const k = b.dataset.cam;
    if (['explode', 'xray', 'section', 'plate'].includes(k)) { VIEW.preset(k); b.classList.toggle('on', !!UIS[k]); }
    else { $$('#cams button').forEach(x => { if (['iso', 'top', 'front', 'under'].includes(x.dataset.cam)) x.classList.toggle('on', x === b); }); VIEW.preset(k); }
  });
  // ---- generic bindings
  function bind(el) {
    const p = el.dataset.p;
    const read = () => { const v = getP(p); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
    read();
    el._read = read;
    const write = () => {
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if (el.type === 'number' || el.type === 'range') { v = +el.value; if (isNaN(v)) { read(); return false; } }
      else if (el.tagName === 'SELECT' && el.value !== '' && !isNaN(+el.value)) v = +el.value;
      else v = el.value;
      setP(p, v);
      $$('[data-p="' + p + '"]').forEach(o => { if (o !== el && o._read) o._read(); });
      return true;
    };
    if (el.type === 'range') { el.addEventListener('input', () => { if (write()) touch(); }); el.addEventListener('change', () => { if (write()) commit(); }); }
    else el.addEventListener('change', () => { if (write()) { commit(); UI.visibility(); } });
  }
  function bindAll(root) { (root || document).querySelectorAll('[data-p]').forEach(el => { if (!el._bound) { el._bound = true; bind(el); } }); }
  UI.visibility = function () {
    $$('[data-show]').forEach(el => { const [p, v] = el.dataset.show.split('='); el.style.display = String(getP(p)) === v ? '' : 'none'; });
    $$('#shapes .chip').forEach(x => x.classList.toggle('on', x.dataset.shape === ST.shape.style));
    $$('#modes .chip').forEach(x => x.classList.toggle('on', x.dataset.mode === ST.board.mode));
    $$('#sticktops .chip').forEach(x => x.classList.toggle('on', x.dataset.top === ST.stick.top));
    $$('#mats .chip').forEach(x => x.classList.toggle('on', ST.phys.rhoC === (x.dataset.mat === 'yousu' ? 500 : 30)));
    $$('[data-p="stick.capDish"], [data-p="stick.capH"]').forEach(x => { const r = x.closest('.row'); if (r) r.style.display = ST.stick.top === 'press' && x.dataset.p === 'stick.capDish' ? 'none' : ''; });
    const types = new Set();
    for (const [k, g] of Object.entries(ST.groups)) if (g.on) types.add(k === 'left' && g.kind === 'stick' ? 'stick' : g.type);
    let any = false;
    $$('[data-type]').forEach(el => { const on = types.has(el.dataset.type); el.style.display = on ? '' : 'none'; any = any || on; });
    $('#noTypes').style.display = any ? 'none' : '';
  };
  $$('#shapes .chip').forEach(b => b.onclick = () => { ST.shape.style = b.dataset.shape; UI.visibility(); commit(); });
  $$('#modes .chip').forEach(b => b.onclick = () => { ST.board.mode = b.dataset.mode; UI.visibility(); commit(); });
  const MATS = { yousu: { rhoC: 500, rhoCz: 2000, rhoT: 400 }, proto: { rhoC: 30, rhoCz: 115, rhoT: 1500 } };
  $$('#sticktops .chip').forEach(b => b.onclick = () => { ST.stick.top = b.dataset.top; UI.visibility(); commit(); });
  $$('#mats .chip').forEach(b => b.onclick = () => { Object.assign(ST.phys, MATS[b.dataset.mat]); $$('[data-p^="phys."]').forEach(o => o._read && o._read()); commit(); });
  // ---- groups
  const GROUP_NAMES = { left: 'LEFT CLUSTER', face: 'FACE KEYS', menu: 'MENU KEYS', shoulder: 'TOP L / R' };
  function renderGroups() {
    const host = $('#groups'); host.innerHTML = '';
    for (const k of ['left', 'face', 'menu', 'shoulder']) {
      const g = ST.groups[k];
      const d = document.createElement('div'); d.className = 'grp';
      let h = '<div class="gh">' + GROUP_NAMES[k] + '<input type="checkbox" data-p="groups.' + k + '.on" title="on"></div>';
      if (k === 'left') h += '<div class="chips" style="margin:4px 0"><button class="chip' + (g.kind === 'dpad' ? ' on' : '') + '" data-kind="dpad">d-pad</button><button class="chip' + (g.kind === 'stick' ? ' on' : '') + '" data-kind="stick">stick</button></div>';
      if (!(k === 'left' && g.kind === 'stick')) h += '<div class="chips" style="margin:4px 0">' + ['flex', 'clicky', 'touch'].map(t => '<button class="chip pk' + (g.type === t ? ' on' : '') + '" data-type2="' + t + '">' + t + '</button>').join('') + '</div>';
      h += '<div class="row"><label>x</label><input type="range" data-p="groups.' + k + '.x" min="-90" max="90" step="0.5"><input type="number" data-p="groups.' + k + '.x" step="0.5"><span class="u">mm</span></div>';
      h += '<div class="row"><label>y</label><input type="range" data-p="groups.' + k + '.y" min="-40" max="40" step="0.5"><input type="number" data-p="groups.' + k + '.y" step="0.5"><span class="u">mm</span></div>';
      if (k !== 'shoulder' && !(k === 'left' && g.kind === 'stick')) h += '<div class="row"><label>pitch</label><input type="range" data-p="groups.' + k + '.pitch" min="10" max="30" step="0.5"><input type="number" data-p="groups.' + k + '.pitch" step="0.5"><span class="u">mm</span></div>';
      d.innerHTML = h;
      host.appendChild(d);
      d.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { g.kind = b.dataset.kind; renderGroups(); UI.visibility(); commit(); });
      d.querySelectorAll('[data-type2]').forEach(b => b.onclick = () => { g.type = b.dataset.type2; renderGroups(); UI.visibility(); commit(); });
    }
    bindAll(host);
  }
  // ---- pins
  function renderPins() {
    const host = $('#pins'); host.innerHTML = '';
    const ids = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'X', 'Y', 'SELECT', 'START', 'L', 'R'];
    const opts = ['', ...H.LAYOUT.GPIOS];
    for (const id of ids) {
      const d = document.createElement('div'); d.className = 'row';
      d.innerHTML = '<label>' + id + '</label><select data-p="pins.' + id + '">' + opts.map(o => '<option value="' + o + '">' + (o || 'none') + (['GP26', 'GP27', 'GP28', 'GP29'].includes(o) ? ' adc' : '') + '</option>').join('') + '</select>';
      host.appendChild(d);
    }
    bindAll(host);
  }
  // ---- slots
  function renderSlots() {
    const host = $('#slots'); host.innerHTML = '';
    ST.slots.forEach((sl, i) => {
      const row = document.createElement('div'); row.className = 'slot';
      row.innerHTML = '<span class="n">' + (i + 1) + '</span><input type="color" value="' + sl.color + '"><input type="text" value="' + esc(sl.name).replace(/"/g, '&quot;') + '"><select>' + Object.keys(Orca3MF.MATERIALS).map(m => '<option' + (m === sl.type ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>';
      const [c, t, s] = row.querySelectorAll('input,select');
      c.addEventListener('input', () => { sl.color = c.value.toUpperCase(); VIEW.update(); });
      c.addEventListener('change', () => snapshot());
      t.addEventListener('change', () => { sl.name = t.value; snapshot(); VIEW.legend(); });
      s.addEventListener('change', () => { sl.type = s.value; snapshot(); });
      host.appendChild(row);
    });
  }
  // ---- drive pad
  function padKeys() {
    if (!MODEL) return [];
    const out = [];
    for (const b of MODEL.L.btns) { if (b.type === 'stick') out.push('UP', 'DOWN', 'LEFT', 'RIGHT'); else out.push(b.id); }
    return out;
  }
  function renderPad() {
    const host = $('#padKeys'); host.innerHTML = '';
    for (const id of padKeys()) {
      const b = document.createElement('button'); b.textContent = id; b.dataset.k = id;
      const on = () => { UIS.press.add(id); UIS.focus = id; VIEW.pressed(); UI.padRefresh(); if (UIS.section) VIEW.update(); };
      const off = () => { UIS.press.delete(id); VIEW.pressed(); UI.padRefresh(); };
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); on(); });
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
      host.appendChild(b);
    }
    UI.padRefresh();
  }
  UI.padRefresh = function () {
    $$('#padKeys button').forEach(b => { b.classList.toggle('on', UIS.press.has(b.dataset.k)); b.classList.toggle('lit', UIS.focus === b.dataset.k && !UIS.press.has(b.dataset.k)); });
    if (!MODEL) { $('#padRead').textContent = ''; return; }
    const rows = MODEL.M.elec.rows;
    if (!UIS.press.size) { $('#padRead').textContent = 'all pins idle: mech pins read high after the float, touch pins low'; return; }
    const parts = [];
    for (const id of UIS.press) {
      const r = rows.find(x => x.id === id);
      if (!r) continue;
      const lvl = r.type === 'touch' ? 'HIGH' : 'LOW';
      parts.push(id + ' ' + (r.pin || '?') + ' reads ' + lvl + ' (' + (r.R / 1e6).toFixed(2) + ' Mohm, crosses in ' + (r.read.tauMs < 0.5 ? (r.read.tauMs * 5000).toFixed(0) + ' us' : (r.read.tauMs * 5).toFixed(2) + ' ms') + ')');
    }
    $('#padRead').textContent = parts.join('  ');
  };
  // ---- click curve
  function drawCurve() {
    const cvs = $('#curve'); if (!cvs || !MODEL || !MODEL.M.mech.click || cvs.offsetParent === null) return;
    const mc = MODEL.M.mech.click;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cvs.clientWidth, hh = cvs.clientHeight;
    cvs.width = w * dpr; cvs.height = hh * dpr;
    const g = cvs.getContext('2d'); g.scale(dpr, dpr);
    g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, hh);
    const pts = mc.curve;
    const dmax = Math.max(...pts.map(p => p[0])), fmax = Math.max(...pts.map(p => p[1])) * 1.15, fmin = Math.min(0, ...pts.map(p => p[1]));
    const X = d => 34 + (w - 44) * d / dmax, Y = f => hh - 20 - (hh - 34) * (f - fmin) / (fmax - fmin);
    g.strokeStyle = 'rgba(254,3,134,.25)'; g.lineWidth = 1;
    for (let f = 0; f <= fmax; f += Math.max(0.5, Math.round(fmax / 4))) { g.beginPath(); g.moveTo(34, Y(f)); g.lineTo(w - 10, Y(f)); g.stroke(); }
    g.fillStyle = '#9a9184'; g.font = '13px VT323, monospace';
    for (let f = 0; f <= fmax; f += Math.max(0.5, Math.round(fmax / 4))) g.fillText(f.toFixed(1), 4, Y(f) + 4);
    g.fillText('mm', w - 30, hh - 5); g.fillText('N', 4, 12);
    for (let d = 0; d <= dmax; d += 0.5) g.fillText(d.toFixed(1), X(d) - 8, hh - 5);
    g.strokeStyle = '#ffb020'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(mc.cg), 14); g.lineTo(X(mc.cg), hh - 20); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ffb020'; g.fillText('contact', X(mc.cg) + 3, 24);
    g.strokeStyle = '#FE0386'; g.lineWidth = 2; g.beginPath();
    pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])));
    g.stroke();
    g.fillStyle = '#a6e22e'; g.beginPath(); g.arc(X(mc.dPeak), Y(mc.peak), 3.5, 0, 7); g.fill();
  }
  UI.drawCurve = drawCurve;
  // ---- readouts
  function readouts() {
    const { M, L, R } = MODEL;
    const z = M.z;
    $('#dims1').innerHTML = 'size<span>' + ST.shape.W + ' x ' + ST.shape.H + ' x ' + fmt(z.bezelTop) + '</span>body<span>' + fmt(z.top) + ' mm</span>keys<span>' + L.btns.length + '</span>nets<span>' + L.nets.length + '</span>';
    const w = M.warn.concat(LOG.slice(-2));
    const wh = w.length ? w.map(x => '<div>' + esc(x) + '</div>').join('') : '<div class="ok">no collisions, every net in one piece, clearances over 0.3 mm</div>';
    $('#warns1').innerHTML = wh;
    $('#warns3').innerHTML = M.warn.filter(x => /pin|GP|net/.test(x)).map(x => '<div>' + esc(x) + '</div>').join('');
    const mf = M.mech.flex;
    if (mf) $('#roFlex').innerHTML = 'contact gap<span>' + fmt(mf.gap) + ' mm</span>key height<span>' + fmt(mf.keyH) + ' mm</span>cone base<span>' + fmt(2 * mf.rsb, 1) + ' mm</span>wall across<span>' + fmt(mf.wall) + ' mm</span>stands at<span>' + fmt(mf.floor) + ' mm</span>feel<span>' + (mf.wall / mf.Hs < 0.16 ? 'soft' : mf.wall / mf.Hs < 0.24 ? 'medium' : 'stiff') + '</span>';
    const mc = M.mech.click;
    if (mc) {
      $('#roClick').innerHTML = 'peak<span>' + fmt(mc.peak) + ' N at ' + fmt(mc.dPeak) + '</span>after snap<span>' + fmt(mc.valley) + ' N</span>force drop<span>' + fmt(mc.drop * 100, 0) + ' %</span>contact at<span>' + fmt(mc.cg) + ' mm</span>strain at stop<span style="color:' + (mc.eStop > 0.025 ? 'var(--err)' : 'var(--pink)') + '">' + fmt(mc.eStop * 100) + ' %</span>behaviour<span>' + (mc.bistable ? 'latches' : mc.drop > 0.3 ? 'clicks' : 'soft spring') + '</span>';
      drawCurve();
    }
    const tb = M.btnInfo.find(b => b.type === 'touch');
    if (tb) $('#roTouch').innerHTML = 'fingers<span>' + tb.fingers + '</span>copper area<span>' + fmt(tb.area, 0) + ' mm2</span>';
    if (M.mech.stick) { const s = M.mech.stick; $('#roStick').innerHTML = 'well radius<span>' + fmt(s.Rw) + ' mm</span>rest gap<span>' + fmt(s.gap) + ' mm</span>wall pads<span>' + fmt(s.padZ[0]) + ' to ' + fmt(s.padZ[1]) + '</span>common ring<span>' + fmt(s.comZ[0]) + ' to ' + fmt(s.comZ[1]) + '</span>bezel hole<span>' + fmt(2 * s.hole, 1) + ' mm</span>'; }
    $('#roRoute').innerHTML = 'nets<span>' + R.nets.length + '</span>conflicts<span>' + R.conflicts + '</span>unrouted<span>' + R.unrouted + '</span>vias<span>' + R.nets.reduce((a, n) => a + n.vias.length, 0) + '</span>GND tree<span>' + fmt(M.elec.gndLen, 0) + ' mm</span>worst path<span>' + fmt(Math.max(...M.elec.rows.map(r => r.R), 0) / 1e6) + ' Mohm</span>min gap<span>' + (isFinite(M.elec.minGap) ? fmt(M.elec.minGap) + ' mm' : '-') + '</span>';
    const rows = M.elec.rows;
    const us = (ms) => ms < 0.5 ? (ms * 1000).toFixed(0) + ' us' : ms.toFixed(2) + ' ms';
    $('#elec').innerHTML = '<tr><th>key</th><th>pin</th><th>path</th><th>settles</th><th>wait</th><th>leak under</th></tr>' + rows.map(r => '<tr><td>' + r.id + '</td><td>' + (r.pin || '-') + '</td><td>' + (r.R / 1e6).toFixed(2) + ' M</td><td class="' + (r.read.ok ? '' : 'bad') + '">' + us(r.read.tauMs * 5) + '</td><td>' + r.read.wait + ' ms</td><td>' + (r.read.reject / 1e6).toFixed(0) + ' M</td></tr>').join('');
    $('#hookNote').textContent = 'no resistors, and at this resistivity none would help: a pull up would have to be tens of megohms. the firmware charges each pin away from its active level, floats it, then reads ' + ST.phys.waitMech + ' ms later for keys and ' + ST.phys.waitTouch + ' ms for touch (20 Mohm skin assumed). the short wait is what rejects contamination: any stray path under the last column reads as a key held down. idle drift is about ' + M.elec.droop.toFixed(2) + ' V at ' + ST.phys.leak + ' nA of pin leakage. ' + (ST.board.mode === 'press' ? 'press fit: the board needs no wires.' : 'wire the cups as drawn.');
    const fg = {};
    for (const f of M.fits) (fg[f.group] = fg[f.group] || []).push(f);
    $('#fits').innerHTML = Object.entries(fg).map(([g, list]) => '<tr><th colspan="3">' + g + '</th></tr>' + list.map(f => '<tr><td>' + esc(f.name) + '</td><td>' + esc(f.value) + '</td><td class="' + (f.ok ? '' : 'bad') + '">' + (f.ok ? esc(f.note) : 'check: ' + esc(f.note || 'too tight')) + '</td></tr>').join('')).join('');
    try { $('#wiring').innerHTML = wiringSvg(); } catch (e) { console.warn(e); }
    const vol = {};
    for (const o of M.objects) for (const p of o.print) vol[p.slot] = (vol[p.slot] || 0) + p.vol;
    const tris = M.objects.reduce((a, o) => a + o.print.reduce((b, p) => b + p.mesh.tris, 0), 0);
    $('#readout').innerHTML = ST.slots.map((s, i) => 'slot ' + (i + 1) + '<span>' + fmt((vol[i + 1] || 0) / 1000 * Orca3MF.MATERIALS[s.type].density, 1) + ' g</span>').join('') + 'objects<span>' + M.objects.length + '</span>triangles<span>' + tris + '</span>plate<span>' + (M.plate.fits ? 'fits' : 'too big') + '</span>layers<span>' + Math.round(M.z.top / ST.stack.layer) + ' + ' + Math.round(ST.stack.bezel / ST.stack.layer) + '</span>';
    $('#stDims').textContent = ST.shape.W + ' x ' + ST.shape.H + ' x ' + fmt(z.bezelTop) + ' mm';
    $('#stTris').textContent = tris + ' tris';
    $('#stMs').textContent = 'build ' + Math.round(MODEL.ms) + ' ms, route ' + R.ms + ' ms';
    chips();
  }
  function chips() {
    const c = [];
    if (MODEL) {
      const M = MODEL.M;
      c.push(['c ' + (M.plate.fits ? 'ok' : 'warn'), M.plate.fits ? 'fits bed' : 'bed too small']);
      c.push(['c ' + (BUILT === REV ? 'ok' : 'warn'), BUILT === REV ? 'mesh current' : 'mesh stale']);
      c.push(['c ' + (M.warn.length ? 'warn' : 'ok'), M.warn.length ? M.warn.length + ' warnings' : 'no warnings']);
      c.push(['c ' + (MODEL.R.unrouted || MODEL.R.conflicts ? 'err' : 'ok'), MODEL.R.unrouted || MODEL.R.conflicts ? 'routing incomplete' : 'routed']);
    } else c.push(['c err', 'no model']);
    $('#stChips').innerHTML = c.map(([k, t]) => '<span class="' + k + '">' + t + '</span>').join('');
  }
  UI.stale = chips;
  UI.quick = function () { };
  UI.busy = on => $('#busy').classList.toggle('on', on);
  UI.afterBuild = function () { readouts(); renderPad(); VIEW.legend(); };
  UI.buildError = msg => { $('#warns1').innerHTML = '<div>build failed: ' + esc(msg) + '</div>'; chips(); };
  UI.refreshAll = function () {
    renderGroups(); renderPins(); renderSlots();
    $$('[data-p]').forEach(el => el._read && el._read());
    UI.visibility(); go(UIS.step);
  };
  // ---- header, exports, files
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
  $('#bSave').onclick = () => download(new Blob([designJson()], { type: 'application/json' }), 'pip-design.json');
  $('#bOpen').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(loadDesign); e.target.value = ''; };
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && /json/i.test(f.name + f.type)) f.text().then(loadDesign); });
  $('#bGuide').onclick = () => $('#welcome').classList.remove('hide');
  const pickStart = (fn) => { ST = fn(); UIS.press.clear(); UIS.focus = null; snapshotNow(); afterLoad(); $('#welcome').classList.add('hide'); setTimeout(() => VIEW.fit(), 50); };
  $('#wBlank').onclick = () => pickStart(blankState);
  $('#wExample').onclick = () => pickStart(exampleState);
  $('#wStick').onclick = () => pickStart(stickState);
  $('#bBuild').onclick = () => { BUILT = -1; runBuild(); };
  $('#autoB').onchange = e => { UIS.auto = e.target.checked; if (UIS.auto) schedule(); };
  $('#bPlate').onclick = () => $('#cams [data-cam="plate"]').click();
  $('#b3mf').onclick = async () => download(await export3mf(), 'pip.3mf');
  $('#bStl').onclick = async () => download(await exportStlZip(), 'pip-stl.zip');
  $('#bCard').onclick = () => download(new Blob([printCard()], { type: 'text/plain' }), 'print-card.txt');
  $('#bJson').onclick = () => download(new Blob([designJson()], { type: 'application/json' }), 'pip-design.json');
  $('#bFw').onclick = () => download(new Blob([firmware()], { type: 'text/plain' }), 'pip.ino');
  $('#bSvg').onclick = () => download(new Blob([wiringSvg()], { type: 'image/svg+xml' }), 'pip-wiring.svg');
  $('#bCoupon').onclick = async () => { UI.busy(true); try { download(await exportCoupon(), 'pip-coupon.zip'); } finally { UI.busy(false); } };
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  });
  new ResizeObserver(() => drawCurve()).observe($('#rail'));
  UI.bindAll = bindAll;
})();

// ------------------------------------------------------------ boot: fonts, kernel, first build
(async function boot() {
  try { await Promise.all(['Permanent Marker', 'Special Elite', 'VT323', 'IBM Plex Mono'].map(f => document.fonts.load('16px "' + f + '"'))); } catch (e) { console.warn('fonts', e); }
  globalThis.MF = await globalThis.ManifoldBoot();
  H.GEO.init();
  ST = blankState();
  snapshotNow();
  UI.bindAll();
  UI.refreshAll();
  REV++;
  doBuild();
  VIEW.update(); UI.afterBuild(); VIEW.fit();
  BENCH.ready = true;
})().catch(e => { console.error(e); document.getElementById('warns1').textContent = 'boot failed: ' + e.message; });
