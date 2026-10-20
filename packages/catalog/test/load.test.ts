// M08-T03 steps 2 and 7: per-field provenance, the row tier and the mesh
// winding refusal. The stand-in STL is the CRESSET file (sha256 bcb1a5f1...,
// card table); -6506 mm3 is the card's computed figure (benches-cases.md
// line 515), typed here and never read from the loader.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, sha256Hex } from "@hackbuild/spec";
import { KICAD_RESOLVERS, createCatalogLookup, isRowPath, loadCatalog, loadRow } from "../src/index";

const enc = new TextEncoder();
const prov = (tier: string, source = "test") => ({ tier, method: tier === "vendor" ? "datasheet" : "derived", date: "2026-10-09", source });
const field = (value: unknown, tier: string, unit = "mm") => ({ value, unit, provenance: prov(tier) });
const files = (rows: Record<string, unknown>, extra: Record<string, Uint8Array> = {}) =>
  new Map<string, Uint8Array>([...Object.entries(rows).map(([p, r]) => [p, enc.encode(JSON.stringify(r))] as const), ...Object.entries(extra)]);

function errorOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a command error");
}

describe("row tier is the weakest geometry or connectivity field", () => {
  test("an inferred check field leaves a vendor row vendor; an inferred dims field makes it inferred", () => {
    const f = files({
      "modules/a.json": { id: "a", name: "A", kind: "module", fields: { pads: field([{ pad: "1", name: "X", shape: "circle", x: 0, y: 0, w: 1, h: 1, drill: 0.5 }], "vendor"), strapping: field([{ pin: "GPIO2", default: "floating", spiBoot: "high" }], "inferred", "none") } },
      "actuators/b.json": { id: "b", name: "B", kind: "actuator", drive: "servo", fields: { mout: field({ at: [0, 0, 0], dir: [0, 0, 1] }, "vendor"), "dims.shaftOffset": field(5.9, "inferred"), "dyn.slew": field(240, "vendor", "deg/s") } },
    });
    const c = loadCatalog(f);
    expect(c.rows.get("a")?.tier).toBe("vendor");
    expect(c.rows.get("a")?.fields["strapping"]?.use).toBe("check");
    expect(c.rows.get("b")?.tier).toBe("inferred");
    expect(c.rows.get("b")?.provenance.tier).toBe("inferred");
  });

  test("an unknown field, a value-less field and a conflicted non-inferred field are E_SCHEMA", () => {
    expect(errorOf(() => loadRow("modules/a.json", files({ "modules/a.json": { id: "a", name: "A", kind: "module", fields: { padz: field([], "vendor") } } }))))
      .toMatchObject({ code: "E_SCHEMA", path: "/modules/a.json/fields/padz" });
    expect(errorOf(() => loadRow("modules/a.json", files({ "modules/a.json": { id: "a", name: "A", kind: "module", fields: { "dims.w": { unit: "mm", provenance: prov("vendor") } } } }))))
      .toMatchObject({ code: "E_SCHEMA", path: "/modules/a.json/fields/dims.w/value" });
    const conflicted = { value: 5.9, unit: "mm", provenance: prov("vendor"), conflicts: [{ value: 5.4, source: "DAVIT" }, { value: 5.9, source: "PINTLE" }] };
    expect(errorOf(() => loadRow("modules/a.json", files({ "modules/a.json": { id: "a", name: "A", kind: "module", fields: { "dims.shaftOffset": conflicted } } }))))
      .toMatchObject({ code: "E_SCHEMA", path: "/modules/a.json/fields/dims.shaftOffset/provenance/tier" });
  });

  test("row paths: kind folders only, attachments and the M05 threshold table are not rows", () => {
    expect(["mcu/rp2040.json", "modules/esp32c3-supermini/row.json", "actuators/sg90.json"].every(isRowPath)).toBe(true);
    expect(["mcu-pins.json", "README.md", "modules/esp32c3-supermini/supermini.kicad_mod", "lug/mp2636.json", "modules/x/y.json"].some(isRowPath)).toBe(false);
  });

  test("lookup records each field once, in read order, with its provenance", () => {
    const c = loadCatalog(files({ "modules/a.json": { id: "a", name: "A", kind: "module", fields: { pads: field([{ pad: "1", name: "X", shape: "rect", x: 0, y: 0, w: 1, h: 1 }], "vendor"), vil: field(0.8, "inferred", "V") } } }));
    const l = createCatalogLookup(c);
    l.field("a", "vil");
    l.field("a", "pads");
    l.field("a", "vil");
    expect(l.reads().map((r) => [r.field, r.provenance.tier])).toEqual([["vil", "inferred"], ["pads", "vendor"]]);
    expect(errorOf(() => l.row("b"))).toMatchObject({ code: "E_REF", didYouMean: ["a"] });
  });
});

describe("imported mesh winding (D-102, step 7)", () => {
  const stl = new Uint8Array(readFileSync(new URL("./fixtures/rp2040-pizero-standin.stl", import.meta.url)));

  test("the fixture is the CRESSET stand-in named in the card", () => {
    expect(sha256Hex(stl)).toBe("bcb1a5f1639589d69ccbb11e7a590253aba1471ff1bd77694aef3e65d9d6e028");
  });

  test("a row carrying it is refused with E_SCHEMA at /mesh, the hint naming -6506 mm3 and the fix", () => {
    const row = { id: "rp2040-pizero", name: "RP2040 PiZero stand-in", kind: "board", mesh: { file: "standin.stl" }, fields: { envelope: field([65, 30, 5], "inferred") } };
    const e = errorOf(() => loadRow("modules/rp2040-pizero/row.json", files({ "modules/rp2040-pizero/row.json": row }, { "modules/rp2040-pizero/standin.stl": stl })));
    expect(e).toMatchObject({ code: "E_SCHEMA", path: "/mesh" });
    expect(Math.abs((e.got as number) + 6506)).toBeLessThanOrEqual(1);
    expect(e.hint).toContain("-6506");
    expect(e.hint).toContain("winding inverted");
    expect(e.hint).toContain("reverse triangle order");
  });
});

// R1-flagship-access-switch-05: the PJ398SM row parses its pads from the
// committed KiCad v5 footprint. The expected pads are typed from the
// tools/py/board/kicad_fetch.py pads table pasted in the row (KiCad y down),
// negated here because the reader puts the part frame +y up.
describe("connectors/pj398sm from KiCad pad data", () => {
  const dir = "connectors/pj398sm";
  const f = new Map(["row.json", "pj398sm.kicad_mod"].map((n) => [`${dir}/${n}`, new Uint8Array(readFileSync(new URL(`../data/${dir}/${n}`, import.meta.url)))] as const));

  test("the row loads with 3 pads S, TN, T and T at 11.4 mm from S along -y", () => {
    expect(isRowPath(`${dir}/row.json`)).toBe(true);
    const row = loadCatalog(f, { resolvers: KICAD_RESOLVERS }).rows.get("pj398sm");
    expect(row?.kind).toBe("connector");
    expect(row?.tier).toBe("community");
    const pads = row?.fields["pads"]?.value as readonly { pad: string; name: string; x: number; y: number; w: number; h: number; drill: number }[];
    expect(pads.map((p) => [p.name, p.x, p.y, p.w, p.h, p.drill])).toEqual([
      ["TN", 0, -3.1, 2.13, 2.13, 1.42],
      ["S", 0, -0, 1.93, 1.83, 1.22],
      ["T", 0, -11.4, 2.13, 2.13, 1.43],
    ]);
    const at = (n: string) => pads.find((p) => p.name === n)!;
    expect(at("T").y - at("S").y).toBeCloseTo(-11.4, 9);
  });
});
