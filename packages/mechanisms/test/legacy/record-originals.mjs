// Records the legacy numbers of the non-TUMBLER, non-KNURL, non-STANCHION
// mechanisms from their canonical originals (M06-T03, M06-T05, the
// originals rule): each file's sha256 is checked against its lineage.json
// row first, and every number comes from running the original's own code.
//
//   STIPPLE R17b and R17: the page's DATA block and its kinematics lines
//     125 to 171 (link, rodState, crankPhi), evaluated in node; link() at
//     half and full select.
//   OGEE16 R16-P: kin.py run as written (uv run --project tools/py), its
//     __main__ readout captured as text.
//   PINTLE R6: the P dict of pintle_parts.py lines 19 to 69 executed in
//     Python (the rest imports trimesh and builds meshes).
//   SLUG: the top-level assignments of slug.scad, lines 24 to 46, evaluated
//     in order the way kin.py's load_params evaluates params.scad (OpenSCAD
//     is not on this machine).
//   PLINTH: the snap strain statement of plinth.html lines 2927 to 2928 run
//     on the page's ST.snap defaults, lines 2553 to 2554.
//
//   node packages/mechanisms/test/legacy/record-originals.mjs
//
// writes packages/mechanisms/test/legacy/originals.json.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { localSource } from "../../../../tools/test-support/originals-root.ts";
import vm from "node:vm";

const repo = new URL("../../../../", import.meta.url);
const lineage = JSON.parse(readFileSync(new URL("lineage.json", repo), "utf8"));

/** The bytes of a lineage row's source after its sha256 check. */
function pinned(id) {
  const row = lineage.find((r) => r.id === id);
  if (row === undefined) throw new Error(`lineage.json has no row ${id}`);
  const bytes = readFileSync(localSource(row.source));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== row.sha256) throw new Error(`${row.source}: sha256 ${sha256}, lineage ${row.sha256}`);
  return { text: bytes.toString("utf8"), lines: bytes.toString("utf8").split("\n"), source: row.source, sha256, lineage: id };
}
const at = (f, line) => {
  if (!f.lines[line - 1].trim()) throw new Error(`${f.source} line ${line} is blank`);
  return f.lines[line - 1];
};

// ---- STIPPLE ----
function stipple(id) {
  const f = pinned(id);
  if (!at(f, 125).startsWith("const P = DATA.P")) throw new Error(`${f.source}: line 125 is not the kinematics block`);
  const data = f.text.slice(f.text.indexOf("const DATA=") + "const DATA=".length);
  const DATA = JSON.parse(data.slice(0, data.indexOf("</script>")).replace(/;\s*$/, ""));
  const ctx = vm.createContext({ Math, DATA });
  vm.runInContext(`${f.lines.slice(124, 171).join("\n")}\nthis.__ = { link, P };`, ctx);
  const { link, P } = ctx.__;
  const S = P.STROKE;
  const half = link(0, 0, [S], [0]);
  const full = link(0, 0, [S], [S]);
  return {
    source: { lineage: f.lineage, sha256: f.sha256, lines: "125 to 171", fn: "link" },
    P: Object.fromEntries(["STROKE", "CROWN_R", "CROWN_TOP", "NOSE_R", "BOSS_R", "LINK_L", "RT_FLOOR", "CT_FLOOR"].map((k) => [k, P[k]])),
    half: { thetaDeg: (half.theta * 180) / Math.PI, crown: half.crown, rise: half.crown - P.CROWN_TOP },
    full: { thetaDeg: (full.theta * 180) / Math.PI, crown: full.crown, rise: full.crown - P.CROWN_TOP },
  };
}

// ---- OGEE16 ----
function ogee16() {
  const kin = pinned("ogee16.kin/r16p");
  const params = pinned("ogee16.params/r16p");
  const out = execFileSync("uv", ["run", "--project", "tools/py", "python", kin.source], { cwd: new URL(".", repo).pathname, encoding: "utf8" });
  const num = (re) => Number(re.exec(out)?.[1]);
  return {
    source: { lineage: kin.lineage, sha256: kin.sha256, params: { lineage: params.lineage, sha256: params.sha256 }, fn: "__main__ readout", lines: "144 to 166" },
    stdout: out,
    printed: {
      cam: num(/CAM needed\s+(-?[\d.]+)/), camLift: num(/cam lift\s+(-?[\d.]+)/), fullRise: num(/full select rise\s+(-?[\d.]+)/),
      halfRise: num(/half select rise\s+(-?[\d.]+)/), margin: num(/margin\s+(-?[\d.]+)/), overshoot: num(/overshoot\s+(-?[\d.]+)/),
    },
  };
}

// ---- PINTLE ----
function pintle() {
  const f = pinned("pintle.parts/r6");
  const block = f.lines.slice(18, 69).join("\n");
  if (!block.startsWith("P = {}")) throw new Error(`${f.source}: line 19 is not the P dict`);
  const py = `${block}\nimport json\nprint(json.dumps(P))\n`;
  const out = execFileSync("uv", ["run", "--project", "tools/py", "python", "-c", py], { cwd: new URL(".", repo).pathname, encoding: "utf8" });
  const P = JSON.parse(out);
  return { source: { lineage: f.lineage, sha256: f.sha256, lines: "19 to 69", fn: "P" }, P: Object.fromEntries(["r_j", "flange_t", "r_bore", "r_rboss", "cl_journal", "cl_thrust", "sv_spline_d"].map((k) => [k, P[k]])) };
}

// ---- SLUG ----
function slug() {
  const f = pinned("slug.scad/slug-12");
  const env = {};
  for (const line of f.lines.slice(23, 46)) {
    const stmt = line.replace(/\/\/.*$/, "").trim();
    for (const part of stmt.split(";")) {
      const m = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(part.trim());
      if (m === null) continue;
      env[m[1]] = vm.runInNewContext(m[2], { ...env });
    }
  }
  return { source: { lineage: f.lineage, sha256: f.sha256, lines: "24 to 46", fn: "top-level assignments" }, values: Object.fromEntries(["cap_d", "pock_d", "npock", "gm", "gz_rot", "gz_pin", "CD", "RATIO", "rot_h"].map((k) => [k, env[k]])) };
}

// ---- PLINTH ----
function plinth() {
  const f = pinned("plinth.bench/plinth-html");
  const stmt = [at(f, 2927), at(f, 2928)].join("\n");
  if (!/const free = ST\.snap\.lip - ST\.snap\.root;/.test(stmt)) throw new Error(`${f.source}: lines 2927 to 2928 moved`);
  const defaults = vm.runInNewContext(`({${f.lines.slice(2552, 2554).join("\n").replace(/^\s*snap:\s*/, "snap: ").replace(/,\s*$/, "")}})`);
  const ctx = vm.createContext({ ST: defaults });
  vm.runInContext(`${stmt}\nthis.__ = { free, strain };`, ctx);
  return { source: { lineage: f.lineage, sha256: f.sha256, lines: "2927 to 2928", defaults: "2553 to 2554" }, snap: defaults.snap, free: ctx.__.free, strain: ctx.__.strain };
}

const record = {
  stipple: { r17b: stipple("stipple.kin/r17b"), r17: stipple("stipple.bench/r17") },
  ogee16: ogee16(),
  pintle: pintle(),
  slug: slug(),
  plinth: plinth(),
};
writeFileSync(new URL("originals.json", import.meta.url), `${JSON.stringify(record, null, 1)}\n`);
console.log(JSON.stringify({ stipple: [record.stipple.r17b.half, record.stipple.r17.half], ogee16: record.ogee16.printed, slug: record.slug.values, plinth: record.plinth.strain, pintle: record.pintle.P }));
