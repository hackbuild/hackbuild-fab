// M07-T06: CHK-SHT-03 v2 on bytes it did not write. The writer's files are
// the committed packages/nest/test/out (nest's dxf test holds them byte for
// byte, and tools/py/audit_dxf.py reloads them with ezdxf); the legacy files
// are tools/corpus/dxf, sha256 pinned in its MANIFEST.json, whose chkSht03
// list per file is the set of rules the ezdxf audit fails it on. This test
// reads both with the reader in src/sheet and never imports nest.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckResult, KernelId, Sheet } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, registerChecks, runRegistry } from "../src/index";
import { auditDxf, SHT03_RULES } from "../src/sheet/chk-sht-03";
import { extents, readDxf } from "../src/sheet/dxf-reader";
import { svgContentBox } from "../src/sheet/svg-box";

const ROOT = new URL("../../../", import.meta.url);
const bytes = (rel: string): Buffer => readFileSync(new URL(rel, ROOT));
const text = (rel: string): string => bytes(rel).toString("utf8");

const OUT = "packages/nest/test/out/";
const written = readdirSync(new URL(OUT, ROOT)).filter((n) => n.endsWith(".dxf")).sort();

interface Listed { path: string; sha256: string; chkSht03: string[] }
const manifest = JSON.parse(text("tools/corpus/dxf/MANIFEST.json")) as { chkSht03: { rules: string[] }; files: Listed[] };

describe("the writer's files", () => {
  test("nest wrote the fixture sheet, the three OGEE16 R16 lasercut sheets and the ten SLUG sheets", () => {
    const slug = [...Array.from({ length: 9 }, (_, i) => `slug-ply-sheet${i + 1}.dxf`), "slug-acrylic-sheet1.dxf"].sort();
    expect(written).toEqual(["fixture-sheet1.dxf", "ogee16-r16-sheet1.dxf", "ogee16-r16-sheet2.dxf", "ogee16-r16-sheet3.dxf", ...slug].sort());
  });

  test.each(written)("%s passes every rule, extents against its twin included", (name) => {
    const r = auditDxf(bytes(OUT + name), text(OUT + name.replace(/\.dxf$/, ".svg")));
    expect(r.fails).toEqual([]);
    expect(r.notRun).toEqual([]);
    expect(r.entities).toBeGreaterThan(0);
  });
});

describe("the legacy corpus", () => {
  test("the manifest's rules are the kernel's rules plus the ezdxf audit", () => {
    expect(manifest.chkSht03.rules.filter((r) => r !== "audit")).toEqual([...SHT03_RULES]);
  });

  test.each(manifest.files.map((f) => [f.path, f] as const))("%s fails exactly its listed rules, less audit", (path, f) => {
    const b = bytes(`tools/corpus/dxf/${path}`);
    expect(createHash("sha256").update(b).digest("hex")).toBe(f.sha256);
    const r = auditDxf(b);
    expect(r.fails.map((x) => x.rule)).toEqual(f.chkSht03.filter((x) => x !== "audit"));
    expect(r.notRun.map((x) => x.rule)).toEqual(["extents"]);
  });

  test("every shipped emitter fails at least one rule", () => {
    for (const f of manifest.files) expect(f.chkSht03.length, f.path).toBeGreaterThan(0);
  });
});

describe("one fault at a time on a written file", () => {
  const dxf = text(OUT + "fixture-sheet1.dxf");
  const svg = text(OUT + "fixture-sheet1.svg");
  const fails = (d: string, s?: string): string[] => auditDxf(d, s).fails.map((x) => x.rule);

  test("metres in the header fail insunits", () => {
    expect(fails(dxf.replace("$INSUNITS\n 70\n4\n", "$INSUNITS\n 70\n6\n"), svg)).toEqual(["insunits"]);
  });
  test("an R2013 header fails acadver", () => {
    expect(fails(dxf.replace("$ACADVER\n  1\nAC1024\n", "$ACADVER\n  1\nAC1027\n"), svg)).toEqual(["acadver"]);
  });
  test("a cleared closed flag fails closed", () => {
    expect(fails(dxf.replace(" 70\n1\n 43\n", " 70\n0\n 43\n"), svg)).toEqual(["closed"]);
  });
  test("a handle at the seed fails handles", () => {
    const seed = /\$HANDSEED\n {2}5\n([0-9A-F]+)\n/.exec(dxf)![1]!;
    expect(fails(dxf.replace(/(LWPOLYLINE\n {2}5\n)[0-9A-F]+\n/, `$1${seed}\n`), svg)).toEqual(["handles"]);
  });
  test("a layer outside the five fails layers", () => {
    expect(fails(dxf.replace("  8\nCUT\n", "  8\nOUTLINE\n"), svg)).toEqual(["layers"]);
  });
  test("a twin drawn 1 mm off fails extents", () => {
    expect(fails(dxf, svg.replace('d="M 100 10 L 180 10', 'd="M 100 10 L 181 10'))).toEqual(["extents"]);
  });
  test("the reader's extents of the fixture equal the twin's box", () => {
    const a = extents(readDxf(dxf))!, b = svgContentBox(svg)!;
    for (let i = 0; i < 4; i++) expect(Math.abs(a[i]! - b[i]!)).toBeLessThan(1e-3);
    [10, 10, 180, 90].forEach((v, i) => expect(a[i]).toBeCloseTo(v, 3));
  });
});

describe("the run body through the registry", () => {
  const seed = JSON.parse(text("packages/checks/seed/checks.seed.json")) as Parameters<typeof registerChecks>[0]["seed"];
  const DEFS = registerChecks({ seed }, CHECK_MODULES).filter((d) => d.id === "CHK-SHT-03");
  const profile = createProfileLookup(loadProfile());
  const sheet = { id: "s1", size: [600, 400], material: "ply3", machine: "sheet600", placements: [] } as unknown as Sheet;
  const run = async (cut?: { name: string; dxf: Uint8Array; svg?: string }): Promise<CheckResult> => {
    const report = await runRegistry(DEFS, {
      kernels: new Set<KernelId>(["geom"]), targets: { sheets: [{ sheet, parts: [] }] },
      ctx: { profile, machine: "sheet600", whitelist: new Map() },
      views: { sheetCut: (id) => (id === "s1" ? cut : undefined) },
    });
    expect(report.results).toHaveLength(1);
    return report.results[0]!;
  };

  test("version 2.0.0, block", () => {
    expect(DEFS[0]!.version).toBe("2.0.0");
    expect(DEFS[0]!.severity).toBe("block");
  });
  test("a written sheet passes", async () => {
    const r = await run({ name: "ogee16-r16-sheet1.dxf", dxf: bytes(OUT + "ogee16-r16-sheet1.dxf"), svg: text(OUT + "ogee16-r16-sheet1.svg") });
    expect([r.verdict, r.measured, r.target]).toEqual(["pass", true, { level: "sheet", sheet: "s1" }]);
  });
  test("a SLUG sheet fails and names its rules", async () => {
    const r = await run({ name: "slug_ply_sheet1.dxf", dxf: bytes("tools/corpus/dxf/slug/slug_ply_sheet1.dxf") });
    expect([r.verdict, r.measured]).toEqual(["fail", false]);
    expect(r.extra?.failed).toBe("acadver entities closed handles");
    expect(r.constraint).toContain("acadver ($ACADVER absent, legal AC1024)");
  });
  test("a sheet with no cut file is reported not run", async () => {
    const r = await run(undefined);
    expect([r.verdict, r.measured]).toEqual(["skip", "not run"]);
  });
});
