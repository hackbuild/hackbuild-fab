// M01-T09 reference: fits.table against the bench. Every expected value
// comes from an independent source: extract/fits.stdout.txt and
// extract/fits-slide055.stdout.txt are fits.py's own stdout, and
// expected/fits.json is written by legacy/fits_golden.py from fits.py, never
// by the port. The JSON goldens of hbf parity are compared without accept
// under a SOURCE_DATE_EPOCH other than the pinned 315532800.

import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { CommandResult, Interval } from "@hackbuild/spec";
import { runParity } from "../../../../core/src/commands/parity.js";
import type { FitsTableRow } from "../../../../core/src/commands/fits-table.js";
import { hbf, json, ROOT } from "../../../../core/test/hbf.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, "..");
const REF = "reference/fit/ogee16-r16p";

interface LegacyLine { readonly name: string; readonly drawn: string; readonly after: string; readonly cls: string; readonly ok: boolean }

/** The stdout of a fits.py run: header comments and the blank line after them dropped, then the 18 row lines and the summary. */
function legacy(file: string): { rows: LegacyLine[]; summary: string } {
  const text = readFileSync(path.join(DIR, "extract", file), "utf8");
  const out = text.slice(text.indexOf("\n\n") + 2).split("\n");
  const rows = out.slice(1, 19).map((l) => {
    const [drawn, after, cls, verdict] = l.slice(38).trim().split(/\s+/);
    return { name: l.slice(0, 38).trim(), drawn: drawn!, after: after!, cls: cls!, ok: verdict === "ok" };
  });
  return { rows, summary: out[20]! };
}

interface GoldenRow {
  name: string; hole: number; shaft: number; drawn: number; class: string; legacyClass: string;
  band: [number, number]; holeBand: [number, number]; real: number; verdict: string;
}
const golden = JSON.parse(readFileSync(path.join(DIR, "expected", "fits.json"), "utf8")) as { rows: GoldenRow[] };

type Table = CommandResult<{ rows: FitsTableRow[] }>;

describe("fits.table at the shipped params", () => {
  let code = -1;
  let r: Table;
  beforeAll(async () => {
    ({ code, r } = (await json("fits.table", REF)) as unknown as { code: number; r: Table });
  }, 120_000);

  test("exit 0, 18 rows, 18 pass; findings carry only fail and warn, so none", () => {
    expect(code).toBe(0);
    expect([r.verdict, r.ok, r.result!.rows.length]).toEqual(["pass", true, 18]);
    expect(r.counts).toEqual({ pass: 18, warn: 0, fail: 0, skip: 0 });
    expect(r.findings).toEqual([]);
  });

  test("each row's name, drawn, after loss, class and verdict equal extract/fits.stdout.txt", () => {
    const { rows, summary } = legacy("fits.stdout.txt");
    expect(summary).toBe("ALL FITS IN BAND");
    expect(r.result!.rows.map((x) => [x.label, x.drawn!.toFixed(2), x.real!.toFixed(2), x.legacyClass, x.verdict === "pass"]))
      .toEqual(rows.map((l) => [l.name, l.drawn, l.after, l.cls, l.ok]));
  });

  test("hole, shaft, drawn, class, band, hole band and real equal expected/fits.json from fits.py", () => {
    expect(r.result!.rows.map((x) => ({
      name: x.label, hole: x.hole, shaft: x.shaft, drawn: x.drawn, class: x.class, legacyClass: x.legacyClass,
      band: x.band, holeBand: x.holeBand.map((v) => Number(v.toFixed(9))), real: x.real, verdict: x.verdict,
    }))).toEqual(golden.rows.map((g) => ({ ...g, holeBand: g.holeBand.map((v) => Number(v.toFixed(9))) })));
  });

  test("the crank-bore row is drawn 0.00 exactly, on the PRESS floor, and passes", () => {
    const row = r.result!.rows.find((x) => x.label === "crank drive pin in the crank bore")!;
    expect([row.drawn, row.band![0], row.verdict]).toEqual([0, 0, "pass"]);
  });

  test("every reason is the row name and its class meaning; SLIDE says felt (D-099)", () => {
    for (const x of r.result!.rows) expect(x.note.startsWith(`${x.label}: ${x.class} `)).toBe(true);
    const felt = r.result!.rows.filter((x) => x.note.endsWith("method felt")).map((x) => x.class);
    expect(new Set(felt)).toEqual(new Set(["SLIDE"]));
    expect(felt).toHaveLength(4);
  });

  // PROFILE.md 7.1 loss rows, per side, typed here as the golden: the petg
  // layer 0.24 row (hole under 0.125, outer over 0.075) prices an fdm hole
  // around an fdm part, the laser and fdm row (outer over 0.075) a printed
  // part in a cut slot. Doubled to the joint: 0.40 and 0.15 mm (computed).
  // M01-T09 states lossDelta 0.15 mm on every row but the barb, 0.40.
  const JOINT_LOSS = { hole: 2 * (0.125 + 0.075), outer: 2 * 0.075 } as const;
  test("the D-100 loss table runs beside it: unifiedReal is drawn less the PROFILE.md 7.1 loss across the joint", () => {
    for (const x of r.result!.rows) {
      const loss = x.class === "PSLIP" ? JOINT_LOSS.outer : JOINT_LOSS.hole;
      expect(x.unifiedReal, x.label).toBeCloseTo(x.drawn! - loss, 9);
      expect(x.lossDelta, x.label).toBeCloseTo(x.real! - x.unifiedReal!, 12);
      expect(x.lossDelta, x.label).toBeCloseTo(x.legacyClass === "SNAP" ? 0.40 : 0.15, 9);
    }
  });

  test("the text form prints one line per row", async () => {
    const { code: c, out } = await hbf(["fits.table", REF]);
    expect(c).toBe(0);
    expect(out.split("\n").filter((l) => l.startsWith("pass  "))).toHaveLength(18);
    expect(out).toContain("pass  pivot barb forced through the lug  drawn -1.15 mm  band -1.30 to -0.15 mm  SNAP");
  }, 120_000);
});

describe("the one-edit delta: FIT_SLIDE 0.55 in a test copy of the chase", () => {
  const copy = path.join(HERE, `.tmp-slide055-${process.pid}`);
  afterAll(() => rmSync(copy, { recursive: true, force: true }));

  test("exit 1 with the 5 rows fits.py names out of band, at the drawn values it printed", async () => {
    for (const f of ["chase.ts", "build.ts"]) cpSync(path.join(DIR, f), path.join(copy, f));
    const chase = path.join(copy, "chase.ts");
    const before = readFileSync(chase, "utf8");
    const after = before.replace(/(id: "FIT_SLIDE",[^\n]*default: )0\.75,/, "$10.55,");
    expect(after).not.toBe(before);
    writeFileSync(chase, after);

    const { code, r } = (await json("fits.table", copy)) as unknown as { code: number; r: Table };
    const { rows, summary } = legacy("fits-slide055.stdout.txt");
    expect(summary).toBe("5 OUT OF BAND");
    expect(code).toBe(1);
    expect(r.counts).toEqual({ pass: 13, warn: 0, fail: 5, skip: 0 });
    expect(r.result!.rows.map((x) => [x.label, x.drawn!.toFixed(2), x.verdict === "pass"])).toEqual(rows.map((l) => [l.name, l.drawn, l.ok]));
    expect(r.findings.map((f) => [f.id, f.verdict, Number(f.measured).toFixed(2)])).toEqual(
      rows.filter((l) => !l.ok).map((l) => ["CHK-FIT-01", "fail", l.drawn]),
    );
  }, 120_000);
});

describe("constraints.query serves the fit dims", () => {
  test("fit.drawn SLIDE on the legacy model is 0.70 to 0.90 mm", async () => {
    const { code, r } = await json("constraints.query", "fit.drawn", "--material", "petg", "--facts", "fitClass=SLIDE,fitModel=ogee16-fits-v1");
    expect(code).toBe(0);
    expect((r.result as unknown as Interval).legal).toEqual([0.7, 0.9]);
  }, 60_000);

  test("fit.hole without shaftMm is E_PARAM_MISSING at /facts/shaftMm", async () => {
    const { r } = await json("constraints.query", "fit.hole", "--material", "petg", "--facts", "fitClass=SLIDE,fitModel=ogee16-fits-v1");
    expect(r.errors.map((e) => [e.code, e.path])).toEqual([["E_PARAM_MISSING", "/facts/shaftMm"]]);
  }, 60_000);
});

describe("parity against the committed goldens", () => {
  const saved = process.env["SOURCE_DATE_EPOCH"];
  beforeAll(() => {
    process.env["SOURCE_DATE_EPOCH"] = "1791072000";
  });
  afterAll(() => {
    if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"];
    else process.env["SOURCE_DATE_EPOCH"] = saved;
  });

  test("build.json is pinned to 315532800 and every golden is equal", async () => {
    const b = JSON.parse(readFileSync(path.join(DIR, "expected", "build.json"), "utf8")) as { inputs: { sourceDateEpoch: number } };
    expect(b.inputs.sourceDateEpoch).toBe(315532800);
    const out = await runParity({ reference: REF }, ROOT);
    expect(out.files.map((f) => [f.file, f.status])).toEqual([
      ["build.json", "equal"], ["report.json", "equal"], ["edit.json", "equal"], ["artifacts.json", "equal"],
    ]);
    expect(out.ok).toBe(true);
  }, 300_000);

  test("the parity edit moves FIT_SLIDE one step and changes the bore only, and the five rows FIT_SLIDE feeds", () => {
    const e = JSON.parse(readFileSync(path.join(DIR, "expected", "edit.json"), "utf8")) as {
      pointer: string; from: number; to: number; expect: { changed: string[]; unchanged: string[]; metricDelta: Record<string, number> };
    };
    expect([e.pointer, e.from, e.to]).toEqual(["/FIT_SLIDE", 0.75, 0.76]);
    expect([e.expect.changed, e.expect.unchanged]).toEqual([["bore"], ["shaft"]]);
    const drawn = Object.keys(e.expect.metricDelta).filter((k) => k.endsWith(".drawn")).sort();
    expect(drawn).toEqual(["fits.01.drawn", "fits.03.drawn", "fits.05.drawn", "fits.06.drawn", "fits.14.drawn"]);
    for (const k of drawn) expect(e.expect.metricDelta[k]).toBeCloseTo(0.01, 9);
  });
});
