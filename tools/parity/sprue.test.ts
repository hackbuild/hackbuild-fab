// tools/parity/sprue.test.ts
// M00-T12: SPRUE geometry parity through the TypeScript writer. Every
// shipped plate is read through its p:path sub-models, the four part STLs
// are read as float32 soups welded on exact equality, and each is re-emitted
// with two PETG filaments on the ffc5p machine preset. Per part the read-back
// volume must agree within 1e-3 mm3, the bounding box within 1e-6 mm and the
// triangle count exactly (computed). SPRUE's own 24-key project_settings is
// recorded, never matched: its geometry route moves onto packages at M03
// (D-028). The rows land in tools/corpus/sprue/parity-ts.json.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { afterAll, describe, expect, it } from "vitest";
import {
  build, configOf, DEFAULT_MATERIALS, DEFAULT_TEMPLATE, type BuildConfig, type Built, type WriterObject,
} from "../../packages/3mf/src/index.js";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// Repo copies of the SPRUE harvest (fab-work-directory/benches/sprue/outputs/sprue), byte-identical:
// the four plates in the 3MF corpus and the four part STLs (tools/corpus/sprue/README.md).
const PLATE_DIR = join(REPO, "tools/corpus/3mf/sprue");
const PART_DIR = join(REPO, "tools/corpus/sprue/parts");
const GOLD = join(REPO, "tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf");
const REPORT = join(REPO, "tools/corpus/sprue/parity-ts.json");
const EPOCH = Number(process.env["SOURCE_DATE_EPOCH"] ?? 1791072000);
const VOLUME_TOL = 1e-3;
const BBOX_TOL = 1e-6;
/** sprue.py writes plate vertices at 5 decimals and the part STLs as float32, so the two copies differ by up to 5e-6 mm (computed). */
const STL_PLATE_BBOX_TOL = 1e-5;
const MACHINE = "ffc5p";
const PRESET = "ffc5p_20260819";

type Vec3 = readonly [number, number, number];

interface Mesh {
  readonly positions: readonly number[];
  readonly indices: readonly number[];
}

interface PartRead {
  readonly name: string;
  readonly slot: number;
  readonly mesh: Mesh;
}

interface ObjectRead {
  readonly name: string;
  readonly parts: readonly PartRead[];
  readonly positions: readonly Vec3[];
}

interface PlateRead {
  readonly objects: readonly ObjectRead[];
  readonly settings: Readonly<Record<string, unknown>>;
}

interface Stats {
  readonly tris: number;
  readonly volume: number;
  readonly bbox: readonly [Vec3, Vec3];
}

// ---- reading: a tag scanner over the XML, enough for the 3MF core and production elements

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:]+)="([^"]*)"/g)) out[m[1]!] = m[2]!;
  return out;
}

interface ModelObject {
  readonly mesh?: Mesh;
  readonly components: readonly { readonly path: string | undefined; readonly objectid: string }[];
}

function readModel(xml: string): Map<string, ModelObject> {
  const out = new Map<string, ModelObject>();
  for (const m of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const id = attrs(m[1]!)["id"]!;
    const body = m[2]!;
    const comps = [...body.matchAll(/<component\b([^>]*)\/>/g)].map((c) => {
      const a = attrs(c[1]!);
      return { path: a["p:path"], objectid: a["objectid"]! };
    });
    if (body.includes("<mesh>")) {
      const positions: number[] = [];
      for (const v of body.matchAll(/<vertex\b([^>]*)\/>/g)) {
        const a = attrs(v[1]!);
        positions.push(Number(a["x"]), Number(a["y"]), Number(a["z"]));
      }
      const indices: number[] = [];
      for (const t of body.matchAll(/<triangle\b([^>]*)\/>/g)) {
        const a = attrs(t[1]!);
        indices.push(Number(a["v1"]), Number(a["v2"]), Number(a["v3"]));
      }
      out.set(id, { mesh: { positions, indices }, components: comps });
    } else {
      out.set(id, { components: comps });
    }
  }
  return out;
}

/** Object and part names with extruders from model_settings.config, keyed by object id and part id. */
function readModelSettings(xml: string): Map<string, { name: string; parts: Map<string, { name: string; slot: number }> }> {
  const out = new Map<string, { name: string; parts: Map<string, { name: string; slot: number }> }>();
  for (const m of xml.matchAll(/<object id="(\d+)">([\s\S]*?)<\/object>/g)) {
    const body = m[2]!;
    const name = /<metadata key="name" value="([^"]*)"\/>/.exec(body)?.[1] ?? "";
    const parts = new Map<string, { name: string; slot: number }>();
    for (const p of body.matchAll(/<part id="(\d+)"[^>]*>([\s\S]*?)<\/part>/g)) {
      const pb = p[2]!;
      parts.set(p[1]!, {
        name: /<metadata key="name" value="([^"]*)"\/>/.exec(pb)?.[1] ?? "",
        slot: Number(/<metadata key="extruder" value="(\d+)"\/>/.exec(pb)?.[1] ?? "1"),
      });
    }
    out.set(m[1]!, { name, parts });
  }
  return out;
}

/** Reads every printed object through its components, p:path sub-models included. */
async function readPlate(bytes: Uint8Array): Promise<PlateRead> {
  const zip = await JSZip.loadAsync(bytes);
  const text = async (name: string): Promise<string> => {
    const f = zip.file(name);
    if (f === null) throw new Error(`entry ${name} missing`);
    return f.async("string");
  };
  const ROOT = "3D/3dmodel.model";
  const models = new Map<string, Map<string, ModelObject>>();
  const modelOf = async (path: string): Promise<Map<string, ModelObject>> => {
    let m = models.get(path);
    if (m === undefined) {
      m = readModel(await text(path));
      models.set(path, m);
    }
    return m;
  };
  const rootXml = await text(ROOT);
  const root = await modelOf(ROOT);
  const ms = readModelSettings(await text("Metadata/model_settings.config"));
  const settings = JSON.parse(await text("Metadata/project_settings.config")) as Record<string, unknown>;

  const items = new Map<string, Vec3[]>();
  for (const m of rootXml.matchAll(/<item\b([^>]*)\/>/g)) {
    const a = attrs(m[1]!);
    const t = (a["transform"] ?? "1 0 0 0 1 0 0 0 1 0 0 0").split(/\s+/).map(Number);
    // SPRUE and the writer place instances by translation only.
    expect(t.slice(0, 9)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const list = items.get(a["objectid"]!) ?? [];
    list.push([t[9]!, t[10]!, t[11]!]);
    items.set(a["objectid"]!, list);
  }

  const objects: ObjectRead[] = [];
  for (const [objId, positions] of items) {
    const obj = root.get(objId);
    if (obj === undefined) throw new Error(`build item names object ${objId}, absent from the root model`);
    const meta = ms.get(objId);
    if (meta === undefined) throw new Error(`object ${objId} absent from model_settings.config`);
    const parts: PartRead[] = [];
    for (const c of obj.components) {
      const path = c.path === undefined ? ROOT : c.path.replace(/^\//, "");
      const target = (await modelOf(path)).get(c.objectid);
      if (target?.mesh === undefined) throw new Error(`component ${path}#${c.objectid} has no mesh`);
      const pm = meta.parts.get(c.objectid);
      if (pm === undefined) throw new Error(`part ${c.objectid} absent from model_settings.config`);
      parts.push({ name: pm.name, slot: pm.slot, mesh: target.mesh });
    }
    objects.push({ name: meta.name, parts, positions });
  }
  return { objects, settings };
}

/** Binary STL as an indexed mesh: float32 vertices welded on exact equality in first-seen order. */
function readStl(path: string): Mesh {
  const buf = readFileSync(path);
  const n = buf.readUInt32LE(80);
  expect(buf.length).toBe(84 + 50 * n);
  const positions: number[] = [];
  const indices: number[] = [];
  const seen = new Map<string, number>();
  for (let t = 0; t < n; t += 1) {
    for (let v = 0; v < 3; v += 1) {
      const o = 84 + 50 * t + 12 + 12 * v;
      const x = buf.readFloatLE(o);
      const y = buf.readFloatLE(o + 4);
      const z = buf.readFloatLE(o + 8);
      const key = `${x},${y},${z}`;
      let ix = seen.get(key);
      if (ix === undefined) {
        ix = positions.length / 3;
        seen.set(key, ix);
        positions.push(x, y, z);
      }
      indices.push(ix);
    }
  }
  return { positions, indices };
}

function stats(m: Mesh): Stats {
  const p = m.positions;
  const ix = m.indices;
  let vol = 0;
  for (let k = 0; k < ix.length; k += 3) {
    const a = ix[k]! * 3;
    const b = ix[k + 1]! * 3;
    const c = ix[k + 2]! * 3;
    vol += p[a]! * (p[b + 1]! * p[c + 2]! - p[b + 2]! * p[c + 1]!)
      - p[a + 1]! * (p[b]! * p[c + 2]! - p[b + 2]! * p[c]!)
      + p[a + 2]! * (p[b]! * p[c + 1]! - p[b + 1]! * p[c]!);
  }
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < p.length; k += 3) {
    for (let d = 0; d < 3; d += 1) {
      lo[d] = Math.min(lo[d]!, p[k + d]!);
      hi[d] = Math.max(hi[d]!, p[k + d]!);
    }
  }
  return { tris: ix.length / 3, volume: vol / 6, bbox: [lo as unknown as Vec3, hi as unknown as Vec3] };
}

interface Delta {
  readonly volume: number;
  readonly bbox: number;
  readonly tris: number;
}

function delta(a: Stats, b: Stats): Delta {
  let bbox = 0;
  for (let s = 0; s < 2; s += 1) for (let d = 0; d < 3; d += 1) bbox = Math.max(bbox, Math.abs(a.bbox[s]![d]! - b.bbox[s]![d]!));
  return { volume: Math.abs(a.volume - b.volume), bbox, tris: b.tris - a.tris };
}

const r6 = (v: number): number => Number(v.toFixed(6));
const sha256 = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

// ---- writing: two PETG slots on the ffc5p machine preset, the colours SPRUE loaded

interface SlicerPreset {
  readonly app: string;
  readonly printer: string;
  readonly process: string;
  readonly filament: string;
  readonly bedType?: string;
}

function slicerPreset(): { slicer: SlicerPreset; nozzle: number } {
  const doc = JSON.parse(readFileSync(join(REPO, "packages/profile/data/machines.json"), "utf8")) as {
    machines: { id: string; presets?: { id: string; slicer: SlicerPreset; nozzle: number }[] }[];
  };
  const p = doc.machines.find((m) => m.id === MACHINE)?.presets?.find((x) => x.id === PRESET);
  if (p === undefined) throw new Error(`machine preset ${MACHINE}/${PRESET} missing from packages/profile/data/machines.json`);
  return p;
}

function colours(settings: Readonly<Record<string, unknown>>): string[] {
  const c = settings["filament_colour"];
  if (!Array.isArray(c) || c.length !== 2) throw new Error("SPRUE plate does not carry two filament_colour values");
  return c.map(String);
}

function config(title: string, buildHash: string, cols: readonly string[], objects: readonly WriterObject[]): BuildConfig {
  const { slicer, nozzle } = slicerPreset();
  const base = configOf({
    title, chase: "sprue", buildHash, sourceDateEpoch: EPOCH, slicer, nozzleMm: nozzle,
    template: DEFAULT_TEMPLATE, materials: DEFAULT_MATERIALS,
    filaments: cols.map((colour) => ({ colour, type: "PETG", material: "petg" })),
    objects: [{ name: "placeholder", position: [0, 0, 0], bodies: [] }],
  });
  return { ...base, objects };
}

function emit(cfg: BuildConfig): Built {
  const out = build(cfg);
  if (!out.ok) throw new Error(`completeness failed: ${String(out.completeness.extra?.["first"])}`);
  return out;
}

const toWriter = (objects: readonly ObjectRead[]): WriterObject[] => objects.map((o) => ({
  name: o.name,
  positions: o.positions,
  parts: o.parts.map((p) => ({ name: p.name, slot: p.slot, positions: p.mesh.positions, indices: p.mesh.indices })),
}));

/** Array values of the filament count; the gold also holds printer vectors, which this drops. */
function perFilamentKeys(s: Readonly<Record<string, unknown>>): string[] {
  const n = (s["filament_colour"] as unknown[]).length;
  return Object.keys(s).filter((k) => Array.isArray(s[k]) && (s[k] as unknown[]).length === n).sort();
}

// ---- the run

const PLATES = readdirSync(PLATE_DIR).filter((f) => f.endsWith(".3mf")).sort();
const STLS = readdirSync(PART_DIR).filter((f) => f.endsWith(".stl")).sort();
const OUT = mkdtempSync(join(tmpdir(), "hbf-sprue-ts-"));
afterAll(() => rmSync(OUT, { recursive: true, force: true }));

interface PartRow {
  readonly source: string;
  readonly object: string;
  readonly part: string;
  readonly slot: number;
  readonly tris: number;
  readonly volumeMm3: number;
  readonly dVolumeMm3: number;
  readonly dBboxMm: number;
  readonly dTris: number;
}

const rows: PartRow[] = [];
const plateRows: Record<string, unknown>[] = [];
const emitted: { readonly file: string; readonly source?: string }[] = [];
const validation: Record<string, unknown>[] = [];

/** One validate_3mf.py --overlap run; fails as "id[rule] triangles N: first", the part address dropped since the writer moves meshes into the root model. */
function validate(file: string, mode: "--export" | "--legacy"): { status: number | null; fails: string[] } {
  const r = spawnSync("uv", ["run", "--project", "tools/py", "tools/py/validate_3mf.py", mode, "--overlap", "--json", file],
    { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error !== undefined) throw new Error(`uv did not run: ${r.error.message}; install uv to run the validator`);
  let doc: { results: { id: string; verdict: string; extra?: Record<string, unknown> }[] };
  try {
    doc = JSON.parse(r.stdout) as typeof doc;
  } catch {
    throw new Error(`validate_3mf.py ${mode} ${basename(file)} printed no JSON, exit ${String(r.status)}\n${r.stderr}`);
  }
  const fails = doc.results.filter((x) => x.verdict === "fail")
    .map((x) => `${x.id}[${String(x.extra?.["rule"] ?? "")}] triangles ${String(x.extra?.["triangles"] ?? "")}: ${String(x.extra?.["first"] ?? "")}`)
    .sort();
  return { status: r.status, fails };
}

describe("SPRUE harvest (M00-T12 inputs)", () => {
  it("holds 4 plates and 4 part STLs (counted 2026-10-04)", () => {
    expect(PLATES).toHaveLength(4);
    expect(STLS).toHaveLength(4);
  });
});

describe("SPRUE plates re-emitted through the TypeScript writer (M00-T12 steps 1 to 3)", async () => {
  const gold = await readPlate(readFileSync(GOLD));
  // Counted from the gold as packages/3mf/test/template.test.ts counts them: filament-count vectors the template holds.
  const goldKeys = perFilamentKeys(gold.settings).filter((k) => DEFAULT_TEMPLATE.keys[k] !== undefined);
  const { slicer } = slicerPreset();

  for (const plate of PLATES) {
    it(`${plate}: geometry equal per part, key set 21 to 127`, async () => {
      const bytes = readFileSync(join(PLATE_DIR, plate));
      const legacy = await readPlate(bytes);
      const legacyKeys = perFilamentKeys(legacy.settings);
      const legacyLists = legacyKeys.map((k) => (legacy.settings[k] as unknown[]).length);
      expect(Object.keys(legacy.settings)).toHaveLength(24);
      expect(legacyKeys).toHaveLength(21);
      expect(new Set(legacyLists)).toEqual(new Set([2]));
      expect(Object.keys(legacy.settings).filter((k) => !legacyKeys.includes(k)).sort())
        .toEqual(["print_settings_id", "printer_settings_id", "version"]);

      const title = basename(plate, ".3mf");
      const b = emit(config(title, sha256(bytes), colours(legacy.settings), toWriter(legacy.objects)));
      const zip = await b.zip();
      const file = join(OUT, `${title}.3mf`);
      writeFileSync(file, zip);
      emitted.push({ file, source: join(PLATE_DIR, plate) });
      const back = await readPlate(zip);

      expect(back.objects.map((o) => o.name)).toEqual(legacy.objects.map((o) => o.name));
      legacy.objects.forEach((lo, i) => {
        const bo = back.objects[i]!;
        expect(bo.positions).toEqual(lo.positions);
        expect(bo.parts.map((p) => [p.name, p.slot])).toEqual(lo.parts.map((p) => [p.name, p.slot]));
        lo.parts.forEach((lp, j) => {
          const a = stats(lp.mesh);
          const d = delta(a, stats(bo.parts[j]!.mesh));
          rows.push({ source: `plates/${plate}`, object: lo.name, part: lp.name, slot: lp.slot, tris: a.tris,
            volumeMm3: r6(a.volume), dVolumeMm3: d.volume, dBboxMm: d.bbox, dTris: d.tris });
          expect(d.volume, `${plate} ${lp.name} volume`).toBeLessThanOrEqual(VOLUME_TOL);
          expect(d.bbox, `${plate} ${lp.name} bbox`).toBeLessThanOrEqual(BBOX_TOL);
          expect(d.tris, `${plate} ${lp.name} triangles`).toBe(0);
        });
      });

      const keys = perFilamentKeys(back.settings);
      expect(keys).toEqual(goldKeys);
      expect(keys).toHaveLength(127);
      for (const k of keys) expect((back.settings[k] as unknown[]).length).toBe(2);
      expect(back.settings["filament_colour"]).toEqual(colours(legacy.settings).map((c) => c.toUpperCase()));
      expect(back.settings["curr_bed_type"]).toBe(slicer.bedType);
      plateRows.push({
        plate: `plates/${plate}`, sha256: sha256(bytes), objects: legacy.objects.length,
        instances: legacy.objects.reduce((n, o) => n + o.positions.length, 0),
        legacy: { projectKeys: Object.keys(legacy.settings).length, perFilamentKeys: legacyKeys.length, listLength: 2,
          inGoldTemplate: legacyKeys.filter((k) => goldKeys.includes(k)).length },
        emitted: { projectKeys: Object.keys(back.settings).length, perFilamentKeys: keys.length, listLength: 2,
          currBedType: back.settings["curr_bed_type"], artifactHash: b.artifactHash },
      });
    });
  }

  it("the four part STLs re-emit unchanged and match their plate parts", async () => {
    const coins = await readPlate(readFileSync(join(PLATE_DIR, "sprue_coins.3mf")));
    const picks = await readPlate(readFileSync(join(PLATE_DIR, "sprue_picks.3mf")));
    const platePart = new Map<string, PartRead>();
    for (const o of [...coins.objects, ...picks.objects]) for (const p of o.parts) platePart.set(p.name, p);

    const objects = new Map<string, PartRead[]>();
    for (const f of STLS) {
      const name = basename(f, ".stl");
      const ref = platePart.get(name);
      if (ref === undefined) throw new Error(`part STL ${f} has no plate part named ${name}`);
      const part: PartRead = { name, slot: ref.slot, mesh: readStl(join(PART_DIR, f)) };
      const d = delta(stats(ref.mesh), stats(part.mesh));
      expect(d.volume, `${f} against its plate part, volume`).toBeLessThanOrEqual(VOLUME_TOL);
      expect(d.bbox, `${f} against its plate part, bbox`).toBeLessThanOrEqual(STL_PLATE_BBOX_TOL);
      expect(d.tris, `${f} against its plate part, triangles`).toBe(0);
      const obj = name.replace(/_(white|black)$/, "");
      objects.set(obj, [...(objects.get(obj) ?? []), part].sort((a, b) => a.slot - b.slot));
    }
    const read: ObjectRead[] = [...objects].map(([name, parts], i) => ({ name, parts, positions: [[64 + 128 * i, 128, 0]] }));
    const b = emit(config("sprue_parts", sha256(Buffer.from(STLS.join("\n"))), ["#FFFFFF", "#000000"], toWriter(read)));
    const zip = await b.zip();
    const file = join(OUT, "sprue_parts.3mf");
    writeFileSync(file, zip);
    emitted.push({ file });
    const back = await readPlate(zip);
    read.forEach((o, i) => o.parts.forEach((p, j) => {
      const a = stats(p.mesh);
      const d = delta(a, stats(back.objects[i]!.parts[j]!.mesh));
      rows.push({ source: `parts/${p.name}.stl`, object: o.name, part: p.name, slot: p.slot, tris: a.tris,
        volumeMm3: r6(a.volume), dVolumeMm3: d.volume, dBboxMm: d.bbox, dTris: d.tris });
      expect(d.volume, `${p.name}.stl volume`).toBeLessThanOrEqual(VOLUME_TOL);
      expect(d.bbox, `${p.name}.stl bbox`).toBeLessThanOrEqual(BBOX_TOL);
      expect(d.tris, `${p.name}.stl triangles`).toBe(0);
    }));
    expect(perFilamentKeys(back.settings)).toHaveLength(127);
  });

  // A re-emit carries the source geometry unchanged, so it can only pass the validator where the
  // source does. sprue_picks_phx_backonly.3mf (the browser bench export) holds a white part whose
  // stacked slab shells share faces at z 0.48 mm and fails CHK-PRT-01 topology after vertex merge in
  // its own --legacy run; the re-emit must fail that rule on the same part and nothing else.
  it("every re-emitted plate passes validate_3mf.py --export --overlap where its source passes", () => {
    expect(emitted).toHaveLength(PLATES.length + 1);
    for (const e of emitted) {
      const out = validate(e.file, "--export");
      const src = e.source === undefined ? [] : validate(e.source, "--legacy").fails;
      validation.push({ artifact: basename(e.file), status: out.status, fails: out.fails, sourceFails: src });
      expect(out.fails, basename(e.file)).toEqual(src);
      if (src.length === 0) expect(out.status, basename(e.file)).toBe(0);
    }
  }, 300_000);

  it("writes the SPRUE rows of the corpus report (M00-T12 step 4)", () => {
    mkdirSync(dirname(REPORT), { recursive: true });
    const report = {
      card: "M00-T12",
      writer: "packages/3mf (TypeScript)",
      machinePreset: `${MACHINE}/${PRESET}`,
      tolerances: { volumeMm3: VOLUME_TOL, bboxMm: BBOX_TOL, triangles: "equal" },
      qualifier: "computed; key counts counted from the files",
      keySet: "SPRUE writes 21 per-filament keys plus version and two preset names, 24 in all; the writer writes the 127 gold per-filament keys. Key-set parity with SPRUE is not a target (D-028).",
      plates: plateRows,
      validator: validation,
      parts: rows.map((r) => ({ ...r, dVolumeMm3: Number(r.dVolumeMm3.toExponential(3)), dBboxMm: Number(r.dBboxMm.toExponential(3)) })),
    };
    writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
    expect(rows.length).toBeGreaterThan(0);
  });
});
