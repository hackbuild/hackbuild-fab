// R1-designs-reach-19: the Pico seat row reads its pads and pin names from
// the KiCad library files beside it. The expected values come from sources
// independent of those files: the Raspberry Pi Pico Datasheet section 2.1
// (power pin numbers, typed here from PDF pages 8 and 9) and the BLOCKS
// boardPins order BOSS handed its router
// (packages/copper/test/fixtures/boss-seats/pico-press-all40.json, written by
// tools/legacy/boss/dump-route-cfg.cjs), at the BLOCKS seat positions
// (rowX 8.89, pitch 2.54, parts.js lines 29 to 36).

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { PinDef } from "@hackbuild/spec";
import { KICAD_RESOLVERS, catalogPins, kicadModPads, loadCatalog, loadRow } from "../src/index";

const DATA = fileURLToPath(new URL("../data/", import.meta.url));
const BOSS = fileURLToPath(new URL("../../copper/test/fixtures/boss-seats/pico-press-all40.json", import.meta.url));

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
const out = catalogPins(catalog, "pico");
const byN = (n: number): PinDef => out.pins.find((p) => p.n === n)!;
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("pico row from the KiCad library", () => {
  test("40 pads and 40 pins parse at load; pads and pins community, body and pitch vendor, row community", () => {
    expect(out.pins).toHaveLength(40);
    const row = catalog.rows.get("pico")!;
    expect((row.fields["pads"]?.value as unknown[]).length).toBe(40);
    expect(row.tier).toBe("community");
    expect(row.fields["pins"]?.provenance.tier).toBe("community");
    expect(row.fields["dims.body"]?.provenance.tier).toBe("vendor");
    expect(row.fields["dims.pitch"]?.provenance.tier).toBe("vendor");
    expect(files.has("modules/pico.json")).toBe(false);
    expect(files.has("modules/pico/LICENSE.md")).toBe(true);
  });

  test("power and control pins sit at the datasheet section 2.1 pin numbers", () => {
    const want: readonly [number, string][] = [[40, "VBUS"], [39, "VSYS"], [37, "3V3_EN"], [36, "3V3"], [35, "ADC_VREF"], [33, "AGND"], [30, "RUN"]];
    expect(want.map(([n]) => [n, byN(n).name])).toEqual(want);
  });

  test("the seven GND pins are 3, 8, 13, 18, 23, 28 and 38, every one role gnd, though six are passive in the symbol", () => {
    expect(out.pins.filter((p) => p.name === "GND").map((p) => [p.n, p.role])).toEqual([3, 8, 13, 18, 23, 28, 38].map((n) => [n, "gnd"]));
    expect([byN(40).role, byN(39).role, byN(36).role, byN(33).role, byN(1).role, byN(30).role]).toEqual(["vbus", "vsys", "3v3", "agnd", "gpio", "gpio"]);
  });

  test("every pin lands where the BLOCKS seat puts the same name: left column top to bottom, then right", () => {
    const boss = (JSON.parse(readFileSync(BOSS, "utf8")) as { params: { pins: string[] } }).params.pins;
    expect(boss).toHaveLength(40);
    // The symbol spells GPIOn and GPIOn_ADCk where BLOCKS writes GPn, and AGND where BLOCKS writes GND.
    const blocksName = (n: string): string => n.replace(/^GPIO(\d+)(?:_ADC\d)?$/, "GP$1").replace(/^AGND$/, "GND");
    const got = boss.map((_, i) => {
      const k = i % 20;
      const at = [i < 20 ? -8.89 : 8.89, Number((24.13 - k * 2.54).toFixed(6))];
      const hit = out.pins.filter((p) => p.at !== undefined && p.at[0] === at[0] && Math.abs(p.at[1] - at[1]!) < 1e-9);
      return hit.length === 1 ? blocksName(hit[0]!.name) : `${hit.length} pins at ${at.join(",")}`;
    });
    expect(got).toEqual(boss);
  });

  test("dims.pitch and dims.rowX equal the parsed pads (computed)", () => {
    const row = catalog.rows.get("pico")!;
    const pads = row.fields["pads"]!.value as readonly { pad: string; x: number; y: number }[];
    const xs = [...new Set(pads.map((p) => p.x))].sort((a, b) => a - b);
    expect(xs).toEqual([-8.89, 8.89]);
    expect(row.fields["dims.rowX"]?.value).toBe(xs[1]);
    for (const x of xs) {
      const ys = pads.filter((p) => p.x === x).map((p) => p.y).sort((a, b) => a - b);
      expect(ys.slice(1).map((y, i) => Number((y - ys[i]!).toFixed(6)))).toEqual(Array(19).fill(row.fields["dims.pitch"]?.value));
    }
  });

  test("the custom GND pads read as their 1.6 mm circle anchor, drill 1", () => {
    const pads = kicadModPads(new TextDecoder().decode(files.get("modules/pico/pico.kicad_mod")!), "pico");
    expect(pads.filter((p) => p.pad === "3" || p.pad === "38").map((p) => [p.pad, p.shape, p.w, p.h, p.drill])).toEqual([["3", "circle", 1.6, 1.6, 1], ["38", "circle", 1.6, 1.6, 1]]);
    expect(pads.find((p) => p.pad === "1")?.shape).toBe("roundrect");
  });
});

describe("reader refusals the pico row relies on", () => {
  const custom = (prim: string): string => `(footprint X (pad "1" thru_hole custom (at 0 0) (size 1.6 1.6) (drill 1) (options (anchor circle)) (primitives ${prim})))`;

  test("a custom pad whose primitive leaves the anchor box is E_SCHEMA", () => {
    expect(kicadModPads(custom("(gr_poly (pts (xy 0.8 0.6) (xy 0 -0.8)))"), "ok")[0]?.shape).toBe("circle");
    expect(() => kicadModPads(custom("(gr_poly (pts (xy 0.9 0.6) (xy 0 -0.8)))"), "wide")).toThrow(/outside the 1.6 x 1.6 mm anchor box/);
    expect(() => kicadModPads(custom("(gr_circle (center 0.6 0.6) (end 0.9 0.6))"), "round")).toThrow(/outside/);
    expect(() => kicadModPads(custom("(gr_arc (start 0 0) (mid 0 0) (end 0 0))"), "arc")).toThrow(/gr_arc has no catalog form/);
  });

  test("an origin other than pads-centre is E_SCHEMA", () => {
    const f = new Map(files);
    const row = JSON.parse(new TextDecoder().decode(f.get("modules/pico/row.json")!)) as { fields: { pads: { from: { origin: string } } } };
    row.fields.pads.from.origin = "body";
    f.set("modules/pico/row.json", enc(JSON.stringify(row)));
    expect(() => loadRow("modules/pico/row.json", f, { resolvers: KICAD_RESOLVERS })).toThrow(/origin body is not pads-centre/);
  });

  test("a passive pin with no power pin of its name stays gpio", () => {
    const sym = '(kicad_symbol_lib (symbol "S" (symbol "S_1_1" (pin power_in line (name "VCC") (number "1")) (pin passive line (name "VCC") (number "2")) (pin passive line (name "GND") (number "3")))))';
    const f = new Map([
      ["modules/s/row.json", enc(JSON.stringify({ id: "s", name: "S", kind: "module", fields: { pins: { from: { kind: "kicad-sym", sym: "s.kicad_sym", count: 3 }, unit: "none", provenance: { tier: "community", method: "listing", date: "2026-10-21", source: "test" } } } }))],
      ["modules/s/s.kicad_sym", enc(sym)],
    ]);
    const pins = loadRow("modules/s/row.json", f, { resolvers: KICAD_RESOLVERS }).fields["pins"]!.value as readonly PinDef[];
    expect(pins.map((p) => [p.n, p.role])).toEqual([[1, "vcc"], [2, "vcc"], [3, "gpio"]]);
  });
});
