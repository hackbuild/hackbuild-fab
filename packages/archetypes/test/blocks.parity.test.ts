// M06-T09: blocks-stud (both presets) and blocks-wire regenerate the BLOCKS
// and BOSS originals' numbers and per-slot volumes. Expected values come
// from test/legacy/blocks.json, written by scripts/blocks-legacy.mjs from
// the original files; the test checks the record's source hashes against
// the originals on disk, so a stale record fails here.
//
// Volumes: each placement's declarations are meshed here without the D-054
// snap and the D-070 inset (kernel stages applied after the archetype),
// and compared with the original's prisms recorded with its own 1 um
// shrink held off (the record's `declared` variant): per slot, the union
// of that slot's pieces, within 1e-3 mm3, and its bounding box within
// 1e-6 mm.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { loadManifold } from "@hackbuild/mesh";
import { solidOf, type Bag } from "./mesh-decl.js";
import type { ApplyOut, ResistivityRow, ShapeDecl } from "@hackbuild/spec";
import {
  BLOCKS_HTML, BOSS_V1, STUD_PARAMS, WIRE_DEFAULTS, archetypes, shippedProfile, studApply, studColumn, studDerive, studPostR,
  wireApply, wireParams, wirePath, wireR, wireSpan, wireVerdict, type StudParams,
} from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

interface SlotVol { volume: number; bbox: { min: number[]; max: number[] } }
type Vols = Record<string, SlotVol> & { shared?: Record<string, number> };
interface StudCase { volumes: Vols; taps: { name: string; x: number; y: number; z: number }[]; errors: string[] }
interface WireCase { name: string; len: number; chord: number; span: { max: number; flat: number }; R: number; readout: [string, string][]; fits: { label: string; value: number; ok: boolean }[]; volumes: Vols }
const LEG = JSON.parse(readFileSync(new URL("legacy/blocks.json", import.meta.url), "utf8")) as {
  sources: Record<string, Record<string, string>>;
  blocks: { std: Record<string, number>; slots: { id: number; rho: number }[]; postR: Record<string, number>; stud: Record<string, { declared: StudCase; asBuilt: StudCase }>; wire: Record<string, { params: Record<string, unknown>; declared: WireCase; asBuilt: WireCase }> };
  boss: { std: Record<string, number>; slots: { id: number; rho: number }[]; stud: Record<string, { declared: StudCase }> };
};
const ORIG = originalPath("");
const SLOT = { cpla: "2", tpu95: "3", ctpu: "4" } as const;

let mf: ManifoldToplevel;
beforeAll(async () => { mf = await loadManifold(); });

const solid = (shape: ShapeDecl, own: Bag): Manifold => solidOf(mf, shape, own);

/** Per-slot union volume and bbox of an ApplyOut, slot keys as the original numbers them. */
function slotVolumes(out: ApplyOut): Record<string, SlotVol> {
  const own: Bag = [];
  try {
    const by = new Map<string, Manifold[]>();
    const add = (mat: string, m: Manifold): void => { const k = SLOT[mat as keyof typeof SLOT]; by.set(k, [...(by.get(k) ?? []), m]); };
    for (const b of out.bodies) add(b.material, solid(b.base, own));
    for (const f of out.features) {
      if (f.kind === "conductor" && "path" in f.region) add(f.material, solid({ route: "prism", outline: [f.region.path], z: [f.region.face.origin[2], f.region.face.origin[2] + f.t] }, own));
    }
    const res: Record<string, SlotVol> = {};
    for (const [k, list] of by) {
      const u = mf.Manifold.union(list); own.push(u);
      const b = u.boundingBox();
      res[k] = { volume: u.volume(), bbox: { min: [...b.min], max: [...b.max] } };
    }
    return res;
  } finally {
    for (const m of own) m.delete();
  }
}

function sameVolumes(got: Record<string, SlotVol>, want: Vols, what: string): void {
  const slots = Object.keys(want).filter((k) => k !== "shared").sort();
  expect(Object.keys(got).sort(), what).toEqual(slots);
  for (const k of slots) {
    const w = want[k] as SlotVol, g = got[k] as SlotVol;
    expect(Math.abs(g.volume - w.volume), `${what} slot ${k}: ${g.volume} against ${w.volume}`).toBeLessThanOrEqual(1e-3);
    for (const e of ["min", "max"] as const) for (let i = 0; i < 3; i++) {
      expect(Math.abs(g.bbox[e][i]! - w.bbox[e][i]!), `${what} slot ${k} bbox ${e}[${i}]: ${g.bbox[e][i]} against ${w.bbox[e][i]}`).toBeLessThanOrEqual(1e-6);
    }
  }
}

const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };
const face = (z: number) => ({ origin: [0, 0, z] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] });
/** An in-memory row at the original's slot rho (blocks.js line 57, boss.js line 32); never the profile data files. */
const slotRow = (material: string, ohmCm: number): ResistivityRow => ({ id: `${material}.blocks-slot`, direction: "bulk", ohmCm, form: "printed", brand: "BLOCKS slot", provenance: { tier: "inferred", method: "derived", date: "2026-10-09", source: "originals/blocks/files/src-extracted/blocks.js line 57" } });

describe("the record is the original's", () => {
  test("source hashes equal the originals on disk; the standards the port declares equal the originals' STD", () => {
    for (const [key, dir] of [["blocks", "blocks/files/src-extracted/"], ["boss", "boss/files/boss-src/src/"]] as const) {
      for (const [f, sha] of Object.entries(LEG.sources[key] ?? {})) {
        const p = f.endsWith(".html") ? `${ORIG}${key}/files/${f}` : `${ORIG}${dir}${f}`;
        expect(createHash("sha256").update(readFileSync(p)).digest("hex"), p).toBe(sha);
      }
    }
    const b = LEG.blocks.std, s = LEG.boss.std;
    for (const [mine, theirs] of [[BLOCKS_HTML, b], [BOSS_V1, s]] as const) {
      expect(mine.P).toBe(theirs["P"]); expect(mine.studD).toBe(theirs["studD"]); expect(mine.studH).toBe(theirs["studH"]);
      expect(mine.sockH).toBe(theirs["sockH"]); expect(mine.flangeH).toBe(theirs["flangeH"]); expect(mine.sockIDflex).toBe(theirs["sockID_flex"]);
      expect(mine.sockOD).toBe(theirs["sockOD"]); expect(mine.postD).toBe(theirs["postD"]); expect(mine.L1).toBe(theirs["L1"]);
      expect(mine.L2).toBe(theirs["L2"]); expect(mine.padTop).toBe(theirs["padTop"]); expect(mine.traceT).toBe(theirs["traceT"]); expect(mine.gapT).toBe(theirs["gapT"]);
    }
    expect(BLOCKS_HTML.flangeTop).toBe(b["flangeTop"]);
    expect(BLOCKS_HTML.padD).toBe(b["padD"]);
  });
});

describe("blocks-stud", () => {
  const p = shippedProfile();
  const cases: [string, StudParams["standard"], StudParams["peg"], number][] = [];
  for (const k of Object.keys(LEG.blocks.stud)) { const [peg, top] = k.split("@"); cases.push([`blocks-html ${k}`, "blocks-html", peg as StudParams["peg"], Number(top)]); }
  for (const k of Object.keys(LEG.boss.stud)) { const [peg, top] = k.split("@"); cases.push([`boss-v1 ${k}`, "boss-v1", peg as StudParams["peg"], Number(top)]); }

  test("the record holds every peg mode at brick and plate for blocks-html and three for boss-v1", () => {
    expect(cases.length).toBe(11);
  });

  for (const [what, standard, peg, top] of cases) {
    test(`${what}: cPLA and cTPU within 1e-3 mm3 and 1e-6 mm of the original; taps equal`, () => {
      const leg = standard === "blocks-html" ? LEG.blocks.stud[`${peg}@${top}`]!.declared : LEG.boss.stud[`${peg}@${top}`]!.declared;
      expect(leg.errors).toEqual([]);
      const params = STUD_PARAMS["~standard"].validate({ standard, peg, net: "S" }) as { value: StudParams };
      const out = studApply({ draft, face: face(top), profile: p, params: params.value }, "blocks-stud");
      sameVolumes(slotVolumes(out), leg.volumes, what);
      const c = studColumn(params.value, top);
      expect(c.taps.map((t) => [t.name, Number(t.at[0].toFixed(6)), Number(t.at[1].toFixed(6)), Number(t.z.toFixed(6))])).toEqual(leg.taps.map((t) => [t.name, t.x, t.y, t.z]));
    });
  }

  test("post resistance at the original's slot rho equals parts.js line 59 at brick and plate", () => {
    const rho = LEG.blocks.slots.find((s) => s.id === 2)!.rho;
    const row = p.resistivity("cpla-protopasta", "along", "printed");
    expect(row.ohmCm).toBe(rho);
    for (const top of [9.6, 3.2]) expect(studPostR(BLOCKS_HTML, top, p, row).ohm).toBeCloseTo(LEG.blocks.postR[String(top)]!, 6);
  });

  test("no default standard (D-087): a call without one is refused; boss-v1 has no flush pad", () => {
    const r = STUD_PARAMS["~standard"].validate({}) as { issues?: unknown[] };
    expect(r.issues?.length).toBeGreaterThan(0);
    expect(() => studColumn({ standard: "boss-v1", peg: "pad", net: "S" }, 9.6)).toThrow(/no flush pad/);
  });

  test("the registry entry is proven on its reference; derive through the registry gives the post resistance at the working row", () => {
    const e = archetypes.resolve("blocks-stud").def;
    expect(e.status).toBe("proven");
    expect(e.reference).toEqual(["conductors/blocks-stud"]);
    expect(e.derive({ standard: "blocks-html", peg: "both", base: 0, net: "S" }, p)).toEqual(studDerive({ standard: "blocks-html", peg: "both", base: 0, net: "S" }, p));
    const d = studDerive({ standard: "blocks-html", peg: "both", base: 0, net: "S" }, p);
    expect(d["padTop"]!.value).toBe(4.8);
    expect(d["R.post"]!.value).toBeCloseTo(studPostR(BLOCKS_HTML, 9.6, p).ohm, 9);
  });
});

describe("blocks-wire", () => {
  const p = shippedProfile();
  for (const [k, c] of Object.entries(LEG.blocks.wire)) {
    test(`${k}: path, spans, R at the original's slot rho, verdict and fit equal the original`, () => {
      const P = wireParams.parse({ ...c.params, core: c.params["core"] === 2 ? "cpla" : "ctpu" });
      const leg = c.declared;
      const s = wireSpan(P);
      expect(Number(s.len.toFixed(6))).toBe(leg.len);
      expect(Number(s.chord.toFixed(6))).toBe(leg.chord);
      expect(s.max).toBe(leg.span.max);
      expect(s.flat).toBe(leg.span.flat);
      const rho = LEG.blocks.slots.find((x) => x.id === (P.core === "cpla" ? 2 : 4))!.rho;
      const r = wireR(P, s.len, slotRow(P.core, rho));
      expect(Number(r.ohm.toFixed(6))).toBe(leg.R);
      expect(leg.readout.find((x) => x[0] === "verdict")![1]).toBe(wireVerdict(r.ohm));
      expect(leg.readout.find((x) => x[0] === "path length")![1]).toBe(`${s.len.toFixed(1)} mm, cap centre to cap centre`);
      expect(leg.fits).toEqual([{ label: "sheath wall each side", value: (P.sheathW - P.coreW) / 2, lo: 0.6, hi: 99, unit: "mm", ok: (P.sheathW - P.coreW) / 2 >= 0.6 }]);
      expect(wirePath(P).pts.length).toBe((c.declared as unknown as { pts: unknown[] }).pts.length);
    });
    test(`${k}: TPU, cTPU and cPLA within 1e-3 mm3 and 1e-6 mm of the original`, () => {
      const P = wireParams.parse({ ...c.params, core: c.params["core"] === 2 ? "cpla" : "ctpu" });
      const out = wireApply({ draft, face: face(0), profile: p, params: P }, "blocks-wire");
      sameVolumes(slotVolumes(out), c.declared.volumes, k);
    });
  }

  test("defaults: 80 mm cTPU core at the original's slot is 1.67 Mohm, digital only", () => {
    const r = wireR(WIRE_DEFAULTS, 80, slotRow("ctpu", 1500));
    expect((r.ohm / 1e6).toFixed(2)).toBe("1.67");
    expect(wireVerdict(r.ohm)).toBe("digital only (slow edges), no analog");
  });

  test("finding, recorded: the original's socket caps share 5.93 mm3 of TPU and cTPU per cap (computed)", () => {
    expect(LEG.blocks.wire["straight.ctpu"]!.declared.volumes.shared?.["3x4"]).toBeCloseTo(2 * 5.933242, 5);
  });
});
