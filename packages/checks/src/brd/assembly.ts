// CHK-BRD-05 run body (M08-T12 step 4): every BOM, CPL and netlist the
// board writes is read back and held to the record by designator. Each file
// is checked against the record, so the three agree with each other through
// it: the BOM and the CPL list every placed part, the netlist every part
// with a pad on a named net, and none names a part the record lacks (the
// SPINDLE R1 failure: a stale BOM described headers that no longer
// existed). Value, footprint and side agree for the BOM; side and body
// centre (to the file's 0.001 mm) for the CPL; member sets for the netlist.
// MPN and Qty are held to the record for the BOM, rotation for the CPL.
//
// The files are read with the check's own readers (read-assembly.ts), never
// the ones beside the writers in @hackbuild/board, so a fault the writer and
// its reader would share (a swapped header, a footprint left with its
// library prefix) fails here.

import type { BoardRecord, Finding, TargetOf } from "@hackbuild/spec";
import { boolFinding, skip } from "../defs/common.js";
import { bomFootprint, readBomFile, readCplFile, readNetText } from "./read-assembly.js";

/** The kinds CHK-BRD-05 reads. */
export const ASSEMBLY_EXPORTERS = ["bom", "cpl", "netlist"] as const;

/** A CPL coordinate is written to three decimals: it may sit this far off the body centre, mm. */
export const CPL_TOL_MM = 0.0005 + 1e-9;

/** A CPL rotation is written to one decimal: it may sit this far off the record, degrees. */
export const CPL_ROT_TOL_DEG = 0.05 + 1e-9;

const side = (s: "top" | "bottom"): string => (s === "top" ? "Top" : "Bottom");

/** What differs between one assembly file and the record; empty when they agree. */
export function assemblyDrift(kind: string, text: string, record: BoardRecord): string[] {
  const refs = record.parts.map((p) => p.ref);
  const byRef = new Map(record.parts.map((p) => [p.ref, p] as const));
  const drift: string[] = [];
  const designators = (got: readonly string[], want: readonly string[], file: string): void => {
    const g = new Set(got);
    const w = new Set(want);
    for (const r of want) if (!g.has(r)) drift.push(`${r} missing from the ${file}`);
    for (const r of got) if (!w.has(r)) drift.push(`${file} names ${r}, which the record does not place`);
    if (g.size !== got.length) drift.push(`${file} repeats a designator`);
  };
  if (kind === "bom") {
    const rows = readBomFile(text);
    if (rows === undefined) return ["BOM header is not Designator,Value,MPN,Footprint,Side,Qty,Note"];
    designators(rows.map((r) => r.ref), refs, "BOM");
    for (const r of rows) {
      const p = byRef.get(r.ref);
      if (p === undefined) continue;
      if (r.value !== p.value) drift.push(`${r.ref} value ${r.value} in the BOM, ${p.value} in the record`);
      if (r.mpn !== (p.mpn ?? "")) drift.push(`${r.ref} MPN ${r.mpn} in the BOM, ${p.mpn ?? "none"} in the record`);
      const fp = bomFootprint(p.catalogId);
      if (r.footprint !== fp) drift.push(`${r.ref} footprint ${r.footprint} in the BOM, ${fp} in the record`);
      if (r.side !== side(p.side)) drift.push(`${r.ref} side ${r.side} in the BOM, ${side(p.side)} in the record`);
      if (r.qty !== "1") drift.push(`${r.ref} qty ${r.qty} in the BOM, one row per placed part`);
    }
  } else if (kind === "cpl") {
    const cpl = readCplFile(text);
    if (cpl === undefined) return ["CPL header is neither the SHUNT body-centre nor the ARMATURE mm-suffix header"];
    designators(cpl.rows.map((r) => r.ref), refs, "CPL");
    for (const r of cpl.rows) {
      const p = byRef.get(r.ref);
      if (p === undefined) continue;
      const d = Math.hypot(r.x - p.x, r.y - p.y);
      if (!(Math.abs(r.x - p.x) <= CPL_TOL_MM && Math.abs(r.y - p.y) <= CPL_TOL_MM)) drift.push(`${r.ref} placed ${Number.isFinite(d) ? d.toFixed(3) : "unreadable"} mm from its body centre`);
      if (!(Math.abs(r.rot - p.rot) <= CPL_ROT_TOL_DEG)) drift.push(`${r.ref} rotation ${r.rot} in the CPL, ${p.rot} in the record`);
      if (r.layer !== side(p.side)) drift.push(`${r.ref} layer ${r.layer} in the CPL, ${side(p.side)} in the record`);
    }
  } else {
    const { nets, repeated } = readNetText(text);
    for (const name of repeated) drift.push(`netlist lists net ${name} more than once`);
    const netted = [...new Set(record.pads.filter((p) => p.net !== "").map((p) => p.ref))];
    designators([...new Set([...nets.values()].flat().map((m) => m.split(".")[0]!))], netted, "netlist");
    for (const n of record.nets) {
      const got = [...(nets.get(n.name) ?? [])].sort().join(" ");
      if (!nets.has(n.name)) drift.push(`net ${n.name} missing from the netlist`);
      else if (got !== n.members.join(" ")) drift.push(`net ${n.name} members differ from the record`);
    }
    for (const name of nets.keys()) if (!record.nets.some((n) => n.name === name)) drift.push(`netlist names net ${name}, which the record does not hold`);
  }
  return drift;
}

const DECODER = new TextDecoder("utf-8");

export function runBrd05(t: TargetOf<"artifact">): readonly Finding[] {
  const at = { level: "artifact" as const, artifact: t.artifact.name };
  const kind = t.artifact.exporter;
  if (!(ASSEMBLY_EXPORTERS as readonly string[]).includes(kind)) return [skip(at, "not run", `artifact ${t.artifact.name} is a ${kind} export; CHK-BRD-05 reads the BOM, CPL and netlist`)];
  const record = t.artifact.part?.board;
  if (record === undefined) return [skip(at, "not run", `no BoardRecord beside ${t.artifact.name}: name the board design so the ${kind} has a record to agree with`)];
  const drift = assemblyDrift(kind, DECODER.decode(t.artifact.bytes), record);
  const ok = drift.length === 0;
  return [boolFinding(at, ok, ok
    ? `${t.artifact.name} agrees with the record by designator (${record.parts.length} parts, ${record.nets.length} nets)`
    : `${t.artifact.name} disagrees with the record: ${drift[0]}${drift.length > 1 ? `, and ${drift.length - 1} more` : ""}; regenerate it from the record`,
  { drift: drift.length, first: drift.slice(0, 5).join("; ") })];
}
