// CHK-BRD-22 run body (M08-T08 step 2): kicadts reads a .kicad_pcb back
// to the BoardRecord of the Part it came from (packages/board
// readbackKicad, the one implementation). measured is the count of record
// pads found equal on position, size, net, drill and drill offset at 1e-3
// mm; legal is the set {record pads}. A via, a net member set or an island
// that differs fails the check too and is named in the constraint, and so
// does a short the file adds beyond its record's, per net pair and layer.

import type { Finding, TargetOf } from "@hackbuild/spec";
import { readbackKicad } from "@hackbuild/board";
import { setFinding, skip } from "../defs/common.js";

const DECODER = new TextDecoder("utf-8");

export function runBrd22(t: TargetOf<"artifact">): readonly Finding[] {
  const at = { level: "artifact" as const, artifact: t.artifact.name };
  if (t.artifact.exporter !== "kicad") return [skip(at, "not run", `artifact ${t.artifact.name} is a ${t.artifact.exporter} export; CHK-BRD-22 reads KiCad boards`)];
  const record = t.artifact.part?.board;
  if (record === undefined) return [skip(at, "not run", `no BoardRecord beside ${t.artifact.name}: name the board design or its build so the readback has a record`)];
  const rb = readbackKicad(DECODER.decode(t.artifact.bytes), record);
  const wrong = [...rb.pads.misses, ...rb.vias.misses, ...rb.nets.misses.map((n) => `net ${n} members differ`), ...rb.islands.split, ...rb.shorts.extra];
  const extra = {
    pads: rb.pads.matched, vias: rb.vias.matched, nets: rb.nets.matched, islands: rb.islands.whole,
    shorts: rb.shorts.file, recordShorts: rb.shorts.record, wrong: wrong.slice(0, 8).join("; "),
  };
  const pads = String(rb.pads.matched);
  const constraint = wrong.length === 0
    ? `${t.artifact.name} reads back: pads ${rb.pads.matched} of ${rb.pads.total}, vias ${rb.vias.matched} of ${rb.vias.total}, ${rb.islands.whole} nets one island each`
    : `${t.artifact.name} differs from its record: ${wrong[0]}${wrong.length > 1 ? `, and ${wrong.length - 1} more` : ""}; pads ${rb.pads.matched} of ${rb.pads.total}`;
  const f = setFinding(at, pads, [String(rb.pads.total)], constraint, extra, "count");
  return [wrong.length === 0 ? f : { ...f, verdict: "fail" }];
}
