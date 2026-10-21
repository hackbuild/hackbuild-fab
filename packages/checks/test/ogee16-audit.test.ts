// M04-T11: the OGEE R16-P printed interference audit as a registry check on
// Part IR. Independent sources: the oracle's own stdout
// (packages/sim/scenes/ogee16-poses/audit-print.txt, audit_print.py run
// unedited), the poses and the oracle's per pair volumes written by
// tools/py/ogee16/export_poses.py with trimesh and manifold3d on the
// original source (ogee16-audit-originals.test.ts holds its bytes), and the numbers the M04 card recorded on 2026-10-04 (its
// Records table and step 5), read from the plan here. Nothing expected is
// computed by the port under test.

import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { isThrownCommandError, sha256Hex, type Assembly, type CheckResult, type Hash, type KernelId } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { liveCount, loadManifold, type MeshData } from "@hackbuild/mesh";
import { CHECK_MODULES, registerChecks, runRegistry, type KernelViews } from "../src/index";
import { auditPose, poseFinding, type InterferenceDecl, type PairVolume, type PoseAudit } from "../src/defs/asm/CHK-ASM-11";
import { buildOgeePrinted, readPoseFile, type OgeePrintedBuilt, type OgeePrintedScene, type OracleOverlap } from "../../sim/scenes/ogee16-printed";

const ROOT = new URL("../../../", import.meta.url);
const bytes = (rel: string): Buffer => readFileSync(new URL(rel, ROOT));
const text = (rel: string): string => bytes(rel).toString("utf8");

// ---- the plan, read here ----
const card = text("docs/plan/milestones/M04-checks-project.md");
const header = card.split(/^## M04-T01 /m)[0]!;
const t11 = card.split(/^## M04-T11 /m)[1]!.split(/^## M04-T12 /m)[0]!;

/** sha256 of the legacy oracle inputs, from the M04 header table. */
function headerSha(member: string): string {
  const m = new RegExp(`^\\| member \`source/${member.replace(".", "\\.")}\` \\| ([0-9a-f]{64}) \\|$`, "m").exec(header);
  if (m === null) throw new Error(`M04 header has no sha256 row for ${member}`);
  return m[1]!;
}

const instrumented = /^\| same audit, instrumented .*$/m.exec(header)![0];
/** "pairs passing the box test 198, 183, 183, 198" (computed 2026-10-04). */
const BOX_PAIRS = /pairs passing the box test ([\d, ]+);/.exec(instrumented)![1]!.split(",").map((s) => Number(s.trim()));
const BODIES = Number(/(\d+) bodies per pose/.exec(instrumented)![1]);
const LARGEST_TOUCH = Number(/largest overlap on a declared touch pair ([\d.]+) mm3/.exec(instrumented)![1]);
const REST_OVERLAPS = Number(/(\d+) pairs above 0\.01 mm3 at rest/.exec(instrumented)![1]);

/** Step 5's two negatives, as the card states them. */
const ROW_NEG = /row bar 0 at 12\.0 mm gives (\d+) clashes, rowbar0 against colbar0 to\s+colbar3, ([\d.]+) mm3 each/.exec(t11)!;
const COL_NEG = /column bar 1 at 12\.0 mm gives (\d+) squeeze\s+breach, deck and colbar1, ([\d.]+) mm3/.exec(t11)!;

/** Within 1 percent of the oracle, or half its last printed digit (0.005 mm3) where 1 percent is finer. */
const agrees = (got: number, want: number): boolean => Math.abs(got - want) <= Math.max(0.01 * want, 0.005);
const key = (a: string, b: string): string => [a, b].sort().join("|");
const above = <T extends { mm3: number }>(xs: readonly T[], v: number): T[] => xs.filter((x) => x.mm3 > v);

const profile = createProfileLookup(loadProfile());
const seed = JSON.parse(text("packages/checks/seed/checks.seed.json")) as Parameters<typeof registerChecks>[0]["seed"];
const DEF = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).find((d) => d.id === "CHK-ASM-11")!;
const KERNELS = new Set<KernelId>(["geom", "mesh", "profile", "sim"]);

// The test stands in for core: the build hash here is the declaration hash, which is what core's BuildInputs.defHash carries.
const asBuildHash = (h: Hash): Hash => h;

const built = new Map<OgeePrintedScene, OgeePrintedBuilt>();
const audits = new Map<string, PoseAudit>();

function viewsFor(b: OgeePrintedBuilt): KernelViews {
  const meshes: ReadonlyMap<string, MeshData> = b.meshes;
  return { mesh: (ref) => meshes.get(ref.hash), interference: (id) => (b.assemblies.some((a) => a.id === id) ? b.decl.audit : undefined) };
}

async function audit(b: OgeePrintedBuilt, a: Assembly): Promise<PoseAudit> {
  const r = await auditPose(a, b.decl.audit, (ref) => b.meshes.get(ref.hash));
  if ("reason" in r) throw new Error(r.reason);
  audits.set(a.id, r);
  return r;
}

let before = 0;
beforeAll(async () => {
  await loadManifold();
  before = liveCount();
  for (const s of ["ogee16-printed", "ogee16-printed-negatives"] as const) built.set(s, await buildOgeePrinted(s, asBuildHash));
}, 240_000);

afterAll(() => {
  // D-055: every manifold object the four poses and the negatives made is freed.
  expect(liveCount()).toBe(before);
  expect(liveCount()).toBe(0);
});

describe("oracle golden", () => {
  test("the oracle's stdout: four poses with clashes 0, TOTAL 0", () => {
    const out = text("packages/sim/scenes/ogee16-poses/audit-print.txt");
    expect([...out.matchAll(/^\[(.+?)\s*\] clashes: (\d+)$/gm)].map((m) => [m[1], Number(m[2])])).toEqual([
      ["rest", 0], ["full select 0,0", 0], ["all bars up", 0], ["clear pull", 0],
    ]);
    expect(out.trimEnd().endsWith("TOTAL: 0")).toBe(true);
  });

  test("the pose file names the same oracle inputs and the shipped STL bytes", () => {
    const f = readPoseFile("ogee16-printed");
    for (const m of ["audit_print.py", "kin.py", "params.scad"]) expect(f.sources[m], m).toBe(headerSha(m));
    for (const [stl, sum] of Object.entries(f.stl)) expect(sha256Hex(bytes(`packages/sim/scenes/inputs/ogee16/print/${stl}.stl`)), stl).toBe(sum);
  });

  test("the exporter's records: 75 bodies in 4 poses, box-test pairs 198, 183, 183, 198, no exceptions, every body watertight", () => {
    const f = readPoseFile("ogee16-printed");
    expect(f.poses.map((p) => p.label)).toEqual(["rest", "full select 0,0", "all bars up", "clear pull"]);
    expect(f.poses.map((p) => p.bodies.length)).toEqual([BODIES, BODIES, BODIES, BODIES]);
    expect(f.poses.map((p) => p.boxPairs)).toEqual(BOX_PAIRS);
    expect(above(f.poses[0]!.overlaps, 0.01)).toHaveLength(REST_OVERLAPS);
    for (const p of [...f.poses, ...readPoseFile("ogee16-printed-negatives").poses]) {
      expect(p.exceptions, p.label).toEqual([]);
      expect(p.nonWatertight, p.label).toEqual([]);
    }
    expect(f.poses.map((p) => p.clashes.length)).toEqual([0, 0, 0, 0]);
    expect([f.tolMm3, f.touchCeilingMm3]).toEqual([0.5, 120]);
  });
});

describe("CHK-ASM-11 on Part IR, four poses", () => {
  test("the registry runs it on each pose: pass, 0 clashes, legal 0 to 0", async () => {
    const b = built.get("ogee16-printed")!;
    expect(b.assemblies.map((a) => a.instances.length)).toEqual([BODIES, BODIES, BODIES, BODIES]);
    expect(DEF.pending).toBeUndefined();
    const report = await runRegistry([DEF], {
      kernels: KERNELS, targets: { assemblies: b.assemblies }, views: viewsFor(b) as KernelViews,
      ctx: { profile, machine: "ffc5p", whitelist: new Map() },
    });
    const rs: readonly CheckResult[] = report.results;
    expect(rs.map((r) => [r.target, r.verdict, r.measured])).toEqual(b.assemblies.map((a) => [{ level: "assembly", assembly: a.id }, "pass", 0]));
    for (const r of rs) {
      expect(r.legal).toMatchObject({ kind: "interval", lo: 0, hi: 0, unit: "count" });
      expect(r.origin).toBe("hbf://check/CHK-ASM-11");
    }
    expect(Math.max(...rs.map((r) => Number(r.extra!["largestTouchMm3"])))).toBeCloseTo(LARGEST_TOUCH, 1);
  }, 240_000);

  test("per pose, the pairs above 0.01 mm3 equal the oracle's, each volume within 1 percent; box-test pairs equal", async () => {
    const b = built.get("ogee16-printed")!;
    const oracle = b.decl.file.poses;
    let largest: PairVolume | undefined;
    for (const [i, a] of b.assemblies.entries()) {
      const r = audits.get(a.id) ?? await audit(b, a);
      const want = new Map(above(oracle[i]!.overlaps, 0.01).map((o) => [key(o.a, o.b), o]));
      const got = new Map(above(r.overlaps, 0.01).map((o) => [key(o.a, o.b), o]));
      expect([...got.keys()].sort(), a.id).toEqual([...want.keys()].sort());
      const off = [...got].filter(([k, g]) => !agrees(g.mm3, want.get(k)!.mm3)).map(([k, g]) => `${k} ${g.mm3} vs ${want.get(k)!.mm3}`);
      expect(off, a.id).toEqual([]);
      for (const [k, g] of got) expect(g.touch, k).toBe(want.get(k)!.touch);
      expect(r.boxPairs, a.id).toBe(oracle[i]!.boxPairs);
      expect(r.clashes, a.id).toEqual([]);
      for (const o of r.overlaps) if (o.touch && (largest === undefined || o.mm3 > largest.mm3)) largest = o;
    }
    expect(agrees(largest!.mm3, LARGEST_TOUCH), `${largest!.a}|${largest!.b} ${largest!.mm3}`).toBe(true);
  }, 240_000);
});

describe("negatives (step 5)", () => {
  async function negative(label: string): Promise<{ got: PoseAudit; want: readonly OracleOverlap[] }> {
    const b = built.get("ogee16-printed-negatives")!;
    const i = b.decl.file.poses.findIndex((p) => p.label === label);
    const a = b.assemblies[i]!;
    return { got: audits.get(a.id) ?? await audit(b, a), want: b.decl.file.poses[i]!.clashes };
  }
  const same = (got: readonly PairVolume[], want: readonly OracleOverlap[]): void => {
    expect(got.map((c) => [key(c.a, c.b), c.touch]).sort()).toEqual(want.map((c) => [key(c.a, c.b), c.touch]).sort());
    for (const c of got) expect(agrees(c.mm3, want.find((w) => key(w.a, w.b) === key(c.a, c.b))!.mm3), `${c.a}|${c.b} ${c.mm3}`).toBe(true);
  };

  test("row bar 0 three past the stroke: 4 clashes, rowbar0 against colbar0 to colbar3, 144.00 mm3 each", async () => {
    const { got, want } = await negative("row bar 0 at stroke plus 3");
    same(got.clashes, want);
    expect(got.clashes).toHaveLength(Number(ROW_NEG[1]));
    expect(got.clashes.map((c) => key(c.a, c.b)).sort()).toEqual([0, 1, 2, 3].map((j) => key("rowbar0", `colbar${j}`)).sort());
    for (const c of got.clashes) expect(agrees(c.mm3, Number(ROW_NEG[2])), `${c.b} ${c.mm3}`).toBe(true);
  }, 240_000);

  test("column bar 1 three past the stroke: 1 squeeze breach, deck and colbar1, 1525.80 mm3, a touch pair over its ceiling", async () => {
    const { got, want } = await negative("column bar 1 at stroke plus 3");
    same(got.clashes, want);
    expect(got.clashes).toHaveLength(Number(COL_NEG[1]));
    expect(got.clashes.map((c) => [key(c.a, c.b), c.touch])).toEqual([[key("deck", "colbar1"), true]]);
    expect(agrees(got.clashes[0]!.mm3, Number(COL_NEG[2]))).toBe(true);
  }, 240_000);

  test("the finding fails with the clash count and names the worst pairs", async () => {
    const b = built.get("ogee16-printed-negatives")!;
    const a = b.assemblies[0]!;
    const f = poseFinding(a, b.decl.audit, audits.get(a.id) ?? await audit(b, a));
    expect([f.verdict, f.measured, f.legal]).toEqual(["fail", 4, { kind: "interval", lo: 0, hi: 0, unit: "count", nearest: 0 }]);
    expect(f.constraint).toContain("rowbar0 against colbar");
    expect(f.constraint).toContain("144.00 mm3");
  }, 240_000);
});

describe("a boolean that throws is E_KERNEL naming the pair (D-153)", () => {
  test("an open body refuses with the pair in the path, never 0 mm3", async () => {
    const b = built.get("ogee16-printed-negatives")!;
    const a = b.assemblies[0]!;
    const row = a.parts.find((p) => p.id === "rowbar_asm")!;
    const decl: InterferenceDecl = b.decl.audit;
    const open = (ref: { hash: string }): MeshData | undefined => {
      const m = b.meshes.get(ref.hash);
      if (m === undefined || ref.hash !== row.solid.hash) return m;
      return { positions: m.positions, triangles: m.triangles.slice(3) };
    };
    let thrown: unknown;
    try {
      await auditPose(a, decl, open);
    } catch (e) {
      thrown = e;
    }
    expect(isThrownCommandError(thrown)).toBe(true);
    const hbf = (thrown as { hbf: { code: string; path: string } }).hbf;
    expect(hbf.code).toBe("E_KERNEL");
    expect(hbf.path).toMatch(/^\/assemblies\/ogee16-printed-negatives@row bar 0 at stroke plus 3\/pairs\/(rowbar\d\|\w+|\w+\|rowbar\d)\/[ab]$/);
  }, 240_000);
});
