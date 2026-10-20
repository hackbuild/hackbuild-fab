// The knowledge ratchet (knowledge/README.md, CLAUDE.md: check knowledge/03-diagnostics.md
// first). A fault met while building must reach the diagnostics index, and what the index cites
// must still be there. Added by the implementation audit of 2026-10-06 (finding: M00 and M-S
// faults A, B and C, the D-054 snap welds and the earcut edge flip never reached knowledge).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const diagnosticsPath = join(root, "knowledge", "03-diagnostics.md");
const diagnostics = readFileSync(diagnosticsPath, "utf8");
const notes = join(root, ".hbf-notes");

/** Table rows of the diagnostics file, cells trimmed, header and rule rows left out. */
function rows(text) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.slice(1, line.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
    if (cells.every((c) => /^-+$/.test(c))) continue;
    if (cells[0] === "symptom") continue;
    out.push({ line, cells });
  }
  return out;
}

const faultLabel = /\b(M-?S|M-1|M\d\d)-T(\d\d) fault ([A-Z])\b/g;
const labelsIn = (text) => new Set([...text.matchAll(faultLabel)].map((m) => `${m[1]}-T${m[2]} fault ${m[3]}`));
const recorded = labelsIn(diagnostics);

/** Tokens that name code: camelCase, snake or upper snake, or a double-quoted word. */
function codeTokens(text) {
  const out = new Set();
  for (const m of text.matchAll(/\b[a-z]+[A-Z][A-Za-z0-9]*\b|\b[A-Za-z]+_[A-Za-z0-9_]+\b|"([A-Za-z_][\w-]*)"/g)) out.add(m[1] ?? m[0]);
  return out;
}

test("every diagnostics row has a symptom, a cause and a fix", () => {
  const all = rows(diagnostics);
  assert.ok(all.length >= 88, `expected the full index, read ${all.length} rows`);
  for (const { line, cells } of all) {
    assert.equal(cells.length, 3, `three cells: ${line.slice(0, 80)}`);
    for (const c of cells) assert.ok(c.length > 0, `empty cell: ${line.slice(0, 80)}`);
  }
});

test("an OPEN diagnostics row says how to replay it", () => {
  const open = rows(diagnostics).filter((r) => r.cells[0].includes("OPEN"));
  assert.ok(open.length >= 2, "faults B and C of M00-T06 are recorded as OPEN");
  for (const { cells } of open) {
    assert.ok(cells[2].startsWith("OPEN"), `the fix cell of an OPEN row starts with OPEN: ${cells[0].slice(0, 60)}`);
    assert.ok(/\b(Replay|Repro)\b/.test(cells[2]), `an OPEN row names a replay or repro: ${cells[0].slice(0, 60)}`);
  }
});

test("each file:line a diagnostics row cites exists and names what the row names", () => {
  // Every stale citation is collected before failing, so one run names all of them.
  let cited = 0;
  const stale = [];
  for (const { line } of rows(diagnostics)) {
    const tokens = codeTokens(line);
    for (const m of line.matchAll(/`((?:packages|core|tools|designs|reference)\/[^`:\s]+):(\d+)`/g)) {
      cited++;
      const file = join(root, m[1]);
      if (!existsSync(file)) { stale.push(`${m[1]} does not exist`); continue; }
      const lines = readFileSync(file, "utf8").split("\n");
      const n = Number(m[2]);
      if (!(n >= 1 && n <= lines.length)) { stale.push(`${m[1]}:${n} is outside the file (${lines.length} lines)`); continue; }
      const target = lines[n - 1];
      const shared = [...tokens].filter((t) => target.includes(t));
      if (shared.length === 0) stale.push(`${m[1]}:${n} reads '${target.trim()}' and shares no code name with its row; repoint the citation`);
    }
  }
  assert.deepEqual(stale, [], stale.join("\n"));
  assert.ok(cited >= 7, `the Mesh kernel rows cite their code, read ${cited} citations`);
});

test("a fault label cited in code or tests has a diagnostics row", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|mjs|js|py)$/.test(name)) files.push(p);
    }
  };
  for (const d of ["packages", "core", "tools"]) if (existsSync(join(root, d))) walk(join(root, d));
  const self = relative(root, import.meta.filename);
  const citing = new Set();
  for (const f of files) {
    if (relative(root, f) === self) continue;
    for (const label of labelsIn(readFileSync(f, "utf8"))) {
      citing.add(relative(root, f));
      assert.ok(recorded.has(label), `${relative(root, f)} cites '${label}' and knowledge/03-diagnostics.md has no row for it`);
    }
  }
  assert.ok(citing.has(join("packages", "mesh", "test", "sweep.property.ts")), "packages/mesh/test/sweep.property.ts cites M00-T06 fault C beside its hole bounds");
});

test("a fault named in a milestone report has a diagnostics row", { skip: !existsSync(notes) && "no .hbf-notes on this host" }, () => {
  for (const name of readdirSync(notes).filter((f) => f.endsWith("-report.md"))) {
    let card = null;
    for (const line of readFileSync(join(notes, name), "utf8").split("\n")) {
      const h = /^### (M-?S|M-1|M\d\d)-T(\d\d)\b/.exec(line);
      if (h) card = `${h[1]}-T${h[2]}`;
      const f = /^- Fault ([A-Z]):/.exec(line);
      if (f && card !== null) {
        const label = `${card} fault ${f[1]}`;
        assert.ok(recorded.has(label), `${name} names ${label}; add a row to knowledge/03-diagnostics.md (OPEN when unfixed)`);
      }
    }
  }
});

test("the mesh kernel record names the zero-area repairs and the manifold-3d caveat", () => {
  const kernel = readFileSync(join(root, "knowledge", "kernels", "mesh-kernel.md"), "utf8");
  for (const [name, file] of [["flipDegenerate", "packages/geom/src/earcut.ts"], ["snapWeld", "packages/mesh/src/hash.ts"]]) {
    assert.ok(kernel.includes(`\`${name}\``) && kernel.includes(file), `mesh-kernel.md names ${name} in ${file}`);
    assert.ok(new RegExp(`function ${name}\\b`).test(readFileSync(join(root, file), "utf8")), `${file} still defines ${name}`);
  }
  assert.ok(kernel.includes("M00-T06 fault C") && kernel.includes("status()"), "mesh-kernel.md carries the status() caveat of fault C");
});

test("the 3MF dialect lists every scalar key the writer emits", () => {
  const dialect = readFileSync(join(root, "knowledge", "kernels", "3mf-dialect.md"), "utf8");
  // The writer is the vendored hackbuild-3mf build (R1-engine-03); npm installs it from tools/vendor.
  const src = readFileSync(join(root, "node_modules", "hackbuild-3mf", "dist", "writer", "settings.js"), "utf8");
  const list = /export const SCALAR_KEYS = \[([^\]]*)\]/.exec(src);
  assert.ok(list, "SCALAR_KEYS in node_modules/hackbuild-3mf/dist/writer/settings.js");
  const keys = [...list[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(keys.includes("curr_bed_type"), "the writer emits curr_bed_type");
  for (const k of keys) assert.ok(dialect.includes(`\`${k}\``), `3mf-dialect.md names the scalar key ${k}`);
});

// Added by the M04 audit of 2026-10-08 (findings: the 577 mm3 figure D-233 retired still stood as
// check_sweep.py provenance in knowledge/designs/ogee16.md; pip.md cited layout.js:234 for the key
// floor that layout.js line 231 computes; the two virtual print faults of D-236 and D-237 never
// reached the diagnostics index or the 3MF dialect).
const decisions = readFileSync(join(root, "docs", "plan", "DECISIONS.md"), "utf8");
const originals = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals";

function walkFiles(dir, keep, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkFiles(p, keep, out);
    else if (keep(name)) out.push(p);
  }
  return out;
}

/** The six-row body of one decision entry, read from the living log. */
function decision(id) {
  const at = decisions.indexOf(`\n### ${id} `);
  assert.ok(at >= 0, `DECISIONS.md has ${id}`);
  const end = decisions.indexOf("\n### ", at + 1);
  return decisions.slice(at, end < 0 ? undefined : end);
}

test("a figure a decision retires stands in knowledge only beside that decision", () => {
  // Headings of the form '### D-### <what> <number> <unit> is retired'.
  const retired = [...decisions.matchAll(/^### (D-\d+) .*?(\d+(?:\.\d+)?) (mm3|mm2|mm|N|g|s) is retired$/gm)];
  assert.ok(retired.some((m) => m[1] === "D-233"), "D-233 retires OGEE16 577 mm3");
  const stale = [];
  for (const f of walkFiles(join(root, "knowledge"), (n) => n.endsWith(".md"))) {
    readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      for (const [, id, num, unit] of retired) {
        if (new RegExp(`(?<![\\d.])${num.replace(".", "\\.")} ${unit}\\b`).test(line) && !line.includes(id)) {
          stale.push(`${relative(root, f)}:${i + 1} gives ${num} ${unit} without ${id}`);
        }
      }
    });
  }
  assert.deepEqual(stale, [], stale.join("\n"));
});

test("a design record's formula citation lands on the source line that computes it", { skip: !existsSync(originals) && "originals not on this host" }, () => {
  // Pattern: `<formula with =>` (`<file>:<n>`) with that file cited once in the parenthesis.
  // The cited line must carry at least one identifier of the formula.
  let checked = 0;
  const stale = [];
  for (const f of readdirSync(join(root, "knowledge", "designs")).filter((n) => n.endsWith(".md"))) {
    const files = join(originals, f.slice(0, -3), "files");
    if (!existsSync(files)) continue;
    const text = readFileSync(join(root, "knowledge", "designs", f), "utf8");
    const repo = /^\| REPO \| `([^`]+)`/m.exec(text);
    const all = walkFiles(files, () => true).filter((p) => !repo || p.startsWith(repo[1]));
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(/`([^`]*=[^`]*)` \(`([\w.-]+\.\w+):(\d+)`(?:\)|, `(?!:))/g)) {
        const [, formula, file, n] = m;
        const cands = all.filter((p) => p.endsWith(`/${file}`));
        if (cands.length !== 1) continue;
        checked++;
        const target = readFileSync(cands[0], "utf8").split("\n")[Number(n) - 1] ?? "";
        const names = [...formula.matchAll(/[A-Za-z_]\w+/g)].map((x) => x[0]).filter((t) => !/^(x|max|min|sqrt)$/.test(t));
        if (!names.some((t) => target.includes(t))) stale.push(`${f}:${i + 1} cites ${file}:${n} for '${formula}', which reads '${target.trim()}'`);
      }
    });
  }
  assert.deepEqual(stale, [], stale.join("\n"));
  assert.ok(checked >= 10, `formula citations checked: ${checked}`);
});

test("a diagnosed virtual print fault has a diagnostics row", () => {
  // D-236: PETG internal bridge in the TPU key tops; D-237: the headless CLI SIGSEGV on the
  // writer's 3MF. A later fault decision adds its id here.
  for (const id of ["D-236", "D-237"]) {
    assert.match(decision(id), /\| Status \| decided \|/, `${id} is decided`);
    assert.ok(rows(diagnostics).some((r) => r.line.includes(id)), `knowledge/03-diagnostics.md has a row citing ${id}`);
  }
});

test("the 3MF dialect says how a headless slice gets the keys the writer leaves out", () => {
  const dialect = readFileSync(join(root, "knowledge", "kernels", "3mf-dialect.md"), "utf8");
  const body = decision("D-237");
  const left = /does not add ([^.|]*)/.exec(body);
  assert.ok(left, "D-237 names the keys the writer does not add");
  const keys = [...left[1].matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
  assert.equal(keys.length, 3, `D-237 names three keys: ${keys.join(", ")}`);
  for (const k of keys) assert.ok(dialect.includes(`\`${k}\``), `3mf-dialect.md names ${k}`);
  assert.ok(dialect.includes("tools/slice/slice.mjs") && dialect.includes("D-237"), "3mf-dialect.md names the slice harness and D-237");
  assert.ok(existsSync(join(root, "tools", "slice", "slice.mjs")), "tools/slice/slice.mjs exists");
});
