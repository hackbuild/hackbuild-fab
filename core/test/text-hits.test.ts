// The text form of the query commands (R1-score-04, V-04 and N-07): one
// line per hit for arch.find, catalog.find and catalog.pins, each line
// held to the --json answer of the same call, and --size as WxH or one
// number, the forms a maker types.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { CanonHit, CatalogHit, CommandOutput } from "@hackbuild/spec";
import { readSize } from "../src/main.js";
import { hbf, json } from "./hbf.js";

const lines = (out: string): string[] => out.trimEnd().split("\n");

describe("query text rows (R1-score-04)", () => {
  it("arch.find prints one hit line per json hit, with why it matched and its numbers qualified", async () => {
    const { out } = await hbf(["arch.find", "press"]);
    const { r } = await json("arch.find", "press");
    const hits = (r.result as unknown as { hits: CanonHit[] }).hits;
    expect(hits.length).toBeGreaterThan(0);
    const text = lines(out);
    expect(text[0]).toBe(`PASS arch.find press   ${hits.length} hits`);
    const rows = text.filter((l) => l.startsWith("hit  "));
    expect(rows).toHaveLength(hits.length);
    for (const [i, h] of hits.entries()) {
      expect(rows[i], h.id).toMatch(new RegExp(`^hit  ${h.id}  archetype ${h.family}  ${h.status}  why press in (id|family|senses or emits)`));
      for (const x of h.resistances ?? []) {
        const ohm = typeof x.ohm === "number" ? Math.round(x.ohm).toFixed(0) : `${Math.round(x.ohm[0])} to ${Math.round(x.ohm[1])}`;
        expect(rows[i]).toContain(`${x.id} ${ohm} ohm (computed, ${x.material} row tier ${x.tier})`);
      }
    }
    expect(rows.find((l) => l.startsWith("hit  click-spring-key  "))).toMatch(/channels 1 \(count\)  resistances switch\.tip \d+ ohm/);
  });

  it("catalog.find prints the hit with its envelope and the row tier's qualifier", async () => {
    const { out } = await hbf(["catalog.find", "pico"]);
    const { r } = await json("catalog.find", "pico");
    const hits = (r.result as unknown as { hits: CatalogHit[] }).hits;
    const pico = hits.find((h) => h.id === "pico");
    expect(pico?.envelope).toBeDefined();
    const text = lines(out);
    expect(text[0]).toBe(`PASS catalog.find pico   ${hits.length} hits`);
    const env = pico!.envelope!.map((n) => n.toFixed(2)).join(" x ");
    const qualifier = { verified: "vendor", measured: "measured", vendor: "vendor", community: "measured", inferred: "inferred" }[pico!.tier];
    expect(text).toContain(`hit  pico  part  ${pico!.name}  why pico in id or name  tier ${pico!.tier}  envelope ${env} mm (${qualifier})  source ${pico!.source}`);
  });

  it("catalog.pins prints a line per pin with its position, and the mcu figures", async () => {
    const { out } = await hbf(["catalog.pins", "pico"]);
    const { r } = await json("catalog.pins", "pico");
    const res = r.result as unknown as CommandOutput<"catalog.pins">;
    const text = lines(out);
    expect(text[0]).toBe(`PASS catalog.pins pico   ${res.pins.length} pins`);
    const pins = text.filter((l) => l.startsWith("pin  "));
    expect(pins).toHaveLength(res.pins.length);
    const p1 = res.pins.find((p) => p.n === 1)!;
    expect(pins[0]).toBe(`pin  1  ${p1.name}  ${p1.role}  at ${p1.at!.map((n) => n.toFixed(2)).join(", ")} mm (measured)`);
    expect(text.find((l) => l.startsWith("mcu  "))).toMatch(new RegExp(`^mcu  pico  vdd ${res.mcu!.vddV.toFixed(2)} V`));
    expect(text.filter((l) => l.startsWith("source  "))).toHaveLength(Object.keys(res.provenance).length);
  });
});

describe("--size takes WxH or one number (N-07)", () => {
  it("reads 900 as a square, 1000x800 and 1000,800 as a pair, json as json", () => {
    expect(readSize("size", "900")).toEqual([900, 900]);
    expect(readSize("size", "1000x800")).toEqual([1000, 800]);
    expect(readSize("size", "1000X800")).toEqual([1000, 800]);
    expect(readSize("size", "1000,800")).toEqual([1000, 800]);
    expect(readSize("size", "[1000,800]")).toEqual([1000, 800]);
    expect(readSize("size", "wide")).toBe("wide");
  });

  const dir = mkdtempSync(path.join(os.tmpdir(), "hbf-size-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  /** Width and height from a png's IHDR chunk. */
  const pngSize = (file: string): [number, number] => {
    const b = readFileSync(file);
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  };

  for (const [size, wh] of [["900", [900, 900]], ["1000x800", [1000, 800]]] as const) {
    it(`view.render --size ${size} renders ${wh.join(" by ")} px`, async () => {
      const out = path.join(dir, `r-${size}.png`);
      const { code, out: text } = await hbf(["view.render", "designs/collar", "--mode", "iso", "--size", size, "--out", out]);
      expect(code, text).toBe(0);
      expect(pngSize(out)).toEqual(wh);
    }, 120_000);
  }
});
