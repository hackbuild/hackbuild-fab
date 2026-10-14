// M08-T04: module pads parsed from the committed KiCad files, pin rows with
// strapping and boot activity from the MCU rows, BLOCKS seats inferred. The
// expected column order is the card's (step 2, SPINDLE README lines 47 to
// 48); the datasheet tables are typed from ESP32-C3 v2.4 and ESP32-S3 v2.2.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { KICAD_RESOLVERS, catalogFind, catalogPins, kicadModPads, loadCatalog, loadRow } from "../src/index";

const DATA = fileURLToPath(new URL("../data/", import.meta.url));
function filesUnder(dir: string): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  const walk = (d: string): void => {
    for (const n of readdirSync(d)) {
      const p = path.join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else out.set(path.relative(dir, p).split(path.sep).join("/"), new Uint8Array(readFileSync(p)));
    }
  };
  walk(dir);
  return out;
}
const files = filesUnder(DATA);
const catalog = loadCatalog(files, { resolvers: KICAD_RESOLVERS });

describe("esp32c3-supermini (step 2, D-096)", () => {
  const out = catalogPins(catalog, "esp32c3-supermini");

  test("16 pads and 16 pins parsed at load, tier vendor", () => {
    expect(out.pins).toHaveLength(16);
    expect(out.tier).toBe("vendor");
    expect((catalog.rows.get("esp32c3-supermini")?.fields["pads"]?.value as unknown[]).length).toBe(16);
  });

  test("column order with USB at top: right 5V GND 3V3 GPIO4 to GPIO0, left GPIO5 to GPIO10, GPIO20, GPIO21", () => {
    const col = (x: number) => out.pins.filter((p) => p.at?.[0] === x).sort((a, b) => b.at![1] - a.at![1]).map((p) => p.name);
    expect(col(7.62)).toEqual(["5V", "GND", "3V3", "GPIO4", "GPIO3", "GPIO2", "GPIO1", "GPIO0"]);
    expect(col(-7.62)).toEqual(["GPIO5", "GPIO6", "GPIO7", "GPIO8", "GPIO9", "GPIO10", "GPIO20", "GPIO21"]);
  });

  test("rows 15.24 mm apart at 2.54 mm pitch (computed from the parsed pads)", () => {
    const xs = [...new Set(out.pins.map((p) => p.at![0]))].sort((a, b) => a - b);
    expect(xs[1]! - xs[0]!).toBeCloseTo(15.24, 9);
    const ys = out.pins.filter((p) => p.at![0] === xs[0]).map((p) => p.at![1]).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeCloseTo(2.54, 9);
  });

  test("GPIO21 boot activity names U0TXD; GPIO2, GPIO8, GPIO9 strapping; provenance cites datasheet v2.4 pages", () => {
    expect(out.pins.find((p) => p.name === "GPIO21")?.bootActivity).toContain("U0TXD");
    expect(out.pins.filter((p) => p.strapping === true).map((p) => p.name).sort()).toEqual(["GPIO2", "GPIO8", "GPIO9"]);
    expect(out.provenance["strapping"]?.source).toContain("Datasheet v2.4");
    expect(out.provenance["strapping"]?.source).toContain("p. 30");
    expect(out.provenance["bootActivity"]?.source).toContain("p. 32");
    expect(out.mcu).toMatchObject({ id: "esp32-c3", vilMaxV: 0.825, vihMinV: 2.475 });
  });
});

describe("MCU rows", () => {
  test("esp32-s3 enters at vendor with datasheet v2.2 pages: strapping GPIO0, GPIO3, GPIO45, GPIO46; VIL 0.25 VDD, VIH 0.75 VDD at 3.3 V", () => {
    const s3 = catalog.rows.get("esp32-s3")!;
    expect(s3.tier).toBe("vendor");
    expect((s3.fields["strapping"]?.value as { pin: string }[]).map((s) => s.pin)).toEqual(["GPIO0", "GPIO3", "GPIO45", "GPIO46"]);
    expect(s3.fields["strapping"]?.provenance.source).toMatch(/Datasheet v2\.2.*Table 3-1 p\. 32/);
    expect(s3.mcu?.vilMaxV).toBeCloseTo(0.25 * 3.3, 12);
    expect(s3.mcu?.vihMinV).toBeCloseTo(0.75 * 3.3, 12);
    expect(s3.mcu?.source).toContain("p. 65");
  });

  test("threshold figures live in one file: mcu-pins.json, never in a row file", () => {
    const holders = [...files].filter(([, b]) => new TextDecoder().decode(b).includes("\"vilMaxV\"")).map(([p]) => p);
    expect(holders).toEqual(["mcu-pins.json"]);
  });

  test("an mcu row naming a threshold id that does not exist is E_REF", () => {
    const f = new Map([["mcu/x.json", new TextEncoder().encode(JSON.stringify({ id: "x", name: "X", kind: "mcu", mcu: "esp32c9", fields: {} }))]]);
    try {
      loadRow("mcu/x.json", f);
      throw new Error("expected E_REF");
    } catch (e) {
      expect(isThrownCommandError(e) && e.hbf.code).toBe("E_REF");
    }
  });
});

describe("BLOCKS seat rows (step 3, R70)", () => {
  test("c3mini rowX 8.75, pico 8.89, teensy40 7.62, each tier inferred, method derived, source the BLOCKS bench", () => {
    for (const [id, rowX] of [["c3mini", 8.75], ["pico", 8.89], ["teensy40", 7.62]] as const) {
      const r = catalog.rows.get(id)!;
      expect(r.fields["dims.rowX"]?.value, id).toBe(rowX);
      expect(r.tier, id).toBe("inferred");
      expect(r.provenance.method, id).toBe("derived");
      expect(r.provenance.source, id).toContain("parts.js");
    }
  });

  test("catalog.find supermini puts the vendor row before the inferred seat", () => {
    expect(catalogFind(catalog, "supermini").map((h) => [h.id, h.tier])).toEqual([["esp32c3-supermini", "vendor"], ["c3mini", "inferred"]]);
  });

  test("a tier floor keeps rows at that tier or better: vendor drops the inferred seat, inferred keeps it, verified keeps none", () => {
    const find = (t: "verified" | "vendor" | "inferred") => catalogFind(catalog, "supermini", t).map((h) => [h.id, h.tier]);
    expect(find("vendor")).toEqual([["esp32c3-supermini", "vendor"]]);
    expect(find("inferred")).toEqual([["esp32c3-supermini", "vendor"], ["c3mini", "inferred"]]);
    expect(find("verified")).toEqual([]);
  });
});

describe("kicad-mod reader", () => {
  test("v6+ footprint: 16 pads, y flipped to +y up, drill 0.84", () => {
    const pads = kicadModPads(new TextDecoder().decode(files.get("modules/esp32c3-supermini/supermini.kicad_mod")!), "supermini");
    expect(pads[0]).toEqual({ pad: "1", type: "thru_hole", shape: "circle", x: 7.62, y: -8.89, w: 1.14, h: 1.14, drill: 0.84 });
  });

  test("module KiCad files are drawn in this repo (S-02): generator hackbuild-fab, 2 rows of 8 at 2.54, rows 15.24 apart", () => {
    const foreign = [...files.keys()].filter((n) => n.startsWith("modules/") && /\.kicad_(mod|sym)$/.test(n))
      .filter((n) => !new TextDecoder().decode(files.get(n)!).includes('(generator "hackbuild-fab")'));
    expect(foreign, "a module KiCad file not drawn by packages/catalog/scripts has no licence to ship").toEqual([]);
    const pads = kicadModPads(new TextDecoder().decode(files.get("modules/esp32c3-supermini/supermini.kicad_mod")!), "supermini");
    expect(pads).toHaveLength(16);
    const xs = [...new Set(pads.map((p) => p.x))].sort((a, b) => a - b);
    expect(xs).toEqual([-7.62, 7.62]);
    for (const x of xs) {
      const ys = pads.filter((p) => p.x === x).map((p) => p.y).sort((a, b) => a - b);
      expect(ys.slice(1).map((y, i) => Number((y - ys[i]!).toFixed(4)))).toEqual(Array(7).fill(2.54));
    }
  });

  test("v5 module form, rotated pads and drill offsets read", () => {
    const v5 = '(module X (layer F.Cu) (pad 1 smd roundrect (at -0.9125 0 90) (size 1.025 1.4) (layers F.Cu)) (pad 2 thru_hole rect (at 1 2) (size 2 1) (drill 1.05 (offset 0.5 0)) (layers *.Cu)) (model x.wrl (at (xyz 0 0 0))))';
    expect(kicadModPads(v5, "v5")).toEqual([
      { pad: "1", type: "smd", shape: "roundrect", x: -0.9125, y: -0, w: 1.4, h: 1.025 },
      { pad: "2", type: "thru_hole", shape: "rect", x: 1, y: -2, w: 2, h: 1, drill: 1.05, holeDx: 0.5 },
    ]);
  });

  test("a pad count that disagrees with the row is E_SCHEMA", () => {
    const f = new Map(files);
    const row = JSON.parse(new TextDecoder().decode(f.get("modules/esp32c3-supermini/row.json")!)) as { fields: { pads: { from: { count: number } } } };
    row.fields.pads.from.count = 15;
    f.set("modules/esp32c3-supermini/row.json", new TextEncoder().encode(JSON.stringify(row)));
    expect(() => loadRow("modules/esp32c3-supermini/row.json", f, { resolvers: KICAD_RESOLVERS })).toThrow(/16 pads, the row asserts 15/);
  });
});

describe("row notes", () => {
  test("a note that names conflicts belongs to a row with at least one conflicts list", () => {
    const bad: string[] = [];
    for (const [name, bytes] of files) {
      if (!name.endsWith(".json")) continue;
      const row = JSON.parse(new TextDecoder().decode(bytes)) as { note?: unknown; fields?: Record<string, { conflicts?: unknown }> };
      if (typeof row.note !== "string" || !/conflict/i.test(row.note)) continue;
      if (!Object.values(row.fields ?? {}).some((f) => Array.isArray(f.conflicts))) bad.push(name);
    }
    expect(bad).toEqual([]);
  });
});
