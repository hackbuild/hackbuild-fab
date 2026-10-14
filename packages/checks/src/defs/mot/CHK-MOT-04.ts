// CHK-MOT-04, half select never commits (addressing property; OGEE R16
// 2026-08, TAPPET R1 2026-08-11). Each row and each column bar is raised
// alone to full stroke through one commit of the machine's latch rule; a
// cell that latches with only one of its two bars up is a half select that
// committed, and the display cannot address a single pixel. The motion
// kernel runs the bars (MotionHandle.halfSelect); legal is no cell latched
// by any bar alone.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding } from "../common.js";
import { isMotion, motionOr } from "./motion.js";

export const check = defineCheck({
  id: "CHK-MOT-04",
  level: "assembly",
  run: (t, ctx): readonly Finding[] => {
    const target = { level: "assembly", assembly: t.assembly.id } as const;
    const m = motionOr(ctx, target);
    if (!isMotion(m)) return [m];
    const runs = m.halfSelect();
    const bad = runs.filter((r) => r.latched.length > 0);
    const first = bad[0];
    return [boolFinding(
      target, bad.length === 0,
      "each row and column bar raised alone to full stroke through a commit latches no cell; only a row and a column together may latch",
      {
        machine: m.machine, bars: runs.length, barsThatLatched: bad.length,
        ...(first === undefined ? {} : { firstBar: first.bar, firstCells: first.latched.join(" ") }),
      },
    )];
  },
});
