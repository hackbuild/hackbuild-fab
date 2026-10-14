// The merged check3d proves lead landings through its own placement
// transform: the SHUNT fixture passes, a rotated through-hole part and a
// part with its model removed and no stand-in flag both fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, "..");
const script = join(seed, "check3d.mjs");
const fixture = join(seed, "fixtures", "shunt-r1-sim.html");
const allow = join(seed, "fixtures", "shunt-r1-allow.json");

const run = (html) =>
  spawnSync(process.execPath, [script, html, "--allow", allow], { encoding: "utf8" });

const block = (name) => new RegExp(`(window\\.${name} = )(\\{[\\s\\S]*?\\})(;</script>)`);

// writes a copy of the fixture with SIM_DATA and SIM_MODELS passed through edit
const variant = (edit) => {
  const html = readFileSync(fixture, "utf8");
  const D = JSON.parse(html.match(block("SIM_DATA"))[2]);
  const M = JSON.parse(html.match(block("SIM_MODELS"))[2]);
  edit(D, M);
  const out = html
    .replace(block("SIM_DATA"), (_, a, _b, c) => a + JSON.stringify(D) + c)
    .replace(block("SIM_MODELS"), (_, a, _b, c) => a + JSON.stringify(M) + c);
  const dir = mkdtempSync(join(tmpdir(), "check3d-"));
  const path = join(dir, "sim.html");
  writeFileSync(path, out);
  return { path, done: () => rmSync(dir, { recursive: true, force: true }) };
};

test("SHUNT fixture passes with 55 lead landings at 0.000 mm", () => {
  const r = run(fixture);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout,
    /check3d OK: 28 parts, 10 real models, 55 lead landings at 0\.000 mm, 4 within a declared allowance, 3 declared stand-ins/);
  assert.match(r.stdout, /allowance SW2 <= 0\.12 mm/);
});

test("a through-hole part rotated by 90 degrees fails on lead landing", () => {
  let ref = null;
  const v = variant((D, M) => {
    const p = D.parts.find((q) => Array.isArray(q.pads) && q.pads.some((x) => x.thru)
      && (M[q.model ?? q.fp]?.leads || []).length);
    ref = p.ref;
    p.rot = (p.rot + 90) % 360;
  });
  try {
    const r = run(v.path);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stderr, new RegExp(`FAIL ${ref}: lead lands \\d+\\.\\d{3} mm from the nearest declared pad`));
  } finally { v.done(); }
});

test("a part with its model removed and no stand-in flag fails", () => {
  let ref = null;
  const v = variant((D, M) => {
    const p = D.parts.find((q) => !q.stand_in && M[q.model ?? q.fp]
      && D.parts.filter((o) => (o.model ?? o.fp) === (q.model ?? q.fp)).length === 1);
    ref = p.ref;
    delete M[p.model ?? p.fp];
  });
  try {
    const r = run(v.path);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stderr, new RegExp(`FAIL ${ref}: no model and not declared a stand-in`));
  } finally { v.done(); }
});
