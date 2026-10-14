// CHK-PRT-01, every part is a closed manifold, two faces per undirected
// edge (COLLAR 2026-08: directed-edge balancing passed coincident faces;
// trimesh disagreed). The rule is the M00 one core ran in check.run
// (core/src/checks.ts runPartChecks, M00-T13 step 8) over the
// packages/mesh audit: every body mesh closed, consistently wound, no
// degenerate triangle, one fan per vertex, positive volume. Core now calls
// prt01Finding, so one implementation serves both paths.

import type { Finding, ResultTarget } from "@hackbuild/spec";
import { audit, type MeshData } from "@hackbuild/mesh";
import { defineCheck } from "../../registry.js";
import { bodyMeshes, isReason, partTarget, skip } from "../common.js";

export const PRT01_CONSTRAINT = "a non-manifold solid has no defined volume: every exported part is closed, two faces per undirected edge, outward winding";

/** The CHK-PRT-01 finding over named meshes. */
export function prt01Finding(target: ResultTarget, parts: readonly { readonly name: string; readonly mesh: MeshData }[]): Finding {
  const audits = parts.map((p) => ({ name: p.name, a: audit(p.mesh) }));
  const bad = audits.filter((x) => !x.a.ok);
  const ok = bad.length === 0 && audits.length > 0;
  const first = bad[0];
  return {
    verdict: ok ? "pass" : "fail", target, measured: ok, legal: { kind: "boolean", must: true },
    constraint: PRT01_CONSTRAINT,
    extra: {
      parts: audits.length, failing: bad.length,
      ...(first === undefined ? {} : {
        firstPart: first.name, openEdges: first.a.openEdges, windingErrors: first.a.windingErrors,
        nonManifoldVertices: first.a.nonManifoldVertices, degenerate: first.a.degenerate,
      }),
    },
  };
}

export const check = defineCheck({
  id: "CHK-PRT-01",
  level: "part",
  run: (t, ctx) => {
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(partTarget(t.part), "not run", got.reason)];
    return [prt01Finding(partTarget(t.part), got.meshes.map((mesh, i) => ({ name: got.names[i]!, mesh })))];
  },
});
