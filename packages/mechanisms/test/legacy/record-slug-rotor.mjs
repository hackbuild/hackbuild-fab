// Records the legacy record of capsule-pocket-rotor's bodies from SLUG's
// canonical originals (the originals rule, M06-T06). Each file's sha256 is
// checked against its lineage.json row first.
//
//   slug.scad (slug.scad/slug-12): the assignments of lines 20 to 68
//     evaluated in order, the way record-originals.mjs evaluates them
//     (OpenSCAD is not on this machine).
//   slug.html (slug.bench/slug-12): OUTLINES, line 272, the 46 parts bake.py
//     rendered through OpenSCAD from slug.scad (bake.py: SVG at 6
//     significant digits, y flipped, rounded to 0.1, loops sorted by area);
//     PART_QTY, lines 1042 to 1050; the part gap field, line 176.
//   audit.py (slug.audit/slug-12): run as written under tools/py, except
//     that it reads the bake output from files/extracted/outlines.json
//     (byte-equal to OUTLINES, checked here) in place of /tmp/outlines.json.
//
//   node packages/mechanisms/test/legacy/record-slug-rotor.mjs
//
// writes reference/sheet/capsule-rotor-cage/expected/legacy.json.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const repo = new URL("../../../../", import.meta.url);
const lineage = JSON.parse(readFileSync(new URL("lineage.json", repo), "utf8"));
const sha = (b) => createHash("sha256").update(b).digest("hex");

function pinned(id) {
  const row = lineage.find((r) => r.id === id);
  if (row === undefined) throw new Error(`lineage.json has no row ${id}`);
  const bytes = readFileSync(row.source);
  if (sha(bytes) !== row.sha256) throw new Error(`${row.source}: sha256 ${sha(bytes)}, lineage ${row.sha256}`);
  const text = bytes.toString("utf8");
  return { text, lines: text.split("\n"), source: row.source, sha256: row.sha256, lineage: id };
}

const PARTS = ["rotor_gear_a", "rotor_gear_b", "rotor_ring", "rotor_top", "spacer_a", "spacer_b"];

// ---- slug.scad ----
const scad = pinned("slug.scad/slug-12");
if (scad.lines[19].trim() !== "$fn   = 72;") throw new Error("slug.scad line 20 is not $fn = 72");
const env = { $fn: 72 };
for (const line of scad.lines.slice(20, 68)) {
  const stmt = line.replace(/\/\/.*$/, "").trim();
  for (const part of stmt.split(";")) {
    const m = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(part.trim());
    if (m === null) continue;
    env[m[1]] = vm.runInNewContext(m[2], { ...env });
  }
}
const KEYS = ["$fn", "t", "slop", "cap_d", "pock_d", "pock_rc", "npock", "gm", "gz_rot", "gz_pin", "gpa", "rot_h", "rot_gear_n", "rot_ring_z", "rot_top_z", "spc_r", "spc_n", "spc_w", "spc_body", "spc_gap1", "spc_gap2", "rot_bore", "tie_r", "tie_r2", "tie_d"];
const values = Object.fromEntries(KEYS.map((k) => {
  if (typeof env[k] !== "number") throw new Error(`slug.scad: ${k} did not evaluate`);
  return [k, env[k]];
}));

// ---- slug.html ----
const html = pinned("slug.bench/slug-12");
const l272 = html.lines[271];
if (!l272.startsWith("const OUTLINES=JSON.parse('")) throw new Error("slug.html line 272 is not OUTLINES");
const blob = l272.slice(l272.indexOf("JSON.parse('") + 12, l272.lastIndexOf("')"));
const OUTLINES = JSON.parse(blob);
const filesDir = scad.source.replace(/slug\.scad$/, "");
const extractedPath = `${filesDir}extracted/outlines.json`;
const extracted = readFileSync(extractedPath);
if (JSON.stringify(JSON.parse(extracted.toString("utf8"))) !== JSON.stringify(OUTLINES)) throw new Error("extracted/outlines.json differs from OUTLINES");
const qtyText = html.lines.slice(1041, 1050).join("\n");
if (!qtyText.startsWith("const PART_QTY={")) throw new Error("slug.html line 1042 is not PART_QTY");
const PART_QTY = vm.runInNewContext(`(${qtyText.slice("const PART_QTY=".length).replace(/;\s*$/, "")})`);
const gapLine = html.lines[175];
const gap = Number(/id="nGap" value="(\d+)"/.exec(gapLine)?.[1]);
if (!Number.isFinite(gap)) throw new Error("slug.html line 176 is not the part gap field");
const parts = PARTS.map((name) => ({ name, qty: PART_QTY[name], loops: OUTLINES[name] }));

// ---- audit.py ----
const audit = pinned("slug.audit/slug-12");
if (!audit.text.includes("open('/tmp/outlines.json')")) throw new Error("audit.py no longer reads /tmp/outlines.json");
const src = audit.text.replace("open('/tmp/outlines.json')", `open('${extractedPath}')`);
const stdout = execFileSync("uv", ["run", "--project", new URL("tools/py", repo).pathname, "python", "-"], { cwd: filesDir, input: src, encoding: "utf8" });
const row = (label) => {
  const line = stdout.split("\n").find((l) => l.trim().startsWith(label));
  if (line === undefined) throw new Error(`audit.py printed no row "${label}"`);
  return line.trim();
};
const auditRows = {
  rim: row("rim between pocket and tooth root"),
  web: row("web between adjacent pockets"),
  pocketClearance: row("pocket clearance per side"),
  slot: row("tab slot vs stock"),
};

const record = {
  mechanism: "capsule-pocket-rotor",
  source: {
    lineage: scad.lineage, file: "files/slug.scad", sha256: scad.sha256, lines: "20 to 68, 171 to 213",
    bench: { lineage: html.lineage, file: "files/slug.html", sha256: html.sha256, outlines: 272, partQty: "1042 to 1050", gap: 176 },
    audit: { lineage: audit.lineage, file: "files/audit.py", sha256: audit.sha256, outlines: "files/extracted/outlines.json" },
    recorder: "packages/mechanisms/test/legacy/record-slug-rotor.mjs",
    bake: "files/bake.py: openscad SVG export, 6 significant digits, y flipped, rounded to 0.1 mm, loops sorted by area",
  },
  values,
  gap,
  parts,
  audit: { rows: auditRows, stdout },
};
writeFileSync(new URL("reference/sheet/capsule-rotor-cage/expected/legacy.json", repo), `${JSON.stringify(record)}\n`);
console.log(JSON.stringify({ values, gap, qty: parts.map((p) => [p.name, p.qty, p.loops.length]), auditRows }));
