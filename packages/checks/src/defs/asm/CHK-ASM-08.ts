// CHK-ASM-08, mesh origin on the rotation axis; bores land on pivots at
// five states (OGEE R14 2026-08: a link swung about a point 48 mm below its
// pins; zero at rest). Frame rule F1 (spec/part-ir.ts FrameDecl, D-047):
// a part with a rotational DOF has its mesh origin on the axis. The part's
// pivot bores must have axes through the
// origin; a bore whose axis misses the origin by e swings off its pivot by
// 2 e sin(theta / 2) at angle theta, zero at rest, which is why five states
// caught it and the rest pose did not. A pivot bore is one whose fit class
// moves (motion slide or rotate: OGEE16 classes its link pivots SLIDE).
// The measure is e, mm, against one 1/1024 mm grid step (D-054).

import { MESH_GRID_PER_MM, type BoreFeature, type Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { cross3, norm3 } from "../../solid/mesh.js";
import { fmt, intervalFinding, partTarget, skip } from "../common.js";

const GRID_MM = 1 / MESH_GRID_PER_MM;

export const check = defineCheck({
  id: "CHK-ASM-08",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const moves = (f: BoreFeature): boolean => ["slide", "rotate"].includes(ctx.profile.fit(f.fit.class).motion);
    const pivots = t.part.features.filter((f): f is BoreFeature => f.kind === "bore" && moves(f));
    if (pivots.length === 0) return [skip(at, "not run", `part ${t.part.id} has no pivot bore (no bore with a moving fit class)`)];
    const off = pivots.map((b) => {
      const d = norm3(b.axis.dir);
      const c = cross3(b.axis.origin, d);
      return { id: b.id, e: Math.hypot(c[0], c[1], c[2]) };
    });
    const worst = off.reduce((m, x) => (x.e > m.e ? x : m));
    return [intervalFinding({ level: "feature", part: t.part.id, feature: worst.id }, Number(worst.e.toFixed(6)), 0, GRID_MM, "mm",
      `F1: a part that turns has its mesh origin on the axis, or its bores leave their pivots once it moves; one ${fmt(GRID_MM, 6)} mm grid step allowed`,
      { pivots: pivots.length, originOnAxis: t.part.frame.originOnAxis ? "declared" : "not declared" })];
  },
});
