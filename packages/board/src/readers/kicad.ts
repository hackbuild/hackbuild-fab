// KiCad readback (M08-T08 step 2, D-090): kicadts reads a .kicad_pcb back
// to the BoardRecord. kicadts is the only parser, so this is the check that
// writer and parser agree, and that the file holds the record: written for
// M08 (D-180, the legacy kiutils readback was never harvested), on the
// method kicad_out.py's README states: absolute pad positions from the
// footprint origin, its angle and the pad offset; position, size
// (orientation free), net and drill offset per pad at 1e-3 mm; vias on
// position, drill and net, the net read by id against the net table (the
// kiutils gotcha, board-pcb.md); every net's member set; each net one
// connected island across layers with tracks, vias and zones rebuilt.
//
// The island test is packages/board/src/connect.ts, the one connectivity
// kernel CHK-BRD-21 shares: pads, segments as capsules, vias as discs, a
// zone joining the items of its net inside it and outside every keepout,
// standing for KiCad's fill (the legacy zone carries no filled polygon).
// The same kernel runs on the record (recordCopper) and the file's shorts
// are compared to the record's by net pair and layer: a short the file
// holds beyond the record's count is the file's own and is named. A short
// the record already holds (SPINDLE R1's 5V to GND, D-249) matches its
// record here; CHK-BRD-21 is the check that fails on it.

import { parseKicadPcb, type Footprint, type KicadPcb } from "kicadts";
import type { BoardRecord } from "@hackbuild/spec";
import { connectivity, padShape, recordCopper, type CopperItem, type CopperShort, type Pt } from "../connect.js";

/** Position, size, drill and offset tolerance, mm (M08-T08 step 2). */
export const READBACK_TOL_MM = 1e-3;

export interface KicadReadback {
  /** Record pads found with equal position, size, net, drill and drill offset, and the pads checked. */
  readonly pads: { readonly matched: number; readonly total: number; readonly misses: readonly string[] };
  readonly vias: { readonly matched: number; readonly total: number; readonly misses: readonly string[] };
  /** Nets whose member set equals the record's. */
  readonly nets: { readonly matched: number; readonly total: number; readonly misses: readonly string[] };
  /** Nets that are one island across layers. */
  readonly islands: { readonly whole: number; readonly total: number; readonly split: readonly string[] };
  /** Touching item pairs of different nets in the file and in the record, and the file's shorts beyond the record's, per net pair and layer. */
  readonly shorts: { readonly file: number; readonly record: number; readonly extra: readonly string[] };
  /** Element counts as kicadts reads them. */
  readonly counts: Readonly<Record<string, number>>;
}

type P = Pt;

/** Element counts of a parsed board. */
export function kicadCounts(pcb: KicadPcb): Record<string, number> {
  return {
    footprints: pcb.footprints.length, pads: pcb.footprints.reduce((a, f) => a + f.fpPads.length, 0), segments: pcb.segments.length,
    vias: pcb.vias.length, nets: pcb.nets.length, zones: pcb.zones.length, grArcs: pcb.graphicArcs.length, grLines: pcb.graphicLines.length,
    grTexts: pcb.graphicTexts.length,
  };
}

const refOf = (f: Footprint): string | undefined =>
  f.fpTexts.find((t) => t.type === "reference")?.text ?? f.properties.find((p) => p.key === "Reference")?.value;

/** KiCad rotates by angle counter-clockwise on screen with y down: (x, y) to (x cos + y sin, -x sin + y cos). */
function rotKicad(x: number, y: number, deg: number): P {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + y * s, -x * s + y * c];
}

/** Read a KiCad board back to the record (step 2); every comparison is at READBACK_TOL_MM. */
export function readbackKicad(text: string, record: BoardRecord): KicadReadback {
  const pcb = parseKicadPcb(text);
  const H = Math.max(...record.board.outline.map((p) => p[1]));
  const toBoard = (x: number, y: number): P => [x, H - y];
  const netName = new Map<number, string>(pcb.nets.map((n) => [n.id ?? 0, n.name ?? ""] as const));
  const near = (a: number, b: number): boolean => Math.abs(a - b) <= READBACK_TOL_MM;

  type FilePad = { ref: string; pin: string; shape: string; at: P; w: number; h: number; angle: number; net: string; drill?: number; dx: number; dy: number; through: boolean; layers: readonly string[] };
  const filePads: FilePad[] = [];
  for (const f of pcb.footprints) {
    const ref = refOf(f) ?? "";
    const pos = f.position;
    const fa = pos !== undefined && "angle" in pos ? pos.angle ?? 0 : 0;
    const fx = f.position?.x ?? 0;
    const fy = f.position?.y ?? 0;
    for (const p of f.fpPads) {
      if (p.padType === "np_thru_hole") continue;
      const [ox, oy] = rotKicad(p.at?.x ?? 0, p.at?.y ?? 0, fa);
      const drill = p.drill?.diameter;
      filePads.push({
        ref, pin: String(p.number ?? ""), shape: String(p.shape ?? ""), at: toBoard(fx + ox, fy + oy), w: p.size?.width ?? 0, h: p.size?.height ?? 0, angle: p.at?.angle ?? 0,
        net: p.net?.name ?? netName.get(p.net?.id ?? 0) ?? "", ...(drill === undefined ? {} : { drill }),
        dx: p.drill?.offset?.x ?? 0, dy: p.drill?.offset?.y ?? 0, through: p.padType === "thru_hole", layers: p.layers?.layers ?? [],
      });
    }
  }
  // KiCad repeats a pad number for two pads of one pin; the record writes the k-th repeat "<n>/<k>" (M08-T06).
  const seen = new Map<string, number>();
  const keyed = new Map<string, FilePad>();
  for (const p of filePads) {
    const k = `${p.ref}.${p.pin}`;
    const c = (seen.get(k) ?? 0) + 1;
    seen.set(k, c);
    keyed.set(c === 1 ? k : `${p.ref}.${p.pin}/${c}`, p);
  }
  const padMiss: string[] = [];
  for (const rp of record.pads) {
    const key = `${rp.ref}.${rp.pin}`;
    const fp = keyed.get(key);
    const why = fp === undefined ? "absent"
      : !near(fp.at[0], rp.x) || !near(fp.at[1], rp.y) ? `at (${fp.at[0].toFixed(3)}, ${fp.at[1].toFixed(3)}) against (${rp.x.toFixed(3)}, ${rp.y.toFixed(3)})`
        : !near(Math.min(fp.w, fp.h), Math.min(rp.w, rp.h)) || !near(Math.max(fp.w, fp.h), Math.max(rp.w, rp.h)) ? `size ${fp.w} x ${fp.h} against ${rp.w} x ${rp.h}`
          : fp.net !== rp.net ? `net ${fp.net} against ${rp.net}`
            : (rp.drill === undefined) !== (fp.drill === undefined) || (rp.drill !== undefined && !near(fp.drill!, rp.drill)) ? `drill ${fp.drill ?? "none"} against ${rp.drill ?? "none"}`
              : !near(fp.dx, rp.holeDx ?? 0) || !near(fp.dy, 0) ? `drill offset ${fp.dx} against ${rp.holeDx ?? 0}`
                : undefined;
    if (why !== undefined) padMiss.push(`${key} ${why}`);
  }
  const viaMiss: string[] = [];
  const fileVias = pcb.vias.map((v) => ({ at: toBoard(v.at?.x ?? 0, v.at?.y ?? 0), drill: v.drill ?? 0, size: v.size ?? 0, net: netName.get(v.net?.id ?? 0) ?? "" }));
  record.vias.forEach((rv, i) => {
    const hit = fileVias.find((v) => near(v.at[0], rv.x) && near(v.at[1], rv.y));
    if (hit === undefined) viaMiss.push(`via ${i} at (${rv.x}, ${rv.y}) absent`);
    else if (!near(hit.drill, rv.drill)) viaMiss.push(`via ${i} drill ${hit.drill} against ${rv.drill}`);
    else if (hit.net !== rv.net) viaMiss.push(`via ${i} net ${hit.net} against ${rv.net}`);
  });
  // member sets
  const members = new Map<string, string[]>();
  for (const [k, p] of keyed) if (p.net !== "") members.set(p.net, [...(members.get(p.net) ?? []), k]);
  const netMiss: string[] = [];
  for (const n of record.nets) {
    const got = [...(members.get(n.name) ?? [])].sort();
    if (got.join(" ") !== [...n.members].sort().join(" ")) netMiss.push(n.name);
  }
  // islands, through the one connectivity kernel (connect.ts)
  const items: CopperItem[] = [];
  const cu = (ls: readonly string[]): string[] => (ls.some((l) => l === "*.Cu" || l === "F&B.Cu") ? ["F.Cu", "B.Cu"] : ls.filter((l) => l.endsWith(".Cu")));
  for (const [k, p] of keyed) {
    // A pad angle is counter-clockwise as seen from the top, so in the board frame (+y up) it is a plain CCW rotation.
    items.push({ net: p.net, layers: cu(p.layers), shape: padShape({ shape: p.shape, x: p.at[0], y: p.at[1], w: p.w, h: p.h, rot: p.angle }), key: k, name: `pad ${k}` });
  }
  for (const s of pcb.segments) {
    const a = toBoard(s.startPoint?.x ?? 0, s.startPoint?.y ?? 0);
    const b = toBoard(s.endPoint?.x ?? 0, s.endPoint?.y ?? 0);
    items.push({ net: netName.get(s.net?.id ?? 0) ?? "", layers: s.layer?.names ?? [], shape: { kind: "seg", a, b, r: (s.width ?? 0) / 2 }, name: "segment" });
  }
  for (const v of fileVias) items.push({ net: v.net, layers: ["F.Cu", "B.Cu"], shape: { kind: "pt", p: v.at, r: v.size / 2 }, name: "via" });
  const zonePts = (z: (typeof pcb.zones)[number]): P[] => (z.polygons[0]?.pts?.points ?? []).flatMap((x) => ("x" in x ? [toBoard(x.x, x.y)] : []));
  const keepouts = pcb.zones.filter((z) => z.keepout !== undefined && z.keepout.copperpour === "not_allowed").map((z) => ({ layers: z.layers?.names ?? [], pts: zonePts(z) }));
  const pours = pcb.zones.filter((z) => z.keepout === undefined).map((z) => ({ net: z.netName ?? netName.get(Number(z.net) || 0) ?? "", layers: z.layers?.names ?? [], pts: zonePts(z) }));
  const conn = connectivity(items, pours, keepouts);
  const split: string[] = [];
  for (const n of record.nets) {
    const c = conn.islands.get(n.name) ?? 0;
    if (c > 1) split.push(`${n.name} in ${c} islands`);
  }
  const rc = recordCopper(record);
  const recShorts = connectivity(rc.items, rc.pours, rc.keepouts).shorts;
  const tally = (ss: readonly CopperShort[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const x of ss) m.set(`${x.nets[0]} to ${x.nets[1]} on ${x.layer}`, (m.get(`${x.nets[0]} to ${x.nets[1]} on ${x.layer}`) ?? 0) + 1);
    return m;
  };
  const want = tally(recShorts);
  const extra = [...tally(conn.shorts)].filter(([k, c]) => c > (want.get(k) ?? 0))
    .map(([k, c]) => `short ${k}: ${c} in the file against ${want.get(k) ?? 0} in the record`).sort();
  return {
    pads: { matched: record.pads.length - padMiss.length, total: record.pads.length, misses: padMiss },
    vias: { matched: record.vias.length - viaMiss.length, total: record.vias.length, misses: viaMiss },
    nets: { matched: record.nets.length - netMiss.length, total: record.nets.length, misses: netMiss },
    islands: { whole: record.nets.length - split.length, total: record.nets.length, split },
    shorts: { file: conn.shorts.length, record: recShorts.length, extra },
    counts: kicadCounts(pcb),
  };
}
