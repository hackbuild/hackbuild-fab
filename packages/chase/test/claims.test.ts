// Function claims and toleranced values on a chase (R1-engine-10,
// spec/claims.ts): the document schema accepts `claims`, the claim rules
// refuse a band whose bounds do not hold the nominal, a repeated id and an
// empty unit with E_SCHEMA, and a claim fn the registry lacks is E_REF
// with didYouMean.

import { describe, expect, it } from "vitest";
import { allFields, validateChase, type ChaseRegistries } from "@hackbuild/chase";
import type { Chase, ClaimDecl } from "@hackbuild/spec";
import { flexPair } from "./helpers.js";

/** A registry that holds every id the flex-pair chase names, so only claim errors remain. */
function registriesOf(c: Chase, claimFns?: readonly string[]): ChaseRegistries {
  const checks = new Set<string>([...(c.expect ?? []), ...(c.waive ?? [])].map((x) => x.check));
  for (const [f] of allFields(c)) {
    (f.checks ?? []).forEach((id) => checks.add(id));
    if (f.type === "derived" && f.limit !== undefined) checks.add(f.limit.check);
  }
  const exporters = new Set<string>(c.exports.flatMap((e) => [e.kind, ...(e.bundle ?? [])]));
  const machines = new Set<string>([...c.meta.machines, ...c.exports.flatMap((e) => (e.machine === undefined ? [] : [e.machine]))]);
  const reg: ChaseRegistries = {
    checks: [...checks].map((id) => ({ id })),
    exporters: [...exporters],
    constraintDims: allFields(c).flatMap(([f]) => (f.constraintDim === undefined ? [] : [f.constraintDim])),
    machines: [...machines],
    materials: c.materials.map((m) => m.material),
  };
  return claimFns === undefined ? reg : { ...reg, claimFns };
}

// 150 g press at 9.81 m/s2 is 1.4715 N (computed), written 1.47; the band
// 1.2 to 1.8 N is the access switch claim's tolerance (inferred).
const PRESS: ClaimDecl = {
  id: "press-force",
  fn: "spring.peak",
  want: { nominal: 1.47, lo: 1.2, hi: 1.8, unit: "N" },
  why: "access switch: 150 g press, 1.47 N at 9.81 m/s2",
};

const FNS = ["spring.forceAt", "spring.peak", "spring.contactTravel", "contact.at"];

function withClaims(...claims: ClaimDecl[]): Chase {
  return { ...flexPair(), claims };
}

describe("claims on a chase", () => {
  it("the press-force nominal is 150 g at 9.81 m/s2 to two places", () => {
    expect(0.15 * 9.81).toBeCloseTo(PRESS.want.nominal, 2);
  });

  it("validates a chase with claim press-force, band 1.2 to 1.8 N", () => {
    const c = withClaims(PRESS);
    expect(validateChase(c, registriesOf(c, FNS))).toEqual([]);
  });

  it("refuses lo above hi with E_SCHEMA, record chase-claim/range", () => {
    const c = withClaims({ ...PRESS, want: { nominal: 1.47, lo: 1.9, hi: 1.8, unit: "N" } });
    const e = validateChase(c, registriesOf(c, FNS));
    expect(e.map((x) => [x.code, x.path, x.record])).toEqual([["E_SCHEMA", "/claims/0/want", "chase-claim/range"]]);
  });

  it.each([
    ["nominal below lo", { nominal: 1.1, lo: 1.2, hi: 1.8 }],
    ["nominal above hi", { nominal: 1.9, lo: 1.2, hi: 1.8 }],
  ])("refuses %s with chase-claim/range", (_what, band) => {
    const c = withClaims({ ...PRESS, want: { ...band, unit: "N" } });
    expect(validateChase(c, registriesOf(c, FNS)).map((x) => x.record)).toEqual(["chase-claim/range"]);
  });

  it("accepts a zero-width band at the nominal", () => {
    const c = withClaims({ ...PRESS, want: { nominal: 1.47, lo: 1.47, hi: 1.47, unit: "N" } });
    expect(validateChase(c, registriesOf(c, FNS))).toEqual([]);
  });

  it("refuses an unknown fn with E_REF and didYouMean", () => {
    const c = withClaims({ ...PRESS, fn: "spring.peek" });
    const e = validateChase(c, registriesOf(c, FNS));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ code: "E_REF", path: "/claims/0/fn", got: "spring.peek", record: "chase-ref/claim-fn" });
    expect(e[0]!.didYouMean).toContain("spring.peak");
  });

  it("refuses every claim fn when the registries carry no claim fns", () => {
    const c = withClaims(PRESS);
    expect(validateChase(c, registriesOf(c)).map((x) => [x.code, x.record])).toEqual([["E_REF", "chase-ref/claim-fn"]]);
  });

  it("refuses a repeated claim id with chase-claim/id-unique at the second", () => {
    const c = withClaims(PRESS, { ...PRESS, fn: "spring.forceAt", args: { travelMm: 1.2 } });
    const e = validateChase(c, registriesOf(c, FNS));
    expect(e.map((x) => [x.code, x.path, x.record])).toEqual([["E_SCHEMA", "/claims/1/id", "chase-claim/id-unique"]]);
  });

  it("refuses an empty unit with chase-claim/unit", () => {
    const c = withClaims({ ...PRESS, want: { ...PRESS.want, unit: " " } });
    expect(validateChase(c, registriesOf(c, FNS)).map((x) => [x.path, x.record])).toEqual([["/claims/0/want/unit", "chase-claim/unit"]]);
  });

  it.each([
    ["an undeclared key on a claim", { ...PRESS, tol: 0.3 }, "/claims/0/tol"],
    ["an empty why", { ...PRESS, why: " " }, "/claims/0/why"],
    ["a string nominal", { ...PRESS, want: { ...PRESS.want, nominal: "1.47" } }, "/claims/0/want/nominal"],
  ])("refuses %s at the shape", (_what, claim, at) => {
    const c = withClaims(claim as unknown as ClaimDecl);
    const e = validateChase(c, registriesOf(c, FNS));
    expect(e.map((x) => x.code)).toEqual(["E_SCHEMA"]);
    expect(e[0]!.path).toBe(at);
  });
});
