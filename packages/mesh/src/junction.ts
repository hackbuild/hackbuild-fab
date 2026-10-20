// A concave fillet of radius r where an upper prism stands on a lower body
// (PLAN.md 3.3 "the junction fillet where prisms meet"; geometry-strategy.md
// section 6 item 3, prototype 3a measured -0.0185 percent). The ring at
// height u above the joint is the upper outline grown by
// r - sqrt(r^2 - (r - u)^2), which is the upper outline grown by r then
// inset by a top cove of radius r over [z0, z0 + r]: so the bands come from
// prismWithEdges (COLLAR planSlabs through R1-engine-06, layer grid and band
// overlap included) and each is then clipped to the lower body's top outline,
// so no ring hangs past the lower body's edge. The joint the originals filled
// this way is the OGEE16 hub root (printed.scad knob_hub, lines 318 to 321);
// a round boss can take the fillet in its revolve profile instead
// (@hackbuild/geom roundCorner, prototype 3b).

import type { MachineView, Mm, ProfileLookup, Ring } from "@hackbuild/spec";
import { loadGeom, q, type Section } from "@hackbuild/geom";
import { prismWithEdges, type StackShape } from "./edge-stack.js";
import { bandOverlap } from "./routes/stack.js";
import { meshError } from "./routes/prism.js";

export interface Junction {
  /** The upper body's outline at the joint: outer ring then holes; a hole stays open through the fillet. */
  readonly upper: readonly Ring[];
  /** The lower body's top outline: outer ring then holes. */
  readonly lowerTop: readonly Ring[];
  /** Fillet radius, mm; z0 + r must be a layer top. */
  readonly r: Mm;
  /** Height of the joint, mm: the lower body's top, 0 or a layer top. */
  readonly z0: Mm;
  readonly machine: Pick<MachineView, "layerTop" | "layerIndex">;
  /** Reads stack.bandOverlap.lo and .hi. */
  readonly profile: Pick<ProfileLookup, "constant">;
}

/** The single piece of a section, or E_UNSAT at path. */
function one(s: Section, path: string, what: string): Ring[] {
  const parts = s.components();
  if (parts.length !== 1) {
    throw meshError({ code: "E_UNSAT", path, got: { pieces: parts.length }, expected: `one outline piece ${what}`, hint: "the fillet ring must sit on the lower body in one piece; move the upper body onto the lower top or shrink r" });
  }
  return [parts[0]!.outer, ...parts[0]!.holes];
}

/**
 * The fillet as a stack ShapeDecl over [z0, z0 + r], one band per layer,
 * each band the grown upper outline clipped to lowerTop with the upper's
 * holes cut back out. The widest band reaches down into the lower body by
 * the band overlap, so the union with the lower and upper bodies adds no
 * volume of its own at the joint. Union it with both bodies (csg union).
 */
export async function junctionFillet(j: Junction): Promise<StackShape> {
  if (!(Number.isFinite(j.r) && j.r > 0)) throw meshError({ code: "E_SCHEMA", path: "/r", got: j.r, expected: "a positive radius in mm", hint: "give the fillet a positive radius" });
  const geom = await loadGeom();
  const [outer, ...holes] = j.upper;
  const [lowerOuter, ...lowerHoles] = j.lowerTop;
  if (outer === undefined || lowerOuter === undefined) {
    throw meshError({ code: "E_SCHEMA", path: outer === undefined ? "/upper" : "/lowerTop", got: 0, expected: "an outer ring", hint: "pass the upper outline and the lower top outline" });
  }
  const grown = one(geom.fromOutline(outer).offset(j.r, { join: "Round" }), "/upper", "after growing by r");
  const stack = await prismWithEdges({ outline: grown, z: [j.z0, q(j.z0 + j.r)], edge: { top: { kind: "cove", size: j.r } }, machine: j.machine, profile: j.profile });
  const lower = geom.fromOutline(lowerOuter, lowerHoles);
  const cut = holes.map((h) => geom.fromOutline(h));
  const [lo, hi] = bandOverlap(j.profile);
  const ov = q((lo + hi) / 2);
  const bands = stack.bands.map((b, i) => {
    let s = geom.fromOutline(b.outline[0]!).intersection(lower);
    if (cut.length > 0) s = s.difference(...cut);
    const z: [Mm, Mm] = i === 0 ? [q(b.z[0] - ov), b.z[1]] : [b.z[0], b.z[1]];
    return { outline: one(s, `/bands/${i}/outline`, "after the clip to the lower top"), z };
  });
  return { route: "stack", bands };
}
