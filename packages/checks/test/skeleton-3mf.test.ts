// M-S-T07 3mf slice: keys flex-pair preset "one" built on the T03 mesh
// slice, written as one object with three bodies on slots 1 to 3, and
// written twice under one SOURCE_DATE_EPOCH to prove equal bytes (D-052).
// The three bodies are one part draft through runStages, the one D-047
// stage runner, so they share one partition and one frame.
//
// Geometry follows the reduced build in spec/fixtures/keys-flex-pair.ts at
// its defaults; z values come from the ffc5p_20260819 grid in
// packages/profile. The draft feature defs (pocket, conductor) are M-S-T04;
// this test cuts the pocket and the trace channels as stage 2 cutters so
// the writer has the three disjoint bodies the export carries.
//
// The test writes nothing to disk: reference/keys/flex-pair/out/flex-pair.3mf
// belongs to the M-S-T08 export.run, which the T07 validator run reads.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { isThrownCommandError, type MeshRef, type PartDraft, type Ring, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { liveCount, meshRef, runStages, type MeshData } from "@hackbuild/mesh";
import { createProfileLookup, layerIndex, layerTop, loadProfile, snapLayer, tablesFromSeed } from "@hackbuild/profile";
import {
  artifactHash, filamentTemplate, slicerMaterials, threeMfEntries, write3mf, zipEntries, type FilamentSlot, type ThreeMfInput,
} from "@hackbuild/3mf";

const read = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
const template = filamentTemplate(read("../../3mf/data/filament_template.json"));
const materials = slicerMaterials(read("../../3mf/seed/materials.json"));
const tables = tablesFromSeed(read("../../profile/seed/profile.seed.json"));
const machine = tables.machines.find((m) => m.id === "ffc5p")!;
/** Bed x and y, mm: the envelope, or its sheet for a cutter. */
const BED: readonly [number, number] = "sheet" in machine.envelope ? machine.envelope.sheet : [machine.envelope[0], machine.envelope[1]];
const preset = machine.presets.find((p) => p.id === "ffc5p_20260819")!;

/** 2026-10-01T00:00:00Z unless the caller sets SOURCE_DATE_EPOCH, s. */
const EPOCH = Number(process.env["SOURCE_DATE_EPOCH"] ?? Date.UTC(2026, 9, 1) / 1000);

// Fixture defaults, preset "one" (spec/fixtures/keys-flex-pair.ts), mm.
const P = { W: 60, H: 30, r: 4, x: 0, d: 11, cone: 3.2, w: 1.4, busY: 3, pocketPerSide: 0.26 }; // 0.26 per side, D-198

// Circle points from the rational parametrisation of the unit circle, 4n
// vertices, counter-clockwise.
function quarterArc(r: number, at: Vec2, startQuarter: number, n: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let k = 0; k < n; k += 1) {
    const t = k / n;
    const c = (1 - t * t) / (1 + t * t);
    const s = (2 * t) / (1 + t * t);
    const [u, v] = [[c, s], [-s, c], [-c, -s], [s, -c]][startQuarter % 4]!;
    pts.push([at[0] + r * u!, at[1] + r * v!]);
  }
  return pts;
}
const circle = (r: number, at: Vec2, n = 8): Ring => [0, 1, 2, 3].flatMap((q) => quarterArc(r, at, q, n));
function roundRect(W: number, H: number, r: number, n = 4): Ring {
  const a = W / 2 - r;
  const b = H / 2 - r;
  const centres: Vec2[] = [[a, b], [-a, b], [-a, -b], [a, -b]];
  return centres.flatMap((c, q) => [...quarterArc(r, c, q, n), [c[0] + r * [0, -1, 0, 1][q]!, c[1] + r * [1, 0, -1, 0][q]!] as Vec2]);
}
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

interface Built { readonly mesh: MeshData; readonly ref: MeshRef }
interface FlexPair { readonly pad: Built; readonly traces: Built; readonly cap: Built; readonly T: number }

const profile = createProfileLookup(loadProfile());
const prism = (outline: readonly Ring[], z: readonly [number, number]): ShapeDecl => ({ route: "prism", outline: [...outline], z: [z[0], z[1]] });

async function buildFlexPair(): Promise<FlexPair> {
  const skin = snapLayer(preset, 0.72);
  const bandTop = snapLayer(preset, skin + 0.72);
  const z0 = snapLayer(preset, bandTop + 0.96);
  const cone = snapLayer(preset, z0 + P.cone) - z0;
  const T = layerTop(preset, layerIndex(preset, z0 + cone) + 4);

  const keyTrace = prism([rect(P.x - P.w / 2, -P.H / 2, P.x + P.w / 2, 0)], [skin, bandTop]);
  const bus = prism([rect(P.x - P.w / 2, P.busY - P.w / 2, P.W / 2, P.busY + P.w / 2)], [skin, bandTop]);
  const pocket = prism([circle(P.d / 2 + P.pocketPerSide, [P.x, 0])], [z0, T + 1]);

  // Role body for all three, so stage 6 insets nothing; the pad's cutters leave the traces and cap disjoint from it.
  const draft: PartDraft = {
    id: "flex-pair", name: "flex-pair", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: true, pose: "print" }, features: [],
    bodies: [
      { id: "pad", role: "body", slot: 1, material: "petg", base: prism([roundRect(P.W, P.H, P.r)], [0, T]) },
      { id: "traces", role: "body", slot: 2, material: "cpla", base: keyTrace },
      { id: "cap1", role: "body", slot: 3, material: "ctpu", base: prism([circle(P.d / 2, [P.x, 0])], [z0, z0 + cone]) },
    ],
  };
  const out = await runStages({ draft, profile, cutters: { pad: { preUnionCutters: [pocket, keyTrace, bus] }, traces: { unionPositives: [bus] } } });
  const [pad, traces, cap] = out.bodies.map((b) => ({ mesh: b.mesh, ref: meshRef(b.mesh) }));
  return { pad: pad!, traces: traces!, cap: cap!, T };
}

const FILAMENTS: readonly FilamentSlot[] = [
  { colour: "#1A1A1A", type: "PETG", material: "petg" },
  { colour: "#404040", type: "PLA", material: "cpla" },
  { colour: "#808080", type: "TPU", material: "ctpu" },
];

function input(b: FlexPair, over: Partial<ThreeMfInput> = {}): ThreeMfInput {
  return {
    title: "flex-pair", chase: "keys-flex-pair", buildHash: "unbuilt-m-s-t07", sourceDateEpoch: EPOCH,
    slicer: preset.slicer, nozzleMm: preset.nozzle, template, materials, filaments: FILAMENTS,
    objects: [{
      name: "flex-pair",
      position: [BED[0] / 2, BED[1] / 2, 0],
      bodies: [
        { name: "pad", slot: 1, mesh: b.pad.mesh },
        { name: "traces", slot: 2, mesh: b.traces.mesh },
        { name: "cap1", slot: 3, mesh: b.cap.mesh },
      ],
    }],
    ...over,
  };
}

const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return isThrownCommandError(e) ? e.hbf.code : `not a command error: ${String(e)}`;
  }
  return undefined;
}

describe("3mf slice (M-S-T07)", async () => {
  const live = liveCount();
  const built = await buildFlexPair();

  it("builds three watertight bodies on the mesh slice with zero live wasm objects", () => {
    expect(liveCount()).toBe(live);
    for (const b of [built.pad, built.traces, built.cap]) {
      expect(b.ref.watertight).toBe(true);
      expect(b.ref.volumeMm3).toBeGreaterThan(0);
    }
  });

  it("writes one object with three bodies on slots 1 to 3, and two exports give equal sha256", async () => {
    const a = await write3mf(input(built));
    const b = await write3mf(input(built));
    expect(sha(a.bytes)).toBe(sha(b.bytes));
    expect(a.artifactHash).toBe(b.artifactHash);

    const settings = a.entries["Metadata/model_settings.config"]!;
    expect([...settings.matchAll(/<part id="\d+"[^]*?key="extruder" value="(\d+)"/g)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(a.entries["3D/3dmodel.model"]).not.toContain("p:path");
    expect(JSON.parse(a.entries["Metadata/hackbuild_chase.json"]!)).toMatchObject({ chase: "keys-flex-pair" });
  });

  it("keeps every zip entry sorted, file only, at the epoch mtime (D-052)", async () => {
    const { bytes, entries } = await write3mf(input(built));
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    expect(names).toEqual(Object.keys(entries).sort());
    for (const name of names) {
      const f = zip.files[name]!;
      expect(f.dir).toBe(false);
      // DOS time has 2 s resolution; the epoch is a whole minute.
      expect(f.date.getTime()).toBe(EPOCH * 1000);
    }
  });

  it("moves the bytes with the epoch and holds the artifactHash", async () => {
    const entriesA = threeMfEntries(input(built));
    const entriesB = threeMfEntries(input(built, { sourceDateEpoch: EPOCH + 86400 }));
    expect(entriesA["3D/3dmodel.model"]).not.toBe(entriesB["3D/3dmodel.model"]);
    expect(sha(await zipEntries(entriesA, EPOCH))).not.toBe(sha(await zipEntries(entriesB, EPOCH + 86400)));
    expect(artifactHash(entriesA)).toBe(artifactHash(entriesB));
  });

  it("writes every template key once per slot with the slot type (CHK-3MF-02, -07)", () => {
    const ps = JSON.parse(threeMfEntries(input(built))["Metadata/project_settings.config"]!) as Record<string, unknown>;
    for (const key of Object.keys(template.keys)) {
      const v = ps[key];
      expect(Array.isArray(v), key).toBe(true);
      expect((v as unknown[]).length, key).toBe(FILAMENTS.length);
      expect((v as unknown[]).every((x) => typeof x === "string"), key).toBe(true);
    }
    expect(ps["filament_type"]).toEqual(["PETG", "PLA", "TPU"]);
    expect(ps["filament_colour"]).toEqual(FILAMENTS.map((f) => f.colour));
    expect(ps["filament_multi_colour"]).toEqual(FILAMENTS.map((f) => f.colour));
    expect(ps["filament_self_index"]).toEqual(["1", "2", "3"]);
    expect(ps["filament_settings_id"]).toEqual(["PETG", "PLA", "TPU"].map((t) => preset.slicer.filament.replace("{TYPE}", t)));
    for (const k of ["filament_map", "filament_extruder_variant"]) expect(ps[k], k).toEqual(template.keys[k]);
    expect((ps["overhang_fan_threshold"] as string[]).every((x) => /^[0-9]+%$/.test(x))).toBe(true);
    expect(ps).not.toHaveProperty("extruder_variant_list");
    expect(ps).not.toHaveProperty("layer_height");
    expect(ps["printer_settings_id"]).toBe(preset.slicer.printer);
    expect(ps["print_settings_id"]).toBe(preset.slicer.process);
    // Owner report 2026-10-05: without curr_bed_type Flash Studio opened the plate as the cold plate.
    expect(ps["curr_bed_type"]).toBe("Textured PEI Plate");
  });

  it("refuses a slot out of range and an unknown type; a fourth slot reads its preset row (M00-T07)", () => {
    const one = input(built);
    const obj = one.objects[0]!;
    const badSlot = { ...one, objects: [{ ...obj, bodies: [{ ...obj.bodies[0]!, slot: 4 }] }] };
    expect(codeOf(() => threeMfEntries(badSlot))).toBe("E_SCHEMA");
    expect(codeOf(() => threeMfEntries({ ...one, filaments: [...FILAMENTS, FILAMENTS[0]!] }))).toBeUndefined();
    expect(codeOf(() => threeMfEntries({ ...one, filaments: [{ ...FILAMENTS[0]!, type: "PETGX" }] , objects: [{ ...obj, bodies: [obj.bodies[0]!] }] }))).toBe("E_REF");
    expect(codeOf(() => threeMfEntries({ ...one, slicer: { ...one.slicer, app: "Cura-5" } }))).toBe("E_SCHEMA");
  });
});
