// M04-T03: severity and precondition checks (D-067, CHECKS.md section 3).
// Independent sources: the raw seed rows (packages/checks/seed), the
// generated counts (docs/plan/counts.json, written by tools/counts.mjs), the
// precondition table of CHECKS.md section 3, and the corpus file lug.glb,
// whose node parts trimesh finds open (tools/corpus/import/MANIFEST.json,
// 25 of 26 open, computed). A seed row that loses its severity, a lost
// precondition flag, a softened block fail, a dropped NOTE rank or a
// precondition gate that stops gating each fails a test here.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { BodyDraft, CheckId, CheckResult, KernelId, MeshRef, Part, PartDraft, Severity, Verdict } from "@hackbuild/spec";
import { assemblePart, importGlb, importStl, type MeshData, stageImported } from "@hackbuild/mesh";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  CHECK_MODULES, SEVERITY_LABEL, blocksExport, bySeverity, findingLabel, gatedBy, preconditionIds, preconditionReason, readsSolid,
  registerChecks, runRegistry, withSeverity,
} from "../src/index";

const root = new URL("../../../", import.meta.url);
const readText = (rel: string): string => readFileSync(new URL(rel, root), "utf8");
const seed = JSON.parse(readText("packages/checks/seed/checks.seed.json")) as { checks: { id: string; severity: Severity; precondition?: boolean }[] };
// Every registered row: the seeded rows and those entered later (counts.json checks.registered).
const counts = (JSON.parse(readText("docs/plan/counts.json")) as { checks: { registered: { total: number; block: number; warn: number } } }).checks.registered;
const defs = registerChecks({ seed }, CHECK_MODULES);

/** The check ids of the precondition table in CHECKS.md section 3, in table order. */
function preconditionTable(): string[] {
  const md = readText("docs/plan/CHECKS.md");
  const sec = md.slice(md.indexOf("\n## 3. Severity"), md.indexOf("\n## 4. Targets"));
  const table = sec.slice(sec.indexOf("Precondition checks."), sec.indexOf("Seed rows register"));
  return [...table.matchAll(/^\| (CHK-[A-Z0-9]+-\d+) \|/gm)].map((m) => m[1]!);
}

function result(id: string, severity: Severity, verdict: Verdict): CheckResult {
  return {
    id: id as CheckId, version: "1.0.0", verdict, severity, target: { level: "part", part: "p" }, constraint: "c",
    origin: `hbf://check/${id}` as CheckResult["origin"], measured: 1.5, legal: { kind: "interval", lo: 2, hi: null, unit: "mm", nearest: 2 },
  };
}

describe("seed severity registers unchanged", () => {
  test("every registered check carries its seed row's severity, and the split equals the generated counts", () => {
    const rows = new Map(seed.checks.map((r) => [r.id, r]));
    expect(defs.length).toBe(counts.total);
    for (const d of defs) expect(d.severity, d.id).toBe(rows.get(d.id)!.severity);
    const by = (s: Severity): number => defs.filter((d) => d.severity === s).length;
    expect({ block: by("block"), warn: by("warn"), note: by("note") }).toEqual({ block: counts.block, warn: counts.warn, note: 0 });
    console.log(`severity split (computed from the registry): block ${by("block")}, warn ${by("warn")}, note ${by("note")}`);
  });

  test("the precondition checks are exactly the CHECKS.md section 3 table, each block", () => {
    const table = preconditionTable();
    expect(table.length).toBe(7);
    const flagged = preconditionIds(defs);
    expect([...flagged].sort()).toEqual([...table].sort());
    for (const id of flagged) expect(defs.find((d) => d.id === id)!.severity, id).toBe("block");
    console.log(`precondition checks (registry, seed order): ${flagged.join(", ")}`);
  });
});

describe("severity effect of a fail", () => {
  test("block keeps fail and stops export; warn and note become verdict warn with the evidence unchanged", () => {
    const b = withSeverity(result("CHK-PRT-04", "block", "fail"));
    expect(b.verdict).toBe("fail");
    expect(blocksExport(b)).toBe(true);
    for (const s of ["warn", "note"] as const) {
      const raw = result("CHK-PRT-09", s, "fail");
      const r = withSeverity(raw);
      expect(r.verdict, s).toBe("warn");
      expect(blocksExport(r), s).toBe(false);
      expect({ measured: r.measured, legal: r.legal }).toEqual({ measured: raw.measured, legal: raw.legal });
    }
    for (const v of ["pass", "warn", "skip"] as const) expect(withSeverity(result("CHK-PRT-04", "block", v)).verdict).toBe(v);
  });

  test("the text mirror words are FAIL, WARN, NOTE, printed in that order; passes and skips are counted only", () => {
    expect(SEVERITY_LABEL).toEqual({ block: "FAIL", warn: "WARN", note: "NOTE" });
    const rs = [
      withSeverity(result("CHK-A-01", "note", "fail")), withSeverity(result("CHK-A-02", "warn", "fail")), result("CHK-A-03", "block", "pass"),
      withSeverity(result("CHK-A-04", "block", "fail")), result("CHK-A-05", "block", "skip"), withSeverity(result("CHK-A-06", "warn", "fail")),
    ];
    expect(rs.map(findingLabel)).toEqual(["NOTE", "WARN", null, "FAIL", null, "WARN"]);
    expect(bySeverity(rs).map((r) => r.id)).toEqual(["CHK-A-04", "CHK-A-02", "CHK-A-06", "CHK-A-01"]);
  });
});

describe("precondition gate on the seed", () => {
  test("a CHK-PRT-01 fail gates the checks that read a part's solid and no other", () => {
    const order = preconditionIds(defs);
    const gated = defs.filter((d) => gatedBy(d, ["CHK-PRT-01"], order) !== null).map((d) => d.id);
    // Derived from the seed: needs mesh (D-057) at a level that lies on a part.
    const solid = defs.filter((d) => d.id !== "CHK-PRT-01" && d.needs.includes("mesh") && ["part", "body", "feature", "assembly"].includes(d.appliesTo.level)).map((d) => d.id);
    expect(gated).toEqual(solid);
    for (const id of ["CHK-PRT-02", "CHK-PRT-03", "CHK-PRT-04", "CHK-KEY-01", "CHK-KEY-06"]) expect(gated, id).toContain(id);
    // geom, 3mf, circuit and net readers keep running: SHP-04 counts bodies through geom.
    for (const id of ["CHK-PRT-01", "CHK-SHP-04", "CHK-3MF-04", "CHK-NET-02", "CHK-KEY-04"]) expect(gated, id).not.toContain(id);
    expect(defs.filter(readsSolid).length).toBe(solid.length + 1);
  });

  test("a precondition is gated only by one seeded before it", () => {
    const order = preconditionIds(defs);
    const def = (id: string) => defs.find((d) => d.id === id)!;
    expect(gatedBy(def("CHK-PRT-03"), ["CHK-PRT-01"], order)).toBe("CHK-PRT-01");
    expect(gatedBy(def("CHK-PRT-01"), ["CHK-PRT-03"], order)).toBeNull();
    expect(preconditionReason("CHK-PRT-01")).toBe("precondition CHK-PRT-01 failed");
  });
});

/** A binary STL of an axis-aligned cube of side `a` mm, outward winding. */
function cubeStl(a: number): Uint8Array {
  const v = (i: number): [number, number, number] => [(i & 1) * a, ((i >> 1) & 1) * a, ((i >> 2) & 1) * a];
  const quads = [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]];
  const tris = quads.flatMap(([p, q, r, t]) => [[p!, q!, r!], [p!, r!, t!]]);
  const buf = new DataView(new ArrayBuffer(84 + 50 * tris.length));
  buf.setUint32(80, tris.length, true);
  tris.forEach((t, i) => t.forEach((k, j) => v(k).forEach((c, x) => buf.setFloat32(84 + 50 * i + 12 + 12 * j + 4 * x, c, true))));
  return new Uint8Array(buf.buffer);
}

/**
 * A Part built through the import route from a corpus file or given bytes, with a mesh view over its own meshes.
 * The mesh layer leaves buildHash to core (packages/mesh partir.ts); no BuildInputs exist here, so it is zero.
 */
async function importedPart(file: string, bytes?: Uint8Array): Promise<{ part: Part; mesh: (ref: MeshRef) => MeshData | undefined }> {
  const glb = file.endsWith(".glb");
  const raw = bytes ?? new Uint8Array(readFileSync(new URL(`tools/corpus/import/${file}`, root)));
  const read = glb ? importGlb(raw, file, 1) : importStl(raw, file, 1);
  const id = file.replace(/\.[^.]*$/, "").replace(/[^a-z0-9]+/g, "-");
  const body: BodyDraft = { id, role: "body", slot: 1, material: "", base: { route: "imported", uri: `hbf://source/${"0".repeat(64)}`, format: glb ? "glb" : "stl", tier: "inferred" } };
  const draft: PartDraft = { id, name: file, process: "fdm", machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: true, pose: "assembly" }, bodies: [body], features: [] };
  const { staged } = await stageImported([{ draft: body, read }]);
  const { part } = assemblePart(draft, staged);
  const byUri = new Map<string, MeshData>([[part.solid.uri, staged.solid], ...staged.bodies.map((b, i) => [part.bodies[i]!.mesh.uri, b.mesh] as const)]);
  return { part: { ...part, buildHash: "0".repeat(64) as Part["buildHash"] }, mesh: (ref) => byUri.get(ref.uri) };
}

const KERNELS = new Set<KernelId>(["geom", "mesh", "profile", "3mf", "sim"]);

async function registryRun(file: string, bytes?: Uint8Array, run: typeof defs = defs): Promise<{ partId: string; results: readonly CheckResult[] }> {
  const { part, mesh } = await importedPart(file, bytes);
  const profile = createProfileLookup(loadProfile());
  const report = await runRegistry(run, { kernels: KERNELS, targets: { parts: [part] }, ctx: { profile, machine: "ffc5p", whitelist: new Map() }, views: { mesh } });
  return { partId: part.id, results: report.results };
}

const ranIds = (rs: readonly CheckResult[]): string[] => [...new Set(rs.filter((r) => r.verdict !== "skip").map((r) => r.id))];

describe("registry run over imported parts", () => {
  test("lug.glb (open node parts): CHK-PRT-01 fails; every solid reader that runs on a closed cube skips naming it; nothing else is gated", async () => {
    const cube = await registryRun("cube.stl", cubeStl(10));
    expect(cube.results.find((r) => r.id === "CHK-PRT-01")?.verdict).toBe("pass");
    expect(cube.results.filter((r) => r.constraint.startsWith("precondition "))).toEqual([]);

    const lug = await registryRun("lug.glb");
    expect(lug.results.filter((r) => r.id === "CHK-PRT-01").map((r) => [r.verdict, r.target])).toEqual([["fail", { level: "part", part: lug.partId }]]);
    const reason = preconditionReason("CHK-PRT-01");
    const gated = [...new Set(lug.results.filter((r) => r.constraint === reason).map((r) => r.id))];
    for (const r of lug.results.filter((x) => gated.includes(x.id))) expect(r.verdict, r.id).toBe("skip");

    // What ran on the cube and reads the solid is what the fail gated on lug.
    const order = preconditionIds(defs);
    const solidRan = ranIds(cube.results).filter((id) => id !== "CHK-PRT-01" && gatedBy(defs.find((d) => d.id === id)!, ["CHK-PRT-01"], order) !== null);
    expect(solidRan.length).toBeGreaterThan(0);
    expect(gated.filter((id) => solidRan.includes(id))).toEqual(solidRan);
    // A check that does not read the solid never carries the precondition reason.
    for (const d of defs) if (gatedBy(d, ["CHK-PRT-01"], order) === null) expect(gated, d.id).not.toContain(d.id);
    // Every non-solid check that ran on the cube still runs on lug.
    const otherRan = ranIds(cube.results).filter((id) => id !== "CHK-PRT-01" && !solidRan.includes(id));
    for (const id of otherRan) expect(ranIds(lug.results), id).toContain(id);
    console.log(`registry runs (computed): cube ran ${ranIds(cube.results).join(", ")}; lug gated ${gated.join(", ")}; non-solid checks that ran on the cube: ${otherRan.join(", ") || "none at M04"}`);
  }, 120_000);

  test("a 10 mm cube fails only CHK-PRT-05, a warn check: verdict warn, nothing blocks export; the same def at block fails", async () => {
    const cube = await registryRun("cube.stl", cubeStl(10));
    const findings = cube.results.filter((r) => r.verdict === "fail" || r.verdict === "warn");
    expect(findings.map((r) => [r.id, r.severity, r.verdict])).toEqual([["CHK-PRT-05", "warn", "warn"]]);
    expect(cube.results.some(blocksExport)).toBe(false);
    const prt05 = defs.find((d) => d.id === "CHK-PRT-05")!;
    const asBlock = await registryRun("cube.stl", cubeStl(10), [{ ...prt05, severity: "block" } as (typeof defs)[number]]);
    const r = asBlock.results.find((x) => x.id === "CHK-PRT-05")!;
    expect([r.verdict, blocksExport(r)]).toEqual(["fail", true]);
    expect(r.measured).toEqual(findings[0]!.measured);
    console.log(`CHK-PRT-05 on a 10 mm cube (computed): measured ${String(r.measured)} mm, ${r.constraint}`);
  }, 120_000);
});
