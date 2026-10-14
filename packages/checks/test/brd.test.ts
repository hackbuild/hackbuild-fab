// M08-T12 CHK-BRD kernels: one passing and one failing fixture per check.
// The SPINDLE R1 pads are ported from pcb.py (fixture note); its net count,
// 19, equals the R1 DRC line "19 nets" (card Records table), which this file
// asserts so the port cannot drift. Fail fixtures are named where they come
// from: the Downloads R1 pcb.py for CHK-BRD-02, the pcb.py nets as written
// for CHK-BRD-09, TRUNNION SJ1 for CHK-BRD-20; the rest are one-line edits
// of the pass fixture, each stated beside it.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { BoardRecord, PartRow, RecordPad } from "@hackbuild/spec";
import { KICAD_RESOLVERS, loadCatalog, type Catalog } from "@hackbuild/catalog";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { boardLimits, brd02, brd03, brd07Outline, brd08, brd09, brd20, drillMargin } from "../src/brd/board";

const LIM = boardLimits(createProfileLookup(loadProfile()));

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
interface Fx { outline: [number, number][]; parts: { ref: string; catalogId: string; side: "top" | "bottom"; x: number; y: number; rot: number }[]; pads: RecordPad[]; legacyU1: RecordPad[] }
const fx = JSON.parse(readFileSync(new URL("./board-data/spindle-r1-pads.json", import.meta.url), "utf8")) as Fx;

function record(pads: readonly RecordPad[], extra: Partial<BoardRecord> = {}): BoardRecord {
  const nets = new Map<string, string[]>();
  for (const p of pads) if (p.net !== "") nets.set(p.net, [...(nets.get(p.net) ?? []), `${p.ref}.${p.pin}`]);
  return {
    schema: 1, backend: "direct", board: { outline: fx.outline, thickness: 1.6, copperLayers: 2 },
    parts: fx.parts.map((p) => ({ ...p, value: "", tier: "inferred", body: { w: 0, h: 0, z: 0 } })),
    pads, nets: [...nets].map(([name, members]) => ({ name, members: members.sort() })).sort((a, b) => (a.name < b.name ? -1 : 1)),
    vias: [], holes: [], tracks: [], jumpers: [], bridges: [], reads: [], recordHash: "" as BoardRecord["recordHash"], ...extra,
  } as BoardRecord;
}
const verdicts = (fs: readonly { verdict: string }[]) => [...new Set(fs.map((f) => f.verdict))].sort();
/** SPINDLE leaves GPIO8 and GPIO9 unconnected (reference/boards/spindle-r1/gen.py docstring); a record declares them no-connect. */
const declared = fx.pads.map((p) => (p.ref === "U1" && (p.pin === "GPIO8" || p.pin === "GPIO9") ? { ...p, net: "" } : p));

test("the board limits are the profile rows: drill margin 0.15 (SPINDLE pcb.py gate), module landing 0.05 (M08-T12 step 2)", () => {
  expect(LIM).toEqual({ drillMargin: 0.15, landing: 0.05 });
});

describe("the fixture is SPINDLE R1", () => {
  test("55 component pads and 19 nets, as the R1 DRC line counts them", () => {
    expect(fx.pads).toHaveLength(55);
    expect(new Set(fx.pads.map((p) => p.net)).size).toBe(19);
  });
});

describe("CHK-BRD-02 drill inside its pad, and the pin landing", () => {
  test("pass: SPINDLE R1, holes offset 1.13 mm onto the 15.24 row, every module hole within 0.05 mm of its catalog pin", () => {
    const fs = brd02(record(fx.pads), LIM, catalog);
    expect(verdicts(fs)).toEqual(["pass"]);
    expect(fs.filter((f) => f.extra?.["catalogId"] === "esp32c3-supermini")).toHaveLength(16);
    const u1 = fx.pads.find((p) => p.ref === "U1")!;
    expect(drillMargin(u1)).toBeCloseTo(Math.min(4.9 / 2 - 1.13, 1.6 / 2) - 1.05 / 2, 9);
  });

  test("fail: the Downloads R1 drills U1 at the pad centre; each hole keeps its margin and misses its pin by 1.13 mm (17.5 row against 15.24)", () => {
    const pads = [...fx.legacyU1, ...fx.pads.filter((p) => p.ref !== "U1")];
    const fs = brd02(record(pads), LIM, catalog);
    const land = fs.filter((f) => f.extra?.["catalogId"] === "esp32c3-supermini");
    expect(land).toHaveLength(16);
    for (const f of land) {
      expect(f.verdict).toBe("fail");
      expect(f.measured as number).toBeCloseTo(8.75 - 7.62, 9);
    }
    expect(fs.filter((f) => f.extra?.["catalogId"] === undefined).every((f) => f.verdict === "pass")).toBe(true);
  });
});

describe("CHK-BRD-03 chirality", () => {
  // Q1 as pcb.py lines 142 to 144 places it (G 33.55, 2.90; S 35.45, 2.90; D 34.50, 5.10), about its pad centroid.
  const cx = (33.55 + 35.45 + 34.5) / 3, cy = (2.9 + 2.9 + 5.1) / 3;
  const q1Row = {
    id: "spindle-q1-hand", name: "SPINDLE R1 Q1 hand pads", kind: "other", tier: "inferred",
    provenance: { tier: "inferred", method: "derived", date: "2026-10-09", source: "pcb.py lines 142 to 144" },
    fields: { pads: { value: [["G", 33.55, 2.9], ["S", 35.45, 2.9], ["D", 34.5, 5.1]].map(([n, x, y]) => ({ pad: n, name: n, shape: "rect", x: (x as number) - cx, y: (y as number) - cy, w: 1, h: 1.2 })), unit: "mm", use: "geometry", provenance: { tier: "inferred", method: "derived", date: "2026-10-09", source: "pcb.py lines 142 to 144" } } },
  } as unknown as PartRow;
  const cat: Catalog = { rows: new Map([[q1Row.id, q1Row]]) };
  const bottom = (mirror: boolean) => {
    const pads = (q1Row.fields["pads"]!.value as { pad: string; x: number; y: number }[]).map((c) => ({
      ref: "Q1", pin: c.pad, net: "", side: "bottom", through: false, shape: "rect", x: 20 + (mirror ? -c.x : c.x), y: 20 + c.y, w: 1, h: 1.2, rot: 0,
    } as RecordPad));
    return { ...record(pads), parts: [{ ref: "Q1", catalogId: q1Row.id, side: "bottom", x: 20, y: 20, rot: 0, value: "AO3400A", tier: "inferred", body: { w: 0, h: 0, z: 0 } }] } as BoardRecord;
  };
  test("pass: Q1 on the back with its pattern mirrored", () => expect(verdicts(brd03(bottom(true), LIM, cat))).toEqual(["pass"]));
  test("fail: Q1 on the back unmirrored, the TACK SOT-23 swap", () => {
    const f = brd03(bottom(false), LIM, cat)[0]!;
    expect(f.verdict).toBe("fail");
    expect(f.constraint).toContain("mirror the footprint");
  });
});

describe("CHK-BRD-07 outline clause", () => {
  test("pass: every SPINDLE pad inside the 46 x 46 rounded outline", () => expect(brd07Outline(record(fx.pads)).verdict).toBe("pass"));
  test("fail: J1 moved 6 mm right of x 40.6 reaches past the 46 mm edge", () => {
    const f = brd07Outline(record(fx.pads.map((p) => (p.ref === "J1" ? { ...p, x: p.x + 6 } : p))));
    expect(f.verdict).toBe("fail");
    expect(f.extra?.["outside"]).toBe(6);
  });
});

describe("CHK-BRD-08 pin completeness", () => {
  test("pass: every two-terminal part of SPINDLE on nets", () => expect(verdicts(brd08(record(fx.pads)))).toEqual(["pass"]));
  test("fail: R4 pin 2 left on no net, the ARMATURE D11 K pattern", () => {
    const fs = brd08(record(fx.pads.map((p) => (p.ref === "R4" && p.pin === "2" ? { ...p, net: "" } : p)))).filter((f) => f.verdict === "fail");
    expect(fs.map((f) => (f.target as { part: string }).part)).toEqual(["R4"]);
  });
});

describe("CHK-BRD-09 single-node nets", () => {
  test("pass: SPINDLE with the unused GPIO8 and GPIO9 declared no-connect", () => expect(verdicts(brd09(record(declared)))).toEqual(["pass"]));
  test("fail: the nets as pcb.py names them, GPIO8 and GPIO9 one member each", () => {
    expect(brd09(record(fx.pads)).filter((f) => f.verdict === "fail").map((f) => f.extra?.["net"])).toEqual(["GPIO8", "GPIO9"]);
  });
});

describe("CHK-BRD-20 jumper default (D-088)", () => {
  const jp1 = (d: "open" | "closed") => record(declared, { jumpers: [{ ref: "JP1", pads: ["JP1.1", "JP1.2"], default: d, joins: ["5V_MOD", "5V"] }] });
  test("pass: SPINDLE JP1 open, 5V_MOD fed by the module and 5V by J3 stay apart", () => expect(verdicts(brd20(jp1("open"), catalog))).toEqual(["pass"]));
  test("fail: JP1 closed by default, the TRUNNION SJ1 policy, joins two fed supply nets", () => {
    const f = brd20(jp1("closed"), catalog)[0]!;
    expect(f.verdict).toBe("fail");
    expect(f.constraint).toContain("never feed J5 while the SJ1 bridge is intact and USB is plugged in");
    expect(f.constraint).toMatch(/5V_MOD.*U1\.5V/);
  });
});
