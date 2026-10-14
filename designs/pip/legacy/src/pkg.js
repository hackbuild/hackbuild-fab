/* pkg.js: the Orca3MF config for a built PIP, plus the print card extras. Plain script. */
(function (G) {
  'use strict';
  const H = G.PIP = G.PIP || {};
  function config(P, M, title) {
    const objects = M.objects.map(o => ({
      name: o.name,
      positions: [o.place],
      parts: o.print.map(p => ({ name: o.name + '-' + p.name, slot: p.slot, positions: p.mesh.positions, indices: p.mesh.indices }))
    }));
    const pr = P.print;
    return {
      filaments: P.slots.map(s => ({ color: s.color, type: s.type, name: s.name })),
      printer: pr.printer ? { printer_settings_id: pr.printer, print_settings_id: pr.process } : '',
      presetPattern: pr.pattern,
      writeFilaments: pr.writeFilaments,
      layerHeight: P.stack.layer,
      title: title || 'pip',
      objects
    };
  }
  H.PKG = { config };
})(typeof globalThis !== 'undefined' ? globalThis : this);
