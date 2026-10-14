/* BOSS.bench app part 3: MATERIALS and PRINT steps, navigation, persistence, boot. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const BP = window.BENCH_PART, BS = window.BENCH_SCENE, V = BP.V, state = BP.state, B = BOSS, S = B.S;

  // ---------- materials ----------
  function buildMats() {
    const box = $('#mats'); box.innerHTML = '';
    B.SLOTS.forEach((s, k) => {
      const row = document.createElement('div'); row.className = 'mat';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = s.id; row.appendChild(n);
      const col = document.createElement('input'); col.type = 'color'; col.value = s.color; col.onchange = () => { BP.pushUndo(); s.color = col.value; BP.legend(); BP.scheduleBuild(true); }; row.appendChild(col);
      const name = document.createElement('input'); name.type = 'text'; name.value = s.name; name.onchange = () => { BP.pushUndo(); s.name = name.value; BP.legend(); }; row.appendChild(name);
      const role = document.createElement('span'); role.className = 'role'; role.textContent = s.role; row.appendChild(role);
      box.appendChild(row);
      if (s.rho) {
        const r = document.createElement('div'); r.className = 'row'; const lab = document.createElement('label'); lab.textContent = 'resistivity'; r.appendChild(lab);
        const inp = document.createElement('input'); inp.type = 'number'; inp.min = 1; inp.max = 100000; inp.step = 1; inp.value = s.rho; inp.onchange = () => { BP.pushUndo(); s.rho = +inp.value; BP.scheduleBuild(true); }; r.appendChild(inp);
        const u = document.createElement('span'); u.className = 'u'; u.textContent = 'ohm cm'; r.appendChild(u); box.appendChild(r);
      }
    });
    const note = document.createElement('div'); note.className = 'note'; note.textContent = 'resistivity feeds every readout and the simulator. Protopasta conductive PLA measures about 30 ohm cm along the print, Eel conductive TPU about 1500. Measure yours with two probes on a printed bar and type it in.'; box.appendChild(note);
  }

  // ---------- print ----------
  function printParts() {
    if (state.printWhat === 'part') { const p = BP.currentPart; return p ? [p] : []; }
    const out = []; const sc = BS.scene;
    for (const inst of sc.insts) if (!inst.part.virtual) out.push(inst.part);
    for (const w of sc.wires) out.push(w.part);
    return out;
  }
  function refreshPrintList() {
    const list = $('#printList'); list.innerHTML = '';
    const parts = printParts(); const counts = new Map();
    for (const p of parts) counts.set(p, (counts.get(p) || 0) + 1);
    for (const [p, n] of counts) { const a = document.createElement('div'); a.textContent = n + ' x'; const b = document.createElement('b'); b.textContent = p.name; list.appendChild(a); list.appendChild(b); }
    if (!parts.length) { const d = document.createElement('div'); d.className = 'note'; d.textContent = state.printWhat === 'scene' ? 'the scene is empty' : 'build a part first'; list.appendChild(d); $('#exportNote').textContent = ''; return; }
    try { const pk = EXPORT.packageFor(parts, { title: 'boss' }); const objs = pk.scene.objects; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const o of objs) { x0 = Math.min(x0, o.x0); y0 = Math.min(y0, o.y0); x1 = Math.max(x1, o.x1); y1 = Math.max(y1, o.y1); }
      $('#exportNote').textContent = objs.length + ' objects on the plate, ' + (x1 - x0).toFixed(0) + ' x ' + (y1 - y0).toFixed(0) + ' mm of 256. ' + (pk.scene.errors.length ? pk.scene.errors.join(' ') : 'fits the bed.');
      if (state.step === 3) showPlate(pk);
    } catch (e) { console.error(e); $('#exportNote').textContent = 'layout failed: ' + e.message; }
  }
  function showPlate(pk) {
    while (V.root.children.length) V.root.remove(V.root.children[0]);
    const box = new THREE.Box3();
    for (const o of pk.scene.objects) { const g = BP.groupFor({ meshes: o.meshes }, false); g.position.set(o.px, o.py, 0); V.root.add(g); box.expandByObject(g); }
    const bed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(256, 256)), new THREE.LineBasicMaterial({ color: 0xfe0386 })); bed.position.set(128, 128, 0); V.root.add(bed);
    box.expandByObject(bed);
    V.root.visible = true; BS.hideScene(); BP.fitTo(box); V.sph.phi = 0.6; V.dirty = true;
  }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  function ensureMesh() { if (BP.ui.dirty) BP.doBuild(); }
  function baseName() { const parts = printParts(); if (state.printWhat === 'scene') return 'boss-scene'; const p = parts[0]; return p ? 'boss-' + p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') : 'boss'; }
  async function export3mf() { ensureMesh(); const parts = printParts(); if (!parts.length) return; const r = await EXPORT.threeMF(parts, { title: baseName(), sceneJson: state.printWhat === 'scene' ? BS.toJson() : null }); download(baseName() + '.3mf', r.bytes); if (r.errors.length) BP.setStatus({ warn: r.errors.join(' ') }); }
  async function exportStl() { ensureMesh(); const parts = printParts(); if (!parts.length) return; const z = await EXPORT.stlZip(parts, { title: baseName() }); download(baseName() + '-stl.zip', z); }
  function exportCard() { ensureMesh(); const parts = printParts(); if (!parts.length) return; const pk = EXPORT.packageFor(parts, { title: baseName() }); download(baseName() + '-print-card.txt', new Blob([pk.card], { type: 'text/plain' })); }
  function exportJson() { ensureMesh(); const parts = printParts(); const pk = EXPORT.designJson(parts, { scene: BS.toJson(), bench: { part: state.part } }); download(baseName() + '-design.json', new Blob([JSON.stringify(pk, null, 2)], { type: 'application/json' })); }
  $('#b3mf').onclick = () => export3mf().catch(e => { console.error(e); BP.setStatus({ err: '3mf failed: ' + e.message }); });
  $('#bStl').onclick = () => exportStl().catch(e => { console.error(e); BP.setStatus({ err: 'stl failed: ' + e.message }); });
  $('#bCard').onclick = exportCard; $('#bJson').onclick = exportJson;
  document.querySelectorAll('#printWhat .chip').forEach(c => c.onclick = () => { document.querySelectorAll('#printWhat .chip').forEach(x => x.classList.toggle('on', x === c)); state.printWhat = c.dataset.what; refreshPrintList(); });
  window.BENCH_PRINT = { refresh: refreshPrintList, printParts, baseName };

  // ---------- steps ----------
  const GUIDES = [['STEP 1 PART', 'pick a part from the catalog and set its parameters. every number is checked against the printer and the electrics before it reaches the stage.'],
    ['STEP 2 MATERIALS', 'four filaments, one job each. type in the resistivity you measured and every readout and the simulator follow.'],
    ['STEP 3 BUILD', 'drop parts on the grid, stack them, run wires between studs, set the board pins and run. nets form by contact only.'],
    ['STEP 4 PRINT', 'export the part, or the whole scene laid out on one plate. filaments are assigned in the 3MF; the STL zip is the fallback.']];
  const visited = new Set([0]);
  function goStep(n) {
    state.step = n; visited.add(n);
    document.querySelectorAll('#steps button').forEach(b => { const k = +b.dataset.step; b.classList.toggle('on', k === n); b.classList.toggle('done', visited.has(k) && k !== n); });
    document.querySelectorAll('.pane').forEach((p, k) => p.classList.toggle('on', k === n));
    $('#guide').innerHTML = '<b>' + GUIDES[n][0] + '</b><span id="guideText">' + GUIDES[n][1] + '</span>';
    if (n === 2) { BS.showScene(); BS.run(); }
    else { BS.hideScene(); if (n === 3) refreshPrintList(); if (n === 3 && state.printWhat === 'part' || n < 2) { if (BP.currentPart) BP.showPart(BP.currentPart, state.xray); } }
    V.dirty = true;
  }
  document.querySelectorAll('#steps button').forEach(b => b.onclick = () => goStep(+b.dataset.step));
  $('#next0').onclick = () => goStep(1); $('#next1').onclick = () => goStep(2); $('#next2').onclick = () => goStep(3);
  document.querySelectorAll('#cams button').forEach(b => b.onclick = () => {
    if (b.dataset.cam === 'xray') { state.xray = !state.xray; b.classList.toggle('on', state.xray); if (state.step !== 2 && BP.currentPart) BP.showPart(BP.currentPart, state.xray); return; }
    document.querySelectorAll('#cams button').forEach(x => { if (x.dataset.cam !== 'xray') x.classList.toggle('on', x === b); }); BP.camPreset(b.dataset.cam);
  });

  // ---------- undo / redo / open / save ----------
  function undo() { if (!BP.ui.undo.length) return; BP.ui.redo.push(BP.snapshot()); BP.restore(BP.ui.undo.pop()); }
  function redo() { if (!BP.ui.redo.length) return; BP.ui.undo.push(BP.snapshot()); BP.restore(BP.ui.redo.pop()); }
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
  window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); } });
  $('#bSave').onclick = () => { const s = { tool: 'BOSS.bench', version: 1, part: state.part, scene: BS.toJson(), slots: B.SLOTS }; download('boss-bench.json', new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })); };
  $('#bOpen').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = () => { const f = i.files[0]; if (!f) return; f.text().then(t => { const d = JSON.parse(t); if (d.slots) d.slots.forEach((s, k) => Object.assign(B.SLOTS[k], s)); BP.pushUndo(); BP.restore(JSON.stringify({ part: d.part, scene: d.scene })); buildMats(); BP.legend(); }); }; i.click(); };
  $('#bGuide').onclick = () => $('#welcome').classList.remove('hide');
  $('#wBlank').onclick = () => { $('#welcome').classList.add('hide'); };
  $('#wExample').onclick = () => { $('#welcome').classList.add('hide'); BP.pushUndo(); BS.example(); goStep(2); };

  // ---------- boot ----------
  BP.initViewer(); BP.legend(); buildMats(); BP.buildGallery(); BP.buildParams(); BP.doBuild(); BS.refreshPalette(); BS.syncWorld();
  // test hook: exportBytes('3mf' | 'stl' | 'card' | 'json') resolves to a Uint8Array of the current print selection
  window.BENCH = {
    state, scene: BS.scene, goStep, run: BS.run, example: () => { BS.example(); goStep(2); }, setPart: (id, params) => { state.part = { id, params: params || {} }; BP.buildGallery(); BP.buildParams(); BP.doBuild(); },
    exportBytes: async kind => {
      ensureMesh(); const parts = printParts();
      if (kind === '3mf') { const r = await EXPORT.threeMF(parts, { title: baseName() }); return new Uint8Array(await r.bytes.arrayBuffer()); }
      if (kind === 'stl') { const z = await EXPORT.stlZip(parts, { title: baseName() }); return new Uint8Array(await z.arrayBuffer()); }
      if (kind === 'card') return new TextEncoder().encode(EXPORT.packageFor(parts, { title: baseName() }).card);
      return new TextEncoder().encode(JSON.stringify(EXPORT.designJson(parts, { scene: BS.toJson() })));
    },
    ready: () => !BP.ui.dirty && !BP.ui.building
  };
})();
