// The BLOCKS printed wire (blocks.md 5.10, canon blocks-wire), ported from
// originals/blocks/files/src-extracted/parts.js lines 565 to 710 (wirePath,
// trimPath, wire) on the blocks-html standard (blocks.js lines 14 to 44,
// sheetT 1.6 and capH 3.2). A TPU sheath with a buried conductive core in
// one of five shapes, ending in peg caps that plug onto a stud and take a
// stud on top. The wire is a part of its own: it stands on the bed face.
//
// The path's arc, spiral and S bend points lie at arbitrary angles, which
// no per-count table holds, so they take Math.cos and Math.sin as the
// revolve route does; D-175 keeps that open.

import { z } from "zod";
import { type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type ResistivityRow, type SchemaLike, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { circle, dv, frameOf, pipStack, type Frame } from "../pip/common.js";
import { Emit } from "../pip/emit.js";
import { BLOCKS_HTML as STD } from "./standard.js";
import { minus, prismOf, prismWithHoles, rrect, strokePieces } from "./geometry.js";

/** WIRE_PARAMS, parts.js lines 565 to 577: defaults and ranges as the original declares them. */
export const wireParams = z.object({
  shape: z.enum(["straight", "arc", "spiral", "zigzag", "s"]).default("straight"),
  /** Path length, mm, 10 to 400. */
  len: z.number().min(10).max(400).default(80),
  /** Core material: conductive TPU (flex) or conductive PLA (stiffer, about 50x lower R in the original's slots). */
  core: z.enum(["ctpu", "cpla"]).default("ctpu"),
  /** Core width, mm, 0.8 to 2.4. */
  coreW: z.number().min(0.8).max(2.4).default(1.2),
  /** Sheath width, mm, 2.0 to 5.0. */
  sheathW: z.number().min(2.0).max(5.0).default(3.2),
  endA: z.enum(["stud", "down", "up", "bare"]).default("stud"),
  endB: z.enum(["stud", "down", "up", "bare"]).default("stud"),
  /** Arc and S bend radius, mm, 5 to 100. */
  radius: z.number().min(5).max(100).default(30),
  /** Zigzag amplitude, mm, 3 to 30. */
  amp: z.number().min(3).max(30).default(8),
  /** Zigzag period, mm, 6 to 60. */
  period: z.number().min(6).max(60).default(16),
  /** Spiral pitch, mm, 4 to 12. */
  pitch: z.number().min(4).max(12).default(5.5),
}).strict();
export type WireParams = z.infer<typeof wireParams>;
export const WIRE_PARAMS = wireParams as unknown as SchemaLike<unknown, WireParams>;
export const WIRE_DEFAULTS: WireParams = wireParams.parse({});

/** Core band in the sheath, mm (parts.js line 609). */
const CORE_Z: readonly [number, number] = [0.5, 1.1];
/** Band overlap of the sandwich, mm (parts.js lines 656 to 660). */
const OVERLAP = 0.02;
/** Cap square corner and point count (parts.js line 620), circle points at a cap (line 610). */
const CAP_R = 1.2, CAP_N = 4, CAP_SEGMENTS = 32;
/** Stroke joint points: core 16, sheath 24 (parts.js line 617). */
const CORE_STROKE_N = 16, SHEATH_STROKE_N = 24;
/** A bare end trims the sheath this far back, mm (parts.js line 615). */
const BARE_TRIM = 5;
/** A cTPU core ends this far inside the ring; a cPLA core this far outside the flange (parts.js line 685). */
const CORE_CUT_PAST = 0.3;

/** wirePath, parts.js lines 578 to 603. */
export function wirePath(p: WireParams): { pts: Vec2[]; len: number } {
  const L = p.len, pts: Vec2[] = [];
  const add = (x: number, y: number): void => { pts.push([x, y]); };
  if (p.shape === "straight") { add(0, 0); add(L, 0); }
  else if (p.shape === "arc") {
    const R = Math.max(p.radius, p.sheathW), sweep = Math.min(L / R, Math.PI * 1.9), n = Math.max(8, Math.ceil((sweep * R) / 2));
    for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (sweep * i) / n; add(R * Math.cos(t), R + R * Math.sin(t)); }
  } else if (p.shape === "spiral") {
    // The inner end starts outside the next turn, or the end cap touches it and the union pinches (line 586).
    const b = p.pitch / (2 * Math.PI), r0 = Math.max(p.pitch + 6.2, p.sheathW * 1.6);
    let th = 0, s = 0;
    add(r0, 0);
    while (s < L) { const r = r0 + b * th; const dth = 1.2 / r; th += dth; s += Math.hypot(r * dth, b * dth); const rr = r0 + b * th; add(rr * Math.cos(th), rr * Math.sin(th)); }
  } else if (p.shape === "zigzag") {
    const A = p.amp, T = p.period;
    let s = 0, x = 0, up = 1;
    add(0, 0);
    const seg = Math.hypot(T / 2, 2 * A);
    while (s < L) { s += seg; x += T / 2; add(x, up * A); up = -up; }
    const last = pts[pts.length - 1] as Vec2;
    pts.push([last[0] + 3, last[1] > 0 ? A : -A]);
  } else {
    const R = Math.max(p.radius, p.sheathW), n = 12, l1 = Math.max(5, (L - Math.PI * R) / 2);
    add(0, 0); add(l1, 0);
    for (let i = 1; i <= n; i++) { const t = -Math.PI / 2 + ((Math.PI / 2) * i) / n; add(l1 + R * Math.cos(t), R + R * Math.sin(t)); }
    for (let i = 1; i <= n; i++) { const t = ((Math.PI / 2) * i) / n; add(l1 + 2 * R - R * Math.cos(t), R + R * Math.sin(t)); }
    add(2 * l1 + 2 * R, 2 * R);
  }
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot((pts[i] as Vec2)[0] - (pts[i - 1] as Vec2)[0], (pts[i] as Vec2)[1] - (pts[i - 1] as Vec2)[1]);
  return { pts, len };
}

/** trimPath, parts.js lines 604 to 609: the path less d0 at its start and d1 at its end. */
export function trimPath(pts: readonly Vec2[], d0: number, d1: number): Vec2[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push((cum[i - 1] as number) + Math.hypot((pts[i] as Vec2)[0] - (pts[i - 1] as Vec2)[0], (pts[i] as Vec2)[1] - (pts[i - 1] as Vec2)[1]));
  const L = cum[cum.length - 1] as number;
  const at = (s0: number): Vec2 => {
    const s = Math.max(0, Math.min(L, s0));
    let i = 1;
    while (i < cum.length - 1 && (cum[i] as number) < s) i++;
    const t = (s - (cum[i - 1] as number)) / Math.max(1e-9, (cum[i] as number) - (cum[i - 1] as number));
    const a = pts[i - 1] as Vec2, b = pts[i] as Vec2;
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };
  const out: Vec2[] = [at(d0)];
  for (let i = 0; i < pts.length; i++) if ((cum[i] as number) > d0 && (cum[i] as number) < L - d1) out.push(pts[i] as Vec2);
  out.push(at(L - d1));
  return out;
}

const wantSock = (e: WireParams["endA"]): boolean => e === "stud" || e === "down";
const wantStud = (e: WireParams["endA"]): boolean => e === "stud" || e === "up";

/** The core resistance, parts.js line 692: rho len / (coreW x core band), at the row the core reads. */
export function wireR(p: WireParams, len: number, row: ResistivityRow) {
  const r = sectionResistance(row, len, p.coreW * (CORE_Z[1] - CORE_Z[0]));
  return { ohm: typeof r.ohm === "number" ? r.ohm : r.ohm[0], tier: r.tier, rowId: r.rowId };
}

/** The row the core reads: cPLA along the layers, or cTPU bulk (D-081 working rows). */
export function wireRow(p: WireParams, profile: ProfileLookup): ResistivityRow {
  return p.core === "cpla" ? profile.resistivity("cpla", "along", "printed") : profile.resistivity("ctpu", "bulk", "printed");
}

/** parts.js line 702: the read verdict on the core resistance, ohm. */
export function wireVerdict(ohm: number): string {
  return ohm < 1e5 ? "signal and ADC fine" : ohm < 1e6 ? "digital fine, ADC needs a 100 nF at the pin" : "digital only (slow edges), no analog";
}

/** What the wire spans (parts.js lines 694 to 698): max pulled straight, flat the chord between caps. */
export function wireSpan(p: WireParams) {
  const { pts, len } = wirePath(p);
  const A = pts[0] as Vec2, B = pts[pts.length - 1] as Vec2;
  const chord = Math.hypot(B[0] - A[0], B[1] - A[1]);
  return { len, chord, max: Number((len - 1.0).toFixed(2)), flat: Number(chord.toFixed(2)) };
}

export function wireDerive(p: WireParams, profile: ProfileLookup): Record<string, DerivedValue> {
  const s = wireSpan(p);
  const r = wireR(p, s.len, wireRow(p, profile));
  return {
    len: dv(s.len, "mm", "path length, cap centre to cap centre", []),
    chord: dv(s.chord, "mm", "cap to cap lying flat", []),
    "span.max": dv(s.max, "mm", "len - 1.0, pulled straight", []),
    R: dv(r.ohm, "ohm", "rho len / (coreW x 0.6)", [r.tier]),
    "fits.sheath wall each side": dv((p.sheathW - p.coreW) / 2, "mm", "(sheathW - coreW) / 2, at least 0.6", []),
  };
}

/** The wire's bodies as local declarations: the sheath bands, the cap conductors and the core (parts.js lines 610 to 690). */
export function wireBodies(p: WireParams, f: Frame, z0: number) {
  const { pts } = wirePath(p);
  const ends = [p.endA, p.endB] as const;
  const trim = ends.map((e) => (e === "bare" ? BARE_TRIM : 0));
  const sp = trimPath(pts, trim[0] as number, trim[1] as number);
  const corePieces = strokePieces(pts, p.coreW, CORE_STROKE_N);
  const sheathPieces = strokePieces(sp, p.sheathW, SHEATH_STROKE_N);
  const capSq = STD.P - 0.4, capH = STD.plateH, zS = 1.6;
  const A = pts[0] as Vec2, Bp = pts[pts.length - 1] as Vec2;
  const caps = ends.flatMap((e, i) => (e === "bare" ? [] : [{ c: i === 0 ? A : Bp, mode: e, name: i === 0 ? "A" : "B" }]));
  const squares = caps.map((cf) => rrect(cf.c, capSq, capSq, CAP_R, CAP_N));
  const lowHoles = caps.map((cf) => circle((wantSock(cf.mode) ? STD.sockOD : (STD.padD as number)) / 2, cf.c, CAP_SEGMENTS));
  const postHoles = caps.map((cf) => circle(STD.postD / 2, cf.c, CAP_SEGMENTS));
  const padZ = Math.min(STD.flangeTop, capH - 0.6);
  const zMid = Math.min(STD.flangeTop, padZ);
  const Z = (v: number): number => z0 + v;
  const region = (a: number, b: number): ShapeDecl => ({ route: "csg", op: "union", of: [...sheathPieces, ...squares].map((r) => prismOf(f, r, Z(a), Z(b))) });
  const runLow = (a: number, b: number): ShapeDecl => minus(f, region(a, b), lowHoles, Z(a), Z(b));
  // The middle band is the run less the core stroke (parts.js line 657).
  const coreCut: ShapeDecl = { route: "csg", op: "union", of: corePieces.map((r) => prismOf(f, r, Z(CORE_Z[0] - OVERLAP) - 0.01, Z(CORE_Z[1] + OVERLAP) + 0.01)) };
  const sheath: ShapeDecl[] = [
    runLow(0, CORE_Z[0]),
    { route: "csg", op: "difference", of: [runLow(CORE_Z[0] - OVERLAP, CORE_Z[1] + OVERLAP), coreCut] },
    runLow(CORE_Z[1], zS),
  ];
  if (squares.length > 0) {
    const capsOnly = (a: number, b: number): ShapeDecl => ({ route: "csg", op: "union", of: squares.map((r) => prismOf(f, r, Z(a), Z(b))) });
    sheath.push(minus(f, capsOnly(zS - OVERLAP, zMid), lowHoles, Z(zS - OVERLAP), Z(zMid)));
    sheath.push(minus(f, capsOnly(zMid - OVERLAP, capH), postHoles, Z(zMid - OVERLAP), Z(capH)));
  }
  const capCond: { id: string; base: ShapeDecl }[] = [];
  for (const cf of caps) {
    const disc = (d: number): Vec2[] => circle(d / 2, cf.c, CAP_SEGMENTS);
    if (wantSock(cf.mode)) {
      capCond.push({ id: `cap${cf.name}.ring`, base: prismWithHoles(f, [disc(STD.sockOD), disc(STD.sockIDflex)], Z(0), Z(STD.sockH)) });
      capCond.push({ id: `cap${cf.name}.flange`, base: prismOf(f, disc(STD.sockOD), Z(STD.sockH - OVERLAP), Z(STD.flangeTop)) });
    } else {
      capCond.push({ id: `cap${cf.name}.pad`, base: prismOf(f, disc(STD.padD as number), Z(0), Z(padZ)) });
    }
    capCond.push({ id: `cap${cf.name}.post`, base: prismOf(f, disc(STD.postD), Z((wantSock(cf.mode) ? STD.flangeTop : padZ) - OVERLAP), Z(capH + (wantStud(cf.mode) ? OVERLAP : 0))) });
    if (wantStud(cf.mode)) capCond.push({ id: `cap${cf.name}.stud`, base: prismOf(f, disc(STD.studD), Z(capH), Z(capH + STD.studH)) });
  }
  const cut = p.core === "ctpu" ? STD.sockIDflex / 2 + CORE_CUT_PAST : STD.sockOD / 2 + CORE_CUT_PAST;
  const coreU: ShapeDecl = { route: "csg", op: "union", of: corePieces.map((r) => prismOf(f, r, Z(CORE_Z[0]), Z(CORE_Z[1]))) };
  const core = minus(f, coreU, caps.map((cf) => circle(cut, cf.c, CAP_SEGMENTS)), Z(CORE_Z[0]), Z(CORE_Z[1]));
  return { sheath, capCond, core, caps };
}

export function wireApply(input: ApplyIn<WireParams>, id: string): ApplyOut {
  const p = input.params;
  const f = frameOf(input.face, id, "give it the bed face, where the wire lies flat");
  const e = new Emit(f, pipStack(input.profile, input.draft.machine, { body: "petg", trace: "cpla" }));
  const b = wireBodies(p, f, f.z);
  e.body("sheath", "tpu95", { route: "csg", op: "union", of: b.sheath });
  for (const c of b.capCond) e.body(c.id, "ctpu", c.base);
  e.body("core", p.core === "ctpu" ? "ctpu" : "cpla", b.core);
  for (const c of b.caps) e.feature({ kind: "port", id: `port.${c.name}`, net: `WIRE.${c.name}`, type: "signal", interface: "digital" });
  const s = wireSpan(p);
  const r = wireR(p, s.len, wireRow(p, input.profile));
  e.metric("wire.len", s.len, "mm", "path length, cap centre to cap centre", []);
  e.metric("wire.chord", s.chord, "mm", "cap to cap lying flat", []);
  e.metric("wire.R", r.ohm, "ohm", `core R, ${wireVerdict(r.ohm)} (parts.js line 702)`, [r.tier]);
  e.metric("wire.fits.sheath-wall-each-side", (p.sheathW - p.coreW) / 2, "mm", "sheath wall each side, at least 0.6 (parts.js line 709)", [], "informational", "fits");
  if ((p.sheathW - p.coreW) / 2 < 0.6) e.warnings.push({ code: "FIT", text: `wire: sheath wall each side ${((p.sheathW - p.coreW) / 2).toFixed(2)} mm, legal at least 0.6, widen the sheath or narrow the core` });
  return e.out();
}
