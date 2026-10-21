// M02-T02 step 1: every DAVIT R3 STL imports as a welded, hashed body with
// positive volume. The 15 STLs are the stl/ members of the R3 STL zip
// (fab-work-directory:benches/davit/outputs/davit_stl.zip, lineage
// davit.stl), read through localSource, so this file runs on the owner
// runner and never skips. Independent sources: trimesh
// (fixtures/imported-oracle.json, written by legacy/imported_oracle.py from
// the same members) and the meshHash regression pins of this port in
// fixtures/imported-meshhash.json (computed 2026-10-06; meshHash takes no
// clock or git input).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { importStl, isWatertight, signedVolume } from "../src/index.js";
import { localSource } from "../../../tools/test-support/originals-root.js";
import { zipMember, zipNames } from "../../../tools/test-support/stored-inputs.js";

const R3_ZIP = "fab-work-directory:benches/davit/outputs/davit_stl.zip";
const zip = readFileSync(localSource(R3_ZIP));
const oracle = JSON.parse(readFileSync(new URL("./fixtures/imported-oracle.json", import.meta.url), "utf8")) as {
  rows: { file: string; sha256: string; triangles: number; trianglesAfterSnap: number; signedVolumeMm3: number; areaMm2: number; watertight: boolean; watertightAfterSnap: boolean }[];
};
const pins = JSON.parse(readFileSync(new URL("./fixtures/imported-meshhash.json", import.meta.url), "utf8")) as Record<string, string>;
const lineage = JSON.parse(readFileSync(new URL("../../../lineage.json", import.meta.url), "utf8")) as { id: string; source: string; sha256: string }[];
const row = (file: string) => {
  const r = oracle.rows.find((x) => x.file === file);
  if (r === undefined) throw new Error(`no oracle row for ${file}`);
  return r;
};
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
// The D-054 weld moves each vertex by at most sqrt(3)/2048 mm; the volume by at most area times that (computed).
const SNAP_MOVE_MM = Math.sqrt(3) / 2048;
const davit = zipNames(zip).filter((n) => n.startsWith("stl/") && n.endsWith(".stl")).sort();

it("the zip is the one lineage records for the R3 STLs", () => {
  const r = lineage.find((x) => x.id === "davit.stl/r3-base")!;
  expect([r.source, sha(zip)]).toEqual([R3_ZIP, r.sha256]);
});

describe("imported route: DAVIT R3 STLs (M02-T02 step 1)", () => {
  it("finds the 15 DAVIT STLs the zip holds, each with an oracle row", () => {
    expect(davit).toHaveLength(15);
    expect(davit.every((f) => oracle.rows.some((r) => r.file === f))).toBe(true);
  });

  it.each(davit)("%s imports welded, hashed and with positive volume", (file) => {
    const bytes = zipMember(zip, file);
    const want = row(file);
    expect(sha(bytes)).toBe(want.sha256);
    const body = importStl(bytes, file);
    expect(body.encoding).toBe("binary");
    expect(body.trianglesRead).toBe(want.triangles);
    expect(body.mesh.triangles.length / 3).toBe(want.trianglesAfterSnap);
    expect(body.volumeMm3).toBeGreaterThan(0);
    expect(body.volumeMm3).toBe(signedVolume(body.mesh));
    expect(Math.abs(body.volumeMm3 - want.signedVolumeMm3)).toBeLessThanOrEqual(want.areaMm2 * SNAP_MOVE_MM);
    for (const v of body.mesh.positions) expect(v * 1024).toBe(Math.round(v * 1024));
    expect(isWatertight(body.mesh)).toBe(want.watertightAfterSnap);
    expect(body.meshHash).toBe(pins[file]);
  });
});
