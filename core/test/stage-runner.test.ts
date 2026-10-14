// Every design meshes on the packages/mesh stage runner (D-047,
// ARCHITECTURE.md 4): core holds no mesher of its own, the keys flex-pair
// reference reaches stage 6 (one INSET warning per inset role body) and
// stage 7, and its feature kinds' cutters and bodies enter the runner as
// stage inputs (stageInputsOf).

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isThrownCommandError, type BodyDraft, type CommandError, type FeatureKind, type FeatureOf, type GeneratedGeometry, type ShapeDecl } from "@hackbuild/spec";
import { audit, liveCount, signedVolume } from "@hackbuild/mesh";
import { buildPart, loadDesign, resolveParams } from "../src/commands/build.js";
import { stageInputsOf, type Generated } from "../src/load-build.js";
import { REF, ROOT } from "./hbf.js";

/** Roles the stage runner insets at stage 6 (3MF dialect geometry rule 1). */
const INSET_ROLES = new Set(["flex-conductor", "flex", "conductor", "art"]);

const box = (x0: number, x1: number): ShapeDecl => ({ route: "prism", outline: [[[x0, 0], [x1, 0], [x1, 1], [x0, 1]]], z: [0, 1] });
const host: BodyDraft = { id: "pad", role: "body", slot: 1, material: "petg", base: box(0, 10) };
const EMPTY: GeneratedGeometry = { preUnionCutters: [], positives: [], postUnionCutters: [], bodies: [], owns: {} };
const gen = (id: string, g: Partial<GeneratedGeometry>, kind = "conductor"): Generated => ({ f: { id, kind, body: "pad" } as unknown as FeatureOf<FeatureKind>, host, g: { ...EMPTY, ...g } });

function refusal(f: () => unknown): CommandError {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("accepted");
}

describe("one stage runner", () => {
  it("core/src/commands/build.ts holds no mesher: no routes, csg, partition or wasm scope of its own", () => {
    const src = readFileSync(path.join(ROOT, "core", "src", "commands", "build.ts"), "utf8");
    for (const banned of ["meshDraft", "solidOf", "withScope", "unionReport", "PARTITION_PRIORITY", ".subtract("]) expect(src).not.toContain(banned);
    // no route table, closed-solid or weld copy of packages/mesh (toManifold, snapWeld)
    for (const file of ["commands/build.ts", "load-build.ts"]) {
      const s = readFileSync(path.join(ROOT, "core", "src", file), "utf8");
      for (const banned of [/\bROUTES\b/, /closedSolid/, /function weld\b/, /\.ofMesh\(/, /new wasm\.Mesh\b/]) expect(s, `${file} ${String(banned)}`).not.toMatch(banned);
    }
  });

  it("no core or packages/mesh source promises work to M00 or the M-S slice, which have closed", () => {
    const stale = /\b(lands?|landing) at M00\b|takes (this|it) over at M00|at M00 to M14|outside the m-s slice|in the M-S slice|the m-s slice builds/i;
    const files = ["core/src/commands/build.ts", "core/src/load-build.ts", "core/src/author.ts", "packages/mesh/src/routes/stack.ts", "packages/mesh/src/stages.ts"];
    for (const f of files) {
      const lines = readFileSync(path.join(ROOT, f), "utf8").split("\n");
      const hits = lines.flatMap((l, i) => (stale.test(l) ? [`${f}:${i + 1}`] : []));
      expect(hits).toEqual([]);
    }
  });

  it("no core, packages/checks or packages/mesh source or hint describes M00 as future or the M-S slice as current", () => {
    // Prose that sends a reader to a closed milestone, or names the walking skeleton slice as the present build.
    const stale = /\b(lands?|landing|arrives?|replaces? it|takes (this|it) over|until|after|before)\s+(at\s+|with\s+)?M00\b|\bat M00\b|\bM00 (registers|draws)\b|\bm-s (slice|registry|cli)\b|\bfor the M-S\b|not admitted yet|lands with the milestone|later milestone/i;
    // A hint is read by a model deciding its next move: it states the limit now and names no closed milestone.
    const closedInHint = /hint:\s*[`"][^`"]*\b(M00|M-S|m-s)\b/i;
    const tsUnder = (dir: string): string[] =>
      readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = `${dir}/${e.name}`;
        return e.isDirectory() ? tsUnder(rel) : e.name.endsWith(".ts") ? [rel] : [];
      });
    const files = [...tsUnder("core/src"), ...tsUnder("packages/checks/src"), ...tsUnder("packages/mesh/src")];
    expect(files).toContain("core/src/resolve-hook.ts");
    const hits = files.flatMap((f) =>
      readFileSync(path.join(ROOT, f), "utf8").split("\n").flatMap((l, i) => (stale.test(l) || closedInHint.test(l) ? [`${f}:${i + 1}: ${l.trim()}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it("keys flex-pair runs stages 1 to 8: an INSET per inset role body, parts disjoint and summing to the solid", async () => {
    const live = liveCount();
    const design = await loadDesign(REF, ROOT);
    const built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
    const { meshed, part } = built;
    const insetIds = meshed.bodies.filter((b) => INSET_ROLES.has(b.role)).map((b) => b.id);
    expect(insetIds.length).toBeGreaterThan(0);
    const inset = meshed.warnings.filter((w) => w.code === "INSET").map((w) => w.text.split(":")[0]);
    expect(inset).toEqual(insetIds);
    expect(part.warnings.filter((w) => w.code === "INSET")).toHaveLength(insetIds.length);
    // feature bodies carry their feature id and host; csg joins a centreline conductor's segments
    expect(meshed.bodies.find((b) => b.id === "conductor.gnd")?.host).toBe("pad");
    expect(meshed.routes).toEqual(["csg", "prism", "revolve"]);
    expect(meshed.itemTransform).toHaveLength(3);
    // one exported part per body
    expect(meshed.slots.map((s) => s.name)).toEqual(meshed.bodies.map((b) => b.id));
    for (const b of meshed.bodies) expect(audit(b.mesh).ok).toBe(true);
    const sum = meshed.bodies.reduce((s, b) => s + signedVolume(b.mesh), 0);
    // CHK-PRT-03 ceiling 0.001 mm3
    expect(Math.abs(sum - part.solid.volumeMm3)).toBeLessThan(0.001);
    expect(liveCount()).toBe(live);
  }, 120_000);
});

describe("stageInputsOf", () => {
  it("concatenates cutters per host in feature order and joins a feature's shapes with a csg union", () => {
    const a = gen("pocket.a", { postUnionCutters: [box(1, 2)] });
    const b = gen("chamfer.b", { postUnionCutters: [box(3, 4)], preUnionCutters: [box(5, 6)] }, "chamfer");
    const c = gen("conductor.c", { bodies: [{ role: "conductor", slot: 2, material: "cpla", shape: box(1, 2) }, { role: "conductor", slot: 2, material: "cpla", shape: box(2, 3) }] });
    const d = gen("conductor.d", { bodies: [{ role: "conductor", slot: 2, material: "cpla", shape: box(7, 8) }] });
    const out = stageInputsOf([a, b, c, d]);
    expect(out.cutters).toEqual({ pad: { preUnionCutters: [box(5, 6)], unionPositives: [], postUnionCutters: [box(1, 2), box(3, 4)] } });
    expect(out.bodies).toEqual([
      { id: "conductor.c", role: "conductor", slot: 2, material: "cpla", base: { route: "csg", op: "union", of: [box(1, 2), box(2, 3)] } },
      { id: "conductor.d", role: "conductor", slot: 2, material: "cpla", base: box(7, 8) },
    ]);
    expect(out.hosts.get("conductor.c")).toBe("pad");
  });

  it("refuses one feature whose shapes disagree on role, slot or material with E_SCHEMA", () => {
    const bad = gen("conductor.x", { bodies: [{ role: "conductor", slot: 2, material: "cpla", shape: box(1, 2) }, { role: "conductor", slot: 3, material: "cpla", shape: box(2, 3) }] });
    const e = refusal(() => stageInputsOf([bad]));
    expect(e.code).toBe("E_SCHEMA");
    expect(e.path).toBe("/features/conductor.x/bodies/1");
  });

  it("admits preUnionCutters from chamfer and round only, refusing any other kind with E_KERNEL (D-047 stage 2)", () => {
    for (const kind of ["chamfer", "round"]) {
      expect(stageInputsOf([gen(`${kind}.a`, { preUnionCutters: [box(1, 2)] }, kind)]).cutters["pad"]?.preUnionCutters).toEqual([box(1, 2)]);
    }
    for (const kind of ["engrave", "pocket", "conductor"]) {
      const e = refusal(() => stageInputsOf([gen(`${kind}.x`, { preUnionCutters: [box(1, 2)] }, kind)]));
      expect(e.code).toBe("E_KERNEL");
      expect(e.path).toBe(`/features/${kind}.x/preUnionCutters`);
      expect(e.got).toBe(kind);
      expect(e.expected).toBe("one of chamfer, round");
      expect(e.record).toBe("mesh-kernel");
    }
    expect(stageInputsOf([gen("pocket.ok", { postUnionCutters: [box(1, 2)] }, "pocket")]).cutters["pad"]?.postUnionCutters).toEqual([box(1, 2)]);
  });
});
