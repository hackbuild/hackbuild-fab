// M08-T05 acceptance. Expected values are the card's tables (steps 2 to 4),
// typed here; every bench value a row lists is also checked against the
// original file and line it cites, so a row cannot carry a number its
// source does not hold.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { AnatomicalAxis, PartRow, ShaftOut } from "@hackbuild/spec";
import { localSource } from "../../../tools/test-support/originals-root.js";
import { KICAD_RESOLVERS, actuatorRow, catalogFind, createCatalogLookup, loadCatalog, loadRow, readActuator, shaftOut } from "../src/index";

const enc = new TextEncoder();
function filesUnder(dir: string, prefix = ""): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  const walk = (d: string): void => {
    for (const n of readdirSync(d)) {
      const p = path.join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else out.set(prefix + path.relative(dir, p).split(path.sep).join("/"), new Uint8Array(readFileSync(p)));
    }
  };
  walk(dir);
  return out;
}
const DATA = fileURLToPath(new URL("../data/", import.meta.url));
const FIX = fileURLToPath(new URL("./fixtures/actuators/", import.meta.url));
const catalog = loadCatalog(filesUnder(DATA), { resolvers: KICAD_RESOLVERS });
const pawl = [150, 100, 50].map((r) => loadRow(`actuators/15by-gm12-r${r}.json`, filesUnder(FIX, "actuators/")));
const washer = (JSON.parse(readFileSync(path.join(FIX, "washer-servos.json"), "utf8")) as { rows: { id: string }[] }).rows
  .map((r) => loadRow(`actuators/${r.id}.json`, new Map([[`actuators/${r.id}.json`, enc.encode(JSON.stringify(r))]])));
const ROWS: readonly PartRow[] = [...catalog.rows.values(), ...pawl, ...washer];

// ---- the cited lines hold the numbers ----
/** The archive prefix a cited originals/ or benches/ path sits under (tools/publish-paths.mjs). */
const ROOTS: Record<string, string> = { originals: "fab-knowledge:", benches: "fab-work-directory:" };
const cache = new Map<string, readonly string[]>();
const CITE = /\b((?:originals|benches)\/[^\s(,;]+?\.[a-z]+)\s+lines?\s+(\d+)(?:\s+to\s+(\d+))?/g;
/**
 * Every number on every file line the source cites, or null when the
 * source leads with something other than a file line (a vendor page read
 * directly) or names a computation.
 */
function citedNumbers(source: string): number[] | null {
  if (/computed/.test(source)) return null;
  const lead = source.split(";")[0]!;
  if (!new RegExp(CITE.source).test(lead)) return null;
  const nums: number[] = [];
  for (const m of source.matchAll(CITE)) {
    const [, rel, a, b] = m as unknown as [string, string, string, string | undefined];
    const file = localSource(ROOTS[rel.split("/")[0]!]! + rel);
    if (!cache.has(file)) cache.set(file, readFileSync(file, "utf8").split("\n"));
    const lines = cache.get(file)!.slice(Number(a) - 1, Number(b ?? a));
    nums.push(...(lines.join(" ").match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)?.map(Number) ?? []));
  }
  return nums;
}
const numbersOf = (v: unknown): number[] => (typeof v === "number" ? [v] : Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : []);
const holds = (nums: readonly number[], v: number) => nums.some((n) => Math.abs(n - v) < 1e-9);

describe("every field carries provenance and every cited line holds its number", () => {
  test("rows loaded: data actuators, displays, modules, and the PAWL and WASHER fixtures", () => {
    expect(ROWS.filter((r) => r.kind === "actuator").map((r) => r.id).sort()).toEqual([
      "15by-gm12-r100", "15by-gm12-r150", "15by-gm12-r50", "28byj48", "gh-s37d", "mg90s", "mg996r", "n20-6v-100rpm", "sg90",
      "washer-digital", "washer-micro9g", "washer-micro9gm", "washer-standard",
    ]);
  });

  for (const row of ROWS) {
    test(`${row.id}: provenance on every field; conflicts and single sources match their lines`, () => {
      for (const [name, f] of Object.entries(row.fields)) {
        expect(f.provenance.source, `${row.id}.${name}`).not.toBe("");
        expect(["verified", "measured", "vendor", "community", "inferred"]).toContain(f.provenance.tier);
        for (const cf of f.conflicts ?? []) {
          const nums = citedNumbers(cf.source);
          if (nums === null) continue;
          for (const v of numbersOf(cf.value)) expect(holds(nums, v), `${row.id}.${name} ${v} at ${cf.source}`).toBe(true);
        }
        if (f.conflicts === undefined) {
          const nums = citedNumbers(f.provenance.source);
          if (nums !== null) for (const v of numbersOf(f.value)) expect(holds(nums, v), `${row.id}.${name} ${v} at ${f.provenance.source}`).toBe(true);
        }
      }
    });
  }
});

describe("SG90 (D-104, step 4)", () => {
  test("a shaftOffset read reports tier inferred and the four bench values the card names", () => {
    const look = createCatalogLookup(catalog);
    const f = look.field<number>("sg90", "dims.shaftOffset");
    expect(f.provenance.tier).toBe("inferred");
    const r = readActuator<number>(actuatorRow(catalog, "sg90"), "dims.shaftOffset");
    const by = (file: string) => r.benches.filter((b) => b.source.includes(file)).map((b) => b.value);
    expect(by("davit/files/src/lib.py")).toEqual([5.4]);
    expect(by("jib/files/jib.html")).toEqual([5.3]);
    expect(by("pintle/files/src/pintle_parts.py")).toEqual([5.9]);
    expect(by("washer/files/rig/laser-rig.html")).toEqual([5.9]);
    expect(look.reads()).toEqual([{ catalogId: "sg90", field: "dims.shaftOffset", provenance: f.provenance }]);
  });

  test("width 12.4 against 12.2, tab span 32.4 against 32.2, hole pitch 28.0 against 27.8 (R70)", () => {
    const row = actuatorRow(catalog, "sg90");
    const vals = (k: string) => readActuator(row, k).benches.map((b) => b.value);
    expect(vals("dims.width")).toEqual(expect.arrayContaining([12.4, 12.2]));
    expect(vals("dims.tabSpan")).toEqual(expect.arrayContaining([32.4, 32.2]));
    expect(vals("dims.holePitch")).toEqual(expect.arrayContaining([28.0, 27.8]));
  });

  test("catalog.find sg90: the hit tier is inferred, the weakest geometry field", () => {
    expect(catalogFind(catalog, "sg90").map((h) => [h.id, h.tier])).toEqual([["sg90", "inferred"]]);
  });
});

describe("PAWL 15BY-GM12 fixtures (step 2)", () => {
  test("stall 0.186, 0.132, 0.069 N m; slew 120, 180, 360 deg/s; inertia 1.6e-8 x ratio^2 kg m2", () => {
    expect(pawl.map((r) => [r.fields["dyn.ratio"]?.value, r.fields["dyn.stallTorque"]?.value, r.fields["dyn.slew"]?.value])).toEqual([[150, 0.186, 120], [100, 0.132, 180], [50, 0.069, 360]]);
    for (const r of pawl) {
      const n = r.fields["dyn.ratio"]!.value as number;
      expect(r.fields["dyn.reflectedInertia"]?.value).toBeCloseTo(1.6e-8 * n * n, 15);
      expect(r.fields["dyn.reflectedInertia"]?.unit).toBe("kg m2");
      expect(r.tier).toBe("inferred");
    }
  });

  test("envelope: gearbox 12 x 14 x 13, worm D9.5 x 10, can D15 x 11, boss D6 x 2, D shaft 3 x 10 flat 2.5; shaft out along +x", () => {
    const r = pawl[0]!;
    expect(["dims.gearbox", "dims.worm", "dims.can", "dims.boss", "dims.shaft"].map((k) => r.fields[k]?.value)).toEqual([[12, 14, 13], [9.5, 10], [15, 11], [6, 2], [3, 2.5, 10]]);
    expect(shaftOut(actuatorRowOf(r))).toEqual({ at: [8, 0, 0], dir: [1, 0, 0] });
  });
});

describe("WASHER servo presets (step 3)", () => {
  test("the card's table", () => {
    const keys = ["dyn.slew", "dyn.accel", "dyn.deadband", "dyn.frameHz", "dyn.lash", "dyn.band"];
    expect(washer.map((r) => [r.id, ...keys.map((k) => r.fields[k]?.value)])).toEqual([
      ["washer-micro9g", 240, 1800, 8, 50, 0.55, 6.0],
      ["washer-micro9gm", 300, 2600, 6, 50, 0.30, 5.0],
      ["washer-standard", 420, 5000, 4, 50, 0.18, 3.5],
      ["washer-digital", 700, 9000, 2, 200, 0.08, 1.6],
    ]);
  });
});

describe("28BYJ-48 and the other rows", () => {
  test("half steps per revolution 4075.7728 read from the profile constant, its provenance carried", () => {
    const f = catalog.rows.get("28byj48")!.fields["dyn.stepsPerRev"]!;
    expect(f.value).toBe(4075.7728);
    expect(f.provenance).toMatchObject({ tier: "vendor", method: "derived" });
    expect(f.use).toBe("check");
  });

  test("MHS40 active area is the vendor page's 83.52 x 55.68; the LOCKET 84.60 x 56.40 is named as unsupported", () => {
    const f = catalog.rows.get("mhs40")!.fields["dims.active"]!;
    expect(f.value).toEqual([83.52, 55.68]);
    expect(f.provenance.source).toContain("84.60 x 56.40");
  });

  test("tiers: displays with a read vendor page are vendor where the stack is not gated; RP2040-Zero and every servo inferred", () => {
    const t = (id: string) => catalog.rows.get(id)?.tier;
    expect([t("mpi3501"), t("mhs40"), t("rp2040-zero"), t("sg90"), t("mg996r"), t("gh-s37d"), t("28byj48")]).toEqual(["inferred", "inferred", "inferred", "inferred", "inferred", "inferred", "inferred"]);
    expect(catalog.rows.get("mpi3501")!.fields["dims.pcb"]!.provenance.tier).toBe("vendor");
    expect(catalog.rows.get("waveshare-5in-round-hdmi")!.tier).toBe("inferred");
    expect(catalog.rows.get("waveshare-5in-round-hdmi")!.fields["mountHoles"]!.provenance.tier).toBe("vendor");
  });
});

function actuatorRowOf(r: PartRow) {
  return actuatorRow({ rows: new Map([[r.id, r]]) }, r.id);
}

describe("mout and the anatomical axis are different types (D-104)", () => {
  test("a design axis cannot be stored as a shaft direction", () => {
    const axis = [1, 0, 0] as unknown as AnatomicalAxis;
    const out: ShaftOut = shaftOut(actuatorRow(catalog, "sg90"));
    // @ts-expect-error an AnatomicalAxis is not a ShaftDir
    const wrong: ShaftOut = { at: out.at, dir: axis };
    expect(wrong.dir).toBe(axis);
  });
});
