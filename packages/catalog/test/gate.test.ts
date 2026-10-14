// M08-T03 step 4 and acceptance: the provenance gate. Reads are typed here
// from the card's cases; the LUG reads come from the fixture rows, whose
// pin maps lug.tsx lines 10 to 11 say were written from knowledge.

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Provenance, RecordRead } from "@hackbuild/spec";
import { createCatalogLookup, inferredGated, loadRow, partGaps, provenanceGate, type GatedPart } from "../src/index";

const inferred: Provenance = { tier: "inferred", method: "derived", date: "2026-10-09", source: "test" };
const vendor: Provenance = { tier: "vendor", method: "datasheet", date: "2026-10-09", source: "test" };
const FAB = { id: "gerbers", fabrication: true } as const;
const PNG = { id: "png", fabrication: false } as const;

describe("provenanceGate (D-102)", () => {
  test("one inferred pads read on a fabrication exporter is E_PROVENANCE at /catalog/<id>/pads", () => {
    const reads: RecordRead[] = [
      { catalogId: "esp32c3-supermini", field: "pins", provenance: vendor },
      { catalogId: "q-sot23", field: "pads", provenance: inferred },
    ];
    const r = provenanceGate(reads, FAB);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toEqual({
      code: "E_PROVENANCE", path: "/catalog/q-sot23/pads", got: "inferred", expected: "verified, measured, vendor or community",
      hint: "measure pads of q-sot23 or pick a vendor row; catalog.find q-sot23 --tier vendor", record: "CHK-BRD-06",
    });
  });

  test("the same reads on a non-fabrication exporter (png) pass", () => {
    expect(provenanceGate([{ catalogId: "q-sot23", field: "pads", provenance: inferred }], PNG)).toEqual({ ok: true });
  });

  test("a list whose only inferred field is vil passes: check fields never reach the gate", () => {
    const reads: RecordRead[] = [
      { catalogId: "esp32c3", field: "vil", provenance: inferred },
      { catalogId: "esp32c3", field: "strapping", provenance: inferred },
      { catalogId: "sg90", field: "dyn.slew", provenance: inferred },
      { catalogId: "esp32c3-supermini", field: "pads", provenance: vendor },
    ];
    expect(provenanceGate(reads, FAB)).toEqual({ ok: true });
  });

  test("dims fields gate, an unknown field name fails closed, and a repeated read gives one error", () => {
    const reads: RecordRead[] = [
      { catalogId: "sg90", field: "dims.shaftOffset", provenance: inferred },
      { catalogId: "sg90", field: "dims.shaftOffset", provenance: inferred },
      { catalogId: "sg90", field: "padz", provenance: inferred },
    ];
    expect(inferredGated(reads).map((r) => r.field)).toEqual(["dims.shaftOffset", "padz"]);
  });
});

describe("provenanceGate holds the record's parts against its reads", () => {
  const part = (ref: string, catalogId: string, tier: GatedPart["tier"]): GatedPart => ({ ref, catalogId, tier });
  const parts = [part("U1", "esp32c3-supermini", "vendor"), part("J1", "kicad:PinHeader_1x06_P2.54mm_Vertical", "community")];
  const covered: RecordRead[] = [
    { catalogId: "esp32c3-supermini", field: "U1.pads", provenance: vendor },
    { catalogId: "kicad:PinHeader_1x06_P2.54mm_Vertical", field: "J1.pads", provenance: { ...vendor, tier: "community" } },
  ];

  test("every part read at vendor or community passes", () => {
    expect(provenanceGate({ reads: covered, parts }, FAB)).toEqual({ ok: true });
  });

  test("the record with reads emptied refuses, one E_PROVENANCE per placed part", () => {
    const r = provenanceGate({ reads: [], parts }, FAB);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => [e.code, e.path, e.got, e.record])).toEqual([
      ["E_PROVENANCE", "/parts/U1", "no catalog read", "CHK-BRD-06"],
      ["E_PROVENANCE", "/parts/J1", "no catalog read", "CHK-BRD-06"],
    ]);
  });

  test("a partial list refuses the part it leaves out, and a read of U10 does not cover U1", () => {
    const reads: RecordRead[] = [covered[1]!, { catalogId: "esp32c3-supermini", field: "U10.pads", provenance: vendor }];
    expect(partGaps(parts, reads).map((e) => e.path)).toEqual(["/parts/U1"]);
  });

  test("a read only of a check field does not cover a part", () => {
    const reads: RecordRead[] = [covered[1]!, { catalogId: "esp32c3-supermini", field: "vil", provenance: vendor }];
    expect(partGaps(parts, reads).map((e) => e.path)).toEqual(["/parts/U1"]);
  });

  test("a part declaring inferred refuses even when its reads say vendor; an inferred read gives one error, not two", () => {
    const g = provenanceGate({ reads: covered, parts: [part("U1", "esp32c3-supermini", "inferred"), parts[1]!] }, FAB);
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.errors.map((e) => [e.path, e.got])).toEqual([["/parts/U1/tier", "inferred"]]);
    const both = provenanceGate({ reads: [{ ...covered[0]!, provenance: inferred }, covered[1]!], parts: [part("U1", "esp32c3-supermini", "inferred"), parts[1]!] }, FAB);
    expect(both.ok).toBe(false);
    if (!both.ok) expect(both.errors.map((e) => e.path)).toEqual(["/catalog/esp32c3-supermini/U1.pads"]);
  });

  test("a non-fabrication exporter passes the emptied record", () => {
    expect(provenanceGate({ reads: [], parts }, PNG)).toEqual({ ok: true });
  });
});

describe("LUG fixture rows (M08-T03 step 8)", () => {
  const dir = new URL("./fixtures/lug/", import.meta.url);
  const names = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const files = new Map(names.map((f) => [`lug/${f}`, new Uint8Array(readFileSync(new URL(f, dir)))]));
  const rows = names.map((f) => loadRow(`lug/${f}`, files));

  test("five rows, pin counts as lug.tsx declares them, every one inferred", () => {
    expect(rows.map((r) => [r.id, (r.fields["pins"]?.value as unknown[]).length, r.tier])).toEqual([
      ["max17048", 8, "inferred"], ["max98357a", 16, "inferred"], ["mp2636", 25, "inferred"], ["sn74ahct1g125", 5, "inferred"], ["stm6601", 13, "inferred"],
    ]);
    const src = readFileSync("/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/round-pi-board/outputs/lug.tsx", "utf8").split("\n");
    expect(src[9]).toContain("written");
    expect(src[10]).toContain("from knowledge, not parsed from datasheets");
    for (const r of rows) expect(r.provenance.source).toContain("lug.tsx pin maps written from knowledge");
  });

  test("a build that reads the pins of each gets one E_PROVENANCE per part at a gerber export", () => {
    const look = createCatalogLookup({ rows: new Map(rows.map((r) => [r.id, r])) });
    for (const r of rows) look.field(r.id, "pins");
    const g = provenanceGate(look.reads(), FAB);
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.errors.map((e) => e.path)).toEqual(rows.map((r) => `/catalog/${r.id}/pins`));
  });
});
