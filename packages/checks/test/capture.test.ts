// M04-T06 steps 3 and 4: capture assertions (D-074) on the DERRICK
// fixture. Independent sources: the bodies and tests are written by
// tools/py/derrick/export_bodies.py from the canonical PINTLE R6 and
// DERRICK R3 sources (sha256 checked here against SHA256SUMS); the oracle
// volumes and wants are read from snap_check_run_2026-10-05.txt, the rerun
// of snap_check.py itself, and the floor from the CHECKS.md section 10
// capture table. The volumes are computed here on manifold-3d 3.5.4.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, sha256Hex, type ResultTarget } from "@hackbuild/spec";
import { importStl, liveCount, type MeshData } from "@hackbuild/mesh";
import { NO_MOVE, captureFinding, interferenceMm3, movedMesh, volumeFinding, type CaptureMove, type CaptureWant } from "../src/capture";

const DIR = new URL("./derrick-capture/", import.meta.url);
const bytes = (name: string): Buffer => readFileSync(new URL(name, DIR));
const text = (name: string): string => bytes(name).toString("utf8");

interface CaptureTest { label: string; a: string; b: string; move: CaptureMove; want: CaptureWant; line: number }
const fixture = JSON.parse(text("tests.json")) as { floorMm3: number; bodies: string[]; tests: CaptureTest[] };

/** The oracle: label to volume (mm3, printed to 0.01) and want, from the snap_check.py rerun. */
function oracle(): Map<string, { v: number; want: CaptureWant; ok: boolean }> {
  const out = new Map<string, { v: number; want: CaptureWant; ok: boolean }>();
  for (const m of text("snap_check_run_2026-10-05.txt").matchAll(/^ {2}(\S.*?)\s+(\d+\.\d\d) mm3 {3}want (clear|traps) {3}(ok|FAIL)$/gm)) {
    out.set(m[1]!, { v: Number(m[2]), want: m[3] as CaptureWant, ok: m[4] === "ok" });
  }
  return out;
}
const ORACLE = oracle();

/** The floor of the CHECKS.md section 10 capture table, DERRICK bracket row, mm3. */
function floorFromChecks(): number {
  const md = readFileSync(new URL("../../../docs/plan/CHECKS.md", import.meta.url), "utf8");
  const m = /^\| DERRICK bracket against its trap \| lifted 1\.5 mm \| ([\d.]+) mm3 \(DERRICK README 33\.4\) \| ([\d.]+) mm3 \| pass \|$/m.exec(md);
  if (m === null) throw new Error("CHECKS.md section 10 has no DERRICK bracket row");
  return Number(m[2]);
}

const meshes = new Map<string, MeshData>();
const body = (name: string): MeshData => {
  let m = meshes.get(name);
  if (m === undefined) meshes.set(name, (m = importStl(new Uint8Array(bytes(`${name}.stl`)), `${name}.stl`).mesh));
  return m;
};
const pairAt = (t: CaptureTest): ResultTarget => ({ level: "pair", a: { level: "body", part: "derrick", body: t.a }, b: { level: "body", part: "derrick", body: t.b } });
const volumeOf = (t: CaptureTest, move: CaptureMove = t.move): Promise<number> => interferenceMm3(movedMesh(body(t.a), move), body(t.b), `/capture/${t.label}`);

/** Within 1 percent of the oracle, or within half its last printed digit (0.005 mm3) where 1 percent is finer. */
const agrees = (got: number, want: number): boolean => Math.abs(got - want) <= Math.max(0.01 * want, 0.005);

/**
 * Rows outside agrees(), listed as findings for the PR (card acceptance).
 * horn turned 8 deg against the servo: snap_check.py gives 0.1482 mm3
 * (computed 2026-10-08 with pintle_parts.inter, printed 0.15), this port
 * 0.1448 mm3 (computed). A sliver under a sixth of the floor, so the
 * clear verdict holds either way. The cause is the 1/1024 mm weld
 * importStl applies (D-054): the same STLs read without it give 0.1482
 * mm3 here (computed 2026-10-08, fab-knowledge/evidence/m04-scratch/t06/
 * weld-vs-raw.txt). Each finding must stay within 0.01 mm3 and keep its
 * verdict.
 */
const FINDINGS: ReadonlySet<string> = new Set(["horn turned 8 deg against the servo"]);
const FINDING_ABS_MM3 = 0.01;

describe("DERRICK capture fixture", () => {
  test("every file matches SHA256SUMS", () => {
    const lines = text("SHA256SUMS").trim().split("\n");
    expect(lines.length).toBe(fixture.bodies.length + 2);
    for (const l of lines) {
      const [hash, name] = l.split("  ");
      expect(sha256Hex(new Uint8Array(bytes(name!))), name).toBe(hash);
    }
  });

  test("37 tests, 10 want traps and 27 want clear, each a row of the oracle with the same want", () => {
    expect(fixture.tests).toHaveLength(37);
    expect(ORACLE.size).toBe(37);
    expect(fixture.tests.filter((t) => t.want === "traps")).toHaveLength(10);
    expect(fixture.tests.filter((t) => t.want === "clear")).toHaveLength(27);
    for (const t of fixture.tests) expect(ORACLE.get(t.label)?.want, t.label).toBe(t.want);
    expect(fixture.floorMm3).toBe(floorFromChecks());
  });
});

describe("capture assertions", () => {
  const rows: { label: string; want: CaptureWant; got: number; oracle: number }[] = [];

  test.each(fixture.tests.map((t) => [t.label, t] as const))("%s", async (_label, t) => {
    const got = await volumeOf(t);
    const f = volumeFinding(pairAt(t), t.want, fixture.floorMm3, got, t.label);
    const o = ORACLE.get(t.label)!;
    rows.push({ label: t.label, want: t.want, got, oracle: o.v });
    expect(f.verdict).toBe("pass");
    const why = `${t.label}: ${got.toFixed(4)} mm3 against oracle ${o.v.toFixed(2)} mm3`;
    if (FINDINGS.has(t.label)) {
      expect(agrees(got, o.v), `${why} agrees now; drop it from FINDINGS`).toBe(false);
      expect(Math.abs(got - o.v), why).toBeLessThanOrEqual(FINDING_ABS_MM3);
    } else {
      expect(agrees(got, o.v), why).toBe(true);
    }
  });

  test("10 captures pass and 27 clears pass", () => {
    expect(rows).toHaveLength(37);
    expect(rows.filter((r) => r.want === "traps" && r.got > fixture.floorMm3)).toHaveLength(10);
    expect(rows.filter((r) => r.want === "clear" && r.got < fixture.floorMm3)).toHaveLength(27);
  });

  test("bracket lifted 1.5 mm measures 33.44 mm3 within 1 percent as a capture assertion", async () => {
    const t = fixture.tests.find((x) => x.label === "bracket lifted 1.5 mm off the face")!;
    expect(t.move.dzMm).toBe(1.5);
    const got = await volumeOf(t);
    expect(Math.abs(got - 33.44)).toBeLessThanOrEqual(0.01 * 33.44);
    const f = captureFinding(pairAt(t), { type: "capture", a: t.a, b: t.b, minInterferenceMm3: fixture.floorMm3 }, got);
    expect(f.verdict).toBe("pass");
    expect(f.legal).toEqual({ kind: "interval", lo: 1, hi: null, unit: "mm3", nearest: f.measured });
  });

  test("the same bracket lifted 0 mm and declared a trap fails at 0.00 mm3 against the 1.0 mm3 floor", async () => {
    const t = fixture.tests.find((x) => x.label === "bracket lifted 1.5 mm off the face")!;
    const got = await volumeOf(t, { ...t.move, dzMm: 0 });
    const f = captureFinding(pairAt(t), { type: "capture", a: t.a, b: t.b, minInterferenceMm3: fixture.floorMm3 }, got);
    expect(f.verdict).toBe("fail");
    expect(Number((f.measured as number).toFixed(2))).toBe(0);
    expect(f.legal).toEqual({ kind: "interval", lo: 1, hi: null, unit: "mm3", nearest: 1 });
  });

  test("the floor is strict both ways, as snap_check.py line 25", () => {
    const at: ResultTarget = { level: "part", part: "p" };
    expect(volumeFinding(at, "traps", 1, 1, "x").verdict).toBe("fail");
    expect(volumeFinding(at, "clear", 1, 1, "x").verdict).toBe("fail");
    expect(volumeFinding(at, "clear", 1, 0.15, "x").verdict).toBe("pass");
  });

  test("a body that is not closed throws E_KERNEL naming the pair, never a volume of 0", async () => {
    const rotor = body("rotor");
    const open: MeshData = { positions: rotor.positions, triangles: rotor.triangles.slice(3) };
    let caught: unknown;
    try {
      await interferenceMm3(movedMesh(body("tool_plate"), NO_MOVE), open, "/capture/open");
    } catch (e) {
      caught = e;
    }
    expect(isThrownCommandError(caught)).toBe(true);
    expect((caught as { hbf: { code: string; path: string } }).hbf.code).toBe("E_KERNEL");
    expect((caught as { hbf: { path: string } }).hbf.path).toBe("/capture/open/b");
    expect(liveCount()).toBe(0);
  });
});
