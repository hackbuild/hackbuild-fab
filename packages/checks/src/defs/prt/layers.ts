// The print-pose layer walk CHK-PRT-06, -07 and -09 share: the part's
// bodies in print pose, sliced at layer mid heights on one cell grid, each
// layer handed over with the one below it.

import type { CheckCtx, Part } from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";
import { boundsOf, inPrintPose } from "../../solid/mesh.js";
import { gridOver, sliceMask, type Grid } from "../../solid/slice.js";
import { bodyMeshes, cellFor, isReason } from "../common.js";

export interface PoseSlices {
  readonly meshes: readonly MeshData[];
  readonly grid: Grid;
  /** Height of the part in print pose, mm. */
  readonly zTop: number;
}

export function poseSlices(part: Part, ctx: CheckCtx): PoseSlices | { readonly reason: string } {
  const got = bodyMeshes(part, ctx);
  if (isReason(got)) return got;
  const { meshes } = inPrintPose(part, got.meshes);
  const box = boundsOf(meshes);
  const extent = Math.max(box.max[0] - box.min[0], box.max[1] - box.min[1]);
  return { meshes, grid: gridOver(box, cellFor(extent)), zTop: box.max[2] };
}

/** Slice at each mid height in order; fn gets the layer, the layer below (null for the first) and the height. */
export function walkLayers(s: PoseSlices, mids: readonly number[], fn: (cur: Uint8Array, prev: Uint8Array | null, z: number) => void): void {
  let prev: Uint8Array | null = null;
  for (const z of mids) {
    const cur = sliceMask(s.meshes, z, s.grid);
    fn(cur, prev, z);
    prev = cur;
  }
}
