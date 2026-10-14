// reference/sheet/slug-sheets: build.ts against expected/ and against
// records it did not write. The goldens are canonical JSON (RFC 8785), the
// form hbf parity writes; HBF_ACCEPT_SHEET=1 rewrites them after the diff
// is read. hbf parity has no sheet path yet, and the CHK-SHT run bodies
// that would write a check.run report.json land with the sheet producer at
// M07-T14 (M07-T07 card defects), so this test holds the three goldens
// until they do; findings.json keeps the nest kernels' findings. Counts are also held to the
// legacy record (packages/nest/records/slug-legacy.json, the page's own
// nest()), the fill record of M07-T05 (slug-fill.json), and the artifact
// hashes to the committed files in packages/nest/test/out, which
// packages/checks reads for CHK-SHT-03 and tools/py/audit_dxf.py reloads.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import { canonicalize, type ProfileLookup } from "@hackbuild/spec";
import { loadGeom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { build, type SlugSheetsBuild } from "../build";

const ROOT = new URL("../../../../", import.meta.url);
const DIR = "reference/sheet/slug-sheets";
const ACCEPT = process.env["HBF_ACCEPT_SHEET"] === "1";
const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");
const json = <T>(rel: string): T => JSON.parse(read(rel)) as T;

function pin(name: string, fresh: unknown): void {
  const at = new URL(`${DIR}/expected/${name}`, ROOT);
  if (ACCEPT) {
    mkdirSync(new URL(`${DIR}/expected/`, ROOT), { recursive: true });
    writeFileSync(at, `${canonicalize(fresh)}\n`);
    return;
  }
  expect(existsSync(at), `${DIR}/expected/${name} is not committed; HBF_ACCEPT_SHEET=1 npx vitest run ${DIR}`).toBe(true);
  expect(canonicalize(fresh), `${DIR}/expected/${name} moved; read the diff, then HBF_ACCEPT_SHEET=1 npx vitest run ${DIR}`).toBe(readFileSync(at, "utf8").trimEnd());
}

interface Summary { sheets: number; perStock: Record<string, number>; packer: string; layoutHash: string; perSheet: { name: string; parts: number; loops: number }[]; oversize: string[] }
const legacy = json<{ result: { nest: Record<"ply" | "acrylic", { sheets: number; partsPerSheet: number[]; loopsPerSheet: number[] }>; acrylicWithDoorFlapAndWindow: { sheets: number; partsPerSheet: number[] } } }>("packages/nest/records/slug-legacy.json").result;
const fillRecord = json<{ result: { on: { layoutHash: string; sheets: Record<"ply" | "acrylic", number> } } }>("packages/nest/records/slug-fill.json").result;

let b: SlugSheetsBuild;
let profile: ProfileLookup;
beforeAll(async () => {
  profile = createProfileLookup(loadProfile());
  b = build(await loadGeom(), profile);
});

describe("slug-sheets goldens", () => {
  test("layout.json, artifacts.json and findings.json equal expected/", () => {
    pin("layout.json", b.layout);
    pin("artifacts.json", b.artifacts);
    pin("findings.json", b.findings);
  });
});

describe("held to sources outside build.ts (computed)", () => {
  test("legacy-shelf: 9 ply and 1 acrylic, parts and loops per sheet of the page's nest()", () => {
    const s = b.layout["legacyShelf"] as Summary;
    expect(s.perStock).toEqual({ ply3: legacy.nest.ply.sheets, acrylic3: legacy.nest.acrylic.sheets });
    expect(s.perStock).toEqual({ ply3: 9, acrylic3: 1 });
    expect(s.perSheet.map((x) => x.parts)).toEqual([...legacy.nest.ply.partsPerSheet, ...legacy.nest.acrylic.partsPerSheet]);
    expect(s.perSheet.map((x) => x.loops)).toEqual([...legacy.nest.ply.loopsPerSheet, ...legacy.nest.acrylic.loopsPerSheet]);
    expect(s.oversize).toEqual([]);
  });

  test("fill with part-in-part: at most 9 and 1 (D-074), the layout M07-T05 recorded", () => {
    const f = b.layout["fill"] as Summary;
    expect(f.perStock["ply3"]).toBeLessThanOrEqual(9);
    expect(f.perStock["acrylic3"]).toBeLessThanOrEqual(1);
    expect(f.perStock).toEqual({ ply3: fillRecord.on.sheets.ply, acrylic3: fillRecord.on.sheets.acrylic });
    expect(f.layoutHash).toBe(fillRecord.on.layoutHash);
  });

  test("complete (informational): the acrylic sheet holds the part count the record lists (5)", () => {
    const c = b.layout["complete"] as Summary;
    expect(c.perStock["acrylic3"]).toBe(legacy.acrylicWithDoorFlapAndWindow.sheets);
    expect(c.perSheet.filter((x) => x.name.startsWith("slug-acrylic")).map((x) => x.parts)).toEqual(legacy.acrylicWithDoorFlapAndWindow.partsPerSheet);
  });

  test("0 severed: every CHK-SHT-01 and CHK-SHT-02 finding passes on the 42 parts", () => {
    expect(b.findings["checks"]).toEqual({ "CHK-SHT-01": { pass: 42, fail: 0 }, "CHK-SHT-02": { pass: 42, fail: 0 } });
  });

  test("each artifact hash is the committed file packages/checks and ezdxf read", () => {
    const names = [...Object.keys(b.artifacts["dxf"]!), ...Object.keys(b.artifacts["svg-cut"]!)];
    expect(names).toHaveLength(20);
    for (const kind of ["dxf", "svg-cut"]) {
      for (const [name, hash] of Object.entries(b.artifacts[kind]!)) {
        const bytes = readFileSync(new URL(`packages/nest/test/out/${name}`, ROOT));
        expect(createHash("sha256").update(bytes).digest("hex"), name).toBe(hash);
      }
    }
  });
});
