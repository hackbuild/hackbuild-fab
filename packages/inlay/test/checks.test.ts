// M03-T08: the `inlay` feature kind, CHK-INL-01 to 04 and the reference
// cosmetic/coin-inlay. Small synthetic arts drive each check through pass
// and fail with numbers computed here by hand (cell counts on a 0.25 mm
// grid, the opacity rows of print-reality.md); the reference is then built
// through the hbf CLI at SOURCE_DATE_EPOCH 315532800 and read against its
// committed goldens and the card's edit (depth 1.2 to 0.72, M03-T08 card
// defects: 0.8 is off the 0.24 mm grid).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  canonicalize, sha256Hex,
  type BodyDraft, type CheckCtx, type CheckResult, type FeatureKindDef, type KernelCtx, type MachineView, type Part,
} from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import type { Layer } from "../src/face.js";
import {
  INLAY_CHECK_IDS, INLAY_REFERENCE, artFaces, artOf, artUri, inlayKind, inlayMasks, inlaySchema, type InlayDecl,
} from "../src/kind.js";
import { checkInl01, runInl01 } from "../src/checks/inl-01.js";
import { checkInl02, runInl02 } from "../src/checks/inl-02.js";
import * as inlayIndex from "../src/index.js";
import { inl03DrivenBy, runInl03 } from "../src/checks/inl-03.js";
import { runInl04 } from "../src/checks/inl-04.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const REF = "reference/cosmetic/coin-inlay";
const EPOCH = "315532800";

const profile = createProfileLookup(loadProfile());
const ctx: CheckCtx = { profile, machine: "ffc5p", whitelist: new Map() };
/** ffc5p default preset layer height, mm (vendor, packages/profile/data/machines.json). */
const LAYER = profile.preset("ffc5p").layer;

/** 44 mm across at 4 cells per mm: one cell is 0.25 mm, 0.0625 mm2. */
const GRID = { w: 176, h: 176, res: 4 } as const;
const CELL2 = 0.0625;

const box = (x0: number, y0: number, x1: number, y1: number): string => `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`;
const path = (d: string, slot: number): Layer => ({ kind: "path", d, transform: [1, 0, 0, 1, 0, 0], slot });

/** A 6 x 6 mm square in slot 2, cell aligned: 24 x 24 cells. */
const SQUARE = path(box(-3, -3, 3, 3), 2);
/** One cell at (5.125, 5.125) mm in slot 3. */
const SPECK = path(box(5, 5, 5.25, 5.25), 3);
/** An L read in hand on the bed face, slot 3: differs from its mirror in X. */
const ELL = path("M 4 -8 H 6 V -2 H 10 V 0 H 4 Z", 3);

type Over = Partial<Pick<InlayDecl, "layers" | "recipe" | "boost" | "gap" | "palette" | "minFeature" | "despeckle" | "slot" | "depthLayers" | "drivenBy">>;

const THK = 3.6;
const TOP = { origin: [0, 0, THK], normal: [0, 0, 1], u: [1, 0, 0] } as const;

function decl(o: Over = {}): InlayDecl {
  const base = {
    kind: "inlay" as const, id: `inlay.s${o.slot ?? 2}`, body: "coin", art: "", face: TOP, slot: o.slot ?? 2,
    depthLayers: o.depthLayers ?? 5, minFeature: o.minFeature ?? 0.6, despeckle: o.despeckle ?? 0.35,
    grid: GRID, layers: o.layers ?? { top: [SQUARE], bed: [] }, recipe: o.recipe ?? "print-forge",
    boost: o.boost ?? 0, gap: o.gap ?? 0, palette: o.palette ?? ["#1A1A1A", "#FE0386", "#F5F0E6"], material: "petg",
    ...(o.drivenBy === undefined ? {} : { drivenBy: o.drivenBy }),
  };
  return { ...base, art: artUri(artOf(base as InlayDecl)) } as InlayDecl;
}

const HOST: BodyDraft = { id: "coin", role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [[[-22, -22], [22, -22], [22, 22], [-22, 22]]], z: [0, THK] } };

function partOf(...features: InlayDecl[]): Part {
  return {
    id: "coin", name: "coin", process: "fdm", machine: "ffc5p",
    bodies: [{ id: "coin", role: "body", slot: 1, material: "petg" }], features,
  } as unknown as Part;
}

const kctx = (body: BodyDraft = HOST): KernelCtx => ({
  profile, route: body.base.route, process: "fdm", faces: [], body,
  machineView: { id: "ffc5p", layerHeight: LAYER, firstLayer: 0.25, lineWidth: 0.42 } as unknown as MachineView,
});

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { hbf?: { code: string } }).hbf?.code;
  }
  return undefined;
};

describe("the inlay kind (step 1)", () => {
  it("names the four checks, fit none and the reference", () => {
    expect([...inlayKind.checks]).toEqual(["CHK-INL-01", "CHK-INL-02", "CHK-INL-03", "CHK-INL-04"]);
    expect(inlayKind.checks).toBe(INLAY_CHECK_IDS);
    expect(inlayKind.fit).toBe("none");
    expect([...inlayKind.reference]).toEqual([INLAY_REFERENCE]);
    expect(INLAY_REFERENCE).toBe("cosmetic/coin-inlay");
  });

  it("the type refuses an empty check set and a missing reference (D-058)", () => {
    // @ts-expect-error: checks is NonEmpty<CheckId>
    const noChecks: FeatureKindDef<"inlay"> = { ...inlayKind, checks: [] };
    // @ts-expect-error: reference is required
    const noRef: FeatureKindDef<"inlay"> = { kind: "inlay", version: "1.0.0", schema: inlaySchema, generate: inlayKind.generate, checks: inlayKind.checks, fit: "none" };
    void noChecks;
    void noRef;
  });

  it("the art uri is sha256 of the canonical art, the form a build.ts computes with spec alone", () => {
    const d = decl();
    expect(d.art).toBe(`hbf://art/${sha256Hex(canonicalize(artOf(d)))}`);
  });

  it("generates one art body of its own slot on the shared raster volume, with its masks", () => {
    const g = inlayKind.generate(decl(), kctx());
    expect(g.bodies.map((b) => [b.role, b.slot, b.material])).toEqual([["art", 2, "petg"]]);
    expect(g.preUnionCutters).toEqual([]);
    const shape = g.bodies[0]!.shape;
    if (shape.route !== "raster") throw new Error("raster expected");
    const d = 5 * LAYER;
    expect(shape.layers.map((l) => l.z)).toEqual([[0, d], [d, THK - d], [THK - d, THK]]);
    const masks = inlayMasks(decl(), kctx());
    for (const l of shape.layers) expect(masks.has(l.mask)).toBe(true);
    // The top band holds the square, 24 x 24 cells of slot 2, less the 4 corner cells print-forge's open removes: 572 (computed).
    const topMask = masks.get(shape.layers[2]!.mask)!;
    expect(topMask.labels.reduce((n, s) => n + (s === 2 ? 1 : 0), 0)).toBe(572);
  });

  it("refuses an art uri that does not match, a host slot, an unpainted slot, a cut layer and a face off the host top", () => {
    expect(codeOf(() => inlayKind.generate({ ...decl(), art: "hbf://art/00" }, kctx()))).toBe("E_SCHEMA");
    expect(codeOf(() => inlayKind.generate(decl({ slot: 1 }), kctx()))).toBe("E_SCHEMA");
    expect(codeOf(() => inlayKind.generate(decl({ slot: 3 }), kctx()))).toBe("E_SCHEMA");
    expect(codeOf(() => inlayKind.generate(decl({ layers: { top: [{ ...SQUARE, cut: true }], bed: [] } }), kctx()))).toBe("E_KERNEL");
    const low = { ...decl(), face: { ...TOP, origin: [0, 0, 3] as const } };
    expect(codeOf(() => inlayKind.generate(low, kctx()))).toBe("E_SCHEMA");
    expect(codeOf(() => inlayKind.generate(decl(), kctx({ ...HOST, base: { route: "prism", outline: HOST.base.route === "prism" ? HOST.base.outline : [], z: [0.5, THK] } })))).toBe("E_KERNEL");
  });

  it("the schema names each missing field", () => {
    const r = inlaySchema["~standard"].validate({ kind: "inlay", id: "inlay.x" });
    if (!("issues" in r) || r.issues === undefined) throw new Error("issues expected");
    const paths = r.issues.map((i) => String(i.path?.[0]));
    for (const k of ["art", "face", "slot", "depthLayers", "minFeature", "despeckle", "grid", "layers", "recipe", "boost", "gap", "palette", "material"]) expect(paths).toContain(k);
    expect("value" in inlaySchema["~standard"].validate(decl())).toBe(true);
  });
});

const one = (fs: readonly unknown[]): { verdict: string; measured: unknown; legal: CheckResult["legal"]; constraint: string; extra?: Record<string, unknown> } => {
  expect(fs.length).toBe(1);
  return fs[0] as never;
};

describe("CHK-INL-01 stroke below line width", () => {
  it("print-forge opens at the min feature, so nothing is left to remove", () => {
    const f = decl();
    const r = one(runInl01({ part: partOf(f), feature: f }, ctx));
    expect(r.verdict).toBe("pass");
    expect(r.measured).toBe(0);
    expect(r.legal).toEqual({ kind: "interval", lo: 0, hi: 0, unit: "mm2", nearest: 0 });
  });

  it("collar-v5 has no open: the four corner cells of the square fail, 4 x 0.0625 = 0.25 mm2 (computed)", () => {
    const f = decl({ recipe: "collar-v5" });
    const r = one(runInl01({ part: partOf(f), feature: f }, ctx));
    expect(r.verdict).toBe("fail");
    expect(r.measured).toBe(4 * CELL2);
    expect(r.extra?.["openRadiusCells"]).toBe(1);
  });

  it("a feature min feature under the profile row is held to the row (inlay.minFeature 0.6, inferred)", () => {
    expect(profile.constant("inlay.minFeature")).toMatchObject({ value: 0.6, unit: "mm", provenance: { tier: "inferred", method: "failure" } });
    // A 10 x 0.5 mm bar is 40 x 2 cells. print-forge at minF 0.25 opens by 0 cells and keeps the bar and the
    // square's corners; the row's open by 1 cell removes all 80 bar cells and the 4 corners: 84 cells (computed).
    const bar = path(box(-5, 8, 5, 8.5), 2);
    const f = decl({ minFeature: 0.25, layers: { top: [SQUARE, bar], bed: [] } });
    const r = one(runInl01({ part: partOf(f), feature: f }, ctx));
    expect(r.verdict).toBe("fail");
    expect(r.measured).toBe(84 * CELL2);
    expect(r.constraint).toContain("profile inlay.minFeature 0.6 mm");
  });
});

describe("CHK-INL-02 despeckle at 0.35 x min-feature disc", () => {
  const lo = Number((0.35 * Math.PI * 0.3 ** 2).toFixed(6));

  it("a one-cell speck kept with despeckle off warns at 0.0625 mm2 under 0.098960 mm2 (computed)", () => {
    const f = decl({ recipe: "collar-v5", despeckle: 0, layers: { top: [SQUARE, SPECK], bed: [] } });
    const r = one(runInl02({ part: partOf(f) }, ctx));
    expect(r.verdict).toBe("warn");
    expect(r.measured).toBe(CELL2);
    expect(r.legal).toEqual({ kind: "interval", lo, hi: null, unit: "mm2", nearest: lo });
    expect(lo).toBe(0.09896);
  });

  it("despeckle at the profile factor removes it and the smallest island is the square", () => {
    const f = decl({ recipe: "collar-v5", layers: { top: [SQUARE, SPECK], bed: [] } });
    const r = one(runInl02({ part: partOf(f) }, ctx));
    expect(r.verdict).toBe("pass");
    expect(r.measured).toBe(576 * CELL2);
  });

  it("one result per art, however many slot features share it", () => {
    const a = decl({ layers: { top: [SQUARE, path(box(6, 6, 9, 9), 3)], bed: [] } });
    const b = { ...a, id: "inlay.s3", slot: 3 } as InlayDecl;
    expect(runInl02({ part: partOf(a, b) }, ctx).length).toBe(1);
  });
});

describe("CHK-INL-01 and -02 on a bare label grid (the M03-T11 harness binding)", () => {
  /** A 24 x 24 square of `sq` at cells 10 to 33 and one cell of `dot` at (50, 50), on a 64 x 64 grid at 4 cells per mm. */
  const grid = (sq: number, dot: number): { w: number; h: number; res: number; labels: Uint8Array } => {
    const w = 64, labels = new Uint8Array(w * w);
    for (let j = 10; j < 34; j++) for (let i = 10; i < 34; i++) labels[j * w + i] = sq;
    if (dot) labels[50 * w + 50] = dot;
    return { w, h: w, res: 4, labels };
  };

  it("the package index exports both grid forms by the names run.mjs binds", () => {
    expect(typeof inlayIndex.checkInl01).toBe("function");
    expect(typeof inlayIndex.checkInl02).toBe("function");
  });

  it("CHK-INL-01: an open at radius floor(0.3 x 4) = 1 cell takes the square's 4 corners and the lone cell, 5 cells (computed)", () => {
    const r = checkInl01(grid(2, 3), { minF: 0.6 });
    expect(r).toEqual({ verdict: "fail", measured: 5 * CELL2, removedCells: 5, openRadiusCells: 1 });
    expect(checkInl01(grid(2, 3), { minF: 0.6, slots: [3] }).removedCells).toBe(1);
    expect(checkInl01(grid(2, 3), { minF: 0.6, host: 2 }).removedCells).toBe(1);
    // minF 0.4 gives radius floor(0.8) = 0: nothing is opened (computed).
    expect(checkInl01(grid(2, 3), { minF: 0.4 })).toMatchObject({ verdict: "pass", removedCells: 0, openRadiusCells: 0 });
  });

  it("CHK-INL-02: the lone cell warns at 0.0625 mm2 under 0.09896; with it as host the square passes at 36 mm2; no art skips", () => {
    const factor = profile.constant("despeckle.factor").value;
    expect(checkInl02(grid(2, 3), { minF: 0.6, despeckleFactor: factor })).toEqual({ verdict: "warn", measured: CELL2, lo: 0.09896, smallestCells: 1, slot: 3 });
    expect(checkInl02(grid(2, 3), { minF: 0.6, despeckleFactor: factor, host: 3 })).toEqual({ verdict: "pass", measured: 36, lo: 0.09896, smallestCells: 576, slot: 2 });
    expect(checkInl02(grid(0, 0), { minF: 0.6, despeckleFactor: factor }).verdict).toBe("skip");
  });

  it("the Part IR run bodies measure through the grid form: same cells on the art faces", () => {
    const f = decl({ recipe: "collar-v5", despeckle: 0, layers: { top: [SQUARE, SPECK], bed: [] } });
    const top = artFaces(artOf(f)).top.art;
    const run1 = one(runInl01({ part: partOf(f), feature: f }, ctx));
    expect(run1.extra?.["removedTopCells"]).toBe(checkInl01(top, { minF: 0.6, slots: [2] }).removedCells);
    const run2 = one(runInl02({ part: partOf(f) }, ctx));
    const g2 = checkInl02(top, { minF: 0.6, despeckleFactor: profile.constant("despeckle.factor").value, host: 1 });
    expect([run2.verdict, run2.measured, run2.extra?.["smallestCells"]]).toEqual([g2.verdict, g2.measured, g2.smallestCells]);
  });
});

describe("CHK-INL-03 inlay depth meets the opacity floor", () => {
  it("light over dark at 3 layers: 0.72 mm fails against 1.2 (opacity.lightOverDark)", () => {
    const f = decl({ depthLayers: 3 });
    const r = one(runInl03({ part: partOf(f), feature: f }, ctx));
    expect(r.verdict).toBe("fail");
    expect(r.measured).toBe(0.72);
    expect(r.legal).toEqual({ kind: "interval", lo: 1.2, hi: null, unit: "mm", nearest: 1.2 });
    expect(r.constraint).toContain("opacity.lightOverDark");
  });

  it("light over dark at 5 layers: 1.2 mm passes", () => {
    const f = decl();
    expect(one(runInl03({ part: partOf(f), feature: f }, ctx)).verdict).toBe("pass");
  });

  it("dark over light hides in two layers: 0.48 passes, 0.24 fails (SPRUE black in white)", () => {
    const pal = ["#FFFFFF", "#000000"];
    const two = decl({ palette: pal, depthLayers: 2 });
    const r2 = one(runInl03({ part: partOf(two), feature: two }, ctx));
    expect(r2.verdict).toBe("pass");
    expect(r2.legal).toMatchObject({ lo: 0.48 });
    expect(r2.constraint).toContain("opacity.darkOverLight");
    const thin = decl({ palette: pal, depthLayers: 1 });
    expect(one(runInl03({ part: partOf(thin), feature: thin }, ctx)).verdict).toBe("fail");
  });

  it("drivenBy is the pointer bound to depthLayers and no other", () => {
    expect(inl03DrivenBy({ feature: decl({ drivenBy: { depthLayers: "/depth", minFeature: "/minF" } }) })).toEqual(["/depth"]);
    expect(inl03DrivenBy({ feature: decl() })).toEqual([]);
  });
});

describe("CHK-INL-04 bed-face art mirrored in X at extrude", () => {
  /** out[j][i] = in[j][w - 1 - i], written out here rather than taken from mirror.ts. */
  const flip = (a: Uint8Array, w: number): Uint8Array => a.map((_, p) => a[Math.floor(p / w) * w + (w - 1 - (p % w))]!);

  it("the emitted bottom slab is the L as read, mirrored", () => {
    const f = decl({ layers: { top: [SQUARE], bed: [ELL] } });
    const r = one(runInl04({ part: partOf(f) }, ctx));
    expect(r.verdict).toBe("pass");
    expect(r.measured).toBe(true);
    expect(r.extra?.["mirrorDistinct"]).toBe("yes");
    const asRead = artFaces(artOf(f)).bed.art.labels;
    const g = inlayKind.generate(f, kctx());
    const shape = g.bodies[0]!.shape;
    if (shape.route !== "raster") throw new Error("raster expected");
    const bottom = inlayMasks(f, kctx()).get(shape.layers[0]!.mask)!.labels;
    expect(Buffer.from(bottom).equals(Buffer.from(flip(asRead, GRID.w)))).toBe(true);
    expect(Buffer.from(bottom).equals(Buffer.from(asRead))).toBe(false);
  });

  it("art symmetric in X is reported, and no bed art is a skip", () => {
    const sym = decl({ layers: { top: [SQUARE], bed: [path(box(-4, -4, 4, -2), 3)] } });
    expect(one(runInl04({ part: partOf(sym) }, ctx)).extra?.["mirrorDistinct"]).toBe("no");
    expect(one(runInl04({ part: partOf(decl()) }, ctx)).verdict).toBe("skip");
  });
});

// ---- the reference through the CLI, against its committed goldens ----

function hbf(args: readonly string[]): { status: number | null; json: Record<string, unknown> } {
  const r = spawnSync(process.execPath, [join(ROOT, "core/bin/hbf.mjs"), ...args, "--json"], {
    cwd: ROOT, encoding: "utf8", timeout: 300_000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SOURCE_DATE_EPOCH: EPOCH },
  });
  if (r.stdout.trim() === "") throw new Error(`hbf ${args.join(" ")} printed nothing: ${r.stderr}`);
  return { status: r.status, json: JSON.parse(r.stdout) as Record<string, unknown> };
}

const golden = (file: string): Record<string, unknown> => JSON.parse(readFileSync(join(ROOT, REF, "expected", file), "utf8")) as Record<string, unknown>;

describe("reference cosmetic/coin-inlay (steps 5 and 6)", () => {
  it("covers feature:inlay and CHK-INL-01 to 04 in its README", () => {
    const readme = readFileSync(join(ROOT, REF, "README.md"), "utf8");
    expect(readme).toContain("covers: ['feature:inlay', 'CHK-INL-01', 'CHK-INL-02', 'CHK-INL-03', 'CHK-INL-04']");
  });

  it("the report golden holds CHK-INL-01 to 04, every one pass", () => {
    const findings = golden("report.json")["findings"] as CheckResult[];
    const inl = findings.filter((r) => r.id.startsWith("CHK-INL-"));
    expect([...new Set(inl.map((r) => r.id))].sort()).toEqual([...INLAY_CHECK_IDS]);
    expect(inl.every((r) => r.verdict === "pass")).toBe(true);
    expect(inl.find((r) => r.id === "CHK-INL-03")).toMatchObject({ version: "2.0.0", measured: 1.2, origin: "hbf://check/CHK-INL-03" });
  });

  it("part.build at the defaults: exit 0, three bodies on slots 1, 2, 3, the golden's ids", () => {
    const r = hbf(["part.build", REF]);
    expect(r.status).toBe(0);
    const parts = (r.json["result"] as { parts: { bodies: { id: string; slot: number; role: string }[] }[] }).parts;
    expect(parts[0]!.bodies.map((b) => b.slot)).toEqual([1, 2, 3]);
    expect(parts[0]!.bodies.map((b) => b.role)).toEqual(["body", "art", "art"]);
    expect(parts[0]!.bodies.map((b) => b.id).sort()).toEqual(Object.keys(golden("build.json")["meshHashes"] as object).sort());
    expect(r.json["buildHash"]).toBe(golden("build.json")["buildHash"]);
  }, 300_000);

  it("each art body's mesh volume is its cells x cell area x depth to 0.1 percent (the band bounds snap to 1/1024 mm)", () => {
    const vols = golden("build.json")["volumes"] as Record<string, number>;
    const art = golden("build.json")["inputs"] as { defHash: string };
    expect(art.defHash).toMatch(/^[0-9a-f]{64}$/);
    // The reference's art, rebuilt from its declaration in the stored report: one feature per slot.
    const findings = golden("report.json")["findings"] as CheckResult[];
    const uri = findings.find((r) => r.id === "CHK-INL-04")?.extra?.["art"];
    expect(typeof uri).toBe("string");
    const b = hbf(["part.build", REF, "--detail", "full"]);
    const ir = (b.json["result"] as { ir: Part }).ir;
    const f = ir.features.find((x) => x.kind === "inlay") as InlayDecl;
    expect(f.art).toBe(uri);
    const faces = artFaces(artOf(f));
    const res = f.grid.res;
    for (const slot of [2, 3]) {
      let cells = 0;
      for (const side of ["top", "bed"] as const) for (const s of faces[side].art.labels) if (s === slot) cells++;
      const want = cells / (res * res) * 1.2;
      const id = slot === 2 ? "inlay.pink" : "inlay.cream";
      expect(Math.abs(vols[id]! - want) / want).toBeLessThan(1e-3);
    }
  }, 300_000);

  it("the edit: depth 0.72 fails CHK-INL-03 with exit 1, check.run exit 1, and a fix to 1.2 that predicts pass", () => {
    const edit = golden("edit.json");
    expect(edit).toMatchObject({ pointer: "/depth", from: 1.2, to: 0.72 });
    const b = hbf(["part.build", REF, "--params", JSON.stringify({ [edit["pointer"] as string]: edit["to"] })]);
    expect(b.status).toBe(1);
    const uri = (b.json["result"] as { build: string }).build;
    const c = hbf(["check.run", uri]);
    expect(c.status).toBe(1);
    const results = (c.json["result"] as { results: CheckResult[] }).results;
    const three = results.filter((r) => r.id === "CHK-INL-03");
    expect(three.length).toBe(2);
    for (const r of three) {
      expect(r.verdict).toBe("fail");
      expect(r.measured).toBe(0.72);
      expect(r.legal).toEqual({ kind: "interval", lo: 1.2, hi: null, unit: "mm", nearest: 1.2 });
      expect(r.constraint.startsWith("opacity.lightOverDark")).toBe(true);
      expect(r.fix).toMatchObject({ param: "/depth", set: 1.2, predicts: { measured: 1.2, verdict: "pass" } });
    }
    expect(results.filter((r) => r.id !== "CHK-INL-03" && r.verdict === "fail")).toEqual([]);
  }, 300_000);

  it("hbf parity exits 0 against the committed goldens", () => {
    const r = spawnSync(process.execPath, [join(ROOT, "core/bin/hbf.mjs"), "parity", REF], {
      cwd: ROOT, encoding: "utf8", timeout: 300_000, env: { ...process.env, SOURCE_DATE_EPOCH: EPOCH },
    });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
  }, 300_000);
});
