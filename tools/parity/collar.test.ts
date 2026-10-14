// tools/parity/collar.test.ts
// M00-T11 steps 4 to 6: the COLLAR coin built on the packages against the
// legacy bench, read from tools/corpus/collar/legacy-defaults.json (written
// by tools/legacy/collar-dump.mjs from designs/collar/legacy/collar.html).
//
// Per row (literal ST of collar.html line 643, and the booted blank coin):
// - the port's labelSlab grids equal the legacy grids cell for cell, so the
//   set cells per slot summed over slab bands are equal; a mismatch names
//   the band, the slot and the first cell indices;
// - the raster route (healer on, slab bounds unsnapped in Z, XY on the
//   D-054 grid) gives a healer changed count equal to the seed healer's on
//   the legacy grids, and a per part volume within 1e-3 mm3 of the legacy
//   mesh volume (computed), and per part XY bounds within 1/1024 mm and Z
//   bounds within 1e-6 mm of the legacy bbox. The raster origin comes from
//   masks(), the export path, never a test-only copy, so a wrong or shifted
//   origin on the export path fails here against legacy (translation leaves
//   labels and volumes unchanged). Triangle counts are reported, never compared;
// - with every bound snapped to 1/1024 mm and both sides relabelled at the
//   snapped bounds, per slot volume within 1e-3 mm3 of the legacy
//   estimateVolume on the same bounds (computed), and XY bounds per part
//   within 1/1024 mm of the legacy bbox.
// Key set: the per-filament keys of the exported project_settings equal the
// gold round trip's 127 keys as a set, with per slot values from the slot
// presets, and the legacy projectSettings list is the same set.
//
// The tolerance is never widened to pass.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { bounds, raster, signedVolume, type MeshData, type RasterVolume } from "../../packages/mesh/src/index.js";
import { DEFAULT_MATERIALS, DEFAULT_TEMPLATE, write3mf, type FilamentSlot } from "../../packages/3mf/src/index.js";
import { loadProfile } from "../../packages/profile/src/index.js";
import { labelBands, masks, rasterVolume, stateOf, type Band, type CollarState } from "../../designs/collar/build";
import type { CollarParams } from "../../designs/collar/chase";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DUMP = join(REPO, "tools/corpus/collar/legacy-defaults.json");
const GOLD = join(REPO, "tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf");
const EPOCH = Number(process.env["SOURCE_DATE_EPOCH"] ?? 1791072000);
/** Exported coin for the validator, outside the repo. */
const COLLAR_3MF = join(tmpdir(), "hbf-collar", "collar-port.3mf");
const VOLUME_TOL = 1e-3;
const q = (z: number): number => Math.round(z * 1024) / 1024;
/** XY bounds tolerance, one D-054 grid step (a raster origin off by one cell misses by 0.0859375 mm). */
const XY_TOL = 1 / 1024;
/** Z bounds tolerance; legacy Z is float32 (3.5999999 for 3.6). */
const Z_TOL = 1e-6;

interface LegacyBand { readonly z0: number; readonly z1: number; readonly counts: Record<string, number>; readonly offset: number; readonly cells: number; readonly sha256: string }
type Vec3 = readonly [number, number, number];
interface LegacyPart { readonly slot: number; readonly name: string; readonly tris: number; readonly volume: number; readonly bbox: readonly [Vec3, Vec3] }
interface LegacyRow {
  readonly baseline: "literal" | "booted";
  readonly st: CollarState & { readonly slots: readonly { readonly name: string; readonly color: string; readonly type: string }[]; readonly presetPattern: string };
  readonly parts: readonly LegacyPart[];
  readonly bands: readonly LegacyBand[];
  readonly heal: { readonly changed: number; readonly converged: boolean };
  readonly snapped: { readonly bands: readonly LegacyBand[]; readonly estimateVolume: Record<string, number> };
  readonly perFilament: readonly string[];
}
interface Dump { readonly sha256: string; readonly labels: string; readonly labelsSha256: string; readonly rows: readonly LegacyRow[] }

const dump = JSON.parse(readFileSync(DUMP, "utf8")) as Dump;
const labelBytes = gunzipSync(readFileSync(join(REPO, dump.labels)));
const sha256 = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

/** Every cell where the port and the legacy grid differ, as "band k cell p: legacy a, port b", first 12. */
function cellDiffs(port: readonly Band[], legacy: readonly LegacyBand[]): string[] {
  const out: string[] = [];
  legacy.forEach((lb, k) => {
    const want = labelBytes.subarray(lb.offset, lb.offset + lb.cells);
    const got = port[k]?.labels;
    if (got === undefined) { out.push(`band ${k}: missing in the port`); return; }
    for (let p = 0; p < want.length && out.length < 12; p++) if (want[p] !== got[p]) out.push(`band ${k} cell ${p}: legacy slot ${want[p]}, port slot ${got[p]}`);
  });
  return out;
}

function slotSums(bands: readonly { readonly counts: Record<string, number> }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of bands) for (const [s, n] of Object.entries(b.counts)) out[s] = (out[s] ?? 0) + n;
  return out;
}

function countsOf(b: Band): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of b.labels) if (l !== 0) out[String(l)] = (out[String(l)] ?? 0) + 1;
  return out;
}

function compareLabels(port: readonly Band[], legacy: readonly LegacyBand[]): void {
  expect(port.map((b) => [b.z0, b.z1])).toEqual(legacy.map((b) => [b.z0, b.z1]));
  const diffs = cellDiffs(port, legacy);
  expect(diffs, `label cells differ: ${diffs.join("; ")}`).toEqual([]);
  expect(port.map((b) => sha256(b.labels))).toEqual(legacy.map((b) => b.sha256));
  expect(slotSums(port.map((b) => ({ counts: countsOf(b) })))).toEqual(slotSums(legacy));
}

/** Chase params for a legacy ST, the inverse of stateOf() (the test asserts the round trip). */
function paramsOf(st: CollarState): CollarParams {
  const v = {
    dia: st.dia, thk: st.thk, cham: st.cham, inlay: st.inlay, layer: st.layer, res: st.res, nSlots: st.nSlots, base: st.base,
    shape: st.shape.kind, aspect: st.shape.aspect, corner: st.shape.corner,
    style: st.edge.style, count: st.edge.count, depth: st.edge.depth, width: st.edge.width, twist: st.edge.twist, gapDeg: st.edge.gapDeg,
    on: st.rim.on, w: st.rim.w, rimSlot: st.rim.slot, dashOn: st.rim.dashOn, dashN: st.rim.dashN, dashDuty: st.rim.dashDuty,
    dashSlot: st.rim.dashSlot, dashAlt: st.rim.dashAlt, dashSlot2: st.rim.dashSlot2, dashPhase: st.rim.dashPhase,
    nfcOn: st.nfc.on, nfcDia: st.nfc.dia, nfcDepth: st.nfc.depth, tag: st.nfc.tag,
  };
  return v as unknown as CollarParams;
}

/** The fields of a legacy ST that stateOf() carries, for the paramsOf() round trip. */
function stateFields(st: CollarState): CollarState {
  return {
    dia: st.dia, thk: st.thk, cham: st.cham, inlay: st.inlay, layer: st.layer, res: st.res, nSlots: st.nSlots, base: st.base,
    shape: st.shape, edge: st.edge, rim: st.rim, nfc: st.nfc,
  };
}

/**
 * The raster volume for the parity build, with x0 and y0 taken from the
 * export path's masks() (every mask must carry the same origin and the
 * res x res size), so the legacy bounds check covers the origin the export uses.
 */
function exportVolume(st: CollarState, bands: readonly Band[], zGrid: "dyadic" | "given" = "dyadic"): RasterVolume {
  const ms = Object.values(masks(paramsOf(st) as unknown as Record<string, unknown>));
  expect(ms.length).toBeGreaterThan(0);
  const origin = ms[0]!.origin;
  expect(origin, "masks() carries no origin").toBeDefined();
  const [x0, y0] = origin!;
  for (const m of ms) {
    expect([m.width, m.height]).toEqual([st.res, st.res]);
    expect(m.origin).toEqual([x0, y0]);
  }
  // rasterVolume() reads the same originOf(), so the legacy bounds cover its origin too.
  const own = rasterVolume(st, bands, zGrid);
  expect([own.x0, own.y0], "rasterVolume() origin equals the masks() origin").toEqual([x0, y0]);
  return { ...own, x0, y0 };
}

/** Per part bounds against the legacy bbox; Z is skipped when the bounds were snapped. */
function compareBounds(row: LegacyRow, meshes: ReadonlyMap<number, MeshData>, checkZ: boolean, tag: string): void {
  for (const p of row.parts) {
    const [lo, hi] = bounds(meshes.get(p.slot)!);
    const [wlo, whi] = p.bbox;
    for (let k = 0; k < (checkZ ? 3 : 2); k++) {
      const tol = k < 2 ? XY_TOL : Z_TOL;
      for (const [got, want, end] of [[lo[k]!, wlo[k]!, "min"], [hi[k]!, whi[k]!, "max"]] as const) {
        expect(Math.abs(got - want), `${row.baseline} ${tag} slot ${p.slot} ${"xyz"[k]} ${end}: port ${got} mm, legacy ${want} mm, delta ${got - want} mm (computed)`).toBeLessThanOrEqual(tol);
      }
    }
  }
}

describe("collar legacy dump", () => {
  it("reads the legacy copy and its label sidecar", () => {
    expect(dump.sha256).toBe(readFileSync(join(REPO, "designs/collar/legacy/sha256.txt"), "utf8").split(/\s+/)[0]);
    expect(sha256(labelBytes)).toBe(dump.labelsSha256);
    expect(dump.rows.map((r) => r.baseline)).toEqual(["literal", "booted"]);
    expect(dump.rows[0]!.parts.map((p) => p.slot)).toEqual([1, 3]);
    expect(dump.rows[1]!.parts.map((p) => p.slot)).toEqual([1]);
    for (const r of dump.rows) for (const p of r.parts) expect(p.bbox, `${r.baseline} slot ${p.slot} bbox`).toHaveLength(2);
  });

  it("paramsOf() inverts stateOf() on every legacy row", () => {
    for (const r of dump.rows) expect(stateOf(paramsOf(r.st))).toEqual(stateFields(r.st));
  });
});

describe.each(dump.rows.map((r) => [r.baseline, r] as const))("collar parity, %s", (_name, row) => {
  const st: CollarState = row.st;

  it("labels, healer and per part volume match legacy, Z unsnapped", () => {
    const bands = labelBands(st);
    compareLabels(bands, row.bands);
    const r = raster(exportVolume(st, bands, "given"));
    expect(r.heal.changed, `healer flips: port ${r.heal.changed}, legacy seed ${row.heal.changed}`).toBe(row.heal.changed);
    expect(r.heal.converged).toBe(true);
    expect([...r.meshes.keys()]).toEqual(row.parts.map((p) => p.slot));
    const lines: string[] = [];
    for (const p of row.parts) {
      const mesh = r.meshes.get(p.slot)!;
      const v = signedVolume(mesh);
      lines.push(`${row.baseline} slot ${p.slot}: port ${v.toFixed(9)} mm3 ${mesh.triangles.length / 3} tris, legacy ${p.volume.toFixed(9)} mm3 ${p.tris} tris, delta ${(v - p.volume).toExponential(2)} (computed)`);
      expect(Math.abs(v - p.volume), lines[lines.length - 1]).toBeLessThanOrEqual(VOLUME_TOL);
    }
    console.log(lines.join("\n"));
    compareBounds(row, r.meshes, true, "unsnapped");
  }, 120_000);

  it("labels and volume match legacy with Z snapped to 1/1024 mm", () => {
    const bands = labelBands(st, q);
    compareLabels(bands, row.snapped.bands);
    const r = raster(exportVolume(st, bands));
    compareBounds(row, r.meshes, false, "snapped");
    for (const [slot, want] of Object.entries(row.snapped.estimateVolume)) {
      const v = signedVolume(r.meshes.get(Number(slot))!);
      expect(Math.abs(v - want), `${row.baseline} slot ${slot} snapped: port ${v} mm3, legacy ${want} mm3 (computed)`).toBeLessThanOrEqual(VOLUME_TOL);
    }
  }, 120_000);
});

async function settingsOf(bytes: Uint8Array): Promise<Record<string, unknown>> {
  const zip = await JSZip.loadAsync(bytes);
  return JSON.parse(await zip.file("Metadata/project_settings.config")!.async("string")) as Record<string, unknown>;
}

const perFilament = (ps: Record<string, unknown>, n: number): string[] =>
  Object.keys(ps).filter((k) => Array.isArray(ps[k]) && (ps[k] as unknown[]).length === n).sort();

describe("collar 3mf key set", () => {
  it("per-filament keys equal the 127 gold keys, values per slot from the slot presets", async () => {
    const gold = await settingsOf(readFileSync(GOLD));
    const goldN = (gold["filament_colour"] as unknown[]).length;
    const goldKeys = perFilament(gold, goldN);
    expect(goldKeys.length).toBe(127);

    const row = dump.rows[0]!;
    expect([...row.perFilament].sort()).toEqual(goldKeys);

    const bands = labelBands(row.st);
    const r = raster(exportVolume(row.st, bands, "given"));
    const tables = loadProfile();
    const preset = tables.machines.find((m) => m.id === "ffc5p")!.presets[0]!;
    const slots = row.st.slots.slice(0, row.st.nSlots);
    const filaments: FilamentSlot[] = slots.map((s) => ({ colour: s.color, type: s.type, material: s.type.toLowerCase() }));
    const out = await write3mf({
      title: "collar", chase: "collar", buildHash: "parity", sourceDateEpoch: EPOCH, slicer: preset.slicer, nozzleMm: preset.nozzle,
      template: DEFAULT_TEMPLATE, materials: DEFAULT_MATERIALS, filaments,
      objects: [{ name: "collar", position: [128, 128, 0], bodies: [...r.meshes].map(([slot, mesh]: [number, MeshData]) => ({ name: slots[slot - 1]!.name, slot, mesh })) }],
    });
    mkdirSync(dirname(COLLAR_3MF), { recursive: true });
    writeFileSync(COLLAR_3MF, out.bytes);
    console.log(`wrote ${COLLAR_3MF}, artifactHash ${out.artifactHash}`);

    const ps = await settingsOf(out.bytes);
    const keys = perFilament(ps, slots.length);
    expect(new Set(keys)).toEqual(new Set(goldKeys));
    expect(keys.length).toBe(goldKeys.length);
    expect(ps["filament_colour"]).toEqual(slots.map((s) => s.color.toUpperCase()));
    expect(ps["filament_type"]).toEqual(slots.map((s) => s.type));
    expect(ps["filament_settings_id"]).toEqual(slots.map((s) => preset.slicer.filament.replace("{TYPE}", s.type)));
    expect(ps["curr_bed_type"]).toBe(preset.slicer.bedType);
    expect(ps["print_settings_id"]).toBe(preset.slicer.process);
  }, 120_000);
});
