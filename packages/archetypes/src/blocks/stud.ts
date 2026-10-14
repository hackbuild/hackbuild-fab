// The BLOCKS stud column (blocks.md 5.4, boss.md 5.3, canon blocks-stud),
// ported from originals/blocks/files/src-extracted/blocks.js column and
// clutchRing (lines 168 to 220, flex clutch) for the blocks-html preset,
// and from originals/boss/files/boss-src/src/boss.js column (lines 93 to
// 110) for the boss-v1 preset. One conductive position: a cTPU socket ring
// under, a cPLA flange as contact face and lock, a cPLA post up through the
// host, a cPLA stud on top. The archetype stands on the host's top face;
// every z of the column is measured from the host's bottom face (`base`),
// as the originals measure from the bed.
//
// The standard has no default (D-087): apply refuses a call without one.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type ProfileLookup, type SchemaLike, type Vec2 } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { circle, dv, frameOf, locateFit, pipStack } from "../pip/common.js";
import { Emit } from "../pip/emit.js";
import { BRICK_STANDARDS, type BrickStandard } from "./standard.js";
import { prismWithHoles, rrect6 } from "./geometry.js";

/** Points on every circle of a column (blocks.js line 189, boss.js line 96). */
const COLUMN_SEGMENTS = 48;
/** Post to flange and tip overlap, mm (blocks.js lines 196 to 211, boss.js lines 103 and 106). */
const OVERLAP = 0.02;
/** A flush pad stops this far under the top so a trace may cross over it, mm (blocks.js line 199). */
const PAD_UNDER_TOP = 0.6;
/**
 * The socket contact the originals add to a post, ohm: an estimate (inferred,
 * parts.js line 59), no coupon recorded.
 */
const SOCKET_CONTACT_OHM = 400;

export const studParams = z.object({
  /** The brick standard: boss-v1 or blocks-html; no default until a print (D-087). */
  standard: z.enum(["blocks-html", "boss-v1"]),
  /**
   * both: socket under, stud over; down: socket under, flat top; up: flush
   * pad under (BLOCKS) or post from L1 (BOSS), stud over; pad: flush pad,
   * flat top (BLOCKS only). blocks.js line 186.
   */
  peg: z.enum(["both", "down", "up", "pad"]).default("both"),
  /** z of the host's bottom face, mm; the column's stack is measured from it. */
  base: z.number().default(0),
  /** The column's net. */
  net: z.string().min(1).default("STUD"),
}).strict();
export type StudParams = z.infer<typeof studParams>;
export const STUD_PARAMS = studParams as unknown as SchemaLike<unknown, StudParams>;

export interface ColumnPiece {
  readonly id: string;
  readonly material: "cpla" | "ctpu";
  /** Local rings: one outer ring, or an outer ring and its hole. */
  readonly rings: readonly (readonly Vec2[])[];
  readonly z: readonly [number, number];
}

export interface ColumnDecl {
  readonly std: BrickStandard;
  readonly pieces: readonly ColumnPiece[];
  /** The socket void cut from the host, local z band, or null. */
  readonly void: { readonly ring: readonly Vec2[]; readonly z: readonly [number, number] } | null;
  readonly postTop: number;
  readonly postZ0: number;
  /** The originals' taps: name, local x, y, z. */
  readonly taps: readonly { readonly name: string; readonly at: Vec2; readonly z: number }[];
}

/** The standard a call names. */
export function brickStandard(id: StudParams["standard"]): BrickStandard {
  return BRICK_STANDARDS[id];
}

/**
 * The column's pieces at (0, 0) under a host top `top` (local z from the
 * host bottom): blocks.js column with the flex clutch ring for blocks-html,
 * boss.js column for boss-v1.
 */
export function studColumn(S: Pick<StudParams, "standard" | "peg" | "net">, top: number): ColumnDecl {
  const std = brickStandard(S.standard);
  const n = COLUMN_SEGMENTS, o: Vec2 = [0, 0];
  const disc = (d: number): Vec2[] => circle(d / 2, o, n);
  const ring2 = (od: number, id: number): Vec2[][] => [disc(od), [...disc(id)].reverse()];
  const pieces: ColumnPiece[] = [];
  const taps: { name: string; at: Vec2; z: number }[] = [];
  const wantSock = S.peg === "both" || S.peg === "down";
  const wantStud = S.peg === "both" || S.peg === "up";
  if (std.id === "blocks-html") {
    // blocks.js lines 186 to 220; every z rounded to the micron as Body.feature does (line 70).
    const zr = rrect6;
    let z0: number;
    let voidBand: ColumnDecl["void"] = null;
    if (wantSock) {
      pieces.push({ id: "ring", material: "ctpu", rings: ring2(std.sockOD, std.sockIDflex), z: [0, std.sockH] });
      voidBand = { ring: disc(std.sockIDflex), z: [0, std.sockH] };
      // The ring is cTPU and the flange cPLA, two slots, so the flange starts at sockH (line 195).
      pieces.push({ id: "flange", material: "cpla", rings: [disc(std.sockOD)], z: [std.sockH, std.flangeTop] });
      z0 = zr(std.flangeTop - OVERLAP);
    } else {
      const padZ = Math.min(std.flangeTop, top - PAD_UNDER_TOP);
      pieces.push({ id: "pad", material: "cpla", rings: [disc(std.padD as number)], z: [0, zr(padZ)] });
      z0 = zr(padZ - OVERLAP);
    }
    const postTop = wantStud ? top : Math.min(top, std.padTop);
    pieces.push({ id: "post", material: "cpla", rings: [disc(std.postD)], z: [z0, zr(postTop)] });
    if (wantStud) {
      pieces.push({ id: "tip", material: "cpla", rings: [disc(std.postD)], z: [zr(top - OVERLAP), zr(top + OVERLAP)] });
      pieces.push({ id: "stud", material: "cpla", rings: [disc(std.studD)], z: [zr(top), zr(top + std.studH)] });
    }
    taps.push({ name: S.net, at: o, z: (Math.max(z0, 0) + postTop) / 2 });
    if (wantSock) taps.push({ name: `${S.net}.sock`, at: [(std.sockOD + std.sockIDflex) / 4, 0], z: std.sockH / 2 });
    else taps.push({ name: `${S.net}.pad`, at: o, z: 0.3 });
    return { std, pieces, void: voidBand, postTop, postZ0: z0, taps };
  }
  // boss.js lines 93 to 110: no flush pad; a column with no socket starts its post at L1.
  if (S.peg === "pad") {
    throw commandError({ code: "E_SCHEMA", path: "/params/peg", got: "pad", expected: "both, down or up", hint: "the boss-v1 column has no flush pad (boss.js lines 93 to 110); pick both, down or up, or the blocks-html standard" });
  }
  let voidBand: ColumnDecl["void"] = null;
  if (wantSock) {
    pieces.push({ id: "ring", material: "ctpu", rings: ring2(std.sockOD, std.sockIDflex), z: [0, std.sockH] });
    voidBand = { ring: disc(std.sockIDflex), z: [0, std.sockH] };
    pieces.push({ id: "flange", material: "cpla", rings: [disc(std.sockOD)], z: [std.sockH, std.sockH + std.flangeH] });
  }
  const z0 = wantSock ? std.sockH + std.flangeH - OVERLAP : std.L1;
  const postTop = wantStud ? top : std.padTop;
  pieces.push({ id: "post", material: "cpla", rings: [disc(std.postD)], z: [z0, postTop] });
  if (wantStud) {
    pieces.push({ id: "tip", material: "cpla", rings: [disc(std.postD)], z: [top - OVERLAP, top + OVERLAP] });
    pieces.push({ id: "stud", material: "cpla", rings: [disc(std.studD)], z: [top, top + std.studH] });
  }
  taps.push({ name: S.net, at: o, z: postTop - 0.5 });
  if (wantSock) taps.push({ name: `${S.net}.sock`, at: [(std.sockOD + std.sockIDflex) / 4, 0], z: std.sockH / 2 });
  return { std, pieces, void: voidBand, postTop, postZ0: z0, taps };
}

/**
 * Post resistance as parts.js line 59 prices it: rho over max(1, top - L1)
 * through the post section, plus the socket contact estimate. rho is the
 * profile row for printed cPLA through the layers (D-081 working row); the
 * original prices with its cPLA slot, Protopasta 30 ohm cm in plane
 * (blocks.js line 57).
 */
export function studPostR(std: BrickStandard, top: number, profile: ProfileLookup, row = profile.resistivity("cpla", "through", "printed")) {
  const r = sectionResistance(row, Math.max(1, top - std.L1), Math.PI * (std.postD / 2) ** 2);
  const ohm = (typeof r.ohm === "number" ? r.ohm : r.ohm[0]) + SOCKET_CONTACT_OHM;
  return { ohm, tier: r.tier, rowId: r.rowId };
}

export function studDerive(S: StudParams, profile: ProfileLookup, top?: number): Record<string, DerivedValue> {
  const std = brickStandard(S.standard);
  const h = top ?? std.brickH;
  const c = studColumn(S, h);
  const r = studPostR(std, h, profile);
  return {
    flangeTop: dv(std.flangeTop, "mm", "sockH + flangeH", []),
    L1: dv(std.L1, "mm", "flangeTop + isoT (BLOCKS) or the BOSS L1", []),
    padTop: dv(std.padTop, "mm", "L2 + traceT", []),
    postZ0: dv(c.postZ0, "mm", "flangeTop - 0.02 under a socket, else the pad top less 0.02 (BLOCKS) or L1 (BOSS)", []),
    postTop: dv(c.postTop, "mm", "the host top under a stud, else min(top, padTop) (BLOCKS) or padTop (BOSS)", []),
    "R.post": dv(r.ohm, "ohm", "rho max(1, top - L1) / (pi (postD / 2)^2) + 400 contact (parts.js line 59)", [r.tier, "inferred"]),
  };
}

export function studApply(input: ApplyIn<StudParams>, id: string): ApplyOut {
  const S = input.params;
  const f = frameOf(input.face, id, "give it the host's top face, where the stud stands");
  const top = f.z - S.base;
  const std = brickStandard(S.standard);
  if (!(top >= std.plateH - 1e-9)) {
    throw commandError({ code: "E_SCHEMA", path: "/face/origin/2", got: top, expected: `a host at least a plate tall, ${std.plateH} mm over base`, hint: `place ${id} on a host top at least ${std.plateH} mm above base ${S.base}` });
  }
  const c = studColumn(S, top);
  const e = new Emit(f, pipStack(input.profile, input.draft.machine, { body: "petg", trace: "cpla" }));
  for (const p of c.pieces) {
    const z0 = S.base + p.z[0], z1 = S.base + p.z[1];
    if (p.material === "ctpu") e.body(p.id, "ctpu", prismWithHoles(f, p.rings, z0, z1));
    else e.conductor(`conductor.${p.id}`, S.net, p.rings[0] as Vec2[], z0, z1, 2 * Math.hypot(...(p.rings[0] as Vec2[])[0] as Vec2));
  }
  if (c.void !== null) {
    // The socket void (blocks.js line 179, boss.js line 100): cut from the host up from its bottom face.
    e.pocket("pocket.socket", c.void.ring, S.base + c.void.z[1], c.void.z[1] - c.void.z[0], locateFit(input.profile), 0);
  }
  e.feature({ kind: "port", id: "port.stud", net: S.net, type: "signal", interface: "digital" });
  const r = studPostR(std, top, input.profile);
  e.metric("stud.R.post", r.ohm, "ohm", "post plus socket contact, parts.js line 59", [r.tier, "inferred"]);
  e.metric("stud.postTop", S.base + c.postTop, "mm", "top of the post", []);
  e.metric("stud.standard", std.id, undefined, `brick standard (D-087): ${std.source}`, []);
  for (const t of c.taps) e.metric(`stud.tap.${t.name.replace(/[^A-Za-z0-9]+/g, "-")}`, S.base + t.z, "mm", `tap ${t.name} at z, as the original declares it`, []);
  return e.out();
}
