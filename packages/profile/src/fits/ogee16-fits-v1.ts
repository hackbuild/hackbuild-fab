// Legacy fit model ogee16-fits-v1 (M01-T09 step 2): the OGEE R16-P fits
// table as fits.py ran it, kept beside the D-100 loss table so the bench's
// own verdicts reproduce before the unified table replaces them. Ported
// from fits.py lines 25 to 40 and 79 to 92 (lineage ogee16.fits/r16p,
// sha256 b127b99e..., in ogee16-source.zip 47d6077e...). Every band is
// drawn clearance across the joint, mm, never per side: fits.py subtracts
// shaft from hole. LOSS is flat and applies to every class except PSLIDE
// and SNAP, whose bands are already the real gap (fits.py lines 28 to 35).
//
// PSLIDE is the fits.py name of the mixed printed-in-cut class. D-100 names
// it PSLIP and drops PSLIDE, so a band is keyed by the profile class id and
// carries the bench name as legacyClass.

import type { FitClassId, Mm, Provenance } from "@hackbuild/spec";
import { refError } from "../provenance.js";

/** One class band of a legacy model, drawn clearance across the joint, mm. */
export interface LegacyFitBand {
  /** Profile class id (fits.json); PSLIP for the bench's PSLIDE. */
  readonly class: FitClassId;
  /** The class name the bench printed. */
  readonly legacyClass: string;
  /** Band floor, drawn mm across the joint. */
  readonly lo: Mm;
  /** Band ceiling, drawn mm across the joint. */
  readonly hi: Mm;
  /** False when the band is already on the real gap and the loss column does not apply. */
  readonly applyLoss: boolean;
  /** The class meaning from fits.py, one line, lowercase. */
  readonly meaning: string;
  readonly provenance: Provenance;
}

export interface LegacyFitModel {
  readonly id: string;
  /** Flat loss of drawn clearance across the joint, mm (fits.py LOSS). */
  readonly loss: Mm;
  readonly lossProvenance: Provenance;
  /** Band edges hold within this, mm (fits.py "lo - 1e-9 <= drawn <= hi + 1e-9"). */
  readonly edgeTolerance: Mm;
  readonly bands: readonly LegacyFitBand[];
}

const ZIP = "fab-work-directory/benches/ogee16/outputs/ogee16-source.zip sha256 47d6077e0596eb4e9722a0a9f687cb82ec472c7bc031d8d2f61a98266aa94dd5";
const FITS = `${ZIP}, source/fits.py`;

/** fits.py BAND, a derived row (the bench's own table). */
const derived = (lines: string): Provenance => ({ tier: "inferred", method: "derived", date: "2026-08-17", source: `${FITS} ${lines}` });

/** The SLIDE band moved up 0.20 after the parts "still feel tight" (fits.py lines 36 to 37, D-099). */
const felt: Provenance = {
  tier: "inferred", method: "felt", date: "2026-08-17",
  source: `${FITS} lines 36 to 38: "bands moved up 0.20 after [stated] they still feel tight"`,
};

export const OGEE16_FITS_V1: LegacyFitModel = {
  id: "ogee16-fits-v1",
  loss: 0.25,
  lossProvenance: derived("line 25 LOSS, holes about 0.15 under and outsides about 0.10 over (docstring lines 4 to 7)"),
  edgeTolerance: 1e-9,
  bands: [
    { class: "SLIDE" as FitClassId, legacyClass: "SLIDE", lo: 0.70, hi: 0.90, applyLoss: true, meaning: "moves against its mate every actuation", provenance: felt },
    { class: "PSLIP" as FitClassId, legacyClass: "PSLIDE", lo: 0.45, hi: 0.70, applyLoss: false, meaning: "a printed part in a cut slot, banded on the real gap; the loss column does not apply", provenance: derived("lines 27 to 30 and 38") },
    { class: "SNAP" as FitClassId, legacyClass: "SNAP", lo: -1.30, hi: -0.15, applyLoss: false, meaning: "a barb forced through a hole it does not fit, swaging the bore; the lead-in makes it work", provenance: derived("lines 31 to 35 and 38") },
    { class: "LOCATE" as FitClassId, legacyClass: "LOCATE", lo: 0.25, hi: 0.40, applyLoss: true, meaning: "goes together by hand and stays put", provenance: derived("line 39") },
    { class: "PRESS" as FitClassId, legacyClass: "PRESS", lo: 0.00, hi: 0.16, applyLoss: true, meaning: "must not come apart; the hole shrinking grips", provenance: derived("line 40") },
  ],
};

/** Legacy fit models by id. */
export const FIT_MODELS: Readonly<Record<string, LegacyFitModel>> = { [OGEE16_FITS_V1.id]: OGEE16_FITS_V1 };

/** A legacy model by id; E_REF naming the known ids otherwise. */
export function fitModel(id: string): LegacyFitModel {
  const m = FIT_MODELS[id];
  if (m === undefined) throw refError("/facts/fitModel", id, `no legacy fit model ${id}`, Object.keys(FIT_MODELS));
  return m;
}

/** The band of a profile class id in a legacy model; E_REF when the model has no band for it. */
export function legacyBand(m: LegacyFitModel, cls: string): LegacyFitBand {
  const b = m.bands.find((x) => x.class === cls);
  if (b === undefined) throw refError("/facts/fitClass", cls, `fit model ${m.id} has no ${cls} band`, m.bands.map((x) => x.class as string));
  return b;
}

/** In band with the model's edge tolerance (fits.py main). */
export function inLegacyBand(m: LegacyFitModel, b: LegacyFitBand, drawn: Mm): boolean {
  return b.lo - m.edgeTolerance <= drawn && drawn <= b.hi + m.edgeTolerance;
}

/** The "after loss" column: drawn minus the flat loss, or drawn when the band is on the real gap. */
export function legacyAfterLoss(m: LegacyFitModel, b: LegacyFitBand, drawn: Mm): Mm {
  return b.applyLoss ? drawn - m.loss : drawn;
}
