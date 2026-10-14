// THINPOT, the printed membrane potentiometer (thinpot.md 4.5, canon
// membrane-slider-thinpot), ported line for line from
// originals/thinpot/files/feeler_thinpot.html, archetype `thinpot` (lines
// 4022 to 4210): a resistive cPLA track with its width profile, three pads
// at the near end, the T2 boss, base and rails, and the membrane with its
// collector strip posed flat beside the base. Track resistance is profile
// sectionResistance on the cPLA along row; the contact model reads the
// cTPU bulk row where the page reads its CTPU rhoZ (line 4178, D-098).

import { qualify, type ApplyIn, type ApplyOut, type DerivedValue, type Metric, type ProfileLookup, type ResistivityRow, type SchemaLike, type Tier } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { feelerThinpotParams } from "../defs/feeler/thinpot.js";
import { dv, frameOf } from "../pip/common.js";
import { circle, clamp, fmtR, rect, stroke, type Loop } from "./geom.js";
import { TpParts, bodiesOf } from "./parts.js";
import { TP_EZ as EZ } from "./dome.js";
import { tpPrint, type TpFit, type TpPrint, type TpSay } from "./ladder.js";
import type { z } from "zod";

export const THINPOT_PARAMS = feelerThinpotParams as unknown as SchemaLike<unknown, z.infer<typeof feelerThinpotParams>>;
export type ThinpotParams = z.infer<typeof feelerThinpotParams>;
export const THINPOT_DEFAULTS: ThinpotParams = feelerThinpotParams.parse({});

export interface ThinpotBuild {
  readonly parts: TpParts;
  readonly readout: TpSay[];
  readonly fits: TpFit[];
  readonly notes: string[];
  readonly rTrack: number;
  readonly rContact: number;
  readonly tiers: readonly Tier[];
}

const ohm = (r: number | readonly [number, number]): number => (typeof r === "number" ? r : r[0]);

export function thinpotBuild(P0: ThinpotParams, pr: TpPrint, cpla: ResistivityRow, ctpu: ResistivityRow): ThinpotBuild {
  const P = { ...P0 };
  const parts = new TpParts();
  const readout: TpSay[] = [], fits: TpFit[] = [], notes: string[] = [];
  const say = (k: string, v: string, u = ""): void => { readout.push({ k, v, u }); };
  const note = (s: string): void => { notes.push(s); };
  const fit = (name: string, nominal: number, actual: number, min: number, max: number): void => { fits.push({ name, nominal, actual, min, max, ok: actual >= min && actual <= max }); };
  let i: number;
  const clr = Math.max(0.6, pr.nozzle * 1.5);
  const base = parts.get("base", P.flexBase ? "flex" : "rigid"), track = parts.get("track", "cond");
  const mem = parts.get("membrane", P.top === "ctpu" ? "aux" : "flex");
  const strip = P.top === "ctpu" ? mem : parts.get("collector strip", "aux");
  P.trackW = clamp(P.trackW, 1, Math.max(1, P.wid - 2 * clr));
  const tw = clamp(Math.min(P.termW, P.trackW), 0.8, 4);
  let pitch = Math.max(P.termPitch, P.termW + clr + 0.4);
  if (P.term === "screw") pitch = Math.max(pitch, 7.6);
  const L = P.len, Wd = P.wid, rimW = P.rimW, W2 = Wd / 2 + rimW;
  const z0 = P.baseT, z1 = z0 + P.condT, zRim = z1 + P.spacerT, zMem1 = zRim + P.memT;

  // track with its width profile
  const wMax = P.trackW, wMin = Math.min(wMax, Math.max(2 * pr.nozzle, 1.0));
  const kLog = Math.log(wMax / wMin);
  const wAt = (u: number): number => { if (P.taper === "lin" || kLog < 1e-6) return wMax; const t = P.taper === "log" ? u : 1 - u; return wMax * Math.exp(-kLog * t); };
  const N = 48, right: Loop = [], left: Loop = [];
  const Rcum = [0];
  let Rt = 0;
  for (i = 0; i <= N; i++) {
    const u = i / N, w = wAt(u);
    right.push([w / 2, u * L]); left.push([-w / 2, u * L]);
    if (i > 0) { Rt += ohm(sectionResistance(cpla, L / N, wAt((i - 0.5) / N) * P.condT).ohm); Rcum.push(Rt); }
  }
  track.prism(right.concat(left.reverse()), null, z0, z1);

  // near end: lane under the rim, three pads, the T2 boss
  const yLane = -rimW - clr - tw / 2;
  const yPadTop = yLane - tw / 2 - clr;
  const bw = clamp(Math.min(P.termW, pitch - clr), 1.0, 8), bossL = Math.min(P.termL, 6);
  const yBossBot = yPadTop - bossL;
  const baseHoles: Loop[] = [];
  const pad = (x: number, yTop: number, len: number, holeY: number): number => {
    const pw = P.term === "screw" ? Math.max(P.termW, 6.6) : P.term === "tape" ? Math.max(P.termW, pitch - clr) : P.termW;
    const holes: Loop[] = [];
    if (P.term === "hole") { holes.push(circle(x, holeY, P.wireD / 2, 20)); baseHoles.push(circle(x, holeY, P.wireD / 2, 20)); }
    if (P.term === "pin") { holes.push(circle(x, holeY, 0.36, 12)); baseHoles.push(circle(x, holeY, 0.38, 12)); }
    if (P.term === "screw") { holes.push(circle(x, holeY, 1.6, 24)); baseHoles.push(circle(x, holeY, 1.65, 24)); }
    track.prism(rect(x - pw / 2, yTop - len, pw, len), holes, z0, z1);
    if (P.term === "tab") track.prism(rect(x - pw / 2, yTop - len + 0.4, pw, 1.2), null, z1 - EZ, z1 + 6);
    return pw;
  };
  const padL = P.termL + bossL, yHole = yBossBot - P.termL * 0.6;
  pad(-pitch, yPadTop, padL, yHole);
  pad(0, yPadTop, padL, yHole);
  pad(pitch, yPadTop, padL, yHole);
  track.prism(stroke([[0, Math.min(1.5, L * 0.05) + tw / 2], [0, yLane], [-pitch, yLane], [-pitch, yPadTop - 0.6]], tw, "round"), null, z0, z1);
  const xOut = W2 + clr + tw / 2, yFar = L + rimW + clr + tw / 2;
  track.prism(stroke([[0, L - Math.min(1.5, L * 0.05) - tw / 2], [0, yFar], [xOut, yFar], [xOut, yLane], [pitch, yLane], [pitch, yPadTop - 0.6]], tw, "round"), null, z0, z1);
  track.prism(rect(-bw / 2, yBossBot, bw, bossL), null, z1 - EZ, zRim);

  // base plate and rim
  const bx0 = -W2 - clr - tw - 1.5, bx1 = W2 + clr + tw + 1.5;
  const by0 = yPadTop - padL - (P.term === "tape" ? 0 : 2.5), by1 = yFar + tw / 2 + 1.5;
  base.prism(rect(bx0, by0, bx1 - bx0, by1 - by0), baseHoles.length > 0 ? baseHoles : null, 0, z0);
  const gapH = tw / 2 + clr;
  base.prism(rect(-W2, -rimW, rimW, L + 2 * rimW), null, z0 - EZ, zRim);
  base.prism(rect(Wd / 2, -rimW, rimW, L + 2 * rimW), null, z0 - EZ, zRim);
  for (const yy of [[-rimW, 0], [L, L + rimW]] as const) {
    base.prism(rect(-W2 + 0.3, yy[0], W2 - 0.3 - gapH, yy[1] - yy[0]), null, z0 - EZ, z1);
    base.prism(rect(gapH, yy[0], W2 - 0.3 - gapH, yy[1] - yy[0]), null, z0 - EZ, z1);
    base.prism(rect(-W2 + 0.6, yy[0], 2 * W2 - 1.2, yy[1] - yy[0]), null, z1, zRim);
  }

  // membrane: rim outline plus a tail over the boss
  const tailW = clamp(bw + 3, 3, 2 * W2);
  const outline: Loop = [[-W2, -rimW], [-tailW / 2, -rimW], [-tailW / 2, yBossBot], [tailW / 2, yBossBot], [tailW / 2, -rimW], [W2, -rimW], [W2, L + rimW], [-W2, L + rimW]];
  const nSeg = 40, seg = (L + 2 * rimW) / nSeg;
  const zS1 = zRim + (P.top === "ctpu" ? 0 : P.stripT);
  if (P.top === "ctpu") {
    for (i = 0; i < nSeg; i++) mem.prism(rect(-W2, -rimW + i * seg - (i > 0 ? EZ : 0), 2 * W2, seg + (i > 0 ? EZ : 0)), null, zRim, zMem1);
    mem.prism(rect(-tailW / 2, yBossBot, tailW, bossL + clr + tw + clr + EZ), null, zRim, zMem1);
  } else {
    const sIn = 1.0;
    const sPoly: Loop = [[-W2 + sIn, -rimW + sIn], [-tailW / 2 + sIn, -rimW + sIn], [-tailW / 2 + sIn, yBossBot + sIn], [tailW / 2 - sIn, yBossBot + sIn], [tailW / 2 - sIn, -rimW + sIn], [W2 - sIn, -rimW + sIn], [W2 - sIn, L + rimW - sIn], [-W2 + sIn, L + rimW - sIn]];
    mem.prism(outline, [sPoly], zRim, zS1 + EZ);
    for (i = 0; i < nSeg; i++) mem.prism(rect(-W2, -rimW + i * seg - (i > 0 ? EZ : 0), 2 * W2, seg + (i > 0 ? EZ : 0)), null, zS1, zMem1);
    mem.prism(rect(-tailW / 2, yBossBot, tailW, bossL + clr + tw + clr + EZ), null, zS1, zMem1);
    const sy0 = -rimW + sIn, sy1 = L + rimW - sIn, sseg = (sy1 - sy0) / nSeg;
    for (i = 0; i < nSeg; i++) strip.prism(rect(-W2 + sIn, sy0 + i * sseg - (i > 0 ? EZ : 0), 2 * (W2 - sIn), sseg + (i > 0 ? EZ : 0)), null, zRim, zS1);
    strip.prism(rect(-tailW / 2 + sIn, yBossBot + sIn, tailW - 2 * sIn, sy0 - (yBossBot + sIn) + EZ), null, zRim, zS1);
  }
  const poseX = bx1 - bx0 + 6;
  parts.pose("membrane", { dx: poseX, dy: 0, dz: -zRim, flipZ: [zRim, zMem1] });
  if (P.top !== "ctpu") parts.pose("collector strip", { dx: poseX, dy: 0, dz: -zRim, flipZ: [zRim, zMem1] });

  // fits, readout
  fit("membrane travel", P.spacerT, zRim - z1, 0.2, 3);
  fit("tail over the boss", bossL, bossL, 2, 20);
  const Ac = Math.PI * Math.pow(1.5 * Math.sqrt(P.force / 2), 2);
  const through = (t: number): number => ohm(sectionResistance(ctpu, t, Ac).ohm);
  const Rc = P.top === "ctpu" ? through(P.memT) + 3000 / Math.pow(P.force + 0.05, 0.8) : through(P.stripT) + 400 / Math.pow(P.force + 0.05, 0.6);
  const Rat = (u: number): number => { const f = u * N, k = Math.floor(f); if (k >= N) return Rcum[N] as number; return (Rcum[k] as number) + ((Rcum[k + 1] as number) - (Rcum[k] as number)) * (f - k); };
  say("outline", `${(bx1 - bx0).toFixed(0)} x ${(by1 - by0).toFixed(0)} x ${zMem1.toFixed(1)}, membrane prints beside it`, "mm");
  say("track", `${L} x ${P.taper === "lin" ? wMax.toFixed(1) : `${wMax.toFixed(1)} to ${wMin.toFixed(1)}`} x ${P.condT}`, "mm");
  say("R end to end", fmtR(Rt));
  say("R per mm", fmtR(Rt / L));
  say("R at 25 / 50 / 75 %", `${fmtR(Rat(0.25))} / ${fmtR(Rat(0.5))} / ${fmtR(Rat(0.75))}`);
  say("taper", P.taper === "lin" ? "linear" : P.taper === "log" ? `log, 1 to ${(Rat(1) / Math.max(1e-9, Rat(0.5))).toFixed(1)} above mid` : "reverse log");
  say("air gap", P.spacerT.toFixed(2), "mm");
  say(`contact R at ${P.force} N`, fmtR(Rc));
  say("gap in layers", (P.spacerT / pr.layerH).toFixed(1));
  say("wires out", "3 (T1 low end, T2 collector, T3 high end)");
  note(`The membrane sits ${P.spacerT.toFixed(1)} mm above the track on the rim, which is ${(P.spacerT / pr.layerH).toFixed(1)} layers of air. Below about 0.4 mm the sheet sags into the track on its own and reads a phantom touch.`);
  if (P.taper !== "lin") note(`The taper is done with track width, which a nozzle limits to ${wMin.toFixed(1)} mm at the narrow end. That gives a ${(wMax / wMin).toFixed(1)} to 1 gradient, gentler than a bought audio pot. Lengthen the track for more.`);
  if (P.term === "pin" && Math.abs(pitch / 2.54 - Math.round(pitch / 2.54)) > 0.02) note(`Terminal pitch is ${pitch.toFixed(2)} mm. Header strips want a multiple of 2.54.`);
  return { parts, readout, fits, notes, rTrack: Rt, rContact: Rc, tiers: [cpla.provenance.tier, ctpu.provenance.tier] };
}

const rows = (p: ProfileLookup): [ResistivityRow, ResistivityRow] => [p.resistivity("cpla", "along", "printed"), p.resistivity("ctpu", "bulk", "printed")];

export function thinpotDerive(P: ThinpotParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const [a, b] = rows(profile);
  const t = thinpotBuild(P, tpPrint(profile, machine), a, b);
  const out: Record<string, DerivedValue> = {
    "R.track": dv(t.rTrack, "ohm", "sum over 48 segments of rho (L / 48) / (w(u) condT)", [a.provenance.tier]),
    "R.contact": dv(t.rContact, "ohm", "rho stripT / (pi (1.5 sqrt(F / 2))^2) + 400 / (F + 0.05)^0.6", [b.provenance.tier]),
  };
  for (const f of t.fits) out[`fits.${f.name}`] = dv(f.actual, "mm", `${f.min} to ${f.max}`, []);
  return out;
}

export function thinpotApply(input: ApplyIn<ThinpotParams>, id: string): ApplyOut {
  const [a, b] = rows(input.profile);
  const t = thinpotBuild(input.params, tpPrint(input.profile, input.draft.machine), a, b);
  const f = frameOf(input.face, id);
  const { bodies, slots } = bodiesOf(t.parts, f);
  const metrics: Metric[] = [];
  const metric = (mid: string, value: number | string, unit: string | undefined, note: string, tiers: readonly Tier[]): void => {
    metrics.push({ id: mid, value, ...(unit === undefined ? {} : { unit }), ...qualify(tiers), note, gate: "informational", group: "readouts" });
  };
  metric("thinpot.R.track", t.rTrack, "ohm", "track end to end, profile cPLA along row", [a.provenance.tier]);
  metric("thinpot.R.contact", t.rContact, "ohm", `collector contact at ${input.params.force} N, profile cTPU row`, [b.provenance.tier]);
  for (const r of t.readout) metric(`thinpot.say.${r.k.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`, r.v, r.u === "" ? undefined : r.u, `${r.k}: ${r.v}${r.u === "" ? "" : ` ${r.u}`}`, t.tiers);
  for (const x of t.fits) metric(`thinpot.fits.${x.name.replace(/[^a-z0-9]+/gi, "-")}`, x.actual, "mm", `${x.name} ${x.actual.toFixed(2)} mm, legal ${x.min} to ${x.max}${x.ok ? "" : " (not ok)"}`, []);
  return { bodies, features: [], ports: [], slots, metrics, warnings: [...t.fits.filter((x) => !x.ok).map((x) => ({ code: "FIT", text: `${x.name} is ${x.actual.toFixed(2)} mm, legal ${x.min} to ${x.max}` })), ...t.notes.map((n) => ({ code: "NOTE", text: n }))] };
}
