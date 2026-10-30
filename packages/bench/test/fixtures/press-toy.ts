// A toy press for the drive.press and plot.curve components and the kit:
// the two-segment curve of curve.test.ts (force 2 N per mm to 0.5 mm, then
// 1 N flat), a contact that closes at 0.6 mm and a stop at 0.9 mm, so every
// expected number is checkable by hand. It is no build: no profile row, no
// solver, nothing measured or computed from a design. The engine numbers
// are held on the click-spring-window fixture in packages/bench-core
// test/widgets-press.test.ts.

import type { ClaimDecl, ContactFn, DriveDecl, Metric, WidgetDecl } from "@hackbuild/spec";
import type { WidgetBuild, WidgetClaimFn } from "@hackbuild/bench-core";

export const TOY_CURVE: readonly (readonly [number, number])[] = [[0, 0], [0.5, 1], [1, 1]];
export const TOY_CONTACT_MM = 0.6;
export const TOY_STOP_MM = 0.9;

const m = (id: string, value: number): Metric => ({ id, value, unit: "", basis: null, tiers: [], qualifier: "computed", note: "toy", gate: "informational" } as unknown as Metric);

/** One key, target "0", under the metric group "toy". */
export const TOY_METRICS: readonly Metric[] = [m("toy.0.travel", TOY_STOP_MM)];

/** The toy claim function: the curve, linear between its points. */
export const TOY_FN: WidgetClaimFn = {
  unit: "N",
  inputs: { at: {}, travelMm: { unit: "mm" } },
  fn: (_ms, args) => {
    const t = Number(args["travelMm"]);
    const j = TOY_CURVE.findIndex(([d], i) => i > 0 && d >= t);
    const [a, b] = [TOY_CURVE[Math.max(j, 1) - 1]!, TOY_CURVE[Math.max(j, 1)]!];
    return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
  },
  curve: () => TOY_CURVE.map(([x, y]) => ({ x, y })),
};

export const toyContact: ContactFn = (_ms, _target, s) => {
  const t = Math.min(Math.max(s === true ? TOY_STOP_MM : typeof s === "number" ? s : 0, 0), TOY_STOP_MM);
  return { closed: t >= TOY_CONTACT_MM ? ["c"] : [], pose: { travelMm: t } };
};

export const TOY_CLAIM: ClaimDecl = {
  id: "press", fn: "toy.forceAt", args: { at: "toy.0", travelMm: 0.25 },
  want: { nominal: 1, lo: 0.8, hi: 1.2, unit: "N" }, why: "the toy band",
};

const DRIVE: DriveDecl = { targets: "metrics.toy", gesture: "hold", contact: "contact", readout: ["logic", "travel", "force"], pickInView: false };

export const TOY_PRESS: WidgetDecl = { id: "press", kind: "drive.press", fn: "toy.forceAt", inputs: {}, outputs: ["travel", "forceN", "contact"], tolerance: 0.01, region: "stage.overlay" };
export const TOY_PLOT: WidgetDecl = { id: "press", kind: "plot.curve", fn: "toy.forceAt", inputs: {}, outputs: ["series", "band", "contactMm", "cursor"], tolerance: 0.01, region: "rail.after-params" };

/** The toy build at a press travel, mm. */
export function toyBuild(travelMm?: number): WidgetBuild {
  return {
    features: [], metrics: TOY_METRICS, results: [], hookup: [], contacts: { contact: toyContact }, drive: DRIVE,
    claims: [TOY_CLAIM], claimFns: { "toy.forceAt": TOY_FN }, ...(travelMm === undefined ? {} : { travelMm }),
  };
}
