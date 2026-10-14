// The PIP RP2040-Zero seat (pip.md 5.7, canon rp2040-zero-seat, press mode
// with bump or socket contacts), ported from
// originals/pip/files/haft-src/src/layout.js zeroPads (lines 10 to 21), the
// board placement and stand (lines 177 to 184), the used pins (lines 393
// to 417), and model.js lines 180 to 238 (pocket, back window, USB notch,
// bumps or sockets, anti-smear slots, datum packers, grip ledge) and 586 to
// 604 (its fits rows). Defaults layout.js line 39 (board), line 44 (pins).
//
// The face origin is the board centre on the stack floor with +v toward
// the cable edge, so the pocket and the notch run past the host's cable
// edge, which sits usbOver past the board's USB end as PIP places it. The
// bezel's press ribs (model.js lines 313 to 319) belong to the bezel, which
// stays with the PIP design (M10); only their squeeze is a fits row here.
// Wire mode and its cups are not ported: the cup claim is retired (D-096)
// and GUDGEON's header cups are the candidate seats/rp2040-zero-header-cups.

import { z } from "zod";
import { commandError, type ApplyIn, type ApplyOut, type DerivedValue, type PortTap, type ProfileLookup, type SchemaLike, type Vec2 } from "@hackbuild/spec";
import {
  EZ, circle, dv, fitMetric, locateFit, fitRow, fitWarnings, frameOf, mm, pipStack, place, rect, snapUp,
  type FitRow, type PipStack,
} from "./common.js";
import { Emit } from "./emit.js";
import zeroRow from "@hackbuild/catalog/data/modules/rp2040-zero.json" with { type: "json" };

/** The seated board's catalog row id, its MCU, and its pin centres (row frame: top view, USB toward +y, origin at the board centre). */
export const SEAT_BOARD = { id: zeroRow.id, mcu: zeroRow.mcu } as const;

/** The pin centre of `name` from the catalog row, mm; E_REF when the row has no such pin. */
export function boardPin(name: string): Vec2 {
  const pins = zeroRow.fields.pins.value;
  const hit = pins.find((q) => q.name === name);
  if (hit === undefined) {
    throw commandError({ code: "E_REF", path: "/params/nets", got: name, didYouMean: pins.map((q) => q.name), hint: `catalog row ${zeroRow.id} has no pin ${name}` });
  }
  return [hit.at[0] as number, hit.at[1] as number];
}

/** PIP's default pin map (layout.js line 44) for the buttons at PIP defaults, with the two commons (lines 404 to 405): net to pad. */
export const PIP_SEAT_NETS: Readonly<Record<string, string>> = {
  UP: "GP29", LEFT: "GP28", RIGHT: "GP27", DOWN: "GP26", X: "GP3", A: "GP4", Y: "GP5", B: "GP6", SELECT: "GP12", START: "GP10", GND: "GND", "3V3": "3V3",
};

/** Seat params, PIP defaults (layout.js line 39; stack.bezel line 27; route.post line 28). */
export const seatParams = z.object({
  /** Board length along the USB axis, mm (Waveshare RP2040-Zero, vendor drawing as PIP declares it). */
  L: z.number().positive().default(23.5),
  /** Board width, mm. */
  W: z.number().positive().default(18.0),
  /** Board thickness, mm. */
  T: z.number().positive().default(1.0),
  /** Castellation pitch, mm. */
  pitch: z.number().positive().default(2.54),
  /** Castellation centres in from the board edges, mm. */
  inset: z.number().positive().default(1.38),
  /** USB connector height above the board top, mm. */
  usbH: z.number().positive().default(3.26),
  /** USB connector overhang past the board end, mm; the host's cable edge sits here. */
  usbOver: z.number().nonnegative().default(0.8),
  /** Bump width, mm; the bump is drawn 0.2 wider (model.js line 209). */
  bumpW: z.number().positive().default(1.5),
  /** Bump height above the floor, mm; the board stands on it. */
  bumpH: z.number().positive().default(0.48),
  /** Pocket clearance round the board, each side, mm. */
  clr: z.number().nonnegative().default(0.3),
  /** Bezel rib interference on the board top, mm (the ribs live on the bezel). */
  press: z.number().nonnegative().default(0.3),
  /** Back window under the board, recessed two layers into the floor. */
  window: z.boolean().default(true),
  /**
   * Where the back window stops short of the board's USB end, mm. PIP stops
   * it at 0.4 (model.js line 194) while the USB notch starts at 0.3 (line
   * 197), both from two layers below the floor, which leaves a PETG fin 0.1
   * mm thick and 0.48 tall across the 12.5 mm notch (computed) that no
   * slicer prints. The port stops the window at the notch, removing 0.1 x
   * 12.64 x 0.48 mm (computed); 0.4 regenerates the original exactly.
   */
  windowEnd: z.number().nonnegative().default(0.3),
  /** Contacts: bumps under the castellations, or printed sockets for a soldered header. */
  contact: z.enum(["bump", "socket"]).default("bump"),
  /** Socket outer diameter, mm. */
  sockOD: z.number().positive().default(1.8),
  /** Socket bore, mm. */
  sockBore: z.number().positive().default(0.75),
  /** Header pin length into the socket, mm. */
  pinLen: z.number().positive().default(3.0),
  /** Header plastic spacer thickness, mm. */
  headerT: z.number().positive().default(2.5),
  /** Datum packers at the far end and both sides. */
  datum: z.boolean().default(true),
  /** Grip ledge over the far edge. */
  grip: z.boolean().default(true),
  /** Bezel thickness the USB opening may carry into, mm (stack.bezel). */
  bezel: z.number().nonnegative().default(2.4),
  /** Routed terminal post radius under each contact, mm (route.post). */
  post: z.number().positive().default(0.6),
  /** Host top, mm from the bed; 0 places the top at the pocket need snapped up a layer. */
  top: z.number().nonnegative().default(0),
  /** Net to castellation name for every used pad. */
  nets: z.record(z.string().min(1), z.string().min(1)).default({ ...PIP_SEAT_NETS }),
}).strict();
export type SeatParams = z.infer<typeof seatParams>;
export const SEAT_PARAMS = seatParams as unknown as SchemaLike<unknown, SeatParams>;
export const SEAT_DEFAULTS: SeatParams = seatParams.parse({});

export interface ZeroPad { readonly name: string; readonly x: number; readonly y: number; readonly edge: "L" | "T" | "R"; readonly num: number }

/** zeroPads, layout.js lines 10 to 21: 23 castellations, top view, USB toward +y, origin at the board centre. */
export function zeroPads(B: Pick<SeatParams, "W" | "L" | "inset" | "pitch">): ZeroPad[] {
  const hw = B.W / 2, hl = B.L / 2, xL = -hw + B.inset, xR = hw - B.inset, yT = -hl + B.inset;
  const left = ["5V", "GND", "3V3", "GP29", "GP28", "GP27", "GP26", "GP15", "GP14"];
  const tail = ["GP13", "GP12", "GP11", "GP10", "GP9"];
  const right = ["GP8", "GP7", "GP6", "GP5", "GP4", "GP3", "GP2", "GP1", "GP0"];
  const yTop = yT + 8 * B.pitch;
  return [
    ...left.map((name, k): ZeroPad => ({ name, x: xL, y: yTop - k * B.pitch, edge: "L", num: k + 1 })),
    ...tail.map((name, k): ZeroPad => ({ name, x: xL + (k + 1) * B.pitch, y: yT, edge: "T", num: 10 + k })),
    ...right.map((name, k): ZeroPad => ({ name, x: xR, y: yT + k * B.pitch, edge: "R", num: 15 + k })),
  ];
}

/** The used pads in pad order, each with its net (layout.js lines 393 to 417); an unknown pad or a pad named twice is E_SCHEMA. */
export function usedPads(S: SeatParams): { pad: ZeroPad; net: string }[] {
  const pads = zeroPads(S);
  const byName = new Map(pads.map((p) => [p.name, p] as const));
  const seen = new Map<string, string>();
  for (const [net, pad] of Object.entries(S.nets)) {
    if (!byName.has(pad)) throw commandError({ code: "E_SCHEMA", path: `/params/nets/${net}`, got: pad, didYouMean: [...byName.keys()], expected: "an RP2040-Zero castellation", hint: `assign ${net} to one of the 23 castellations` });
    if (seen.has(pad)) throw commandError({ code: "E_SCHEMA", path: `/params/nets/${net}`, got: pad, expected: "each pad once", hint: `${pad} is assigned to both ${seen.get(pad) ?? ""} and ${net}; give one of them another pad` });
    seen.set(pad, net);
  }
  return pads.filter((p) => seen.has(p.name)).map((pad) => ({ pad, net: seen.get(pad.name) as string }));
}

export function seatZ(S: SeatParams, s: PipStack) {
  const socket = S.contact === "socket";
  const stand = socket ? S.pinLen + S.headerT : S.bumpH;
  const pocketNeed = s.z.floor + stand + S.T + S.usbH + S.clr;
  const need = Math.max(pocketNeed, s.z.floor + 1.44);
  const top = S.top > 0 ? S.top : snapUp(need, s.layer);
  const boardZ = s.z.floor + stand;
  const boardTop = boardZ + S.T;
  const recC = boardTop + S.usbH / 2;
  const notchW = 12.5;
  const notchZ0 = Math.max(s.z.pl[0] + s.layer, recC - 3.6);
  const notchTop = Math.min(top + S.bezel, Math.max(top, recC + 3.6));
  return { socket, stand, pocketNeed, need, top, boardZ, boardTop, recC, notchW, notchZ0, notchTop, pocketFloor: s.z.floor };
}

/** The board fits rows, model.js lines 586 to 604, press mode. */
export function seatFits(S: SeatParams, s: PipStack): FitRow[] {
  const { socket, stand, top, notchW, notchZ0, notchTop } = seatZ(S, s);
  const bl = s.bleed, lay = s.layer;
  const rows: FitRow[] = [fitRow("board", "pocket around the board", S.clr, mm(S.clr), S.clr >= 0.15, "each side")];
  if (!socket) {
    rows.push(
      fitRow("board", "bump height", S.bumpH, mm(S.bumpH), S.bumpH >= 0.24, "conductive PLA under each used pad"),
      fitRow("board", "bezel squeeze on the board", S.press, mm(S.press), S.press > 0 && S.press <= 0.5, "interference, the ribs hold it on the bumps"),
      fitRow("board", "bump to bump", S.pitch - S.bumpW - 0.2, mm(S.pitch - S.bumpW - 0.2), S.pitch - S.bumpW - 0.2 >= 0.6, "exposed, adjacent pads are different nets"),
    );
  }
  if (S.window && !socket) rows.push(fitRow("board", "clearance under the board", S.bumpH + 2 * lay, mm(S.bumpH + 2 * lay), true, "window recessed into the pocket floor"));
  rows.push(
    fitRow("board", "USB opening", notchW, `${mm(notchW)} wide`, notchW >= 11, "a plug overmould is usually 11 to 12 mm"),
    fitRow("board", "USB opening height", notchTop - notchZ0, mm(notchTop - notchZ0), notchTop - notchZ0 >= 7.0, `a USB C plug overmould is about 7 mm tall${notchTop > top + 1e-6 ? ", the opening carries on into the bezel" : ""}`),
  );
  if (socket) {
    const wall = (S.sockOD - bl - S.sockBore) / 2, apart = S.pitch - S.sockOD + bl;
    rows.push(
      fitRow("board", "socket bore", S.sockBore, mm(S.sockBore), S.sockBore >= 0.6 && S.sockBore <= 0.9, "a 0.64 mm square header pin; the print comes out about 0.1 small, which is the grip"),
      fitRow("board", "socket wall", wall, mm(wall), wall >= 0.45, "each socket stands proud of the floor like a cup"),
      fitRow("board", "socket to socket", apart, mm(apart), apart >= 0.6, "exposed, with a slot cut between neighbours"),
      fitRow("board", "pin length into the socket", S.pinLen, mm(S.pinLen), S.pinLen >= 2.0, "trim the header pins to this"),
      fitRow("board", "board sits above the floor", stand, mm(stand), true, `header spacer ${mm(S.headerT)} on top of the sockets`),
    );
  }
  if (S.datum) rows.push(fitRow("board", "datum corner", S.clr, mm(S.clr), true, "the far end and both sides are packed out there; the cable end keeps its clearance"));
  return rows;
}

export function seatDerive(S: SeatParams, profile: ProfileLookup, machine = "ffc5p"): Record<string, DerivedValue> {
  const s = pipStack(profile, machine, { body: "petg", trace: "cpla" });
  const zz = seatZ(S, s);
  const out: Record<string, DerivedValue> = {
    stand: dv(zz.stand, "mm", "bumpH, or pinLen + headerT for sockets", []),
    pocketNeed: dv(zz.pocketNeed, "mm", "floor + stand + T + usbH + clr", s.tiers),
    top: dv(zz.top, "mm", "snapUp(max(pocket need, floor + 1.44), layer) unless top is set", s.tiers),
    boardTop: dv(zz.boardTop, "mm", "floor + stand + T", s.tiers),
    usedPads: dv(usedPads(S).length, "count", "pads with a net", []),
  };
  for (const r of seatFits(S, s)) if (r.n !== null) out[`fits.${r.name}`] = dv(r.n, r.unit ?? "mm", `${r.group}: ${r.name}`, []);
  return out;
}

export function seatApply(input: ApplyIn<SeatParams>, id: string): ApplyOut {
  const S = input.params;
  const s = pipStack(input.profile, input.draft.machine, { body: "petg", trace: "cpla" });
  const f = frameOf(input.face, id);
  if (Math.abs(f.z - s.z.floor) > 1e-6) {
    throw commandError({ code: "E_SCHEMA", path: "/face/origin/2", got: f.z, expected: `the stack floor ${s.z.floor.toFixed(2)} mm`, hint: `place ${id} on the stack floor face, where the bumps stand` });
  }
  const zz = seatZ(S, s);
  if (zz.top < zz.need - 1e-9) {
    throw commandError({ code: "E_SCHEMA", path: "/params/top", got: zz.top, expected: `at least ${zz.need.toFixed(2)} mm`, hint: `raise the host top to ${snapUp(zz.need, s.layer).toFixed(2)} mm or leave top 0` });
  }
  const e = new Emit(f, s);
  const bl = s.bleed, lay = s.layer, floor = s.z.floor, top = zz.top;
  const hw = S.W / 2, hl = S.L / 2;
  const edge = hl + S.usbOver;
  const pk = { x0: -hw - S.clr, x1: hw + S.clr, y0: -hl - S.clr, y1: edge + 2 };
  const loc = locateFit(input.profile);
  // Pocket, back window and USB notch, cut down from the host top (model.js lines 189 to 198).
  e.pocket("pocket.board", rect(pk.x0, pk.y0, pk.x1, pk.y1), top, top - zz.pocketFloor, loc, S.clr);
  const used = usedPads(S);
  const pads = zeroPads(S);
  const rowX = hw - S.inset;
  if (S.window && !zz.socket) {
    const yT = Math.min(...pads.map((p) => p.y));
    e.pocket("pocket.window", rect(-rowX + 1.3, yT + 1.3, rowX - 1.3, hl - S.windowEnd), top, top - (floor - 2 * lay), loc, 0);
  }
  e.pocket("pocket.usb", rect(-zz.notchW / 2, hl - 0.3, zz.notchW / 2, edge + 6), top, top - zz.notchZ0, loc, 0);

  // Bumps or sockets on their nets, each over a routed terminal (model.js lines 199 to 210; layout.js line 414).
  for (const { pad, net } of used) {
    const at: Vec2 = [pad.x, pad.y];
    if (zz.socket) {
      const ro = (S.sockOD - bl) / 2;
      e.conductor(`conductor.socket${pad.name}`, net, circle(ro, at, 24), floor - EZ, floor + 0.72, 2 * ro);
      e.body(`socket${pad.name}`, "cpla", { route: "prism", outline: [place(f, circle(ro, at, 24)), place(f, [...circle(S.sockBore / 2, at, 16)].reverse())], z: [floor + 0.72, floor + S.pinLen] });
    } else {
      const r = (S.bumpW + 0.2 - bl) / 2;
      e.conductor(`conductor.bump${pad.name}`, net, circle(r, at, 24), floor - EZ, floor + S.bumpH, 2 * r);
    }
    e.terminal(pad.name, net, at, S.post);
    // The port is the net tap where the board pin lands: the catalog row's pin
    // centre, placed by the seat frame, on the contact face (the bump top the
    // board stands on, or the socket bore floor the header pin reaches).
    const pin = place(f, [boardPin(pad.name)])[0] as Vec2;
    const tap: PortTap = zz.socket
      ? { conductor: `conductor.socket${pad.name}`, at: [pin[0], pin[1], floor + 0.72], board: SEAT_BOARD.id, mcu: SEAT_BOARD.mcu, pin: pad.name, contact: "socket", pressMm: S.pinLen }
      : { conductor: `conductor.bump${pad.name}`, at: [pin[0], pin[1], zz.boardZ], board: SEAT_BOARD.id, mcu: SEAT_BOARD.mcu, pin: pad.name, contact: "bump", pressMm: S.press };
    e.feature({ kind: "port", id: `port.${pad.name}`, net, type: net === "GND" ? "gnd" : net === "3V3" || net === "5V" ? "power" : "signal", interface: "digital", tap });
  }

  // A slot between neighbouring used contacts on one edge (model.js lines 211 to 225).
  const usedNames = new Set(used.map((u) => u.pad.name));
  for (const side of ["L", "T", "R"] as const) {
    const list = pads.filter((p) => p.edge === side).sort((a, b) => a.num - b.num);
    for (let i = 0; i + 1 < list.length; i++) {
      const a1 = list[i] as ZeroPad, a2 = list[i + 1] as ZeroPad;
      if (!usedNames.has(a1.name) || !usedNames.has(a2.name)) continue;
      const mx = (a1.x + a2.x) / 2, my = (a1.y + a2.y) / 2;
      const along = side === "T";
      e.pocket(`pocket.slot${a1.name}`, rect(mx - (along ? 0.35 : 1.6), my - (along ? 1.6 : 0.35), mx + (along ? 0.35 : 1.6), my + (along ? 1.6 : 0.35)), floor + 0.1, 0.6, loc, 0);
    }
  }

  // Datum packers and the grip ledge, PETG added inside the pocket (model.js lines 228 to 238).
  if (S.datum) {
    const wallTop = Math.min(top - 0.3, zz.boardTop + 0.8);
    e.body("datum.far", "petg", e.prism(rect(-6, pk.y0 - EZ, 6, -hl), zz.pocketFloor - EZ, wallTop));
    e.body("datum.left", "petg", e.prism(rect(pk.x0 - EZ, -hl + 1.0, -hw, -hl + 6.0), zz.pocketFloor - EZ, wallTop));
    e.body("datum.right", "petg", e.prism(rect(hw, -hl + 1.0, pk.x1 + EZ, -hl + 6.0), zz.pocketFloor - EZ, wallTop));
  }
  if (S.grip && zz.boardTop + 1.2 < top - 0.2) {
    e.body("grip", "petg", e.prism(rect(-5, pk.y0 - EZ, 5, -hl + 1.2), zz.boardTop + 0.15, zz.boardTop + 1.15));
  }

  e.metric("host.top", top, "mm", "host top the seat was placed under: its pocket need snapped up a layer, or the top asked for", s.tiers);
  e.metric("seat.boardZ", zz.boardZ, "mm", "board underside above the bed", s.tiers);
  e.metric("seat.boardTop", zz.boardTop, "mm", "board top above the bed", s.tiers);
  e.metric("seat.cableEdge", edge, "mm", "host cable edge from the board centre along v: the USB end plus its overhang", []);
  const rows = seatFits(S, s);
  for (const r of rows) e.metrics.push(fitMetric("seat", r, []));
  e.warnings.push(...fitWarnings(rows));
  return e.out();
}
