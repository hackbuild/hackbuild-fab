// Bench widgets at chase.validate (R1-engine-12, spec/widgets.ts): a widget
// whose kind the registry handed over lacks is E_REF, record
// "chase-ref/widget-kind", with didYouMean and a pointer into the bench
// literal; absent widgetKinds reads as empty, so nothing passes unresolved.

import { describe, expect, it } from "vitest";
import { allFields, resolveBenchRefs, validateDocument, type ChaseRegistries } from "@hackbuild/chase";
import type { Chase, WidgetDecl } from "@hackbuild/spec";
import { flexPair } from "./helpers.js";

/** A registry that holds every id the flex-pair chase names, so only widget errors remain. */
function registriesOf(c: Chase, widgetKinds?: readonly string[]): ChaseRegistries {
  const checks = new Set<string>([...(c.expect ?? []), ...(c.waive ?? [])].map((x) => x.check));
  for (const [f] of allFields(c)) {
    (f.checks ?? []).forEach((id) => checks.add(id));
    if (f.type === "derived" && f.limit !== undefined) checks.add(f.limit.check);
  }
  const reg: ChaseRegistries = {
    checks: [...checks].map((id) => ({ id })),
    exporters: c.exports.flatMap((e) => [e.kind, ...(e.bundle ?? [])]),
    constraintDims: allFields(c).flatMap(([f]) => (f.constraintDim === undefined ? [] : [f.constraintDim])),
    machines: [...c.meta.machines, ...c.exports.flatMap((e) => (e.machine === undefined ? [] : [e.machine]))],
    materials: c.materials.map((m) => m.material),
    claimFns: (c.claims ?? []).map((x) => x.fn),
  };
  return widgetKinds === undefined ? reg : { ...reg, widgetKinds };
}

const TILT: WidgetDecl = { id: "stick", kind: "drive.tilt", fn: "contact", inputs: {}, outputs: ["targets"], tolerance: 0.01, region: "stage.overlay" };
const benchWith = (widgets: unknown): unknown => ({ shell: "paper", views: { default: "assembled", modes: ["assembled"], render: ["solid"], overlays: [], widgets } });

describe("chase.validate: widget kinds", () => {
  const chase = flexPair();

  it("a registered kind resolves", () => {
    const v = validateDocument({ chase, bench: benchWith([TILT]), registries: registriesOf(chase, ["drive.tilt"]) });
    expect(v.errors).toEqual([]);
  });

  it("an unregistered kind is E_REF at its bench pointer, with didYouMean", () => {
    const v = validateDocument({ chase, bench: benchWith([TILT, { ...TILT, id: "keys", kind: "drive.tlt" }]), registries: registriesOf(chase, ["drive.tilt"]) });
    expect(v.errors).toEqual([{
      code: "E_REF", path: "/views/widgets/1/kind", got: "drive.tlt", didYouMean: ["drive.tilt"],
      hint: "bench.ts: name a registered widget kind, not drive.tlt", record: "chase-ref/widget-kind",
    }]);
  });

  it("absent widgetKinds reads as empty: every widget refuses", () => {
    const errs = resolveBenchRefs(benchWith([TILT]), registriesOf(chase));
    expect(errs.map((e) => [e.code, e.path, e.record])).toEqual([["E_REF", "/views/widgets/0/kind", "chase-ref/widget-kind"]]);
  });

  it("a bench without widgets, or no bench, adds nothing", () => {
    expect(resolveBenchRefs(benchWith(undefined), registriesOf(chase, []))).toEqual([]);
    expect(resolveBenchRefs(undefined, registriesOf(chase, []))).toEqual([]);
    expect(validateDocument({ chase, registries: registriesOf(chase) }).errors).toEqual([]);
  });
});
