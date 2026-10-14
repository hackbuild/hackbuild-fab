/* BOSS.bench app part 2: BUILD step. The scene is SIM.Scene; this file renders it, handles drag and drop and shows the solve. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const BP = window.BENCH_PART, V = BP.V, state = BP.state, B = BOSS, S = B.S, P = SIM.P;
  const scene = new SIM.Scene(); state.scene = scene;
  const partCache = {}; // key -> built part (dedupe identical params)
  function keyOf(id, params) { return id + ':' + JSON.stringify(params || {}); }
  function partFor(id, params) {
    if (id === 'supply') return SIM.SUPPLY;
    const k = keyOf(id, params); if (!partCache[k]) partCache[k] = PARTS.make(id, Object.assign(PARTS.defaults(BP.catalogEntry(id).params), params || {}));
    return partCache[k];
  }
  // instance records carry id + params so the scene serialises; part objects are cached
  const inst3 = new Map(); // inst.uid -> THREE.Group
  const wire3 = new Map();
  let ghost = null, placing = null, dragging = null, wireFrom = null;

  function instGroup(inst) {
    let g = inst3.get(inst.uid);
    if (!g) {
      g = new THREE.Group();
      if (inst.part.virtual) { // supply: a little battery block with two studs
        const body = new THREE.Mesh(new THREE.BoxGeometry(15.2, 7.2, 9.6), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })); body.position.z = 4.8; g.add(body);
        for (const [x, c] of [[-4, 0xa6e22e], [4, 0x6b6459]]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.8, 24), new THREE.MeshStandardMaterial({ color: c })); st.rotation.x = Math.PI / 2; st.position.set(x, 0, 9.6 + 0.9); g.add(st); }
      } else {
        const o = inst.part.objects[0]; g.add(BP.groupFor(o, false));
      }
      const fp = SIM.footprint(inst);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(inst.part.cols * P - 0.5, inst.part.rows * P - 0.5, inst.part.top), new THREE.MeshBasicMaterial({ visible: false })); pick.position.z = inst.part.top / 2; pick.userData.pick = inst; g.add(pick);
      inst3.set(inst.uid, g); V.world.add(g);
    }
    const fp = SIM.footprint(inst);
    g.position.set((inst.ci + fp.w / 2) * P, (inst.cj + fp.h / 2) * P, inst.z);
    g.rotation.z = inst.rot * Math.PI / 2;
    return g;
  }
  function portWorld(inst, port) { const p = inst.part.ports[port]; const [wi, wj] = SIM.worldCell(inst, p.i, p.j); return new THREE.Vector3((wi + 0.5) * P, (wj + 0.5) * P, inst.z + inst.part.top); }
  function wireGroup(w) {
    let g = wire3.get(w.uid); if (g) { V.world.remove(g); }
    g = new THREE.Group();
    const a = portWorld(w.a.inst, w.a.port), b = portWorld(w.b.inst, w.b.port);
    const lift = 8 + Math.min(20, a.distanceTo(b) * 0.15);
    const curve = new THREE.CatmullRomCurve3([a.clone().add(new THREE.Vector3(0, 0, 5.5)), a.clone().add(new THREE.Vector3(0, 0, 5.5 + lift * 0.5)), a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0, 5.5 + lift)), b.clone().add(new THREE.Vector3(0, 0, 5.5 + lift * 0.5)), b.clone().add(new THREE.Vector3(0, 0, 5.5))]);
    const core = +w.part.params.core === S.CPLA;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 1.6, 8, false), new THREE.MeshStandardMaterial({ color: 0xfe0386, roughness: 0.9 })); g.add(tube);
    for (const p of [a, b]) { const cap = new THREE.Mesh(new THREE.BoxGeometry(7.6, 7.6, 5.5), new THREE.MeshStandardMaterial({ color: 0xfe0386, roughness: 0.9 })); cap.position.copy(p).add(new THREE.Vector3(0, 0, 2.75)); g.add(cap); const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.6, 16), new THREE.MeshStandardMaterial({ color: core ? 0x1a1a1a : 0x4a4a4a })); ring.rotation.x = Math.PI / 2; ring.position.copy(p).add(new THREE.Vector3(0, 0, 5.6)); g.add(ring); }
    const pick = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 3, 6, false), new THREE.MeshBasicMaterial({ visible: false })); pick.userData.pickWire = w; g.add(pick);
    wire3.set(w.uid, g); V.world.add(g); return g;
  }
  function syncWorld() {
    for (const [uid, g] of inst3) if (!scene.insts.some(i => i.uid === uid)) { V.world.remove(g); inst3.delete(uid); }
    for (const [uid, g] of wire3) if (!scene.wires.some(w => w.uid === uid)) { V.world.remove(g); wire3.delete(uid); }
    for (const inst of scene.insts) instGroup(inst);
    for (const w of scene.wires) wireGroup(w);
    V.dirty = true; renderInstList();
  }
  function showScene() {
    V.root.visible = false; V.world.visible = true; V.grid.visible = true; V.gplane.visible = true; $('#tools').style.display = 'flex';
    if (!scene.insts.length) { V.target.set(60, 40, 0); V.sph.r = 260; V.dirty = true; return; }
    const box = new THREE.Box3(); for (const g of inst3.values()) box.expandByObject(g); if (!box.isEmpty()) BP.fitTo(box);
    V.dirty = true;
  }
  function hideScene() { V.world.visible = false; V.grid.visible = false; V.gplane.visible = false; $('#tools').style.display = 'none'; clearOverlay(); }

  // ---------- palette ----------
  const QUICK = [['supply', 'SUPPLY', {}], ['plate', 'PLATE 8x8', { cols: 8, rows: 8, nets: [] }], ['jumper', 'JUMPER 1x2', { n: 2 }], ['jumper', 'BUS 1x4', { n: 4, bus: true }], ['button', 'BUTTON', {}], ['touch', 'TOUCH', {}], ['force', 'FORCE', {}], ['slider', 'SLIDER', {}], ['lamp', 'LAMP', {}], ['resistor', 'RESISTOR', {}]];
  function refreshPalette() {
    const pal = $('#palette'); pal.innerHTML = '';
    const cur = BP.currentPart;
    if (cur && cur.id !== 'wire') { const b = document.createElement('button'); b.className = 'chip pink on'; b.textContent = 'add current: ' + cur.name; b.onclick = () => startPlace(state.part.id, JSON.parse(JSON.stringify(BP.paramsOf()))); pal.appendChild(b); }
    for (const [id, label, params] of QUICK) { const b = document.createElement('button'); b.className = 'chip'; b.textContent = label; b.onclick = () => startPlace(id, params); pal.appendChild(b); }
    for (const bd of ['c3mini', 'pico', 'teensy40']) { const b = document.createElement('button'); b.className = 'chip'; b.textContent = 'SEAT ' + PARTS.BOARDS[bd].name.split(' ')[0]; b.onclick = () => startPlace('seat', { board: bd, mount: 'press' }); pal.appendChild(b); }
  }
  function startPlace(id, params) {
    cancelPlace();
    const part = partFor(id, params);
    placing = { id, params, part, rot: 0, ci: 0, cj: 0 };
    ghost = new THREE.Group(); const fp = { w: part.cols, h: part.rows };
    const box = new THREE.Mesh(new THREE.BoxGeometry(fp.w * P, fp.h * P, part.top), new THREE.MeshBasicMaterial({ color: 0xfe0386, transparent: true, opacity: 0.35 })); box.position.z = part.top / 2; ghost.add(box);
    V.overlay.add(ghost); setTool('move'); hud('placing <b>' + part.name + '</b>: click to drop, R rotates, esc cancels');
  }
  function cancelPlace() { if (ghost) { V.overlay.remove(ghost); ghost = null; } placing = null; V.dirty = true; }
  function hud(html) { $('#hud').innerHTML = html || ''; }

  // ---------- picking ----------
  function ndc(e) { const r = V.canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  function groundPoint(e, z) { V.raycaster.setFromCamera(ndc(e), V.camera); const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(z || 0)); const p = new THREE.Vector3(); return V.raycaster.ray.intersectPlane(plane, p) ? p : null; }
  function pickAt(e) {
    V.raycaster.setFromCamera(ndc(e), V.camera);
    const hits = V.raycaster.intersectObjects(Array.from(inst3.values()).concat(Array.from(wire3.values())), true);
    for (const h of hits) { let o = h.object; while (o) { if (o.userData.pick) return { inst: o.userData.pick, point: h.point }; if (o.userData.pickWire) return { wire: o.userData.pickWire, point: h.point }; o = o.parent; } }
    return null;
  }
  function cellFromPoint(p) { return [Math.floor(p.x / P), Math.floor(p.y / P)]; }
  function portAt(inst, point) {
    // nearest top port of inst to the hit point (in world cells)
    const [ci, cj] = [Math.floor(point.x / P), Math.floor(point.y / P)];
    let best = null;
    for (const pn in inst.part.ports) { const q = inst.part.ports[pn]; if (!q.top) continue; const [wi, wj] = SIM.worldCell(inst, q.i, q.j); const d = Math.hypot(wi - ci, wj - cj); if (!best || d < best.d) best = { port: pn, d }; }
    return best && best.d < 1.5 ? best.port : null;
  }

  V.onDown = e => {
    if (state.step !== 2) return false;
    if (e.button !== 0) return false;
    if (placing) {
      const p = groundPoint(e, 0); if (!p) return true;
      const fp = placingFootprint(); const c = cellFromPoint(p);
      BP.pushUndo(); const inst = scene.add(placing.part, c[0] - Math.floor(fp.w / 2), c[1] - Math.floor(fp.h / 2), placing.rot); inst.meta = { id: placing.id, params: placing.params };
      const keep = placing; cancelPlace(); syncWorld(); select(inst); runIfLive();
      if (e.shiftKey) startPlace(keep.id, keep.params);
      return true;
    }
    const hit = pickAt(e);
    if (state.tool === 'wire') {
      if (hit && hit.inst) { const port = portAt(hit.inst, hit.point); if (!port) { hud('no stud there'); return true; }
        if (!wireFrom) { wireFrom = { inst: hit.inst, port }; hud('wire from <b>' + hit.inst.part.name + ' ' + port + '</b>: click the other stud'); mark(portWorld(hit.inst, port)); }
        else { if (wireFrom.inst === hit.inst && wireFrom.port === port) { wireFrom = null; clearOverlay(); hud(''); return true; }
          const a = portWorld(wireFrom.inst, wireFrom.port), b = portWorld(hit.inst, port); const d = a.distanceTo(b);
          const len = Math.max(20, Math.ceil((d + 12) / 5) * 5);
          BP.pushUndo(); const wp = partFor('wire', { shape: 'straight', len, core: state.wireCore || S.CPLA }); const w = scene.addWire(wp, wireFrom, { inst: hit.inst, port }); w.meta = { len, core: state.wireCore || S.CPLA };
          wireFrom = null; clearOverlay(); syncWorld(); runIfLive(); hud('wire ' + len + ' mm, ' + SIM.fmtR(wp.model.elements[0].R) + '. click stud to start another');
        }
      }
      return true;
    }
    if (state.tool === 'delete') { if (hit && hit.inst) { BP.pushUndo(); scene.remove(hit.inst); select(null); syncWorld(); runIfLive(); } else if (hit && hit.wire) { BP.pushUndo(); scene.wires = scene.wires.filter(w => w !== hit.wire); syncWorld(); runIfLive(); } return true; }
    if (state.tool === 'rotate') { if (hit && hit.inst) { BP.pushUndo(); scene.move(hit.inst, hit.inst.ci, hit.inst.cj, hit.inst.rot + 1); syncWorld(); runIfLive(); } return true; }
    if (hit && hit.inst) { select(hit.inst); dragging = { inst: hit.inst, z: hit.inst.z, off: null, moved: false }; const p = groundPoint(e, hit.inst.z); if (p) { const c = cellFromPoint(p); dragging.off = [hit.inst.ci - c[0], hit.inst.cj - c[1]]; } V.canvas.setPointerCapture(e.pointerId); return true; }
    if (hit && hit.wire) { select(null); return true; }
    select(null); return false;
  };
  V.onMove = e => {
    if (state.step !== 2) return false;
    if (placing) { const p = groundPoint(e, 0); if (p) { const fp = placingFootprint(); const c = cellFromPoint(p); placing.ci = c[0] - Math.floor(fp.w / 2); placing.cj = c[1] - Math.floor(fp.h / 2); let z = 0; const probe = { ci: placing.ci, cj: placing.cj, rot: placing.rot, part: placing.part }; for (const o of scene.insts) if (SIM.overlaps(probe, o)) z = Math.max(z, o.z + o.part.top); ghost.position.set((placing.ci + fp.w / 2) * P, (placing.cj + fp.h / 2) * P, z); ghost.rotation.z = placing.rot * Math.PI / 2; V.dirty = true; } return true; }
    if (dragging) { const p = groundPoint(e, dragging.z); if (p) { const c = cellFromPoint(p); const ci = c[0] + dragging.off[0], cj = c[1] + dragging.off[1]; if (ci !== dragging.inst.ci || cj !== dragging.inst.cj) { if (!dragging.moved) { BP.pushUndo(); dragging.moved = true; } scene.move(dragging.inst, ci, cj); syncWorld(); } } return true; }
    const hit = pickAt(e); hud(hit && hit.inst ? '<b>' + hit.inst.part.name + '</b> at ' + hit.inst.ci + ',' + hit.inst.cj + (hit.inst.z ? ' stacked ' + hit.inst.z.toFixed(1) + ' mm up' : '') : hit && hit.wire ? '<b>wire</b> ' + hit.wire.part.name : '');
    return false;
  };
  V.onUp = e => { if (dragging) { if (dragging.moved) runIfLive(); dragging = null; return true; } return false; };
  function placingFootprint() { const [, , w, h] = SIM.rotCell(0, 0, placing.part.cols, placing.part.rows, placing.rot); return { w, h }; }
  window.addEventListener('keydown', e => {
    if (state.step !== 2) return;
    if (e.key === 'Escape') { cancelPlace(); wireFrom = null; clearOverlay(); hud(''); }
    if ((e.key === 'r' || e.key === 'R') && placing) { placing.rot = (placing.rot + 1) & 3; V.dirty = true; }
    else if ((e.key === 'r' || e.key === 'R') && state.sel && document.activeElement === V.canvas) { BP.pushUndo(); scene.move(state.sel, state.sel.ci, state.sel.cj, state.sel.rot + 1); syncWorld(); runIfLive(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.sel && document.activeElement === V.canvas) { BP.pushUndo(); scene.remove(state.sel); select(null); syncWorld(); runIfLive(); }
  });

  // ---------- overlay: marks and net colours ----------
  function clearOverlay() { while (V.overlay.children.length) { const c = V.overlay.children[0]; if (c === ghost) { V.overlay.remove(c); continue; } V.overlay.remove(c); } if (ghost) V.overlay.add(ghost); V.dirty = true; }
  function mark(p) { const m = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.6, 24), new THREE.MeshBasicMaterial({ color: 0xa6e22e, side: THREE.DoubleSide })); m.position.copy(p).add(new THREE.Vector3(0, 0, 0.3)); V.overlay.add(m); V.dirty = true; }
  function voltColor(v, vmax) { const t = Math.min(1, Math.max(0, v / (vmax || 5))); const c = new THREE.Color(); if (v < 0.05) c.set(0x3a3a3a); else if (t < 0.7) c.setHSL(0.36 - 0.1 * t, 0.9, 0.35 + 0.2 * t); else c.set(0xffb020); return c; }
  function paintNets(res) {
    clearOverlay(); if (!res || !res.ok) return;
    for (const inst of scene.insts) for (const pn in inst.part.ports) {
      const q = inst.part.ports[pn]; if (!q.top) continue;
      const v = res.netVolt(res.node(inst, pn)); const p = portWorld(inst, pn);
      const m = new THREE.Mesh(new THREE.CircleGeometry(2.0, 16), new THREE.MeshBasicMaterial({ color: voltColor(v) })); m.position.copy(p).add(new THREE.Vector3(0, 0, 1.9)); V.overlay.add(m);
    }
    for (const l of res.readings.leds) { const inst = l.inst; const cx = ((inst.part.ports.A.i + inst.part.ports.K.i) / 2), cy = inst.part.ports.A.j; const [wi, wj] = SIM.worldCell(inst, cx, cy); const g = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfe0386, transparent: true, opacity: Math.min(0.95, 0.15 + l.mA / 6) })); g.position.set((wi + 0.5) * P, (wj + 0.5) * P, inst.z + inst.part.top + 6); V.overlay.add(g); }
    V.dirty = true;
  }

  // ---------- panels ----------
  function select(inst) { state.sel = inst; renderInstList(); renderSelected(); }
  function renderInstList() {
    const box = $('#insts'); box.innerHTML = '';
    scene.insts.forEach((inst, k) => {
      const d = document.createElement('div'); d.className = 'inst' + (inst === state.sel ? ' on' : ''); d.innerHTML = '<span class="k">' + (k + 1) + '</span><span class="t">' + inst.part.name + (inst.z ? ' (stacked)' : '') + '</span>';
      const x = document.createElement('button'); x.className = 'x'; x.textContent = 'x'; x.onclick = ev => { ev.stopPropagation(); BP.pushUndo(); scene.remove(inst); if (state.sel === inst) state.sel = null; syncWorld(); renderSelected(); runIfLive(); };
      d.appendChild(x); d.onclick = () => select(inst); box.appendChild(d);
    });
    if (scene.wires.length) { const d = document.createElement('div'); d.className = 'note'; d.textContent = scene.wires.length + ' wire' + (scene.wires.length > 1 ? 's' : '') + ' (delete tool removes one)'; box.appendChild(d); }
  }
  function renderSelected() {
    const box = $('#selPanel'); box.innerHTML = ''; const inst = state.sel;
    if (!inst) { box.innerHTML = '<div class="note">select a part in the scene</div>'; return; }
    const h = document.createElement('div'); h.className = 'kv'; h.innerHTML = '<div>part</div><b>' + inst.part.name + '</b><div>cell</div><b>' + inst.ci + ', ' + inst.cj + ' rot ' + inst.rot * 90 + '</b><div>height</div><b>' + inst.z.toFixed(1) + ' to ' + (inst.z + inst.part.top).toFixed(1) + ' mm</b>'; box.appendChild(h);
    const ctrls = (inst.part.model && inst.part.model.controls) || [];
    for (const c of ctrls) {
      const row = document.createElement('div'); row.className = 'row'; const lab = document.createElement('label'); lab.textContent = c.label; row.appendChild(lab);
      if (c.type === 'bool') { const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!inst.ctrl[c.k]; cb.onchange = () => { inst.ctrl[c.k] = cb.checked; runIfLive(); }; row.appendChild(cb); }
      else { const r = document.createElement('input'); r.type = 'range'; r.min = c.min; r.max = c.max; r.step = c.step; r.value = inst.ctrl[c.k]; const n = document.createElement('span'); n.className = 'u'; n.textContent = inst.ctrl[c.k] + (c.unit ? ' ' + c.unit : ''); r.oninput = () => { inst.ctrl[c.k] = +r.value; n.textContent = r.value + (c.unit ? ' ' + c.unit : ''); runIfLive(); }; row.appendChild(r); row.appendChild(n); }
      box.appendChild(row);
    }
    const btns = document.createElement('div'); btns.className = 'btns';
    const rb = document.createElement('button'); rb.className = 'ghost'; rb.textContent = 'rotate'; rb.onclick = () => { BP.pushUndo(); scene.move(inst, inst.ci, inst.cj, inst.rot + 1); syncWorld(); runIfLive(); renderSelected(); };
    const db = document.createElement('button'); db.className = 'ghost'; db.textContent = 'remove'; db.onclick = () => { BP.pushUndo(); scene.remove(inst); select(null); syncWorld(); runIfLive(); };
    btns.appendChild(rb); btns.appendChild(db); box.appendChild(btns);
    if (inst.part.hookup && inst.part.hookup.length) { const n = document.createElement('div'); n.className = 'note'; n.textContent = inst.part.hookup[0]; box.appendChild(n); }
  }
  const MODES = [['IN', 'input'], ['PULLUP', 'input pullup'], ['ADC', 'analog read'], ['OUT_H', 'output HIGH'], ['OUT_L', 'output LOW']];
  function renderPins(res) {
    const box = $('#pinPanel'); box.innerHTML = '';
    const seats = scene.insts.filter(i => i.part.model && i.part.model.board);
    if (!seats.length) { box.innerHTML = '<div class="note">add a SEAT to drive pins</div>'; return; }
    for (const inst of seats) {
      const bd = inst.part.model.board; const h = document.createElement('div'); h.className = 'note'; h.textContent = bd.name + ' (' + bd.vio + ' V io)'; box.appendChild(h);
      scene.pinModes[inst.uid] = scene.pinModes[inst.uid] || {};
      for (const pn of bd.pins) {
        const row = document.createElement('div'); row.className = 'pinrow';
        const lab = document.createElement('span'); lab.textContent = pn; row.appendChild(lab);
        const rd = res && res.ok ? res.readings.pins.find(p => p.inst === inst && p.pin === pn) : null;
        if (bd.rails[pn] !== undefined) { const s = document.createElement('span'); s.textContent = 'rail ' + bd.rails[pn] + ' V'; s.style.fontSize = '10px'; s.style.color = 'var(--ink3)'; row.appendChild(s); }
        else { const sel = document.createElement('select'); for (const [v, t] of MODES) { const o = document.createElement('option'); o.value = v; o.textContent = t; if ((scene.pinModes[inst.uid][pn] || 'IN') === v) o.selected = true; sel.appendChild(o); } sel.onchange = () => { scene.pinModes[inst.uid][pn] = sel.value; runIfLive(); }; row.appendChild(sel); }
        const v = document.createElement('span'); v.className = 'v';
        if (rd) { const mode = rd.mode; if (mode === 'ADC') v.textContent = rd.adc + ' (' + rd.v.toFixed(2) + ' V)'; else if (mode === 'IN' || mode === 'PULLUP') { v.textContent = rd.digital + ' ' + rd.v.toFixed(2) + ' V'; v.classList.add(rd.digital === 'HIGH' ? 'hi' : 'lo'); } else v.textContent = rd.v.toFixed(2) + ' V'; }
        else v.textContent = '-';
        if (bd.rails[pn] !== undefined && rd) v.textContent = rd.v.toFixed(2) + ' V';
        row.appendChild(v); box.appendChild(row);
      }
    }
  }
  function renderResult(res) {
    const box = $('#result'); box.innerHTML = '';
    if (!res) { box.innerHTML = '<div class="note">run to see voltages</div>'; return; }
    if (!res.ok) { box.innerHTML = '<div class="warns"><div>' + res.reason + '</div></div>'; return; }
    const kv = document.createElement('div'); kv.className = 'kv';
    const add = (k, v) => { const a = document.createElement('div'); a.textContent = k; const b = document.createElement('b'); b.textContent = v; kv.appendChild(a); kv.appendChild(b); };
    add('contacts', res.contacts.length + ' stud to socket');
    add('wires', scene.wires.length + '');
    for (const l of res.readings.leds) add('LED ' + l.inst.part.name, l.mA < 0.01 ? 'off' : l.mA.toFixed(2) + ' mA' + (l.mA < 0.5 ? ' (faint)' : l.mA < 2 ? ' (dim)' : ''));
    for (const e of res.readings.elements) add(e.label, e.value);
    for (const t of res.readings.touch) add('touch ' + t.inst.part.name, t.touched ? 'finger on' : 'idle');
    box.appendChild(kv);
    // per net list with voltages (dedupe by root)
    const seen = new Map();
    for (const inst of scene.insts) for (const pn in inst.part.ports) { const root = res.find(res.node(inst, pn)); if (!seen.has(root)) seen.set(root, { v: res.netVolt(res.node(inst, pn)), members: [] }); seen.get(root).members.push(inst.part.name.split(' ')[0] + '.' + pn); }
    const nets = Array.from(seen.values()).filter(n => n.members.length > 1).sort((a, b) => b.v - a.v);
    if (nets.length) { const d = document.createElement('details'); d.className = 'fold'; d.innerHTML = '<summary>' + nets.length + ' joined nets</summary>'; const l = document.createElement('div'); l.className = 'kv'; for (const n of nets) { const a = document.createElement('div'); a.textContent = n.v.toFixed(2) + ' V'; const b = document.createElement('b'); b.textContent = n.members.join(' = '); l.appendChild(a); l.appendChild(b); } d.appendChild(l); box.appendChild(d); }
    const hints = [];
    const sups = scene.insts.filter(i => i.part.virtual), seats = scene.insts.filter(i => i.part.model && i.part.model.board);
    if (sups.length && seats.length) hints.push('the SUPPLY brick has its own ground. wire its GND to the board GND if they should share one.');
    for (const p of res.readings.pins) if ((p.mode === 'IN' || p.mode === 'PULLUP') && p.v > 0.3 * p.inst.part.model.board.vio && p.v < 0.7 * p.inst.part.model.board.vio) hints.push(p.pin + ' sits at ' + p.v.toFixed(2) + ' V, in the undefined band: printed paths are kilohm class, so read it with ADC and a threshold, or use a stiffer external pullup.');
    if (hints.length) { const w = document.createElement('div'); w.className = 'warns'; for (const h of hints) { const d = document.createElement('div'); d.textContent = h; w.appendChild(d); } box.appendChild(w); }
  }
  let runTimer = null;
  function runIfLive() { clearTimeout(runTimer); runTimer = setTimeout(run, 60); }
  function run() {
    const t0 = performance.now(); let res = null;
    try { res = scene.solve(); } catch (e) { console.error(e); res = { ok: false, reason: 'solver error: ' + e.message, readings: { pins: [], leds: [], touch: [], elements: [] } }; }
    state.result = res; paintNets(res); renderPins(res); renderResult(res);
    $('#sMs').textContent = Math.round(performance.now() - t0) + ' ms solve';
    $('#sDims').textContent = scene.insts.length + ' parts, ' + scene.wires.length + ' wires';
    $('#sTris').textContent = res.ok ? res.contacts.length + ' contacts' : '-';
    BP.setStatus(res.ok ? { ok: 'circuit solved' } : { warn: res.reason });
    return res;
  }
  function setTool(t) { state.tool = t; document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); if (t !== 'wire') { wireFrom = null; clearOverlay(); } if (t === 'wire') hud('wire tool: click a stud, then another. wires are conductive PLA core unless you change it in the part step'); else if (!placing) hud(''); }
  document.querySelectorAll('#tools button').forEach(b => b.onclick = () => { if (b.dataset.tool === 'run') { run(); return; } cancelPlace(); setTool(b.dataset.tool); });
  $('#bRun').onclick = run;
  $('#bClear').onclick = () => { BP.pushUndo(); scene.insts = []; scene.wires = []; select(null); syncWorld(); run(); };

  // ---------- serialise ----------
  function toJson() { return { insts: scene.insts.map(i => ({ uid: i.uid, id: i.meta ? i.meta.id : i.part.id, params: i.meta ? i.meta.params : {}, ci: i.ci, cj: i.cj, rot: i.rot, ctrl: i.ctrl })), wires: scene.wires.map(w => ({ len: w.meta.len, core: w.meta.core, a: [w.a.inst.uid, w.a.port], b: [w.b.inst.uid, w.b.port] })), pinModes: scene.pinModes }; }
  function fromJson(j) {
    scene.insts = []; scene.wires = []; scene.pinModes = {}; state.sel = null; if (!j) { syncWorld(); return; }
    const byUid = {};
    for (const r of j.insts || []) { const part = partFor(r.id, r.params); const inst = scene.add(part, r.ci, r.cj, r.rot); inst.meta = { id: r.id, params: r.params }; Object.assign(inst.ctrl, r.ctrl || {}); byUid[r.uid] = inst; if (j.pinModes && j.pinModes[r.uid]) scene.pinModes[inst.uid] = j.pinModes[r.uid]; }
    for (const w of j.wires || []) { const a = byUid[w.a[0]], b = byUid[w.b[0]]; if (!a || !b) continue; const wp = partFor('wire', { shape: 'straight', len: w.len, core: w.core }); const ww = scene.addWire(wp, { inst: a, port: w.a[1] }, { inst: b, port: w.b[1] }); ww.meta = { len: w.len, core: w.core }; }
    syncWorld(); if (state.step === 2) run();
  }
  function example() {
    fromJson(null);
    const add = (id, params, ci, cj, rot) => { const inst = scene.add(partFor(id, params), ci, cj, rot || 0); inst.meta = { id, params }; return inst; };
    const plate = add('plate', { cols: 10, rows: 8, nets: [[[5, 5], [9, 7]], [[0, 0], [9, 0]]] }, 0, 0); // net 1 carries the seat GND stud to the lamp cathode through the plate
    const seat = add('seat', { board: 'c3mini', mount: 'press' }, 2, 1);
    const btn = add('button', {}, 0, 5); const lamp = add('lamp', {}, 7, 7); const res = add('resistor', {}, 4, 6);
    const touch = add('touch', {}, 0, 2);
    const wire = (a, pa, b, pb, len) => { const wp = partFor('wire', { shape: 'straight', len, core: S.CPLA }); const w = scene.addWire(wp, { inst: a, port: pa }, { inst: b, port: pb }); w.meta = { len, core: S.CPLA }; };
    scene.pinModes[seat.uid] = { IO2: 'ADC', IO3: 'OUT_H', IO4: 'ADC' };
    wire(seat, 'IO2', btn, 'A', 40); wire(seat, 'GND', btn, 'B', 40);
    wire(seat, 'IO3', res, 'A', 40); wire(res, 'B', lamp, 'A', 30); // lamp K reaches GND through the plate net, no wire
    wire(seat, 'IO4', touch, 'PAD', 40);
    btn.ctrl.pressed = true; touch.ctrl.touched = false;
    syncWorld(); showScene(); run();
  }
  window.BENCH_SCENE = { scene, partFor, syncWorld, showScene, hideScene, refreshPalette, run, toJson, fromJson, example, select, setTool, cancelPlace, startPlace };
})();
