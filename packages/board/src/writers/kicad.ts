// KiCad board writer (M08-T08 step 1, D-090), ported from SPINDLE R1
// kicad_out.py lines 32 to 216 (lineage board.kicad-writer/spindle-r1): a
// KiCad 7 board (version 20221018) with footprints holding real pads,
// segments on F.Cu and B.Cu, vias, Edge.Cuts as lines plus true gr_arc
// corners, silk as editable gr_text, a pour zone and an antenna rule area.
// Only what exists on a fabricated board goes in: no guide sticker, vinyl
// mask or backer (board-pcb.md, KiCad output).
//
// The port writes the S-expression text kicad_out.py wrote, then kicadts
// parses it and its getString() is the file, so the bytes are kicadts'
// own form and a second parse and write is a fixed point (step 3).
// Differences from the legacy, each forced by a rule:
// - every footprint sits at its part's body centre (RecordPart x, y), the
//   CPL's origin, where kicad_out.py used the pad centroid; footprints are
//   written at angle 0 with each pad's own angle, since record pads are in
//   the board frame;
// - tstamps are UUID-shaped digests of the record hash and a counter, never
//   uuid4, and every set array is read in canonicalOrder (record-hash.ts),
//   the order recordHash sorts it in, so the footprints, holes, segments,
//   vias, the first pour and the first antenna keepout, and with them the
//   counter, follow the hash and one record writes one file (D-051);
// - KiCad's y runs down: ky = H - y with H the outline's top (kicad_out.py
//   line 33).

import { parseKicadPcb } from "kicadts";
import { sha256Hex, type BoardRecord, type RecordPad } from "@hackbuild/spec";
import { canonicalRecord } from "../record-hash.js";

/** What the direct generator knows beyond the record (gates.json): silk, zones, the outline corner. */
export interface KicadExtras {
  /** Silk strings: text, anchor x and y (baseline, mm), em size (mm), anchor start, middle or end. */
  readonly silk?: readonly { readonly t: string; readonly x: number; readonly y: number; readonly s: number; readonly anchor: "start" | "middle" | "end" }[];
  /** Silk polylines, mm, with stroke width. */
  readonly silkLines?: readonly { readonly pts: readonly (readonly [number, number])[]; readonly w: number }[];
  /** The outline's corner radius, mm; with it the outline goes out as four lines and four true arcs. */
  readonly corner?: number;
  readonly zones?: {
    readonly pour?: { readonly net: string; readonly layer: string; readonly clearance: number; readonly outline: readonly (readonly [number, number])[] };
    readonly antenna?: { readonly layer: string; readonly outline: readonly (readonly [number, number])[] };
  };
  /** pad_to_mask_clearance, mm (pcb.py MASK_EXP). */
  readonly maskExpansion?: number;
}

const r4 = (v: number): number => {
  const x = Math.round(v * 1e4) / 1e4;
  return x === 0 ? 0 : x;
};

const q = (s: string): string => `"${s.replace(/\\/g, "\\\\").replace(/"/g, "'")}"`;

/** KiCad 7 layer table, kicad_out.py lines 47 to 59. */
const LAYERS: readonly (readonly [number, string, string])[] = [
  [0, "F.Cu", "signal"], [31, "B.Cu", "signal"], [32, "B.Adhes", "user"], [33, "F.Adhes", "user"], [34, "B.Paste", "user"],
  [35, "F.Paste", "user"], [36, "B.SilkS", "user"], [37, "F.SilkS", "user"], [38, "B.Mask", "user"], [39, "F.Mask", "user"],
  [40, "Dwgs.User", "user"], [41, "Cmts.User", "user"], [42, "Eco1.User", "user"], [43, "Eco2.User", "user"],
  [44, "Edge.Cuts", "user"], [45, "Margin", "user"], [46, "B.CrtYd", "user"], [47, "F.CrtYd", "user"], [48, "B.Fab", "user"], [49, "F.Fab", "user"],
];

const KICAD_SHAPE: Readonly<Record<RecordPad["shape"], string>> = { rect: "rect", circle: "circle", oval: "oval", roundrect: "roundrect" };

/** The KiCad text of a record, before kicadts reads it. */
export function kicadText(given: BoardRecord, extras: KicadExtras = {}, generator = "hbf"): string {
  const record = canonicalRecord(given);
  const xs = record.board.outline.map((p) => p[0]);
  const ys = record.board.outline.map((p) => p[1]);
  const W = Math.max(...xs);
  const H = Math.max(...ys);
  const kx = (x: number): number => r4(x);
  const ky = (y: number): number => r4(H - y);
  let n = 0;
  const U = (): string => {
    const h = sha256Hex(`${record.recordHash}:${n++}`);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  };
  const out: string[] = [];
  const A = (s: string): void => {
    out.push(s);
  };
  A(`(kicad_pcb (version 20221018) (generator ${q(generator)})`);
  A(`  (general (thickness ${record.board.thickness}))`);
  A('  (paper "A4")');
  A("  (layers");
  for (const [i, nm, typ] of LAYERS) A(`    (${i} ${q(nm)} ${typ})`);
  A("  )");
  A("  (setup");
  if (extras.maskExpansion !== undefined) A(`    (pad_to_mask_clearance ${extras.maskExpansion})`);
  A("    (grid_origin 0 0)");
  A("  )");
  const netNames = ["", ...record.nets.map((x) => x.name)];
  const NET = new Map(netNames.map((name, i) => [name, i] as const));
  for (const [name, i] of NET) A(`  (net ${i} ${q(name)})`);
  const net = (name: string): string => `(net ${NET.get(name) ?? 0} ${q(name)})`;

  // footprints: one per part at its body centre, then pads with no part grouped by ref
  const byRef = new Map<string, RecordPad[]>();
  for (const p of record.pads) byRef.set(p.ref, [...(byRef.get(p.ref) ?? []), p]);
  const refs = [...byRef.keys()];
  for (const ref of refs) {
    const ps = byRef.get(ref)!;
    const part = record.parts.find((x) => x.ref === ref);
    const ox = part?.x ?? ps.reduce((a, p) => a + p.x, 0) / ps.length;
    const oy = part?.y ?? ps.reduce((a, p) => a + p.y, 0) / ps.length;
    const bottom = (part?.side ?? ps[0]!.side) === "bottom";
    const smd = ps.every((p) => !p.through);
    const lib = (part?.catalogId ?? ref).replace(/^kicad:/, "");
    A(`  (footprint ${q(`hbf:${lib}`)} (layer ${q(bottom ? "B.Cu" : "F.Cu")})`);
    A(`    (tstamp ${U()})`);
    A(`    (at ${kx(ox)} ${ky(oy)})`);
    A(`    (descr ${q(part?.value ?? ref)})`);
    A(`    (attr ${smd ? "smd" : "through_hole"})`);
    A(`    (fp_text reference ${q(ref)} (at 0 -3.2) (layer ${q(bottom ? "B.Fab" : "F.Fab")})`);
    A(`      (effects (font (size 0.8 0.8) (thickness 0.12))) (tstamp ${U()}))`);
    A(`    (fp_text value ${q(part?.value ?? "")} (at 0 3.2) (layer ${q(bottom ? "B.Fab" : "F.Fab")}) hide`);
    A(`      (effects (font (size 0.8 0.8) (thickness 0.12))) (tstamp ${U()}))`);
    for (const p of ps) {
      const dx = r4(p.x - ox);
      const dy = r4(-(p.y - oy));
      const at = p.rot === 0 ? `(at ${dx} ${dy})` : `(at ${dx} ${dy} ${p.rot})`;
      const sh = KICAD_SHAPE[p.shape];
      if (p.through && p.drill !== undefined) {
        const off = p.holeDx !== undefined && Math.abs(p.holeDx) > 1e-6 ? ` (offset ${r4(p.holeDx)} 0)` : "";
        A(`    (pad ${q(p.pin)} thru_hole ${sh} ${at} (size ${p.w} ${p.h}) (drill ${p.drill}${off}) (layers "*.Cu" "*.Mask") ${net(p.net)} (tstamp ${U()}))`);
      } else {
        const L = bottom ? '"B.Cu" "B.Paste" "B.Mask"' : '"F.Cu" "F.Paste" "F.Mask"';
        A(`    (pad ${q(p.pin)} smd ${sh} ${at} (size ${p.w} ${p.h}) (layers ${L}) ${net(p.net)} (tstamp ${U()}))`);
      }
    }
    A("  )");
  }
  // non-plated holes as footprints kept out of placement and the BOM (kicad_out.py lines 133 to 145)
  record.holes.forEach((h, i) => {
    A(`  (footprint "hbf:MountingHole_${h.drill}" (layer "F.Cu") (tstamp ${U()})`);
    A(`    (at ${kx(h.x)} ${ky(h.y)})`);
    A(`    (descr ${q(`${h.role} hole, non-plated`)})`);
    A("    (attr exclude_from_pos_files exclude_from_bom)");
    A(`    (fp_text reference "H${i + 1}" (at 0 -2.6) (layer "F.Fab")`);
    A(`      (effects (font (size 0.7 0.7) (thickness 0.1))) (tstamp ${U()}))`);
    A(`    (fp_text value "" (at 0 2.6) (layer "F.Fab") hide`);
    A(`      (effects (font (size 0.7 0.7) (thickness 0.1))) (tstamp ${U()}))`);
    A(`    (pad "" np_thru_hole circle (at 0 0) (size ${h.drill} ${h.drill}) (drill ${h.drill}) (layers "F&B.Cu" "*.Mask") (tstamp ${U()}))`);
    A("  )");
  });
  // segments per track, zero-length steps dropped (kicad_out.py lines 147 to 158)
  for (const t of record.tracks) {
    for (let i = 1; i < t.pts.length; i += 1) {
      const [x1, y1] = t.pts[i - 1]!;
      const [x2, y2] = t.pts[i]!;
      if (Math.abs(x1 - x2) < 1e-9 && Math.abs(y1 - y2) < 1e-9) continue;
      A(`  (segment (start ${kx(x1)} ${ky(y1)}) (end ${kx(x2)} ${ky(y2)}) (width ${t.width}) (layer ${q(t.layer)}) (net ${NET.get(t.net) ?? 0}) (tstamp ${U()}))`);
    }
  }
  for (const v of record.vias) {
    A(`  (via (at ${kx(v.x)} ${ky(v.y)}) (size ${v.pad}) (drill ${v.drill}) (layers ${q(v.layers[0])} ${q(v.layers[1])}) (net ${NET.get(v.net) ?? 0}) (tstamp ${U()}))`);
  }
  // board outline: four lines and four true arcs for a rounded rectangle, else the ring as lines
  const edgeLine = (x1: number, y1: number, x2: number, y2: number): void => {
    A(`  (gr_line (start ${kx(x1)} ${ky(y1)}) (end ${kx(x2)} ${ky(y2)}) (stroke (width 0.05) (type solid)) (layer "Edge.Cuts") (tstamp ${U()}))`);
  };
  const r = extras.corner;
  if (r !== undefined && r > 0) {
    const arc = (cx: number, cy: number, a0: number, a1: number): void => {
      const pt = (a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const [sx, sy] = pt(a0);
      const [mx, my] = pt((a0 + a1) / 2);
      const [ex, ey] = pt(a1);
      A(`  (gr_arc (start ${kx(sx)} ${ky(sy)}) (mid ${kx(mx)} ${ky(my)}) (end ${kx(ex)} ${ky(ey)}) (stroke (width 0.05) (type solid)) (layer "Edge.Cuts") (tstamp ${U()}))`);
    };
    edgeLine(r, 0, W - r, 0);
    edgeLine(W, r, W, H - r);
    edgeLine(W - r, H, r, H);
    edgeLine(0, H - r, 0, r);
    arc(W - r, r, -Math.PI / 2, 0);
    arc(W - r, H - r, 0, Math.PI / 2);
    arc(r, H - r, Math.PI / 2, Math.PI);
    arc(r, r, Math.PI, 1.5 * Math.PI);
  } else {
    const ring = record.board.outline;
    ring.forEach((p, i) => {
      const nx = ring[(i + 1) % ring.length]!;
      edgeLine(p[0], p[1], nx[0], nx[1]);
    });
  }
  // silk as editable text and lines (kicad_out.py lines 184 to 194)
  const JUST = { start: " (justify left)", middle: "", end: " (justify right)" } as const;
  for (const s of extras.silk ?? []) {
    A(`  (gr_text ${q(s.t)} (at ${kx(s.x)} ${ky(s.y + s.s * 0.35)}) (layer "F.SilkS") (tstamp ${U()})`);
    A(`    (effects (font (size ${r4(Math.round(s.s * 100) / 100)} ${r4(Math.round(s.s * 100) / 100)}) (thickness ${Math.round(s.s * 0.15 * 1000) / 1000}))${JUST[s.anchor]}))`);
  }
  for (const l of extras.silkLines ?? []) {
    for (let i = 1; i < l.pts.length; i += 1) {
      const [x1, y1] = l.pts[i - 1]!;
      const [x2, y2] = l.pts[i]!;
      A(`  (gr_line (start ${kx(x1)} ${ky(y1)}) (end ${kx(x2)} ${ky(y2)}) (stroke (width ${l.w}) (type solid)) (layer "F.SilkS") (tstamp ${U()}))`);
    }
  }
  // zones (kicad_out.py lines 196 to 215); the pour carries no filled polygon, as the legacy wrote it
  const pts = (ring: readonly (readonly [number, number])[]): string => [...ring, ring[0]!].map(([x, y]) => `(xy ${kx(x)} ${ky(y)})`).join(" ");
  const pour = extras.zones?.pour;
  if (pour !== undefined) {
    A(`  (zone (net ${NET.get(pour.net) ?? 0}) (net_name ${q(pour.net)}) (layers ${q(pour.layer)}) (tstamp ${U()})`);
    A(`    (name ${q(`${pour.net} pour`)}) (hatch edge 0.5)`);
    A(`    (connect_pads (clearance ${pour.clearance.toFixed(3)}))`);
    A("    (min_thickness 0.25) (filled_areas_thickness no)");
    A("    (fill yes (thermal_gap 0.3) (thermal_bridge_width 0.5))");
    A(`    (polygon (pts ${pts(pour.outline)}))`);
    A("  )");
  }
  const ant = extras.zones?.antenna;
  if (ant !== undefined) {
    A(`  (zone (net 0) (net_name "") (layers ${q(ant.layer)}) (tstamp ${U()})`);
    A('    (name "antenna keepout") (hatch edge 0.5)');
    A("    (connect_pads (clearance 0)) (min_thickness 0.25)");
    A("    (keepout (tracks not_allowed) (vias not_allowed) (pads allowed)");
    A("      (copperpour not_allowed) (footprints allowed))");
    A("    (fill (thermal_gap 0.3) (thermal_bridge_width 0.5))");
    A(`    (polygon (pts ${pts(ant.outline)}))`);
    A("  )");
  }
  A(")");
  return `${out.join("\n")}\n`;
}

/**
 * The silk strings and zones the writer draws, read from the record
 * (M08-T12 moved them out of gates.json so each has one home): the first
 * pour and the first antenna keepout, and the top silk strings. Silk lines,
 * the corner radius and the mask expansion stay with the generator.
 */
export function kicadExtrasOf(given: BoardRecord): Pick<KicadExtras, "silk" | "zones"> {
  const record = canonicalRecord(given);
  const pour = (record.zones ?? [])[0];
  const ant = (record.keepouts ?? []).find((k) => k.kind === "antenna");
  const silk = (record.silk ?? []).filter((s) => s.side === "top").map((s) => ({ t: s.text, x: s.x, y: s.y, s: s.size, anchor: s.anchor }));
  return {
    ...(silk.length === 0 ? {} : { silk }),
    ...(pour === undefined && ant === undefined ? {} : {
      zones: {
        ...(pour === undefined ? {} : { pour: { net: pour.net, layer: pour.layer, clearance: pour.clearance, outline: pour.outline } }),
        ...(ant === undefined ? {} : { antenna: { layer: ant.layers[0]!, outline: ant.outline } }),
      },
    }),
  };
}

/** The .kicad_pcb file of a record: the port's text read by kicadts and written by it. */
export function writeKicad(record: BoardRecord, extras: KicadExtras = {}, generator = "hbf"): string {
  return parseKicadPcb(kicadText(record, extras, generator)).getString();
}
