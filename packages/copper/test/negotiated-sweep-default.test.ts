// M05-T08: default mode (Float64 history, D-092) on the 40 seed 1 sweep
// designs of PIP b137deb. Its counts, lengths and a sha256 over each
// design's nets are the committed golden of
// packages/copper/scripts/pip-default-golden.mjs; length deltas against
// PIP's legacy route are printed, not asserted. A design both modes route
// clean is also checked from its geometry alone. Every number is computed.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { ROUTE_CONSTANTS } from "../src/route/negotiated.js";
import { route } from "../src/route/index.js";
import { invariants } from "./invariants.js";

interface Case {
  i: number;
  input: { route: { w: number; clr: number; grid: number; via: number; margin: number; iters: number }; outline: [number, number][][]; nets: { name: string; terms: { x: number; y: number; r: number }[] }[] };
  output: { nets: { name: string; len: number }[]; conflicts: number; unrouted: number; iters: number };
}
interface Row { i: number; conflicts: number; unrouted: number; iters: number; vias: number; len: [string, number][]; nets: string; warnings: string[] }
const sweep = JSON.parse(readFileSync(new URL("./fixtures/pip-b137deb-sweep-route.json", import.meta.url), "utf8")) as { cases: Case[] };
const golden = JSON.parse(readFileSync(new URL("./golden/pip-b137deb-default.json", import.meta.url), "utf8")) as { sweep: Row[] };
const profile = createProfileLookup(loadProfile());
const pad = profile.constant(ROUTE_CONSTANTS.zonePad).value;
const sha = (v: unknown): string => createHash("sha256").update(JSON.stringify(v)).digest("hex");

describe("default mode on the PIP b137deb seed 1 sweep", () => {
  test("the golden holds one row per sweep design", () => {
    expect(golden.sweep.map((r) => r.i)).toEqual(sweep.cases.map((c) => c.i));
  });

  test.each(sweep.cases.map((c) => [c.i, c] as const))("design %i equals the golden", (i, c) => {
    const s = c.input.route;
    const d = route({ outline: c.input.outline, nets: c.input.nets, settings: { w: s.w, clr: s.clr, grid: s.grid, via: s.via, margin: s.margin, iters: s.iters } }, profile);
    const row: Row = {
      i, conflicts: d.conflicts, unrouted: d.unrouted, iters: d.iters, vias: d.nets.reduce((a, n) => a + n.vias.length, 0),
      len: d.nets.map((n) => [n.name, n.len]),
      nets: sha(d.nets.map((n) => ({ name: n.name, polys: n.polys, stubs: n.stubs, vias: n.vias, fails: n.fails, len: n.len }))),
      warnings: d.warnings.map((w) => w.code),
    };
    expect(row).toEqual(golden.sweep.find((r) => r.i === i));
    expect(row.warnings.length > 0).toBe(d.conflicts > 0 || d.unrouted > 0);
    if (d.conflicts === 0 && d.unrouted === 0) {
      const { minGap, split } = invariants(d);
      expect(split).toEqual([]);
      expect(minGap).toBeGreaterThanOrEqual(s.w + s.clr + pad - 1e-9);
    }
    const moved = d.nets.map((n, k) => [n.name, n.len - c.output.nets[k]!.len] as const).filter(([, v]) => Math.abs(v) >= 0.005);
    const legacy = c.output;
    if (moved.length || d.iters !== legacy.iters || d.conflicts !== legacy.conflicts || d.unrouted !== legacy.unrouted) {
      // informational, not asserted (computed)
      process.stdout.write(`design ${i} default against legacy: iters ${d.iters} against ${legacy.iters}, conflicts ${d.conflicts} against ${legacy.conflicts}, unrouted ${d.unrouted} against ${legacy.unrouted}, length deltas mm ${moved.map(([n, v]) => `${n} ${v.toFixed(2)}`).join(", ") || "none"}\n`);
    }
  });
});
