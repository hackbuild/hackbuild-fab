// Each data/modules/<id>/pins.json (tools/catalog/resolve-pins.mjs) equals
// catalogPins on a fresh load, so a package that imports the table as JSON
// reads the pins the KiCad files give, and a footprint or symbol change
// without a regeneration fails here.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { KICAD_RESOLVERS, catalogPins, loadCatalog } from "../src/index";

const DATA = fileURLToPath(new URL("../data/", import.meta.url));
const files = new Map<string, Uint8Array>();
const walk = (d: string): void => {
  for (const n of readdirSync(d)) {
    const p = path.join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else files.set(path.relative(DATA, p).split(path.sep).join("/"), new Uint8Array(readFileSync(p)));
  }
};
walk(DATA);
const catalog = loadCatalog(files, { resolvers: KICAD_RESOLVERS });

/** Module rows whose pins parse from KiCad files at load. */
const resolved = readdirSync(path.join(DATA, "modules")).filter((d) => {
  const row = path.join(DATA, "modules", d, "row.json");
  return existsSync(row) && (JSON.parse(readFileSync(row, "utf8")) as { fields?: { pins?: { from?: unknown } } }).fields?.pins?.from !== undefined;
});

describe("resolved pin tables", () => {
  test("there is at least the pico row", () => expect(resolved).toContain("pico"));

  test.each(resolved)("%s pins.json equals a fresh parse", (dir) => {
    const row = JSON.parse(readFileSync(path.join(DATA, "modules", dir, "row.json"), "utf8")) as { id: string; mcu?: string };
    const table = JSON.parse(readFileSync(path.join(DATA, "modules", dir, "pins.json"), "utf8")) as { id: string; mcu: string | null; pins: unknown[] };
    const live = catalogPins(catalog, row.id);
    expect(table.id).toBe(row.id);
    expect(table.mcu).toBe(row.mcu ?? null);
    expect(table.pins).toEqual(live.pins.map((q) => ({ n: q.n, name: q.name, role: q.role, at: q.at })));
  });
});
