// The 18 TUMBLER modules as typed MechanismDefs (M06-T02, M06-T03): the
// flat numeric params a def takes, derive() returning every number the
// module's bay prints plus the governing quantities its canon row names,
// and apply() emitting the module's cut parts as sheet bodies with the
// plan audit as warnings. The material strip (t, k, c, E; G, line 203) is
// a param, as on the bench, where the strip is the user's input; its
// defaults are the bench default row, Delrin/POM 3 mm (inferred).

import { z } from "zod";
import {
  qualify, qualifyRow,
  type ApplyIn, type DerivedValue, type Feature, type MechanismApplyOut, type MechanismDef, type Metric, type CheckId, type ProfileLookup, type SchemaLike, type Tier,
} from "@hackbuild/spec";
import { D2R, cl, gearPts, genevaGeo } from "./kit.js";
import { TUMBLER_DEFAULT_MATERIAL, type SheetMaterial } from "./material.js";
import { defaults, tumbSolve, tumblerModule, type ModuleParams, type NumParam, type TumblerModule } from "./modules.js";
import { generateSheet } from "./generate.js";
import type { RefusedMechanism } from "../def.js";

/** One flat numeric param of a TUMBLER def. */
export interface FlatParam {
  readonly key: string;
  readonly unit: string;
  readonly doc: string;
  readonly default: number;
}

const unitOf = (u: string): string => (u === "" ? "count" : u === "%" ? "percent" : u);

/** The material strip as params: G.t, G.k, G.c, G.E (line 203). */
function stripParams(): FlatParam[] {
  const d = TUMBLER_DEFAULT_MATERIAL;
  return [
    { key: "t", unit: "mm", doc: "sheet thickness, the material strip t (bench default Delrin/POM 3mm, inferred)", default: d.t },
    { key: "k", unit: "mm", doc: "kerf, the material strip KERF (inferred until a coupon)", default: d.k },
    { key: "c", unit: "mm", doc: "fit clearance per face, the material strip FIT (G.c, line 203)", default: d.c },
    { key: "E", unit: "MPa", doc: "modulus of the sheet, the material row's E (inferred)", default: d.E },
  ];
}

/**
 * The module's params flattened to numbers: each slider, the TUMBLER code
 * digits as code1 to code5 and the SHIFT DRUM grid as g<row><col>, then
 * the material strip.
 */
export function flatParams(mod: TumblerModule): FlatParam[] {
  const out: FlatParam[] = [];
  for (const [key, s] of Object.entries(mod.params)) {
    if (!("kind" in s)) {
      const n = s as NumParam;
      out.push({ key, unit: unitOf(n.unit), doc: `${n.label}, bench slider ${n.min} to ${n.max} step ${n.step}`, default: n.val });
    } else if (s.kind === "code") {
      s.val.forEach((v, i) => out.push({ key: `code${i + 1}`, unit: "count", doc: `${s.label}, pin ${i + 1}, 0 to ${s.max}`, default: v }));
    } else {
      s.val.forEach((row, r) => row.forEach((v, c) => out.push({ key: `g${r}${c}`, unit: "count", doc: `${s.label}, track ${r} step ${c}, 0 or 1`, default: v })));
    }
  }
  return [...out, ...stripParams()];
}

export type FlatValues = Readonly<Record<string, number>>;

/** The module's own params and the material strip from flat values. */
export function unflatten(mod: TumblerModule, v: FlatValues): { readonly p: ModuleParams; readonly m: SheetMaterial } {
  const p: Record<string, ModuleParams[string]> = {};
  for (const [key, s] of Object.entries(mod.params)) {
    if (!("kind" in s)) p[key] = v[key]!;
    else if (s.kind === "code") p[key] = s.val.map((_, i) => v[`code${i + 1}`]!);
    else p[key] = s.val.map((row, r) => row.map((_, c) => v[`g${r}${c}`]!));
  }
  const k = v["k"]!;
  const m: SheetMaterial = {
    name: "params t, k, c, E", t: v["t"]!, k, c: v["c"]!, E: v["E"]!, process: k === 0 ? "fdm" : "laser",
    provenance: { tier: "inferred", method: "declared", source: "the def's params t, k, c and E (the TUMBLER material strip)" },
  };
  return { p, m };
}

/** A strict schema over the flat params, every field a finite number defaulting to the bench value. */
export function flatSchema(params: readonly FlatParam[]): SchemaLike<unknown, FlatValues> {
  const shape = Object.fromEntries(params.map((f) => [f.key, z.number().finite().default(f.default)]));
  return z.object(shape).strict() as unknown as SchemaLike<unknown, FlatValues>;
}

const cv = (value: number, unit: string, equation: string, tiers: readonly Tier[] = []): DerivedValue => ({ value, unit, equation, ...qualify([...tiers]) });
/** A value read straight from a profile row, qualified by the row's tier. */
const fromRow = (value: number, unit: string, equation: string, tier: Tier): DerivedValue => ({ value, unit, equation, ...qualifyRow(tier) });
/** A number the original states as a literal rather than computing it. */
const declared = (value: number, unit: string, equation: string): DerivedValue => ({ value, unit, equation, qualifier: "inferred", basis: "inferred" });

type Derive = (p: ModuleParams, m: SheetMaterial, profile: ProfileLookup) => Record<string, DerivedValue>;
const n_ = (p: ModuleParams, k: string): number => p[k] as number;

function barGeometry(p: ModuleParams, m: SheetMaterial): Record<string, DerivedValue> {
  const hg = (n_(p, "nd") - n_(p, "pd")) / 2 - m.c;
  return {
    halfGap: cv(hg, "mm", "(nd - pd)/2 - c"),
    pinClear: cv(hg * 2, "mm", "2 ((nd - pd)/2 - c), the readout pin clear"),
    alignWindow: cv(hg * 0.75, "mm", "a bar aligns while its offset is under 0.75 of the half gap"),
    dropPerBar: cv(m.t + 0.4, "mm", "t + 0.4 per aligned bar"),
    stack: cv(2 * m.t, "mm", "2 t, the readout stack"),
  };
}

/** derive() per module, keyed by the original's module id. */
const DERIVE: Readonly<Record<string, Derive>> = {
  coin: (p, m) => barGeometry(p, m),
  inh: (p, m) => barGeometry(p, m),
  diff: (p, m) => ({
    ...barGeometry(p, m),
    pins: cv(2, "count", "two drop pins, one per phase"),
    bars: cv(2, "count", "two bars, each with two holes at opposite phase"),
    lostMotion: declared(2.6, "mm", "yoke lost motion, the original's literal (line 869)"),
  }),
  or: (p) => {
    const t = Math.tan(n_(p, "ang") * D2R);
    return {
      ratio: cv(t, "ratio", "tan(ang), out over in, the readout 1 : ratio"),
      outStroke: cv(n_(p, "tv") * t, "mm", "tv tan(ang)"),
      ramp: cv(n_(p, "ang"), "deg", "ramp angle; binds past 60 deg"),
    };
  },
  teet: (p, m) => {
    const gain = n_(p, "ao") / n_(p, "ai");
    const I = (m.t * Math.pow(n_(p, "sw"), 3)) / 12;
    return {
      gain: cv(gain, "ratio", "ao / ai"),
      outStroke: cv(n_(p, "tv") * gain, "mm", "tv gain, input released"),
      springI: cv(I, "mm4", "I = t w^3 / 12, w the spring width in the bending direction"),
      springForce: cv((3 * m.E * I * 0.6) / Math.pow(n_(p, "sl_"), 3), "N", "F = 3 E I x / L^3 at the 0.6 mm preload, input released"),
    };
  },
  tumb: (p) => {
    const n = Math.round(n_(p, "n"));
    return {
      pins: cv(n, "count", "pin count"),
      codes: cv(Math.pow(5, n), "count", "5^n keys at five depths"),
      window: cv(n_(p, "shear"), "mm", "shear clearance; a pin is ok inside it with the key over 0.85 in"),
      opens: cv(tumbSolve(p, { KEY: 1, WRONG: 0 }).allOk ? 1 : 0, "count", "1 when every pin reaches the shear line with the right key fully in"),
    };
  },
  latch: (p, m) => {
    const I = (m.t * Math.pow(n_(p, "bwid"), 3)) / 12;
    return {
      springI: cv(I, "mm4", "I = t w^3 / 12"),
      holdForce: cv((3 * m.E * I * n_(p, "dep")) / Math.pow(n_(p, "bl"), 3), "N", "F = 3 E I dep / L^3"),
      throw: cv(n_(p, "pitch"), "mm", "pocket pitch"),
    };
  },
  snap: (p, m, profile) => {
    const Q = n_(p, "rise") / n_(p, "tk");
    const I = (n_(p, "wid") * Math.pow(n_(p, "tk"), 3)) / 12;
    const lim = profile.constant("buckledBeam.riseOverT");
    return {
      riseOverT: cv(Q, "ratio", "rise / tk"),
      bistableMin: fromRow(lim.value, "ratio", "profile buckledBeam.riseOverT", lim.provenance.tier),
      stableStates: cv(Q > lim.value ? 2 : 1, "count", "2 when rise / tk is over buckledBeam.riseOverT, else 1", [lim.provenance.tier]),
      snapForce: cv((48 * m.E * I * n_(p, "rise")) / Math.pow(n_(p, "span"), 3), "N", "Fs = 48 E I rise / span^3, I = wid tk^3 / 12 (estimate)"),
    };
  },
  ratch: (p) => ({
    stepAngle: cv(360 / Math.round(n_(p, "n")), "deg", "360 / n"),
    carryEvery: cv(Math.round(n_(p, "n")), "count", "a carry pin on tooth 0 fires once per n steps"),
  }),
  drum: (p) => {
    const S = Math.round(n_(p, "steps"));
    const T = Math.round(n_(p, "tracks"));
    return {
      stepAngle: cv(360 / S, "deg", "360 / steps"),
      words: cv(S, "count", "one word per step"),
      bits: cv(S * T, "count", "steps x tracks"),
    };
  },
  gen: (p) => {
    const n = Math.round(n_(p, "n"));
    const gg = genevaGeo(n, n_(p, "cr"));
    return {
      indexAngle: cv(360 / n, "deg", "360 / n"),
      centres: cv(gg.c, "mm", "c = cr / sin(pi/n)"),
      wheelDia: cv(gg.wr * 2, "mm", "2 c cos(pi/n)"),
    };
  },
  spur: (p) => {
    const g1 = gearPts(n_(p, "n1"), n_(p, "mod"), n_(p, "pa"), 0, 0);
    const g2 = gearPts(n_(p, "n2"), n_(p, "mod"), n_(p, "pa"), 0, 0);
    return {
      centres: cv(g1.rp + g2.rp, "mm", "rpA + rpB, rp = m z / 2"),
      ratio: cv(n_(p, "n2") / n_(p, "n1"), "ratio", "zB / zA"),
      odA: cv(g1.ra * 2, "mm", "2 (rp + m)"),
      odB: cv(g2.ra * 2, "mm", "2 (rp + m)"),
      rootA: cv(g1.rd, "mm", "rp - 1.25 m"),
      rootB: cv(g2.rd, "mm", "rp - 1.25 m"),
      baseA: cv(g1.rb, "mm", "rp cos(pa)"),
      baseB: cv(g2.rb, "mm", "rp cos(pa)"),
    };
  },
  whif: (p) => {
    const n = Math.round(n_(p, "bits"));
    let maxT = 0;
    for (let i = 0; i < n; i++) maxT += n_(p, "stroke") * Math.pow(2, i);
    return {
      stops: cv(Math.pow(2, n), "count", "2^bits"),
      fullStroke: cv(maxT, "mm", "sum stroke 2^i over the bits"),
      lsb: cv(n_(p, "stroke"), "mm", "full stroke / (stops - 1), the bit 0 stroke"),
    };
  },
  hinge: (p, _m, profile) => {
    const N = Math.round(n_(p, "rows"));
    const pitch = n_(p, "span") / (N + 1);
    const bendA = n_(p, "ang");
    const lim = profile.constant("livingHinge.maxDegPerRow");
    return {
      bendRadius: cv(n_(p, "span") / Math.max(bendA * D2R, 0.05), "mm", "span / theta"),
      degPerRow: cv(bendA / N, "deg", "bend / rows"),
      ligament: cv(pitch - n_(p, "sw"), "mm", "span / (rows + 1) - slot width"),
      rowPitch: cv(pitch, "mm", "span / (rows + 1)"),
      degPerRowMax: fromRow(lim.value, "deg", "profile livingHinge.maxDegPerRow", lim.provenance.tier),
    };
  },
  fing: (p, m) => {
    const seg = n_(p, "L") / (2 * Math.round(n_(p, "n")) + 1);
    const tab = seg + m.k + n_(p, "fit");
    const slot = seg - m.k - n_(p, "fit");
    return {
      pitch: cv(seg, "mm", "L / (2 n + 1)"),
      tab: cv(tab, "mm", "pitch + kerf + fit"),
      slot: cv(slot, "mm", "pitch - kerf - fit"),
      interference: cv(tab - slot, "mm", "tab - slot, two kerfs plus two fits"),
    };
  },
  tesla: (p) => {
    const n = Math.round(n_(p, "loops"));
    return {
      loops: cv(n, "count", "loop count"),
      diodicity: cv(1 + 0.12 * n * cl(4 / n_(p, "cw"), 0.4, 2.2), "ratio", "1 + 0.12 n clamp(4 / cw, 0.4, 2.2) (estimate)"),
      reLo: declared(200, "Re", "the original's flow window, low end (line 1532)"),
      reHi: declared(2000, "Re", "the original's flow window, high end (line 1532)"),
    };
  },
  coanda: (p) => ({
    nozzle: cv(n_(p, "w"), "mm", "nozzle width"),
    splitter: cv(n_(p, "sp") * n_(p, "w") * 4, "mm", "sp w 4, the stage scale"),
  }),
  memb: (p) => ({
    closePressure: cv((1000 * 30 * Math.pow(n_(p, "mt"), 3) * n_(p, "fd")) / Math.pow(n_(p, "fw"), 4), "kPa", "P = 1000 Em mt^3 fd / fw^4, Em 30 MPa the original's TPU literal (estimate)"),
    layers: cv(4, "count", "flow, membrane, control, cap"),
  }),
};

/** derive() of a TUMBLER module at flat values. */
export function tumblerDerive(mod: TumblerModule, v: FlatValues, profile: ProfileLookup): Record<string, DerivedValue> {
  const { p, m } = unflatten(mod, v);
  return DERIVE[mod.id]!(p, m, profile);
}

const gated = (id: string, value: number, unit: string, note: string, gate: CheckId, drivenBy: readonly string[]): Metric & { readonly gate: CheckId } =>
  ({ id, value, unit, note, gate, drivenBy: [...drivenBy], ...qualify([]) });

/** The features and gated metrics a module emits beside its bodies. */
function emitted(mod: TumblerModule, v: FlatValues, bodies: MechanismApplyOut["bodies"], placedEdges: readonly { readonly x: number; readonly y: number; readonly w: number }[]): Pick<MechanismApplyOut, "features" | "metrics"> {
  const { p, m } = unflatten(mod, v);
  if (mod.id === "hinge") {
    const N = Math.round(n_(p, "rows"));
    const deg = n_(p, "ang") / N;
    const f: Feature = {
      kind: "flexCut", id: "flexCut.hinge", body: bodies[0]!.id, rows: N, degPerRow: deg,
      slotLen: n_(p, "sl_"), landLen: n_(p, "gap"), pitch: n_(p, "span") / (N + 1),
      drivenBy: { rows: "/rows", degPerRow: "/ang", slotLen: "/sl_", landLen: "/gap", pitch: "/span" },
    };
    return { features: [f], metrics: [gated("hinge.degPerRow", deg, "deg", "bend per slot row", "CHK-SHT-06", ["/ang", "/rows"])] };
  }
  if (mod.id === "fing") {
    const n = Math.round(n_(p, "n"));
    const seg = n_(p, "L") / (2 * n + 1);
    const burn = (m.k + n_(p, "fit")) / 2;
    const features: Feature[] = bodies.slice(0, 2).map((b, i): Feature => {
      const e = placedEdges[i]!;
      return {
        kind: "finger", id: `finger.${i === 0 ? "a" : "b"}`, body: b.id, count: n, width: seg, processA: m.process, processB: m.process, burn,
        edge: { from: [e.x, e.y], to: [e.x + e.w, e.y] }, drivenBy: { count: "/n", width: "/L", burn: "/k" },
      };
    });
    return {
      features,
      metrics: [
        gated("finger.tab", seg + m.k + n_(p, "fit"), "mm", "tab width, pitch plus kerf plus fit", "CHK-SHT-11", ["/L", "/n", "/k", "/fit"]),
        gated("finger.slot", seg - m.k - n_(p, "fit"), "mm", "slot width, pitch minus kerf minus fit", "CHK-SHT-11", ["/L", "/n", "/k", "/fit"]),
      ],
    };
  }
  return { features: [], metrics: [] };
}

/** apply(): the module's cut parts as sheet bodies at the face origin, its features, gated metrics and plan audit. */
export function tumblerApply(mod: TumblerModule, input: ApplyIn<FlatValues>): MechanismApplyOut {
  const { p, m } = unflatten(mod, input.params);
  const o = input.face.origin;
  const sheet = generateSheet(mod, p, m, 1, "", [o[0], o[1], o[2]]);
  // The finger edge base line sits on the part's y 0 after partN, at the packed placement.
  const edges = sheet.placed.map((pl) => ({ x: pl.x + o[0], y: pl.y + o[1], w: pl.p.w }));
  const { features, metrics } = emitted(mod, input.params, sheet.bodies, edges);
  return { bodies: sheet.bodies, features, metrics, assertions: [], warnings: sheet.warnings };
}

/** The seed fields of a typed TUMBLER entry, as its def file states them. */
/** status is stated in the def file so tools/counts.mjs reads it there (D-010). */
export type TumblerEntry = Omit<RefusedMechanism, "status" | "statusReason" | "params"> & { readonly status: "typed"; readonly reference: readonly string[] };

/** A typed MechanismDef for a TUMBLER module (M06-T02, M06-T03). */
export function tumblerMechanism(moduleId: string, e: TumblerEntry): MechanismDef<FlatValues> {
  const mod = tumblerModule(moduleId);
  if (mod === undefined) throw new Error(`no TUMBLER module ${moduleId}`);
  if (mod.mechanism !== e.id) throw new Error(`TUMBLER module ${moduleId} maps to ${mod.mechanism}, not ${e.id}`);
  const params = flatParams(mod);
  const schema = flatSchema(params);
  return {
    ...e,
    version: "1.0.0",
    status: "typed",
    params: schema,
    derive: (v, profile) => tumblerDerive(mod, v, profile),
    apply: (input) => tumblerApply(mod, input),
  };
}

/** The bench defaults of a module as flat values, the chase defaults of its reference. */
export function tumblerDefaults(moduleId: string): FlatValues {
  const mod = tumblerModule(moduleId)!;
  return Object.fromEntries(flatParams(mod).map((f) => [f.key, f.default]));
}

/** The original's defaults round-trip through the flat params (the parity triple's params leg). */
export function roundTrips(moduleId: string): boolean {
  const mod = tumblerModule(moduleId)!;
  return JSON.stringify(unflatten(mod, tumblerDefaults(moduleId)).p) === JSON.stringify(defaults(mod));
}
