// M05-T20 step 2: the writer sets the overrides a printed conductor needs
// from the body roles in Part IR. The flex-pair export is the writer input
// tools/corpus/3mf/dump-input.mjs takes from export3mf on preset "two" and
// checks entry by entry against it (tools/corpus/3mf/inputs/flex-pair-two.json),
// so the bytes here are that export's. model_settings is read back with its
// own scanner, never through src/overrides.ts.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BodyAdjacency, BodyRole } from "@hackbuild/spec";
import {
  DEFAULT_MATERIALS, DEFAULT_TEMPLATE, OVERRIDE_ROWS, build, configOf, readEntries, validateEntries, type Built, type ThreeMfInput,
} from "../src/index.js";

const ROOT = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");
const EPOCH = 315532800;

interface Body { name: string; slot: number; positions: number[]; triangles: number[]; body?: string; role?: BodyRole; widthMm?: number }
interface Input { title: string; chase: string; buildHash: string; machine: string; preset: string; filaments: ThreeMfInput["filaments"]; adjacency?: BodyAdjacency[]; objects: { name: string; position: [number, number, number]; bodies: Body[] }[] }
const machines = (JSON.parse(read("packages/profile/data/machines.json")) as { machines: { id: string; presets: { id: string; nozzle: number; slicer: ThreeMfInput["slicer"] }[] }[] }).machines;

function written(inp: Input, objects?: Input["objects"], adjacency?: BodyAdjacency[] | null): Built {
  const preset = machines.find((m) => m.id === inp.machine)!.presets.find((p) => p.id === inp.preset)!;
  const adj = adjacency === null ? undefined : adjacency ?? inp.adjacency;
  const out = build(configOf({
    title: inp.title, chase: inp.chase, buildHash: inp.buildHash, sourceDateEpoch: EPOCH,
    slicer: preset.slicer, nozzleMm: preset.nozzle, template: DEFAULT_TEMPLATE, materials: DEFAULT_MATERIALS, filaments: inp.filaments,
    ...(adj === undefined ? {} : { adjacency: adj }),
    objects: (objects ?? inp.objects).map((o) => ({
      name: o.name, position: o.position,
      bodies: o.bodies.map((b) => ({
        name: b.name, slot: b.slot, mesh: { positions: Float64Array.from(b.positions), triangles: Uint32Array.from(b.triangles) },
        ...(b.body === undefined ? {} : { body: b.body }), ...(b.role === undefined ? {} : { role: b.role }),
        ...(b.widthMm === undefined ? {} : { widthMm: b.widthMm }),
      })),
    })),
  }));
  if (!out.ok) throw new Error(JSON.stringify(out.completeness));
  return out;
}

/** Object and part metadata of model_settings.config by name, read with a scanner of its own. */
function settingsOf(xml: string): Map<string, { meta: Record<string, string>; parts: Map<string, Record<string, string>> }> {
  const out = new Map<string, { meta: Record<string, string>; parts: Map<string, Record<string, string>> }>();
  const kv = (s: string): Record<string, string> => Object.fromEntries([...s.matchAll(/<metadata key="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1]!, m[2]!]));
  for (const o of xml.matchAll(/<object id="\d+">([\s\S]*?)<\/object>/g)) {
    const parts = new Map<string, Record<string, string>>();
    for (const p of o[1]!.matchAll(/<part [^>]*>([\s\S]*?)<\/part>/g)) {
      const m = kv(p[1]!);
      parts.set(m["name"]!, m);
    }
    const meta = kv(o[1]!.replace(/<part [\s\S]*?<\/part>/g, ""));
    out.set(meta["name"]!, { meta, parts });
  }
  return out;
}

const flex = JSON.parse(read("tools/corpus/3mf/inputs/flex-pair-two.json")) as Input;
const isConductor = (b: Body): boolean => b.role === "conductor" || b.role === "flex-conductor";

describe("override table (M05-T20 step 2)", () => {
  it("names the check that wants each written row; the TPU row is recorded and not written", () => {
    expect(OVERRIDE_ROWS.map((r) => [r.scope, r.key, r.value, r.wantedBy, r.written])).toEqual([
      ["part", "sparse_infill_density", "100%", "CHK-NET-05", true],
      ["object", "interlocking_beam", "0", "CHK-3MF-08", true],
      ["object", "interlocking_beam", "1", null, false],
      ["object", "detect_thin_wall", "1", "CHK-KEY-04", true],
    ]);
  });
});

describe("the flex-pair export (preset two)", () => {
  const out = written(flex);
  const ms = settingsOf(out.entries["Metadata/model_settings.config"]!);
  const conductors = flex.objects[0]!.bodies.filter(isConductor);

  it("holds conductor parts of both roles: the GND bus and four per key, and one cap per key", () => {
    const keys = flex.objects[0]!.bodies.filter((b) => /^cap\d$/.test(b.body ?? "")).length;
    expect(keys).toBe(2);
    expect(conductors.filter((b) => b.role === "conductor")).toHaveLength(1 + 4 * keys);
    expect(conductors.filter((b) => b.role === "flex-conductor")).toHaveLength(keys);
  });

  it("sets sparse_infill_density 100% on each conductor part and on no other part", () => {
    const obj = ms.get("flex-pair")!;
    for (const b of flex.objects[0]!.bodies) {
      expect(obj.parts.get(b.name)?.["sparse_infill_density"], b.name).toBe(isConductor(b) ? "100%" : undefined);
    }
  });

  it("sets interlocking_beam 0 on the object that holds them", () => {
    expect(ms.get("flex-pair")!.meta["interlocking_beam"]).toBe("0");
  });

  it("writes no process key into project_settings.config, and CHK-3MF-03 and CHK-3MF-08 pass", () => {
    const ps = JSON.parse(out.entries["Metadata/project_settings.config"]!) as Record<string, unknown>;
    expect(Object.keys(ps).filter((k) => k.startsWith("interlocking") || k === "sparse_infill_density")).toEqual([]);
    const r = validateEntries(out.entries, { mode: "export", interlocking: { beamWidthMm: 0.8, depthCells: 2 } });
    expect(r.results.filter((x) => x.id === "CHK-3MF-03" || x.id === "CHK-3MF-08").map((x) => [x.id, x.verdict])).toEqual([["CHK-3MF-03", "pass"], ["CHK-3MF-08", "pass"]]);
  });

  it("records every conductor body in Metadata/hackbuild_chase.json with its declared width", () => {
    const rec = (JSON.parse(out.entries["Metadata/hackbuild_chase.json"]!) as { conductors: { object: string; conductors: { body: string; widthMm?: number }[] }[] }).conductors;
    expect(rec.map((o) => o.object)).toEqual(["flex-pair"]);
    expect(rec[0]!.conductors.map((c) => [c.body, c.widthMm])).toEqual(conductors.map((b) => [b.body, b.widthMm]));
  });

  it("lists both settings on the print card for the person to confirm", () => {
    const card = out.card();
    expect(card).toContain("object flex-pair: interlocking_beam 0");
    for (const b of conductors) expect(card).toContain(`part ${b.name} of flex-pair: sparse_infill_density 100%`);
  });
});

describe("objects split as a slicer could split them", () => {
  const all = flex.objects[0]!.bodies;
  const pick = (ids: readonly string[]): Body[] => all.filter((b) => ids.includes(b.body!));
  const objects: Input["objects"] = [
    { name: "pad", position: flex.objects[0]!.position, bodies: all.filter((b) => b.body === "pad" || b.role === "conductor") },
    { name: "caps", position: flex.objects[0]!.position, bodies: pick(["cap1", "cap2"]) },
    { name: "cones", position: flex.objects[0]!.position, bodies: pick(["cone1", "top1", "cone2", "top2"]) },
  ];

  it("an object sharing a face with a conductor in another object gets no beams", () => {
    const ms = settingsOf(written(flex, objects).entries["Metadata/model_settings.config"]!);
    expect(["pad", "caps", "cones"].map((n) => ms.get(n)!.meta["interlocking_beam"])).toEqual(["0", "0", "0"]);
  });

  it("without the adjacency rows the cones object, which holds no conductor, keeps the slicer default", () => {
    const out = written(flex, objects, null);
    const ms = settingsOf(out.entries["Metadata/model_settings.config"]!);
    expect(["pad", "caps", "cones"].map((n) => ms.get(n)!.meta["interlocking_beam"])).toEqual(["0", "0", undefined]);
  });
});

describe("a package with no conductor part", () => {
  it("keeps the bytes the writer wrote before the overrides: the tetra export equals the committed CHK-3MF-01 pass fixture entry by entry", async () => {
    const tetra = JSON.parse(read("tools/corpus/3mf/inputs/tetra-2part.json")) as Input;
    // packages/checks/test/fixtures/make-3mf.mjs wrote the fixture on the first ffc5p preset at this epoch
    const out = written({ ...tetra, machine: "ffc5p", preset: machines.find((m) => m.id === "ffc5p")!.presets[0]!.id });
    const committed = await readEntries(new Uint8Array(readFileSync(new URL("packages/checks/test/fixtures/CHK-3MF-01/pass.3mf", ROOT))));
    const text = (v: string | Uint8Array): string => (typeof v === "string" ? v : new TextDecoder().decode(v));
    expect(Object.keys(committed).sort()).toEqual(Object.keys(out.entries).sort());
    for (const [k, v] of Object.entries(out.entries)) expect(text(committed[k]!), k).toBe(v);
    expect(out.entries["Metadata/hackbuild_chase.json"]).toBe(JSON.stringify({ buildHash: tetra.buildHash, chase: tetra.chase }));
  });
});
