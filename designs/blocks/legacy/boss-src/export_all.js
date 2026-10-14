globalThis.earcut = require('earcut'); globalThis.polygonClipping = require('polygon-clipping'); globalThis.JSZip = require('jszip');
require('/mnt/skills/plugins/print-forge/assets/orca3mf.js');
require('./src/kernel.js'); require('./src/boss.js'); require('./src/parts.js'); require('./src/export.js');
const fs=require('fs'); const PARTS=globalThis.PARTS, EXPORT=globalThis.EXPORT;
const list = JSON.parse(process.argv[2] || '[]');
(async () => {
  for (const [fn, id, v] of list) {
    const p = PARTS.make(id, v);
    const r = await EXPORT.threeMF([p], {title: fn}, globalThis.JSZip);
    fs.writeFileSync('out/'+fn+'.3mf', Buffer.from(r.bytes));
    const z = await EXPORT.stlZip([p], {title: fn}, globalThis.JSZip);
    fs.writeFileSync('out/'+fn+'-stl.zip', Buffer.from(z));
    fs.writeFileSync('out/'+fn+'-print-card.txt', r.card);
    console.log(fn, p.name, p.tris, 'tris', r.errors.length? r.errors : '', p.warnings.filter(w=>!w.startsWith('note')).length ? p.warnings : '');
  }
})();
