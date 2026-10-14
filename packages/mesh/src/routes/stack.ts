// The stack route (D-053): z bands, each a prism, consecutive bands
// overlapping by the profile band overlap. stackMesh skins the bands as
// constructive prisms; the D-047 stage runner in stages.ts is the only
// caller and the only place a body takes its stages.

import type { Mm, ProfileLookup, ShapeDecl } from "@hackbuild/spec";
import { snap, type MeshData } from "../hash.js";
import { GRID, type Geom } from "@hackbuild/geom";
import { meshError, outlineComponents, prismMesh, type RouteWarning } from "./prism.js";

/**
 * Profile constants holding the overlap between consecutive stack bands,
 * mm, lo then hi (spec/build.ts ShapeDecl stack, CHK-PRT-02). The overlap
 * is compared after the D-054 snap with one grid step of slack, since a
 * bound need not sit on the 1/1024 mm grid.
 */
export const BAND_OVERLAP_IDS = ["stack.bandOverlap.lo", "stack.bandOverlap.hi"] as const;

/** Legal overlap between consecutive stack bands, [lo, hi] mm, read from profile; a row in another unit, not positive, or lo over hi is E_SCHEMA. */
export function bandOverlap(profile: Pick<ProfileLookup, "constant">): readonly [Mm, Mm] {
  const [lo, hi] = BAND_OVERLAP_IDS.map((id) => {
    const c = profile.constant(id);
    if (c.unit !== "mm" || !Number.isFinite(c.value) || !(c.value > 0)) {
      throw meshError({ code: "E_SCHEMA", path: `/constants/${c.id}`, got: `${c.value} ${c.unit}`, expected: "a positive length in mm", hint: `set profile constant ${c.id} to a positive length in mm` });
    }
    return c.value;
  }) as [Mm, Mm];
  if (lo > hi) {
    throw meshError({ code: "E_SCHEMA", path: `/constants/${BAND_OVERLAP_IDS[0]}`, got: lo, expected: `at most ${BAND_OVERLAP_IDS[1]} ${hi} mm`, hint: "set the stack band overlap lo end at or below the hi end" });
  }
  return [lo, hi];
}

type StackShape = Extract<ShapeDecl, { route: "stack" }>;

/** Refuse a band whose overlap with the band below lies outside overlap [lo, hi] mm after the snap (CHK-PRT-02). */
export function checkBandOverlaps(bands: StackShape["bands"], overlap: readonly [Mm, Mm], path = ""): void {
  const [lo, hi] = overlap;
  bands.forEach((band, i) => {
    const below = bands[i - 1];
    if (below === undefined) return;
    const got = snap(below.z[1]) - snap(band.z[0]);
    if (got < lo - GRID || got > hi + GRID) {
      throw meshError({
        code: "E_SCHEMA", path: `${path}/bands/${i}/z/0`, got: band.z[0],
        expected: `band overlap ${lo} to ${hi} mm with the band below, measured ${got} mm (computed)`,
        hint: `start each band ${lo} to ${hi} mm below the top of the band under it`,
      });
    }
  });
}

/** One run of bands with the same section, skinned as one prism. */
export interface StackRun {
  /** First and last band index in the run. */
  readonly bands: readonly [number, number];
  /** z range of the run, mm, on the grid. */
  readonly z: readonly [Mm, Mm];
}

export interface StackMesh {
  /** One closed shell per run component; shells of different runs overlap in z by the band overlap, all in one slot. */
  readonly shells: readonly MeshData[];
  readonly runs: readonly StackRun[];
  readonly retries: number;
  readonly warnings: readonly RouteWarning[];
}

/**
 * Stack route as constructive prisms (mesh kernel record section 2): the
 * bands are skinned once per contiguous run of equal sections and capped
 * only where a neighbour's section differs. Shells overlap only inside the
 * one slot of the body; the slicer, or the stage runner's union, joins them.
 * Several closed shells in one slot, each kept whole, follow BLOCKS
 * src-extracted/kernel.js (Mesh._addShell line 216, merge line 306; lineage
 * mesh.stack/blocks-src). Its clipRetry has no counterpart: geom booleans
 * run on CrossSection (D-163).
 */
export function stackMesh(geom: Geom, bands: StackShape["bands"], overlap: readonly [Mm, Mm], path = ""): StackMesh {
  if (bands.length === 0) throw meshError({ code: "E_SCHEMA", path: `${path}/bands`, got: 0, expected: "at least one band", hint: "declare at least one band" });
  checkBandOverlaps(bands, overlap, path);
  const keys = bands.map((b, i) => JSON.stringify(outlineComponents(geom, b.outline, `${path}/bands/${i}`)));
  const runs: StackRun[] = [];
  let first = 0;
  for (let i = 1; i <= bands.length; i++) {
    if (i < bands.length && keys[i] === keys[first]) continue;
    runs.push({ bands: [first, i - 1], z: [snap(bands[first]!.z[0]), snap(bands[i - 1]!.z[1])] });
    first = i;
  }
  const shells: MeshData[] = [];
  const warnings: RouteWarning[] = [];
  let retries = 0;
  for (const run of runs) {
    const p = prismMesh(geom, bands[run.bands[0]]!.outline, run.z, `${path}/bands/${run.bands[0]}`);
    shells.push(...p.shells);
    warnings.push(...p.warnings);
    retries += p.retries;
  }
  return { shells, runs, retries, warnings };
}
