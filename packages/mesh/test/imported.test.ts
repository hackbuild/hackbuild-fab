// M02-T02: the imported mesh route (D-053, D-054, D-102). Every DAVIT R3
// STL in designs/davit/legacy/stl imports as a welded, hashed body with
// positive volume; an inverted body is E_KERNEL naming the file.
//
// Independent sources: the triangle count, signed volume, area and
// watertightness come from trimesh (fixtures/imported-oracle.json, written
// by legacy/imported_oracle.py); the file bytes are tied to the legacy copy
// by designs/davit/legacy/SHA256SUMS. The meshHash values in
// fixtures/imported-meshhash.json are regression pins of this port
// (computed 2026-10-06); meshHash takes no clock or git input.

import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BodyDraft, PartDraft } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  IMPORTED_ROUTE, MESH_ROUTE_DEFS, importStl, isWatertight, liveCount, readStl, runStages, signedVolume, stlEncoding,
} from "../src/index.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const STL_DIR = "designs/davit/legacy/stl/";
const oracle = JSON.parse(readFileSync(new URL("./fixtures/imported-oracle.json", import.meta.url), "utf8")) as {
  rows: { file: string; sha256: string; triangles: number; trianglesAfterSnap: number; signedVolumeMm3: number; areaMm2: number; watertight: boolean; watertightAfterSnap: boolean }[];
};
const pins = JSON.parse(readFileSync(new URL("./fixtures/imported-meshhash.json", import.meta.url), "utf8")) as Record<string, string>;
const sums = new Map(readFileSync(root + "designs/davit/legacy/SHA256SUMS", "utf8").trim().split("\n").map((l) => {
  const [h, f] = l.split(/\s+/);
  return [f!, h!] as const;
}));
const row = (file: string) => {
  const r = oracle.rows.find((x) => x.file === file);
  if (r === undefined) throw new Error(`no oracle row for ${file}`);
  return r;
};
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

// trianglesAfterSnap is trimesh's count of faces whose three corners stay
// distinct on the 1/1024 mm grid: the triangles the weld keeps.
// The D-054 weld moves each coordinate by at most half a grid step, 1/2048
// mm, so each vertex by at most sqrt(3)/2048 mm. To first order a surface
// moved by e changes the enclosed volume by at most area x e (computed).
const SNAP_MOVE_MM = Math.sqrt(3) / 2048;

const davit = readdirSync(root + STL_DIR).filter((n) => n.endsWith(".stl")).sort();

/** The same binary STL with vertices 2 and 3 of every facet swapped: the inside-out twin. */
function flipped(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes);
  const n = new DataView(out.buffer).getUint32(80, true);
  for (let i = 0; i < n; i += 1) {
    const v2 = 84 + i * 50 + 12 + 12;
    const tmp = new Uint8Array(out.subarray(v2, v2 + 12));
    out.copyWithin(v2, v2 + 12, v2 + 24);
    out.set(tmp, v2 + 12);
  }
  return out;
}

/** ASCII STL of the same float32 coordinates; 9 significant digits round-trip a float32. */
function asciiOf(bytes: Uint8Array): Uint8Array {
  const { soup } = readStl(bytes);
  const lines = ["solid ascii"];
  for (let t = 0; t < soup.length; t += 9) {
    lines.push("facet normal 0 0 0", "outer loop");
    for (let v = 0; v < 9; v += 3) lines.push(`vertex ${[0, 1, 2].map((k) => soup[t + v + k]!.toPrecision(9)).join(" ")}`);
    lines.push("endloop", "endfacet");
  }
  lines.push("endsolid ascii");
  return Uint8Array.from(lines.join("\n"), (c) => c.charCodeAt(0));
}

function kernelError(fn: () => unknown): { code: string; path?: string; got?: unknown; hint: string } {
  try {
    fn();
  } catch (e) {
    return (e as { hbf: { code: string; path?: string; got?: unknown; hint: string } }).hbf;
  }
  throw new Error("expected a thrown CommandError");
}

describe("imported route: DAVIT R3 STLs (M02-T02 step 1)", () => {
  it("finds the 15 DAVIT STLs the legacy zip holds", () => {
    expect(davit).toHaveLength(15);
    expect(davit.every((f) => sums.has(`stl/${f}`))).toBe(true);
  });

  it.each(davit)("%s imports welded, hashed and with positive volume", (name) => {
    const file = STL_DIR + name;
    const bytes = readFileSync(root + file);
    const want = row(file);
    expect(sha(bytes)).toBe(sums.get(`stl/${name}`));
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

describe("imported route: winding (D-102)", () => {
  it("refuses a flipped copy of crank.stl with E_KERNEL naming the file", () => {
    const file = `${STL_DIR}davit_crank.stl`;
    const flip = flipped(readFileSync(root + file));
    const err = kernelError(() => importStl(flip, "davit_crank.flipped.stl"));
    expect(err.code).toBe("E_KERNEL");
    expect(err.path).toBe("davit_crank.flipped.stl");
    expect(err.hint).toContain("davit_crank.flipped.stl");
    const want = row(file);
    expect(Math.abs((err.got as number) + want.signedVolumeMm3)).toBeLessThanOrEqual(want.areaMm2 * SNAP_MOVE_MM);
  });

  it("refuses the rp2040 pizero standin at about -6506 mm3", () => {
    const file = "packages/mesh/test/fixtures/board-rp2040-pizero-standin.stl";
    const want = row(file);
    expect(Math.round(want.signedVolumeMm3)).toBe(-6506);
    const err = kernelError(() => importStl(readFileSync(root + file), file));
    expect(err.code).toBe("E_KERNEL");
    expect(err.path).toBe(file);
    expect(Math.abs((err.got as number) - want.signedVolumeMm3)).toBeLessThanOrEqual(want.areaMm2 * SNAP_MOVE_MM);
  });
});

describe("imported route: reader (PLINTH parseSTL port)", () => {
  // A copy, never the Buffer itself: Buffer.slice is a view, and a test below edits its header.
  const pincap = new Uint8Array(readFileSync(`${root}${STL_DIR}davit_pincap.stl`));

  it("reads ASCII to the same welded mesh as binary", () => {
    const ascii = asciiOf(pincap);
    expect(stlEncoding(ascii)).toBe("ascii");
    expect(importStl(ascii, "pincap.ascii.stl").meshHash).toBe(importStl(pincap, "pincap.stl").meshHash);
  });

  it("reads a binary file whose header starts with solid as binary", () => {
    const b = new Uint8Array(pincap);
    b.set(Array.from("solid", (c) => c.charCodeAt(0)), 0);
    expect(stlEncoding(b)).toBe("binary");
    expect(importStl(b, "solid-header.stl").meshHash).toBe(importStl(pincap, "pincap.stl").meshHash);
  });

  it("refuses a truncated file with E_KERNEL naming it", () => {
    const err = kernelError(() => importStl(pincap.subarray(0, pincap.length - 7), "cut.stl"));
    expect(err.code).toBe("E_KERNEL");
    expect(err.path).toBe("cut.stl");
  });

  it("records the route guarantees in the registry", () => {
    expect(MESH_ROUTE_DEFS.get("imported")).toEqual({ route: "imported", guarantees: IMPORTED_ROUTE.guarantees, lazy: false });
    expect(IMPORTED_ROUTE.guarantees).toEqual({ manifold: false, exactZ: false, perSlotDisjoint: false });
    expect(IMPORTED_ROUTE.watertight).toBe("not assumed");
  });
});

describe("imported route in the stage runner", () => {
  const profile = createProfileLookup(loadProfile());
  const file = `${STL_DIR}davit_pincap.stl`;
  const body: BodyDraft = { id: "pincap", role: "body", slot: 1, material: "petg", base: { route: "imported", uri: file, format: "stl", tier: "inferred" } };
  const draft = (b: BodyDraft): PartDraft => ({
    id: "imported", name: "imported", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: true, pose: "print" }, bodies: [b], features: [],
  });
  const meshBytes = (uri: string) => readFileSync(root + uri);

  it("builds an imported body through stage 1 with the oracle volume", async () => {
    const out = await runStages({ draft: draft(body), profile, meshBytes });
    const want = row(file);
    expect(out.routes).toEqual(["imported"]);
    expect(Math.abs(out.bodies[0]!.volumeMm3 - want.signedVolumeMm3)).toBeLessThanOrEqual(want.areaMm2 * SNAP_MOVE_MM);
    expect(liveCount()).toBe(0);
  });

  it("refuses a format it cannot read and a missing resolver", async () => {
    await expect(runStages({ draft: draft({ ...body, base: { ...body.base, format: "step" } as BodyDraft["base"] }), profile, meshBytes }))
      .rejects.toMatchObject({ hbf: { code: "E_KERNEL", got: "step" } });
    await expect(runStages({ draft: draft(body), profile })).rejects.toMatchObject({ hbf: { code: "E_KERNEL" } });
    expect(liveCount()).toBe(0);
  });
});
