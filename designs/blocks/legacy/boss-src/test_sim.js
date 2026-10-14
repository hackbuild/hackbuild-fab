globalThis.earcut = require('earcut'); globalThis.polygonClipping = require('polygon-clipping');
require('./src/kernel.js'); require('./src/boss.js'); require('./src/parts.js'); require('./src/sim.js');
const PARTS=globalThis.PARTS, SIM=globalThis.SIM;
const sc = new SIM.Scene();
const plate = PARTS.make('plate',{cols:8,rows:8,nets:[[[0,0],[7,0]],[[0,7],[7,7]]]});
const seat = PARTS.make('seat',{board:'c3mini',mount:'press'});
const lamp = PARTS.make('lamp',{}); const btn = PARTS.make('button',{}); const jumper = PARTS.make('jumper',{n:3,bus:true});
const pl = sc.add(plate, 0, 0, 0);
const st = sc.add(seat, 1, 1, 0);
console.log('seat z', st.z, 'ports', Object.keys(seat.ports).slice(0,6), seat.ports['GND'], seat.ports['5V']);
// put the supply on the plate corners? Use the seat: GND at its port; jumper on the seat's GND stud to the lamp
const sup = sc.add(SIM.SUPPLY, 0, 0, 0); // sits on plate cells (0,0),(1,0): plate net 1 has (0,0) and (7,0)
const l = sc.add(lamp, 0, 6, 0);
console.log('lamp z', l.z, 'lamp ports', lamp.ports);
const r = sc.solve(); console.log('ok', r.ok, r.reason||'', 'contacts', r.contacts.length, 'leds', r.readings.leds.map(x=>x.mA.toFixed(2)+' mA'));
// wire from supply V+ to lamp A and supply GND to lamp K
const w1 = PARTS.make('wire',{shape:'straight',len:60,core:2}), w2 = PARTS.make('wire',{shape:'straight',len:60,core:2});
sc.addWire(w1, {inst:sup, port:'V+'}, {inst:l, port:'A'}); sc.addWire(w2, {inst:sup, port:'GND'}, {inst:l, port:'K'});
const r2 = sc.solve(); console.log('with wires: leds', r2.readings.leds.map(x=>x.mA.toFixed(3)+' mA at '+x.v.toFixed(2)+' V'), 'volts V+', r2.netVolt(r2.node(sup,'V+')).toFixed(2), 'lampA', r2.netVolt(r2.node(l,'A')).toFixed(2));
// button between: seat on plate, pin mode
sc.pinModes[st.uid] = { IO2: 'PULLUP' };
const b = sc.add(btn, 5, 5, 0); const w3 = PARTS.make('wire',{shape:'s',len:80,core:2}); const w4 = PARTS.make('wire',{shape:'s',len:80,core:2});
sc.addWire(w3, {inst:st, port:'IO2'}, {inst:b, port:'A'}); sc.addWire(w4, {inst:st, port:'GND'}, {inst:b, port:'B'});
let r3 = sc.solve(); let pin = r3.readings.pins.find(p=>p.pin==='IO2'); console.log('IO2 released', pin.v.toFixed(2), pin.digital);
b.ctrl.pressed = true; r3 = sc.solve(); pin = r3.readings.pins.find(p=>p.pin==='IO2'); console.log('IO2 pressed', pin.v.toFixed(2), pin.digital);
