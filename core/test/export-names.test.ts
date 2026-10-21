// M07-T14 steps 6 and 7: export file names (PACKAGES.md 8.2) and the BOM
// quantity they state. export-names-kit.test.ts holds the slug and quantity
// forms to COTTER's own KIT.slug and KIT.qty, run from the original kit.js,
// so a drifted port fails there. The SLUG sheets and OGEE plates go through export.run as a dry run
// (build and checks, no gate); every emitted name is audited: its form, a
// slug of at most 56 characters, no name twice, and the quantities it
// states against the BOM, which reads each part's copies from the scene
// items (Part IR instance counts once M10 gives these designs a chase).

import { describe, expect, it } from "vitest";
import type { CommandResult } from "@hackbuild/spec";
import { SLUG_MAX, assemblyName, laserName, nameSet, partName, plateName, qtyOf, quantityOf, slugOf } from "../src/exporters/names.js";
import { hbf } from "./hbf.js";

interface Exported {
  readonly files: readonly string[];
  readonly bom: Readonly<Record<string, number>>;
  readonly contents: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

async function dryRun(...argv: string[]): Promise<Exported> {
  const { code, out } = await hbf(["export.run", ...argv, "--dry-run", "--json"]);
  const r = JSON.parse(out) as CommandResult<Exported>;
  expect(code, JSON.stringify(r.errors)).toBe(0);
  return r.result as Exported;
}

const LASER = /^x(\d{2,})_([a-z0-9-]+)_(\d+\.\d)mm-([a-z0-9-]+)\.(dxf|svg)$/;
const PLATE = /^plate-(\d{2,})-of-(\d{2,})_([a-z0-9-]+)\.3mf$/;

/** Every rule of 8.2 a set of names must keep; returns the faults, empty when it keeps them all. */
function audit(e: Exported): string[] {
  const faults: string[] = [];
  const seen = new Set<string>();
  const made: Record<string, number> = {};
  for (const name of e.files) {
    if (seen.has(name)) faults.push(`duplicate ${name}`);
    seen.add(name);
    if (/_x\d+\.[a-z0-9]+$/.test(name)) faults.push(`legacy _xN suffix written: ${name}`);
    const laser = LASER.exec(name), plate = PLATE.exec(name);
    const slug = laser?.[2] ?? plate?.[3];
    if (slug === undefined) faults.push(`no 8.2 form: ${name}`);
    else if (slug.length > SLUG_MAX) faults.push(`slug over ${SLUG_MAX}: ${name}`);
    // A laser file states how many to cut; a plate prints once.
    const times = laser !== null ? Number(laser[1]) : 1;
    for (const [id, n] of Object.entries(e.contents[name] ?? {})) made[id] = (made[id] ?? 0) + times * n;
  }
  for (const [id, q] of Object.entries(e.bom)) if (made[id] !== q) faults.push(`${id}: files make ${made[id] ?? 0}, bom ${q}`);
  for (const id of Object.keys(made)) if (e.bom[id] === undefined) faults.push(`${id}: in a file, not in the bom`);
  return faults;
}

describe("the names are COTTER's", () => {
  it("the four forms", () => {
    expect(partName("Flex Pair", 2, "3mf")).toBe("x02_flex-pair.3mf");
    expect(laserName("slug-ply-sheet1", 1, 3, "ply3", "dxf")).toBe("x01_slug-ply-sheet1_3.0mm-ply3.dxf");
    expect(assemblyName("OGEE16 R16-P", "glb")).toBe("ogee16-r16-p_asm.glb");
    expect(plateName(3, 20, "rowbar_asm")).toBe("plate-03-of-20_rowbar-asm.3mf");
  });

  it("a slug is cut at 56 characters and a second use of a name takes -2", () => {
    const long = "a".repeat(80);
    expect(LASER.exec(laserName(long, 1, 3, "ply3", "dxf"))![2]).toHaveLength(SLUG_MAX);
    const unique = nameSet();
    expect([unique("x01_a.dxf"), unique("x01_a.dxf"), unique("x01_a.dxf")]).toEqual(["x01_a.dxf", "x01_a-2.dxf", "x01_a-3.dxf"]);
  });

  it("the 3d repo's _xN suffix is read as a legacy alias and never written", () => {
    expect(quantityOf("knobs_x3.stl")).toBe(3);
    expect(quantityOf("x16_link.3mf")).toBe(16);
    expect(quantityOf("plate-01-of-20_link.3mf")).toBeNull();
    for (const n of [partName("knobs", 3, "stl"), laserName("knobs", 3, 3, "ply3", "svg")]) expect(n).not.toMatch(/_x\d+\.[a-z0-9]+$/);
  });

  it("qtyOf refuses a count below 1", () => {
    expect(() => qtyOf(0)).toThrow();
  });
});

describe("the audit fails the faults it is for", () => {
  const ok: Exported = { files: ["x01_s_3.0mm-ply3.dxf"], bom: { a: 2 }, contents: { "x01_s_3.0mm-ply3.dxf": { a: 2 } } };
  it("a clean set passes", () => expect(audit(ok)).toEqual([]));
  it("a slug over 56 characters", () => {
    const n = `x01_${"s".repeat(57)}_3.0mm-ply3.dxf`;
    expect(audit({ files: [n], bom: { a: 2 }, contents: { [n]: { a: 2 } } })).toEqual([`slug over 56: ${n}`]);
  });
  it("a duplicate name", () => expect(audit({ ...ok, files: [ok.files[0]!, ok.files[0]!] })[0]).toMatch(/^duplicate /));
  it("a quantity that disagrees with the bom", () => expect(audit({ ...ok, bom: { a: 3 } })).toEqual(["a: files make 2, bom 3"]));
});

describe("SLUG sheets and OGEE plates export with every file name quantity equal to the BOM quantity (computed)", () => {
  it("slug-sheets dxf: 10 laser files; the bom counts 63 copies of 42 part ids", async () => {
    const e = await dryRun("--scene", "slug-sheets", "--kind", "dxf");
    expect(e.files).toHaveLength(10);
    expect(Object.values(e.bom).reduce((a, b) => a + b, 0)).toBe(63);
    expect(Object.keys(e.bom)).toHaveLength(42);
    expect(audit(e)).toEqual([]);
  });

  it("slug-sheets svg-cut: the same names with .svg", async () => {
    const e = await dryRun("--scene", "slug-sheets", "--kind", "svg-cut");
    expect(e.files.every((n) => n.endsWith(".svg"))).toBe(true);
    expect(audit(e)).toEqual([]);
  });

  it("ogee16-r16p-plates knobs: plate-NN-of-20 for each of the 20 files; the bom counts 124 copies", async () => {
    const e = await dryRun("--scene", "ogee16-r16p-plates", "--kind", "3mf");
    expect(e.files).toHaveLength(20);
    e.files.forEach((n, i) => expect(n.startsWith(`plate-${String(i + 1).padStart(2, "0")}-of-20_`), n).toBe(true));
    expect(Object.values(e.bom).reduce((a, b) => a + b, 0)).toBe(124);
    expect(audit(e)).toEqual([]);
  }, 300_000);

  it("ogee16-r16p-plates servos: 21 files; the bom counts 119 copies", async () => {
    const e = await dryRun("--scene", "ogee16-r16p-plates", "--kind", "3mf", "--params", "{\"drive\":\"servos\"}");
    expect(e.files).toHaveLength(21);
    expect(Object.values(e.bom).reduce((a, b) => a + b, 0)).toBe(119);
    expect(audit(e)).toEqual([]);
  }, 300_000);
});
