// CHK-MOT-06, the sim never decides an outcome; state commits at command
// (OGEE R16 2026-08: nothing latched under swiftshader, where two frames
// fired in a 700 ms sweep and the latch waited for a frame at full stroke).
// The motion kernel runs one program under every frame, two frames per
// 700 ms sweep and no frames (MotionHandle.schedules); legal is one end
// hash across all of them.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding } from "../common.js";
import { isMotion, motionOr } from "./motion.js";

export const check = defineCheck({
  id: "CHK-MOT-06",
  level: "project",
  run: (_t, ctx): readonly Finding[] => {
    const target = { level: "project" } as const;
    const m = motionOr(ctx, target);
    if (!isMotion(m)) return [m];
    const runs = m.schedules();
    const hashes = new Set(runs.map((r) => r.endHash));
    return [boolFinding(
      target, runs.length > 1 && hashes.size === 1,
      "one program under every frame, two frames per 700 ms sweep and no frames ends on one state hash; frames draw and never commit",
      {
        machine: m.machine, program: runs[0]?.program ?? "none", schedules: runs.length, endHashes: hashes.size,
        ...Object.fromEntries(runs.map((r) => [`frames ${r.schedule}`, r.frames])),
      },
    )];
  },
});
