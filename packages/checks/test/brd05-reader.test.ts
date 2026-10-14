// CHK-BRD-05 reads the board's BOM, CPL and netlist with readers of its
// own. Independent sources: the shipped SHUNT CPL (shunt/files/fab/
// shunt-CPL.csv, gen_fab.py), the shipped ARMATURE CPL
// (ARMATURE-R1_CPL.csv) and the shipped SPINDLE netlist and CPL
// (spindle/files/fab/), all under fab-knowledge/originals. The mutants are
// the writer faults audit3 planted (fab-knowledge/evidence/audit3/verify/
// checks-brd05): a body-centre header with Mid X and Mid Y swapped, and a
// footprint left with its `kicad:` prefix. With the old shared readers both
// passed; each must fail now.

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, expect, test } from "vitest";
import type { BoardRecord } from "@hackbuild/spec";
import { withHash, writeBom, writeCpl, writeNetlist } from "@hackbuild/board";
import { assemblyDrift, runBrd05 } from "../src/brd/assembly";
import { bomFootprint, readBomFile, readCplFile, readNetText, splitCsv, unguard } from "../src/brd/read-assembly";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const ORIGINALS = originalPath("").replace(/\/$/, "");
const SHUNT_CPL = `${ORIGINALS}/shunt/files/fab/shunt-CPL.csv`;
const ARMATURE_CPL = `${ORIGINALS}/armature/files/ARMATURE-R1_CPL.csv`;
const SPINDLE_FAB = `${ORIGINALS}/spindle/files/fab`;

const rec: BoardRecord = withHash({
  schema: 1, backend: "direct", board: { outline: [[0, 0], [20, 0], [20, 20], [0, 20]], thickness: 1.6, copperLayers: 2 },
  parts: [
    { ref: "R1", value: "10k", mpn: "RC0805FR-0710KL", catalogId: "kicad:R_0805_2012Metric", tier: "community", side: "top", x: 6, y: 5, rot: 90, body: { w: 2, h: 1, z: 0 } },
    { ref: "C1", value: "-5V rail", catalogId: "kicad:C_0805_2012Metric", tier: "community", side: "bottom", x: 6.25, y: 9.5, rot: 0, body: { w: 2, h: 1, z: 0 } },
  ],
  pads: [], nets: [], vias: [], holes: [], tracks: [], jumpers: [], bridges: [], reads: [],
} as unknown as Omit<BoardRecord, "recordHash">);
const art = (exporter: string, text: string) => ({ level: "artifact" as const, artifact: { exporter, name: `t.${exporter}`, bytes: new TextEncoder().encode(text), part: { board: rec } as never } });
const verdicts = (fs: readonly { verdict: string }[]) => fs.map((f) => f.verdict);

describe("the readers against the shipped legacy files", () => {
  test.skipIf(!existsSync(SHUNT_CPL))("SHUNT shunt-CPL.csv reads as body-centre, 28 placements, U1 at 105.810, 80.190", () => {
    const cpl = readCplFile(readFileSync(SHUNT_CPL, "utf8"))!;
    expect(cpl.dialect).toBe("body-centre");
    expect(cpl.rows).toHaveLength(28);
    expect(cpl.rows[0]).toEqual({ ref: "U1", x: 105.81, y: 80.19, rot: 0, layer: "Top" });
  });

  test.skipIf(!existsSync(ARMATURE_CPL))("ARMATURE-R1_CPL.csv reads as mm-suffix, C1 at 19.000 mm, 55.500 mm", () => {
    const cpl = readCplFile(readFileSync(ARMATURE_CPL, "utf8"))!;
    expect(cpl.dialect).toBe("mm-suffix");
    expect(cpl.rows[0]).toEqual({ ref: "C1", x: 19, y: 55.5, rot: 0, layer: "Top" });
  });

  test.skipIf(!existsSync(SPINDLE_FAB))("SPINDLE's pad-centroid CPL header (MidX, MidY) is neither dialect; its netlist reads net by net", () => {
    expect(readCplFile(readFileSync(path.join(SPINDLE_FAB, "spindle-CPL.csv"), "utf8"))).toBeUndefined();
    const { nets, repeated } = readNetText(readFileSync(path.join(SPINDLE_FAB, "spindle-netlist.txt"), "utf8"));
    expect(repeated).toEqual([]);
    expect(nets.get("5V_MOD")).toEqual(["U1.5V", "JP1.1"]);
    expect(nets.get("3V3")).toEqual(["U1.3V3", "J6.4", "R4.1"]);
  });

  test("RFC 4180 split: quoted comma, doubled quote, CRLF", () => {
    expect(splitCsv('a,"b,c","say ""hi"""\r\nd,,e\n')).toEqual([["a", "b,c", 'say "hi"'], ["d", "", "e"]]);
  });

  test("the formula guard comes off one quote; a quote before plain text stays", () => {
    expect(["'=SUM(A1)", "'-5V", "''+x", "'abc", "10k"].map(unguard)).toEqual(["=SUM(A1)", "-5V", "'+x", "'abc", "10k"]);
  });

  test("a BOM footprint drops only the kicad: library prefix", () => {
    expect(bomFootprint("kicad:R_0805_2012Metric")).toBe("R_0805_2012Metric");
    expect(bomFootprint("lcsc:C17414")).toBe("lcsc:C17414");
  });
});

describe("CHK-BRD-05 on the writers' output and on planted writer faults", () => {
  test("pass: BOM, both CPL dialects and the netlist as the writers write them", () => {
    for (const [k, t] of [["bom", writeBom(rec)], ["cpl", writeCpl(rec)], ["cpl", writeCpl(rec, "mm-suffix")], ["netlist", writeNetlist(rec)]] as const) {
      expect(assemblyDrift(k, t, rec), k).toEqual([]);
      expect(verdicts(runBrd05(art(k, t))), k).toEqual(["pass"]);
    }
    expect(readBomFile(writeBom(rec))!.find((r) => r.ref === "C1")!.value).toBe("-5V rail");
  });

  test("fail: the body-centre header with Mid X and Mid Y swapped (audit3 writer mutant)", () => {
    const text = writeCpl(rec);
    const mutant = text.replace("Designator,Mid X,Mid Y,", "Designator,Mid Y,Mid X,");
    expect(mutant).not.toBe(text);
    expect(verdicts(runBrd05(art("cpl", mutant)))).toEqual(["fail"]);
  });

  test("fail: X and Y swapped under a correct header, which the coordinates expose", () => {
    const mutant = writeCpl(rec).replace("R1,6.000,5.000,", "R1,5.000,6.000,");
    expect(assemblyDrift("cpl", mutant, rec)).toEqual(["R1 placed 1.414 mm from its body centre"]);
  });

  test("fail: a footprint written with its kicad: prefix (audit3 writer mutant)", () => {
    const mutant = writeBom(rec).replace(",R_0805_2012Metric,", ",kicad:R_0805_2012Metric,");
    expect(assemblyDrift("bom", mutant, rec)).toEqual(["R1 footprint kicad:R_0805_2012Metric in the BOM, R_0805_2012Metric in the record"]);
    expect(verdicts(runBrd05(art("bom", mutant)))).toEqual(["fail"]);
  });

  test("fail: BOM columns reordered, a wrong MPN, a rotation off, a body-centre row with mm, a repeated net", () => {
    const bom = writeBom(rec);
    expect(assemblyDrift("bom", bom.replace("Designator,Value,MPN,", "Designator,MPN,Value,"), rec)).toEqual(["BOM header is not Designator,Value,MPN,Footprint,Side,Qty,Note"]);
    expect(assemblyDrift("bom", bom.replace("RC0805FR-0710KL", "RC0805FR-071KL"), rec)).toEqual(["R1 MPN RC0805FR-071KL in the BOM, RC0805FR-0710KL in the record"]);
    expect(assemblyDrift("cpl", writeCpl(rec).replace("R1,6.000,5.000,90.0", "R1,6.000,5.000,0.0"), rec)).toEqual(["R1 rotation 0 in the CPL, 90 in the record"]);
    expect(assemblyDrift("cpl", writeCpl(rec).replace("R1,6.000,", "R1,6.000mm,"), rec)).toEqual(["R1 placed unreadable mm from its body centre"]);
    expect(assemblyDrift("netlist", "A          R1.1\nA          R1.1\n", { ...rec, nets: [{ name: "A", members: ["R1.1"] }] } as BoardRecord)).toContain("netlist lists net A more than once");
  });
});

describe("CHK-BRD-05 against a mutated copy of the built board writer", () => {
  // Reads packages/board/dist, so rebuild board before trusting this suite.
  // Each mutant changes the writer module as a whole: its header table and
  // footprint function move for the writer and for the readers beside it,
  // which is the fault a check sharing those readers could not see.
  const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "board", "dist");
  const work = mkdtempSync(path.join(tmpdir(), "hbf-brd05-"));
  afterAll(() => rmSync(work, { recursive: true, force: true }));
  const src = readFileSync(path.join(DIST, "writers", "assembly.js"), "utf8")
    .replace('from "../record-hash.js"', `from ${JSON.stringify(pathToFileURL(path.join(DIST, "record-hash.js")).href)}`);
  async function mutant(name: string, from: string, to: string): Promise<typeof import("@hackbuild/board")> {
    expect(src.includes(from), `${name}: the writer no longer holds ${from}`).toBe(true);
    const file = path.join(work, `${name}.mjs`);
    writeFileSync(file, src.split(from).join(to));
    return (await import(pathToFileURL(file).href)) as typeof import("@hackbuild/board");
  }

  test("the unmutated copy passes, so the harness itself moves nothing", async () => {
    const w = await mutant("same", '"Designator,Mid X,Mid Y,Rotation,Layer"', '"Designator,Mid X,Mid Y,Rotation,Layer"');
    expect(assemblyDrift("cpl", w.writeCpl(rec), rec)).toEqual([]);
    expect(assemblyDrift("bom", w.writeBom(rec), rec)).toEqual([]);
  });

  test("fail: two body-centre header columns swapped in the writer", async () => {
    const w = await mutant("cpl-head", '"Designator,Mid X,Mid Y,Rotation,Layer"', '"Designator,Mid Y,Mid X,Rotation,Layer"');
    expect(w.readCpl(w.writeCpl(rec))).toBeDefined();
    expect(verdicts(runBrd05(art("cpl", w.writeCpl(rec))))).toEqual(["fail"]);
  });

  test("fail: the writer's footprint function keeps the kicad: prefix", async () => {
    const w = await mutant("footprint", 'p.catalogId.startsWith("kicad:") ? p.catalogId.slice("kicad:".length) : p.catalogId', "p.catalogId");
    expect(verdicts(runBrd05(art("bom", w.writeBom(rec))))).toEqual(["fail"]);
  });
});

describe("the check stays independent of the board writer", () => {
  // The tools/tiers.json forbid row for this folder is a followup (tools/ is
  // outside this package); this keeps the rule inside the suite until then.
  const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "brd");
  const SHARED = /\b(?:readBom|readCpl|readNetlist|footprintOf|parseCsv|csvText|uncsvText|CPL_HEADER|BOM_HEADER)\b/;
  test("no file under packages/checks/src/brd names the board's readers, CSV parser, footprint function or header tables", () => {
    const hits = readdirSync(DIR).filter((f) => f.endsWith(".ts"))
      .flatMap((f) => readFileSync(path.join(DIR, f), "utf8").split("\n").map((l, i) => [`${f}:${i + 1}`, l] as const))
      .filter(([, l]) => SHARED.test(l)).map(([at]) => at);
    expect(hits).toEqual([]);
  });
});
