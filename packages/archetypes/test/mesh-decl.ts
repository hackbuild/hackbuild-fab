// Meshes an archetype's declarations without the kernel's D-054 snap and
// D-070 inset, as the originals mesh their own: prisms extruded, revolves
// by manifold (rotated half a step, as the revolve route places its first
// facet), csg by manifold booleans. The parity tests compare these solids
// with the originals' per-slot volumes; the kernel's own build is held to
// the reference goldens instead.

import type { ManifoldToplevel, Manifold } from "manifold-3d";
import type { ShapeDecl } from "@hackbuild/spec";

export type Bag = Manifold[];

export function solidOf(mf: ManifoldToplevel, shape: ShapeDecl, own: Bag): Manifold {
  const keep = (m: Manifold): Manifold => { own.push(m); return m; };
  if (shape.route === "prism") {
    const cs = keep(new mf.CrossSection(shape.outline.map((r) => r.map(([x, y]) => [x, y] as [number, number])), "Positive") as unknown as Manifold) as unknown as InstanceType<ManifoldToplevel["CrossSection"]>;
    return keep(keep(cs.extrude(shape.z[1] - shape.z[0])).translate([0, 0, shape.z[0]]));
  }
  if (shape.route === "revolve") {
    const cs = keep(new mf.CrossSection([shape.profile.map(([r, z]) => [Math.max(0, r), z] as [number, number])], "Positive") as unknown as Manifold) as unknown as InstanceType<ManifoldToplevel["CrossSection"]>;
    const n = shape.segments ?? 64;
    const o = shape.axis?.origin ?? [0, 0, 0];
    return keep(keep(keep(cs.revolve(n, 360)).rotate([0, 0, 180 / n])).translate([o[0], o[1], 0]));
  }
  if (shape.route === "csg") {
    const parts = shape.of.map((x) => solidOf(mf, x, own));
    const first = parts[0]!;
    if (shape.op === "union") return keep(mf.Manifold.union(parts));
    if (shape.op === "difference") return keep(first.subtract(keep(mf.Manifold.union(parts.slice(1)))));
    return keep(mf.Manifold.intersection(parts));
  }
  throw new Error(`route ${shape.route} is not read here`);
}
