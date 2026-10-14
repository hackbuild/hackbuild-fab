// The MotionHandle a check run reads (spec/motion.ts, CheckCtx.motion):
// what the kinematics and the runner measured on one coincidence latch
// machine. The handle reports; CHK-MOT-04, -05 and -06 hold the verdicts.

import type { MotionHandle, MotionProgram } from "@hackbuild/spec";
import { latchIdentity, type CoincidenceLatch } from "./latch.js";
import { barCycle, latchedCells, latchMachine } from "./programs/latch.js";
import { FRAME_SCHEDULES, runProgram } from "./runner.js";

/**
 * A handle over one latch machine. `program` is the CHK-MOT-06 fixture run
 * under each frame schedule; the half select runs raise each bar alone
 * through one commit, with no move time so they read the commit alone.
 */
export function latchHandle(l: CoincidenceLatch, program: MotionProgram): MotionHandle {
  const m = latchMachine(l);
  return {
    machine: l.machine,
    halfSelect: () => {
      const bars = [...Array(l.N).keys()].flatMap((k) => [`zR[${k}]`, `zC[${k}]`]);
      return bars.map((bar) => {
        const run = runProgram(m, { id: `${l.machine}.bar`, machine: l.machine, args: {}, ops: barCycle([bar], l.STROKE, 0, 0, "verbatim") });
        return { bar, latched: latchedCells(run.result.states.at(-1) ?? {}) };
      });
    },
    latchIdentity: () => latchIdentity(l),
    schedules: () => FRAME_SCHEDULES.map((sch) => {
      const run = runProgram(m, program, sch);
      return { program: program.id, schedule: sch.id, frames: run.frames.length, endHash: run.result.endHash };
    }),
  };
}
