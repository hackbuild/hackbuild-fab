// The first claim functions (R1-engine-11). The spring ones read the
// metrics the click-spring-key archetype writes (packages/archetypes
// src/pip/click.ts): spring.peakN is the SNAPFE summary peak, spring.cg the
// travel to contact, and spring.curve.n, .d<i>, .F<i> the force curve
// sampled from travel 0 to cg + click.stopOvertravel, linear between the
// FE load steps (written when the archetype is placed with curveSamples
// above 0). contact.at calls the design's own ContactFn (spec/build.ts), so
// the drive pad, the readout and the claim read one function.

import { commandError, type Metric } from "@hackbuild/spec";
import { metricId, metricNum, noMetric, numArg, registerClaimFn, type ClaimArgs, type ClaimCtx } from "./registry.js";

const AT = { type: "string", optional: true, help: "metric prefix of the placed archetype, for example click-spring-key.0" } as const;

/** The sampled force curve: travel x, mm, and force y, N, travel 0 first. */
export function springCurve(metrics: readonly Metric[], args: ClaimArgs): { x: number; y: number }[] {
  const nId = metricId(args, "spring.curve.n");
  if (!metrics.some((m) => m.id === nId)) throw noMetric(nId, "the build carries no spring force curve; place the click spring with curveSamples above 0");
  const n = metricNum(metrics, nId, "spring.curve.n is the sample count");
  const hint = "the spring force curve is missing a sample; rebuild the part";
  return Array.from({ length: n }, (_, i) => ({
    x: metricNum(metrics, metricId(args, `spring.curve.d${i}`), hint),
    y: metricNum(metrics, metricId(args, `spring.curve.F${i}`), hint),
  }));
}

/** Force at a travel, N: linear between the two curve samples around it. */
export function forceAt(curve: readonly { x: number; y: number }[], travelMm: number): number {
  const first = curve[0], last = curve[curve.length - 1];
  if (first === undefined || last === undefined || travelMm < first.x || travelMm > last.x) {
    throw commandError({
      code: "E_SCHEMA", path: "/args/travelMm", got: travelMm, expected: first === undefined ? "a curve with samples" : `${first.x} to ${last!.x} mm`,
      hint: "ask for a travel inside the sampled curve, 0 to the stop", record: "chase-claim/args",
    });
  }
  let j = 0;
  while (j < curve.length - 2 && curve[j + 1]!.x < travelMm) j++;
  const a = curve[j]!, b = curve[j + 1] ?? a;
  const k = b.x === a.x ? 0 : (travelMm - a.x) / (b.x - a.x);
  return a.y + k * (b.y - a.y);
}

registerClaimFn("spring.forceAt", {
  inputs: { at: AT, travelMm: { type: "number", unit: "mm", help: "centre travel to read the force at" } },
  unit: "N",
  reads: ["spring.curve."],
  fn: (metrics, args) => forceAt(springCurve(metrics, args), numArg(args, "travelMm")),
  curve: (metrics, args) => springCurve(metrics, args),
});

registerClaimFn("spring.peak", {
  inputs: { at: AT },
  unit: "N",
  reads: ["spring.peakN"],
  fn: (metrics, args) => metricNum(metrics, metricId(args, "spring.peakN"), "the build carries no spring peak; place a click spring"),
  curve: (metrics, args) => springCurve(metrics, args),
});

registerClaimFn("spring.contactTravel", {
  inputs: { at: AT },
  unit: "mm",
  reads: ["spring.cg"],
  fn: (metrics, args) => metricNum(metrics, metricId(args, "spring.cg"), "the build carries no contact travel; place a click spring"),
});

registerClaimFn("contact.at", {
  inputs: {
    target: { type: "string", help: "drive target the contact function reads" },
    travelMm: { type: "number", unit: "mm", help: "stimulus: travel of the driven body" },
  },
  unit: "N",
  fn: (metrics, args, ctx: ClaimCtx) => {
    if (ctx.contact === undefined) {
      throw commandError({ code: "E_PARAM_MISSING", path: "/contact", hint: "contact.at needs the design's contact function (bench views.drive.contact)", record: "chase-claim/contact" });
    }
    const target = args["target"];
    if (typeof target !== "string" || target === "") {
      throw commandError({ code: "E_PARAM_MISSING", path: "/args/target", hint: "contact.at needs the drive target", record: "chase-claim/args" });
    }
    const travel = numArg(args, "travelMm");
    const f = ctx.contact(metrics, target, travel).forceN;
    if (f === undefined || !Number.isFinite(f)) {
      throw commandError({ code: "E_PARAM_MISSING", path: "/contact/forceN", got: String(f), hint: `the contact function gives no force at ${travel} mm on ${target}; its metrics carry no spring curve`, record: "chase-claim/contact" });
    }
    return f;
  },
});
