globalThis.earcut = require('earcut'); globalThis.polygonClipping = require('polygon-clipping');
require('./src/kernel.js'); require('./src/boss.js'); require('./src/parts.js');
const PARTS = globalThis.PARTS;
const cases = [
 ['seat',{board:'pico',mount:'press'}], ['seat',{board:'teensy40',mount:'snap',hinge:'hooks'}], ['seat',{board:'custom',mount:'press'}], ['seat',{board:'c3mini',mount:'snap',hinge:'hooks'}],
 ['seat',{board:'pico',mount:'press',pins:'all'}],
 ['plate',{cols:8,rows:8,nets:[]}], ['plate',{cols:4,rows:4,nets:[[[0,0],[3,3]],[[3,0],[0,3]]]}],
 ['wire',{shape:'spiral',len:400}], ['wire',{shape:'straight',len:20,endA:'bare',endB:'bare'}], ['wire',{shape:'zigzag',len:150,core:2}],
 ['jumper',{n:1}], ['jumper',{n:6,bus:true}], ['lamp',{led:3}], ['resistor',{legs:8}], ['button',{}], ['force',{}], ['slider',{trackW:5}], ['touch',{}],
];
for (const [id,v] of cases) {
  const t0=Date.now();
  try { const p = PARTS.make(id, v); const bad = p.objects.flatMap(o=>o.meshes).map(m=>[m.name,m.audit()]).filter(x=>!x[1].ok);
    console.log(id, JSON.stringify(v), '->', p.name, p.tris, (Date.now()-t0)+'ms', 'warn', p.warnings.length?p.warnings:'none', bad.length?('BAD '+bad.map(b=>b[0]+':'+b[1].bad)):'', (p.fits||[]).filter(f=>!f.ok).map(f=>'FIT '+f.label+' '+f.value).join(' '));
  } catch(e) { console.log(id, JSON.stringify(v), 'THREW', e.stack.split('\n').slice(0,3).join(' / ')); }
}
