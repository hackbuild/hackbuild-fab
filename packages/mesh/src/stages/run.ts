// The D-047 stage runner: stages 1 to 8 per body then per part, every
// wasm object owned by one scope and freed before the run returns (D-055).

import type { BodyDraft, BuildWarning, MeshRoute, Vec3 } from "@hackbuild/spec";
import { loadGeom } from "@hackbuild/geom";
import { type MeshData, bounds, meshOf, signedVolume, snap, snapWeld } from "../hash.js";
import { audit } from "../audit.js";
import { unionReport } from "../union.js";
import { liveCount, loadManifold, withScope } from "../wasm.js";
import { joinMeshes, meshError } from "../routes/prism.js";
import { raster } from "../routes/raster.js";
import type { BodyCutters, StageInput, StageOutput, StagedBody } from "./types.js";
import { bodyAdjacency } from "./adjacency.js";
import { type RouteCtx, baseShape, routesOf } from "./base.js";
import { type Working, cutAndJoin, toManifold } from "./cut.js";
import { partition, priorityOf } from "./partition.js";
import { INSET_ROLES, insetKind } from "./inset.js";
import { translateMesh } from "./emit.js";

/**
 * Run the eight stages for one part draft and return plain data: body
 * meshes, the solid, the item transform and the warnings. Throws a
 * CommandError (E_SCHEMA, E_REF, E_KERNEL) on a declaration the routes
 * refuse; a leaked wasm object is E_KERNEL.
 */
export async function runStages(input: StageInput): Promise<StageOutput> {
  const wasm = await loadManifold();
  const geom = await loadGeom();
  const before = liveCount();
  const draft = input.draft;
  if (draft.bodies.length === 0) {
    throw meshError({ code: "E_SCHEMA", path: "/bodies", got: 0, expected: "at least one body", hint: "declare at least one body" });
  }
  // Feature kind bodies join after the declared ones, so declaration order breaks partition ties.
  const declared = draft.bodies.length;
  const all: readonly BodyDraft[] = [...draft.bodies, ...(input.bodies ?? [])];
  const pathOf = (i: number): string => (i < declared ? `/bodies/${i}` : `/features/${all[i]!.id}/bodies`);
  const ids = new Set<string>();
  all.forEach((b, i) => {
    if (ids.has(b.id)) throw meshError({ code: "E_SCHEMA", path: pathOf(i), got: b.id, expected: "unique body ids", hint: `rename the second body ${b.id}; a feature body takes its feature id` });
    ids.add(b.id);
  });
  for (const id of Object.keys(input.cutters ?? {})) {
    if (!ids.has(id)) throw meshError({ code: "E_REF", path: `/cutters/${id}`, got: id, expected: `a body id: ${[...ids].join(", ")}`, hint: `stage 2 to 4 shapes name no body ${id}; host them on a declared body` });
  }
  const warnings: BuildWarning[] = [];
  const stages: string[] = ["base", "preUnionCutters", "unionPositives", "postUnionCutters", "partition", "insets", "frameEmit", "hash"];
  const rasterCache = new Map<string, Map<number, MeshData>>();
  const out = withScope((scope) => {
    const ctxOf = (_b: BodyDraft, i: number, inset: RouteCtx["inset"]): RouteCtx => ({ wasm, scope, geom, input, rasterCache, path: `${pathOf(i)}/base`, inset });
    const extraOf = (b: BodyDraft): BodyCutters => input.cutters?.[b.id] ?? {};

    // stages 1 to 4
    const work: Working[] = all.map((b, i) => {
      const ctx = ctxOf(b, i, { d: 0, kind: "none" });
      const base = baseShape(b.base, b, ctx);
      for (const w of base.warnings) warnings.push({ code: w.code, text: `${b.id}: ${w.text}` });
      const { solid, touched } = cutAndJoin(scope, base, extraOf(b), ctx, b);
      const routeMesh = base.solid !== undefined ? undefined : base.shells.length === 1 ? base.shells[0] : joinMeshes(base.shells);
      return { draft: b, index: i, routeMesh, solid, touched };
    });

    // stage 5: a total order, role priority then declaration order
    const ahead = (h: Working, w: Working): boolean => {
      const ph = priorityOf(h.draft.role), pw = priorityOf(w.draft.role);
      return ph < pw || (ph === pw && h.index < w.index);
    };
    const higherOf = (w: Working): Working[] => work.filter((h) => ahead(h, w));
    partition(scope, work, higherOf);

    // stage 6: an insert is rebuilt from its inset declaration and partitioned again against the full-size bodies above it
    for (const w of work) {
      const b = w.draft;
      if (!INSET_ROLES.has(b.role) || b.base.route === "raster") continue;
      const kind = insetKind(ctxOf(b, w.index, { d: 0, kind: "none" }), b.base);
      const d = input.profile.constant(kind === "pinch" ? "3mf.pinchInset" : "3mf.coincidenceInset");
      if (d.unit !== "mm" || !(d.value > 0)) {
        throw meshError({ code: "E_SCHEMA", path: `/constants/${d.id}`, got: `${d.value} ${d.unit}`, expected: "a positive length in mm", hint: `set profile constant ${d.id} to a positive length in mm` });
      }
      const ctx = ctxOf(b, w.index, { d: d.value, kind });
      const base = baseShape(b.base, b, ctx);
      const rebuilt: Working = { draft: b, index: w.index, routeMesh: undefined, ...cutAndJoin(scope, base, extraOf(b), ctx, b) };
      rebuilt.touched = true;
      partition(scope, [rebuilt], () => higherOf(w));
      w.solid = rebuilt.solid;
      w.touched = true;
      w.routeMesh = undefined;
      warnings.push({ code: "INSET", text: `${b.id}: ${kind} inset ${d.value} mm (${d.provenance.tier}) applied at stage 6` });
    }

    // stage 7 frame emit; a boolean's output is snapped to the grid and welded, so a triangle the
    // snap collapses leaves the mesh instead of staying as a degenerate sliver
    const meshes = work.map((w) => (!w.touched && w.routeMesh !== undefined ? w.routeMesh : snapWeld(meshOf(w.solid))));
    for (const [i, m] of meshes.entries()) {
      if (m.triangles.length === 0) {
        throw meshError({ code: "E_KERNEL", path: pathOf(i), got: 0, expected: "a body with volume after partition", hint: `body ${work[i]!.draft.id} is covered by bodies ahead of it in partition order; move it or change its role`, record: "mesh-kernel" });
      }
    }
    const [lo, hi] = bounds(joinMeshes(meshes));
    const frame = draft.frame;
    const lift: Vec3 = !frame.carriesOffset && !frame.originOnAxis ? [snap((lo[0] + hi[0]) / 2), snap((lo[1] + hi[1]) / 2), 0] : [0, 0, 0];
    const emitted = meshes.map((m) => (lift[0] === 0 && lift[1] === 0 ? m : translateMesh(m, lift)));

    // stage 8: body meshes are hashed by the caller through meshRef; the solid is their verified union
    const solids = emitted.map((m, i) => toManifold(wasm, scope, m, pathOf(i)));
    const united = solids.length === 1 ? solids[0]! : scope.own(unionReport(solids, { path: "/bodies", members: work.map((w) => w.draft.id) }).solid);
    // Where a face of one body crosses a face of another, the union holds vertices off the grid;
    // the snap below moves them and so the solid's volume, while the bodies are already on the
    // grid. The kernel's own volume is the measure of overlap CHK-PRT-03 reads.
    const unionVolumeMm3 = united.volume();
    const solid = meshOf(united);
    const adjacency = bodyAdjacency(scope, solids, emitted, work.map((w) => w.draft.id), warnings);
    const bodies: StagedBody[] = work.map((w, i) => ({ draft: w.draft, mesh: emitted[i]!, volumeMm3: signedVolume(emitted[i]!) }));
    for (const b of bodies) {
      const a = audit(b.mesh);
      if (!a.ok) {
        warnings.push({ code: "AUDIT", text: `${b.draft.id}: open edges ${a.openEdges}, winding errors ${a.windingErrors}, degenerate ${a.degenerate}, non-manifold vertices ${a.nonManifoldVertices} (computed)` });
      }
    }
    return { bodies, solid, itemTransform: lift, adjacency, unionVolumeMm3 };
  });
  if (liveCount() !== before) {
    throw meshError({ code: "E_KERNEL", got: liveCount() - before, expected: "0 live wasm objects after a build", hint: "a stage leaked a wasm object; own it in the build scope", record: "mesh-kernel" });
  }
  const used = new Set<MeshRoute>();
  for (const b of all) routesOf(b.base, used);
  for (const c of Object.values(input.cutters ?? {})) {
    for (const s of [...(c.preUnionCutters ?? []), ...(c.unionPositives ?? []), ...(c.postUnionCutters ?? [])]) routesOf(s, used);
  }
  const routes = [...used].sort();
  return { ...out, warnings, routes, stages };
}
