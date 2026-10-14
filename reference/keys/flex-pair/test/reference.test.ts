// M-S-T09 reference and goldens: keys flex-pair at preset "two" (the print
// the owner makes in M-S-T10), cut by y = 0 through both keys. The section
// must show both column halves rising from the trace band to colTop under
// the cap, with the cap underside one declared gap above colTop. The
// section SVG in expected/ and the generated README blocks must equal what
// this build writes. HBF_ACCEPT=1 rewrites them and renders each PNG from
// its SVG; this test is their only writer, hbf parity --accept writes only
// the four JSON goldens (D-227). The SVG is the compared golden, the PNG its
// rendering: a person reads the PNGs before they land, and CI never sets
// HBF_ACCEPT.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { MESH_GRID_PER_MM, type CheckResult } from "@hackbuild/spec";
import { liveCount, loadManifold } from "@hackbuild/mesh";
import { buildPart, export3mf, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { CARD_END, CARD_START, CHECKS_END, CHECKS_START, between, checksBlock, printCard, splice } from "./card";
import { keySvg, readKey, sectionAtY0, type BodySection, type KeyReading } from "./section";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, "..");
const ROOT = path.resolve(DIR, "..", "..", "..");
const EXPECTED = path.join(DIR, "expected");
const README = path.join(DIR, "README.md");
const ACCEPT = process.env["HBF_ACCEPT"] === "1";
const PRESET = "two";
/** One snap step, mm (D-054). */
const GRID = 1 / MESH_GRID_PER_MM;
/** The epoch the print card pins, s: 1980-01-01, the zip floor. */
const CARD_EPOCH = 315532800;

const savedEpoch = process.env["SOURCE_DATE_EPOCH"];
let built: Built;
let pkg: Awaited<ReturnType<typeof export3mf>>;
let sections: BodySection[];
let readings: KeyReading[];

beforeAll(async () => {
  // The print card names the bytes written with SOURCE_DATE_EPOCH pinned:
  // unset, core reads the HEAD commit time once the repo has a commit, and
  // the sha256 moves with every commit (core/src/epoch.ts).
  process.env["SOURCE_DATE_EPOCH"] = String(CARD_EPOCH);
  const design = await loadDesign("reference/keys/flex-pair", ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, PRESET));
  pkg = await export3mf(built);
  const wasm = await loadManifold();
  const netOf = new Map(built.draft.features.flatMap((f) => (f.kind === "conductor" ? [[f.id, f.net] as const] : [])));
  sections = sectionAtY0(wasm, built.meshed.bodies.map((b) => ({ id: b.id, material: b.material, net: netOf.get(b.id), mesh: b.mesh })));
  const keys = built.values["keys"] as readonly { readonly x: number }[];
  readings = keys.map((k, i) => readKey(sections, built.draft, i + 1, k.x));
});

afterAll(() => {
  if (savedEpoch === undefined) delete process.env["SOURCE_DATE_EPOCH"];
  else process.env["SOURCE_DATE_EPOCH"] = savedEpoch;
});

describe(`keys flex-pair preset ${PRESET}, section at y = 0`, () => {
  test("every wasm object the section made is freed", () => {
    expect(liveCount()).toBe(0);
  });

  test("two keys, one reading each", () => {
    expect(readings.map((r) => r.key)).toEqual([1, 2]);
  });

  test("both column halves run from the trace band floor to colTop (computed, 1/1024 mm)", () => {
    for (const r of readings) {
      for (const half of [r.kHalf, r.gndHalf]) {
        expect(Math.abs(half.z0 - r.declared.traceBand[0])).toBeLessThanOrEqual(GRID);
        expect(Math.abs(half.z1 - r.declared.colTop)).toBeLessThanOrEqual(GRID);
      }
    }
  });

  test("the halves sit either side of the key axis, apart", () => {
    for (const r of readings) {
      expect(r.kHalf.x0).toBeGreaterThan(r.x);
      expect(r.gndHalf.x1).toBeLessThan(r.x);
      expect(r.splitRead).toBeGreaterThan(0);
    }
  });

  test("the cap underside over the column sits one declared gap above colTop (computed, 1/1024 mm)", () => {
    for (const r of readings) {
      expect(Number.isFinite(r.capUnderside)).toBe(true);
      expect(Math.abs(r.gapRead - r.declared.gap)).toBeLessThanOrEqual(GRID);
    }
  });

  // PIP's flex need subtracts the bezel (pip-controller src/layout.js line
  // 223, pip.md 4.3), so the cap and key top stand above the body top. A
  // key body under the pad top sits in the pad's top shells, where Flash
  // Studio prints the pad's internal bridge in PETG across it (virtual print
  // 2026-10-07, fab-knowledge/evidence/virtual-print/before/report-slice.md).
  test("each cap underside sits at or above the pad top, so no key body lies in the pad's top shells (computed, 1/1024 mm)", () => {
    const pad = sections.find((s) => s.material === "petg");
    expect(pad).toBeDefined();
    const padTop = Math.max(...pad!.loops.flat().map((p) => p[1]));
    for (const r of readings) expect(r.capUnderside).toBeGreaterThanOrEqual(padTop - GRID);
  });

  test("expected/section-key<n>.svg equals this build; PNG beside it", () => {
    const padTop = Math.max(...sections.flatMap((s) => s.loops.flat().map((p) => p[1])));
    for (const r of readings) {
      const svg = keySvg(sections, r, padTop, `keys flex-pair, preset ${PRESET}, key ${r.key} at x ${r.x} mm, section y = 0`);
      const file = path.join(EXPECTED, `section-key${r.key}.svg`);
      if (ACCEPT) {
        writeFileSync(file, svg);
        const png = file.replace(/\.svg$/, ".png");
        const run = spawnSync("rsvg-convert", ["-f", "png", "-o", png, file], { encoding: "utf8" });
        if (run.status !== 0) throw new Error(`rsvg-convert did not run: ${run.error?.message ?? run.stderr}; the svg is written, the png is not`);
      }
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, "utf8")).toBe(svg);
      // The rendering a person reads sits beside the compared SVG.
      expect(existsSync(file.replace(/\.svg$/, ".png"))).toBe(true);
    }
  });

  test("the card's export reads the pinned epoch, not the HEAD commit time", () => {
    expect(built.sourceDateEpoch).toBe(CARD_EPOCH);
  });

  test("the export's License carries the chase licence (LICENSING.md 1.4)", async () => {
    const zip = await JSZip.loadAsync(pkg.bytes);
    const model = await zip.file("3D/3dmodel.model")!.async("string");
    expect(built.design.chase.meta.license).toBe("CC-BY-SA-4.0");
    expect(model).toContain(`<metadata name="License">${built.design.chase.meta.license}</metadata>`);
  });

  test("the printed travel is the cap underside less the sliced column top (computed, layer grid of the profile)", () => {
    const machine = built.design.ws.tables.machines.find((m) => m.id === built.part.machine)!;
    const preset = machine.presets[0]!;
    for (const r of readings) {
      const metric = built.draft.metrics?.find((x) => x.id === `keys.${r.key}.printedTravel`);
      // The last layer whose mid-height lies under colTop ends the column.
      let top = 0;
      for (let i = 0; ; i += 1) {
        const t = preset.firstLayer + i * preset.layer;
        const h = i === 0 ? preset.firstLayer : preset.layer;
        if (t - h / 2 >= r.declared.colTop - 1e-9) break;
        top = t;
      }
      expect(metric?.value).toBeCloseTo(r.declared.colTop + r.declared.gap - top, 3);
      expect(metric?.value as number).toBeGreaterThanOrEqual(r.declared.gap - 1e-9);
    }
  });

  test("README print card and checks blocks equal this build", async () => {
    const zip = await JSZip.loadAsync(pkg.bytes);
    const settings = JSON.parse(await zip.file("Metadata/project_settings.config")!.async("string")) as Record<string, unknown>;
    const machine = built.design.ws.tables.machines.find((m) => m.id === built.part.machine)!;
    const preset = machine.presets[0]!;
    const card = printCard({
      chase: built.design.chase, preset: PRESET, draft: built.draft,
      values: { W: built.values["W"] as number, H: built.values["H"] as number },
      buildHash: built.part.buildHash, artifactHash: pkg.artifactHash, bytes: pkg.bytes.length,
      fileSha256: createHash("sha256").update(pkg.bytes).digest("hex"),
      sourceDateEpoch: built.sourceDateEpoch, settings, entries: Object.keys(zip.files).sort(),
      modelSettings: await zip.file("Metadata/model_settings.config")!.async("string"),
      profilePreset: { id: preset.id, layer: preset.layer, firstLayer: preset.firstLayer },
    });
    const report = JSON.parse(readFileSync(path.join(EXPECTED, "report.json"), "utf8")) as { findings: CheckResult[] };
    const checks = checksBlock(report.findings);
    if (ACCEPT) {
      let text = readFileSync(README, "utf8");
      text = splice(text, CARD_START, CARD_END, card);
      text = splice(text, CHECKS_START, CHECKS_END, checks);
      writeFileSync(README, text);
    }
    const text = readFileSync(README, "utf8");
    expect(between(text, CARD_START, CARD_END)).toBe(card);
    expect(between(text, CHECKS_START, CHECKS_END)).toBe(checks);
  });
});
