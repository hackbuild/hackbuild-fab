// The stage output of an import-for-audit Part (M04-T14, D-146, D-160):
// no route, cut, partition or inset; shell groups unioned when they verify.

import { type BodyDraft, type BuildWarning, MESH_GRID_PER_MM, type Vec3 } from "@hackbuild/spec";
import { type MeshData, bounds, meshOf, snapWeld } from "../hash.js";
import { audit } from "../audit.js";
import { unionReport } from "../union.js";
import { liveCount, loadManifold, withScope } from "../wasm.js";
import { joinMeshes, meshError } from "../routes/prism.js";
import type { ImportedBody } from "../routes/imported.js";
import { shellGroups } from "../shells.js";
import { worstOverlap } from "../overlap.js";
import type { StageOutput } from "./types.js";
import { toManifold } from "./cut.js";

/** One body of an import-for-audit Part: its draft and what the imported route read. */
export interface ImportedStageBody {
  readonly draft: BodyDraft;
  readonly read: ImportedBody;
}

/** One shell group of an imported part (shellGroups): an outer shell with its voids, or an unowned void. */
export interface ImportedGroup {
  readonly body: string;
  /** `<part>#<k>`, k in shellGroups order. */
  readonly name: string;
  readonly mesh: MeshData;
}

/** One connected piece of the verified union, from shellGroups of the snapped solid. */
export interface ImportedPiece {
  /** The body whose own union holds this piece; null when the piece joins groups of more than one body. */
  readonly body: string | null;
  readonly bounds: readonly [Vec3, Vec3];
  /** mm3 (computed). */
  readonly volumeMm3: number;
}

/** stageImported's result: the stage output, and why no union exists when none does. */
export interface ImportedStageOutput {
  readonly staged: StageOutput;
  /** null when the solid is the verified union of the groups; otherwise the reason, and the solid is the parts joined. */
  readonly noUnion: string | null;
  /** Every shell group of every part, the units the union runs over. */
  readonly groups: readonly ImportedGroup[];
  /** Pieces of the verified union; null when no union exists. */
  readonly pieces: readonly ImportedPiece[] | null;
  /** Pieces of each body's own groups unioned, keyed by body id; null when no union exists. */
  readonly bodyPieces: Readonly<Record<string, number>> | null;
  /**
   * Worst pairwise overlap between the groups that pass the audit, measured
   * when no union exists so CHK-PRT-03 still has a number; null when the
   * union verifies or the kernel refuses a group.
   */
  readonly pairwise: { readonly worstMm3: number; readonly pair: readonly [string, string] | null } | null;
}

/** Weld grid tolerance, mm: one D-054 grid step. */
const GRID_STEP_MM = 1 / MESH_GRID_PER_MM;

const boundsHold = (outer: readonly [Vec3, Vec3], inner: readonly [Vec3, Vec3]): boolean =>
  [0, 1, 2].every((k) => outer[0][k]! - GRID_STEP_MM <= inner[0][k]! && inner[1][k]! <= outer[1][k]! + GRID_STEP_MM);

const boxVolume = (b: readonly [Vec3, Vec3]): number => (b[1][0] - b[0][0]) * (b[1][1] - b[0][1]) * (b[1][2] - b[0][2]);

/**
 * Stage output for a Part built from imported files (M04-T14, D-146,
 * D-160). No route builds a shape, so stages 2 to 6 have nothing to cut,
 * partition or inset, and stage 7 lifts nothing: the file's own frame is
 * what the audit reads. Bodies keep the imported route's welded meshes.
 * Each part is split into shell groups first (R1-rails-import-04), so a
 * file that concatenates overlapping shells is unioned shell by shell and
 * its overlap shows. When every group is closed and their union verifies
 * (D-055), the solid is that union, so CHK-PRT-03 compares the groups with
 * a real union, and pieces counts what the union leaves apart. Otherwise
 * no union exists: the solid is the parts joined, noUnion says why, an
 * AUDIT or UNION warning carries the numbers, and pairwise holds the worst
 * overlap between the closed groups, so the audit reports instead of
 * refusing.
 */
export async function stageImported(list: readonly ImportedStageBody[]): Promise<ImportedStageOutput> {
  const wasm = await loadManifold();
  const before = liveCount();
  if (list.length === 0) {
    throw meshError({ code: "E_SCHEMA", path: "/import", got: 0, expected: "at least one imported file", hint: "name at least one file to import" });
  }
  const warnings: BuildWarning[] = [];
  const parts = list.flatMap((b) => b.read.parts.map((p) => ({ body: b.draft.id, name: p.name })));
  const groups = list.flatMap((b) => b.read.parts.flatMap((p) =>
    shellGroups(p.mesh).map((g, k) => ({ body: b.draft.id, part: p.name, name: `${p.name}#${k}`, mesh: g.mesh, volumeMm3: g.volumeMm3, audit: audit(g.mesh) }))));
  const open = groups.filter((g) => !g.audit.ok);
  for (const g of open) {
    const a = g.audit;
    warnings.push(g.volumeMm3 < 0
      ? { code: "AUDIT", text: `${g.body}/${g.name}: a void no outer shell holds, volume ${g.volumeMm3} mm3 (computed)` }
      : { code: "AUDIT", text: `${g.body}/${g.name}: open edges ${a.openEdges}, winding errors ${a.windingErrors}, degenerate ${a.degenerate}, non-manifold vertices ${a.nonManifoldVertices} (computed)` });
  }
  const openParts = new Set(open.map((g) => `${g.body}/${g.part}`));
  let noUnion: string | null = open.length === 0 ? null
    : `${openParts.size} of ${parts.length} imported ${parts.length === 1 ? "part" : "parts"} ${openParts.size === 1 ? "fails" : "fail"} the audit (${open.length} of ${groups.length} shell groups), first ${open[0]!.body}/${open[0]!.name}`;
  let solid: MeshData | undefined;
  let unionVolumeMm3: number | undefined;
  let pieces: ImportedPiece[] | null = null;
  let bodyPieces: Record<string, number> | null = null;
  if (noUnion === null) {
    try {
      [solid, unionVolumeMm3, pieces, bodyPieces] = withScope((scope): [MeshData, number, ImportedPiece[], Record<string, number>] => {
        const solids = groups.map((g, i) => toManifold(wasm, scope, g.mesh, `/import/groups/${i}`));
        const united = solids.length === 1 ? solids[0]! : scope.own(unionReport(solids).solid);
        const snapped = snapWeld(meshOf(united));
        const whole = shellGroups(snapped);
        // Per body, the pieces of that body's own groups unioned; one body reuses the whole union.
        const own = list.length === 1
          ? [{ body: list[0]!.draft.id, shells: whole }]
          : list.map((b) => {
            const mine = solids.filter((_, i) => groups[i]!.body === b.draft.id);
            if (mine.length <= 1) return { body: b.draft.id, shells: groups.filter((g) => g.body === b.draft.id).flatMap((g) => shellGroups(g.mesh)) };
            return { body: b.draft.id, shells: shellGroups(snapWeld(meshOf(scope.own(unionReport(mine).solid)))) };
          });
        // A body piece sits in the smallest union piece whose bounds hold it.
        const owners = whole.map(() => new Set<string>());
        for (const o of own) {
          for (const s of o.shells) {
            let best = -1;
            whole.forEach((w, i) => {
              if (boundsHold(w.bounds, s.bounds) && (best < 0 || boxVolume(w.bounds) < boxVolume(whole[best]!.bounds))) best = i;
            });
            if (best >= 0) owners[best]!.add(o.body);
          }
        }
        return [
          snapped, united.volume(),
          whole.map((w, i) => ({ body: owners[i]!.size === 1 ? [...owners[i]!][0]! : null, bounds: w.bounds, volumeMm3: w.volumeMm3 })),
          Object.fromEntries(own.map((o) => [o.body, o.shells.length])),
        ];
      });
    } catch (e) {
      const refused = (e as { hbf?: { got?: unknown; hint?: string } }).hbf;
      if (refused === undefined) throw e;
      noUnion = `the union of ${parts.length} imported ${parts.length === 1 ? "part" : "parts"} is refused (${groups.length} shell groups): ${refused.hint ?? ""} (${JSON.stringify(refused.got)})`;
      warnings.push({ code: "UNION", text: noUnion });
      pieces = null;
      bodyPieces = null;
    }
  }
  let pairwise: ImportedStageOutput["pairwise"] = null;
  if (noUnion !== null) {
    try {
      const w = await worstOverlap(groups.filter((g) => g.audit.ok).map((g) => ({ name: `${g.body}/${g.name}`, mesh: g.mesh })));
      pairwise = { worstMm3: w.worstMm3, pair: w.pair };
    } catch (e) {
      const refused = (e as { hbf?: { got?: unknown; hint?: string } }).hbf;
      if (refused === undefined) throw e;
      warnings.push({ code: "UNION", text: `pairwise overlap is unknown: ${refused.hint ?? ""} (${JSON.stringify(refused.got)})` });
    }
  }
  if (liveCount() !== before) {
    throw meshError({ code: "E_KERNEL", got: liveCount() - before, expected: "0 live wasm objects after a build", hint: "the import union leaked a wasm object; own it in the build scope", record: "mesh-kernel" });
  }
  return {
    staged: {
      bodies: list.map((b) => ({ draft: b.draft, mesh: b.read.mesh, volumeMm3: b.read.volumeMm3 })),
      solid: solid ?? joinMeshes(list.map((b) => b.read.mesh)),
      itemTransform: [0, 0, 0], warnings, routes: ["imported"], stages: ["base", "hash"],
      ...(unionVolumeMm3 === undefined ? {} : { unionVolumeMm3 }),
    },
    noUnion,
    groups: groups.map((g) => ({ body: g.body, name: g.name, mesh: g.mesh })),
    pieces,
    bodyPieces,
    pairwise,
  };
}
