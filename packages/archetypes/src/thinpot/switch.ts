// The dome switch (thinpot.md 4.3, canon dome-button), ported line for line
// from originals/thinpot/files/feeler_thinpot.html, archetype `switch`
// (lines 1700 to 1846), with terminalRow (lines 1245 to 1257) and
// mountHoles (lines 1420 to 1424): a flip bowl dome (domeCap) or an in-place
// cone over two half-disc contacts, two traces to a terminal row.

import { z } from "zod";
import { qualify, type ApplyIn, type ApplyOut, type DerivedValue, type Metric, type ProfileLookup, type ResistivityRow, type SchemaLike, type Tier, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { feelerSwitchParams } from "../defs/feeler/switch.js";
import { dv, frameOf } from "../pip/common.js";
import { circle, clamp, fmtR, rect, rrect, stroke, type Loop } from "./geom.js";
import { TpParts, bodiesOf } from "./parts.js";
import { TP_EZ as EZ, domeCap, type DomeOut } from "./dome.js";
import { tpPrint, type TpFit, type TpPrint, type TpSay } from "./ladder.js";

/**
 * The page's declarations (feeler-switch). As in the ladder, holeD is
 * declared twice (contact hole 3, mounting hole 3.2, lines 1710 and 1716)
 * and the build reads 3.2 for both; the port runs at that value.
 */
export const switchParams = feelerSwitchParams.extend({
  /** contact hole dia (in place), mm: 3.2 at build, the page's later holeD (line 1716) */
  holeD: z.number().min(1.6).max(8).default(3.2),
}).strict();
export type SwitchParams = z.infer<typeof switchParams>;
export const SWITCH_PARAMS = switchParams as unknown as SchemaLike<unknown, SwitchParams>;
export const SWITCH_DEFAULTS: SwitchParams = switchParams.parse({});

export interface SwitchBuild {
  readonly parts: TpParts;
  readonly readout: TpSay[];
  readonly fits: TpFit[];
  readonly notes: string[];
  readonly dome: DomeOut;
  readonly rWire: number;
  readonly tiers: readonly Tier[];
}

export function switchBuild(P0: SwitchParams, pr: TpPrint, row: ResistivityRow): SwitchBuild {
  const P = { ...P0 };
  const parts = new TpParts();
  const readout: TpSay[] = [], fits: TpFit[] = [], notes: string[] = [];
  const say = (k: string, v: string, u = ""): void => { readout.push({ k, v, u }); };
  const note = (s: string): void => { notes.push(s); };
  const fit = (name: string, nominal: number, actual: number, min: number, max: number): void => { fits.push({ name, nominal, actual, min, max, ok: actual >= min && actual <= max }); };
  const traceW0 = P.traceW;
  P.termPitch = Math.max(P.termPitch, P.termW + 1.2);
  P.traceW = clamp(P.traceW, 0.4, Math.max(0.4, P.termPitch - P.termW * 0.5 - 1.2));
  const W = P.od + 10, H = P.od + P.termL + 12;
  const cy = (P.termL + 8) / 2;
  const rigid = parts.get("base", "rigid"), cond = parts.get("contacts", "cond");
  const z0 = P.baseT, z1 = P.baseT + P.condT;
  const mh = (w: number, h: number, d: number, inset: number): Loop[] => {
    if (!P.mountHoles) return [];
    const r = d / 2, x = w / 2 - inset, y = h / 2 - inset;
    return [circle(-x, -y, r, 20), circle(x, -y, r, 20), circle(-x, y, r, 20), circle(x, y, r, 20)];
  };
  rigid.prism(rrect(0, 0, W, H, 2, 6), mh(W, H, P.holeD, Math.max(4, P.holeD)), 0, P.baseT);
  const clr = Math.max(0.8, P.traceW * 0.8);
  const rimR = P.od / 2, s40 = Math.sin((40 * Math.PI) / 180);
  let wallIn = P.print === "inplace" ? P.coneWall / s40 : P.wallT;
  if (P.print === "inplace" && P.coneWall > (rimR - 3.0) * s40) { P.coneWall = Math.max(0.4, (rimR - 3.0) * s40); wallIn = P.coneWall / s40; note(`Cone wall was cut to ${P.coneWall.toFixed(2)} mm: at 40 degree walls a thicker cone leaves no room for the pads inside it.`); }
  const rPad0 = rimR - wallIn - 0.4;
  const rPk = clamp(P.plugD / 2, 1.2, Math.min(rimR * 0.4, rPad0 - 1.0));
  let rC2 = clamp(Math.max(2.0, rPk + 0.8), 1.5, rPad0 - 0.5);
  let padTop = z1;
  const flex = parts.get("dome", "flex"), puck = parts.get("shorting puck", "aux");
  const dA2 = (P.traceW / 2 + clr) / rimR + 0.06;
  let D: DomeOut | null = null;
  if (P.print === "inplace") {
    D = domeCap({ mode: "inplace", flex, plug: puck, rigid, cx: 0, cy, rimR, wallT: P.wallT, coneWall: P.coneWall, domeH: P.domeH, travel: P.travel, zPed0: P.baseT - EZ, z1, rPk: 0, holeR: P.holeD / 2, gaps: [-Math.PI / 2, Math.PI / 2], gapA: dA2, clr, layerH: pr.layerH, nozzle: pr.nozzle });
    const gapIn = Math.max(1.2, P.travel < 0.35 * D.cavity ? 0.45 * D.cavity : Math.min(P.travel, 0.5 * D.cavity));
    if (Math.abs(gapIn - P.travel) > 0.05) note(`Contact gap set to ${gapIn.toFixed(2)} mm (${((100 * gapIn) / D.cavity).toFixed(0)} percent of the cavity). Closer than about a third of the cavity there is no press to feel and the cap can print onto the contacts.`);
    padTop = Math.max(z1, D.ceiling - gapIn);
    let rFitS = D.innerR(padTop) - clr;
    if (rFitS < 1.5) { padTop = z1 + 0.3; while (padTop < D.ceiling - gapIn && D.innerR(padTop + 0.3) - clr >= 1.5) padTop += 0.3; rFitS = D.innerR(padTop) - clr; note(`The contacts stop at ${(padTop - z1).toFixed(1)} mm: any taller and they would hit the inside of the cone. The cap has to travel ${(D.ceiling - padTop).toFixed(1)} mm to reach them; open the dome or the hole for less.`); }
    rC2 = clamp(Math.min(rC2, rFitS), 1.2, 20);
    if (padTop - z1 > 0.05) say("contacts", `two half columns r ${rC2.toFixed(1)}, ${(padTop - z1).toFixed(1)} mm tall, cap patch dia ${(2 * D.holeR).toFixed(1)} lands on them`);
  }
  const a0 = Math.asin(Math.min(0.9, clr / 2 / rC2));
  const halfPad = (top: boolean): Loop => {
    const p: Loop = [], n2 = 24, aS = top ? a0 : Math.PI + a0, aE = top ? Math.PI - a0 : 2 * Math.PI - a0;
    for (let q = 0; q <= n2; q++) { const aa = aS + ((aE - aS) * q) / n2; p.push([rC2 * Math.cos(aa), cy + rC2 * Math.sin(aa)]); }
    return p;
  };
  cond.prism(halfPad(true), null, z0, padTop);
  cond.prism(halfPad(false), null, z0, padTop);
  // terminalRow(c, 2, H, termPitch, termW, termL, z0, z1), inset 1.5
  const terms = parts.get("terminals", "cond");
  const tie: { x: number; tie: number }[] = [];
  for (let i = 0; i < 2; i++) {
    const x = -((2 - 1) * P.termPitch) / 2 + i * P.termPitch, y0 = -H / 2 + 1.5, y1 = y0 + P.termL;
    terms.prism(rect(x - P.termW / 2, y0, P.termW, P.termL), null, z0, z1);
    tie.push({ x, tie: y1 - Math.max(0.35, Math.min(0.9, P.termL * 0.28)) });
  }
  const t0 = tie[0] as { x: number; tie: number }, t1 = tie[1] as { x: number; tie: number };
  cond.prism(stroke([[0, cy - rC2 + P.traceW * 0.6], [0, t0.tie + 3], [t0.x, t0.tie]], P.traceW, "round"), null, z0, z1);
  const xOutS = rimR + (P.print === "inplace" ? 0 : (P.lock ? 1.3 : 0.3) + Math.max(0.84, 2.1 * pr.nozzle)) + clr + P.traceW / 2;
  const lead: Vec2[] = [[0, cy + rC2 - P.traceW * 0.6], [0, cy + xOutS], [xOutS, cy + xOutS], [xOutS, t1.tie + 3], [t1.x, t1.tie]];
  cond.prism(stroke(lead, P.traceW, "round"), null, z0, z1);
  if (P.print === "inplace") {
    const d = D as unknown as DomeOut;
    fit("cone wall angle", 40, d.wallDeg, 39.9, 90);
    fit("cap to contacts", 0.45 * d.cavity, d.ceiling - padTop, Math.max(1.2, 0.33 * d.cavity), d.cavity * 0.55);
    if (d.raised) note(`Dome rise was raised to ${d.domeH.toFixed(1)} mm so the cone walls stay at 40 degrees from horizontal and print in place without support. Shrink the cap or the dome diameter for a lower one.`);
  } else {
    D = domeCap({ mode: "flip", flex, plug: puck, rigid, cx: 0, cy, rimR, wallT: P.wallT, domeH: P.domeH, travel: P.travel, zPed0: P.baseT - EZ, z1, rPk, gaps: [-Math.PI / 2, Math.PI / 2], gapA: dA2, clr, layerH: pr.layerH, nozzle: pr.nozzle, lock: P.lock });
    if (D.lock) say("retention", `flange ${D.flangeW.toFixed(1)} x ${D.flangeT.toFixed(1)} under a 45 degree lip, press fit`);
    fit("plug clearance at rest", P.travel, D.travel, 0.2, P.domeH * 0.85);
    fit("shoulder to flex", D.shoulder, D.shoulder, 1.5, 100);
    parts.pose("dome", { dx: W / 2 + rimR + 6, dy: 0, dz: -z1, flipZ: [z1, D.zTop] });
    parts.pose("shorting puck", { dx: W / 2 + rimR + 6, dy: 0, dz: -z1, flipZ: [z1, D.zTop] });
    if (Math.abs(D.travel - P.travel) > 0.05) note(`Contact gap was cut to ${D.travel.toFixed(2)} mm, all the room there is under the ceiling.`);
    if (D.travel > P.domeH * 0.85) note(`The plug has to drop ${D.travel.toFixed(1)} mm to touch and the dome only rises ${P.domeH.toFixed(1)}. Shorten the gap or raise the dome or it will never close.`);
  }
  const Dd = D as DomeOut;
  parts.absorbTerminals();
  say("outline", `${W.toFixed(1)} x ${H.toFixed(1)}`, "mm");
  const gapEff = Dd.inplace ? Dd.ceiling - padTop : Dd.travel;
  say("contact gap", gapEff.toFixed(2), "mm");
  say("gap layers", String(Math.round(gapEff / pr.layerH)));
  const tr = sectionResistance(row, (P.od + H) / 2, P.traceW * P.condT).ohm;
  const rWire = (typeof tr === "number" ? tr : tr[0]) * 2;
  say("wiring R", fmtR(rWire));
  say("closed R", `${fmtR(rWire + 2000)} to ${fmtR(rWire + 60000)}`);
  say("snap ratio h/t", (P.domeH / P.wallT).toFixed(2));
  say("trace width", P.traceW.toFixed(2), "mm");
  say("pads", `two half discs, r ${rC2.toFixed(1)}, ${clr.toFixed(1)} mm apart`);
  if (Dd.inplace) {
    say("dome", `in place cone, walls ${Dd.wallDeg.toFixed(0)} deg from horizontal (${(90 - Dd.wallDeg).toFixed(0)} deg overhang), ${Dd.domeH.toFixed(1)} tall`);
    say("cone wall", `${Dd.wallT.toFixed(2)} mm, hinge band ${Dd.hingeT.toFixed(2)} mm`);
    say("cap", `r ${Dd.rFlat.toFixed(1)} conductive TPU, bridged over an r ${Dd.holeR.toFixed(1)} hole, ${Dd.puckH.toFixed(1)} thick`);
    say("cap travel to contact", `${(Dd.ceiling - padTop).toFixed(1)} of a ${Dd.cavity.toFixed(1)} mm cavity (${((100 * (Dd.ceiling - padTop)) / Dd.cavity).toFixed(0)} percent)`);
    say("feel", Dd.feel < 0.7 ? "light" : Dd.feel < 1.6 ? "medium, like a silicone remote" : Dd.feel < 4 ? "firm" : "stiff, thin the wall");
  } else {
    say("plug", `r ${Dd.rPk.toFixed(1)} disc, ${Dd.puckH.toFixed(1)} thick on the ceiling${Dd.stemL > 0.2 ? `, r ${Dd.rStem.toFixed(1)} stem ${Dd.stemL.toFixed(1)} long` : ""}`);
    say("dome top", `flat r ${Dd.rFlat.toFixed(1)}, then ${Dd.shoulder.toFixed(1)} mm of shoulder to the rim`);
    say("feel", Dd.feel < 0.6 ? "light click" : Dd.feel < 1.5 ? "crisp click" : Dd.feel < 3.5 ? "firm" : "stiff, thin the wall or shrink the plug");
  }
  if (P.domeH / P.wallT < 2.5) note("Rise over wall under about 2.5 will mush instead of clicking. Raise the dome or thin the wall.");
  if (P.traceW < traceW0 - 0.02) note(`Trace width was cut to ${P.traceW.toFixed(2)} mm so the two lead outs clear each other at a ${P.termPitch.toFixed(1)} mm terminal pitch.`);
  if (rPk < P.plugD / 2 - 0.05) note(`The plug was shrunk to r ${rPk.toFixed(1)} mm so the dome keeps a shoulder to flex. Grow the dome for a bigger contact.`);
  return { parts, readout, fits, notes, dome: Dd, rWire, tiers: [row.provenance.tier] };
}

const cplaRow = (profile: ProfileLookup): ResistivityRow => profile.resistivity("cpla", "along", "printed");

export function switchDerive(P: SwitchParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const b = switchBuild(P, tpPrint(profile, machine), cplaRow(profile));
  const out: Record<string, DerivedValue> = {
    "R.wiring": dv(b.rWire, "ohm", "2 rho ((od + H) / 2) / (traceW condT)", b.tiers),
    contactGap: dv(b.dome.inplace ? b.dome.ceiling : b.dome.travel, "mm", "plug to pad at rest (bowl)", []),
    zTop: dv(b.dome.zTop, "mm", "dome top above the bed, assembled", []),
    feel: dv(b.dome.feel, "index", "(wallT / 0.8)^3 (rFlat / rimR / 0.35)^2", []),
  };
  for (const f of b.fits) out[`fits.${f.name}`] = dv(f.actual, "mm", `${f.min} to ${f.max}`, []);
  return out;
}

export function switchApply(input: ApplyIn<SwitchParams>, id: string): ApplyOut {
  const b = switchBuild(input.params, tpPrint(input.profile, input.draft.machine), cplaRow(input.profile));
  const f = frameOf(input.face, id);
  const { bodies, slots } = bodiesOf(b.parts, f);
  const metrics: Metric[] = [];
  const metric = (mid: string, value: number | string, unit: string | undefined, note: string, t: readonly Tier[]): void => {
    metrics.push({ id: mid, value, ...(unit === undefined ? {} : { unit }), ...qualify(t), note, gate: "informational", group: "readouts" });
  };
  metric("dome.R.wiring", b.rWire, "ohm", "both traces, profile cPLA along row", b.tiers);
  metric("dome.zTop", b.dome.zTop, "mm", "dome top above the bed, assembled", []);
  for (const r of b.readout) metric(`dome.say.${r.k.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`, r.v, r.u === "" ? undefined : r.u, `${r.k}: ${r.v}${r.u === "" ? "" : ` ${r.u}`}`, b.tiers);
  for (const x of b.fits) metric(`dome.fits.${x.name.replace(/[^a-z0-9]+/gi, "-")}`, x.actual, "mm", `${x.name} ${x.actual.toFixed(2)} mm, legal ${x.min} to ${x.max}${x.ok ? "" : " (not ok)"}`, []);
  return { bodies, features: [], ports: [], slots, metrics, warnings: [...b.fits.filter((x) => !x.ok).map((x) => ({ code: "FIT", text: `${x.name} is ${x.actual.toFixed(2)} mm, legal ${x.min} to ${x.max}` })), ...b.notes.map((n) => ({ code: "NOTE", text: n }))] };
}
