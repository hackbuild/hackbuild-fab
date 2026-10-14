// CHK-BRD-04 (M08-T04 step 5 and Acceptance). The record is the SPINDLE R1
// connectivity ported from pcb.py (fixture note); the catalog is the
// committed data tree, so strapping and boot activity come from the
// ESP32-C3 row (datasheet v2.4 Tables 3-1, 3-3, 2-4, 3-4).

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { BoardRecord } from "@hackbuild/spec";
import { KICAD_RESOLVERS, loadCatalog } from "@hackbuild/catalog";
import { strapFindings } from "../src/brd/strap";

const DATA = fileURLToPath(new URL("../../catalog/data/", import.meta.url));
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
const catalog = loadCatalog(filesUnder(DATA), { resolvers: KICAD_RESOLVERS });
const fixture = JSON.parse(readFileSync(new URL("./board-data/spindle-r1-nets.json", import.meta.url), "utf8")) as { parts: { ref: string; catalogId: string }[]; pads: { ref: string; pin: string; net: string }[] };
const record = (pads: typeof fixture.pads): BoardRecord => ({ parts: fixture.parts, pads } as unknown as BoardRecord);

describe("CHK-BRD-04 strapping and boot activity", () => {
  test("SPINDLE R1 passes: GPIO2 held high by R4, GPIO9 at its weak pull-up, the laser gate on GPIO20 with R3 down", () => {
    const fs = strapFindings(record(fixture.pads), catalog);
    expect(fs.length).toBeGreaterThanOrEqual(3);
    for (const f of fs) expect(f.verdict, f.constraint).toBe("pass");
    expect(fs.map((f) => f.extra?.["pin"])).toEqual(expect.arrayContaining(["GPIO2", "GPIO9", "GPIO20"]));
    expect(fs.find((f) => f.extra?.["pin"] === "GPIO20")?.constraint).toContain("Q1.G through R2 with pulldown R3 to GND");
  });

  test("the laser gate moved from GPIO20 to GPIO21 fails naming U0TXD", () => {
    const pads = fixture.pads.map((p) => (p.ref === "R2" && p.net === "GPIO20" ? { ...p, net: "GPIO21" } : p));
    const bad = strapFindings(record(pads), catalog).filter((f) => f.verdict === "fail");
    expect(bad).toHaveLength(1);
    expect(bad[0]?.extra).toMatchObject({ pin: "GPIO21", gate: "Q1.G" });
    expect(bad[0]?.constraint).toContain("U0TXD");
    expect(bad[0]?.constraint).toContain("vendor");
  });

  test("the record with R4 removed fails on GPIO2", () => {
    const bad = strapFindings(record(fixture.pads.filter((p) => p.ref !== "R4")), catalog).filter((f) => f.verdict === "fail");
    expect(bad).toHaveLength(1);
    expect(bad[0]?.extra?.["pin"]).toBe("GPIO2");
    expect(bad[0]?.constraint).toContain("nothing holds it, default floating");
  });

  test("a gate without a pulldown fails even on a quiet pin; GPIO9 tied to GND fails", () => {
    const noR3 = strapFindings(record(fixture.pads.filter((p) => p.ref !== "R3")), catalog).filter((f) => f.verdict === "fail");
    expect(noR3.map((f) => f.extra?.["pin"])).toEqual(["GPIO20"]);
    const pads = [...fixture.pads, { ref: "R9", pin: "1", net: "GPIO9" }, { ref: "R9", pin: "2", net: "GND" }];
    const r9 = strapFindings(record(pads), catalog).filter((f) => f.verdict === "fail");
    expect(r9.map((f) => [f.extra?.["pin"], f.constraint.includes("held low by R9 to GND")])).toEqual([["GPIO9", true]]);
  });
});
