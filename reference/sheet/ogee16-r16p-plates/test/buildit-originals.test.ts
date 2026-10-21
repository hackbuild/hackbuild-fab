// reference/sheet/ogee16-r16p-plates: the CHK-LNT-03 fixture is the
// 2026-08-18 build-it page's own PARTS_TBL, with the knob build's servo-only
// parts taken from the plate page's DRIVE (ogee16-plate.html line 267). Both
// pages are read from the originals of record through localOriginal, so this
// file runs on the owner runner and never skips.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Finding, SourceFile } from "@hackbuild/spec";
import { CHECK_MODULES } from "@hackbuild/checks";
import { localOriginal } from "../../../../tools/test-support/originals-root.js";
import { billOf } from "../../../../packages/nest/scenes/ogee16-r16p-plates.js";

describe("CHK-LNT-03 on the 2026-08-18 build-it page (computed)", () => {
  const PAGE = "fab-knowledge:originals/ogee16/files/companions/ogee16-buildit-app-20260818.html";
  const PAGE_SHA256 = "a9aa3e1e5f73061acfe7e8d94d78292430fc83d5b2f7a213c72db8447b102e55";
  type SourceRun = (t: { level: "source"; source: SourceFile }, ctx: never) => readonly Finding[] | Promise<readonly Finding[]>;
  const lnt03 = CHECK_MODULES.find((m) => (m as { id?: string }).id === "CHK-LNT-03") as unknown as { run: SourceRun };
  const lines = (): string[] => {
    const bytes = readFileSync(localOriginal(PAGE));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(PAGE_SHA256);
    return bytes.toString("utf8").split("\n");
  };
  const after = (ls: string[], line: number, marker: string): string => {
    expect(ls[line - 1]!.startsWith(marker), `line ${line} starts with ${marker}`).toBe(true);
    return ls[line - 1]!.slice(marker.length).replace(/;\s*$/, "");
  };

  test("PARTS_TBL gives 99 printed pieces for the knob build while the blurb and the derived bill say 124; the fixture fails", async () => {
    const ls = lines();
    const N = (JSON.parse(after(ls, 400, "const P = ")) as { N: number }).N;
    const tbl = JSON.parse(after(ls, 404, "const PARTS_TBL = ")) as { id: string; qty: number | string; builds: string[]; make: string }[];
    const blurb = (JSON.parse(after(ls, 405, "const BUILDS = ")) as Record<string, { blurb: string }>)["printed"]!.blurb;
    // the servo-only parts of the knob build are the plate page's DRIVE.servos (ogee16-plate.html line 267)
    const plate = readFileSync(localOriginal("fab-knowledge:originals/ogee16/files/ogee16-plate.html"), "utf8").split("\n")[266]!;
    const servos = new Set((JSON.parse(plate.slice("const DRIVE = ".length).replace(/;\s*$/, "")) as { servos: string[] }).servos);
    // qty is a count, "N" or "NN" (the rule of evidence/x/downloads/dl-ogee-stipple-mech/derived/ogee_bill_timeline.py line 28)
    const qty = (q: number | string): number => (typeof q === "number" ? q : q === "N" ? N : N * N);
    const table = tbl.filter((p) => p.builds.includes("printed") && p.make === "print" && !servos.has(p.id)).reduce((n, p) => n + qty(p.qty), 0);
    const derived = billOf("knobs", N).reduce((n, [, q]) => n + q, 0);
    expect([N, table, derived]).toEqual([4, 99, 124]);
    expect(blurb).toContain(`${derived} parts`);
    const fixture: SourceFile = { path: PAGE, text: `${blurb}\nPARTS_TBL: ${table} parts\n` };
    const f = await lnt03.run({ level: "source", source: fixture }, undefined as never);
    expect(f.map((x) => x.verdict)).toEqual(["fail"]);
    expect(f[0]!.extra).toMatchObject({ noun: "part", values: "99 124" });
  });

  test("the page as shipped passes: PARTS_TBL states no total, so the rule cannot see the 25 missing pieces (M07-T08 card defects)", async () => {
    const f = await lnt03.run({ level: "source", source: { path: PAGE, text: lines().join("\n") } }, undefined as never);
    expect(f.map((x) => x.verdict)).toEqual(["pass"]);
  });
});
