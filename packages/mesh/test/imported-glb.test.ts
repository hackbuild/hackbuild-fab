// M04-T14: the GLB reader of the imported route (D-160). Both corpus GLBs
// read to welded bodies whose triangle count, signed volume and bounds
// agree with trimesh's glTF loader (fixtures/imported-glb-oracle.json,
// written by legacy/imported_glb_oracle.py), an independent reader of the
// same bytes; the bytes are tied to tools/corpus/import/SHA256SUMS. The
// refusals are driven by edits to the JSON chunk of a corpus file.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BodyDraft, PartDraft } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { bounds, importGlb, isWatertight, liveCount, readGlbChunks, runStages, signedVolume, stageImported } from "../src/index.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const CORPUS = "tools/corpus/import/";
const oracle = JSON.parse(readFileSync(new URL("./fixtures/imported-glb-oracle.json", import.meta.url), "utf8")) as {
  rows: { file: string; sha256: string; triangles: number; signedVolume: number; area: number; boundsLo: number[]; boundsHi: number[]; geometries: number; geometriesWatertight: number }[];
};
const sums = new Map(readFileSync(root + CORPUS + "SHA256SUMS", "utf8").trim().split("\n").map((l) => {
  const [h, f] = l.split(/\s+/);
  return [CORPUS + f!, h!] as const;
}));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const bytesOf = (file: string) => new Uint8Array(readFileSync(root + file));
const row = (file: string) => {
  const r = oracle.rows.find((x) => x.file === file);
  if (r === undefined) throw new Error(`no oracle row for ${file}`);
  return r;
};
// The D-054 weld moves each vertex by at most sqrt(3)/2048 mm; to first
// order the volume moves by at most area x that (computed), the bound the
// STL route's test uses.
const SNAP_MOVE_MM = Math.sqrt(3) / 2048;
const GRID_MM = 1 / 1024;

type Json = Record<string, unknown> & { nodes: Record<string, unknown>[]; meshes: { primitives: Record<string, unknown>[] }[]; scenes: { nodes: number[] }[] };

/** The same GLB with its JSON chunk replaced: an edited twin for the refusal tests. */
function withJson(bytes: Uint8Array, edit: (j: Json) => void): Uint8Array {
  const { json } = readGlbChunks(bytes, "edit");
  const j = JSON.parse(JSON.stringify(json)) as Json;
  edit(j);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const binAt = 20 + dv.getUint32(12, true);
  const bin = bytes.subarray(binAt);
  const text = new TextEncoder().encode(JSON.stringify(j));
  const padded = Math.ceil(text.length / 4) * 4;
  const out = new Uint8Array(20 + padded + bin.length);
  const o = new DataView(out.buffer);
  o.setUint32(0, 0x46546c67, true);
  o.setUint32(4, 2, true);
  o.setUint32(8, out.length, true);
  o.setUint32(12, padded, true);
  o.setUint32(16, 0x4e4f534a, true);
  out.set(text, 20);
  out.fill(0x20, 20 + text.length, 20 + padded);
  out.set(bin, 20 + padded);
  return out;
}

function kernelError(fn: () => unknown): { code: string; path?: string; got?: unknown; hint: string } {
  try {
    fn();
  } catch (e) {
    return (e as { hbf: { code: string; path?: string; got?: unknown; hint: string } }).hbf;
  }
  throw new Error("expected a refusal");
}

const FILES = [`${CORPUS}locket-r2.glb`, `${CORPUS}lug.glb`];

describe("imported route: glb reader against trimesh", () => {
  for (const file of FILES) {
    it(`${file} matches SHA256SUMS and the oracle in count, volume and bounds`, () => {
      const bytes = bytesOf(file);
      const want = row(file);
      expect(sha(bytes)).toBe(sums.get(file));
      expect(want.sha256).toBe(sums.get(file));
      const got = importGlb(bytes, file);
      expect(got.encoding).toBe("glb");
      expect(got.trianglesRead).toBe(want.triangles);
      expect(Math.abs(got.volumeMm3 - want.signedVolume)).toBeLessThanOrEqual(want.area * SNAP_MOVE_MM);
      // glTF +Y up to kernel +Z up: (x, y, z) to (x, -z, y).
      const [lo, hi] = bounds(got.mesh);
      const map = (v: readonly number[]) => [v[0]!, -v[2]!, v[1]!];
      const wlo = map(want.boundsLo), whi = map(want.boundsHi);
      const mlo = [Math.min(wlo[0]!, whi[0]!), Math.min(wlo[1]!, whi[1]!), Math.min(wlo[2]!, whi[2]!)];
      const mhi = [Math.max(wlo[0]!, whi[0]!), Math.max(wlo[1]!, whi[1]!), Math.max(wlo[2]!, whi[2]!)];
      for (let k = 0; k < 3; k += 1) {
        expect(Math.abs(lo[k]! - mlo[k]!)).toBeLessThanOrEqual(GRID_MM);
        expect(Math.abs(hi[k]! - mhi[k]!)).toBeLessThanOrEqual(GRID_MM);
      }
    });

    it(`${file} scales by mmPerUnit before the weld`, () => {
      const want = row(file);
      const inM = importGlb(bytesOf(file), file, 1000);
      // At 1000 mm per unit the weld bound shrinks a thousandfold relative to the volume.
      expect(Math.abs(inM.volumeMm3 / 1e9 - want.signedVolume)).toBeLessThanOrEqual((want.area * 1e6 * SNAP_MOVE_MM) / 1e9);
    });
  }

  it("keeps one part per mesh node, each welded alone", () => {
    const locket = importGlb(bytesOf(`${CORPUS}locket-r2.glb`), "locket");
    const { json } = readGlbChunks(bytesOf(`${CORPUS}locket-r2.glb`), "locket");
    expect(locket.parts.length).toBe((json.nodes ?? []).filter((n) => n.mesh !== undefined).length);
    expect(locket.parts.length).toBe(row(`${CORPUS}locket-r2.glb`).geometriesWatertight);
    expect(locket.parts.every((p) => isWatertight(p.mesh))).toBe(true);
    // Welded together the parts that touch would share vertices and fail the edge audit.
    expect(locket.parts.reduce((s, p) => s + p.mesh.positions.length, 0)).toBe(locket.mesh.positions.length);
    const lug = importGlb(bytesOf(`${CORPUS}lug.glb`), "lug");
    expect(row(`${CORPUS}lug.glb`).geometriesWatertight).toBe(0);
    expect(lug.parts.filter((p) => !isWatertight(p.mesh)).length).toBeGreaterThan(0);
  });
});

describe("imported route: glb refusals", () => {
  const locket = bytesOf(`${CORPUS}locket-r2.glb`);

  it("refuses a primitive mode other than triangles, naming the node", () => {
    const lines = withJson(locket, (j) => { j.meshes[0]!.primitives[0]!["mode"] = 1; });
    const err = kernelError(() => importGlb(lines, "lines.glb"));
    expect(err.code).toBe("E_KERNEL");
    expect(err.got).toBe(1);
    expect(err.path).toBe("lines.glb/meshes/0/primitives/0");
    expect(err.hint).toContain("LOCKET_R2_body.base_black");
  });

  it("reverses triangles under a mirroring node transform, so volume stays positive", () => {
    const want = importGlb(locket, "locket").volumeMm3;
    const mirrored = withJson(locket, (j) => { for (const n of j.nodes) n["scale"] = [-1, 1, 1]; });
    const got = importGlb(mirrored, "mirrored.glb");
    expect(Math.abs(got.volumeMm3 - want)).toBeLessThanOrEqual(row(`${CORPUS}locket-r2.glb`).area * SNAP_MOVE_MM);
  });

  it("applies node translation", () => {
    const moved = importGlb(withJson(locket, (j) => { for (const n of j.nodes) n["translation"] = [10, 0, 0]; }), "moved.glb");
    const [lo] = bounds(moved.mesh);
    expect(Math.abs(lo[0]! - (-63.5 + 10))).toBeLessThanOrEqual(GRID_MM);
  });

  it("refuses a required extension and bytes that are not a glb", () => {
    const draco = withJson(locket, (j) => { j["extensionsRequired"] = ["KHR_draco_mesh_compression"]; });
    expect(kernelError(() => importGlb(draco, "draco.glb")).hint).toContain("KHR_draco_mesh_compression");
    const stl = bytesOf("packages/mesh/test/fixtures/board-rp2040-pizero-standin.stl");
    const err = kernelError(() => importGlb(stl, "board.stl"));
    expect(err.code).toBe("E_KERNEL");
    expect(err.path).toBe("board.stl");
  });
});

describe("imported route: glb in the stage runner and the audit stage", () => {
  const profile = createProfileLookup(loadProfile());
  const one = withJson(bytesOf(`${CORPUS}locket-r2.glb`), (j) => { j.scenes = [{ nodes: [2] }]; });
  const body: BodyDraft = { id: "white", role: "body", slot: 1, material: "petg", base: { route: "imported", uri: "one.glb", format: "glb", tier: "inferred" } };
  const draft: PartDraft = { id: "imported", name: "imported", process: "fdm", machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: true, pose: "print" }, bodies: [body], features: [] };

  it("builds a glb body through the stage runner at the reader's volume", async () => {
    const read = importGlb(one, "one.glb");
    const out = await runStages({ draft, profile, meshBytes: () => one, meshScale: () => 1 });
    expect(out.routes).toEqual(["imported"]);
    expect(Math.abs(out.bodies[0]!.volumeMm3 - read.volumeMm3)).toBeLessThanOrEqual(1e-6 * read.volumeMm3);
    expect(liveCount()).toBe(0);
  });

  it("unions closed parts and reports why no union exists otherwise", async () => {
    const single = await stageImported([{ draft: body, read: importGlb(one, "one.glb") }]);
    expect(single.noUnion).toBeNull();
    expect(Math.abs(signedVolume(single.staged.solid) - single.staged.bodies[0]!.volumeMm3)).toBeLessThanOrEqual(1e-6 * single.staged.bodies[0]!.volumeMm3);
    const lug = await stageImported([{ draft: { ...body, id: "lug" }, read: importGlb(bytesOf(`${CORPUS}lug.glb`), "lug.glb") }]);
    expect(lug.noUnion).toMatch(/^\d+ of 26 parts fail the audit/);
    expect(lug.staged.warnings.every((w) => w.code === "AUDIT")).toBe(true);
    expect(liveCount()).toBe(0);
  });
});
