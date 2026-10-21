// Records the TUMBLER legacy outputs the M06-T02 parity suite compares the
// port against (M06-T02 step 1). It evaluates the module library of the
// canonical original, lines 182 to 1733 of tumbler.html (everything before
// `const $=id=>document.getElementById`), plus `vals` (line 1800), under
// node with no DOM, after checking the file's sha256 against the
// lineage.json canonical row tumbler.bench/harvest. Nothing here is ported:
// the numbers come from the original's own functions.
//
//   node packages/mechanisms/test/legacy/record-tumbler.mjs
//
// writes packages/mechanisms/test/legacy/tumbler.json. Run it only after
// reading the diff of a changed original; the test reads the committed file.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { localSource } from "../../../../tools/test-support/originals-root.ts";
import vm from "node:vm";

const ROW = "tumbler.bench/harvest";
const repo = new URL("../../../../", import.meta.url);
const lineage = JSON.parse(readFileSync(new URL("lineage.json", repo), "utf8"));
const row = lineage.find((r) => r.id === ROW);
if (row === undefined) throw new Error(`lineage.json has no row ${ROW}`);
const bytes = readFileSync(localSource(row.source));
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (sha256 !== row.sha256) throw new Error(`${row.source}: sha256 ${sha256}, lineage ${row.sha256}`);
const lines = bytes.toString("utf8").split("\n");

const FIRST = 182;
const stop = lines.findIndex((l) => l.startsWith("const $=id=>document.getElementById"));
if (stop < 0) throw new Error("no `const $=id=>` line in the original");
const LAST = stop; // 1-based number of the last library line
const valsLine = lines.findIndex((l) => l.startsWith("function vals(m)")) + 1;
if (valsLine !== 1800) throw new Error(`vals() at line ${valsLine}, the card names 1800`);
const library = lines.slice(FIRST - 1, LAST).join("\n") + "\n" + lines[valsLine - 1];

// The cut file's sheet width, as planSVGFile (line 1763) passes it to packSheet.
const sheetW = Number(/const pk=packSheet\(parts,(\d+)\);/.exec(lines[1762])?.[1]);
if (!(sheetW > 0)) throw new Error("line 1763 is not planSVGFile's packSheet call");

const ctx = vm.createContext({ Math, Object, Array, Number, String, JSON });
vm.runInContext(`${library}\nthis.__=({MODS,MATS,G,SIMS,vals,partWarnings,packSheet});`, ctx);
const { MODS, MATS, G, SIMS, vals, partWarnings, packSheet } = ctx.__;

/** Every combination of 0 and 1 over keys, the first key the slowest. */
function combos(keys) {
  const out = [];
  for (let i = 0; i < 1 << keys.length; i++) out.push(Object.fromEntries(keys.map((k, j) => [k, (i >> (keys.length - 1 - j)) & 1])));
  return out;
}

/** The stateful sequences of the card table, M06-T02. */
const SEQUENCES = {
  latch: [{ S: 0, R: 0 }, { S: 1, R: 0 }, { S: 0, R: 0 }, { S: 0, R: 0 }, { S: 0, R: 1 }, { S: 0, R: 0 }],
  snap: [0, 1, 0, 1, 0].map((A) => ({ A })),
  ratch: [0, 1, 0, 1, 0, 1, 0].map((CK) => ({ CK })),
  drum: [0, 1, 0, 1, 0].map((CK) => ({ CK })),
};

/** All-zero inputs of SIMS, living hinge at A 1 (the bench default, line 1729). */
function zeroInputs(m) {
  const u = {};
  for (const s of SIMS[m.id] ?? []) u[s.k] = 0;
  if (m.id === "hinge") u.A = 1;
  return u;
}

const plain = (x) => JSON.parse(JSON.stringify(x));
const cases = [];
let mismatches = 0;
for (const [name, mat] of Object.entries(MATS)) {
  G.mat = name; G.t = mat.t; G.k = mat.k; G.E = mat.E;
  for (const m of MODS) {
    const p = vals(m);
    const parts = m.plan(p);
    const rec = {
      module: m.id, material: name,
      parts: parts.map((q) => ({ name: q.name, w: q.w, h: q.h, outer: q.outer, holes: q.holes, score: q.score })),
      warnings: parts.map((q) => partWarnings(q)),
      placed: packSheet(parts, sheetW).placed.map((o) => [o.x, o.y]),
      read: m.draw(p, zeroInputs(m), {}).read.map(([k, v]) => [k, String(v)]),
    };
    if (m.lg || m.id === "tumb") {
      const keys = (SIMS[m.id] ?? []).map((s) => s.k);
      rec.logic = combos(keys).map((u) => {
        const q = m.draw(p, u, {}).q > 0.5;
        const want = m.id === "tumb" ? u.KEY === 1 && u.WRONG === 0 : !!m.lg(keys.map((k) => u[k]));
        if (q !== want) mismatches++;
        return { inputs: u, q, want };
      });
    }
    if (m.id === "whif") rec.levels = combos(["B2", "B1", "B0"]).map((u) => m.draw(p, u, {}).q);
    const seq = SEQUENCES[m.id];
    if (seq !== undefined) {
      const st = {};
      rec.sequence = seq.map((u) => ({ inputs: u, q: m.draw(p, u, st).q }));
    }
    cases.push(plain(rec));
  }
}

const record = {
  source: { lineage: ROW, file: "files/tumbler.html", sha256, library: `${FIRST} to ${LAST}`, vals: valsLine, sheetW: { value: sheetW, line: 1763 } },
  fit: G.c,
  materials: Object.entries(MATS).map(([name, m]) => ({ name, t: m.t, k: m.k, E: m.E })),
  logicMismatches: mismatches,
  cases,
};
writeFileSync(new URL("tumbler.json", import.meta.url), `${JSON.stringify(record)}\n`);
const parts = cases.reduce((n, c) => n + c.parts.length, 0);
const warnings = cases.reduce((n, c) => n + c.warnings.flat().length, 0);
console.log(`cases ${cases.length} parts ${parts} warnings ${warnings} logic ${mismatches} mismatches`);
