// src/mesh.ts holds the mesh shape, signed volume and the CHK-PRT-01 audit
// so the package carries no wasm and the D-027 split stands alone.
// packages/mesh is tier 0 and keeps the same code (PACKAGES.md 3.1); this
// file fails when the two copies drift, in source text and on fixtures, and
// when a runtime dependency on a workspace package other than spec returns.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join as joinPath } from "node:path";
import { describe, expect, it } from "vitest";
import * as kernel from "@hackbuild/mesh";
import { MIN_TRIANGLE_AREA_MM2, audit, signedVolume, type MeshData } from "../src/index.js";

const PKG = new URL("../", import.meta.url);
const text = (rel: string): string => readFileSync(new URL(rel, PKG), "utf8");

/** The block from the line starting with `start` to the first closing brace at column 0, or to the end. */
function block(src: string, start: string, toEnd = false): string {
  const i = src.indexOf(`\n${start}`);
  if (i < 0) throw new Error(`marker ${start} not found`);
  const rest = src.slice(i + 1);
  if (toEnd) return rest.trimEnd();
  const j = rest.indexOf("\n}\n");
  return rest.slice(0, j + 2);
}

const CUBE_TRIS = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];

function cube(s: number, [x, y, z]: readonly [number, number, number] = [0, 0, 0]): MeshData {
  const positions = Float64Array.from([
    x, y, z, x + s, y, z, x + s, y + s, z, x, y + s, z,
    x, y, z + s, x + s, y, z + s, x + s, y + s, z + s, x, y + s, z + s,
  ]);
  return { positions, triangles: Uint32Array.from(CUBE_TRIS) };
}

function join(a: MeshData, b: MeshData): MeshData {
  const n = a.positions.length / 3;
  const positions = new Float64Array(a.positions.length + b.positions.length);
  positions.set(a.positions);
  positions.set(b.positions, a.positions.length);
  const triangles = new Uint32Array(a.triangles.length + b.triangles.length);
  triangles.set(a.triangles);
  triangles.set(b.triangles.map((i) => i + n), a.triangles.length);
  return { positions, triangles };
}

function inverted(m: MeshData): MeshData {
  const t = m.triangles.slice();
  for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2]!, t[i + 1]!];
  return { positions: m.positions.slice(), triangles: t };
}

/** A sliver: the cube with one vertex moved onto a face diagonal, so two triangles fall under the area floor. */
function sliver(): MeshData {
  const m = cube(10);
  const p = m.positions.slice();
  p.set([10, 10, 0], 3 * 1);
  p.set([10, 10, 0], 3 * 3);
  return { positions: p, triangles: m.triangles };
}

/** The cube with corner 0 split in two, 0.3 grid steps apart, for the bottom face: open on raw indices, closed on the merge grid. */
function splitCorner(): MeshData {
  const m = cube(10);
  const positions = new Float64Array(m.positions.length + 3);
  positions.set(m.positions);
  positions.set([0.3 / 1024, 0, 0], m.positions.length);
  const triangles = m.triangles.slice();
  for (let i = 0; i < 6; i += 1) if (triangles[i] === 0) triangles[i] = 8;
  return { positions, triangles };
}

const HAND: Readonly<Record<string, () => MeshData>> = {
  cube: () => cube(10),
  "inside-out cube": () => inverted(cube(10)),
  "corner-touching cubes": () => join(cube(10), cube(10, [10, 10, 10])),
  "open cube": () => ({ positions: cube(10).positions, triangles: Uint32Array.from(CUBE_TRIS.slice(3)) }),
  "cube with slivers": sliver,
  "corner split under half a grid step": splitCorner,
  empty: () => ({ positions: new Float64Array(0), triangles: new Uint32Array(0) }),
};

async function kernelMeshes(): Promise<Record<string, MeshData>> {
  const wasm = await kernel.loadManifold();
  return kernel.scope(() => {
    const { Manifold } = wasm;
    const keep = (m: InstanceType<typeof Manifold>): MeshData => kernel.meshOf(m);
    return {
      sphere: keep(Manifold.sphere(7.3, 48)),
      cylinder: keep(Manifold.cylinder(4.1, 2.5, 2.5, 40)),
      "cube minus cylinder": keep(Manifold.cube([10, 10, 10]).subtract(Manifold.cylinder(12, 3, 3, 32).translate([5, 5, -1]))),
    };
  });
}

describe("src/mesh.ts against packages/mesh", () => {
  it("holds the same source as mesh/src/hash.ts and mesh/src/audit.ts", () => {
    const local = text("src/mesh.ts");
    const hash = readFileSync(new URL("../mesh/src/hash.ts", PKG), "utf8");
    const aud = readFileSync(new URL("../mesh/src/audit.ts", PKG), "utf8");
    expect(block(local, "/** Indexed triangle mesh")).toBe(block(hash, "/** Indexed triangle mesh"));
    expect(block(local, "/** Signed enclosed volume")).toBe(block(hash, "/** Signed enclosed volume"));
    expect(block(local, "/** Triangles under this area", true)).toBe(block(aud, "/** Triangles under this area", true));
    expect(MIN_TRIANGLE_AREA_MM2).toBe(kernel.MIN_TRIANGLE_AREA_MM2);
  });

  it("gives equal audits and volumes on hand fixtures and kernel meshes, on both merge grids", async () => {
    const meshes: Record<string, MeshData> = { ...Object.fromEntries(Object.entries(HAND).map(([k, f]) => [k, f()])), ...(await kernelMeshes()) };
    const verdicts: string[] = [];
    for (const [name, m] of Object.entries(meshes)) {
      for (const opts of [{}, { mergeGridPerMm: 1e8 }]) {
        const mine = audit(m, opts);
        expect([name, opts, mine]).toEqual([name, opts, kernel.audit(m, opts)]);
        verdicts.push(`${name}${"mergeGridPerMm" in opts ? " @1e8" : ""} ${mine.ok ? "ok" : "fail"}`);
      }
      expect(signedVolume(m)).toBe(kernel.signedVolume(m));
    }
    // The fixtures cover a pass and each failing count, so a drift in any branch shows.
    const all = Object.entries(meshes).map(([, m]) => audit(m));
    expect(all.some((a) => a.ok)).toBe(true);
    expect(all.some((a) => a.openEdgesRaw > 0 && a.openEdges === 0)).toBe(true);
    expect(all.some((a) => a.windingErrors > 0 || a.signedVolumeMm3 < 0)).toBe(true);
    expect(all.some((a) => a.degenerate > 0)).toBe(true);
    expect(all.some((a) => a.nonManifoldVertices > 0)).toBe(true);
    console.log(`mesh parity: ${verdicts.length} audits equal (${verdicts.join(", ")})`);
  });
});

describe("the hackbuild-3mf split carries src/mesh.ts unchanged (D-027)", () => {
  // tools/import-from-fab.sh rewrites only the spec import to ./contracts.js.
  // The split is a sibling working tree (M00-T15); without it there is no copy.
  const SPLIT = new URL("../../../hackbuild-3mf/js/src/mesh.ts", PKG);
  const present = existsSync(SPLIT);

  it.skipIf(!present)("equals src/mesh.ts with the spec import rewritten", () => {
    const want = text("src/mesh.ts").replace('from "@hackbuild/spec"', 'from "./contracts.js"');
    expect(readFileSync(SPLIT, "utf8")).toBe(want);
  });
});

describe("standalone package (D-027, PACKAGES.md 5.1)", () => {
  it("lists no workspace package other than spec as a runtime dependency", () => {
    const pkg = JSON.parse(text("package.json")) as { dependencies?: Record<string, string> };
    expect(Object.keys(pkg.dependencies ?? {}).filter((d) => d.startsWith("@hackbuild/") && d !== "@hackbuild/spec")).toEqual([]);
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain("manifold-3d");
  });

  it("imports no workspace package other than spec, and no wasm, under src/", () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir)) {
        const p = joinPath(dir, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".ts")) files.push(p);
      }
    };
    walk(new URL("src", PKG).pathname);
    const bad: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(f, "utf8").matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)) {
        const spec = m[1]!;
        if ((spec.startsWith("@hackbuild/") && spec !== "@hackbuild/spec") || spec.startsWith("manifold-3d")) bad.push(`${f}: ${spec}`);
      }
    }
    expect(files.length).toBeGreaterThan(10);
    expect(bad).toEqual([]);
  });
});
