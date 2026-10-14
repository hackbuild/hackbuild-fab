// CHK-PRT-12 against PAWL fdm.py, the source it ports, and the shared
// overhang rule CHK-PRT-13 reads. Expected figures come from fdm.py run as
// written (test/originals/pawl/fdm-golden.json, written by fdm_golden.py
// through tools/py) and from triangles whose areas and angles are set by
// construction here; none is computed by the code under test.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckResult, MeshRef, Part, Quat } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import type { MeshData } from "@hackbuild/mesh";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, registerChecks, runRegistry, type KernelViews } from "../src/index";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const ROOT = new URL("../../../", import.meta.url);
const HERE = new URL("./originals/pawl/", import.meta.url);
const seed: unknown = JSON.parse(readFileSync(new URL("packages/checks/seed/checks.seed.json", ROOT), "utf8"));
const defs = registerChecks({ seed: seed as never, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);
const profile = createProfileLookup(loadProfile());

interface Golden {
  readonly sourceSha256: string;
  readonly parts: Readonly<Record<string, { readonly stlSha256: string; readonly up: readonly [number, number, number]; readonly fdmPyPct: number; readonly pastLimitPct: number }>>;
}
const golden = JSON.parse(readFileSync(new URL("fdm-golden.json", HERE), "utf8")) as Golden;

/** Binary STL as an unindexed mesh, float32 coordinates widened. */
function readStl(bytes: Uint8Array): MeshData {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = dv.getUint32(80, true);
  const positions = new Float64Array(n * 9);
  for (let t = 0; t < n; t++) for (let j = 0; j < 9; j++) positions[t * 9 + j] = dv.getFloat32(84 + t * 50 + 12 + j * 4, true);
  return { positions, triangles: Uint32Array.from({ length: n * 3 }, (_, i) => i) };
}

/** The print rotation that turns fdm.py's build direction to +Z. */
const UP_TO_Z: Readonly<Record<string, Quat>> = {
  "0,0,1": [0, 0, 0, 1],
  "0,1,0": [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
  "0,0,-1": [1, 0, 0, 0],
};

/** One part of one body, emitted in assembly pose and turned to print by rot, reporting an overhang metric when pct is given. */
async function run(id: "CHK-PRT-12" | "CHK-PRT-13", mesh: MeshData, rot: Quat, pct?: number): Promise<CheckResult> {
  const ref: MeshRef = { uri: "hbf://mesh/under-test", hash: "a".repeat(64), triangles: mesh.triangles.length / 3, bbox: [[0, 0, 0], [1, 1, 1]], volumeMm3: 0, watertight: false } as unknown as MeshRef;
  const part = {
    id: "p", name: "p", process: "fdm", machine: "ffc5p", features: [], source: { kind: "kernel", routes: ["prism"] },
    metrics: pct === undefined ? [] : [{ id: "print.overhangPct", value: pct, unit: "percent", qualifier: "computed", basis: null, note: "overhang share of the surface", gate: "CHK-PRT-12" }],
    warnings: [], assertions: [], buildHash: "0".repeat(64),
    bodies: [{ id: "b", mesh: ref, material: "petg", slot: 1, role: "body" }], solid: ref,
    frame: { originOnAxis: false, carriesOffset: false, pose: "assembly" }, pose: { frame: "print", pos: [0, 0, 0], rot },
  } as unknown as Part;
  const views = { mesh: (r: MeshRef) => (r.uri === ref.uri ? mesh : undefined) } as KernelViews;
  const report = await runRegistry([defs.find((d) => d.id === id)!], {
    kernels: new Set(["mesh", "profile"]), produced: new Set(["part"]), targets: { parts: [part] }, views,
    ctx: { profile, machine: "ffc5p", whitelist: new Map() },
  });
  expect(report.results.length).toBe(1);
  return report.results[0]!;
}

const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

describe("CHK-PRT-12 against PAWL fdm.py", () => {
  test("the golden was written from fdm.py at the hash of record, on byte copies of the PAWL exports", () => {
    const orig = originalPath("pawl/files/");
    const at = (rel: string): Uint8Array | undefined => {
      try {
        return new Uint8Array(readFileSync(orig + rel));
      } catch {
        console.info(`not run: ${orig}${rel} is not on this machine`);
        return undefined;
      }
    };
    const fdm = at("src/fdm.py");
    if (fdm !== undefined) expect(sha(fdm)).toBe(golden.sourceSha256);
    for (const [name, g] of Object.entries(golden.parts)) {
      const stl = at(`exports/${name}.stl`);
      if (stl !== undefined) expect(sha(stl), name).toBe(g.stlSha256);
    }
  });

  for (const [name, g] of Object.entries(golden.parts)) {
    test(`${name}: the overhang share equals fdm.py with a face at 45 deg at the limit, ${g.pastLimitPct} percent`, async () => {
      const bytes = new Uint8Array(readFileSync(new URL(`${name}.stl`, HERE)));
      expect(sha(bytes)).toBe(g.stlSha256);
      const r = await run("CHK-PRT-12", readStl(bytes), UP_TO_Z[g.up.join(",")]!, g.pastLimitPct);
      const got = r.extra?.["overhangPct"] as number;
      console.info(`${name}: check ${got}, fdm.py at the limit ${g.pastLimitPct}, fdm.py as printed ${g.fdmPyPct} (float32 ties)`);
      expect(Math.abs(got - g.pastLimitPct)).toBeLessThan(0.006);
      expect(r.verdict).toBe("pass");
    });
  }

  test("the foot reads 1.43, not the 3.14 an inclusive 45 deg boundary gives (its eight 45 deg chamfers)", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("foot.stl", HERE)));
    const r = await run("CHK-PRT-12", readStl(bytes), UP_TO_Z["0,1,0"]!);
    expect(r.extra?.["overhangPct"]).toBe(1.43);
  });
});

// Triangles set by construction, in print pose (frame pose print needs no turn).
const tri = (...v: [number, number, number][]): number[] => v.flat();
const mesh = (...tris: number[][]): MeshData => {
  const positions = Float64Array.from(tris.flat());
  return { positions, triangles: Uint32Array.from({ length: positions.length / 3 }, (_, i) => i) };
};
const ID: Quat = [0, 0, 0, 1];
// A face 60 deg from vertical, facing down: edge 10 along x at z 0.05, rising 0.6 over 0.6/tan 30 in y; slant 1.2, area 6.
const RUN30 = 0.6 / Math.tan(Math.PI / 6);
const steepLow = tri([0, 0, 0.05], [0, RUN30, 0.65], [10, 0, 0.05]);
// A face on the plate facing down, area 6; and a face up at z 5, area 6.
const bedFace = tri([20, 0, 0], [20, 4, 0], [23, 0, 0]);
const upFace = tri([30, 0, 5], [33, 0, 5], [30, 4, 5]);

/** A face facing down at deg from vertical, rising 10 mm above z 2, edge 10 along x; area 10 x 10 / cos(deg) / 2. */
function tilted(deg: number): { readonly t: number[]; readonly area: number } {
  const run = 10 / Math.tan(((90 - deg) * Math.PI) / 180);
  return { t: tri([40, 0, 2], [40, run, 12], [50, 0, 2]), area: (10 * Math.hypot(run, 10)) / 2 };
}

describe("the shared overhang rule", () => {
  test("the bed band is per triangle top, as fdm.py line 43: a steep face from z 0.05 to 0.65 counts though its centroid is 0.25", async () => {
    const r = await run("CHK-PRT-12", mesh(steepLow, bedFace, upFace), ID, 33.3);
    expect(r.extra?.["overhangPct"]).toBe(33.33);
    expect(r.extra?.["overhangWithBedPct"]).toBe(66.67);
    expect(r.verdict).toBe("pass");
  });

  test("CHK-PRT-13 reads the same band: that face is its worst at 60 deg, the plate face left out", async () => {
    const r = await run("CHK-PRT-13", mesh(steepLow, bedFace, upFace), ID);
    expect(r.measured).toBe(60);
    expect(r.extra?.["overhangAreaMm2"]).toBe(6);
    expect(r.extra?.["bridgeAreaMm2"]).toBe(0);
    expect(r.verdict).toBe("fail");
  });

  test("a face at 45.00002 deg is at the limit; one at 45.01 is past it", async () => {
    const at = tilted(45.00002), past = tilted(45.01);
    const total = 6 + 6 + at.area + past.area;
    const r = await run("CHK-PRT-12", mesh(bedFace, upFace, at.t, past.t), ID);
    expect(Math.abs((r.extra?.["overhangPct"] as number) - (100 * past.area) / total)).toBeLessThan(0.006);
  });

  test("the limit is profile overhang.maxDeg; the message names it", async () => {
    const r = await run("CHK-PRT-12", mesh(steepLow, bedFace, upFace), ID);
    const row = profile.constant("overhang.maxDeg");
    expect(r.constraint).toContain(`past ${row.value} deg from vertical (profile overhang.maxDeg, ${row.provenance.tier})`);
  });
});
