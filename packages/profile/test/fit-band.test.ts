// M01-T09: the legacy fit model ogee16-fits-v1 and profile/fit-band.
// Legacy bands are compared with the bench's own fits.py LOSS and BAND,
// typed here from fits.py lines 25 and 38 to 40 (ogee16-source.zip sha256
// 47d6077e...) as goldens. The D-100
// path is compared with the PROFILE.md 7.3 drawnFor table (computed, layer
// 0.24), never with values this package writes.

import { describe, expect, test } from "vitest";
import { isThrownCommandError, type ConstraintCtx, type FitClassId } from "@hackbuild/spec";
import {
  OGEE16_FITS_V1, createProfileLookup, fitBand, fitModel, inLegacyBand, legacyAfterLoss, legacyBand, loadProfile,
} from "../src/index";

// fits.py line 25 LOSS and lines 38 to 40 BAND, drawn across the joint, mm.
const FITS_PY = {
  loss: 0.25,
  band: { SLIDE: [0.70, 0.90], PSLIDE: [0.45, 0.70], SNAP: [-1.30, -0.15], LOCATE: [0.25, 0.40], PRESS: [0.00, 0.16] },
  notApplied: ["PSLIDE", "SNAP"],
} as const;

const ctx = (facts: ConstraintCtx["facts"], material = "petg"): ConstraintCtx => ({
  profile: createProfileLookup(loadProfile()), machine: "ffc5p", material, facts,
});

const codeOf = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf.code;
    throw e;
  }
  return "accepted";
};

describe("ogee16-fits-v1 against fits.py", () => {
  test("bands, legacy names, loss and the loss column per class equal fits.py", () => {
    const m = fitModel("ogee16-fits-v1");
    expect(m).toBe(OGEE16_FITS_V1);
    expect(m.loss).toBe(FITS_PY.loss);
    expect(Object.fromEntries(m.bands.map((b) => [b.legacyClass, [b.lo, b.hi]]))).toEqual(FITS_PY.band);
    for (const b of m.bands) expect(b.applyLoss, b.legacyClass).toBe(!(FITS_PY.notApplied as readonly string[]).includes(b.legacyClass));
  });

  test("PSLIDE is keyed as PSLIP (D-100); the bench name stays as legacyClass", () => {
    expect(legacyBand(OGEE16_FITS_V1, "PSLIP").legacyClass).toBe("PSLIDE");
    expect(codeOf(() => legacyBand(OGEE16_FITS_V1, "PSLIDE"))).toBe("E_REF");
  });

  test("SLIDE carries method felt and the others derived (D-099)", () => {
    const methods = Object.fromEntries(OGEE16_FITS_V1.bands.map((b) => [b.legacyClass, b.provenance.method]));
    expect(methods).toEqual({ SLIDE: "felt", PSLIDE: "derived", SNAP: "derived", LOCATE: "derived", PRESS: "derived" });
    for (const b of OGEE16_FITS_V1.bands) expect(b.provenance.source).toContain("47d6077e0596eb4e9722a0a9f687cb82ec472c7bc031d8d2f61a98266aa94dd5");
  });

  test("band edges hold within 1e-9 mm and no further (fits.py lo - 1e-9 <= drawn <= hi + 1e-9)", () => {
    const m = OGEE16_FITS_V1;
    const b = legacyBand(m, "LOCATE");
    expect(m.edgeTolerance).toBe(1e-9);
    expect([b.lo - 5e-10, b.lo, b.hi, b.hi + 5e-10].map((d) => inLegacyBand(m, b, d))).toEqual([true, true, true, true]);
    expect([b.lo - 2e-9, b.hi + 2e-9].map((d) => inLegacyBand(m, b, d))).toEqual([false, false]);
  });

  test("after loss subtracts 0.25 for SLIDE and keeps drawn for PSLIP and SNAP", () => {
    expect(legacyAfterLoss(OGEE16_FITS_V1, legacyBand(OGEE16_FITS_V1, "SLIDE"), 0.75)).toBe(0.5);
    expect(legacyAfterLoss(OGEE16_FITS_V1, legacyBand(OGEE16_FITS_V1, "PSLIP"), 0.55)).toBe(0.55);
    expect(legacyAfterLoss(OGEE16_FITS_V1, legacyBand(OGEE16_FITS_V1, "SNAP"), -1.15)).toBe(-1.15);
  });

  test("an unknown model is E_REF naming the known one", () => {
    let hint: readonly string[] | undefined;
    try {
      fitModel("ogee16-fits-v2");
    } catch (e) {
      if (isThrownCommandError(e)) hint = e.hbf.didYouMean;
    }
    expect(hint).toEqual(["ogee16-fits-v1"]);
  });
});

describe("profile/fit-band", () => {
  const legacy = { fitModel: "ogee16-fits-v1" } as const;

  test("fit.drawn on the legacy model: the band ends, inferred, with the class meaning and method", () => {
    const [lo, hi, ...rest] = fitBand.bounds("fit.drawn", ctx({ ...legacy, fitClass: "SLIDE" }));
    expect(rest).toEqual([]);
    expect([lo!.side, lo!.value, hi!.side, hi!.value]).toEqual(["lo", 0.7, "hi", 0.9]);
    expect([lo!.kernel, lo!.qualifier, lo!.basis, lo!.source]).toEqual(["profile", "inferred", "inferred", "ogee16-fits-v1"]);
    expect(lo!.reason).toBe("SLIDE moves against its mate every actuation, ogee16-fits-v1 band, method felt");
    expect(fitBand.bounds("fit.drawn", ctx({ ...legacy, fitClass: "PSLIP" }))[0]!.reason).toMatch(/^PSLIP \(was PSLIDE\) /);
  });

  test("fit.hole is the shaft plus the band: shaft 2.65 in LOCATE gives 2.90 to 3.05", () => {
    const b = fitBand.bounds("fit.hole", ctx({ ...legacy, fitClass: "LOCATE", shaftMm: 2.65 }));
    expect(b.map((x) => [x.side, Number(x.value.toFixed(9))])).toEqual([["lo", 2.9], ["hi", 3.05]]);
    expect(b[0]!.reason).toMatch(/^shaft 2.65 mm plus LOCATE /);
  });

  test("fit.hole without a numeric shaft is E_PARAM_MISSING", () => {
    expect(codeOf(() => fitBand.bounds("fit.hole", ctx({ ...legacy, fitClass: "LOCATE" })))).toBe("E_PARAM_MISSING");
    expect(codeOf(() => fitBand.bounds("fit.hole", ctx({ ...legacy, fitClass: "LOCATE", shaftMm: "2.65" })))).toBe("E_PARAM_MISSING");
  });

  test("a missing fitClass is E_PARAM_MISSING; a dim it does not own gives no bound", () => {
    expect(codeOf(() => fitBand.bounds("fit.drawn", ctx({ ...legacy })))).toBe("E_PARAM_MISSING");
    expect(fitBand.bounds("conductor.width", ctx({ ...legacy, fitClass: "SLIDE" }))).toEqual([]);
  });

  test("D-100 path: drawnFor per side doubled to the joint, PROFILE.md 7.3 at layer 0.24", () => {
    const at = (fitClass: string, material = "petg") =>
      fitBand.bounds("fit.drawn", ctx({ fitClass, layerMm: 0.24 }, material)).map((x) => Number(x.value.toFixed(9)));
    expect(at("SLIDE")).toEqual([0.65, 0.8]);
    expect(at("LOCATE")).toEqual([0.4, 0.55]);
    expect(at("PSLIP")).toEqual([0.45, 0.7]);
    expect(fitBand.bounds("fit.drawn", ctx({ fitClass: "SLIDE", layerMm: 0.24 }))[0]!.reason).toContain("hole loss row, petg on ffc5p");
  });

  test("D-100 path: a laser in laser class has no loss side and gives no bound", () => {
    expect(createProfileLookup(loadProfile()).fit("LAP" as FitClassId).processes).toEqual(["laser", "laser"]);
    expect(fitBand.bounds("fit.drawn", ctx({ fitClass: "LAP" }))).toEqual([]);
  });
});
