// keys/access-switch reference (R1-flagship-access-switch-02): the real
// build (core buildPart at the pinned epoch) places one click-spring-key
// under a paddle. The spring band 1.3 to 1.8 N is the brief's band around
// the 1.552 N the scout read off the original snapfe.js at l 28, t 0.55
// (computed), and l 24 reads 2.527 N, outside it, as the click-spring
// reference pins; the parity goldens are rerun without accept off the
// pinned epoch. The jack seat (R1-flagship-access-switch-06): the pad
// table jack.ts copies equals the catalog row as packages/catalog loads it
// from the committed footprint, and the closed path resistance sums the
// archetype's readouts and the leads, held to sectionResistance.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { beforeAll, describe, expect, test } from "vitest";
import type { Feature, Metric } from "@hackbuild/spec";
import { KICAD_RESOLVERS, loadCatalog } from "@hackbuild/catalog";
import { createProfileLookup, sectionResistance } from "@hackbuild/profile";
import { PJ398SM_BODY, PJ398SM_PADS, toWall } from "../jack";
import { buildPart, export3mf, loadDesign, resolveParams, type Built, type Design } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";
import { CARD_END, CARD_START, between, printCard, splice } from "./card";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/keys/access-switch";
const KEY = "click-spring-key.0";

let design: Design;
let built: Built;
beforeAll(async () => {
  design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
}, 300_000);
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === id);
const num = (id: string): number => {
  const v = metric(id)?.value;
  if (typeof v !== "number") throw new Error(`no numeric metric ${id}`);
  return v;
};

describe("access switch", () => {
  test("builds the body, the spring parts and the paddle, each in its slot", () => {
    const by = new Map(built.part.bodies.map((b) => [b.id, b] as const));
    expect(by.get("body")?.material).toBe("petg");
    expect(by.get("paddle")?.material).toBe("petg");
    expect(by.get(`${KEY}.spring`)?.material).toBe("petg");
    expect(by.get(`${KEY}.cap`)?.material).toBe("tpu95");
    expect(by.get(`${KEY}.tip`)?.material).toBe("ctpu");
  });

  test("spring metrics exist, gated by CHK-KEY-04, and the peak at defaults lies in 1.3 to 1.8 N", () => {
    for (const id of ["peakN", "drop", "cg", "eStop", "bistable"]) expect(metric(`${KEY}.spring.${id}`)?.gate, id).toBe("CHK-KEY-04");
    const peak = num(`${KEY}.spring.peakN`);
    expect(peak).toBeGreaterThan(1.3);
    expect(peak).toBeLessThan(1.8);
    expect(peak.toFixed(3)).toBe("1.552");
    expect(metric(`${KEY}.spring.bistable`)?.value).toBe("no");
  });

  test("build.ts hands the spring the petg modulus from profile and types no modulus", () => {
    const src = readFileSync(path.join(ROOT, REF, "build.ts"), "utf8");
    expect(src).toMatch(/k\.profile\.material\("petg"\)/);
    expect(src).toMatch(/const E = petg\.modulusMPa;/);
    expect(src).not.toMatch(/\b1900\b/);
    expect(createProfileLookup(design.ws.tables).material("petg").modulusMPa).toBeGreaterThan(0);
  });

  test("the paddle stops on the body top between contact and the eStop travel", () => {
    const prof = createProfileLookup(design.ws.tables);
    const cg = num(`${KEY}.spring.cg`);
    const over = prof.constant("click.stopOvertravel").value;
    expect(num("paddle.travel")).toBeGreaterThan(cg);
    expect(num("paddle.travel")).toBeLessThanOrEqual(Number((cg + over).toFixed(3)) + 1e-9);
    expect(num("paddle.boss")).toBeGreaterThan(0);
    expect(num("paddle.guideClr")).toBe(prof.constant("access.paddleGuideClr").value);
    expect(metric("paddle.guideClr")?.basis).toBe("inferred");
    expect(num("paddle.massG")).toBeGreaterThan(0);
    expect(num("layout.diameter")).toBe(56 + 2 * 3);
    expect(built.part.warnings.map((w) => w.code)).not.toContain("CLAMP");
  });

  test("the key and common nets are asserted apart, and the committed report holds them apart with no fail", () => {
    expect(built.part.assertions).toContainEqual({ type: "apart", nets: ["KEY", "GND"] });
    const nets = new Set(built.part.features.flatMap((f) => (f.kind === "conductor" ? [f.net] : [])));
    expect([...nets].sort()).toEqual(["GND", "KEY"]);
    // The parity test below holds a fresh report equal to this golden.
    const report = JSON.parse(readFileSync(path.join(ROOT, REF, "expected", "report.json"), "utf8")) as {
      findings: { verdict: string; id: string; target: { level: string; a?: { net?: string }; b?: { net?: string } } }[];
    };
    expect(report.findings.filter((c) => c.verdict === "fail").map((c) => c.id)).toEqual([]);
    const pair = report.findings.filter((c) => c.id === "CHK-NET-02" && c.target.level === "pair");
    expect(pair.map((c) => [c.target.a?.net, c.target.b?.net, c.verdict])).toContainEqual(["GND", "KEY", "pass"]);
  });

  describe("jack seat", () => {
    const feature = (id: string): Feature => {
      const f = built.part.features.find((x) => x.id === id);
      if (f === undefined) throw new Error(`no feature ${id}`);
      return f;
    };
    const box = (id: string) => {
      const f = feature(id);
      const ring = f.kind === "conductor" && "path" in f.region ? f.region.path : f.kind === "pocket" ? f.outline : [];
      const xs = ring.map((q) => q[0]), ys = ring.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      return { x0, x1, y0, y1, w: x1 - x0, d: y1 - y0, cx: (x0 + x1) / 2 };
    };

    test("the pad table in jack.ts equals the catalog row loaded from the committed footprint", () => {
      const dir = "connectors/pj398sm";
      const files = new Map(["row.json", "pj398sm.kicad_mod"].map((n) =>
        [`${dir}/${n}`, new Uint8Array(readFileSync(path.join(ROOT, "packages", "catalog", "data", dir, n)))] as const));
      const row = loadCatalog(files, { resolvers: KICAD_RESOLVERS }).rows.get("pj398sm");
      const pads = row?.fields["pads"]?.value as readonly { name: string; x: number; y: number; w: number; h: number; drill: number }[];
      expect(PJ398SM_PADS.map((p) => [p.name, p.x, p.y, p.w, p.h, p.drill])).toEqual(pads.map((p) => [p.name, p.x, p.y, p.w, p.h, p.drill]));
      const dims = row?.fields["dims.body"]?.value as readonly number[];
      expect([PJ398SM_BODY.x[1] - PJ398SM_BODY.x[0], Number((PJ398SM_BODY.y[1] - PJ398SM_BODY.y[0]).toFixed(6))]).toEqual(dims);
      // The plug circle centre on F.Fab, KiCad y down, read from the file.
      const mod = new TextDecoder().decode(files.get(`${dir}/pj398sm.kicad_mod`));
      const circle = /\(fp_circle \(center ([-\d.]+) ([-\d.]+)\) \(end [-\d.]+ [-\d.]+\) \(layer F\.Fab\)/.exec(mod);
      expect([Number(circle?.[1]), -Number(circle?.[2])]).toEqual([...PJ398SM_BODY.bushing]);
    });

    test("the S and T sockets sit where the catalog pads land, on the sleeve and key nets; TN is PETG only", () => {
      for (const [name, net] of [["S", "GND"], ["T", "KEY"]] as const) {
        const pad = PJ398SM_PADS.find((p) => p.name === name)!;
        const sock = box(`conductor.socket${name}`);
        expect(sock.cx, name).toBeCloseTo(toWall([pad.x, pad.y])[0], 9);
        const slot = box(`pocket.leg${name}`);
        expect(slot.w, name).toBeCloseTo(pad.drill, 9);
        expect(slot.cx, name).toBeCloseTo(sock.cx, 9);
        for (const id of [`conductor.socket${name}`, `conductor.socket${name}WallA`, `conductor.socket${name}WallB`, `conductor.lead${name}`]) {
          const f = feature(id);
          expect(f.kind === "conductor" ? [f.net, f.material] : [], id).toEqual([net, "cpla"]);
        }
      }
      // T lies 11.4 mm from S along the wall, the catalog's pad pitch.
      expect(box("conductor.socketT").cx - box("conductor.socketS").cx).toBeCloseTo(11.4, 9);
      expect(built.part.features.filter((f) => f.id.includes("TN")).map((f) => [f.id, f.kind])).toEqual([["pocket.legTN", "pocket"]]);
      expect(built.part.features.filter((f) => f.kind === "pad")).toEqual([]);
    });

    test("leg depth meets seat.socketPinMin, and the bore, wall and body depth come from profile", () => {
      const prof = createProfileLookup(design.ws.tables);
      expect(num("jack.legDepth")).toBe(prof.constant("jack.socketLen").value);
      expect(num("jack.legDepth")).toBeGreaterThanOrEqual(prof.constant("seat.socketPinMin").value);
      expect(num("jack.wall")).toBe(prof.constant("jack.panelT").value);
      const u = box("pocket.jackBoreU");
      expect(u.w).toBeCloseTo(prof.constant("jack.boreD").value, 9);
      const pocket = box("pocket.jack");
      expect(pocket.y0).toBeCloseTo(-num("layout.diameter") / 2 + prof.constant("jack.panelT").value, 9);
      expect(pocket.d).toBeCloseTo(prof.constant("jack.bodyDepth").value + prof.constant("jack.clr").value, 9);
      // The jack top stays under the body top, where the paddle skirt stops.
      expect(num("jack.axisZ") + 4.5).toBeLessThanOrEqual(num("layout.top"));
      expect(built.part.warnings.map((w) => w.code)).not.toContain("FIT");
    });

    test("R.closed is the key's switch and pads plus the leads, and R.leads equals sectionResistance over the features", () => {
      const prof = createProfileLookup(design.ws.tables);
      const along = prof.resistivity("cpla", "along", "printed"), through = prof.resistivity("cpla", "through", "printed");
      const r = (row: typeof along, len: number, area: number): number => {
        const o = sectionResistance(row, len, area).ohm;
        return typeof o === "number" ? o : o[0];
      };
      const conductor = (id: string) => {
        const f = feature(id);
        if (f.kind !== "conductor") throw new Error(`${id} is not a conductor`);
        return f;
      };
      let sum = 0;
      for (const [name, tag] of [["T", ""], ["S", "Common"]] as const) {
        const lead = conductor(`conductor.lead${name}`);
        const [a, z] = "centreline" in lead.region ? lead.region.centreline : [];
        if (a === undefined || z === undefined) throw new Error(`lead ${name} has no centreline`);
        const len = Math.hypot(z[0] - a[0], z[1] - a[1]);
        const post = conductor(`${KEY}.conductor.post${tag}`);
        const sock = conductor(`conductor.socket${name}`);
        const b = box(`conductor.socket${name}`);
        const floor = prof.constant("stack.skin").value + 2 * prof.constant("stack.trace").value + prof.constant("stack.iso").value + prof.constant("stack.overL2").value;
        sum += r(along, len, lead.width * lead.t) + r(through, floor - prof.constant("stack.skin").value, Math.PI * (post.width / 2) ** 2)
          + r(through, sock.t, b.w * b.d);
      }
      expect(num("R.leads")).toBeCloseTo(sum, 2);
      const closed = num(`${KEY}.key.R.switch`) + num(`${KEY}.key.R.pads`) + num("R.leads");
      expect(Math.abs(num("R.closed") - closed)).toBeLessThan(0.01);
      expect(Number.isFinite(num("R.closed"))).toBe(true);
      expect(metric("R.closed")?.qualifier).toBe("computed");
      const readme = readFileSync(path.join(ROOT, REF, "README.md"), "utf8");
      expect(readme).toContain(`R.closed ${num("R.closed").toFixed(0)} ohm`);
    });
  });

  test("parity goldens hold off the pinned epoch", { timeout: 300_000 }, async () => {
    const saved = process.env["SOURCE_DATE_EPOCH"];
    process.env["SOURCE_DATE_EPOCH"] = "1000000000";
    try {
      const out = await runParity({ reference: REF }, ROOT);
      expect(out.files.map((f) => [f.file, f.status])).toEqual([
        ["build.json", "equal"], ["report.json", "equal"], ["edit.json", "equal"], ["artifacts.json", "equal"],
      ]);
      expect(out.ok).toBe(true);
    } finally {
      if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"]; else process.env["SOURCE_DATE_EPOCH"] = saved;
    }
  });
});

// The print card (R1-flagship-access-switch-09): the README block equals
// the card written from this build and the 3MF bytes the writer makes in
// process at the pinned epoch, so a geometry change that leaves the card
// behind fails here. HBF_ACCEPT=1 rewrites the block. No export is run.
describe("access switch print card", () => {
  const PRESET = "default";
  const README = path.join(ROOT, REF, "README.md");

  test("the card's preset resolves to the values the build ran, at the pinned epoch", () => {
    expect(resolveParams(design.chase, undefined, PRESET)).toEqual(resolveParams(design.chase, undefined, undefined));
    expect(built.sourceDateEpoch).toBe(315532800);
  });

  test("README print card block equals this build", { timeout: 120_000 }, async () => {
    const pkg = await export3mf(built);
    const zip = await JSZip.loadAsync(pkg.bytes);
    const settings = JSON.parse(await zip.file("Metadata/project_settings.config")!.async("string")) as Record<string, unknown>;
    const machine = design.ws.tables.machines.find((m) => m.id === built.part.machine)!;
    const preset = machine.presets[0]!;
    const card = printCard({
      chase: design.chase, preset: PRESET, draft: built.draft, metrics: built.part.metrics,
      buildHash: built.part.buildHash, artifactHash: pkg.artifactHash, bytes: pkg.bytes.length,
      fileSha256: createHash("sha256").update(pkg.bytes).digest("hex"),
      sourceDateEpoch: built.sourceDateEpoch, settings,
      modelSettings: await zip.file("Metadata/model_settings.config")!.async("string"),
      profilePreset: { id: preset.id, layer: preset.layer, firstLayer: preset.firstLayer },
    });
    if (process.env["HBF_ACCEPT"] === "1") writeFileSync(README, splice(readFileSync(README, "utf8"), CARD_START, CARD_END, card));
    expect(between(readFileSync(README, "utf8"), CARD_START, CARD_END)).toBe(card);
    // The card names the jack lugs on the nets the build wires them to.
    expect(card).toContain("| T | tip | KEY | conductor.socketT |");
    expect(card).toContain("| S | sleeve | GND | conductor.socketS |");
  });
});
