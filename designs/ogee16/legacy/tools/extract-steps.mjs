// The assembly step of every OGEE16 part, read from the viewers' own
// registries (M07-T09 step 1). Never typed by hand: each viewer's registry
// block runs in node against stub THREE objects, and every reg(...) call
// records the mesh it registered and its `asm` step, exactly as the page
// builds PARTS.
//
// - R16 lasercut: ../source/viewer_template.html, `reg(o, group, kind, ex,
//   asm)`, lines 250 to 371 (`const N=P.N` to the last servo reg before the
//   kinematics), ASM at lines 608 to 611 (14 steps).
// - R16-P printed: ../source/printed_viewer_template.html, `reg(o, group, ex,
//   asm)`, lines 157 and 158 (`const N=P.N`, px, py) and 183 to 278
//   (`const PARTS=[];` to the line before `/*KIN*/`), ASM at lines 520 to
//   524 (12 steps).
//
// P is the params dict build_viewer.py and build_printed_viewer.py embed;
// only N (params.scad line 36) and GUIDE_Y (line 136) change a count, so
// those two are read from params.scad and every other key reads 0 (it moves
// a part, never adds one). G holds one token per `G.<key>` the block names,
// the build_printed_viewer.py NEED rule (line 11).
//
// Mesh key to part id:
// - lasercut: a key that is a cutfiles.py BOM id (lines 22 to 32) is that
//   part; an `m_` key is the part its ogee16.scad module draws (lines 428 to
//   437: m_crank_row is p_crank, m_washer_y is p_washer, m_crank_latch is
//   p_latchcrank); an `m_` module drawing no p_ profile (m_pivot and the
//   crank pins, rod stock) is not a sheet part. A key whose v_ module
//   extrudes TB (ogee16.scad lines 131 and 132) is LAM plies of T
//   (params.scad lines 18 to 20), so one registered row bar is 2 pieces.
// - printed: the key, else the key less `_asm`, else that less a `_row` or
//   `_col` suffix, whichever is a build_plate.py QTY id (lines 5 to 12).
//   printed.scad prints each `<id>_asm` as the same body reoriented (lines
//   543 to 625; crank_row_asm and crank_col_asm are both p_crank, lines 416
//   to 423).
// A box mesh (the SG90 bodies and flanges) is a bought part and skipped.
//
// The counts are then held to the bill each viewer never reads: cutfiles.py
// BOM and build_plate.py QTY. A bill id the registry never places is
// listed as unassigned (coupon in the lasercut, drivepin in the print).
//
//   node designs/ogee16/legacy/tools/extract-steps.mjs            compare with the record
//   node designs/ogee16/legacy/tools/extract-steps.mjs --write    write it
//
// Writes packages/nest/records/ogee16-steps.json. Exit 1 when an input is
// not the pinned copy, a marker moved, a count differs from its bill, or
// the result differs from the committed record.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Asserts, finish, marker, readPinned } from "../../../../tools/legacy/record.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const src = (f) => join(here, "..", "source", f);

/** From ../SHA256SUMS. */
const PIN = {
  "viewer_template.html": "9d101e0c28bd7ae75e81dce60483ac62b085460fc945d43d074077ecf5706dd9",
  "printed_viewer_template.html": "70f859f6524e0abc2fc1f3a7a22abe5a25b560848bf615868191607092dc61b8",
  "ogee16.scad": "4afd9001c421371385eef257060914a6f578b30c21e62fb51064e90dc4f3b078",
  "params.scad": "1c0a4b898b4977d87d435273a04857111fab5d43324bee591c2a6ad641591d6d",
  "cutfiles.py": "ef535caca27def1a7b8a91e4c6273dfb1e85617c6087b93e4924debf3fb98800",
  "build_plate.py": "dc3f1772312360fda22e3ef5f89ebc243e714fbf88fc1498e30c6a2bfd0664ed",
};

const linesOf = (f) => readPinned(src(f), PIN[f]).toString("utf8").split("\n");

/** N, GUIDE_Y, T and LAM from params.scad. */
function params() {
  const L = linesOf("params.scad");
  const num = (name, line) => {
    marker(L, name, line);
    return Number(/=\s*([0-9.]+)/.exec(L[line - 1])[1]);
  };
  marker(L, "GUIDE_Y  =", 136);
  const guide = JSON.parse(/=\s*(\[[^\]]*\])/.exec(L[136 - 1])[1]);
  return { N: num("N        =", 36), GUIDE_Y: guide, T: num("T        =", 18), LAM: num("LAM      =", 19) };
}

/** Minimal THREE: objects carry position, rotation, children; nothing renders. */
function stubThree() {
  const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } });
  class Obj {
    constructor() { this.position = vec(); this.rotation = vec(); this.children = []; this.userData = {}; }
    add(c) { this.children.push(c); }
  }
  class Mesh extends Obj { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
  class Group extends Obj {}
  class BoxGeometry { constructor() { this.box = true; } }
  return { THREE: { Mesh, Group, BoxGeometry }, scene: new Obj() };
}

/** Runs one registry block; returns [meshKey | null, asm] per reg call, null for a box. */
function runRegistry(block, P) {
  const keys = [...new Set([...block.matchAll(/\bG\.([A-Za-z_]\w*)/g)].map((m) => m[1]))];
  const G = Object.fromEntries(keys.map((k) => [k, { key: k }]));
  const M = new Proxy({}, { get: (_, k) => ({ material: String(k) }) });
  const Pp = new Proxy(P, { get: (t, k) => (k in t ? t[k] : 0) });
  const { THREE, scene } = stubThree();
  const PARTS = new Function("THREE", "scene", "G", "M", "P", `${block}\nreturn PARTS;`)(THREE, scene, G, M, Pp);
  const keyOf = (o) => {
    if (o.geometry?.box) return null;
    if (o.geometry?.key) return o.geometry.key;
    const inner = o.children.map(keyOf).filter((k) => k !== null);
    if (inner.length !== 1) throw new Error(`a registered group holds ${inner.length} meshes`);
    return inner[0];
  };
  return PARTS.map((e) => [keyOf(e.o), e.asm]);
}

/** The ASM label array: the literal from `const ASM=[` to `];`, parsed as JSON once quotes are swapped. */
function asmLabels(L, line, end) {
  marker(L, "const ASM=[", line);
  const text = L.slice(line - 1, end).join("\n");
  const lit = /const ASM=(\[[\s\S]*?\]);/.exec(text)[1];
  return JSON.parse(lit.replace(/'/g, '"'));
}

/** Bill rows `("id", n)` of the list opening at a line, up to its first `]` (the tuples hold none). */
function bill(L, start, label) {
  marker(L, label, start);
  const text = L.slice(start - 1).join("\n");
  const list = text.slice(text.indexOf("["), text.indexOf("]") + 1);
  return [...list.matchAll(/\("(\w+)",\s*(\d+)\)/g)].map((m) => [m[1], Number(m[2])]);
}

/** Tally [part, step] pairs into { part: { step: count } } with parts in bill order. */
function tally(rows, order) {
  const out = {};
  for (const id of order) {
    const steps = {};
    for (const [p, s, n] of rows) if (p === id) steps[s] = (steps[s] ?? 0) + n;
    if (Object.keys(steps).length) out[id] = steps;
  }
  return out;
}

export function lasercut() {
  const P = params();
  const L = linesOf("viewer_template.html");
  marker(L, "const N=P.N, PITCH=P.PITCH, T=P.T, C=P.C;", 250);
  marker(L, "const PARTS=[];", 252);
  marker(L, "// ---------------------------------------------------------------- kinematics", 372);
  const regs = runRegistry(L.slice(250 - 1, 371).join("\n"), { N: P.N, GUIDE_Y: P.GUIDE_Y, T: P.T });
  const ASM = asmLabels(L, 608, 611);
  const S = linesOf("ogee16.scad");
  const BOM = bill(linesOf("cutfiles.py"), 22, "BOM = [");
  const ids = new Set(BOM.map(([id]) => id));
  // m_ modules and their profile, ogee16.scad lines 428 to 437
  marker(S, "module m_crank_row()", 428);
  const mods = new Map();
  for (const l of S.slice(428 - 1, 437)) {
    const m = /^module (m_\w+)\(\)\s.*?(?:\bp_(\w+)\(\))?;\s*$/.exec(l);
    if (m) mods.set(m[1], m[2] ?? null);
  }
  const plies = (key) => (S.some((l) => new RegExp(`^module v_${key}\\(\\)\\s.*\\bTB\\)`).test(l)) ? P.LAM : 1);
  const rows = [];
  const notSheet = new Set();
  let bought = 0;
  for (const [key, asm] of regs) {
    if (key === null) { bought++; continue; }
    let id = ids.has(key) ? key : null;
    if (id === null && mods.has(key)) id = mods.get(key);
    if (id === null) { notSheet.add(key); continue; }
    if (!ids.has(id)) throw new Error(`lasercut key ${key} maps to ${id}, not a cutfiles.py BOM id`);
    rows.push([id, asm, plies(key)]);
  }
  return {
    viewer: "source/viewer_template.html",
    asm: ASM,
    steps: tally(rows, BOM.map(([id]) => id)),
    unassigned: BOM.filter(([id]) => !rows.some(([p]) => p === id)).map(([id]) => id),
    notSheet: [...notSheet].sort(),
    bought,
    bill: Object.fromEntries(BOM),
  };
}

export function printed() {
  const P = params();
  const L = linesOf("printed_viewer_template.html");
  marker(L, "const N=P.N, PITCH=P.PITCH, T=P.T, C=P.C;", 157);
  marker(L, "const PARTS=[];", 183);
  marker(L, "/*KIN*/", 279);
  const block = [...L.slice(157 - 1, 158), ...L.slice(183 - 1, 278)].join("\n");
  const regs = runRegistry(block, { N: P.N, GUIDE_Y: P.GUIDE_Y, T: P.T });
  const ASM = asmLabels(L, 520, 524);
  const B = linesOf("build_plate.py");
  const QTY = [...bill(B, 5, "COMMON = ["), ...bill(B, 11, "KNOB_DRIVE  = ["), ...bill(B, 12, "SERVO_DRIVE = [")];
  const ids = new Set(QTY.map(([id]) => id));
  const rows = [];
  const notPrinted = new Set();
  let bought = 0;
  for (const [key, asm] of regs) {
    if (key === null) { bought++; continue; }
    const bare = key.replace(/_asm$/, "");
    const id = [key, bare, bare.replace(/_(row|col)$/, "")].find((k) => ids.has(k));
    if (id === undefined) { notPrinted.add(key); continue; }
    rows.push([id, asm, 1]);
  }
  return {
    viewer: "source/printed_viewer_template.html",
    asm: ASM,
    steps: tally(rows, QTY.map(([id]) => id)),
    unassigned: QTY.filter(([id]) => !rows.some(([p]) => p === id)).map(([id]) => id),
    notPrinted: [...notPrinted].sort(),
    bought,
    bill: Object.fromEntries(QTY),
  };
}

/** Every assigned count equals its bill, and every step indexes ASM. */
function check(a, name, r) {
  for (const [id, steps] of Object.entries(r.steps)) {
    const n = Object.values(steps).reduce((s, x) => s + x, 0);
    a.eq(`${name} ${id} count against its bill`, n, r.bill[id]);
    for (const s of Object.keys(steps)) a.ok(`${name} ${id} step ${s} inside ASM`, Number(s) >= 0 && Number(s) < r.asm.length);
  }
}

const argv = process.argv;
if (argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const a = new Asserts();
    const result = { lasercut: lasercut(), printed: printed() };
    check(a, "lasercut", result.lasercut);
    check(a, "printed", result.printed);
    // the M07-T09 card: 14 lasercut steps, 12 printed steps
    a.eq("lasercut ASM steps", result.lasercut.asm.length, 14);
    a.eq("printed ASM steps", result.printed.asm.length, 12);
    finish({
      record: "ogee16-steps",
      card: "M07-T09",
      out: "packages/nest/records/ogee16-steps.json",
      command: "node designs/ogee16/legacy/tools/extract-steps.mjs",
      qualifier: "computed: the reg(...) registries of viewer_template.html and printed_viewer_template.html run in node on stub THREE objects; counts held to cutfiles.py BOM and build_plate.py QTY",
      inputs: Object.fromEntries(Object.entries(PIN).map(([f, s]) => [src(f), s])),
    }, result, a);
    for (const k of ["lasercut", "printed"]) {
      const r = result[k];
      process.stdout.write(`${k}: ${r.asm.length} steps, ${Object.keys(r.steps).length} parts assigned, unassigned ${r.unassigned.join(", ") || "none"}\n`);
    }
  } catch (e) {
    process.stderr.write(`extract-steps: ${e.message}\n`);
    process.exit(1);
  }
}
