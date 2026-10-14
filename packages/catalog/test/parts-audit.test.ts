// Row audit for the two direct-route references (M08-T03 step 9). SPINDLE
// R1's pcb.py hand-codes the pads of J1 to J6, Q1, R2 to R4, C1, C2 and JP1;
// each is compared with the KiCad library footprint kicad_out.py names for
// it (or the nearest the frozen v5 mirror holds), fetched with
// tools/py/board/kicad_fetch.py get into the evidence folder below and
// pinned by sha256. Equal within 0.01 mm on every pad position (relative to
// pad 1, any quarter turn), size and drill gives a community row citing the
// footprint file; anything else is inferred, naming the difference. SHUNT
// R1 places 10 KiCad v5 footprints from its parts/ folder (community) and
// three parametric stand-ins "from remembered datasheet dimensions" (README
// open list item 2), inferred. Nothing is promoted to make an export pass.
//
// HBF_AUDIT_RECORD=1 npx vitest run packages/catalog/test/parts-audit.test.ts
// writes reference/boards/{spindle-r1,shunt-art}/parts.audit.json; without
// it the test compares the committed files with a fresh run.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { kicadModPads, type ModPad } from "../src/kicad-mod";

interface HandPad { readonly pin: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly drill: number | null; readonly line: number }
interface Cmp { readonly pin: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly drill: number | null }
interface AuditRow { readonly ref: string; readonly tier: string; readonly [k: string]: unknown }

const ROOT = new URL("../../../", import.meta.url);
const RECORD = process.env.HBF_AUDIT_RECORD === "1";
const CORPUS = "/Users/obsidian/Projects/hackbuild/fab-work-directory/benches";
const KICAD = "/Users/obsidian/Projects/hackbuild/fab-knowledge/evidence/m08-catalog/kicad";
const MIRROR = "github.com/KiCad/kicad-footprints at 7ebfa6b23cc292a56f751b7b5f4a0e12eeef69dd (2020-10-02, frozen v5 mirror)";
const TOL = 0.01;
const sha = (b: string | Uint8Array): string => createHash("sha256").update(b).digest("hex");
const r6 = (v: number): number => Math.round(v * 1e6) / 1e6;

// ---- SPINDLE R1 pads as pcb.py writes them ----
const PCB = `${CORPUS}/spindle/outputs/spindle/pcb.py`;
const pcbText = readFileSync(PCB, "utf8");
const pcbLines = pcbText.split("\n");
const PCB_SHA = "650351218717462917332d02c7cfb70883ad3a66ffad24b0e2756b90ce8a3176";
if (sha(pcbText) !== PCB_SHA) throw new Error(`pcb.py sha256 moved from the card's ${PCB_SHA}`);

/** Literal pad(...) calls with ref= and pin=, by ref. */
function literalPads(): Map<string, HandPad[]> {
  const out = new Map<string, HandPad[]>();
  const re = /pad\("[^"]*",\s*([\d.]+),\s*([\d.]+|PY\["5V"\]),\s*([\d.]+),\s*([\d.]+)(.*?)ref="(\w+)",\s*pin="(\w+)"/;
  pcbLines.forEach((l, i) => {
    const m = re.exec(l);
    if (m === null) return;
    const [, x, y, w, h, rest, ref, pin] = m as unknown as string[] & { length: 8 };
    if (x === undefined || y === undefined || w === undefined || h === undefined || rest === undefined || ref === undefined || pin === undefined) return;
    const drill = /drill=([\d.]+)/.exec(rest);
    const yv = y === 'PY["5V"]' ? 0 : Number(y);
    const list = out.get(ref) ?? [];
    list.push({ pin, x: Number(x), y: yv, w: Number(w), h: Number(h), drill: drill === null ? null : Number(drill[1]), line: i + 1 });
    out.set(ref, list);
  });
  return out;
}

/** hdr() and J6 pads: a column or row at PITCH 2.54 (pcb.py line 57), size and drill from the call. */
function headerPads(n: number, size: number, drill: number, axis: "x" | "y", line: number): HandPad[] {
  return Array.from({ length: n }, (_, k) => ({ pin: String(k + 1), x: axis === "x" ? k * 2.54 : 0, y: axis === "y" ? -k * 2.54 : 0, w: size, h: size, drill, line }));
}

const lit = literalPads();
const SPINDLE = [
  { refs: ["J1", "J2"], fp: "PinHeader_1x06_P2.54mm_Vertical", file: "PinHeader_1x06_P2.54mm_Vertical.kicad_mod", pads: headerPads(6, 1.7, 1.0, "y", 99) },
  { refs: ["J6"], fp: "PinHeader_1x06_P2.54mm_Vertical", file: "PinHeader_1x06_P2.54mm_Vertical.kicad_mod", pads: headerPads(6, 1.6, 1.0, "x", 121) },
  { refs: ["J4"], fp: "PinHeader_1x02_P2.54mm_Vertical", file: "PinHeader_1x02_P2.54mm_Vertical.kicad_mod", pads: lit.get("J4") },
  { refs: ["J3"], fp: "TerminalBlock_P5.08mm_2pol (not in the library; nearest TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal)", file: "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal.kicad_mod", pads: lit.get("J3") },
  { refs: ["J5"], fp: "TerminalBlock_P5.08mm_2pol (not in the library; nearest TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal)", file: "TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal.kicad_mod", pads: lit.get("J5") },
  { refs: ["Q1"], fp: "SOT-23", file: "SOT-23.kicad_mod", pads: lit.get("Q1") },
  { refs: ["R2"], fp: "R_0805_2012Metric", file: "R_0805_2012Metric.kicad_mod", pads: lit.get("R2") },
  { refs: ["R3"], fp: "R_0805_2012Metric", file: "R_0805_2012Metric.kicad_mod", pads: lit.get("R3") },
  { refs: ["R4"], fp: "R_0805_2012Metric", file: "R_0805_2012Metric.kicad_mod", pads: lit.get("R4") },
  { refs: ["C1"], fp: "CP_Radial_D6.3mm_P5.08mm (not in the library; nearest CP_Radial_D6.3mm_P2.50mm)", file: "CP_Radial_D6.3mm_P2.50mm.kicad_mod", pads: lit.get("C1") },
  { refs: ["C2"], fp: "C_0805_2012Metric", file: "C_0805_2012Metric.kicad_mod", pads: lit.get("C2") },
  { refs: ["JP1"], fp: "SolderJumper_2_Open (not in the library; nearest SolderJumper-2_P1.3mm_Open_Pad1.0x1.5mm)", file: "SolderJumper-2_P1.3mm_Open_Pad1.0x1.5mm.kicad_mod", pads: lit.get("JP1") },
];

const turn = (p: Cmp, q: number): Cmp => {
  // q quarter turns CCW about the origin
  let { x, y, w, h } = p;
  for (let i = 0; i < q; i++) [x, y, w, h] = [-y, x, h, w];
  return { ...p, x, y, w, h };
};

/** Differences between hand pads and library pads, both relative to pad 1, at the best quarter turn. */
function compare(hand: readonly HandPad[] | undefined, lib: readonly ModPad[]): { turn: number | null; diffs: string[] } {
  if (hand === undefined) throw new Error("hand pads missing");
  if (hand.length !== lib.length) return { turn: null, diffs: [`pad count ${hand.length} against ${lib.length}`] };
  const rel = (ps: readonly Cmp[]): Cmp[] => { const p1 = ps.find((p) => p.pin === "1") ?? ps[0]!; return ps.map((p) => ({ ...p, x: p.x - p1.x, y: p.y - p1.y })); };
  const h = rel(hand);
  let best: { turn: number | null; diffs: string[]; off: number } | null = null;
  for (let q = 0; q < 4; q++) {
    const l = rel(lib.map((p) => turn({ pin: p.pad, x: p.x, y: p.y, w: p.w, h: p.h, drill: p.drill ?? null }, q)));
    const diffs: string[] = [];
    let off = 0;
    for (const a of h) {
      const b = l.find((p) => p.pin === a.pin);
      if (b === undefined) { diffs.push(`pin ${a.pin} has no library pad`); continue; }
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      off += d;
      if (d > TOL) diffs.push(`pin ${a.pin} position off ${r6(d)} mm (computed)`);
      if (Math.abs(a.w - b.w) > TOL || Math.abs(a.h - b.h) > TOL) diffs.push(`pin ${a.pin} size ${a.w} x ${a.h} against ${r6(b.w)} x ${r6(b.h)} mm`);
      if ((a.drill ?? 0) !== 0 || (b.drill ?? 0) !== 0) if (Math.abs((a.drill ?? 0) - (b.drill ?? 0)) > TOL) diffs.push(`pin ${a.pin} drill ${a.drill ?? "none"} against ${b.drill ?? "none"} mm`);
    }
    // fewest differences, then the smallest summed position error, so a part placed on its side is compared on its side
    if (best === null || diffs.length < best.diffs.length || (diffs.length === best.diffs.length && off < best.off - 1e-9)) best = { turn: q * 90, diffs, off };
  }
  return { turn: best!.turn, diffs: best!.diffs };
}

function spindleAudit() {
  const rows: AuditRow[] = [];
  for (const s of SPINDLE) {
    const bytes = readFileSync(`${KICAD}/${s.file}`);
    const lib = kicadModPads(bytes.toString("utf8"), s.file);
    const c = compare(s.pads, lib);
    for (const ref of s.refs) {
      const lines = [...new Set((s.pads ?? []).map((p) => p.line))].sort((a, b) => a - b);
      rows.push({
        ref, footprint: s.fp, libraryFile: s.file, librarySha256: sha(bytes),
        handPads: `pcb.py line${lines.length > 1 ? "s" : ""} ${lines.join(", ")}`,
        quarterTurn: c.turn,
        tier: c.diffs.length === 0 ? "community" : "inferred",
        method: c.diffs.length === 0 ? "listing" : "derived",
        differences: c.diffs,
      });
    }
  }
  return {
    reference: "spindle-r1", date: "2026-10-09", tolerance: `${TOL} mm`, library: MIRROR,
    source: `benches/spindle/outputs/spindle/pcb.py sha256 ${PCB_SHA}; footprint names from kicad_out.py FPDESC lines 83 to 98`,
    rows,
    verdict: rows.some((r) => r.tier === "inferred") ? "CHK-BRD-06 fails: a hand pad stays inferred until a person fixes the row; gerbers return exit 4" : "CHK-BRD-06 passes",
  };
}

function shuntAudit() {
  const dir = `${CORPUS}/shunt/outputs/shunt-r1`;
  const board = JSON.parse(readFileSync(`${dir}/board.json`, "utf8"));
  const readme = readFileSync(`${dir}/README.md`, "utf8").split("\n");
  const standIn = new Map<string, { part: string; line: number }>();
  readme.forEach((l: string, i: number) => { const m = /^\| (J1|J2|SW1) \| (.+?) \| parametric stand-in \|$/.exec(l); if (m?.[1] !== undefined && m[2] !== undefined) standIn.set(m[1], { part: m[2], line: i + 1 }); });
  const rows: AuditRow[] = (board.parts as { ref: string; fp: string }[]).map((p): AuditRow => {
    const fpFile = `${dir}/parts/${p.fp}.kicad_mod`;
    if (standIn.has(p.ref)) {
      const s = standIn.get(p.ref)!;
      return { ref: p.ref, footprint: p.fp, tier: "inferred", method: "derived", source: `parametric stand-in ${s.part} (README.md line ${s.line}); "from remembered datasheet dimensions, not measured parts" (README.md open list item 2)` };
    }
    if (!existsSync(fpFile)) return { ref: p.ref, footprint: p.fp, tier: "inferred", method: "derived", source: `no parts/${p.fp}.kicad_mod beside board.json` };
    const bytes = readFileSync(fpFile);
    const pads = kicadModPads(bytes.toString("utf8"), `${p.fp}.kicad_mod`);
    return { ref: p.ref, footprint: p.fp, tier: "community", method: "listing", source: `shunt-r1/parts/${p.fp}.kicad_mod sha256 ${sha(bytes)}, ${pads.length} pads, KiCad v5 library, mirror frozen 2020-10` };
  });
  return {
    reference: "shunt-art", date: "2026-10-09", source: "benches/shunt/outputs/shunt-r1/board.json sha256 db835634c13a8661fb0ac20132e55e11190e6f3262fa20f07f5a69fe3b08d375 and README.md",
    rows,
    verdict: rows.some((r) => r.tier === "inferred") ? "CHK-BRD-06 fails on the parametric stand-ins until a person measures them" : "CHK-BRD-06 passes",
  };
}

describe("parts audit (M08-T03 step 9)", () => {
  for (const [id, make] of [["spindle-r1", spindleAudit], ["shunt-art", shuntAudit]] as const) {
    test(`${id}: the committed parts.audit.json equals a fresh audit`, () => {
      const file = new URL(`reference/boards/${id}/parts.audit.json`, ROOT);
      const text = `${JSON.stringify(make(), null, 2)}\n`;
      if (RECORD) writeFileSync(file, text);
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, "utf8")).toBe(text);
    });
  }
});
