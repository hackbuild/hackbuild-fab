// M04-T14: part.build with import (D-102, D-146, D-160). The corpus files
// in tools/corpus/import are tied to their bench sources by SHA256SUMS and
// MANIFEST.json. Independent sources: the rp2040 stand-in's signed volume
// comes from trimesh (packages/mesh/test/fixtures/imported-oracle.json) and
// the GLB volumes from trimesh's glTF loader
// (packages/mesh/test/fixtures/imported-glb-oracle.json). The exits, counts
// and volumes in goldens/part-build-import.json were computed at the first
// run and pinned, as the card asks. The OpenSCAD cases run only where the
// openscad binary is on PATH and print not run otherwise (D-153).

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CommandInput, CommandOutput, Hash } from "@hackbuild/spec";
import { importAudit, openscadVersion, renderScad, runPartBuild } from "../src/commands/part-build.js";
import type { CoreCtx } from "../src/registry.js";
import { PROCESS_STREAMS } from "../src/tty-gate.js";
import { Store } from "../src/store.js";
import { json, ROOT } from "./hbf.js";

const CORPUS = "tools/corpus/import";
const read = (p: string) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8")) as unknown;
const golden = read("core/test/goldens/part-build-import.json") as {
  cases: { file: string; exit: number; verdict: string; stage: string; error?: { code: string; path: string; got: number }; volumeMm3?: number; triangles?: number; counts?: Record<string, number>; fail?: string[] }[];
};
const stlOracle = read("packages/mesh/test/fixtures/imported-oracle.json") as { rows: { file: string; sha256: string; signedVolumeMm3: number; areaMm2: number }[] };
const glbOracle = read("packages/mesh/test/fixtures/imported-glb-oracle.json") as { rows: { file: string; signedVolume: number; area: number }[] };
const manifest = read(`${CORPUS}/MANIFEST.json`) as { files: { file: string; source: string; sha256: string; format: string; units: string; outcome: string }[] };
const sums = new Map(readFileSync(path.join(ROOT, CORPUS, "SHA256SUMS"), "utf8").trim().split("\n").map((l) => {
  const [h, f] = l.split(/\s+/);
  return [f!, h!] as const;
}));
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const SNAP_MOVE_MM = Math.sqrt(3) / 2048;
const caseOf = (file: string) => golden.cases.find((c) => c.file === `${CORPUS}/${file}`)!;

/** The command run in process with a JSON input, as MCP passes one: units and material reach it only this way. */
function ctx(): CoreCtx {
  return {
    workspace: ROOT, cwd: ROOT, branch: "", store: new Store(ROOT), transport: "cli",
    clientCaps: { elicitation: false, tasks: false }, signal: { aborted: false, throwIfAborted: () => undefined },
    inputsHash: "0".repeat(64) as Hash, gate: PROCESS_STREAMS, cli: {},
  };
}
async function run(input: CommandInput<"part.build">): Promise<CommandOutput<"part.build"> & { verdict: string; findings: { id: string; verdict: string; constraint: string }[] }> {
  const r = await runPartBuild(input, ctx());
  return { ...(r.result as CommandOutput<"part.build">), verdict: r.verdict, findings: r.findings as unknown as { id: string; verdict: string; constraint: string }[] };
}
async function refusal(input: CommandInput<"part.build">): Promise<{ code: string; path?: string; got?: unknown; hint: string }> {
  try {
    await runPartBuild(input, ctx());
  } catch (e) {
    return (e as { hbf: { code: string; path?: string; got?: unknown; hint: string } }).hbf;
  }
  throw new Error("expected a refusal");
}

describe("import corpus", () => {
  it("ties every corpus file to its bench source by sha256", () => {
    expect(manifest.files.map((f) => f.file).sort()).toEqual([...sums.keys()].sort());
    for (const f of manifest.files) {
      expect(sha(path.join(ROOT, CORPUS, f.file))).toBe(f.sha256);
      expect(sums.get(f.file)).toBe(f.sha256);
      if (existsSync(f.source)) expect(sha(f.source)).toBe(f.sha256);
    }
  });
});

describe("part.build --import on the cli", () => {
  it("refuses the PLINTH rp2040 stand-in by number, naming the file", async () => {
    const want = caseOf("board-rp2040-pizero-standin.stl");
    const { code, r } = await json("part.build", "--import", want.file);
    expect(code).toBe(want.exit);
    expect(r.stage).toBe(want.stage);
    const e = r.errors[0]!;
    expect(e.code).toBe("E_KERNEL");
    expect(e.path).toBe(want.file);
    expect(e.got).toBe(want.error!.got);
    // trimesh reads -6506.28 mm3 unwelded; the hint states the file's own number beside the welded one.
    const oracle = stlOracle.rows.find((x) => x.sha256 === sums.get("board-rp2040-pizero-standin.stl"))!;
    expect(Math.abs((e.got as number) - oracle.signedVolumeMm3)).toBeLessThanOrEqual(oracle.areaMm2 * SNAP_MOVE_MM);
    expect(e.hint).toContain(`${oracle.signedVolumeMm3.toFixed(1)} mm3 as read`);
    expect(e.hint).toContain("-6506.3 mm3 as read");
  }, 120_000);

  for (const file of ["locket-r2.glb", "lug.glb"]) {
    it(`builds ${file} at the default units (m) with the pinned outcome and the oracle volume`, async () => {
      const want = caseOf(file);
      const { code, r } = await json("part.build", "--import", want.file);
      expect(code).toBe(want.exit);
      expect(r.verdict).toBe(want.verdict);
      expect(r.counts).toEqual(want.counts);
      expect(r.findings.filter((f) => f.verdict === "fail").map((f) => f.id)).toEqual(want.fail);
      const part = (r.result as unknown as CommandOutput<"part.build">).parts[0]!;
      expect(part.volumeMm3).toBeGreaterThan(0);
      expect(part.volumeMm3).toBe(want.volumeMm3);
      expect(part.triangles).toBe(want.triangles);
      const oracle = glbOracle.rows.find((x) => x.file === want.file)!;
      // glTF metres: 1000 mm per unit, so 1e9 mm3 per cubic unit.
      expect(Math.abs(part.volumeMm3 / 1e9 - oracle.signedVolume)).toBeLessThanOrEqual((oracle.area * 1e6 * SNAP_MOVE_MM) / 1e9);
    }, 120_000);
  }

  it("refuses chase and import together at stage input, before the chase resolves", async () => {
    const { code, r } = await json("part.build", "reference/keys/flex-pair", "--import", `${CORPUS}/lug.glb`);
    expect(code).toBe(2);
    expect(r.stage).toBe("input");
    expect(r.errors[0]!.code).toBe("E_SCHEMA");
    expect(r.errors[0]!.path).toBe("/import");
    // A chase that does not exist is refused the same way: the chase path never resolved.
    const ghost = await json("part.build", "reference/keys/no-such-design", "--import", `${CORPUS}/lug.glb`);
    expect(ghost.r.errors[0]!.code).toBe("E_SCHEMA");
  }, 120_000);
});

describe("part.build import in process", () => {
  it("builds one part, source imported, file stored under hbf://source/<sha256>", async () => {
    const r = await run({ import: [{ path: `${CORPUS}/lug.glb`, format: "glb", units: "mm", as: "body" }], detail: "full" });
    const ir = r.ir as unknown as { source: { kind: string; format: string; tier: string; uri: string }; bodies: { id: string; material: string }[] };
    expect(ir.source).toEqual({ kind: "imported", format: "glb", tier: "inferred", uri: `hbf://source/${sums.get("lug.glb")}` });
    expect(existsSync(path.join(ROOT, ".hbf", "store", "source", sums.get("lug.glb")!))).toBe(true);
    expect(ir.bodies.map((b) => [b.id, b.material])).toEqual([["lug", ""]]);
    const oracle = glbOracle.rows.find((x) => x.file === `${CORPUS}/lug.glb`)!;
    expect(Math.abs(r.parts[0]!.volumeMm3 - oracle.signedVolume)).toBeLessThanOrEqual(oracle.area * SNAP_MOVE_MM);
    expect(r.verdict).toBe("fail");
    expect(r.findings.find((f) => f.id === "CHK-PRT-01")?.verdict).toBe("fail");
  }, 120_000);

  it("skips every check that reads features with the reason, and runs the mesh checks", async () => {
    const a = await importAudit([{ path: `${CORPUS}/locket-r2.glb`, format: "glb", as: "body" }], ctx());
    const by = new Map(a.results.map((x) => [x.id as string, x]));
    for (const id of ["CHK-PRT-04", "CHK-KEY-01", "CHK-NET-02", "CHK-NET-29"]) {
      expect(by.get(id)).toMatchObject({ verdict: "skip", constraint: "imported part has no features" });
    }
    expect(by.has("CHK-3MF-06")).toBe(false);
    expect(by.get("CHK-PRT-01")).toMatchObject({ verdict: "pass", measured: true });
    // A union of the locket's parts is refused (they touch or overlap), so CHK-PRT-03 cannot sum against one.
    expect(by.get("CHK-PRT-03")?.verdict).toBe("skip");
    expect(by.get("CHK-PRT-03")?.constraint).toMatch(/^no union of the imported parts to sum against: the union of 16 parts is refused/);
    expect(a.part.warnings.map((w) => w.code)).toContain("UNION");
  }, 120_000);

  it("refuses params beside import, a bought import, and a format that lands at M14", async () => {
    const lug = { path: `${CORPUS}/lug.glb`, format: "glb", as: "body" } as const;
    expect(await refusal({ import: [lug], params: { W: 1 } })).toMatchObject({ code: "E_SCHEMA", path: "/params" });
    expect(await refusal({ import: [lug], preset: "x" })).toMatchObject({ code: "E_SCHEMA", path: "/preset" });
    expect(await refusal({ import: [] })).toMatchObject({ code: "E_SCHEMA", path: "/import" });
    expect(await refusal({ import: [{ ...lug, as: "bought" }] })).toMatchObject({ code: "E_SCHEMA", path: "/import/0/as" });
    expect(await refusal({ import: [{ ...lug, format: "step" }] })).toMatchObject({ code: "E_KERNEL", path: "/import/0/format", got: "step" });
    expect(await refusal({ import: [{ ...lug, path: `${CORPUS}/missing.glb` }] })).toMatchObject({ code: "E_REF", path: "/import/0/path" });
    expect(await refusal({ import: [{ ...lug, material: "no-such-material" }] })).toMatchObject({ code: "E_REF", path: "/import/0/material" });
  }, 120_000);

  it("reads a stored source back by uri, and refuses a uri the store does not hold", async () => {
    const uri = `hbf://source/${sums.get("lug.glb")}`;
    const r = await run({ import: [{ path: uri, format: "glb", units: "mm", as: "body" }] });
    expect(r.parts[0]!.triangles).toBe(10264);
    expect(await refusal({ import: [{ path: `hbf://source/${"0".repeat(64)}`, format: "glb", as: "body" }] })).toMatchObject({ code: "E_HANDLE" });
  }, 120_000);
});

describe("part.build import of OpenSCAD", () => {
  const version = openscadVersion();
  const scad = path.join(ROOT, CORPUS, "scad");

  it("refuses with E_KERNEL naming the binary when openscad is missing", () => {
    try {
      renderScad(path.join(scad, "ok.scad"), "/import/0/path", "openscad-not-installed-hbf");
      throw new Error("expected a refusal");
    } catch (e) {
      expect((e as { hbf: { code: string; got: string; hint: string } }).hbf).toMatchObject({ code: "E_KERNEL", got: "openscad-not-installed-hbf" });
    }
  });

  if (version === undefined) {
    it("ok.scad and unknown-module.scad: not run, openscad is not on PATH", () => {
      process.stdout.write("not run: openscad is not on PATH; ok.scad and unknown-module.scad were not rendered (D-153)\n");
    });
  } else {
    it("returns E_KERNEL quoting the Ignoring unknown line", async () => {
      const e = await refusal({ import: [{ path: `${CORPUS}/scad/unknown-module.scad`, format: "scad", as: "body" }] });
      expect(e.code).toBe("E_KERNEL");
      expect(String(e.got)).toContain("Ignoring unknown");
    }, 120_000);
    it("builds ok.scad, a 10 mm cube", async () => {
      const r = await run({ import: [{ path: `${CORPUS}/scad/ok.scad`, format: "scad", as: "body" }] });
      expect(Math.abs(r.parts[0]!.volumeMm3 - 1000)).toBeLessThanOrEqual(1e-6);
    }, 120_000);
  }
});
