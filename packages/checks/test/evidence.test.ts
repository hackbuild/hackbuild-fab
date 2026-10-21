// R1-engine-26: CHK-CLAIM-01 reads evidence rows. The claim is the access
// switch press-force band, 1.2 to 1.8 N (packages/chase/test/claims.test.ts
// PRESS); the spring peak is a test metric, 1.55 N computed on a vendor
// basis, so every verdict change below comes from the rows. The gram to
// newton factor is checked against 0.150 x 9.80665 written out here, the
// CGPM 1901 standard gravity, independent of the conversion table.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckLevel, ClaimDecl, KernelId, Metric, Part } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import {
  CHECK_MODULES, checkClaim, convertUnit, measuredOf, measuredValues, parseEvidence, registerChecks, runRegistry, type EvidenceRow,
} from "../src/index";

const PRESS: ClaimDecl = { id: "press-force", fn: "spring.peak", want: { nominal: 1.47, lo: 1.2, hi: 1.8, unit: "N" }, why: "access switch: 150 g press" };
const PEAK: Metric = { id: "spring.peakN", value: 1.55, unit: "N", note: "test peak", gate: "CHK-CLAIM-01", qualifier: "computed", basis: "vendor" };

let n = 0;
function row(over: Partial<EvidenceRow>): EvidenceRow {
  n += 1;
  return { id: `r${n}`, claim: "press-force", kind: "note", qualifier: "none", at: "1980-01-01T00:00:00.000Z", who: "agent", ...over } as EvidenceRow;
}
const reading = (value: number, unit: string): EvidenceRow => row({ kind: "coupon", value, unit, qualifier: "measured" });
const felt = (note: string, direction: "high" | "low"): EvidenceRow => row({ kind: "note", note, direction });

const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as unknown;
const def = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).find((d) => d.id === "CHK-CLAIM-01")!;
const part = { id: "spring", bodies: [], features: [], assertions: [], metrics: [PEAK] } as unknown as Part;

async function chk(rows: readonly EvidenceRow[]) {
  const [r] = (await runRegistry([def], {
    kernels: new Set<KernelId>(["geom", "mesh", "profile"]), produced: new Set<CheckLevel>(["part"]), targets: { parts: [part] },
    ctx: { profile: createProfileLookup(loadProfile()), machine: "ffc5p", whitelist: new Map() },
    claims: { decls: [PRESS], rows },
  })).results;
  return r!;
}

describe("evidence rows", () => {
  test("150 g is 0.150 x 9.80665 N; a force reading cannot back a length claim", () => {
    expect(convertUnit(150, "g", "N")).toBeCloseTo(0.15 * 9.80665, 12);
    expect(convertUnit(1, "in", "mm")).toBe(25.4);
    expect(() => convertUnit(2, "N", "mm")).toThrow(/E_SCHEMA \/unit a force reading/);
    expect(() => convertUnit(2, "lb", "N")).toThrow(/E_SCHEMA/);
  });

  test("parseEvidence reads rows and refuses a malformed line by number", () => {
    const ok = reading(2.1, "N");
    expect(parseEvidence(`${JSON.stringify(ok)}\n\n`)).toEqual([ok]);
    const bad = { ...ok, qualifier: "none" };
    expect(() => parseEvidence(`${JSON.stringify(ok)}\n${JSON.stringify(bad)}\n`, "e.jsonl")).toThrow(/E_SCHEMA \/evidence\/1 e\.jsonl:2/);
    expect(() => parseEvidence(`${JSON.stringify(row({ direction: "high" }))}\n`)).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ expected: "direction is high or low and comes with a note" }) }));
  });

  test("the last measured reading wins, converted to the claim unit; measuredValues lists all of them", () => {
    const rows = [reading(2.1, "N"), felt("too stiff", "high"), reading(150, "g")];
    expect(measuredOf(rows, PRESS)!.value).toBeCloseTo(1.4709975, 9);
    expect(measuredValues(rows, PRESS)).toEqual([2.1, convertUnit(150, "g", "N")]);
    expect(measuredOf([felt("too stiff", "high")], PRESS)).toBeNull();
  });
});

describe("CHK-CLAIM-01 with evidence (R1-engine-26)", () => {
  test("without rows the computed peak 1.55 N passes as computed", async () => {
    const r = await chk([]);
    expect([r.verdict, r.measured, r.extra?.["qualifier"]]).toEqual(["pass", 1.55, "computed"]);
  });

  test("--value 2.1 --unit N fails as measured", async () => {
    const r = await chk([reading(2.1, "N")]);
    expect([r.verdict, r.measured, r.extra?.["qualifier"], r.extra?.["basis"]]).toEqual(["fail", 2.1, "measured", "measured"]);
    expect(r.constraint).toMatch(/^claim press-force spring\.peak 2\.1 N \(measured, measured basis\), legal 1\.2 to 1\.8/);
  });

  test("--value 150 --unit g passes as measured at 1.471 N", async () => {
    const r = await chk([reading(150, "g")]);
    expect(r.verdict).toBe("pass");
    expect(r.extra?.["qualifier"]).toBe("measured");
    expect(r.measured as number).toBeCloseTo(0.15 * 9.80665, 9);
  });

  test("a note with a direction warns, names the note and sets no number", async () => {
    const r = await chk([felt("too stiff", "high")]);
    expect([r.verdict, r.extra?.["qualifier"], r.extra?.["direction"]]).toEqual(["warn", "computed", "high"]);
    expect(r.measured).toBe(1.55);
    expect(r.constraint).toContain("\"too stiff\"");
    expect(r.constraint).not.toMatch(/\d/);
    // A note never lifts an out-of-band value off fail.
    const out = checkClaim({ ...PRESS, want: { ...PRESS.want, hi: 1.5 } }, [PEAK], { rows: [felt("too stiff", "high")] });
    expect(out.verdict).toBe("fail");
  });

  test("a measured reading after a note decides the verdict; a photo row is listed and moves nothing", async () => {
    const r = await chk([felt("too stiff", "high"), reading(1.6, "N")]);
    expect([r.verdict, r.extra?.["qualifier"]]).toEqual(["pass", "measured"]);
    const photo = row({ kind: "photo", file: { sha256: "a".repeat(64), path: "evidence/files/x.jpg" } });
    const p = checkClaim(PRESS, [PEAK], { rows: [photo] });
    expect([p.verdict, p.qualification.qualifier, p.evidence]).toEqual(["pass", "computed", [{ kind: "file", ref: "evidence/files/x.jpg" }]]);
  });
});
