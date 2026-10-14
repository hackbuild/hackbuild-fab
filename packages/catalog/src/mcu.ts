// Per-MCU pin rows (D-076, PROFILE.md 5, CHECKS.md 7.5). The catalog owns
// these rows and is the only place a pin threshold, pullup, input
// capacitance or leakage figure lives; the circuit kernel reads them through
// mcuPinRow. Every row carries Provenance (D-099); a row's tier and source
// are its provenance tier and source, so they are stored once.
//
// The boss-legacy row holds the BOSS sim constants (one 0.5 VIO threshold,
// the blocks.html 0.3 to 0.7 VIO hint) and decides no verdict (D-076,
// D-077). mcuPinRow refuses it with E_REF; only the BLOCKS reproduction
// reference reads it, through bossLegacyRow.

import {
  TIERS, commandError, didYouMean, qualifyRow,
  type IsoDate, type LegacyThreshold, type McuPinSpec, type Provenance, type ProvenanceMethod, type Qualified, type Tier,
} from "@hackbuild/spec";
import pinsJson from "../data/mcu-pins.json" with { type: "json" };

/** A catalog pin row: the McuPinSpec a circuit read takes, with the provenance it came from. */
export type McuPinRow = McuPinSpec & { readonly provenance: Provenance };

/** The id of the BOSS legacy row. */
export const BOSS_LEGACY_ID = "boss-legacy";

/** The one reference allowed to read the BOSS legacy row (M05-T07). */
export const BOSS_REPRODUCTION = "reference/electrical/blocks-pullup-band";

// ---- the stored shape, as written in data/mcu-pins.json ----

interface StoredFigure {
  readonly value: number;
  readonly unit: string;
  readonly tier: Tier;
  readonly source: string;
}

interface StoredProvenance {
  readonly tier: Tier;
  readonly method: ProvenanceMethod;
  readonly date: IsoDate;
  readonly machine: string | null;
  readonly coupon: string | null;
  readonly source: string;
}

interface StoredRow {
  readonly id: string;
  readonly name: string;
  readonly inherits?: string;
  readonly vddV?: number;
  readonly pullup?: McuPinSpec["pullup"];
  readonly vilMaxV?: number;
  readonly vihMinV?: number;
  readonly legacy?: LegacyThreshold;
  readonly inputCap?: StoredFigure;
  readonly leakage?: StoredFigure;
  readonly provenance: StoredProvenance;
}

const METHODS: readonly ProvenanceMethod[] = ["datasheet", "coupon", "failure", "felt", "listing", "derived"];

/** A malformed data file is a build fault, not a user error: it throws a plain Error naming the row and field. */
function bad(id: string, field: string, why: string): never {
  throw new Error(`packages/catalog/data/mcu-pins.json row ${id}: ${field} ${why}`);
}

function num(id: string, field: string, v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) bad(id, field, "is not a finite number");
  return v;
}

function provenanceOf(r: StoredRow): Provenance {
  const p = r.provenance;
  if (!TIERS.includes(p.tier)) bad(r.id, "provenance.tier", `is not a tier: ${String(p.tier)}`);
  if (!METHODS.includes(p.method)) bad(r.id, "provenance.method", `is not a method: ${String(p.method)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) bad(r.id, "provenance.date", "is not an ISO date");
  if (p.source === "") bad(r.id, "provenance.source", "is empty");
  return {
    tier: p.tier, method: p.method, date: p.date,
    ...(p.machine === null ? {} : { machine: p.machine }),
    ...(p.coupon === null ? {} : { coupon: p.coupon }),
    source: p.source,
  };
}

/** A stored figure as a Qualified: the qualifier is the row tier read through qualifyRow (D-007), never typed. */
function figure(id: string, field: string, f: StoredFigure | undefined, unit: string): Qualified {
  if (f === undefined) return bad(id, field, "is missing");
  if (f.unit !== unit) bad(id, `${field}.unit`, `is ${f.unit}, expected ${unit}`);
  if (!TIERS.includes(f.tier)) bad(id, `${field}.tier`, `is not a tier: ${String(f.tier)}`);
  return { value: num(id, `${field}.value`, f.value), unit, ...qualifyRow(f.tier), source: f.source };
}

function pullupOf(id: string, p: McuPinSpec["pullup"] | undefined): McuPinSpec["pullup"] {
  if (p === undefined) return bad(id, "pullup", "is missing");
  if (p.kind === "range") {
    const lo = num(id, "pullup.minOhm", p.minOhm);
    const hi = num(id, "pullup.maxOhm", p.maxOhm);
    if (!(lo > 0 && lo <= hi)) bad(id, "pullup", "range must have 0 < minOhm <= maxOhm");
    return { kind: "range", minOhm: lo, maxOhm: hi };
  }
  if (p.kind === "typical") return { kind: "typical", typOhm: num(id, "pullup.typOhm", p.typOhm) };
  return bad(id, "pullup.kind", "is neither range nor typical");
}

function resolve(r: StoredRow, stored: ReadonlyMap<string, StoredRow>): McuPinRow {
  const provenance = provenanceOf(r);
  if (r.inherits !== undefined) {
    const base = stored.get(r.inherits);
    if (base === undefined || base.inherits !== undefined || base.legacy !== undefined) {
      bad(r.id, "inherits", `names ${r.inherits}, which is not a stored vendor row`);
    }
    const from = resolve(base, stored);
    return { ...from, id: r.id, name: r.name, inherits: r.inherits, tier: provenance.tier, source: provenance.source, provenance };
  }
  const vddV = num(r.id, "vddV", r.vddV);
  let vilMaxV: number;
  let vihMinV: number;
  if (r.legacy !== undefined) {
    // BOSS reads HIGH only above vio x single (sim.js:135), so the one threshold is both VIL max and VIH min.
    const single = num(r.id, "legacy.single", r.legacy.single);
    if (r.vilMaxV !== undefined || r.vihMinV !== undefined) bad(r.id, "vilMaxV", "is derived from legacy.single on a legacy row");
    vilMaxV = single * vddV;
    vihMinV = single * vddV;
  } else {
    vilMaxV = num(r.id, "vilMaxV", r.vilMaxV);
    vihMinV = num(r.id, "vihMinV", r.vihMinV);
    if (!(vilMaxV > 0 && vilMaxV < vihMinV && vihMinV < vddV)) bad(r.id, "vilMaxV", "must satisfy 0 < VIL max < VIH min < VDD");
  }
  return {
    id: r.id, name: r.name, vddV, pullup: pullupOf(r.id, r.pullup), vilMaxV, vihMinV,
    tier: provenance.tier, source: provenance.source,
    inputCap: figure(r.id, "inputCap", r.inputCap, "pF"),
    leakage: figure(r.id, "leakage", r.leakage, "nA"),
    ...(r.legacy === undefined ? {} : { legacy: { single: r.legacy.single, hintBand: [r.legacy.hintBand[0], r.legacy.hintBand[1]] as const } }),
    provenance,
  };
}

const STORED: readonly StoredRow[] = (pinsJson as unknown as { readonly rows: readonly StoredRow[] }).rows;
const BY_ID = new Map(STORED.map((r) => [r.id, r]));
if (BY_ID.size !== STORED.length) throw new Error("packages/catalog/data/mcu-pins.json repeats a row id");
const ROWS: ReadonlyMap<string, McuPinRow> = new Map(STORED.map((r) => [r.id, resolve(r, BY_ID)]));

/** Every MCU id a verdict may read, in file order. The legacy row is not one of them. */
export const MCU_PIN_IDS: readonly string[] = STORED.filter((r) => r.legacy === undefined).map((r) => r.id);

/**
 * The pin row for id. E_REF with up to three ids by edit distance when no
 * row has it; E_REF naming D-076 for the legacy row, which decides no
 * verdict.
 */
export function mcuPinRow(id: string, path: `/${string}` = "/mcu"): McuPinRow {
  const row = ROWS.get(id);
  if (row !== undefined && row.legacy === undefined) return row;
  if (row !== undefined) {
    throw commandError({
      code: "E_REF",
      path,
      got: id,
      expected: "an MCU id with a catalog pin row",
      didYouMean: didYouMean(id, MCU_PIN_IDS),
      hint: `${id} holds the BOSS sim constants and decides no verdict (D-076); use a vendor row`,
      record: "D-076",
    });
  }
  throw commandError({
    code: "E_REF",
    path,
    got: id,
    expected: "an MCU id with a catalog pin row",
    didYouMean: didYouMean(id, MCU_PIN_IDS),
    hint: "no pin row for this mcu; use one of the catalog ids",
  });
}

/**
 * The BOSS legacy row, for the BLOCKS reproduction reference only (M05-T07,
 * D-076, D-077). Any other caller gets E_REF naming D-076.
 */
export function bossLegacyRow(reference: string): McuPinRow & { readonly legacy: LegacyThreshold } {
  const row = ROWS.get(BOSS_LEGACY_ID);
  if (reference === BOSS_REPRODUCTION && row?.legacy !== undefined) return { ...row, legacy: row.legacy };
  throw commandError({
    code: "E_REF",
    path: "/mcu",
    got: reference,
    expected: BOSS_REPRODUCTION,
    hint: `the ${BOSS_LEGACY_ID} row reproduces BOSS only (D-076); read a vendor row with mcuPinRow`,
    record: "D-076",
  });
}
