// Loading a design: a target name two chase directories answer to is E_REF
// listing both (no silent shadowing), the directory listing is sorted, no
// two chases in the repository share an id, alias or directory name,
// defHash covers build.ts and every file it reaches by relative import
// (D-178) and not where the design sits in the workspace (ARCHITECTURE.md
// 8), BuildInputs.kernelVersion is the @hackbuild/kernel version, and a params object carrying __proto__, constructor or
// prototype at any level is E_SCHEMA.

import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { assemblePart } from "@hackbuild/mesh";
import { canonicalize, isThrownCommandError, sha256Hex, type CommandError } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams, sourceClosure } from "../src/commands/build.js";
import { chaseIndex, resolveTarget } from "../src/load-build.js";
import { REF, ROOT } from "./hbf.js";

const tmp = mkdtempSync(path.join(tmpdir(), "hbf-load-"));
const FIX = path.join(ROOT, "core", "test", "fixtures", "sandbox");
const LOCAL = path.join(FIX, `.tmp-load-${process.pid}`);
// Inside the workspace (loadDesign refuses a design outside one) and under
// sandbox/.gitignore, so a parallel git status snapshot never sees it.
const MOVED = path.join(FIX, `.tmp-moved-${process.pid}`);
const CLAMPED = path.join(FIX, `.tmp-clamp-${process.pid}`);
afterAll(() => {
  rmSync(CLAMPED, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
  rmSync(LOCAL, { recursive: true, force: true });
  rmSync(MOVED, { recursive: true, force: true });
});

function refusal(f: () => unknown): CommandError {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("accepted");
}

const chaseText = (id: string): string => `import { defineChase } from "@hackbuild/spec";
export const chase = defineChase({
  meta: { id: "${id}", kind: "single", name: "X", version: 1, chase: 2 },
  materials: [], params: [], build: { module: "./build.ts", fn: "build" },
});
`;

function chaseAt(root: string, rel: string, id: string): void {
  mkdirSync(path.join(root, rel), { recursive: true });
  writeFileSync(path.join(root, rel, "chase.ts"), chaseText(id));
}

describe("resolveTarget", () => {
  it("refuses a name two directories answer to, listing both, and resolves a unique one", () => {
    const root = path.join(tmp, "ws");
    chaseAt(root, "reference/aaa/shadow", "collar");
    chaseAt(root, "designs/collar", "collar");
    chaseAt(root, "designs/plain", "plain");
    const e = refusal(() => resolveTarget("collar", root, root));
    expect(e.code).toBe("E_REF");
    expect(e.didYouMean).toEqual(["reference/aaa/shadow", "designs/collar"]);
    expect(resolveTarget("plain", root, root)).toBe(path.join(root, "designs", "plain"));
    expect(chaseIndex(root).map((k) => k.rel)).toEqual(["reference/aaa/shadow", "designs/collar", "designs/plain"]);
  });

  it("no two chases in the repository answer to one name", () => {
    const owners = new Map<string, string[]>();
    for (const k of chaseIndex(ROOT)) for (const n of k.names) owners.set(n, [...(owners.get(n) ?? []), k.rel]);
    const shared = [...owners.entries()].filter(([, dirs]) => dirs.length > 1);
    expect(shared).toEqual([]);
    expect(resolveTarget("challenge-coin", ROOT, ROOT)).toBe(path.join(ROOT, "designs", "collar"));
  });
});

describe("defHash", () => {
  it("moves when a module build.ts imports changes, and when chase.ts changes", async () => {
    mkdirSync(LOCAL, { recursive: true });
    copyFileSync(path.join(FIX, "ok", "chase.ts"), path.join(LOCAL, "chase.ts"));
    writeFileSync(path.join(LOCAL, "helper.ts"), "export const W = 20;\n");
    writeFileSync(path.join(LOCAL, "build.ts"), [
      `import { defineBuild } from "@hackbuild/spec";`,
      `import { W } from "./helper";`,
      `import { chase } from "./chase";`,
      `export const build = defineBuild(chase, (_p, k) => k.part({ id: "p", name: "P", process: "fdm", machine: "ffc5p", frame: { originOnAxis: true, carriesOffset: false, pose: "print" }, bodies: [k.body("p", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(W, W, 2)], z: [0, 2] } })], features: [] }));`,
      "",
    ].join("\n"));
    const a = (await loadDesign(LOCAL, ROOT)).defHash;
    appendFileSync(path.join(LOCAL, "helper.ts"), "export const H = 2;\n");
    const b = (await loadDesign(LOCAL, ROOT)).defHash;
    expect(b).not.toBe(a);
    appendFileSync(path.join(LOCAL, "chase.ts"), "// an edit\n");
    const c = (await loadDesign(LOCAL, ROOT)).defHash;
    expect(c).not.toBe(b);
  });

  it("keeps defHash and buildHash when a byte-identical design moves to another directory", async () => {
    const ok = path.join(FIX, "ok");
    const twin = path.join(MOVED, "deeper", "renamed");
    mkdirSync(twin, { recursive: true });
    for (const f of ["chase.ts", "build.ts"]) copyFileSync(path.join(ok, f), path.join(twin, f));
    const a = await loadDesign(ok, ROOT);
    const b = await loadDesign(twin, ROOT);
    expect(b.target).not.toBe(a.target);
    expect(b.defHash).toBe(a.defHash);
    // Source names are relative to the design directory, with forward slashes.
    expect(sourceClosure([b.buildFile], b.dir).map((s) => s.path)).toEqual(["build.ts", "chase.ts"]);
    const epoch = 1791072000;
    const ba = await buildPart(a, resolveParams(a.chase, undefined, undefined), { epoch });
    const bb = await buildPart(b, resolveParams(b.chase, undefined, undefined), { epoch });
    expect(bb.inputs).toEqual(ba.inputs);
    expect(bb.part.buildHash).toBe(ba.part.buildHash);
  }, 120_000);

  it("moves buildHash when only a warning and a metric move, and Part IR is the mesh assemblePart part (D-049, D-051)", async () => {
    mkdirSync(CLAMPED, { recursive: true });
    copyFileSync(path.join(FIX, "ok", "chase.ts"), path.join(CLAMPED, "chase.ts"));
    // The plate clamps at 30 mm: w 31 and w 32 build the same solid and differ only in the warning text and the metric.
    writeFileSync(path.join(CLAMPED, "build.ts"), [
      `import { defineBuild } from "@hackbuild/spec";`,
      `import { chase } from "./chase";`,
      `export const build = defineBuild(chase, (p, k) => k.part({ id: "p", name: "P", process: "fdm", machine: "ffc5p", frame: { originOnAxis: true, carriesOffset: false, pose: "print" },`,
      `  bodies: [k.body("p", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(Math.min(p.w, 30), Math.min(p.w, 30), 2)], z: [0, 2] } })], features: [],`,
      "  warnings: p.w > 30 ? [{ code: \"CLAMP\", text: `plate width ${p.w} clamped to 30` }] : [],",
      `  metrics: [{ id: "plate.asked", value: p.w, unit: "mm", note: "asked width", gate: "informational", qualifier: "computed", basis: null }] }));`,
      "",
    ].join("\n"));
    const design = await loadDesign(CLAMPED, ROOT);
    const epoch = 1791072000;
    const at = async (w: number) => buildPart(design, resolveParams(design.chase, { w }, undefined), { epoch });
    const [a, b] = [await at(31), await at(32)];
    expect(b.part.solid.hash).toBe(a.part.solid.hash);
    expect(a.part.warnings.map((x) => x.text)).toEqual(["plate width 31 clamped to 30"]);
    expect(b.part.warnings.map((x) => x.text)).toEqual(["plate width 32 clamped to 30"]);
    expect(b.part.metrics).not.toEqual(a.part.metrics);
    expect(b.part.buildHash).not.toBe(a.part.buildHash);
    // buildHash is sha256 over canonical BuildInputs and nothing else (D-051).
    expect(a.part.buildHash).toBe(sha256Hex(canonicalize(a.inputs)));
    // One assembly path: core's Part is mesh assemblePart's part plus the buildHash.
    const { part } = assemblePart({ ...a.draft, warnings: [], assertions: a.part.assertions }, { ...a.meshed.staged, warnings: a.part.warnings });
    expect({ ...part, buildHash: a.part.buildHash }).toEqual(a.part);
    expect(a.part.warnings).toEqual(a.draft.warnings);
  }, 120_000);

  it("records the @hackbuild/kernel version as kernelVersion", async () => {
    const design = await loadDesign(path.join(FIX, "ok"), ROOT);
    const kernel = JSON.parse(readFileSync(path.join(ROOT, "kernel", "package.json"), "utf8")) as { name: string; version: string };
    expect(kernel.name).toBe("@hackbuild/kernel");
    expect(design.ws.versions.kernel).toBe(kernel.version);
  });
});

describe("params keys", () => {
  it("refuses __proto__, constructor and prototype at the top, in a group and in a list item", async () => {
    const { chase } = await loadDesign(REF, ROOT);
    const cases: readonly (readonly [string, string])[] = [
      ['{"__proto__":{"polluted":1}}', "/__proto__"],
      ['{"pad":{"__proto__":{"W":79}}}', "/pad/__proto__"],
      ['{"constructor":{"prototype":{"x":1}}}', "/constructor"],
      ['{"keys":[{"prototype":1}]}', "/keys/0/prototype"],
    ];
    for (const [json, at] of cases) {
      const e = refusal(() => resolveParams(chase, JSON.parse(json) as Record<string, unknown>, undefined));
      expect(e.code, json).toBe("E_SCHEMA");
      expect(e.path, json).toBe(at);
    }
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });
});
