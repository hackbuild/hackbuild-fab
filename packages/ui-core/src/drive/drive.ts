// The drive pad model (M09-T10, D-076, D-078, D-079). Ported from PIP
// bench/part3.js lines 360 to 392 (padKeys, renderPad, padRefresh): one key
// per drive target, a held set, and one readout line per held target. PIP
// read its numbers from its in-page model; here every number comes from the
// current build: targets from the metrics the DriveDecl names, the closed
// contact from the design's ContactFn (G-20), the read pin from the chase
// hookup, and path, capacitance, settle taus and wait from the CHK-NET-29
// result of that pin. The pin level is classified against the catalog pin
// row of the receiving MCU (D-076).
//
// The level equations are the ones packages/circuit release.ts floatPoint
// and read/pullup.ts classify use: pressed, the floating pin decays from the
// drive level toward the return rail for waitUs; released, it holds the
// drive level less the leakage droop. The bake cannot import circuit, whose
// index loads manifold, so drive.test.ts holds this file to floatPoint.

import type {
  CheckResult, ContactFn, DriveDecl, DriveStimulus, Feature, HookupDecl, McuPinSpec, Metric, PinState, ReadModel,
} from "@hackbuild/spec";
import pins from "@hackbuild/catalog/data/mcu-pins.json" with { type: "json" };

/** The check whose result carries a charge-release read of one hookup port (M05). */
export const READ_CHECK = "CHK-NET-29";

/** Prefix of a DriveDecl.targets that names a metric group: `metrics.keys` reads metric ids `keys.<target>.*`. */
const METRICS = "metrics.";

export type ChargeRelease = Extract<ReadModel, { readonly model: "charge-release" }>;

/** What one held target reads; the record BENCH.drive resolves with (spec/hook.ts DriveReadoutRecord). */
export interface DriveRead {
  readonly target: string;
  readonly pin: string;
  readonly logic: PinState;
  readonly mcu: string;
  /** Pressed path, ohm, computed (CHK-NET-29 measured). */
  readonly ohm: number;
  /** settleTaus x path x pin capacitance, us, computed. Never shown as the read time (D-079). */
  readonly settleUs: number;
  /** Float and wait before the read, us. */
  readonly waitUs: number;
  /** Qualifier of the wait, from the emitter's Qualification (D-206). */
  readonly waitQualifier: string;
  readonly waitSource: string;
  /** Where the wait was read from, as the check names it. */
  readonly waitFrom: string;
  /** False until a coupon calibrates the wait (D-078). */
  readonly calibrated: boolean;
}

export interface PadTarget {
  readonly target: string;
  /** Contact feature ids the target closes when held. */
  readonly contacts: readonly string[];
  /** Body ids a pick in the view maps to this target. */
  readonly bodies: readonly string[];
  /** The read of the held target, or null with the reason in `missing`. */
  readonly read: DriveRead | null;
  /** The level the pin reads while nothing is held, or null when unread. */
  readonly idle: PinState | null;
  readonly missing: string | null;
}

export interface PadModel {
  readonly targets: readonly PadTarget[];
  /** Why the pad has no targets; null when it has some. */
  readonly problem: string | null;
}

export interface PadInput {
  readonly decl: DriveDecl;
  readonly hookup: readonly HookupDecl[];
  readonly features: readonly Feature[];
  readonly metrics: readonly Metric[];
  readonly results: readonly CheckResult[];
  readonly contact: ContactFn | null;
}

// ---- the catalog pin table (packages/catalog/data/mcu-pins.json, D-076)

interface StoredPin {
  readonly id: string;
  readonly inherits?: string;
  readonly vddV?: number;
  readonly vilMaxV?: number;
  readonly vihMinV?: number;
  readonly leakage?: { readonly value: number; readonly unit: string };
}

export type PinRow = Pick<McuPinSpec, "id" | "vddV" | "vilMaxV" | "vihMinV"> & { readonly leakNa: number };

/** The pin row of a catalog MCU id, with an inherited row's figures; null when the catalog has no thresholds for it. */
export function pinRow(id: string): PinRow | null {
  const rows = (pins as { readonly rows: readonly StoredPin[] }).rows;
  const own = rows.find((r) => r.id === id);
  if (own === undefined) return null;
  const from = own.inherits === undefined ? own : rows.find((r) => r.id === own.inherits);
  if (from?.vddV === undefined || from.vilMaxV === undefined || from.vihMinV === undefined) return null;
  const leakNa = from.leakage?.unit === "nA" ? from.leakage.value : Number.NaN;
  return { id, vddV: from.vddV, vilMaxV: from.vilMaxV, vihMinV: from.vihMinV, leakNa };
}

/** packages/circuit read/pullup.ts classify. */
export function classify(v: number, row: Pick<PinRow, "vilMaxV" | "vihMinV">): PinState {
  if (v <= row.vilMaxV) return "LOW";
  if (v >= row.vihMinV) return "HIGH";
  return "UNDEFINED";
}

/**
 * Pressed and released pin levels of a charge-release read (packages/circuit
 * release.ts floatPoint): pressed decays from the drive level toward the
 * return rail with tau = ohm x pF; released holds the drive level less
 * leakage x wait / C.
 */
export function chargeReleaseLevels(
  row: PinRow, read: Pick<ChargeRelease, "drive" | "waitUs">, ohm: number, cPf: number, vRetV: number,
): { readonly pressedV: number; readonly releasedV: number; readonly pressed: PinState; readonly released: PinState } {
  const vDrive = read.drive === "high" ? row.vddV : 0;
  const tauUs = ohm * cPf * 1e-6;
  const pressedV = vRetV + (vDrive - vRetV) * Math.exp(-read.waitUs / tauUs);
  // leakage nA x wait us / C pF, in V: 1e-9 x 1e-6 / 1e-12 = 1e-3.
  const droopV = (row.leakNa * read.waitUs * 1e-3) / cPf;
  const releasedV = read.drive === "high" ? Math.max(0, vDrive - droopV) : Math.min(row.vddV, vDrive + droopV);
  return { pressedV, releasedV, pressed: classify(pressedV, row), released: classify(releasedV, row) };
}

// ---- targets

/** Drive target ids in metric order, from a `metrics.<group>` DriveDecl.targets. */
export function targetIds(decl: DriveDecl, metrics: readonly Metric[]): string[] | null {
  if (!decl.targets.startsWith(METRICS)) return null;
  const head = `${decl.targets.slice(METRICS.length)}.`;
  const out: string[] = [];
  for (const m of metrics) {
    if (!m.id.startsWith(head)) continue;
    const t = m.id.slice(head.length).split(".")[0] ?? "";
    if (t !== "" && !out.includes(t)) out.push(t);
  }
  return out;
}

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const str = (x: unknown): string | null => (typeof x === "string" && x !== "" ? x : null);

function readOf(target: string, contacts: readonly string[], inp: PadInput): { read: DriveRead | null; idle: PinState | null; missing: string | null } {
  const byId = new Map(inp.features.map((f) => [f.id, f]));
  const netOf = (id: string): string | null => {
    const f = byId.get(id);
    return f !== undefined && "net" in f && typeof f.net === "string" ? f.net : null;
  };
  const nets = new Set(contacts.flatMap((c) => {
    const f = byId.get(c);
    return f?.kind === "contact" ? [netOf(f.a), netOf(f.b)].filter((n): n is string => n !== null) : [];
  }));
  const ports = inp.features.filter((f): f is Extract<Feature, { kind: "port" }> => f.kind === "port" && nets.has(f.net));
  const entry = inp.hookup.find((h) => ports.some((p) => p.id === h.port));
  if (entry === undefined) return { read: null, idle: null, missing: `no hookup entry reads a port on ${[...nets].join(" or ") || "this contact"}` };
  if (entry.read.model !== "charge-release") return { read: null, idle: null, missing: `${entry.pin} reads by ${entry.read.model}; the pad reads charge-release only` };
  const readPort = ports.find((p) => p.id === entry.port);
  const ret = ports.find((p) => p.id !== entry.port && p.net !== readPort?.net && (p.type === "gnd" || p.type === "power"));
  const r = inp.results.find((x) => x.id === READ_CHECK && x.extra?.["port"] === entry.port);
  const x = r?.extra ?? {};
  const ohm = num(x["pathOhm"]);
  const cPf = num(x["cPf"]);
  const taus = num(x["settleTaus"]);
  const waitUs = num(x["waitUs"]);
  if (r === undefined || ohm === null || cPf === null || taus === null || waitUs === null) {
    return { read: null, idle: null, missing: `${READ_CHECK} has no read of ${entry.port} in this build` };
  }
  const mcu = str(x["mcu"]) ?? entry.mcu;
  const row = pinRow(mcu);
  const vRet = ret === undefined || row === null ? null : ret.type === "gnd" ? 0 : row.vddV;
  const levels = row === null || vRet === null ? null : chargeReleaseLevels(row, entry.read, ohm, cPf, vRet);
  const waitSource = str(x["waitSource"]) ?? entry.read.waitSource;
  return {
    read: {
      target, pin: str(x["pin"]) ?? entry.pin, logic: levels?.pressed ?? "UNDEFINED", mcu,
      ohm, settleUs: taus * ohm * cPf * 1e-6, waitUs,
      waitQualifier: str(x["waitQualifier"]) ?? "unknown", waitSource, waitFrom: str(x["waitFrom"]) ?? "",
      calibrated: waitSource === "coupon",
    },
    idle: levels?.released ?? null,
    missing: null,
  };
}

/** The pad of the current build: one target per key the DriveDecl names, each with its read. */
export function padModel(inp: PadInput): PadModel {
  if (inp.contact === null) return { targets: [], problem: "this bench carries no contact function; the pad cannot drive" };
  const ids = targetIds(inp.decl, inp.metrics);
  if (ids === null) return { targets: [], problem: `drive targets ${inp.decl.targets} are not a metric group` };
  if (ids.length === 0) return { targets: [], problem: "no drive targets in this build. build the design first." };
  const contact = inp.contact;
  const byId = new Map(inp.features.map((f) => [f.id, f]));
  const targets = ids.map((target) => {
    const contacts = contact(inp.metrics, target, true).closed;
    const bodies = contacts.flatMap((c) => {
      const f = byId.get(c);
      return f?.kind === "contact" ? [f.a, f.b, ...("actuator" in f && typeof f.actuator === "string" ? [f.actuator] : [])] : [];
    });
    return { target, contacts, bodies, ...readOf(target, contacts, inp) };
  });
  return { targets, problem: null };
}

/** The target a pick on a body drives, or null. */
export function targetOfBody(model: PadModel, body: string): string | null {
  return model.targets.find((t) => t.bodies.includes(body))?.target ?? null;
}

// ---- the held set

export interface Pad {
  /** Held targets, in press order. */
  readonly held: readonly string[];
  /** Hold or release one target; true holds, false releases (spec/hook.ts drive). */
  drive(target: string, value: DriveStimulus): void;
  /** Release one target, or every held target when none is named. */
  release(target?: string): void;
}

/** The pad's held set (PIP UIS.press). onChange runs after every change. */
export function createPad(onChange: () => void = () => undefined): Pad {
  let held: string[] = [];
  return {
    get held() {
      return held;
    },
    drive(target, value) {
      if (typeof value !== "boolean") throw new Error(`drive ${target} takes a hold, true or false`);
      const next = held.filter((t) => t !== target);
      held = value ? [...next, target] : next;
      onChange();
    },
    release(target) {
      held = target === undefined ? [] : held.filter((t) => t !== target);
      onChange();
    },
  };
}
