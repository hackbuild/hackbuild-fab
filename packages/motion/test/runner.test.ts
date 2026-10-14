// The Motion IR runner on a toy machine of two free variables, so each
// timing and picture rule is read in isolation (M07 audit: the frame at a
// key time, a negative step count, a joined move group and an expectation
// with extra members each survived a mutant under the program suites).

import { describe, expect, test } from "vitest";
import type { MotionProgram, StateVar } from "@hackbuild/spec";
import { expectSet, periodic, runProgram, type MachineModel } from "@hackbuild/motion";

type S = Readonly<Record<string, number>>;
const toy: MachineModel<S> = {
  machine: "toy",
  init: () => ({ x: 0, y: 0 }),
  get: (s, v) => s[v]!,
  put: (s, v, value) => ({ ...s, [v]: value }),
  commit: (s) => s,
  view: (s) => s as Readonly<Record<StateVar, number>>,
};
const program = (ops: MotionProgram["ops"]): MotionProgram => ({ id: "toy.test", machine: "toy", args: {}, ops });

describe("runProgram timing", () => {
  test("a step count runs |halfSteps| / rate seconds whatever its sign", () => {
    const out = runProgram(toy, program([{ op: "steps", axis: "x", halfSteps: -500, rate: 1000 }, { op: "commit" }]));
    expect(out.durationS).toBe(0.5);
    expect(out.result.states).toEqual([{ x: -500, y: 0 }]);
  });

  test("joined moves last as long as the longest of the group", () => {
    const out = runProgram(toy, program([
      { op: "move", target: "x", to: 10, s: 1, profile: "verbatim" },
      { op: "move", target: "y", to: 4, s: 2, profile: "verbatim", join: true },
      { op: "commit" },
    ]));
    expect(out.durationS).toBe(2);
    expect(out.result.states).toEqual([{ x: 10, y: 4 }]);
  });
});

describe("frames read the finished timeline", () => {
  test("a frame at a move's end shows the end, one inside shows the eased value", () => {
    const out = runProgram(toy, program([{ op: "move", target: "x", to: 10, s: 1, profile: "ease" }, { op: "commit" }]), periodic("half", 0.5));
    expect(out.frames.map((f) => f.t)).toEqual([0, 0.5, 1]);
    expect(out.frames.map((f) => f.view["x"])).toEqual([0, 5, 10]);
  });

  test("a frame at the time of a step's end shows the stepped position", () => {
    const out = runProgram(toy, program([{ op: "steps", axis: "y", halfSteps: 100, rate: 100 }, { op: "dwell", s: 1 }]), periodic("one", 1));
    expect(out.frames.map((f) => [f.t, f.view["y"]])).toEqual([[0, 0], [1, 100], [2, 100]]);
  });
});

describe("expectSet", () => {
  test("passes only on equal sets: a missing or an extra member fails", () => {
    expect(expectSet(["0,0", "1,1"], ["1,1", "0,0"]).pass).toBe(true);
    expect(expectSet(["0,0"], ["0,0", "1,1"])).toMatchObject({ pass: false, missing: ["1,1"], extra: [] });
    expect(expectSet(["0,0", "1,1"], ["0,0"])).toMatchObject({ pass: false, missing: [], extra: ["1,1"] });
  });
});
