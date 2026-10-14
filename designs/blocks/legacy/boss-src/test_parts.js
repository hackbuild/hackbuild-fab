globalThis.earcut = require('earcut'); globalThis.polygonClipping = require('polygon-clipping');
require('./src/kernel.js'); require('./src/boss.js'); require('./src/parts.js');
const PARTS = globalThis.PARTS;
const only = process.argv[2];
for (const c of PARTS.CATALOG) {
  if (only && c.id !== only) continue;
  const t0 = Date.now();
  let variants = [{}];
  if (c.id === 'seat') variants = [{board:'c3mini',mount:'press'},{board:'c3mini',mount:'snap'},{board:'teensy40',mount:'press'},{board:'pico',mount:'snap'}];
  if (c.id === 'plate') variants = [{cols:6,rows:6,nets:[[[0,0],[5,5]],[[1,0],[4,3],[2,5]]]}];
  if (c.id === 'wire') variants = [{shape:'straight'},{shape:'spiral',len:200},{shape:'zigzag',endA:'bare'},{shape:'arc'},{shape:'s', core:2}];
  if (c.id === 'jumper') variants = [{n:2},{n:4,bus:true}];
  for (const v of variants) {
    try {
      const p = PARTS.make(c.id, v);
      const ms = p.objects.flatMap(o=>o.meshes);
      console.log(c.id, JSON.stringify(v), '->', p.name, '| tris', p.tris, '| ', (Date.now()-t0)+'ms', '| warn', p.warnings.length ? p.warnings : 'none');
      for (const m of ms) { const a=m.audit(); if(!a.ok) console.log('   BAD', m.name, a); }
      if (p.fits) for (const f of p.fits) if(!f.ok) console.log('   FIT', f.label, f.value, f.lo, f.hi);
      if (p.net) console.log('   nets', JSON.stringify(p.net.groups).slice(0,300));
      console.log('   readout', p.readout.map(r=>r.join(': ')).join(' | '));
    } catch (e) { console.log(c.id, JSON.stringify(v), 'THREW', e.stack.split('\n').slice(0,4).join(' / ')); }
  }
}
