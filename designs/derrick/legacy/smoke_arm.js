const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

let html = fs.readFileSync('/home/claude/out/derrick-viewer.html', 'utf8');
const ref = JSON.parse(fs.readFileSync('/home/claude/out/arm_ref.json', 'utf8'));
const bare = html.replace(/<script src="https:\/\/cdnjs[^>]*><\/script>/, '<!-- three stubbed -->');

let renders = 0, frames = 0;
const errs = [];

function V3(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
V3.prototype.set = function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; };
class Obj {
  constructor() {
    this.position = new V3(); this.rotation = new V3(); this.up = new V3(0, 0, 1);
    this.children = []; this.visible = true; this.matrixAutoUpdate = true;
  }
  add(o) { this.children.push(o); return this; }
  lookAt() { return this; }
  updateProjectionMatrix() { }
}
class Geo {
  constructor() { this.attributes = {}; }
  setAttribute(n, a) {
    if (!a || !a.array || !a.array.length) throw new Error('empty attribute ' + n);
    for (let i = 0; i < a.array.length; i++) if (!Number.isFinite(a.array[i])) throw new Error('non finite in ' + n);
    this.attributes[n] = a; return this;
  }
  computeVertexNormals() { if (!this.attributes.position) throw new Error('normals before position'); }
}
class Mat4 {
  constructor() { this.elements = new Array(16).fill(0); }
  set(...a) {
    if (a.length !== 16) throw new Error('Matrix4.set needs 16 numbers, got ' + a.length);
    for (const v of a) if (!Number.isFinite(v)) throw new Error('non finite matrix element');
    this.elements = a; return this;
  }
}
const THREE = {
  DoubleSide: 2,
  Scene: class extends Obj { }, Group: class extends Obj { },
  Mesh: class extends Obj { constructor(g, m) { super(); if (!g || !m) throw new Error('Mesh needs geometry and material'); this.geometry = g; this.material = m; } },
  Line: class extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } },
  LineSegments: class extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } },
  PerspectiveCamera: class extends Obj { constructor(f, a) { super(); this.fov = f; this.aspect = a; } },
  HemisphereLight: class extends Obj { }, DirectionalLight: class extends Obj { },
  Color: class { constructor(c) { this.c = c; } },
  Vector3: V3, Matrix4: Mat4, BufferGeometry: Geo,
  BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; } },
  MeshPhongMaterial: class { constructor(o) { Object.assign(this, o || {}); } },
  LineBasicMaterial: class { constructor(o) { Object.assign(this, o || {}); } },
  WebGLRenderer: class {
    constructor() { this.domElement = null; }
    setPixelRatio() { } setSize() { }
    render(s, c) {
      renders++;
      if (!s || !c) throw new Error('render without scene or camera');
      if (!Number.isFinite(c.position.x + c.position.y + c.position.z)) throw new Error('camera NaN');
    }
  }
};

const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push('jsdomError: ' + (e.detail ? e.detail.stack : e.message)));
vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(bare, {
  runScripts: 'dangerously', pretendToBeVisual: false, virtualConsole: vc,
  beforeParse(w) {
    const Base = THREE.WebGLRenderer;
    THREE.WebGLRenderer = class extends Base {
      constructor(o) { super(o); this.domElement = w.document.createElement('canvas'); }
    };
    w.THREE = THREE;
    w.requestAnimationFrame = cb => { frames++; if (frames < 300) return setTimeout(() => cb(Date.now()), 0); return 0; };
    w.devicePixelRatio = 2;
    Object.defineProperty(w, 'innerWidth', { value: 1400, writable: true });
    Object.defineProperty(w, 'innerHeight', { value: 900, writable: true });
    w.onerror = (m, s, l, c, e) => errs.push('window.onerror: ' + (e && e.stack ? e.stack : m));
  }
});

const w = dom.window, d = w.document;
function ev(el, t, init) { el.dispatchEvent(new w.Event(t, Object.assign({ bubbles: true, cancelable: true }, init))); }
function key(k) { w.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
function mouse(el, t, x, y, shift) {
  el.dispatchEvent(new w.MouseEvent(t, { clientX: x, clientY: y, shiftKey: !!shift, button: 0, bubbles: true, cancelable: true }));
}

setTimeout(() => {
  try {
    const api = w.__derrick;
    if (!api) throw new Error('__derrick missing, main script did not finish');

    // 1. kinematics and torque against the python reference
    let worstP = 0, worstT = 0;
    for (const [name, r] of Object.entries(ref)) {
      const P = api.computePose(r.q);
      const tool = [P.tool[3], P.tool[7], P.tool[11]];
      for (let i = 0; i < 3; i++) worstP = Math.max(worstP, Math.abs(tool[i] - r.tool[i]));
      for (let j = 0; j < r.torque.length; j++) worstT = Math.max(worstT, Math.abs(P.torque[j].kgcm - r.torque[j]));
    }
    console.log('  worst tool position error   ' + worstP.toFixed(4) + ' mm');
    console.log('  worst joint torque error    ' + worstT.toFixed(5) + ' kg cm');
    if (worstP > 0.01) errs.push('FK disagrees with python by ' + worstP.toFixed(3) + ' mm');
    if (worstT > 0.005) errs.push('torque disagrees with python by ' + worstT.toFixed(4) + ' kg cm');

    // 2. drive the whole interface
    const btns = Array.from(d.querySelectorAll('button'));
    for (let p = 0; p < 2; p++) btns.forEach(b => ev(b, 'click'));
    Array.from(d.querySelectorAll('input[type=range]')).forEach(s => {
      for (let i = -90; i <= 90; i += 15) { s.value = String(i); ev(s, 'input'); }
    });
    ['1', '2', '3', '4', '5', 'ArrowLeft', 'ArrowRight', 'h', 'H', 'r', 'R', 'q'].forEach(key);
    for (let i = 0; i < 60; i++) key('ArrowRight');
    for (let i = 0; i < 60; i++) key('ArrowLeft');
    const cv = d.querySelector('canvas');
    mouse(cv, 'mousedown', 700, 450);
    for (let i = 0; i < 40; i++) mouse(w, 'mousemove', 700 + i * 7, 450 + i * 4);
    mouse(w, 'mouseup', 980, 610);
    mouse(cv, 'mousedown', 400, 400, true);
    for (let i = 0; i < 30; i++) mouse(w, 'mousemove', 400 - i * 5, 400 + i * 4, true);
    mouse(w, 'mouseup', 250, 520, true);
    for (let i = 0; i < 40; i++) {
      const e = new w.Event('wheel', { bubbles: true, cancelable: true });
      e.deltaY = i % 2 ? 120 : -120;
      cv.dispatchEvent(e);
    }
    ev(w, 'resize');
    d.getElementById('turn').click();

    setTimeout(() => {
      const txt = d.getElementById('txyz').textContent + d.getElementById('treach').textContent;
      if (/NaN|undefined/.test(txt)) errs.push('readout shows ' + txt);
      for (let i = 0; i < 5; i++) {
        const c = d.getElementById('tq' + i).textContent;
        if (/NaN|undefined/.test(c)) errs.push('torque cell ' + i + ' shows ' + c);
      }
      console.log('  renders ' + renders + '   animation frames ' + frames);
      if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); }
      console.log('PASS: JS kinematics matches python, no errors driving the interface');
      process.exit(0);
    }, 900);
  } catch (e) {
    console.log('FAIL harness\n' + e.stack + '\n' + errs.join('\n'));
    process.exit(1);
  }
}, 200);
