globalThis.earcut = require('earcut'); globalThis.polygonClipping = require('polygon-clipping');
require('./src/kernel.js'); require('./src/boss.js'); require('./src/parts.js'); require('./src/sim.js');
const PARTS=globalThis.PARTS, SIM=globalThis.SIM;
const sc = new SIM.Scene();
const seat = PARTS.make('seat',{board:'c3mini',mount:'press'}); const lamp = PARTS.make('lamp',{}); const btn = PARTS.make('button',{});
const st = sc.add(seat, 1, 1, 0); sc.pinModes[st.uid] = { IO2: 'PULLUP', IO3: 'OUT_H' };
const b = sc.add(btn, 12, 12, 0);
const mk = () => PARTS.make('wire',{shape:'s',len:80,core:2});
sc.addWire(mk(), {inst:st, port:'IO2'}, {inst:b, port:'A'}); sc.addWire(mk(), {inst:st, port:'GND'}, {inst:b, port:'B'});
const rep = tag => { const r = sc.solve(); const p = r.readings.pins.find(p=>p.pin==='IO2'); console.log(tag, 'IO2', p.v.toFixed(2), p.digital, 'leds', r.readings.leds.map(x=>x.mA.toFixed(2)+'mA@'+x.v.toFixed(2)+'V').join(' ')); };
rep('released'); b.ctrl.pressed = true; rep('pressed'); b.ctrl.pressed=false;
const sup = sc.add(SIM.SUPPLY, 0, 8, 0); rep('with supply');
const l = sc.add(lamp, 0, 12, 0); sc.addWire(mk(), {inst:sup, port:'V+'}, {inst:l, port:'A'}); sc.addWire(mk(), {inst:sup, port:'GND'}, {inst:l, port:'K'}); rep('with lamp on supply');
b.ctrl.pressed = true; rep('pressed again');
// lamp driven from the board: IO3 OUT_H to lamp A, GND to K
const l2 = sc.add(PARTS.make('lamp',{}), 6, 12, 0); sc.addWire(mk(), {inst:st, port:'IO3'}, {inst:l2, port:'A'}); sc.addWire(mk(), {inst:st, port:'GND'}, {inst:l2, port:'K'}); rep('lamp on IO3 OUT_H');
sc.addWire(mk(), {inst:st, port:'GND'}, {inst:sup, port:'GND'}); rep('grounds tied');
