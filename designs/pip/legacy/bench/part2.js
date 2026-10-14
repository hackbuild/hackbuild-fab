/* part2.js: PIP bench state, commit model, build pipeline, exports, firmware and wiring.
   Depends on the PIP kernel scripts (geom, font, layout, router, model, pkg), Orca3MF, JSZip. */
'use strict';
const H = globalThis.PIP;
let ST = null;
const UIS = { step: 0, visited: [true, false, false, false], cam: 'iso', xray: false, section: false, plate: false, explode: false, auto: true, press: new Set(), focus: null };
let MODEL = null;
let REV = 0, BUILT = -1, BUILDING = false, QUEUED = false, TIMER = 0;
const LOG = [];

function blankState() {
  const P = H.LAYOUT.defaults();
  for (const g of Object.values(P.groups)) g.on = false;
  return P;
}
function exampleState() { return H.LAYOUT.defaults(); }
function stickState() {
  const P = H.LAYOUT.defaults();
  P.groups.left.kind = 'stick';
  P.groups.menu.type = 'flex';
  return P;
}
function getP(path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ST); }
function setP(path, v) {
  const ks = path.split('.'), last = ks.pop();
  const o = ks.reduce((a, k) => a[k], ST);
  o[last] = v;
}

// ------------------------------------------------------------ undo / redo
const HIST = { stack: [], i: -1, t: 0 };
function snapshotNow() {
  const s = JSON.stringify(ST);
  if (HIST.stack[HIST.i] === s) return;
  HIST.stack = HIST.stack.slice(0, HIST.i + 1);
  HIST.stack.push(s);
  if (HIST.stack.length > 80) HIST.stack.shift();
  HIST.i = HIST.stack.length - 1;
}
function snapshot() { clearTimeout(HIST.t); HIST.t = setTimeout(snapshotNow, 450); }
function undo() { snapshotNow(); if (HIST.i > 0) { HIST.i--; ST = JSON.parse(HIST.stack[HIST.i]); afterLoad(); } }
function redo() { if (HIST.i < HIST.stack.length - 1) { HIST.i++; ST = JSON.parse(HIST.stack[HIST.i]); afterLoad(); } }
function afterLoad() { REV++; if (globalThis.UI && UI.refreshAll) UI.refreshAll(); schedule(); }

// ------------------------------------------------------------ commit model
function touch() { if (globalThis.UI && UI.stale) UI.stale(); }
function commit() {
  REV++;
  snapshot();
  if (globalThis.UI && UI.stale) UI.stale();
  if (globalThis.UI && UI.quick) UI.quick();
  schedule();
}
function schedule() {
  clearTimeout(TIMER);
  if (!UIS.auto) return;
  TIMER = setTimeout(runBuild, 320);
}
function doBuild() {
  const t0 = performance.now();
  const P = ST;
  const L = H.LAYOUT.layout(P);
  const R = H.ROUTER.route(L);
  const M = H.MODEL.build(P, L, R);
  const ms = performance.now() - t0;
  MODEL = { L, R, M, ms, rev: REV };
  BUILT = REV;
  if (ms > 2500) LOG.push('build took ' + (ms / 1000).toFixed(1) + ' s; lower smoothness in step 4 or raise the routing grid');
  return MODEL;
}
function runBuild() {
  if (BUILDING) { QUEUED = true; return; }
  if (BUILT === REV && MODEL) return;
  BUILDING = true;
  if (globalThis.UI && UI.busy) UI.busy(true);
  setTimeout(() => {
    try {
      doBuild();
      if (globalThis.VIEW) VIEW.update();
      if (globalThis.UI) UI.afterBuild();
    } catch (e) {
      console.error(e);
      MODEL = null;
      if (globalThis.UI) UI.buildError(String(e && e.message || e));
    } finally {
      BUILDING = false;
      if (globalThis.UI && UI.busy) UI.busy(false);
      if (QUEUED) { QUEUED = false; runBuild(); }
    }
  }, 30);
}
function ensureMesh() { if (!MODEL || BUILT !== REV) { doBuild(); if (globalThis.VIEW) VIEW.update(); if (globalThis.UI) UI.afterBuild(); } return MODEL; }

// ------------------------------------------------------------ exports
function pkgConfig() {
  const m = ensureMesh();
  const cfg = H.PKG.config(ST, m.M, 'pip');
  if (!ST.print.printer) cfg.printer = { printer_settings_id: '', print_settings_id: '' };
  return cfg;
}
async function export3mf() {
  VIEW.paused = true;
  try { const pkg = Orca3MF.build(pkgConfig()); return await pkg.zip(); } finally { VIEW.paused = false; }
}
function printCard() {
  const cfg = pkgConfig();
  const { L, M } = MODEL;
  const out = [Orca3MF.printCard(cfg)];
  const z = M.z;
  out.push('PIP', '----------------------------------------',
    'size     : ' + ST.shape.W + ' x ' + ST.shape.H + ' x ' + z.bezelTop.toFixed(2) + ' mm assembled',
    'body     : ' + z.top.toFixed(2) + ' mm, ' + Math.round(z.top / ST.stack.layer) + ' layers; traces at ' + z.l1[0].toFixed(2) + ' and ' + z.l2[0].toFixed(2) + ', pads flush at ' + z.floor.toFixed(2),
    'supports : none. print order by object is fine; no pause needed.',
    'grams    : the slot weights above are solid volume; the slicer infill brings the body well under that.',
    'brim     : none (it would weld the key wells and the board pocket).', '',
    'on the plate', ...M.objects.map(o => '  ' + o.name + (o.count > 1 ? ' x' + o.count : '') + ': ' + o.print.map(p => p.name + ' slot ' + p.slot).join(', ') + '  (' + o.size.map(v => v.toFixed(1)).join(' x ') + ' mm)'), '',
    'assembly');
  assemblySteps().forEach((s, i) => out.push('  ' + (i + 1) + '. ' + s));
  out.push('', 'fits and clearances');
  let fgrp = '';
  for (const f of MODEL.M.fits) {
    if (f.group !== fgrp) { fgrp = f.group; out.push('  ' + fgrp); }
    out.push('    ' + pad(f.name, 32) + pad(f.value, 12) + (f.ok ? '' : 'CHECK  ') + f.note);
  }
  out.push('', 'pins');
  for (const r of M.elec.rows) out.push('  ' + pad(r.id, 7) + ' ' + pad(r.pin || '-', 5) + ' ' + r.type + ', about ' + (r.R / 1e3).toFixed(0) + ' kohm through the print');
  if (L.cups.length) {
    out.push('', 'wire cups (numbered from the left, top row first)');
    for (const c of L.cups) out.push('  cup ' + pad(String(c.num), 3) + pad(c.net, 7) + ' to ' + (c.net === 'GND' || c.net === '3V3' ? c.net : ST.pins[c.net]) + ' pad');
  }
  out.push('', 'read: charge and release, no resistors. keys are read ' + ST.phys.waitMech + ' ms after release, touch ' + ST.phys.waitTouch + ' ms.',
    '      a stray path under about ' + (M.elec.rejectMin / 1e6).toFixed(0) + ' Mohm between two nets reads as a key held down,',
    '      so clean off strings and check with the self test (send t on the serial port) before assembly.',
    '', 'filament notes',
    '  conductive PLA 190 to 220 C, PETG 230 to 250, one bed around 60 to 65 C.',
    '  dry the conductive TPU before printing, it bridges the key caps.',
    '  print the test coupon first and type the resistances it gives you into step 3.');
  if (M.warn.length) out.push('', 'warnings', ...M.warn.map(w => '  ' + w));
  return out.join('\n') + '\n';
}
function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(1, n - s.length)); }
function assemblySteps() {
  const { L, M } = MODEL;
  const st = [];
  const inplace = [];
  if (L.types.has('flex')) inplace.push('flex keys');
  if (L.stick) inplace.push('stick core');
  st.push('let the plate cool and peel the body.' + (inplace.length ? ' the ' + inplace.join(' and the ') + ' printed in place; work each one a few times to free it.' : ''));
  if (L.types.has('clicky')) {
    st.push('snap the click springs off the plate. drop each one into its slot standing on edge, grey conductive tip down toward the two floor pads. the groove in each end block drops over the rib on the slot floor; wiggle it until it seats, it should not need pushing. upside down it will not click.');
    st.push('drop a click cap into each click well, flange down, onto the spring stem.');
  }
  if (ST.board.mode !== 'wire') st.push('lay the RP2040-Zero component side up in the pocket, USB toward the cable notch. its edge holes sit on the conductive bumps.');
  else st.push('solder a short wire to each used pad of the RP2040-Zero (see the wiring drawing), lay it in the pocket, USB toward the notch.');
  if (L.cups.length) st.push('heat each wire end with the iron and push it into its numbered cup bore about 1.5 mm, or drive an M1.2 self tapper into the bore instead.');
  st.push('press the bezel down onto its pegs. the two ribs under it clamp the board' + (ST.board.mode !== 'wire' ? ' onto the bumps by ' + ST.board.press.toFixed(2) + ' mm' : '') + '. a drop of CA on a peg if it is loose.');
  if (L.stick) st.push('push the thumb cap onto the stem above the bezel.');
  st.push('flash firmware.ino, open a gamepad tester, press every key. if a key reads stuck or dead, see the README fixes.');
  return st;
}
async function exportStlZip() {
  VIEW.paused = true;
  try {
    const cfg = pkgConfig();
    const z = new JSZip();
    for (const o of cfg.objects) for (const p of o.parts) z.file('pip-' + p.name + '-slot' + p.slot + '.stl', Orca3MF.stl(p));
    z.file('print-card.txt', printCard());
    z.file('design.json', designJson());
    z.file('firmware/pip/pip.ino', firmware());
    z.file('wiring.svg', wiringSvg());
    return await z.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  } finally { VIEW.paused = false; }
}
async function exportCoupon() {
  VIEW.paused = true;
  try {
    const K = H.COUPON.build(ST);
    const cfg = H.PKG.config(ST, K, 'pip-coupon');
    const pkg = Orca3MF.build(cfg);
    const z = new JSZip();
    z.file('pip-coupon.3mf', await pkg.zip());
    z.file('coupon-card.txt', H.COUPON.card(ST, K));
    for (const o of cfg.objects) for (const p of o.parts) z.file('stl/' + p.name + '-slot' + p.slot + '.stl', Orca3MF.stl(p));
    return await z.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  } finally { VIEW.paused = false; }
}
function designJson() { return JSON.stringify({ app: 'pip-bench', v: 1, state: ST }, null, 1); }
function loadDesign(txt) {
  const o = JSON.parse(txt);
  const s = o.state || o;
  const fresh = H.LAYOUT.defaults();
  // keys the current defaults do not have (retired settings) are dropped
  const merge = (a, b) => { for (const k in b) { if (!(k in a)) continue; if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = b[k]; } return a; };
  ST = merge(fresh, s);
  snapshotNow();
  afterLoad();
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}

// ------------------------------------------------------------ firmware
function firmware() {
  const { L, M } = ensureMesh();
  const P = ST;
  const logical = [];
  for (const b of L.btns) { if (b.type === 'stick') ['UP', 'DOWN', 'LEFT', 'RIGHT'].forEach(d => logical.push({ id: d, type: 'stick' })); else logical.push({ id: b.id, type: b.type }); }
  const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  const mech = logical.filter(k => k.type !== 'touch'), touchK = logical.filter(k => k.type === 'touch');
  const num = (p) => p ? String(+p.replace('GP', '')) : '255';
  const buttons = logical.filter(k => !dirs.includes(k.id));
  const rows = M.elec.rows;
  const worst = Math.max(0, ...rows.filter(r => r.type !== 'touch').map(r => r.R));
  const rejectK = Math.min(...rows.filter(r => r.type !== 'touch').map(r => r.read.reject), Infinity);
  const lines = [];
  lines.push('// pip.ino: firmware for a PIP printed controller, generated by pip.html',
    '// board : Waveshare RP2040-Zero',
    '// core  : Raspberry Pi Pico/RP2040/RP2350 by Earle F. Philhower (arduino-pico)',
    '// tools : Board "Waveshare RP2040 Zero", USB Stack "Pico SDK"',
    '// shows up as a USB gamepad through the core\'s built in Joystick library.',
    '//',
    '// no resistors. every printed switch is read by charge and release:',
    '//   mechanical keys close to GND through the printed traces,',
    '//   touch keys close to 3V3 through the fingertip.',
    '// each scan drives the pins away from their active level, floats them, waits, then reads.',
    '//',
    '// with the conductive filament set in the bench, the worst key path is about ' + (worst / 1e6).toFixed(1) + ' Mohm,',
    '// which crosses in roughly ' + (5 * Math.max(0, ...rows.filter(r => r.type !== 'touch').map(r => r.read.tauMs)) * 1000).toFixed(0) + ' us. the key wait is deliberately short:',
    '// it reads a real press but ignores anything weaker than about ' + (isFinite(rejectK) ? (rejectK / 1e6).toFixed(0) : '-') + ' Mohm, which is how a',
    '// conductive string or a smear between two nets gets rejected instead of reading as a held key.',
    '// touch needs the long wait because skin is megohms.',
    '',
    '#include <Joystick.h>',
    '',
    'const unsigned KEY_WAIT_US   = ' + Math.round(P.phys.waitMech * 1000) + ';   // raise if a key feels dead, lower if keys stick on',
    'const unsigned TOUCH_WAIT_US = ' + Math.round(P.phys.waitTouch * 1000) + ';  // raise if touch feels dead',
    'const unsigned CHARGE_US = 30;',
    '');
  const arr = (name, list, f) => 'const uint8_t ' + name + '[] = {' + list.map(f).join(', ') + '};';
  lines.push('// mechanical keys (active low)');
  lines.push(mech.length ? arr('MECH_PIN', mech, k => num(P.pins[k.id])) : 'const uint8_t MECH_PIN[] = {255};');
  lines.push('const char *MECH_NAME[] = {' + (mech.length ? mech.map(k => '"' + k.id + '"').join(', ') : '""') + '};');
  lines.push('const int MECH_N = ' + mech.length + ';', '');
  lines.push('// touch keys (active high)');
  lines.push(touchK.length ? arr('TOUCH_PIN', touchK, k => num(P.pins[k.id])) : 'const uint8_t TOUCH_PIN[] = {255};');
  lines.push('const char *TOUCH_NAME[] = {' + (touchK.length ? touchK.map(k => '"' + k.id + '"').join(', ') : '""') + '};');
  lines.push('const int TOUCH_N = ' + touchK.length + ';', '');
  const allK = mech.concat(touchK);
  const bitOf = (id) => allK.findIndex(k => k.id === id);
  lines.push('// joystick mapping: direction keys drive X / Y, everything else is a numbered button');
  for (const d of dirs) lines.push('const int BIT_' + d + ' = ' + bitOf(d) + ';');
  lines.push(arr('BTN_BIT', buttons.length ? buttons : [{ id: '' }], k => String(buttons.length ? bitOf(k.id) : -1)).replace('uint8_t', 'int'));
  lines.push('const int BTN_N = ' + buttons.length + ';   // ' + buttons.map((k, i) => (i + 1) + ' ' + k.id).join(', '));
  lines.push('',
    'uint32_t scanOnce() {',
    '  uint32_t s = 0;',
    '  // keys: charge high, float, read after the short wait',
    '  for (int i = 0; i < MECH_N; i++) { pinMode(MECH_PIN[i], OUTPUT); digitalWrite(MECH_PIN[i], HIGH); }',
    '  delayMicroseconds(CHARGE_US);',
    '  for (int i = 0; i < MECH_N; i++) pinMode(MECH_PIN[i], INPUT);    // INPUT = no pull on this core',
    '  delayMicroseconds(KEY_WAIT_US);',
    '  for (int i = 0; i < MECH_N; i++) if (digitalRead(MECH_PIN[i]) == LOW) s |= 1UL << i;',
    '  // touch: charge low, float, read after the long wait',
    '  for (int i = 0; i < TOUCH_N; i++) { pinMode(TOUCH_PIN[i], OUTPUT); digitalWrite(TOUCH_PIN[i], LOW); }',
    '  delayMicroseconds(CHARGE_US);',
    '  for (int i = 0; i < TOUCH_N; i++) pinMode(TOUCH_PIN[i], INPUT);',
    '  delayMicroseconds(TOUCH_WAIT_US);',
    '  for (int i = 0; i < TOUCH_N; i++) if (digitalRead(TOUCH_PIN[i]) == HIGH) s |= 1UL << (MECH_N + i);',
    '  return s;',
    '}',
    '',
    '// self test: how long each pin actually takes to cross, which is the printed path times',
    '// the pin capacitance. run it with nothing pressed, then again holding one key.',
    '// a key that crosses with nothing touching it is a smear or a string between two nets.',
    'const float C_PIN_PF = ' + ST.phys.cpin.toFixed(1) + 'f;',
    '// interrupts stay off for GUARD_US and not for the whole limit. holding them off',
    '// for the full 20 ms starves USB CDC hard enough to eat the table this is trying',
    '// to print: seen on hardware, whole rows went missing out of the middle of the',
    '// output and the host\'s serial read stalled on the endpoint. a press never needed',
    '// that long a guard. the worst printed key path is about ' + (worst / 1e6).toFixed(1) + ' Mohm and crosses in',
    '// roughly ' + (5 * Math.max(0, ...rows.filter(r => r.type !== 'touch').map(r => r.read.tauMs)) * 1000).toFixed(0) + ' us, so anything still floating at 2 ms is open by any definition and',
    '// does not need protecting from an interrupt.',
    'const unsigned long GUARD_US = 2000;',
    'unsigned long crossTime(uint8_t pin, bool chargeHigh, unsigned long limitUs) {',
    '  pinMode(pin, OUTPUT); digitalWrite(pin, chargeHigh ? HIGH : LOW);',
    '  delayMicroseconds(CHARGE_US);',
    '  noInterrupts();',
    '  bool guarded = true;',
    '  unsigned long t0 = micros();',
    '  pinMode(pin, INPUT);',
    '  while (digitalRead(pin) == (chargeHigh ? HIGH : LOW)) {',
    '    unsigned long el = micros() - t0;',
    '    if (el > limitUs) { if (guarded) interrupts(); return 0; }  // never crossed: open, as it should be',
    '    if (guarded && el > GUARD_US) { interrupts(); guarded = false; }',
    '  }',
    '  unsigned long dt = micros() - t0;',
    '  if (guarded) interrupts();',
    '  return dt;',
    '}',
    '',
    'void selfTest() {',
    '  Serial.println("pin\\tcross us\\tpath Mohm (rough)");',
    '  for (int i = 0; i < MECH_N; i++) {',
    '    unsigned long dt = crossTime(MECH_PIN[i], true, 20000);',
    '    Serial.print(MECH_NAME[i]); Serial.print(\'\\t\');',
    '    if (!dt) Serial.println("open");',
    '    else { Serial.print(dt); Serial.print(\'\\t\'); Serial.println(dt / (C_PIN_PF * 1.05f), 2); }',
    '  }',
    '  for (int i = 0; i < TOUCH_N; i++) {',
    '    unsigned long dt = crossTime(TOUCH_PIN[i], false, 20000);',
    '    Serial.print(TOUCH_NAME[i]); Serial.print(\'\\t\');',
    '    if (!dt) Serial.println("open");',
    '    else { Serial.print(dt); Serial.print(\'\\t\'); Serial.println(dt / (C_PIN_PF * 1.05f), 2); }',
    '  }',
    '}',
    '',
    'uint32_t stable = 0, last = 0;',
    'bool on(uint32_t s, int b) { return b >= 0 && (s >> b) & 1; }',
    'int axis(bool neg, bool pos) { return neg == pos ? 512 : (neg ? 0 : 1023); }',
    '',
    'void setup() {',
    '  Serial.begin(115200);',
    '  Joystick.begin();',
    '  Joystick.useManualSend(true);',
    '}',
    '',
    'void loop() {',
    '  if (Serial.available() && Serial.read() == \'t\') selfTest();   // send t for the self test',
    '  uint32_t s = scanOnce();',
    '  if (s == last) {                       // two scans that agree: debounced',
    '    if (s != stable) {',
    '      stable = s;',
    '      Joystick.X(axis(on(s, BIT_LEFT), on(s, BIT_RIGHT)));',
    '      Joystick.Y(axis(on(s, BIT_UP), on(s, BIT_DOWN)));',
    '      for (int i = 0; i < BTN_N; i++) Joystick.button(i + 1, on(s, BTN_BIT[i]));',
    '      Joystick.send_now();',
    '      for (int i = 0; i < MECH_N; i++) if (on(s, i)) { Serial.print(MECH_NAME[i]); Serial.print(\' \'); }',
    '      for (int i = 0; i < TOUCH_N; i++) if (on(s, MECH_N + i)) { Serial.print(TOUCH_NAME[i]); Serial.print(\' \'); }',
    '      Serial.println();',
    '    }',
    '  }',
    '  last = s;',
    '  delay(2);',
    '}',
    '');
  return lines.join('\n');
}

// ------------------------------------------------------------ wiring drawing (board top view, used pads, cups)
function wiringSvg() {
  const { L } = ensureMesh();
  const P = ST, B = P.board, bd = L.board;
  const k = 9, W = 560, bx = 150, by = 44;
  // real positions: board and cups in controller mm, shifted so the board sits at (bx, by)
  const X = (x) => bx + (x + B.W / 2) * k, Y = (y) => by + (B.L / 2 - y) * k;
  const cupY = L.cups.length ? Math.max(...L.cups.map(c => Y(c.y - bd.cy))) : Y(-B.L / 2);
  const Hh = Math.ceil(cupY + (L.cups.length ? 40 : 30) + 60);
  const s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + Hh + '" font-family="IBM Plex Mono, monospace">');
  s.push('<rect width="' + W + '" height="' + Hh + '" fill="#fffdf7"/>');
  s.push('<text x="14" y="22" font-size="15" fill="#1a1a1a">RP2040-Zero, top view, USB toward the cable notch</text>');
  s.push('<rect x="' + X(-B.W / 2) + '" y="' + Y(B.L / 2) + '" width="' + B.W * k + '" height="' + B.L * k + '" rx="6" fill="#1b1b1b" stroke="#1a1a1a" stroke-width="2"/>');
  s.push('<rect x="' + X(-4.5) + '" y="' + (Y(B.L / 2) - 8) + '" width="' + 9 * k + '" height="' + 7.5 * k + '" rx="4" fill="#b9b9b9" stroke="#555"/>');
  s.push('<text x="' + X(0) + '" y="' + (Y(B.L / 2) + 26) + '" font-size="11" fill="#555" text-anchor="middle">USB C</text>');
  const used = L.usedPins;
  const padXY = {};
  for (const p of L.pads) {
    const u = used.has(p.name);
    const cx = X(p.x), cy = Y(p.y);
    padXY[p.name] = [cx, cy];
    const fn = u ? used.get(p.name) : '';
    const label = p.name + (fn && fn !== p.name ? ' ' + fn : '');
    if (p.edge === 'T') s.push('<text x="' + (cx + 4) + '" y="' + (cy - 11) + '" font-size="10" transform="rotate(-90 ' + (cx + 4) + ' ' + (cy - 11) + ')" fill="' + (u ? '#FE0386' : '#9a9184') + '">' + label + '</text>');
    else s.push('<text x="' + (p.edge === 'L' ? cx - 14 : cx + 14) + '" y="' + (cy + 4) + '" font-size="11" text-anchor="' + (p.edge === 'L' ? 'end' : 'start') + '" fill="' + (u ? '#FE0386' : '#6b6459') + '">' + label + '</text>');
  }
  for (const c of L.cups) {
    const cx = X(c.x - bd.cx), cy = Y(c.y - bd.cy);
    const pin = (c.net === 'GND' || c.net === '3V3') ? c.net : P.pins[c.net];
    const pp = padXY[pin];
    const col = c.net === 'GND' ? '#1a1a1a' : c.net === '3V3' ? '#c3251f' : '#FE0386';
    if (pp) s.push('<line x1="' + pp[0] + '" y1="' + pp[1] + '" x2="' + cx + '" y2="' + cy + '" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>');
  }
  for (const c of L.cups) {
    const cx = X(c.x - bd.cx), cy = Y(c.y - bd.cy);
    s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (P.cups.od / 2 * k) + '" fill="#6e6e6e" stroke="#1a1a1a" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (P.cups.bore / 2 * k) + '" fill="#fffdf7"/>');
    s.push('<text x="' + cx + '" y="' + (cy + 4) + '" font-size="10" text-anchor="end" fill="#6b6459" dx="' + (-P.cups.od / 2 * k - 3) + '">' + c.num + '</text>');
    s.push('<text x="' + cx + '" y="' + (cy + P.cups.od / 2 * k + 12) + '" font-size="10" text-anchor="middle" fill="#1a1a1a">' + c.net + '</text>');
  }
  for (const p of L.pads) {
    const [cx, cy] = padXY[p.name], u = used.has(p.name);
    s.push('<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + (u ? '#FE0386' : '#d4a94a') + '" stroke="#1a1a1a" stroke-width="1.5"/><circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#1a1a1a"/>');
  }
  const note = L.cups.length
    ? ['cups drawn where they print, looking down, numbered left to right,', 'top row first. push a hot wire into each bore, or drive an M1.2 screw.']
    : ['press fit: no wires. each pink pad sits on a printed bump and carries', 'the function shown; every other pad lands on bare PETG.'];
  note.forEach((t, i) => s.push('<text x="14" y="' + (Hh - 30 + i * 16) + '" font-size="12" fill="#6b6459">' + t + '</text>'));
  s.push('</svg>');
  return s.join('\n');
}

// ------------------------------------------------------------ test hooks
const BENCH = globalThis.BENCH = {
  ready: false,
  get state() { return ST; },
  set state(v) { ST = v; afterLoad(); },
  get model() { return MODEL; },
  get rev() { return REV; },
  get built() { return BUILT; },
  get busy() { return BUILDING || (UIS.auto && BUILT !== REV); },
  log: LOG,
  loadDesign, designJson, firmware, wiringSvg, printCard, ensureMesh, commit, exportCoupon,
  exportBytes: async function (kind) {
    let blob;
    if (kind === '3mf') blob = await export3mf();
    else if (kind === 'stl') blob = await exportStlZip();
    else if (kind === 'card') blob = new Blob([printCard()]);
    else if (kind === 'json') blob = new Blob([designJson()]);
    else if (kind === 'ino') blob = new Blob([firmware()]);
    else if (kind === 'svg') blob = new Blob([wiringSvg()]);
    else if (kind === 'coupon') blob = await exportCoupon();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  }
};
