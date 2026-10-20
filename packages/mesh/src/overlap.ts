// R1-rails-import-03: the worst pairwise overlap between named groups.
// inlay validate_3mf.py lines 257 to 269 intersected every pair of parts
// in an object with manifold3d (`(a ^ b).volume()`); tools/py/validate_3mf.py
// _worst_pair (lines 809 to 830) adds the bounds prefilter and keeps the
// largest volume. This is that rule over MeshData, so overlap is measured
// even when a union is refused. The ceiling it is held to stays in
// CHK-PRT-03 (prt03Finding); this returns the volume only.

import type { Manifold } from "manifold-3d";
import { bounds, type MeshData } from "./hash.js";
import { meshError } from "./routes/prism.js";
import { kernel, loadManifold, withScope } from "./wasm.js";

export interface OverlapGroup {
  readonly name: string;
  readonly mesh: MeshData;
}

export interface WorstOverlap {
  /** Largest intersection volume over all pairs, mm3 (computed); 0 when no pair intersects. */
  readonly worstMm3: number;
  /** The two group names of that pair, in input order; null when worstMm3 is 0. */
  readonly pair: readonly [string, string] | null;
  /** Pairs compared. */
  readonly pairs: number;
  /** Pairs whose bounds touch and so went through the manifold boolean; the rest count 0. */
  readonly intersected: number;
}

/**
 * Worst pairwise intersection volume between groups. Every group is built
 * as a Manifold first, so a group the kernel refuses throws E_KERNEL naming
 * it even when its bounds touch no other group: an unknown overlap is never
 * read as 0. Kernel objects are freed before this returns.
 */
export async function worstOverlap(groups: readonly OverlapGroup[]): Promise<WorstOverlap> {
  await loadManifold();
  return withScope((scope) => {
    const wasm = kernel();
    const solids = groups.map((g, i) => {
      const path = `groups/${i}`;
      const refuse = (got: string) => meshError({
        code: "E_KERNEL", path, got, expected: "NoError",
        hint: `group ${g.name} is not a closed manifold, so its overlap is unknown; export it closed and run again`,
        record: "mesh-kernel",
      });
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(g.mesh.positions), triVerts: Uint32Array.from(g.mesh.triangles) });
      mesh.merge();
      // manifold-3d 3.5.4 throws from the constructor on an open mesh instead of returning a status.
      let s: Manifold;
      try {
        s = scope.own(new wasm.Manifold(mesh));
      } catch (e) {
        throw refuse(e instanceof Error ? e.message : String(e));
      }
      const status = s.status();
      if (status !== "NoError") throw refuse(status);
      return { name: g.name, solid: s, box: bounds(g.mesh) };
    });
    let worstMm3 = 0;
    let pair: [string, string] | null = null;
    let pairs = 0;
    let intersected = 0;
    for (let i = 0; i < solids.length; i += 1) {
      for (let j = i + 1; j < solids.length; j += 1) {
        const a = solids[i]!;
        const b = solids[j]!;
        pairs += 1;
        const [alo, ahi] = a.box;
        const [blo, bhi] = b.box;
        if ([0, 1, 2].some((k) => alo[k]! > bhi[k]! || blo[k]! > ahi[k]!)) continue;
        intersected += 1;
        const v = scope.own(a.solid.intersect(b.solid)).volume();
        if (!Number.isFinite(v)) {
          throw meshError({
            code: "E_KERNEL", path: `groups/${i}`, got: String(v), expected: "a finite volume in mm3",
            hint: `the intersection of ${a.name} and ${b.name} returned no volume; run again`, record: "mesh-kernel",
          });
        }
        if (v > worstMm3) {
          worstMm3 = v;
          pair = [a.name, b.name];
        }
      }
    }
    return { worstMm3, pair, pairs, intersected };
  });
}
