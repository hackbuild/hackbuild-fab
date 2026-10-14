// CHK-KEY-04 fix fixture (M04-T04 step 5): the click-spring-window beam at
// PIP's defaults (reference/keys/click-spring-window/chase.ts: l 24, t
// 0.55, w 1.6, sw 3.0, petg) with rise Q 2.40, past the 2.19 strain
// ceiling. The spring of ../fail.json takes riseQ from /Q. The feature
// carries no drivenBy, so the pointer comes from byConstraintDim: Q is the
// field whose constraintDim spring.Q is the dim of sim/click-spring-window,
// the ConstraintDef CHK-KEY-04 is backed by.

import { fixtureJson, type FixFixture } from "../../../fixture-load";

const base = fixtureJson("CHK-KEY-04", "fail");

export const fixture: FixFixture = {
  check: "CHK-KEY-04",
  note: "click spring at PIP defaults with Q 2.40, riseQ from /Q by constraintDim",
  params: [{ id: "clicky", label: "CLICK SPRING", fields: [
    { id: "Q", type: "ratio", label: "rise", range: [1, 2.6], step: 0.01, default: 2, constraintDim: "spring.Q" },
  ] }],
  values: { Q: 2.4 },
  measuresParam: false,
  build(values) {
    const Q = values["Q"] as number;
    const parts = base.parts!.map((p) => ({
      ...p,
      features: (p["features"] as Record<string, unknown>[]).map((f) => (f["kind"] === "spring" ? { ...f, riseQ: Q } : f)),
    }));
    return { ...base, note: `${base.note}; Q ${Q}`, parts };
  },
};
