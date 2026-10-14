// ProfileLookup over the profile tables (M00-T02). Every read is recorded
// once as (table, id) with the row it returned, and profileHash is sha256
// over RFC 8785 canonical JSON of exactly those rows, sorted (D-051).
//
// Two table sources. tablesFromData builds the full tables from
// packages/profile/data/*.json (loadProfile reads them). tablesFromSeed is
// the M-S slice (M-S-T02) over the seed alone, kept for the callers that
// still pass the seed; its rows agree with data/ (lookup.test.ts asserts it).

import type {
  BleedRow, BuildWarning, Constant, ContactKind, ContactRow, FitBand, FitClassId, FitMotion, GapFeature, LossRow,
  Machine, MachinePreset, Material, Mm, Ohm, ProfileLookup, ProfileRead, Provenance, RealGaps, ResistivityDirection,
  ResistivityRow, SectionResistance, StrainLimit, Toolhead, Vec3,
} from "@hackbuild/spec";
import { CanonicalizeError, PROCESSES, canonicalize, sha256Hex } from "@hackbuild/spec";
import { findConstant, loadConstants, type ConstantTable } from "./constants.js";
import { findFit, loadFits, sideOf, type FitTable } from "./fits.js";
import { FIT_MOTIONS, applyLoss, gapRows, invertLoss, loadLoss, lossRowId, type GapRows, type GapSide } from "./loss.js";
import { loadMachines } from "./machines.js";
import {
  type ProfileError, checkProvenance, refError, schemaError, tierRank, type ProvenanceRules,
} from "./provenance.js";
import materialsJson from "../data/materials.json" with { type: "json" };
import machinesJson from "../data/machines.json" with { type: "json" };
import fitsJson from "../data/fits.json" with { type: "json" };
import lossJson from "../data/loss.json" with { type: "json" };
import constantsJson from "../data/constants.json" with { type: "json" };
import opacityJson from "../data/opacity.json" with { type: "json" };

// ---- slicer filament table (D-101, PROFILE.md 9) ----

/**
 * A filament preset harvested from a slicer save, one per slot of that
 * save. Values are strings as the slicer stores them in
 * Metadata/project_settings.config.
 */
export interface FilamentPreset {
  /** filament_settings_id, for example "Generic PETG @FF C5P". */
  readonly id: string;
  /** filament_type, for example "PETG". */
  readonly type: string;
  readonly machine: string;
  /** MachinePreset id the save printed under. */
  readonly preset: string;
  /** Slot of the save the column came from, 1-based. */
  readonly slot: number;
  readonly values: Readonly<Record<string, string>>;
  readonly provenance: Provenance;
}

/**
 * Generic per-type fallback for a filament type no harvested preset covers
 * (seed 3mf/materials.json). Temperatures C, density g/cm3, cost per kg,
 * vitrification C, maxvol mm3/s, fans percent.
 */
export interface FilamentFallback {
  readonly type: string;
  readonly tray: string;
  readonly nozzle: number;
  readonly nozzle_first: number;
  readonly bed: number;
  readonly bed_first: number;
  readonly density: number;
  readonly cost: number;
  readonly vitrification: number;
  readonly maxvol: number;
  readonly fan_max: number;
  readonly fan_min: number;
  readonly overhang_fan: number;
  readonly flow: number;
  readonly range_low: number;
  readonly range_high: number;
  readonly provenance: Provenance;
}

/** Everything the lookup reads. Tables the M-S slice lacks are optional. */
export interface ProfileTables {
  readonly materials: readonly Material[];
  readonly machines: readonly Machine[];
  readonly loss: readonly LossRow[];
  readonly fits?: FitTable;
  readonly constants?: ConstantTable;
  /** Bleed rows a coupon wrote (D-084). None exist; every pair reads the default. */
  readonly bleed?: readonly BleedRow[];
  readonly filamentPresets?: readonly FilamentPreset[];
  readonly filamentFallback?: readonly FilamentFallback[];
  /** Notes on the filament table, including the fallback disagreement with the gold. */
  readonly filamentNotes?: string;
}

/** The parsed data/*.json files. */
export interface ProfileData {
  readonly materials: unknown;
  readonly machines: unknown;
  readonly fits: unknown;
  readonly loss: unknown;
  readonly constants: unknown;
  /** data/opacity.json: more constant rows (M03-T07), loaded into the one constants table. */
  readonly opacity?: unknown;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

function loadMaterialRows(raw: unknown, rules: ProvenanceRules): Material[] {
  if (!isObj(raw) || !Array.isArray(raw["materials"])) throw schemaError("/materials", "materials.json needs a materials array");
  const seen = new Set<string>();
  return raw["materials"].map((x: unknown, i): Material => {
    const path = `/materials/${i}`;
    if (!isObj(x) || typeof x["id"] !== "string") throw schemaError(path, "material row needs an id");
    const id = x["id"];
    if (seen.has(id)) throw schemaError(`${path}/id`, `material ${id} listed twice`);
    seen.add(id);
    const pr = x["processes"];
    if (!Array.isArray(pr) || pr.length === 0 || !pr.every((p) => (PROCESSES as readonly unknown[]).includes(p))) {
      throw schemaError(`${path}/processes`, `material ${id} needs known processes`);
    }
    if (!["low", "high", "unknown"].includes(x["creep"] as string)) throw schemaError(`${path}/creep`, `material ${id} creep`);
    if (!Array.isArray(x["resistivity"]) || !Array.isArray(x["strain"])) {
      throw schemaError(path, `material ${id} needs resistivity and strain lists`);
    }
    x["resistivity"].forEach((r: unknown, j) => {
      if (!isObj(r) || typeof r["id"] !== "string") throw schemaError(`${path}/resistivity/${j}`, "resistivity row needs an id");
      const p = checkProvenance(r["provenance"], `${path}/resistivity/${j}/provenance`, rules);
      if (p.method === "coupon" && p.conditions === undefined) {
        throw schemaError(`${path}/resistivity/${j}/provenance/conditions`, "a coupon resistivity row needs print conditions");
      }
    });
    x["strain"].forEach((r: unknown, j) => {
      if (!isObj(r) || !isNum(r["pct"])) throw schemaError(`${path}/strain/${j}`, "strain row needs pct");
      checkProvenance(r["provenance"], `${path}/strain/${j}/provenance`, rules);
    });
    if (pr.includes("fdm")) {
      const h = x["handling"];
      if (!isObj(h) || typeof h["abrasive"] !== "boolean" || typeof h["flexible"] !== "boolean") {
        throw schemaError(`${path}/handling`, `fdm material ${id} needs handling (PROFILE.md 3.6)`);
      }
      checkProvenance(h["provenance"], `${path}/handling/provenance`, rules);
    }
    checkProvenance(x["provenance"], `${path}/provenance`, rules);
    return x as unknown as Material;
  });
}

function loadFilaments(raw: unknown, rules: ProvenanceRules): {
  presets: FilamentPreset[]; fallback: FilamentFallback[]; notes: string;
} {
  if (!isObj(raw)) throw schemaError("/materials", "materials.json is not an object");
  const pr = Array.isArray(raw["filamentPresets"]) ? raw["filamentPresets"] : [];
  const presets = pr.map((x: unknown, i): FilamentPreset => {
    const path = `/filamentPresets/${i}`;
    if (!isObj(x) || typeof x["id"] !== "string" || !isObj(x["values"])) throw schemaError(path, "filament preset needs id and values");
    if (Object.values(x["values"]).some((v) => typeof v !== "string")) {
      throw schemaError(`${path}/values`, "filament preset values are strings as the slicer stores them");
    }
    checkProvenance(x["provenance"], `${path}/provenance`, rules);
    return x as unknown as FilamentPreset;
  });
  const fb = isObj(raw["filamentFallback"]) ? raw["filamentFallback"] : {};
  const rows = Array.isArray(fb["rows"]) ? fb["rows"] : [];
  const fallback = rows.map((x: unknown, i): FilamentFallback => {
    if (!isObj(x) || typeof x["type"] !== "string") throw schemaError(`/filamentFallback/rows/${i}`, "fallback row needs a type");
    checkProvenance(x["provenance"], `/filamentFallback/rows/${i}/provenance`, rules);
    return x as unknown as FilamentFallback;
  });
  return { presets, fallback, notes: typeof fb["note"] === "string" ? fb["note"] : "" };
}

/**
 * constants.json with the rows of another constants file appended, so one
 * table holds them and loadConstants refuses an id listed in both.
 */
function withConstantRows(base: unknown, extra: unknown, path: string): unknown {
  if (extra === undefined) return base;
  if (!isObj(extra) || !Array.isArray(extra["constants"])) throw schemaError(path, `${path.slice(1)}.json needs a constants array`);
  if (!isObj(base) || !Array.isArray(base["constants"])) return base;
  return { ...base, constants: [...base["constants"], ...extra["constants"]] };
}

/** Build the full tables from the parsed data files, refusing any row that breaks a load rule. */
export function tablesFromData(data: ProfileData, rules: ProvenanceRules = {}): ProfileTables {
  const materials = loadMaterialRows(data.materials, rules);
  const fil = loadFilaments(data.materials, rules);
  const machines = loadMachines(data.machines, rules);
  if (!isObj(data.loss)) throw schemaError("/loss", "loss.json is not an object");
  const loss = loadLoss(data.loss["loss"], rules);
  const fits = loadFits(data.fits, rules);
  const constants = loadConstants(withConstantRows(data.constants, data.opacity, "/opacity"), rules);
  const known = new Set(machines.map((m) => m.id));
  const mats = new Set(materials.map((m) => m.id));
  loss.forEach((r, i) => {
    if (r.machine !== undefined && !known.has(r.machine)) throw refError(`/loss/${i}/machine`, r.machine, "loss row names an unknown machine");
    if (r.material !== undefined && !mats.has(r.material)) throw refError(`/loss/${i}/material`, r.material, "loss row names an unknown material");
  });
  return {
    materials, machines, loss, fits, constants, bleed: [],
    filamentPresets: fil.presets, filamentFallback: fil.fallback, filamentNotes: fil.notes,
  };
}

/** The data files as shipped in packages/profile/data. */
export const PROFILE_DATA: ProfileData = {
  materials: materialsJson, machines: machinesJson, fits: fitsJson, loss: lossJson, constants: constantsJson,
  opacity: opacityJson,
};

/** The full tables from packages/profile/data. */
export function loadProfile(rules: ProvenanceRules = {}): ProfileTables {
  return tablesFromData(PROFILE_DATA, rules);
}

// ---- M-S slice from the seed (M-S-T02) ----
//
// Kept row for row so the keys flex-pair profileHash in
// reference/keys/flex-pair/expected/build.json does not move. lookup.test.ts
// asserts every number here equals the matching data/ row.

/** The ids this slice loads from the seed (M-S-T02). */
export const SLICE = {
  machines: ["ffc5p"],
  materials: ["petg", "cpla", "ctpu"],
} as const;

const MOTIONS = FIT_MOTIONS;

// ---- seed shape, the fields this slice reads ----

interface SeedLoss { readonly holeUnder: number; readonly outerOver: number }
interface SeedProvenance { readonly tier: string; readonly source: string }
interface SeedMaterial {
  readonly id: string;
  readonly process: readonly string[];
  readonly creep?: string;
  readonly brand?: string;
  readonly processLossAt024?: SeedLoss;
  readonly provenance: SeedProvenance;
}
interface SeedMachine {
  readonly id: string;
  readonly name: string;
  readonly process: string;
  readonly envelope: readonly number[];
  readonly processLoss?: SeedLoss;
  readonly slicer: { readonly app: string; readonly printer: string; readonly process: string; readonly filament: string };
  readonly provenance: SeedProvenance;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function seedEntry(seed: unknown, table: "materials" | "machines", id: string): Record<string, unknown> {
  if (!isRecord(seed) || !Array.isArray(seed[table])) throw schemaError(`/${table}`, `seed has no ${table} array`);
  const rows = seed[table] as unknown[];
  const i = rows.findIndex((r) => isRecord(r) && r["id"] === id);
  const row = rows[i];
  if (!isRecord(row)) throw refError(`/${table}`, id, `seed has no ${table} row ${id}`);
  if (!isRecord(row["provenance"]) || typeof row["provenance"]["tier"] !== "string") {
    throw schemaError(`/${table}/${i}/provenance/tier`, `seed row ${id} has no tier`);
  }
  return row;
}

function seedLoss(x: unknown, path: string): SeedLoss {
  if (!isRecord(x) || typeof x["holeUnder"] !== "number" || typeof x["outerOver"] !== "number") {
    throw schemaError(path, "loss needs numeric holeUnder and outerOver");
  }
  return { holeUnder: x["holeUnder"], outerOver: x["outerOver"] };
}

// ---- rows the seed does not hold, from PROFILE.md ----

const PROFILE_DATE = "2026-10-04";
const GOLD_DATE = "2026-08-19";
const PIP_DATE = "2026-09-18";

/** PROFILE.md 4.1, D-081. Inferred, derived from the Yousu filament figure. */
const PIP_RESISTIVITY: readonly (ResistivityRow & { readonly material: string })[] = [
  {
    id: "cpla.pip.along", material: "cpla", direction: "along", ohmCm: 500, form: "printed", brand: "Yousu",
    provenance: { tier: "inferred", method: "derived", date: PIP_DATE,
      source: "pip/src/layout.js:46 (rhoC); pip/docs/electrical.md:15-17" },
  },
  {
    id: "cpla.pip.through", material: "cpla", direction: "through", ohmCm: 2000, form: "printed", brand: "Yousu",
    provenance: { tier: "inferred", method: "derived", date: PIP_DATE, source: "pip/src/layout.js:46 (rhoCz)" },
  },
  {
    id: "ctpu.pip.bulk", material: "ctpu", direction: "bulk", ohmCm: 400, form: "printed", brand: "Yousu",
    provenance: { tier: "inferred", method: "derived", date: PIP_DATE,
      source: "pip/src/layout.js:46 (rhoT), contact TPU" },
  },
];

/** PROFILE.md 3.1 names and 3.6 handling for the slice materials. */
const MATERIAL_FACTS: Readonly<Record<string, {
  readonly name: string; readonly abrasive: boolean; readonly flexible: boolean; readonly handlingSource: string;
}>> = {
  petg: { name: "PETG, shop default", abrasive: false, flexible: false,
    handlingSource: "unfilled; prints on record at 0.4 only (24 owner 3MFs on the 0.4 preset)" },
  cpla: { name: "conductive PLA, Yousu (shop spool)", abrasive: true, flexible: false,
    handlingSource: "carbon filled; PIP slot 2 at 0.4 (pip-controller/docs/printing.md:18)" },
  ctpu: { name: "conductive TPU 95A, Yousu (shop spool)", abrasive: true, flexible: true,
    handlingSource: "carbon filled; PIP slot 4 at 0.4 (pip-controller/docs/printing.md:20)" },
};

/**
 * Build plate for ffc5p. Counted 2026-10-05 over the owner's Creator 5 Pro
 * saves that carry curr_bed_type: 14 of 18 read "Textured PEI Plate" (the
 * rest High Temp 3, Cool 1), and the owner prints on textured PEI. App
 * exports that omitted the key opened on the cold plate in Flash Studio.
 */
const FFC5P_BED_TYPE = "Textured PEI Plate";

/** PROFILE.md 8.1, read from the gold slicer save. Vendor. */
const FFC5P_PRESET = {
  id: "ffc5p_20260819",
  nozzle: 0.4,
  layer: 0.24,
  firstLayer: 0.25,
  lineWidth: 0.42,
  wallLoops: 2,
  comp: { xyHole: 0, xyContour: 0, elephantFoot: 0.1, elephantFootLayers: 1 },
  provenance: { tier: "vendor", method: "datasheet", date: GOLD_DATE,
    source: "gold project_settings.config (layer_height, initial_layer_print_height, line_width, wall_loops); comp :186-187, 1590-1591" },
} as const;

/** PROFILE.md 8.3. Vendor until a person confirms the installed nozzles. */
function ffc5pToolheads(): Toolhead[] {
  return [1, 2, 3, 4].map((index) => ({
    index, nozzleMm: 0.4, nozzleMaterial: "hardened_steel", flexOk: true,
    provenance: { tier: "vendor", method: "datasheet", date: GOLD_DATE,
      source: `gold nozzle_diameter and nozzle_type element ${index}; flexOk from extruder_type Direct Drive` },
  }));
}


/** Build the M-S slice tables from the parsed seed (packages/profile/seed/profile.seed.json). */
export function tablesFromSeed(seed: unknown): ProfileTables {
  const m = seedEntry(seed, "machines", "ffc5p") as unknown as SeedMachine;
  if (m.process !== "fdm") throw schemaError("/machines/ffc5p/process", "ffc5p must be fdm");
  if (m.envelope.length !== 3) throw schemaError("/machines/ffc5p/envelope", "ffc5p envelope needs three numbers");
  const envelope: Vec3 = [m.envelope[0] ?? 0, m.envelope[1] ?? 0, m.envelope[2] ?? 0];
  const machineLoss = seedLoss(m.processLoss, "/machines/ffc5p/processLoss");

  const preset: MachinePreset = {
    ...FFC5P_PRESET,
    slicer: { app: m.slicer.app, printer: m.slicer.printer, process: m.slicer.process, filament: m.slicer.filament,
      bedType: FFC5P_BED_TYPE },
  };
  // Seed tier measured loads as vendor, datasheet (PROFILE.md 2.4, D-101).
  const machine: Machine = {
    id: m.id, name: m.name, process: "fdm", envelope, toolheads: ffc5pToolheads(), presets: [preset],
    provenance: { tier: "vendor", method: "datasheet", date: GOLD_DATE,
      source: `seed machines.ffc5p (${m.provenance.source}); gold printable_area and printable_height` },
  };

  const materials: Material[] = SLICE.materials.map((id) => {
    const s = seedEntry(seed, "materials", id) as unknown as SeedMaterial;
    const facts = MATERIAL_FACTS[id];
    if (facts === undefined) throw refError("/materials", id, `no profile facts for ${id}`);
    const creep = s.creep === "low" || s.creep === "high" ? s.creep : "unknown";
    const provenance: Provenance = { tier: "inferred", method: "derived", date: PROFILE_DATE,
      source: `seed materials.${id} (${s.provenance.source}); docs/plan/PROFILE.md 3.1` };
    return {
      id, name: facts.name, processes: ["fdm"], creep,
      ...(id === "petg" ? {} : { brand: "Yousu" }),
      resistivity: PIP_RESISTIVITY.filter((r) => r.material === id).map(({ material: _m, ...row }) => row),
      strain: [],
      handling: {
        abrasive: facts.abrasive, flexible: facts.flexible, minNozzleMm: 0.4,
        provenance: { tier: "inferred", method: "derived", date: PROFILE_DATE, source: facts.handlingSource },
      },
      provenance,
    };
  });

  const petg = seedEntry(seed, "materials", "petg") as unknown as SeedMaterial;
  const petgLoss = seedLoss(petg.processLossAt024, "/materials/petg/processLossAt024");

  // PROFILE.md 7.1: one row per motion with equal values until a coupon separates them.
  const loss: LossRow[] = [];
  for (const motion of MOTIONS) {
    loss.push(
      {
        processA: "fdm", processB: "fdm", motion, machine: "ffc5p", basis: "perSide",
        holeUnderPerSide: machineLoss.holeUnder / 2, outerOverPerSide: machineLoss.outerOver / 2,
        provenance: { tier: "inferred", method: "derived", date: PROFILE_DATE,
          source: "ogee16 source/fits.py:4-8, diametral, halved; seed machines.ffc5p.processLoss" },
      },
      {
        processA: "fdm", processB: "fdm", motion, material: "petg", layer: 0.24, basis: "perSide",
        holeUnderPerSide: petgLoss.holeUnder / 2, outerOverPerSide: petgLoss.outerOver / 2,
        provenance: { tier: "inferred", method: "failure", date: PROFILE_DATE,
          source: "OGEE16 TIMES.md, diametral, halved; seed materials.petg.processLossAt024" },
      },
      {
        processA: "laser", processB: "fdm", motion, machine: "ffc5p", basis: "perSide",
        holeUnderPerSide: 0, outerOverPerSide: 0.075,
        provenance: { tier: "inferred", method: "derived", date: PROFILE_DATE,
          source: "ogee16 source/params.scad:28 PRINT_OVER 0.15 across the part, halved" },
      },
    );
  }
  for (const r of loss) {
    if (r.basis !== "perSide") throw schemaError("/loss", `loss row ${lossRowId(r)} is not perSide`);
  }
  return { materials, machines: [machine], loss };
}

// ---- section resistance (spec/profile.ts SectionResistance) ----

/** R = rho L / A: ohm = ohmCm x 10 x lengthMm / areaMm2, per range end. */
export const sectionResistance: SectionResistance = (row, lengthMm, areaMm2) => {
  const r = (rho: number): Ohm => (rho * 10 * lengthMm) / areaMm2;
  const ohm = typeof row.ohmCm === "number" ? r(row.ohmCm) : ([r(row.ohmCm[0]), r(row.ohmCm[1])] as const);
  return { ohm, tier: row.provenance.tier, rowId: row.id };
};

// ---- profileHash: sha256Hex(canonicalize(readSet)) from spec/jcs.ts (D-206) ----

/** profileHash of a read set; a non-finite number in a row is E_SCHEMA at its pointer. */
function hashReadSet(rows: readonly ProfileReadRow[]): string {
  try {
    return sha256Hex(canonicalize(rows));
  } catch (e) {
    if (e instanceof CanonicalizeError) throw schemaError(e.path, "a hashed profile value is not a finite number");
    throw e;
  }
}

// ---- the lookup ----

/** One recorded read with the row it returned, the unit profileHash covers. */
export interface ProfileReadRow extends ProfileRead {
  readonly row: unknown;
}

/** ProfileLookup plus presets, the filament table, the read set and profileHash. */
export interface SkeletonLookup extends ProfileLookup {
  /** The machine's default preset (the first listed) or the named one, recorded as a machine read. */
  preset(machine: string, id?: string): MachinePreset;
  /** A harvested filament preset by filament_settings_id (PROFILE.md 9). */
  filamentPreset(id: string): FilamentPreset;
  /** The generic fallback for a filament type (seed 3mf/materials.json). */
  filamentFallback(type: string): FilamentFallback;
  /** BuildWarnings raised by reads so far, in read order. */
  warnings(): readonly BuildWarning[];
  /** Rows read so far, sorted by table then id, each with the row it returned. */
  readSet(): readonly ProfileReadRow[];
  /** sha256 over RFC 8785 canonical JSON of readSet() (D-051), lowercase hex. */
  profileHash(): string;
}

export function createProfileLookup(tables: ProfileTables): SkeletonLookup {
  const log: ProfileRead[] = [];
  const rowsRead = new Map<string, ProfileReadRow>();
  const warns: BuildWarning[] = [];
  const read = (table: ProfileRead["table"], id: string, row: unknown): void => {
    const key = `${table}\u0000${id}`;
    if (rowsRead.has(key)) return;
    rowsRead.set(key, { table, id, row });
    log.push({ table, id });
  };
  const warn = (code: string, text: string): void => {
    if (!warns.some((w) => w.code === code && w.text === text)) warns.push({ code, text });
  };

  const machineIds = tables.machines.map((m) => m.id);
  const materialIds = tables.materials.map((m) => m.id);
  const missing = (table: string, id: string): ProfileError =>
    refError(`/${table}`, id, `no ${table} table in these profile tables; load packages/profile/data with loadProfile`);

  const machine = (id: string): Machine => {
    const m = tables.machines.find((x) => x.id === id);
    if (m === undefined) throw refError("/machine", id, `no machine ${id} in profile`, machineIds);
    read("machine", id, m);
    return m;
  };
  const material = (id: string): Material => {
    const m = tables.materials.find((x) => x.id === id);
    if (m === undefined) throw refError("/material", id, `no material ${id} in profile`, materialIds);
    read("material", id, m);
    return m;
  };
  const preset = (machineId: string, id?: string): MachinePreset => {
    const m = machine(machineId);
    const p = id === undefined ? m.presets[0] : m.presets.find((x) => x.id === id);
    if (p === undefined) {
      throw refError("/preset", id ?? "", `no preset ${id ?? "default"} on ${machineId}`, m.presets.map((x) => x.id));
    }
    return p;
  };

  const resolveGap = (
    side: GapSide, machineId: string, materialId: string, layer: Mm | undefined, f: GapFeature | undefined,
    motion: FitMotion = "static",
  ): GapRows | undefined => {
    material(materialId);
    const p = preset(machineId);
    const at = layer ?? p.layer;
    const g = gapRows(tables.loss, side, machineId, materialId, at, f, motion);
    if (g === undefined) return undefined;
    for (const pick of [g.hole, g.outer]) {
      if (pick === undefined) continue;
      read("loss", lossRowId(pick.row), pick.row);
      // fdm in fdm loss is a material property (D-100); a machine row there is a fallback.
      if (pick.rank < 2 && pick.row.processA === "fdm" && pick.row.processB === "fdm") {
        warn("LOSS_FALLBACK", `no ${materialId} loss row at layer ${at}; machine row ${machineId} used (${pick.row.provenance.tier})`);
      }
      const c = pick.row.comp;
      if (c !== undefined && (c.xyHole !== p.comp.xyHole || c.xyContour !== p.comp.xyContour
        || c.elephantFoot !== p.comp.elephantFoot || c.elephantFootLayers !== p.comp.elephantFootLayers)) {
        warn("LOSS_COMP", `loss row ${lossRowId(pick.row)} measured under different slicer compensation than preset ${p.id}`);
      }
    }
    return g;
  };

  const realGap = (
    drawnPerSide: Mm, side: GapSide, machineId: string, materialId: string, layer?: Mm, feature?: GapFeature,
  ): Mm => {
    const g = resolveGap(side, machineId, materialId, layer, feature);
    if (g === undefined) {
      throw refError("/loss", `${side} ${machineId} ${materialId}`, `no loss row for ${side} on ${machineId} with ${materialId}`);
    }
    return applyLoss(drawnPerSide, g);
  };

  const fitTable = (): FitTable => {
    if (tables.fits === undefined) throw missing("fit", "fits");
    return tables.fits;
  };

  const lookup: SkeletonLookup = {
    material,
    machine,
    preset,
    toolhead(machineId, index) {
      const t: Toolhead | undefined = machine(machineId).toolheads.find((x) => x.index === index);
      if (t === undefined) throw refError("/toolhead", String(index), `no toolhead ${index} on ${machineId}`);
      read("toolhead", `${machineId}.${index}`, t);
      return t;
    },
    fit(cls: FitClassId): FitBand {
      const band = findFit(fitTable(), cls);
      read("fit", band.class, band);
      return band;
    },
    bleed(machineId: string, a: string, b: string): BleedRow {
      if (!machineIds.includes(machineId)) throw refError("/bleed/machine", machineId, `no machine ${machineId} in profile`, machineIds);
      for (const x of [a, b]) {
        if (!materialIds.includes(x)) throw refError("/bleed/material", x, `no material ${x} in profile`, materialIds);
      }
      const pair = [a, b].sort() as [string, string];
      const id = `${machineId}.${pair[0]}.${pair[1]}`;
      const found = (tables.bleed ?? []).find((r) => r.machine === machineId
        && [...r.materials].sort().join("\u0000") === pair.join("\u0000"));
      const row: BleedRow = found ?? {
        machine: machineId, materials: pair, bleed: 0,
        provenance: { tier: "inferred", method: "derived", date: PROFILE_DATE,
          source: "no coupon; D-084 default 0 until a coupon measures it" },
      };
      if (found === undefined) warn("BLEED_DEFAULT", `bleed ${id} 0 mm (inferred): no coupon`);
      read("bleed", id, row);
      return row;
    },
    constant(id: string): Constant {
      if (tables.constants === undefined) throw missing("constant", id);
      const c = findConstant(tables.constants, id);
      read("constant", id, c);
      return c;
    },
    strain(materialId: string, use: StrainLimit["use"], bend): StrainLimit {
      const mat = material(materialId);
      const row = mat.strain.find((r) => r.use === use && r.bend === bend);
      const id = `${materialId}.${use}.${bend}`;
      if (row === undefined) {
        throw refError("/strain", id, `no ${use} strain row for ${materialId} bent ${bend}`,
          mat.strain.map((r) => `${materialId}.${r.use}.${r.bend}`));
      }
      read("strain", id, row);
      return row;
    },
    contact(_a: string, _b: string, _kind: ContactKind): ContactRow | null {
      // No contact row exists as of 2026-10-04 (spec/profile.ts ContactRow).
      return null;
    },
    resistivity(materialId: string, direction: ResistivityDirection, form: "printed" | "molded"): ResistivityRow {
      const mat = material(materialId);
      const rows = mat.resistivity
        .filter((r) => r.form === form && (mat.brand === undefined || r.brand === mat.brand))
        .slice()
        .sort((x, y) => tierRank(x.provenance.tier) - tierRank(y.provenance.tier));
      let row = rows.find((r) => r.direction === direction);
      if (row === undefined && direction === "across") {
        row = rows.find((r) => r.direction === "along");
        if (row !== undefined) warn("RESISTIVITY_DIRECTION", `${materialId}: no across row; in-plane figure used`);
      }
      if (row === undefined && direction !== "bulk") {
        row = rows.find((r) => r.direction === "bulk");
        if (row !== undefined) warn("RESISTIVITY_DIRECTION", `${materialId}: no ${direction} row; bulk figure used`);
      }
      if (row === undefined) {
        throw refError("/resistivity", `${materialId}.${direction}.${form}`,
          `no ${form} ${direction} resistivity row for ${materialId}`, rows.map((r) => r.id));
      }
      read("resistivity", row.id, row);
      return row;
    },
    realGap,
    realGaps(drawnPerSide, machineId, materialId, layer, feature): RealGaps {
      return {
        hole: realGap(drawnPerSide, "hole", machineId, materialId, layer, feature),
        outer: realGap(drawnPerSide, "outer", machineId, materialId, layer, feature),
      };
    },
    drawnFor(cls, side, machineId, materialId, layer, feature): readonly [Mm, Mm] | null {
      const band = lookup.fit(cls);
      const own = sideOf(band);
      if (own === null) return null;
      if (own !== side) {
        throw refError("/fit/side", side, `fit class ${band.class} is ${band.processes.join(" in ")}; read side ${own}`, [own]);
      }
      const g = resolveGap(side, machineId, materialId, layer, feature, band.motion);
      if (g === undefined) return null;
      return [invertLoss(band.realLoPerSide, g), invertLoss(band.realHiPerSide, g)];
    },
    filamentPreset(id: string): FilamentPreset {
      const all = tables.filamentPresets ?? [];
      const p = all.find((x) => x.id === id);
      if (p === undefined) throw refError("/filamentPreset", id, `no harvested filament preset ${id}`, all.map((x) => x.id));
      read("material", `filament:${id}`, p);
      return p;
    },
    filamentFallback(type: string): FilamentFallback {
      const all = tables.filamentFallback ?? [];
      const f = all.find((x) => x.type === type);
      if (f === undefined) throw refError("/filamentFallback", type, `no fallback filament row ${type}`, all.map((x) => x.type));
      read("material", `fallback:${type}`, f);
      return f;
    },
    reads: () => log.slice(),
    readSet: () => [...rowsRead.values()].sort((x, y) =>
      x.table === y.table ? (x.id < y.id ? -1 : x.id > y.id ? 1 : 0) : x.table < y.table ? -1 : 1),
    profileHash: () => hashReadSet(lookup.readSet()),
    warnings: () => warns.slice(),
  };
  return lookup;
}

