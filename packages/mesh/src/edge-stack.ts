// A prism with top and bottom edge profiles as an ordinary stack ShapeDecl
// (PLAN.md 3.3 "prism top and bottom edges by the edge spec on the stack
// route"; geometry-strategy.md section 6 item 2). Ports COLLAR planSlabs
// and labelSlab (collar.html lines 1201 to 1213 and 1221 to 1224): one slab
// per layer inside the edge zones, each slab's outline inset by the edge
// profile at the slab's middle height. The layer grid is the machine's
// (q(layerTop(i)), D-054); the band overlap is the middle of the profile
// stack.bandOverlap range, as reference/keys/access-switch/build.ts takes it
// (D-313). No spec change: stackMesh and CHK-PRT-02 read the result as any
// other stack.

import type { MachineView, Mm, ProfileLookup, Ring, ShapeDecl } from "@hackbuild/spec";
import { edgeInset, loadGeom, q, type EdgeSpec, type Geom, type Section } from "@hackbuild/geom";
import { BAND_OVERLAP_IDS, bandOverlap } from "./routes/stack.js";
import { meshError } from "./routes/prism.js";

export type StackShape = Extract<ShapeDecl, { readonly route: "stack" }>;

export interface EdgePrism {
  /** outline[0] is the outer ring, the rest holes, as on the prism route. */
  readonly outline: readonly Ring[];
  /** [bottom, top], mm: bottom 0 or a layer top, top a layer top of the machine. */
  readonly z: readonly [Mm, Mm];
  readonly edge: EdgeSpec;
  readonly machine: Pick<MachineView, "layerTop" | "layerIndex">;
  /** Reads stack.bandOverlap.lo and .hi. */
  readonly profile: Pick<ProfileLookup, "constant">;
}

/** One band before the overlap: z on the layer grid, outline inset d mm. */
interface Slab {
  readonly z0: Mm;
  readonly z1: Mm;
  readonly d: Mm;
}

/** Bounds of every layer between z0 and z1, mm, on the grid: z0, the layer tops above it, z1. */
function layerBounds(machine: EdgePrism["machine"], z: readonly [Mm, Mm]): Mm[] {
  const [z0, z1] = [q(z[0]), q(z[1])];
  const onGrid = (v: Mm): boolean => q(machine.layerTop(machine.layerIndex(v))) === v;
  if (!(z1 > z0) || !(z0 === 0 || onGrid(z0)) || !onGrid(z1)) {
    throw meshError({ code: "E_SCHEMA", path: "/z", got: z, expected: "bottom 0 or a layer top, top a layer top above it, mm", hint: "snap the body bottom and top to layer tops with machine.layer" });
  }
  const out = [z0];
  for (let i = z0 === 0 ? 0 : machine.layerIndex(z0) + 1; q(machine.layerTop(i)) <= z1; i++) out.push(q(machine.layerTop(i)));
  return out;
}

/**
 * Outline inset by d, mm: the outer ring offset by -d and each hole by +d,
 * round joins, so a hole opens as the outer edge closes. The result must
 * stay one piece with area, or the band cannot be a prism outline (E_UNSAT).
 */
function insetOutline(geom: Geom, outline: readonly Ring[], d: Mm, path: string): Ring[] {
  const [outer, ...holes] = outline;
  let s: Section = geom.fromOutline(outer!);
  if (d > 0) s = s.offset(-d, { join: "Round" });
  const cut = holes.map((h) => (d > 0 ? geom.fromOutline(h).offset(d, { join: "Round" }) : geom.fromOutline(h)));
  if (cut.length > 0) s = s.difference(...cut);
  const parts = s.components();
  if (parts.length !== 1) {
    throw meshError({ code: "E_UNSAT", path, got: { inset: d, pieces: parts.length }, expected: "one outline piece after the edge inset", hint: "shrink the edge profile; at this inset the outline closes up or splits" });
  }
  return [parts[0]!.outer, ...parts[0]!.holes];
}

/**
 * A prism over z with the edge spec's top and bottom profiles, as a stack
 * of bands: one band per layer where the inset changes, one band where it
 * holds (the straight middle), every bound on q(layerTop(i)). Of two
 * neighbouring bands the narrower one reaches into the wider by the band
 * overlap, so the union adds no volume and the wider band keeps its grid
 * bounds. Loads geom once (manifold CrossSection, D-163).
 */
export async function prismWithEdges(input: EdgePrism): Promise<StackShape> {
  const geom = await loadGeom();
  const bounds = layerBounds(input.machine, input.z);
  const h = bounds[bounds.length - 1]! - bounds[0]!;
  const [lo, hi] = bandOverlap(input.profile);
  const ov = q((lo + hi) / 2);
  if (!(ov >= lo && ov <= hi)) {
    throw meshError({ code: "E_SCHEMA", path: `/constants/${BAND_OVERLAP_IDS[0]}`, got: [lo, hi], expected: "a band overlap range that holds a 1/1024 mm step", hint: "widen stack.bandOverlap so its middle sits on the grid" });
  }
  const slabs: Slab[] = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const z0 = bounds[i]!, z1 = bounds[i + 1]!;
    const d = q(edgeInset(input.edge, h, (z0 + z1) / 2 - bounds[0]!));
    const last = slabs[slabs.length - 1];
    if (last !== undefined && last.d === d) slabs[slabs.length - 1] = { ...last, z1 };
    else slabs.push({ z0, z1, d });
  }
  const bands = slabs.map((s, i) => ({ outline: insetOutline(geom, input.outline, s.d, `/bands/${i}/outline`), z: [s.z0, s.z1] as [Mm, Mm] }));
  for (let i = 1; i < bands.length; i++) {
    if (slabs[i]!.d > slabs[i - 1]!.d) bands[i]!.z[0] = q(bands[i]!.z[0] - ov);
    else bands[i - 1]!.z[1] = q(bands[i - 1]!.z[1] + ov);
  }
  return { route: "stack", bands };
}
