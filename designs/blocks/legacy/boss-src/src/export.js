/* BOSS export: turns a built part (or a scene of parts) into the print package.
 * Uses Orca3MF from print-forge verbatim for the 3MF dialect; nothing here writes project settings.
 * Every object is placed on the 256 bed; print poses (flip, offsets) from the generators are applied here. */
(function (root) {
  'use strict';
  const K = root.K, B = root.BOSS;
  const BED = 256;

  function filaments() {
    return B.SLOTS.map(s => ({ color: s.color, type: s.type, name: s.name }));
  }

  // one part -> list of placed objects {name, meshes(typed, in bed coords), footprint}
  function placeObjects(part, at) {
    const out = [];
    let cursorX = at[0], cursorY = at[1];
    // first object at the anchor, extras beside it per their pose or to the +x
    let maxW = 0;
    for (let oi = 0; oi < part.objects.length; oi++) {
      const o = part.objects[oi];
      const pose = o.pose || {};
      const metas = o.meshes.map(m => m.clone());
      if (pose.flip) for (const m of metas) m.flipZ(pose.h || 0);
      // bounds of the object in its own frame
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity, bz0 = Infinity;
      for (const m of metas) { const b = m.bounds(); bx0 = Math.min(bx0, b[0]); by0 = Math.min(by0, b[1]); bx1 = Math.max(bx1, b[3]); by1 = Math.max(by1, b[4]); bz0 = Math.min(bz0, b[2]); }
      const w = bx1 - bx0, h = by1 - by0;
      let px, py;
      if (oi === 0) { px = cursorX - (bx0 + bx1) / 2; py = cursorY - (by0 + by1) / 2; maxW = w; }
      else if (pose.dx !== undefined || pose.dy !== undefined) { px = cursorX - (bx0 + bx1) / 2 + (pose.dx || 0); py = cursorY - (by0 + by1) / 2 + (pose.dy || 0); }
      else { px = cursorX + maxW / 2 + 6 + w / 2 - (bx0 + bx1) / 2; py = cursorY - (by0 + by1) / 2; }
      for (const m of metas) m.translate(0, 0, -bz0); // z only: the bed offset travels as the build item transform, so vertex coordinates stay small and exact
      out.push({ name: part.name + ' ' + o.name, meshes: metas, px, py, x0: bx0 + px, y0: by0 + py, x1: bx1 + px, y1: by1 + py });
    }
    return out;
  }

  // lay several parts out on the bed in rows
  function layoutScene(parts) {
    const placed = [];
    const gap = 8;
    // measure each part's total footprint first (objects laid at origin)
    const sizes = parts.map(p => { const objs = placeObjects(p, [0, 0]); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const o of objs) { x0 = Math.min(x0, o.x0); y0 = Math.min(y0, o.y0); x1 = Math.max(x1, o.x1); y1 = Math.max(y1, o.y1); } return { w: x1 - x0, h: y1 - y0, x0, y0 }; });
    let cx = gap, cy = gap, rowH = 0;
    const errs = [];
    parts.forEach((p, i) => {
      const s = sizes[i];
      if (cx + s.w > BED - gap && cx > gap) { cx = gap; cy += rowH + gap; rowH = 0; }
      const objs = placeObjects(p, [cx - s.x0 + s.w / 2 - s.w / 2 + (0 - s.x0) - (0 - s.x0), cy - s.y0 + s.h / 2 - s.h / 2]);
      // simpler: shift so the part's min corner lands on (cx, cy)
      const dx = cx - Math.min(...objs.map(o => o.x0)), dy = cy - Math.min(...objs.map(o => o.y0));
      for (const o of objs) { o.px += dx; o.py += dy; o.x0 += dx; o.x1 += dx; o.y0 += dy; o.y1 += dy; placed.push(o); }
      if (cy + s.h > BED - gap) errs.push(p.name + ' does not fit on the bed with the rest');
      cx += s.w + gap; rowH = Math.max(rowH, s.h);
    });
    return { objects: placed, errors: errs };
  }

  function orcaObjects(placed) {
    return placed.map(o => ({ name: o.name, positions: [[o.px, o.py, 0]], parts: o.meshes.map(m => { const t = m.typed(); return { name: m.name, slot: m.slot, positions: t.positions, indices: t.indices }; }) }));
  }

  function designJson(parts, extra) {
    return Object.assign({ tool: 'BOSS.bench', version: 1, standard: B.STD, slots: B.SLOTS, date: new Date().toISOString().slice(0, 10),
      parts: parts.map(p => ({ id: p.id, name: p.name, params: p.params, cols: p.cols, rows: p.rows, readout: p.readout, warnings: p.warnings, fits: (p.fits || []).map(f => ({ label: f.label, value: f.value, ok: f.ok })), bom: p.bom, hookup: p.hookup })) }, extra || {});
  }

  function printCardText(parts, cfg) {
    const L = [root.Orca3MF.printCard(cfg)];
    L.push('BOSS: what is in this package', '========================================');
    for (const p of parts) {
      L.push('', p.name);
      for (const r of p.readout || []) L.push('  ' + r[0] + ': ' + r[1]);
      for (const h of p.hookup || []) L.push('  hookup: ' + h);
      for (const b of p.bom || []) L.push('  needs: ' + b);
      for (const w of p.warnings || []) L.push('  WARN: ' + w);
    }
    L.push('', 'materials', '  slot 1 PETG structure, slot 2 conductive PLA (Protopasta class, 30 ohm cm), slot 3 TPU 95A, slot 4 conductive TPU (Eel class, 1500 ohm cm)',
      '  socket rings and wire cores are conductive TPU: they flex over a stud. Posts, flanges, traces and studs are conductive PLA.',
      '  printed conductors are kilohm class. Fine for GPIO, touch, ADC dividers. Not for motors, not for LED strips.',
      'print', '  0.24 layers, 0.4 nozzle, no supports, everything lays flat. Prime tower on. Purge volumes at least 70 mm3 into cTPU (it contaminates).',
      '  if the filament list imports as one entry, use the per colour STL zip: open all STLs at once, load as one object with parts, assign the filaments.');
    return L.join('\n') + '\n';
  }

  function packageFor(parts, opts) {
    opts = opts || {};
    const scene = layoutScene(parts);
    const cfg = { filaments: filaments(), printer: root.Orca3MF.DEFAULT_PRINTER, layerHeight: 0.24, title: opts.title || parts.map(p => p.name).join(' + '), objects: orcaObjects(scene.objects) };
    const pkg = root.Orca3MF.build(cfg);
    return { pkg, cfg, scene, card: printCardText(parts, cfg), design: designJson(parts, { scene: opts.sceneJson || null }) };
  }

  async function stlZip(parts, opts, JSZipCtor) {
    const JZ = JSZipCtor || root.JSZip;
    const P = packageFor(parts, opts);
    const z = new JZ();
    for (const o of P.cfg.objects) for (const part of o.parts) {
      const fn = (o.name + '_' + part.name).replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '_slot' + part.slot + '.stl';
      z.file(fn, root.Orca3MF.stl(part, part.name));
    }
    z.file('print-card.txt', P.card);
    z.file('design.json', JSON.stringify(P.design, null, 2));
    return z.generateAsync({ type: (typeof window === 'undefined') ? 'uint8array' : 'blob', compression: 'DEFLATE' });
  }

  async function threeMF(parts, opts, JSZipCtor) {
    const P = packageFor(parts, opts);
    const bytes = await P.pkg.zip(JSZipCtor, (typeof window === 'undefined') ? 'uint8array' : 'blob');
    return { bytes, card: P.card, design: P.design, errors: P.scene.errors };
  }

  root.EXPORT = { filaments, placeObjects, layoutScene, packageFor, stlZip, threeMF, printCardText, designJson, BED };
})(typeof globalThis !== 'undefined' ? globalThis : this);
