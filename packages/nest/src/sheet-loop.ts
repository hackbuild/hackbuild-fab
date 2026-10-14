// The sheet loop: one entry, nest(request), for every mode. It expands
// items into copies, groups them by stock (or by part id for plates),
// runs the candidate packers on each group, keeps the candidate with the
// fewest sheets (ties to the lower index of the fixed list), and resolves
// gap "auto" over the same choice (M07-T03 steps 3 to 5, D-137). With
// partInPart, every candidate runs a second time on the roots the
// part-in-part pass leaves (part-in-part.ts); the fewer sheets win and a tie
// goes to the layout without part-in-part (M07-T05 step 4). In
// assembly-order mode every candidate packs step by step
// (assembly-order.ts stepLayout, M07-T09). No clock
// and no unseeded draw is consulted here (tools/tiers.json forbid rows),
// so one request gives one layoutHash.

import {
  commandError, type NestItem, type NestRequest, type NestResult, type Packer, type Placement, type QuarterTurn, type SortOrder,
} from "@hackbuild/spec";
import type { Geom } from "@hackbuild/geom";
import { requireSteps, stepLayout } from "./assembly-order.js";
import { autoGap } from "./autogap.js";
import { extentOf, type Box, type Frame, type Packing } from "./box.js";
import { layoutHash } from "./hash.js";
import { maxrectsPack, ORDER_LIST } from "./maxrects.js";
import { composePlacement, keyOf, nestHoles, ringsById, type Nesting } from "./part-in-part.js";
import { shelfPack } from "./shelf.js";

interface Candidate {
  readonly packer: Packer;
  readonly order?: SortOrder;
  readonly run: (boxes: readonly Box[], frame: Frame) => Packing;
  /** Packs the roots of the part-in-part pass instead of every copy. */
  readonly pip?: boolean;
}

interface Layout {
  readonly candidate: Candidate;
  readonly sheets: number;
  readonly placements: readonly Placement[];
  readonly oversize: ReadonlySet<string>;
  /** Copies left off as oversize, count. */
  readonly dropped: number;
  /** Footprint area per sheet, mm2. */
  readonly area: readonly number[];
}

const TURNS: readonly QuarterTurn[] = [0, 90, 180, 270];

const shelf: Candidate = { packer: "shelf", run: shelfPack };
const maxrects = (order: SortOrder): Candidate => ({ packer: "maxrects-bssf", order, run: (b, f) => maxrectsPack(b, f, order) });

const refuse = (path: string, got: unknown, expected: string, hint: string): never => {
  throw commandError({ code: "E_SCHEMA", path, got, expected, hint });
};

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Refuses a request nest cannot take with E_SCHEMA; packSheets runs it before the kernels. */
export function validate(req: NestRequest): void {
  if (!Array.isArray(req.items)) refuse("/items", req.items, "an array of NestItem", "give items as an array");
  const seen = new Set<string>();
  req.items.forEach((it: NestItem, i) => {
    if (typeof it.id !== "string" || it.id === "") refuse(`/items/${i}/id`, it.id, "a non-empty string", "name every item");
    if (seen.has(it.id)) refuse(`/items/${i}/id`, it.id, "an id unique within the request", `item id ${it.id} appears twice; merge the copies into qty`);
    seen.add(it.id);
    if (!Number.isInteger(it.qty) || it.qty < 0) refuse(`/items/${i}/qty`, it.qty, "a whole count, 0 or more", "set qty to a whole number");
    if (it.step !== undefined && !(Number.isInteger(it.step) && it.step >= 0)) refuse(`/items/${i}/step`, it.step, "an assembly step, a whole number from 0", "set the step to a whole number or leave it out");
    if (typeof it.stock !== "string" || it.stock === "") refuse(`/items/${i}/stock`, it.stock, "a stock id", "name the stock the item is cut from");
    if (!Array.isArray(it.rings) || it.rings.length === 0) refuse(`/items/${i}/rings`, it.rings, "at least one ring", "give the item its outer ring");
    it.rings.forEach((ring, r) => {
      if (!Array.isArray(ring) || ring.length < 3) refuse(`/items/${i}/rings/${r}`, ring, "a ring of 3 or more vertices", "close the ring with 3 or more vertices");
      ring.forEach((p, k) => {
        if (!Array.isArray(p) || p.length !== 2 || !finite(p[0]) || !finite(p[1])) refuse(`/items/${i}/rings/${r}/${k}`, p, "[x, y] in mm, finite", "give each vertex as two finite numbers");
      });
    });
    (it.holes ?? []).forEach((h, k) => {
      if (typeof h.feature !== "string" || h.feature === "") refuse(`/items/${i}/holes/${k}/feature`, h.feature, "a feature id", "name the hole feature");
      if (!Array.isArray(h.at) || !finite(h.at[0]) || !finite(h.at[1])) refuse(`/items/${i}/holes/${k}/at`, h.at, "[x, y] in mm, finite", "give a point inside the hole");
    });
    (it.hubs ?? []).forEach((hub, k) => {
      if (!finite(hub.bore) || hub.bore < 0 || !finite(hub.outer) || hub.outer <= hub.bore) refuse(`/items/${i}/hubs/${k}`, hub, "bore radius 0 or more and an outer radius above it, mm", "give the hub bore and outer radii in mm");
      hub.holes.forEach((h, n) => {
        if (!finite(h.d) || h.d <= 0 || !finite(h.r) || h.r < 0) refuse(`/items/${i}/hubs/${k}/holes/${n}`, h, "d above 0 and r 0 or more, mm", "give the hub hole diameter and radius in mm");
      });
    });
  });
  const [W, H] = req.sheet ?? [];
  if (!finite(W) || !finite(H) || W <= 0 || H <= 0) refuse("/sheet", req.sheet, "[width, height] in mm, both above 0", "give the sheet size in mm");
  if (!finite(req.margin) || req.margin < 0) refuse("/margin", req.margin, "a margin in mm, 0 or more", "set the margin in mm");
  if (req.gap !== "auto" && (!finite(req.gap) || req.gap < 0)) refuse("/gap", req.gap, "a gap in mm, 0 or more, or \"auto\"", "set the gap in mm or auto");
  if (!Array.isArray(req.rotations) || req.rotations.length === 0) refuse("/rotations", req.rotations, "one or more of 0, 90, 180, 270", "allow at least one rotation");
  req.rotations.forEach((r, i) => {
    if (!TURNS.includes(r)) refuse(`/rotations/${i}`, r, "0, 90, 180 or 270", "use quarter turns only");
  });
  if (!Number.isInteger(req.seed)) refuse("/seed", req.seed, "a whole number", "set the seed to a whole number");
  if (typeof req.partInPart !== "boolean") refuse("/partInPart", req.partInPart, "true or false", "set partInPart true or false");
  if (req.partInPart && req.mode === "legacy-shelf") refuse("/partInPart", req.partInPart, "false in legacy-shelf mode", "use fill mode for part-in-part; legacy-shelf reproduces SLUG's own sheets");
  if (req.partInPart && req.mode === "assembly-order") refuse("/partInPart", req.partInPart, "false in assembly-order mode", "use fill mode for part-in-part; a part inside a hole would need the host's step");
  if (req.groupBy !== undefined && req.groupBy !== "stock" && req.groupBy !== "type") refuse("/groupBy", req.groupBy, "stock or type", "group by stock or type");
  if (req.order !== undefined && !ORDER_LIST.includes(req.order)) refuse("/order", req.order, ORDER_LIST.join(", "), "pick one of the five sort orders");
  if (req.mode === "assembly-order") requireSteps(req.items);
}

function candidates(req: NestRequest): Candidate[] {
  const base = baseCandidates(req);
  return req.partInPart ? [...base, ...base.map((c) => ({ ...c, pip: true }))] : base;
}

function baseCandidates(req: NestRequest): Candidate[] {
  const orders = req.order === undefined ? ORDER_LIST : [req.order];
  if (req.mode === "legacy-shelf") {
    if (req.packer !== undefined && req.packer !== "shelf") refuse("/packer", req.packer, "shelf, or no packer, in legacy-shelf mode", "drop the packer or use fill mode");
    if (req.order !== undefined) refuse("/order", req.order, "no order in legacy-shelf mode", "drop the order; the shelf packer sorts by max side");
    return [shelf];
  }
  if (req.mode !== "fill" && req.mode !== "assembly-order") return refuse("/mode", req.mode, "fill, assembly-order or legacy-shelf", "pick a nest mode");
  if (req.packer === "sparrow") return refuse("/packer", req.packer, "maxrects-bssf or shelf; sparrow is not adopted (docs/explanation/nest-sparrow-evaluation.md)", "use maxrects-bssf or shelf; sparrow is not adopted");
  if (req.packer === "shelf") {
    if (req.order !== undefined) refuse("/order", req.order, "no order with the shelf packer", "drop the order; the shelf packer sorts by max side");
    return [shelf];
  }
  if (req.packer === "maxrects-bssf") return orders.map(maxrects);
  if (req.packer !== undefined) return refuse("/packer", req.packer, "maxrects-bssf, shelf or sparrow", "pick a packer");
  return [...orders.map(maxrects), shelf];
}

/** Copies grouped by sheet-sharing key, groups in order of first appearance, copies in item order. */
function groupBoxes(req: NestRequest): Box[][] {
  const groups = new Map<string, Box[]>();
  for (const it of req.items) {
    const key = req.groupBy === "type" ? it.id : it.stock;
    const e = extentOf(it.rings);
    const list = groups.get(key) ?? [];
    for (let copy = 0; copy < it.qty; copy++) list.push({ id: it.id, copy, w: e.w, h: e.h });
    groups.set(key, list);
  }
  return [...groups.values()].filter((g) => g.length > 0);
}

function layout(groups: readonly Box[][], candidate: Candidate, frame: Frame, nested: readonly Nesting[] | null, stepOf?: (b: Box) => number): Layout {
  let base = 0;
  const placements: Placement[] = [];
  const oversize = new Set<string>();
  const area: number[] = [];
  let dropped = 0;
  // assembly order packs every group in one step-ordered pass with global sheet indices
  const passes: readonly (readonly Box[])[] = stepOf ? [groups.flat()] : groups;
  passes.forEach((boxes, g) => {
    const n = candidate.pip ? nested![g]! : null;
    const p = stepOf ? stepLayout(groups, stepOf, frame, candidate.run) : candidate.run(n ? n.roots : boxes, frame);
    const spots = p.spots.slice().sort((a, b) => a.sheet - b.sheet);
    for (const s of spots) {
      const sheet = base + s.sheet;
      placements.push({ id: s.box.id, copy: s.box.copy, sheet, at: [s.x, s.y], rot: s.rot });
      area[sheet] = (area[sheet] ?? 0) + s.box.w * s.box.h;
      for (const inner of n?.inners.get(keyOf(s.box.id, s.box.copy)) ?? []) {
        placements.push(composePlacement(s.box, sheet, [s.x, s.y], s.rot, inner));
        area[sheet] = area[sheet]! + inner.w * inner.h;
      }
    }
    for (const b of p.oversize) oversize.add(b.id);
    dropped += p.oversize.length;
    base += p.sheets;
  });
  return { candidate, sheets: base, placements, oversize, dropped, area: Array.from({ length: base }, (_, i) => area[i] ?? 0) };
}

/**
 * Fewest sheets wins, ties to the lower index. A candidate that leaves more
 * copies off as oversize loses first: MaxRects keeps one gap more off the
 * far edges than the shelf packer, so a part the shelf places can be
 * oversize to MaxRects, and dropping it must never buy a sheet.
 */
function choose(
  groups: readonly Box[][], list: readonly Candidate[], frame: Frame, holes: (boxes: readonly Box[], frame: Frame) => Nesting, seen?: Layout[], stepOf?: (b: Box) => number,
): Layout {
  let best: Layout | null = null;
  let nested: Nesting[] | null = null;
  for (const c of list) {
    if (c.pip) nested ??= groups.map((b) => holes(b, frame));
    const l = layout(groups, c, frame, nested, stepOf);
    seen?.push(l);
    if (best === null || l.dropped < best.dropped || (l.dropped === best.dropped && l.sheets < best.sheets)) best = l;
  }
  return best!;
}

/**
 * Packs a request onto sheets; throws a CommandError (E_SCHEMA) on a
 * request it cannot take. Part-in-part tests containment on polygons, so a
 * request with partInPart needs the geom handle.
 */
export function nest(req: NestRequest, geom?: Geom): NestResult {
  return run(req, geom).result;
}

/** One candidate layout at the gap nest chose; an informational metric (D-075). */
export interface Trial {
  readonly packer: Packer;
  readonly order?: SortOrder;
  /** True for a candidate that packed the roots of the part-in-part pass. */
  readonly partInPart: boolean;
  /** count */
  readonly sheets: number;
  /** Copies left off as oversize, count. */
  readonly dropped: number;
  /** Copies placed inside a hole, count. */
  readonly inside: number;
}

/** Every candidate nest tried at the gap it chose, in the fixed order, and the result it kept. */
export function nestTrials(req: NestRequest, geom?: Geom): { readonly result: NestResult; readonly trials: readonly Trial[] } {
  const { result, seen } = run(req, geom, true);
  return {
    result,
    trials: seen.map((l) => ({
      packer: l.candidate.packer, ...(l.candidate.order === undefined ? {} : { order: l.candidate.order }), partInPart: l.candidate.pip === true,
      sheets: l.sheets, dropped: l.dropped, inside: l.placements.filter((p) => p.inside !== undefined).length,
    })),
  };
}

function run(req: NestRequest, geom: Geom | undefined, trace = false): { result: NestResult; seen: Layout[] } {
  validate(req);
  const list = candidates(req);
  if (req.partInPart && geom === undefined) refuse("/partInPart", req.partInPart, "false, or a geom handle passed to nest", "pass the geom handle, or call packSheets");
  const rings = ringsById(req.items);
  const holes = (boxes: readonly Box[], f: Frame): Nesting => nestHoles(geom!, boxes, rings, f);
  const groups = groupBoxes(req);
  const frame = (gap: number): Frame => ({ sheet: req.sheet, margin: req.margin, gap, rotations: req.rotations });
  const steps = new Map(req.items.map((it) => [it.id, it.step ?? 0]));
  const stepOf = req.mode === "assembly-order" ? (b: Box): number => steps.get(b.id)! : undefined;
  const gap = req.gap === "auto" ? autoGap((g) => choose(groups, list, frame(g), holes, undefined, stepOf)).gap : req.gap;
  const seen: Layout[] = [];
  const best = choose(groups, list, frame(gap), holes, trace ? seen : undefined, stepOf);
  const [W, H] = req.sheet;
  const usable = (W - 2 * req.margin) * (H - 2 * req.margin);
  const result: NestResult = {
    sheets: best.sheets,
    placements: best.placements,
    packer: best.candidate.packer,
    ...(best.candidate.order === undefined ? {} : { order: best.candidate.order }),
    gap,
    fill: best.area.map((a) => (100 * a) / usable),
    oversize: req.items.filter((it) => best.oversize.has(it.id)).map((it) => it.id),
    layoutHash: layoutHash(best.placements),
  };
  return { result, seen };
}
