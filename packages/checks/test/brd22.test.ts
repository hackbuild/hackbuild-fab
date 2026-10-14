// CHK-BRD-22 against shorts (M08-T08 step 2, audit3): a KiCad file whose
// copper adds a short its BoardRecord lacks fails the readback. The board is
// two pads and nothing else, written by packages/board writeKicad; the bad
// file adds one segment on net A from pad U1.1 onto pad U1.2 (net B), the
// injection packages/board/test/kicad.test.ts uses on SPINDLE.

import { describe, expect, test } from "vitest";
import type { BoardRecord, Part, RecordPad } from "@hackbuild/spec";
import { kicadExtrasOf, withHash, writeKicad } from "@hackbuild/board";
import { runBrd22 } from "../src/brd/chk-brd-22";

const pad = (pin: string, net: string, x: number): RecordPad =>
  ({ ref: "U1", pin, net, side: "top", through: false, shape: "rect", x, y: 5, w: 1, h: 1, rot: 0 });
const pads = [pad("1", "A", 5), pad("2", "B", 8)];
const record: BoardRecord = withHash({
  schema: 1, backend: "direct", board: { outline: [[0, 0], [20, 0], [20, 10], [0, 10]], thickness: 1.6, copperLayers: 2 },
  parts: [], pads, nets: [{ name: "A", members: ["U1.1"] }, { name: "B", members: ["U1.2"] }],
  vias: [], holes: [], tracks: [], jumpers: [], bridges: [], reads: [],
} as unknown as Omit<BoardRecord, "recordHash">);
const text = writeKicad(record, kicadExtrasOf(record));
const run = (t: string) => runBrd22({
  level: "artifact",
  artifact: { exporter: "kicad", name: "two.kicad_pcb", bytes: new TextEncoder().encode(t), part: { id: "two", board: record } as unknown as Part },
});

describe("CHK-BRD-22 shorts", () => {
  test("the written file reads back and passes", () => {
    expect(run(text).map((f) => f.verdict)).toEqual(["pass"]);
  });

  test("a segment shorting A to B on F.Cu fails and names the short", () => {
    const id = 1 + record.nets.findIndex((n) => n.name === "A");
    const seg = `  (segment (start 5 5) (end 8 5) (width 0.25) (layer "F.Cu") (net ${id}) (tstamp 00000000-0000-0000-0000-000000000001))`;
    const bad = text.replace(/\)\s*$/, `${seg}\n)\n`);
    expect(bad).not.toBe(text);
    const [f] = run(bad);
    expect(f!.verdict).toBe("fail");
    expect(f!.constraint).toContain("short A to B on F.Cu");
    expect(f!.extra).toMatchObject({ shorts: 1, recordShorts: 0 });
  });
});
