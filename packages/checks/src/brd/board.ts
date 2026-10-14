// CHK-BRD kernels over the one pad and net record (D-089, M08-T12). Each
// takes the BoardRecord both backends fill and, where a catalog row
// decides, the loaded catalog. Coordinates are the record's board frame:
// mm, +y up, top view.

import type { BoardRecord, CatalogPad, CheckCtx, Finding, PinDef, ProfileLookup, RecordPad, Vec2 } from "@hackbuild/spec";
import { expectFinding, expectsFor } from "../expect.js";
import { padFeatureId } from "@hackbuild/board";
import type { Catalog } from "@hackbuild/catalog";
import { boolFinding, fmt, intervalFinding, skip } from "../defs/common.js";

type Target = Finding["target"];
const partAt = (ref: string): Target => ({ level: "part", part: ref });

const rotate = (x: number, y: number, deg: number): Vec2 => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};

/** The hole centre of a drilled pad, board frame: the pad centre moved holeDx along the pad's own x. */
export function holeCentre(p: RecordPad): Vec2 {
  const [dx, dy] = rotate(p.holeDx ?? 0, 0, p.rot);
  return [p.x + dx, p.y + dy];
}

/**
 * Smallest copper left between the drill edge and the pad edge, mm: the
 * SPINDLE rule pad_poly.buffer(-drill/2 - 0.15).contains(hole), read as the
 * margin it leaves (pcb.py drill breakout gate).
 */
export function drillMargin(p: RecordPad): number {
  if (p.drill === undefined) return Number.POSITIVE_INFINITY;
  const r = p.drill / 2;
  const [hx, hy] = holeCentre(p);
  const [lx, ly] = rotate(hx - p.x, hy - p.y, -p.rot);
  if (p.shape === "circle") return p.w / 2 - Math.hypot(lx, ly) - r;
  if (p.shape === "oval") {
    // stadium: the core segment along the long side, radius half the short side
    const long = Math.max(p.w, p.h), short = Math.min(p.w, p.h);
    const half = (long - short) / 2;
    const [u, v] = p.w >= p.h ? [lx, ly] : [ly, lx];
    const d = Math.hypot(Math.max(Math.abs(u) - half, 0), v);
    return short / 2 - d - r;
  }
  return Math.min(p.w / 2 - Math.abs(lx), p.h / 2 - Math.abs(ly)) - r;
}

/** The profile constants the board geometry checks read. */
export const BOARD_LIMIT_ROWS = { drillMargin: "pcb.drillMargin", landing: "pcb.moduleLanding" } as const;

/**
 * drillMargin: copper the SPINDLE gate keeps between a drill and its pad
 * edge (pcb.py, board-pcb.md "Drill position is not pad centre"); landing:
 * how far a catalog module hole may land from its catalog pin, and the
 * mirror tolerance of CHK-BRD-03 (M08-T12 step 2). Both mm, from profile.
 */
export interface BoardLimits {
  readonly drillMargin: number;
  readonly landing: number;
}

export function boardLimits(profile: Pick<ProfileLookup, "constant">): BoardLimits {
  return { drillMargin: profile.constant(BOARD_LIMIT_ROWS.drillMargin).value, landing: profile.constant(BOARD_LIMIT_ROWS.landing).value };
}

/** CHK-BRD-02: every drill inside its own pad with margin, and every module hole on its catalog pin. */
export function brd02(record: BoardRecord, lim: BoardLimits, catalog?: Catalog): readonly Finding[] {
  const out: Finding[] = [];
  for (const p of record.pads.filter((q) => q.drill !== undefined)) {
    const m = drillMargin(p);
    out.push(intervalFinding({ level: "part", part: p.ref }, m, lim.drillMargin, null, "mm",
      `${p.ref}.${p.pin} drill ${fmt(p.drill!, 2)} leaves ${fmt(m, 3)} mm of pad, legal at least ${fmt(lim.drillMargin, 2)}, set by the SPINDLE drill breakout gate`,
      { pad: `${p.ref}.${p.pin}` }));
  }
  if (catalog === undefined) return out;
  for (const part of record.parts) {
    const row = catalog.rows.get(part.catalogId);
    const pins = row?.fields["pins"]?.value as readonly PinDef[] | undefined;
    const pads = row?.fields["pads"]?.value as readonly CatalogPad[] | undefined;
    if (row === undefined || (pins === undefined && pads === undefined)) continue;
    for (const p of record.pads.filter((q) => q.ref === part.ref && q.drill !== undefined)) {
      const cp = pads?.find((c) => c.name === p.pin || c.pad === p.pin);
      const pin = pins?.find((c) => c.name === p.pin || String(c.n) === p.pin);
      const local: Vec2 | undefined = cp !== undefined ? [cp.x + (cp.holeDx ?? 0), cp.y] : pin?.at === undefined ? undefined : [pin.at[0], pin.at[1]];
      if (local === undefined) continue;
      const mx = part.side === "bottom" ? -local[0] : local[0];
      const [rx, ry] = rotate(mx, local[1], part.rot);
      const [hx, hy] = holeCentre(p);
      const d = Math.hypot(part.x + rx - hx, part.y + ry - hy);
      out.push(intervalFinding({ level: "part", part: part.ref }, d, 0, lim.landing, "mm",
        `${p.ref}.${p.pin} hole lands ${fmt(d, 3)} mm from its ${row.id} pin, legal 0 to ${fmt(lim.landing, 2)}, set by the catalog land pattern (${row.fields[cp !== undefined ? "pads" : "pins"]!.provenance.tier})`,
        { pad: `${p.ref}.${p.pin}`, catalogId: row.id }));
    }
  }
  return out;
}


/** CHK-BRD-02 on one pad feature: brd02's findings for that pad. */
export function brd02Pad(record: BoardRecord, featureId: string, lim: BoardLimits, catalog?: Catalog): readonly Finding[] {
  const pad = record.pads.find((p) => padFeatureId(p) === featureId);
  const at: Target = { level: "feature", part: pad?.ref ?? "", feature: featureId };
  if (pad === undefined || pad.drill === undefined) return [];
  const one: BoardRecord = { ...record, pads: [pad], parts: record.parts.filter((q) => q.ref === pad.ref) };
  return brd02(one, lim, catalog).map((f) => ({ ...f, target: at }));
}

/**
 * CHK-BRD-03: a back-mounted part with an asymmetric land pattern must have
 * its catalog pads mirrored. The record pads of the part are compared with
 * the catalog pads placed mirrored and unmirrored; matching only the
 * unmirrored copy fails. A two-pad pattern symmetric under the mirror passes
 * by declaration (SHUNT BT1 at x +/-14.68).
 */
export function brd03(record: BoardRecord, lim: BoardLimits, catalog?: Catalog): readonly Finding[] {
  const out: Finding[] = [];
  for (const part of record.parts.filter((q) => q.side === "bottom")) {
    const cat = catalog?.rows.get(part.catalogId)?.fields["pads"]?.value as readonly CatalogPad[] | undefined;
    const mine = record.pads.filter((p) => p.ref === part.ref);
    if (cat === undefined) {
      // No catalog land pattern: a pattern that maps onto itself under the mirror about the body centre passes by declaration.
      if (mine.length === 0) continue;
      const self = mine.every((p) => mine.some((q) => Math.hypot(2 * part.x - p.x - q.x, p.y - q.y) <= lim.landing && Math.abs(p.w - q.w) <= lim.landing && Math.abs(p.h - q.h) <= lim.landing));
      out.push(self
        ? boolFinding(partAt(part.ref), true, `${part.ref} on the back: its ${mine.length} pads map onto themselves under the mirror about the body centre; passes by declaration (no catalog land pattern for ${part.catalogId})`, { catalogId: part.catalogId })
        : skip(partAt(part.ref), "not run", `${part.ref} on the back has an asymmetric pattern and no catalog land pattern for ${part.catalogId} to compare; add the row or declare the mirror`));
      continue;
    }
    const place = (mirror: boolean) => cat.map((c) => {
      const [rx, ry] = rotate(mirror ? -c.x : c.x, c.y, part.rot);
      return { pad: c.pad, name: c.name, x: part.x + rx, y: part.y + ry };
    });
    const err = (placed: ReturnType<typeof place>) => Math.max(...mine.map((p) => {
      const c = placed.find((q) => q.pad === p.pin || q.name === p.pin);
      return c === undefined ? Number.POSITIVE_INFINITY : Math.hypot(c.x - p.x, c.y - p.y);
    }));
    const mirrored = err(place(true));
    const plain = err(place(false));
    const symmetric = Math.abs(mirrored - plain) < 1e-9;
    const ok = mirrored <= lim.landing || symmetric;
    out.push(boolFinding(partAt(part.ref), ok, ok
      ? symmetric ? `${part.ref} on the back: land pattern symmetric under the mirror, passes by declaration` : `${part.ref} on the back: pads match the mirrored ${part.catalogId} pattern within ${fmt(mirrored, 3)} mm`
      : `${part.ref} on the back: pads match the unmirrored ${part.catalogId} pattern (${fmt(plain, 3)} mm) and miss the mirrored one by ${fmt(mirrored, 3)} mm; mirror the footprint before flipping the part`,
    { catalogId: part.catalogId }));
  }
  return out;
}

/** Ray-cast point in polygon; the ring is closed implicitly. */
export function inside(pt: Vec2, ring: readonly Vec2[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/**
 * CHK-BRD-07, its outline clause: every pad corner, via and track vertex
 * inside the board outline. The unrouted and routed-width clauses need the
 * route the backend reports and are not judged here.
 */
export function brd07Outline(record: BoardRecord): Finding {
  const ring = record.board.outline;
  const bad: string[] = [];
  for (const p of record.pads) {
    const hw = p.w / 2, hh = p.h / 2;
    for (const [cx, cy] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as const) {
      const [rx, ry] = rotate(cx, cy, p.rot);
      if (!inside([p.x + rx, p.y + ry], ring)) { bad.push(`pad ${p.ref}.${p.pin}`); break; }
    }
  }
  record.vias.forEach((v, i) => { if (!inside([v.x, v.y], ring)) bad.push(`via ${i} (${v.net})`); });
  record.tracks.forEach((t, i) => { if (t.pts.some((q) => !inside(q, ring))) bad.push(`track ${i} (${t.net})`); });
  const ok = bad.length === 0;
  return boolFinding({ level: "project" }, ok, ok
    ? `every pad, via and track vertex inside the outline (${record.pads.length} pads, ${record.vias.length} vias, ${record.tracks.length} tracks)`
    : `${bad.length} copper features reach outside the outline: ${bad.slice(0, 5).join(", ")}${bad.length > 5 ? ", ..." : ""}; move them inside the board edge`,
  { outside: bad.length });
}

const twoTerminal = (record: BoardRecord, ref: string): boolean => record.pads.filter((p) => p.ref === ref).length === 2;

/** CHK-BRD-08: every pin of a two-terminal part on a net, and every net member a placed part (ARMATURE D11 K floating). */
export function brd08(record: BoardRecord): readonly Finding[] {
  const refs = new Set(record.parts.map((p) => p.ref));
  return record.parts.filter((p) => twoTerminal(record, p.ref)).map((part) => {
    const loose = record.pads.filter((p) => p.ref === part.ref && p.net === "").map((p) => p.pin);
    const ok = loose.length === 0;
    return boolFinding(partAt(part.ref), ok, ok ? `${part.ref}: both pins on a net` : `${part.ref}: pin ${loose.join(", ")} on no net; a two-terminal part needs both ends connected`);
  }).concat(record.nets.flatMap((n) => n.members.filter((m) => !refs.has(m.split(".")[0]!)).map((m) =>
    boolFinding({ level: "project" }, false, `net ${n.name} member ${m} names no placed part; place the part or drop the member`))));
}

/**
 * CHK-BRD-09: no single-node net unless declared a test point (a net whose
 * name starts TP). With a chase expect entry on the board part (D-074,
 * SHUNT G7 floating nets) the measured set of such nets is compared with
 * the declared one exactly.
 */
export function brd09(record: BoardRecord, partId?: string, ctx?: Pick<CheckCtx, "expect">): readonly Finding[] {
  const expects = partId === undefined || ctx === undefined ? [] : expectsFor(ctx, partId);
  if (expects.length > 0) {
    const single = record.nets.filter((n) => n.members.length < 2 && !/^TP/.test(n.name)).map((n) => n.name);
    return expects.map((e) => expectFinding(partAt(partId!), e, single, `nets with fewer than two members on ${partId}: ${single.length} measured`));
  }
  return record.nets.map((n) => {
    const ok = n.members.length >= 2 || /^TP/.test(n.name);
    return boolFinding({ level: "project" }, ok, ok ? `net ${n.name}: ${n.members.length} members` : `net ${n.name} has ${n.members.length} member (${n.members.join(", ")}); connect it or declare it a test point`, { net: n.name });
  });
}

const SUPPLY = /^(?:\+?\d+V\d*|\d+V\d+|3V3|VCC|VDD|VBUS|VIN|VSYS)(?:_\w+)?$/i;

/**
 * CHK-BRD-20, solder jumpers at their declared default (D-088, M08-T12
 * step 6): with every jumper at its default and every declared bridge
 * closed, no two supply nets that each carry a source meet. A source is a
 * connector pin (designator J) or a power pin of a catalog module row.
 */
export function brd20(record: BoardRecord, catalog?: Catalog): readonly Finding[] {
  const parent = new Map<string, string>();
  const find = (a: string): string => { const p = parent.get(a) ?? a; if (p === a) return a; const r = find(p); parent.set(a, r); return r; };
  const join = (a: string, b: string) => parent.set(find(a), find(b));
  for (const j of record.jumpers) if (j.default === "closed") join(j.joins[0], j.joins[1]);
  for (const b of record.bridges) join(b.nets[0], b.nets[1]);
  const isModule = (ref: string): boolean => {
    const id = record.parts.find((p) => p.ref === ref)?.catalogId;
    return id !== undefined && catalog?.rows.get(id)?.kind === "module";
  };
  const sourced = new Map<string, string[]>();
  for (const p of record.pads) {
    if (!SUPPLY.test(p.net)) continue;
    if (/^J\d+$/.test(p.ref) || isModule(p.ref)) sourced.set(p.net, [...(sourced.get(p.net) ?? []), `${p.ref}.${p.pin}`]);
  }
  const groups = new Map<string, string[]>();
  for (const n of sourced.keys()) groups.set(find(n), [...(groups.get(find(n)) ?? []), n]);
  if (record.jumpers.length === 0) return [skip({ level: "project" }, "not run", "the record declares no solder jumper")];
  const out: Finding[] = record.jumpers.map((j) => {
    const g = groups.get(find(j.joins[0])) ?? [];
    const ok = !(j.default === "closed" && g.length > 1);
    return boolFinding({ level: "part", part: j.ref }, ok, ok
      ? `${j.ref} default ${j.default}: ${j.joins.join(" and ")} ${j.default === "open" ? "stay apart" : "join with one source"}`
      : `${j.ref} default closed joins ${g.join(" and ")}, each fed (${g.map((n) => sourced.get(n)!.join(", ")).join("; ")}); never feed J5 while the SJ1 bridge is intact and USB is plugged in. default the jumper open (D-088)`,
    { jumper: j.ref, default: j.default });
  });
  return out;
}
