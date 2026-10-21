// M02-T02: the imported mesh route (D-053, D-054, D-102). An inverted body
// is E_KERNEL naming the file; the reader and the stage runner take the
// DAVIT pincap. imported-davit.test.ts imports all 15 DAVIT R3 STLs.
//
// Independent sources: the triangle count, signed volume, area and
// watertightness come from trimesh (fixtures/imported-oracle.json, written
// by legacy/imported_oracle.py from the R3 STL zip, rows named by member).
// The crank and pincap are read from the davit scene's stored inputs
// (packages/sim/scenes/inputs), byte identical to those members: the
// sha256 is checked against the oracle row here.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BodyDraft, PartDraft } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  IMPORTED_ROUTE, MESH_ROUTE_DEFS, importStl, liveCount, readStl, runStages, stlEncoding,
} from "../src/index.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
/** A stored copy of an R3 STL zip member, held to the oracle row's sha256. */
const stored = (rel: string, member: string): Uint8Array => {
  const b = new Uint8Array(readFileSync(`${root}packages/sim/scenes/inputs/davit/${rel}`));
  expect(sha(b), `${rel} is ${member}`).toBe(row(member).sha256);
  return b;
};
const oracle = JSON.parse(readFileSync(new URL("./fixtures/imported-oracle.json", import.meta.url), "utf8")) as {
  rows: { file: string; sha256: string; triangles: number; trianglesAfterSnap: number; signedVolumeMm3: number; areaMm2: number; watertight: boolean; watertightAfterSnap: boolean }[];
};
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

describe("imported route: winding (D-102)", () => {
  it("refuses a flipped copy of crank.stl with E_KERNEL naming the file", () => {
    const file = "stl/davit_crank.stl";
    const flip = flipped(stored("r3/davit_crank.stl", file));
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
  const pincap = stored("r4/davit_pincap.stl", "stl/davit_pincap.stl");

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
  const file = "stl/davit_pincap.stl";
  const uri = "packages/sim/scenes/inputs/davit/r4/davit_pincap.stl";
  const body: BodyDraft = { id: "pincap", role: "body", slot: 1, material: "petg", base: { route: "imported", uri, format: "stl", tier: "inferred" } };
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
