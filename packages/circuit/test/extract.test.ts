// M05-T04 net extraction and per-direction resistance. Goldens come from
// test/fixtures/extract/goldens.json (the card table); the BOSS rows also
// run against BOSS itself: boss.js and parts.js from
// designs/blocks/legacy/boss-src, sha256 checked against the pins in
// designs/blocks/legacy/README.md, loaded in a vm so their SLOTS rho, barR
// and fmtR are the legacy code, not a copy. Every mesh case is built
// through packages/mesh runStages (prism route, stage 6 insets included)
// and extracted from the built bodies.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, test } from "vitest";
import type {
  ConductorFeature, Feature, Material, MeshRef, PartDraft, PortFeature, ResistivityDirection, Ring, Tier,
} from "@hackbuild/spec";
import { GRID } from "@hackbuild/geom";
import { assemblePart, runStages, type MeshData } from "@hackbuild/mesh";
import { createProfileLookup, loadProfile, sectionResistance } from "@hackbuild/profile";
import { extractNets, type Extraction } from "../src/index";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const LEGACY = `${ROOT}designs/blocks/legacy/`;

interface Golden {
  readonly id: string;
  readonly rhoOhmCm: number;
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly tMm: number;
  readonly r: number;
  readonly decimals: number;
  readonly row: { readonly legacySlot?: number; readonly profile?: string; readonly material?: string; readonly direction?: ResistivityDirection };
  readonly role: "conductor" | "flex-conductor" | null;
  readonly bossReadout?: string;
}
const GOLDENS = (JSON.parse(readFileSync(new URL("./fixtures/extract/goldens.json", import.meta.url), "utf8")) as { cases: Golden[] }).cases;

// ---- BOSS, the legacy code itself ----

interface BossSlot { readonly id: number; readonly name: string; readonly rho: number }
interface Boss {
  readonly BOSS: { readonly SLOTS: readonly BossSlot[]; readonly barR: (rho: number, len: number, area: number) => number };
  readonly PARTS: { readonly fmtR: (r: number) => string };
}

function pinned(file: string): string {
  const m = new RegExp(`^([0-9a-f]{64})  boss-src/${file.replace(".", "\\.")}$`, "m").exec(readFileSync(`${LEGACY}README.md`, "utf8"));
  if (m === null) throw new Error(`no sha256 pin for ${file} in designs/blocks/legacy/README.md`);
  return m[1]!;
}

function loadBoss(): Boss {
  const ctx: Record<string, unknown> = { K: {} };
  ctx["globalThis"] = ctx;
  vm.createContext(ctx);
  for (const f of ["src/boss.js", "src/parts.js"]) {
    const text = readFileSync(`${LEGACY}boss-src/${f}`);
    expect(createHash("sha256").update(text).digest("hex"), f).toBe(pinned(f));
    vm.runInContext(text.toString("utf8"), ctx, { filename: f });
  }
  return ctx as unknown as Boss;
}
const BOSS = loadBoss();

/** A material carrying one legacy SLOTS figure as an along row, inferred: BOSS v1 values while D-087 is open. */
function legacyMaterial(slot: BossSlot): Material {
  const id = `boss-slot${slot.id}`;
  const provenance = {
    tier: "inferred" as const, method: "derived" as const, date: "2026-09-13",
    source: `designs/blocks/legacy/boss-src/src/boss.js lines 28 to 33, SLOTS slot ${slot.id} (${slot.name}), rho ${slot.rho} ohm cm`,
  };
  return {
    id, name: `BOSS legacy ${slot.name}`, processes: ["fdm"], creep: "unknown", strain: [], provenance,
    resistivity: [{ id: `${id}.legacy.along`, direction: "along", ohmCm: slot.rho, form: "printed", brand: "BOSS legacy", provenance }],
  };
}

const TABLES = loadProfile();
const LEGACY_MATS = BOSS.BOSS.SLOTS.filter((s) => s.rho > 0).map(legacyMaterial);
const lookup = () => createProfileLookup({ ...TABLES, materials: [...TABLES.materials, ...LEGACY_MATS] });

// ---- built fixtures ----

const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const FACE = (z: number) => ({ origin: [0, 0, z] as const, normal: [0, 0, 1] as const, u: [1, 0, 0] as const });
const Z0 = 0.48;

interface Trace {
  readonly id: string;
  readonly net: string;
  readonly material: string;
  readonly role: "conductor" | "flex-conductor";
  readonly slot: number;
  readonly x: readonly [number, number];
  readonly w: number;
  readonly t: number;
}

/** A PETG plate spanning the traces' x range, each trace a prism body named after its conductor feature. */
function draftOf(traces: readonly Trace[], ports: readonly PortFeature[]): PartDraft {
  const x0 = Math.min(...traces.map((t) => t.x[0]));
  const x1 = Math.max(...traces.map((t) => t.x[1]));
  const half = Math.max(...traces.map((t) => t.w / 2)) + 2;
  const top = Z0 + Math.max(...traces.map((t) => t.t)) + 0.48;
  const features: Feature[] = [
    ...traces.map((t): ConductorFeature => ({
      kind: "conductor", id: t.id, body: "plate", material: t.material, net: t.net, width: t.w, t: t.t,
      region: { centreline: [[t.x[0], 0], [t.x[1], 0]], face: FACE(Z0) },
    })),
    ...ports,
  ];
  return {
    id: "fixture", name: "fixture", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: true, pose: "print" },
    bodies: [
      { id: "plate", role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [rect(x0, -half, x1, half)], z: [0, top] } },
      ...traces.map((t) => ({
        id: t.id, role: t.role, slot: t.slot, material: t.material,
        base: { route: "prism" as const, outline: [rect(t.x[0], -t.w / 2, t.x[1], t.w / 2)], z: [Z0, Z0 + t.t] as const },
      })),
    ],
    features,
  };
}

const port = (id: string, net: string, type: PortFeature["type"] = "signal"): PortFeature =>
  ({ kind: "port", id, body: "plate", net, type, interface: "digital" });

async function extract(draft: PartDraft): Promise<Extraction> {
  const profile = lookup();
  const staged = await runStages({ draft, profile });
  const built = assemblePart(draft, staged);
  const byHash = new Map<string, MeshData>(staged.bodies.map((b, i) => [built.part.bodies[i]!.mesh.hash, b.mesh]));
  return extractNets({
    part: built.part, profile, itemTransform: built.itemTransform,
    mesh: (ref: MeshRef) => byHash.get(ref.hash),
  });
}

const formula = (g: Golden): number => (g.rhoOhmCm * 10 * g.lengthMm) / (g.widthMm * g.tMm);
/** True when v rounds half up to golden at d places: within half a unit of the last place, plus float slack. */
const roundsTo = (v: number, golden: number, d: number): boolean => Math.abs(v - golden) <= 0.5 * 10 ** -d + 1e-9 * Math.abs(v);

// ---- the card table ----

describe("extraction and resistance goldens (M05-T04 acceptance table)", () => {
  for (const g of GOLDENS.filter((x) => x.role !== null)) {
    test(`${g.id}: built, extracted, R ${g.r} ohm`, async () => {
      const slot = g.row.legacySlot;
      const material = slot !== undefined ? `boss-slot${slot}` : g.row.material!;
      const ex = await extract(draftOf(
        [{ id: "conductor.core", net: "W", material, role: g.role!, slot: slot ?? 2, x: [0, g.lengthMm], w: g.widthMm, t: g.tMm }],
        [port("port.a", "W"), port("port.b", "W", "gnd")],
      ));
      expect(ex.pieces).toHaveLength(1);
      expect(ex.splits).toEqual([]);
      expect(ex.shorts).toEqual([]);
      expect(ex.taps.map((t) => [t.terminal, t.piece])).toEqual([["port.a", 0], ["port.b", 0]]);
      expect(ex.warnings).toEqual([]);
      const net = ex.nets[0]!;
      expect(ex.nets.map((n) => n.id)).toEqual(["W"]);
      expect(net.conductors).toEqual(["conductor.core"]);
      expect(net.bodies).toEqual(["conductor.core"]);
      expect(net.terminals).toEqual(["port.a", "port.b"]);
      expect(net.resistance[0]!.terminals).toEqual(["port.a", "port.b"]);
      const seg = net.resistance[0]!.preview.segments;
      expect(seg.map((s) => [s.direction, s.ohmCm, s.lengthMm])).toEqual([["along", g.rhoOhmCm, g.lengthMm]]);

      const r = net.bulkOhm;
      expect(roundsTo(r, g.r, g.decimals), `${r} against ${g.r}`).toBe(true);
      expect(Math.abs(r - formula(g)) / formula(g)).toBeLessThan(1e-3);
      expect(net.totalOhm).toEqual([r, r]);

      // The built body is the declared trace within the stage 6 inset and the grid snap: each of L, w
      // and t may move by two grid steps (computed bound), so the mesh behind the net is the declared one.
      const vol = ex.components[0]!.volumeMm3;
      const bound = 2 * GRID * (1 / g.lengthMm + 1 / g.widthMm + 1 / g.tMm);
      expect(Math.abs(vol / (g.lengthMm * g.widthMm * g.tMm) - 1)).toBeLessThan(bound);

      const tier: Tier = slot !== undefined ? "inferred" : TABLES.materials.find((m) => m.id === material)!.resistivity.find((x) => x.id === g.row.profile)!.provenance.tier;
      expect(net.tier).toBe(tier);
      expect(net.qualifier).toBe("computed");

      if (slot !== undefined) {
        const legacy = BOSS.BOSS.SLOTS.find((s) => s.id === slot)!;
        expect(legacy.rho).toBe(g.rhoOhmCm);
        const bossR = BOSS.BOSS.barR(legacy.rho, g.lengthMm, g.widthMm * g.tMm);
        expect(Math.abs(r - bossR) / bossR).toBeLessThan(1e-3);
        expect(BOSS.PARTS.fmtR(r)).toBe(g.bossReadout);
      }
    });
  }

  test("capricate-across: the across row through the profile section resistance", () => {
    const g = GOLDENS.find((x) => x.id === "capricate-across")!;
    const profile = lookup();
    const row = profile.resistivity(g.row.material!, g.row.direction!, "printed");
    expect(row.id).toBe(g.row.profile);
    expect(row.ohmCm).toBe(g.rhoOhmCm);
    const r = sectionResistance(row, g.lengthMm, g.widthMm * g.tMm);
    expect(typeof r.ohm).toBe("number");
    expect(roundsTo(r.ohm as number, g.r, g.decimals), `${String(r.ohm)} against ${g.r}`).toBe(true);
    expect(r.tier).toBe("community");
  });
});

// ---- touch, split and short ----

describe("two conductor bodies on one net", () => {
  const pair = (gap: number, netB = "N"): PartDraft => draftOf([
    { id: "conductor.a", net: "N", material: "cpla", role: "conductor", slot: 2, x: [0, 10], w: 2, t: 0.72 },
    { id: "conductor.b", net: netB, material: "cpla", role: "conductor", slot: 2, x: [10 + gap, 20], w: 2, t: 0.72 },
  ], [port("port.n", "N")]);

  test("a 0.0 mm gap extracts one piece and one read path through both", async () => {
    const ex = await extract(pair(0));
    expect(ex.pieces.map((p) => p.components)).toEqual([["conductor.a#0", "conductor.b#0"]]);
    expect(ex.touching).toEqual([["conductor.a", "conductor.b"]]);
    expect(ex.splits).toEqual([]);
    expect(ex.touch.tier).toBe("inferred");
    const net = ex.nets[0]!;
    expect(net.resistance[0]!.preview.segments).toHaveLength(2);
    const legOhm = (500 * 10 * 10) / (2 * 0.72);
    expect(net.bulkOhm).toBeCloseTo(2 * legOhm, 6);
  });

  test("a 0.01 mm gap extracts two pieces: a split naming both, no read path", async () => {
    const ex = await extract(pair(0.01));
    expect(ex.pieces.map((p) => p.components)).toEqual([["conductor.a#0"], ["conductor.b#0"]]);
    expect(ex.splits).toEqual([{ net: "N", pieces: [0, 1] }]);
    expect(ex.warnings.map((w) => w.code)).toEqual(["NET_SPLIT", "NO_READ_PATH"]);
    expect(ex.nets[0]!.resistance).toEqual([]);
    expect(ex.nets[0]!.qualifier).toBe("unknown");
  });

  test("a net's tier is the lowest of its legs, whichever leg comes first (M05 audit)", async () => {
    const ex = await extract(draftOf([
      { id: "conductor.a", net: "N", material: "cpla-protopasta", role: "conductor", slot: 3, x: [0, 10], w: 2, t: 0.72 },
      { id: "conductor.b", net: "N", material: "cpla", role: "conductor", slot: 2, x: [10, 20], w: 2, t: 0.72 },
    ], [port("port.n", "N")]));
    const net = ex.nets[0]!;
    expect(net.resistance[0]!.preview.segments).toHaveLength(2);
    expect(TABLES.materials.find((m) => m.id === "cpla-protopasta")!.resistivity.find((r) => r.direction === "along")!.provenance.tier).toBe("vendor");
    expect(net.tier).toBe("inferred");
    // The printed interface between the two materials has no ContactRow, so the net stays unknown.
    expect(net.unpricedContacts).toEqual(["conductor.a|conductor.b"]);
    expect(net.qualifier).toBe("unknown");
  });

  test("two declared nets that touch extract as one piece: a short naming both", async () => {
    const ex = await extract(pair(0, "M"));
    expect(ex.shorts).toEqual([{ nets: ["N", "M"], piece: 0 }]);
    expect(ex.warnings.map((w) => w.code)).toContain("NET_SHORT");
  });
});

// ---- rows (steps 4 and 5) ----

describe("resistivity rows (D-081, C-09)", () => {
  test("cabs carries the three Capricate rows at community, with print conditions", () => {
    const cabs = TABLES.materials.find((m) => m.id === "cabs")!;
    expect(cabs.resistivity.map((r) => [r.id, r.direction, r.ohmCm, r.provenance.tier, r.provenance.method])).toEqual([
      ["cabs.capricate.along", "along", 0.4382, "community", "coupon"],
      ["cabs.capricate.across", "across", 0.8171, "community", "coupon"],
      ["cabs.capricate.through", "through", 0.9976, "community", "coupon"],
    ]);
    for (const r of cabs.resistivity) expect(r.provenance.conditions).toMatchObject({ temperatureC: 230, layer: 0.2, direction: r.direction });
  });

  test("a printed read never returns a raw-filament row, and a Nowka figure only on a Protopasta material", () => {
    const profile = lookup();
    for (const m of TABLES.materials) {
      for (const d of ["along", "across", "through", "bulk"] as const) {
        let row;
        try {
          row = profile.resistivity(m.id, d, "printed");
        } catch {
          continue;
        }
        expect(row.form, `${m.id} ${d}`).toBe("printed");
        if (/nowka/i.test(`${row.id} ${row.provenance.source}`)) expect(m.brand, `${m.id} ${d}`).toBe("Protopasta");
      }
    }
    expect(profile.resistivity("cpla", "along", "printed").id).toBe("cpla.pip.along");
  });
});
