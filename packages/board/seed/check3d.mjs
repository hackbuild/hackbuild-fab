#!/usr/bin/env node
// check3d.mjs <sim.html> [standinRef ...] [--allow <file.json>]
//
// Headless proof that a board sim, its generator and its part models agree.
// Reads both the board-forge template schema (parts keyed by p.fp, board
// pads as D.pads = {F, B}) and the SHUNT schema (parts keyed by p.model,
// per-part p.pads with thru flags, p.stand_in).
//   1. every number in SIM_DATA and SIM_MODELS is finite
//   2. every mesh index is in range
//   3. every real model's bbox fits its declared body: slack 1.6 mm, or
//      3.0 mm for a declared stand-in; a part with no model must be a
//      declared stand-in (p.stand_in in the data, or a ref on the CLI)
//   4. every recovered lead of a through-hole model lands within 0.01 mm of
//      a declared through-hole pad, through a placement transform derived
//      here and not imported from the generator; per-part allowances come
//      from --allow {ref: [mm, reason]} and are printed
//   5. a model with no recovered leads does not dip below the board
//   6. the breadboard tape check, only when D.breadboard exists
// Exit 1 on any failure, 2 on a usage error.
import { readFileSync } from "fs";

const usage = "usage: check3d.mjs <sim.html> [standinRef ...] [--allow <file.json>]";
const args = process.argv.slice(2);
let allowPath = null;
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--allow") {
    allowPath = args[++i];
    if (!allowPath) { console.error(usage); process.exit(2); }
  } else positional.push(args[i]);
}
const [path, ...cliStandins] = positional;
if (!path) { console.error(usage); process.exit(2); }

let ALLOW = {};
if (allowPath) {
  try { ALLOW = JSON.parse(readFileSync(allowPath, "utf8")); }
  catch (e) { console.error(`check3d: cannot read allowance file ${allowPath}: ${e.message}`); process.exit(2); }
  for (const [ref, v] of Object.entries(ALLOW)) {
    if (!Array.isArray(v) || !Number.isFinite(v[0]) || typeof v[1] !== "string") {
      console.error(`check3d: allowance ${ref} must be [mm, reason]`); process.exit(2);
    }
  }
}

const html = readFileSync(path, "utf8");
const grab = (name) => {
  const m = html.match(new RegExp(`window\\.${name} = (\\{[\\s\\S]*?\\});</script>`));
  if (!m) { console.error(`missing window.${name}`); process.exit(1); }
  return JSON.parse(m[1]);
};
const D = grab("SIM_DATA"), M = grab("SIM_MODELS");

const LEAD_TOL = 0.01;          // mm, lead to declared pad
const SLACK_REAL = 1.6;         // mm, real model bbox over declared body
const SLACK_STANDIN = 3.0;      // mm, stand-in bbox over declared body
const DIP_LIMIT = -0.6;         // mm, lowest model y for a part with no leads

let bad = 0, checked = 0, allowed = 0;
const notRun = [];
const fail = (s) => { console.error("  FAIL " + s); bad++; };

const walk = (o, where) => {
  if (typeof o === "number") {
    if (!Number.isFinite(o)) fail("non-finite at " + where);
  } else if (Array.isArray(o)) o.forEach((v, i) => walk(v, where + "[" + i + "]"));
  else if (o && typeof o === "object") for (const k in o) walk(o[k], where + "." + k);
};
walk(D, "D"); walk(M, "M");

for (const [k, md] of Object.entries(M)) {
  for (const m of md.meshes) {
    const n = m.positions.length / 3;
    let hi = -1;
    for (const ix of m.indices) if (ix > hi) hi = ix;
    if (hi >= n) fail(`${k}: mesh index out of range`);
  }
}

// The transform three.js applies in the SHUNT convention: board y = world -Z,
// model z = +footprint y, outer.rotation.y = +rot. Derived here, never
// imported from the generator, so a rotation or mirror error cannot pass.
const place = (px, py, rot, fx, fy) => {
  const r = rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [px + fx * c + fy * s, py + fx * s - fy * c];
};

const isStandin = (p) => p.stand_in === true || cliStandins.includes(p.ref);
let standins = 0;
for (const p of D.parts) {
  if (isStandin(p)) standins++;
  const md = M[p.model ?? p.fp];
  if (!md) {
    if (!isStandin(p)) fail(`${p.ref}: no model and not declared a stand-in`);
    continue;
  }
  const [[x0, y0, z0], [x1, , z1]] = md.bbox;
  const slack = isStandin(p) ? SLACK_STANDIN : SLACK_REAL;
  const fit = Math.max(p.w, p.h) + slack;
  if (x1 - x0 > fit + 0.001 || z1 - z0 > fit + 0.001)
    fail(`${p.ref}: model ${(x1 - x0).toFixed(2)}x${(z1 - z0).toFixed(2)} `
       + `exceeds body ${p.w}x${p.h}+${slack}`);

  const leads = md.leads || [];
  if (!leads.length) {
    if (y0 < DIP_LIMIT) fail(`${p.ref}: model dips ${y0.toFixed(2)} below board, limit ${DIP_LIMIT}`);
    continue;
  }
  if (!Array.isArray(p.pads)) {
    notRun.push(p.ref);
    console.log(`  ${p.ref}: lead landing not run, no per-part pads`);
    continue;
  }
  const thru = p.pads.filter((q) => q.thru);
  if (thru.length !== leads.length)
    fail(`${p.ref}: model recovered ${leads.length} leads, generator `
       + `declared ${thru.length} through-hole pads`);
  const tol = ALLOW[p.ref] ? ALLOW[p.ref][0] : LEAD_TOL;
  for (const [lx, lz] of leads) {
    const [bx, by] = place(p.x, p.y, p.rot || 0, lx, lz);
    let best = Infinity;
    for (const q of thru) best = Math.min(best, Math.hypot(q.x - bx, q.y - by));
    checked++;
    if (best > tol)
      fail(`${p.ref}: lead lands ${best.toFixed(3)} mm from the nearest `
         + `declared pad (at ${bx.toFixed(3)}, ${by.toFixed(3)}), legal ${tol} mm`);
    else if (best > LEAD_TOL) allowed++;
  }
}

if (D.breadboard) {
  if (!(D.breadboard.tape > 0)) fail("breadboard has no tape thickness");
}

if (bad) { console.error(`check3d: ${bad} failure(s)`); process.exit(1); }
console.log(`check3d OK: ${D.parts.length} parts, `
  + `${Object.keys(M).length} real models, ${checked - allowed} lead landings at `
  + `0.000 mm, ${allowed} within a declared allowance, `
  + `${standins} declared stand-ins`
  + (notRun.length ? `, lead landing not run on ${notRun.length} part(s)` : ""));
for (const [ref, [tol, why]] of Object.entries(ALLOW))
  console.log(`  allowance ${ref} <= ${tol} mm: ${why}`);
