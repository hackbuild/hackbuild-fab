// drive.fader (plan v9 section 3.2: the BLOCKS SLIDER, a finger pot): move
// the finger along the track and read position, then the two divider legs,
// then the wiper volts, then the ADC counts. The finger pot's canonical
// original is GIB (knowledge/designs/MECHANISMS.md section 3, finger pot
// row; BLOCKS SLIDER is its brick form, blocks.md 5.15), so the divider is
// GIB simFinger (originals/gib/files/src/src/part2.js lines 431 to 436,
// lineage gib.parts/gib-4-sim-finger):
//   Ra = (Rdead - Rret) + Rtrack pos,  Rb = Rret + Rtrack (1 - pos),
//   V  = VDD Rb / (Ra + Rb)
// over the resistances the finger-pot archetype writes (packages/archetypes
// src/gib/gib.ts physicsFinger, metrics gib.Rtrack, gib.Rret, gib.Rdead),
// with VDD from the catalog pin row of the receiving MCU in place of the
// page's 3.3 V. The divider is circuit read/pullup.ts dividerV and the full
// scale circuit read/adc.ts fullScaleCounts; the bake cannot import
// circuit (its index loads manifold), so test/widgets-fader.test.ts holds both to
// those functions. Counts round the clamped ratio to the full scale, as
// the BLOCKS sim reads its ADC (originals/blocks sim.js line 138,
// blocks.md 5.22).

import type { HookupDecl, Metric, Qualifier, WidgetDecl } from "@hackbuild/spec";
import { pinRow } from "../drive/drive.js";
import { fmt } from "../bench/locate.js";
import { liveOutputs } from "./live.js";
import type { WidgetEntry, WidgetModel } from "./registry.js";

/** The finger-pot rows drive.fader reads, under the placed archetype's prefix (WidgetDecl.fn, for example finger-pot.0). */
export const FADER_ROWS = { track: "gib.Rtrack", ret: "gib.Rret", dead: "gib.Rdead" } as const;

/** Finger position with no stimulus: the middle of the travel, the BLOCKS slider control default (parts.js line 585). */
export const FADER_REST = 0.5;

/** The divider legs at a finger position, ohm (simFinger). */
export function fingerLegs(r: { readonly track: number; readonly ret: number; readonly dead: number }, pos: number): { readonly pos: number; readonly raOhm: number; readonly rbOhm: number } {
  const p = Math.min(1, Math.max(0, pos));
  return { pos: p, raOhm: r.dead - r.ret + r.track * p, rbOhm: r.ret + r.track * (1 - p) };
}

/** The wiper volts of a divider fed vTop over rTop and 0 V under rBottom (circuit dividerV with vBottom 0). */
export function wiperV(vTop: number, rTop: number, rBottom: number): number {
  return (vTop * rBottom) / (rTop + rBottom);
}

/** ADC counts of a voltage: the clamped ratio to refV over 2^bits - 1, rounded. */
export function adcCounts(volts: number, refV: number, bits: number): number {
  return Math.round(Math.min(1, Math.max(0, volts / refV)) * (2 ** bits - 1));
}

export interface FaderRows {
  readonly prefix: string;
  readonly track: number;
  readonly ret: number;
  readonly dead: number;
  /** The lowest qualifier among the three rows. */
  readonly qualifier: Qualifier;
}

const RANK: readonly Qualifier[] = ["unknown", "inferred", "computed", "vendor", "measured"];

/** The finger-pot rows under a prefix, or why they are missing. */
export function faderRows(metrics: readonly Metric[], prefix: string): FaderRows | string {
  const get = (name: string): Metric | undefined => metrics.find((m) => m.id === `${prefix}.${name}`);
  const ms = [get(FADER_ROWS.track), get(FADER_ROWS.ret), get(FADER_ROWS.dead)];
  const vals = ms.map((m) => (typeof m?.value === "number" && Number.isFinite(m.value) ? m.value : null));
  const gone = Object.values(FADER_ROWS).filter((_, i) => vals[i] === null);
  if (gone.length > 0) return `the build carries no ${gone.map((n) => `${prefix}.${n}`).join(", ")}; place the finger pot and name its prefix as the widget fn`;
  const q = ms.map((m) => m!.qualifier).reduce((lo, x) => (RANK.indexOf(x) < RANK.indexOf(lo) ? x : lo), "measured" as Qualifier);
  return { prefix, track: vals[0]!, ret: vals[1]!, dead: vals[2]!, qualifier: q };
}

/** The one hookup entry that reads by adc, or why there is not one. */
export function adcEntry(hookup: readonly HookupDecl[]): (HookupDecl & { readonly read: Extract<HookupDecl["read"], { model: "adc" }> }) | string {
  const adc = hookup.filter((h): h is HookupDecl & { readonly read: Extract<HookupDecl["read"], { model: "adc" }> } => h.read.model === "adc");
  if (adc.length === 1) return adc[0]!;
  return adc.length === 0 ? "no hookup entry reads the wiper by adc; volts and counts are unknown" : `hookup reads ${adc.map((h) => h.pin).join(", ")} by adc; keep one for the wiper`;
}

/** What the wiper reads at a position. */
export interface FaderRead {
  readonly pos: number;
  readonly raOhm: number;
  readonly rbOhm: number;
  /** Rb over Ra + Rb, unitless. */
  readonly ratio: number;
  /** Track over track plus the dead legs, percent: CHK-NET-30's swing of element over element and leads. */
  readonly swingPct: number;
  readonly pin: string | null;
  readonly volts: number | null;
  readonly counts: number | null;
  readonly qualifier: Qualifier;
  /** Why volts and counts are null. */
  readonly problem: string | null;
}

/** The fader read at a position: legs from the rows, volts and counts from the adc hookup entry and the catalog pin row. */
export function faderRead(rows: FaderRows, hookup: readonly HookupDecl[], pos: number): FaderRead {
  const legs = fingerLegs(rows, pos);
  const base = {
    ...legs, ratio: legs.rbOhm / (legs.raOhm + legs.rbOhm), swingPct: (100 * rows.track) / (rows.track + rows.dead),
    qualifier: rows.qualifier === "measured" || rows.qualifier === "vendor" ? "computed" : rows.qualifier,
  } as const;
  const e = adcEntry(hookup);
  if (typeof e === "string") return { ...base, pin: null, volts: null, counts: null, problem: e };
  const row = pinRow(e.mcu);
  if (row === null) return { ...base, pin: e.pin, volts: null, counts: null, problem: `${e.mcu} has no supply in the catalog pin table; volts are unknown` };
  const volts = wiperV(row.vddV, legs.raOhm, legs.rbOhm);
  return { ...base, pin: e.pin, volts, counts: adcCounts(volts, e.read.refV, e.read.bits), problem: null };
}

export interface FaderModel extends WidgetModel {
  readonly read: FaderRead | null;
}

function refusal(decl: WidgetDecl, problem: string): FaderModel {
  return { id: decl.id, kind: decl.kind, outputs: {}, problem, read: null };
}

/**
 * The finger position on the pot under `prefix`: the host's stimulus keyed
 * by that prefix (so a fader and a signal readout of one pot agree), else
 * the widget's own pos input, else the rest.
 */
export function fingerPos(prefix: string, positions: Readonly<Record<string, number>> | undefined, input?: unknown): number {
  const own = positions?.[prefix];
  if (own !== undefined && Number.isFinite(own)) return own;
  return typeof input === "number" ? input : FADER_REST;
}

export const driveFader: WidgetEntry<FaderModel> = {
  model(decl, build) {
    const rows = faderRows(build.metrics, decl.fn);
    if (typeof rows === "string") return refusal(decl, rows);
    const r = faderRead(rows, build.hookup, fingerPos(decl.fn, build.positions, decl.inputs["pos"]));
    const q = r.qualifier;
    const outputs: Record<string, unknown> = {
      pos: r.pos, raOhm: r.raOhm, rbOhm: r.rbOhm, ratio: r.ratio, swingPct: r.swingPct, pin: r.pin, volts: r.volts, counts: r.counts,
      qualifier: { raOhm: q, rbOhm: q, ratio: q, swingPct: q, volts: q, counts: q },
    };
    return { id: decl.id, kind: decl.kind, outputs, problem: r.problem, read: r };
  },
  liveness: liveOutputs,
};

/** The fader readout: position, legs, then volts and counts with their qualifier, or what stops them. */
export function faderLine(m: FaderModel): string {
  const r = m.read;
  if (r === null) return m.problem ?? "";
  const legs = `finger at ${fmt(r.pos * 100)} percent, A leg ${fmt(r.raOhm / 1e3)} kohm, B leg ${fmt(r.rbOhm / 1e3)} kohm ${r.qualifier}`;
  if (r.volts === null || r.counts === null) return `${legs}; ${r.problem ?? "no read"}`;
  return `${legs}, ${r.pin} reads ${fmt(r.volts)} V, ${r.counts} counts ${r.qualifier}, swing ${fmt(r.swingPct)} percent`;
}
