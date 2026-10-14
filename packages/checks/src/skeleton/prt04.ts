// CHK-PRT-04, wall thickness is a whole multiple of line width (STYLUS
// 2026-08: a sub-line-width wall above a skirt read as empty layers in
// Flash Studio). A wall is printed material between two cavities on the
// same layers, so the skeleton measures it per z band: the pocket bands
// (face z less depth up to face z) cut the part into bands; in each band
// the pockets open there join into cavities wherever they touch, overlap
// or nest, and a cavity that reaches past the host outline joins the
// outside. A wall is the plan distance between two cavities of one band, or
// between a cavity and the host outline. Pockets that never share a layer
// (tilt-stick's foot and neck keep-outs) and a pocket opened onto the
// outside through another (rp2040-zero-seat's back window through the USB
// notch) make no wall. Walls up to 2 x wallLoops x lineWidth, both read from
// the machine preset, are the perimeter-only band and must land on the line
// grid; a thicker wall is infill-filled and skips with reason "infill wall"
// (D-198, owner default).
// Pockets come from Part.features and host outlines from Body.outline, so
// the check reads the Part IR only (D-024, D-224).

import { MESH_GRID_PER_MM } from "@hackbuild/spec";
import type { CheckCtx, Finding, Part, PocketFeature, Ring, TargetOf } from "@hackbuild/spec";
import { fmt, skip } from "./common.js";
import { closestEdges, horizontal, inside, ringEdges, toPart } from "./plan.js";

/** Grid tolerance for "a whole multiple", touch and band length, mm: one 1/1024 mm mesh step (D-054). */
const GRID_MM = 1 / MESH_GRID_PER_MM;

interface Wall {
  readonly mm: number;
  readonly between: string;
  /** The z band the wall stands in, mm. */
  readonly band: readonly [number, number];
}

interface Cavity {
  readonly id: string;
  readonly body: string | undefined;
  readonly ring: Ring;
  readonly z: readonly [number, number];
}

/** Host bodies a pocket names that carry no plan outline in the Part IR. */
export function unoutlinedHosts(part: Part): readonly string[] {
  const firstBody = part.bodies[0]?.id;
  const hosts = new Set(part.features.filter((f): f is PocketFeature => f.kind === "pocket").map((p) => p.body ?? firstBody));
  return part.bodies.filter((b) => hosts.has(b.id) && b.outline?.[0] === undefined).map((b) => b.id);
}

/** Two rings that cross, touch within a grid step, or nest are one cavity. */
function joined(a: Ring, b: Ring): boolean {
  if (closestEdges(ringEdges(a), ringEdges(b)).d <= GRID_MM) return true;
  return (a[0] !== undefined && inside(a[0], b)) || (b[0] !== undefined && inside(b[0], a));
}

/** A ring with a vertex past the outer ring, or touching it, opens onto the outside. */
function opensOut(ring: Ring, outer: Ring): boolean {
  return ring.some((pt) => !inside(pt, outer)) || closestEdges(ringEdges(ring), ringEdges(outer)).d <= GRID_MM;
}

/** Walls of one host body in one z band: between cavities, and from a closed cavity to the outline. */
function bandWalls(open: readonly Cavity[], outline: readonly Ring[] | undefined, band: readonly [number, number]): Wall[] {
  const outer = outline?.[0];
  // Holes of the host outline run through the body: cavities in every band.
  const holes: Cavity[] = (outline ?? []).slice(1).map((ring, i) => ({ id: `outline.hole${i}`, body: undefined, ring, z: band }));
  const all = [...open, ...holes];
  const root = all.map((_, i) => i);
  const find = (i: number): number => (root[i] === i ? i : (root[i] = find(root[i]!)));
  const OUT = all.length;
  root.push(OUT);
  all.forEach((a, i) => {
    for (let j = i + 1; j < all.length; j++) if (joined(a.ring, all[j]!.ring)) root[find(i)] = find(j);
    if (outer !== undefined && opensOut(a.ring, outer)) root[find(i)] = find(OUT);
  });
  const walls: Wall[] = [];
  all.forEach((a, i) => {
    if (a.body === undefined) return;
    if (outer !== undefined && find(i) !== find(OUT)) {
      walls.push({ mm: closestEdges(ringEdges(a.ring), ringEdges(outer)).d, between: `${a.id}|${a.body}.outline`, band });
    }
    all.forEach((b, j) => {
      if (j <= i && b.body !== undefined) return;
      if (find(i) === find(j)) return;
      walls.push({ mm: closestEdges(ringEdges(a.ring), ringEdges(b.ring)).d, between: `${a.id}|${b.id}`, band });
    });
  });
  return walls;
}

/** Every pocket wall of the part, thinnest first, one per pair at its thinnest band; a host body without Body.outline adds no edge wall. */
export function pocketWalls(part: Part): Wall[] {
  const firstBody = part.bodies[0]?.id;
  const cavities: Cavity[] = part.features.filter((f): f is PocketFeature => f.kind === "pocket").map((p) => {
    const top = horizontal(p.face, `/features/${p.id}/face`);
    return { id: p.id, body: p.body ?? firstBody, ring: p.outline.map((pt) => toPart(p.face, pt)), z: [top - p.depth, top] as const };
  });
  const best = new Map<string, Wall>();
  for (const body of new Set(cavities.map((c) => c.body))) {
    const mine = cavities.filter((c) => c.body === body);
    const outline = part.bodies.find((b) => b.id === body)?.outline;
    const cuts = [...new Set(mine.flatMap((c) => [c.z[0], c.z[1]]))].sort((x, y) => x - y);
    for (let k = 0; k + 1 < cuts.length; k++) {
      const band = [cuts[k]!, cuts[k + 1]!] as const;
      if (band[1] - band[0] <= GRID_MM) continue;
      const open = mine.filter((c) => c.z[0] <= band[0] + GRID_MM && c.z[1] >= band[1] - GRID_MM);
      for (const w of bandWalls(open, outline, band)) {
        const had = best.get(w.between);
        if (had === undefined || w.mm < had.mm) best.set(w.between, w);
      }
    }
  }
  return [...best.values()].sort((x, y) => x.mm - y.mm || (x.between < y.between ? -1 : 1));
}

export function runPrt04(target: TargetOf<"part">, ctx: CheckCtx): readonly Finding[] {
  const at = { level: "part", part: target.part.id } as const;
  const bare = unoutlinedHosts(target.part);
  if (bare.length > 0) {
    return [skip(at, 0, `no plan outline on body ${bare.join(", ")}: the wall measure reads Body.outline, filled for prism and stack routes only (D-224)`)];
  }
  const preset = ctx.profile.machine(ctx.machine).presets[0];
  if (preset === undefined) return [skip(at, 0, `machine ${ctx.machine} has no preset; line width unknown`)];
  const lw = preset.lineWidth;
  const loops = preset.wallLoops;
  const band = 2 * loops * lw;
  const walls = pocketWalls(target.part);
  const thinnest = walls[0];
  if (thinnest === undefined) return [skip(at, 0, "no declared wall: the m-s skeleton measures walls between pockets that share a layer, and to the host outline")];
  const zBand = (w: Wall): { zFromMm: number; zToMm: number } => ({ zFromMm: Number(w.band[0].toFixed(6)), zToMm: Number(w.band[1].toFixed(6)) });
  const extra = { walls: walls.length, between: thinnest.between, ...zBand(thinnest), perimeterBandMm: band, lineWidthMm: lw, wallLoops: loops };
  if (thinnest.mm > band) {
    return [skip(at, thinnest.mm,
      `infill wall: thinnest wall ${fmt(thinnest.mm)} mm is over the perimeter band ${fmt(band)} mm (2 x ${loops} walls x line width ${fmt(lw)}), so infill fills it (D-198)`,
      extra)];
  }
  // Every wall inside the perimeter band must land on the line grid; report the worst.
  const graded = walls.filter((w) => w.mm <= band).map((w) => {
    const n = w.mm / lw;
    return { w, off: Math.abs(n - Math.round(n)) * lw, lo: Math.floor(n + 1e-9) * lw, hi: Math.ceil(n - 1e-9) * lw };
  });
  const worst = graded.reduce((m, g) => (g.off > m.off ? g : m));
  return [{
    verdict: worst.off <= GRID_MM ? "pass" : "fail",
    target: at,
    measured: worst.w.mm,
    legal: { kind: "multipleOf", base: lw, unit: "mm", nearest: [worst.lo, worst.hi] },
    constraint: `line width ${fmt(lw)} mm of preset ${preset.id}; walls up to ${fmt(band)} mm print as perimeters only`,
    extra: { ...extra, between: worst.w.between, ...zBand(worst.w) },
  }];
}
