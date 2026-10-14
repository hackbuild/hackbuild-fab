// M08-T06 direct-emit adapter: the SPINDLE R1 generator runs through uv,
// its record validates after withHash stamps it, and the counts are the
// Records table's (computed, scratch run of pcb.py, 2026-10-04): 19 nets,
// 70 pads (55 component pads plus 15 vias), 57 holes (42 drilled pads plus
// 15 vias), tightest 0.32 mm against 0.25. A copy with CLR = 0.40 refuses,
// and its gate lines come back as the failure.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { boardMetrics, directArgs, directFailure, directSuccess, type DirectResult } from "../src/index";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const GEN = path.join(ROOT, "reference", "boards", "spindle-r1", "gen.py");
const EPOCH = 315532800;
const work = mkdtempSync(path.join(tmpdir(), "hbf-direct-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

function run(generator: string, out: string): DirectResult {
  const r = spawnSync("uv", directArgs(path.join(ROOT, "tools", "py"), generator, out, EPOCH), {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, PYTHONPATH: path.join(ROOT, "tools", "py", "board") },
  });
  if (r.status !== 0) return directFailure(r.status ?? 1, r.stdout, r.stderr);
  const files = readdirSync(out).filter((n) => n !== "record.json" && n !== "gates.json" && statSync(path.join(out, n)).isFile())
    .map((name) => ({ name, bytes: new Uint8Array(readFileSync(path.join(out, name))) }));
  return directSuccess(readFileSync(path.join(out, "record.json"), "utf8"), readFileSync(path.join(out, "gates.json"), "utf8"), files);
}

describe("direct backend on SPINDLE R1", () => {
  const a = run(GEN, path.join(work, "a"));

  test("the record validates and carries the Records table counts", () => {
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const m = Object.fromEntries(boardMetrics(a.record, { mm: a.gates.tightest!, rule: a.gates.rule! }).map((x) => [x.id, x.value]));
    expect(m["board.nets"]).toBe(19);
    expect(m["board.pads"]).toBe(70);
    expect(m["board.holes"]).toBe(57);
    expect(m["board.npth"]).toBe(4);
    expect((m["board.tightest"] as number).toFixed(2)).toBe("0.32");
    expect(a.gates.rule).toBe(0.25);
    expect(a.gates.line).toBe("DRC OK  19 nets | 70 pads | 57 holes | tightest 0.32mm (rule 0.25) | 46x46mm");
    // the module drills land on the 15.24 mm row: hole x = 23 +/- 7.62 (pcb.py lines 57 to 80)
    const u1 = a.record.pads.filter((p) => p.ref === "U1");
    expect(u1).toHaveLength(16);
    for (const p of u1) expect(Math.abs(Math.abs(p.x + (p.holeDx ?? 0) - 23) - 7.62)).toBeLessThan(1e-9);
    expect(a.record.jumpers).toEqual([{ ref: "JP1", pads: ["JP1.1", "JP1.2"], default: "open", joins: ["5V", "5V_MOD"] }]);
    expect(a.files.map((f) => f.name)).toContain("spindle-r1-gerbers.zip");
  });

  test("two runs under one epoch give one recordHash and one zip", () => {
    const b = run(GEN, path.join(work, "b"));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.record.recordHash).toBe(a.record.recordHash);
    const zip = (r: typeof a) => (r.ok ? Buffer.from(r.files.find((f) => f.name.endsWith(".zip"))!.bytes).toString("hex") : "");
    expect(zip(b)).toBe(zip(a));
  });

  test("a copy with CLR = 0.40 refuses with its gate lines", () => {
    const src = readFileSync(GEN, "utf8");
    expect(src).toContain("CLR = 0.25");
    const copy = path.join(work, "gen-clr.py");
    writeFileSync(copy, src.replace("CLR = 0.25", "CLR = 0.40"));
    const r = run(copy, path.join(work, "c"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.exit).toBe(1);
    expect(r.lines[0]).toMatch(/^DRC failed: \d+ violations\. Nothing written\.$/);
    expect(r.lines.some((l) => l.includes("top clearance"))).toBe(true);
  });
});

test("directFailure keeps stdout then stderr and drops blank lines", () => {
  const r = directFailure(1, "SHUNT R1 gates\n  FAIL G1 via\n\n", "gates failed: 1. Nothing written.\n");
  expect(r).toEqual({ ok: false, exit: 1, lines: ["SHUNT R1 gates", "  FAIL G1 via", "gates failed: 1. Nothing written."] });
});
