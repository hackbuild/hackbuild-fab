// The stage runner contracts (D-047): what a caller passes and what each
// body and part come out as.

import type { BodyAdjacency, BodyDraft, BuildWarning, MeshRoute, PartDraft, ProfileLookup, ShapeDecl, Vec2, Vec3 } from "@hackbuild/spec";
import type { MeshData } from "../hash.js";

/** A raster layer mask as the store hands it back: labels row major, cell (0, 0) low corner at origin mm. */
export interface RasterMask {
  readonly width: number;
  readonly height: number;
  readonly labels: Uint8Array;
  readonly origin?: Vec2;
}

/** Shapes a feature kind adds to one body at stages 2 to 4, keyed by body id. */
export interface BodyCutters {
  readonly preUnionCutters?: readonly ShapeDecl[];
  readonly unionPositives?: readonly ShapeDecl[];
  readonly postUnionCutters?: readonly ShapeDecl[];
}

export interface StageInput {
  readonly draft: PartDraft;
  /**
   * Bodies feature kinds generate (GeneratedGeometry.bodies), appended to
   * draft.bodies before stage 1, so they take stages 1 and 5 to 8 like any
   * declared body. Ids are unique across both lists.
   */
  readonly bodies?: readonly BodyDraft[];
  /** Profile reads for the stage 6 inset distances and the stack band overlap. */
  readonly profile: Pick<ProfileLookup, "constant">;
  /** Resolves a raster mask uri; required when a body takes the raster route. */
  readonly mask?: (uri: string) => RasterMask;
  /** Resolves an imported mesh uri to its file bytes; required when a body takes the imported route. */
  readonly meshBytes?: (uri: string) => Uint8Array;
  /** Millimetres per file unit of an imported mesh uri (ImportSpec.units); absent reads 1. */
  readonly meshScale?: (uri: string) => number;
  /** Stage 2 to 4 shapes per body id; absent means empty lists. */
  readonly cutters?: Readonly<Record<string, BodyCutters>>;
  /** "sweep" turns a healer that did not converge into a failure (M00-T05 step 2). */
  readonly mode?: "build" | "sweep";
}

/** One body after stage 8. */
export interface StagedBody {
  readonly draft: BodyDraft;
  readonly mesh: MeshData;
  readonly volumeMm3: number;
}

export interface StageOutput {
  readonly bodies: readonly StagedBody[];
  /** Union of the bodies, snapped. */
  readonly solid: MeshData;
  /** Stage 7: the translation lifted off the vertices into the 3MF item transform, mm. */
  readonly itemTransform: Vec3;
  /** Route warnings (healer, prism retries) and stage notes; they hash with the build (D-049). */
  readonly warnings: readonly BuildWarning[];
  readonly routes: readonly MeshRoute[];
  /** Stages that ran, in order (D-047 names). */
  readonly stages: readonly string[];
  /** Stage 8: body pairs with a coincident face and its area (M05-T20); absent for an imported part. */
  readonly adjacency?: readonly BodyAdjacency[];
  /**
   * Stage 8: volume of the union of the emitted body meshes as the kernel
   * computed it, before meshOf snaps the union's own crossing vertices to
   * the D-054 grid, mm3 (computed). Absent when no union was taken.
   */
  readonly unionVolumeMm3?: number;
}
