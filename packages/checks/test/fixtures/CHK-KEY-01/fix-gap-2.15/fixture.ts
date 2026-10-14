// CHK-KEY-01 fix fixture (M04-T04 step 5): BOSS's cone button, travel 2.15
// mm on a 3.20 mm cone (67 percent; api-library-ai-design.md 6.4 B), the
// contact of ../fail.json with its gap bound to /keys/0/gap. The keys
// field is the flex-pair reference's (reference/keys/flex-pair/chase.ts):
// range 0.8 to 3.0, step 0.02, constraintDim contact.gap.

import { fixtureJson, type FixFixture } from "../../../fixture-load";

const base = fixtureJson("CHK-KEY-01", "fail");

export const fixture: FixFixture = {
  check: "CHK-KEY-01",
  note: "BOSS cone button: gap 2.15 on cone 3.20, bound to /keys/0/gap",
  params: [{ id: "keys", label: "KEYS", fields: [{ id: "keys", type: "list", label: "keys", min: 1, max: 2, item: [
    { id: "gap", type: "mm", label: "travel", range: [0.8, 3.0], step: 0.02, default: 1.84, constraintDim: "contact.gap" },
  ] }] }],
  values: { keys: [{ gap: 2.15 }] },
  measuresParam: true,
  build(values) {
    const gap = ((values["keys"] as { gap: number }[])[0]!).gap;
    const parts = base.parts!.map((p) => ({
      ...p,
      features: (p["features"] as Record<string, unknown>[]).map((f) => (f["kind"] === "contact" ? { ...f, gap, drivenBy: { gap: "/keys/0/gap" } } : f)),
    }));
    return { ...base, note: `${base.note}; gap ${gap}`, parts };
  },
};
