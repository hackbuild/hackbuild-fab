// reference/keys/access-switch/jack.ts
// The jack seat (R1-flagship-access-switch-06): a PJ398SM 3.5 mm mono
// panel jack (catalog row connectors/pj398sm) set in the body's -y side
// wall, and the two cPLA leads that carry the key's nets to its legs.
//
// - Bore: the bushing passes the wall through BAFFLE R3's jack bore, a
//   circle cut as stacked three-layer prisms whose half chord follows the
//   circle (baffle-r3 model.js lines 593 to 596 and 635 to 639), jack.boreD
//   through jack.panelT of PETG. Deviation, named: above the axis the bore
//   runs straight up through the rim, a U open at the top, so the jack
//   drops in from above with its legs; BAFFLE's bore is a closed circle.
// - Pocket: the jack body (footprint F.Fab outline 9 x 10.45, jack.bodyDepth
//   deep along the axis) and the S lug, jack.clr each side except the
//   front face, which the nut pulls onto the wall.
// - Legs: the jack lies on its side, axis along -y, turned a quarter turn
//   about its axis from the KiCad top view (a turn, never a mirror) so the
//   three pads lie along x at the axis height. S and T each drop into a
//   cPLA socket post: a column from trace layer 1 up to a slot the pad
//   drill wide, jack.socketWall walls either side, jack.socketLen along
//   the leg (PIP's printed socket, layout.js line 39, model.js lines 204
//   to 205). TN stays unconnected in a plain PETG clearance slot.
// - Leads: one straight trace layer 1 lead per net, stack.traceWidth wide,
//   from the key's routed terminal post to the socket column, as
//   buttons/click-spring routes its leads.
// - R.leads: PIP's readout (model.js lines 453 to 460): per net the lead
//   length over rho along times the trace section, plus a post at each end
//   through the layers at rho through (the key's terminal post, hPost =
//   floor - l1 bottom, and the socket column). The sandbox cannot import
//   @hackbuild/profile sectionResistance, so rhoL / A is written once here
//   and the reference test holds it to sectionResistance.
//
// The build sandbox cannot read the catalog, so the pad table is copied
// from the row and the reference test holds it equal to the loaded row.

import { qualify, type Author, type FaceFrame, type Feature, type Metric, type Ring, type Tier, type Vec2 } from "@hackbuild/spec";

/** PJ398SM pads as packages/catalog loads them: part frame, KiCad y negated, mm (community, KiCad v5 footprint). */
export const PJ398SM_PADS: readonly { readonly name: "S" | "TN" | "T"; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly drill: number }[] = [
  { name: "TN", x: 0, y: -3.1, w: 2.13, h: 2.13, drill: 1.42 },
  { name: "S", x: 0, y: -0, w: 1.93, h: 1.83, drill: 1.22 },
  { name: "T", x: 0, y: -11.4, w: 2.13, h: 2.13, drill: 1.43 },
];

/** The footprint's F.Fab body outline and the plug circle centre, part frame, mm (pj398sm.kicad_mod lines 13 to 41). */
export const PJ398SM_BODY = { x: [-4.5, 4.5] as const, y: [-12.48, -2.03] as const, bushing: [0, -6.48] as const };

/** Profile constants the seat reads. */
export const JACK_IDS = ["jack.boreD", "jack.panelT", "jack.bodyDepth", "jack.clr", "jack.socketWall", "jack.socketLen"] as const;

const EZ = 0.02;
const up = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** A routed terminal of the key: its centre, net and post radius. */
export interface JackEnd { readonly at: Vec2; readonly net: string; readonly postR: number }

export interface JackIn {
  /** Body radius, mm; the jack sits in the wall at -y. */
  readonly R: number;
  /** Body top (host.top) and rim top, mm. */
  readonly top: number;
  readonly rimTop: number;
  /** Stack bands: trace layer 1 bottom, its thickness, the trace layer 2 top and the stack floor, mm. */
  readonly l1: number;
  readonly trace: number;
  readonly l2Top: number;
  readonly floor: number;
  /** Lead width, mm (stack.traceWidth). */
  readonly tw: number;
  /** The key's tip and sleeve ends: T takes the key net, S the common. */
  readonly T: JackEnd;
  readonly S: JackEnd;
}

export interface JackOut {
  readonly features: Feature[];
  readonly metrics: Metric[];
  /** Sum over both nets of the leads and their end posts, ohm (computed). */
  readonly rLeads: number;
  readonly rTiers: readonly Tier[];
}

/** World (x, z offset) of a part-frame point: a quarter turn about the axis, bushing at x 0, axis height 0. */
export const toWall = (p: readonly [number, number]): readonly [number, number] =>
  [-(p[1] - PJ398SM_BODY.bushing[1]), p[0] - PJ398SM_BODY.bushing[0]];

export function jackSeat(k: Author, o: JackIn): JackOut {
  const c = (id: (typeof JACK_IDS)[number] | "seat.socketPinMin") => k.profile.constant(id);
  const boreD = c("jack.boreD").value, panelT = c("jack.panelT").value, depth = c("jack.bodyDepth").value;
  const clr = c("jack.clr").value, wall = c("jack.socketWall").value, sockLen = c("jack.socketLen").value;
  const pinMin = c("seat.socketPinMin");
  const m = k.machine();
  const lay = m.layerHeight;
  const down = (z: number): number => { const u = m.layer(z); return u > z + 1e-9 ? u - lay : u; };
  const locate = k.fit("LOCATE");
  const pocket = (id: string, ring: Ring, face: number, floorZ: number, drawnPerSide: number, note: string): Feature =>
    ({ kind: "pocket", id, body: "body", outline: ring, face: up(face), depth: face - floorZ, floor: "flat", fit: { class: locate, drawnPerSide, basis: "perSide" }, note });

  // Heights: the jack body (part frame x span) rests on the pocket floor and
  // its top stays jack.clr under the body top, where the paddle skirt stops.
  const halfZ = (PJ398SM_BODY.x[1] - PJ398SM_BODY.x[0]) / 2;
  const zFloor = down(o.top - clr - 2 * halfZ);
  if (zFloor < o.l2Top + lay - 1e-9) {
    throw new Error(`jack pocket floor ${zFloor.toFixed(2)} mm cuts into trace layer 2 (top ${o.l2Top.toFixed(2)} mm); raise the body top`);
  }
  const zc = zFloor + halfZ;
  const yFront = -o.R + panelT;
  const yBack = yFront + depth;

  // The pocket spans the mapped body outline and the S pad, which sits
  // outside the body; it is cut from the rim top, inside the paddle bore.
  const xs = [
    ...[PJ398SM_BODY.y[0], PJ398SM_BODY.y[1]].map((y) => toWall([0, y])[0]),
    ...PJ398SM_PADS.flatMap((p) => [toWall([p.x, p.y - p.h / 2])[0], toWall([p.x, p.y + p.h / 2])[0]]),
  ];
  const features: Feature[] = [
    pocket("pocket.jack", rect(Math.min(...xs) - clr, yFront, Math.max(...xs) + clr, yBack + clr), o.rimTop, zFloor, clr,
      "PJ398SM body and S lug, jack.bodyDepth deep along the axis; the nut pulls the front face onto the wall (computed)"),
  ];

  // The bore: BAFFLE R3's stacked three-layer prisms under the axis, half
  // chord at each step's middle, then straight up to the rim top.
  const r = boreD / 2;
  const yOut = -o.R - 1;
  const zTop = m.layer(zc);
  let i = 0;
  for (let z = down(zc - r); z < zTop - 1e-6; z += 3 * lay) {
    const z1 = Math.min(z + 3 * lay, zTop);
    const dz = Math.abs((z + z1) / 2 - zc);
    const half = dz >= r ? 0 : Math.sqrt(r * r - dz * dz);
    if (half > 0.2) features.push(pocket(`pocket.jackBore${i++}`, rect(-half, yOut, half, yFront + EZ), z1, z, 0, "jack bore step, half chord at the step middle (computed)"));
  }
  features.push(pocket("pocket.jackBoreU", rect(-r, yOut, r, yFront + EZ), o.rimTop, zTop, 0, "jack bore above the axis, open up through the rim so the jack drops in (computed)"));

  // Legs: S and T into cPLA sockets, TN into a PETG clearance slot.
  const y0 = yBack + clr, y1 = y0 + sockLen;
  const rhoAlong = k.profile.resistivity("cpla", "along", "printed");
  const rhoZ = k.profile.resistivity("cpla", "through", "printed");
  const lo = (v: number | readonly [number, number]): number => (typeof v === "number" ? v : v[0]);
  /** R = rho L / A, ohm from ohm cm, mm and mm2: spec/profile.ts SectionResistance, held equal to it by the reference test. */
  const ohm = (ohmCm: number | readonly [number, number], lengthMm: number, areaMm2: number): number => (lo(ohmCm) * 10 * lengthMm) / areaMm2;
  let rLeads = 0;
  for (const pad of PJ398SM_PADS) {
    const [cx] = toWall([pad.x, pad.y]);
    const hs = pad.drill / 2;
    const zSlot = down(zc - hs);
    if (pad.name === "TN") {
      features.push(pocket("pocket.legTN", rect(cx - hs - clr, yBack, cx + hs + clr, y1), o.top, zSlot, clr, "TN leg, unconnected, in a PETG clearance slot (computed)"));
      continue;
    }
    const end = pad.name === "T" ? o.T : o.S;
    const tag = pad.name;
    const zWall = m.layer(zc + hs);
    const ow = hs + wall;
    features.push(
      pocket(`pocket.leg${tag}`, rect(cx - hs, yBack, cx + hs, y1), o.top, zSlot, 0, `${tag} leg slot, the pad drill wide (computed)`),
      { kind: "conductor", id: `conductor.socket${tag}`, body: "body", material: "cpla", net: end.net, region: { path: rect(cx - ow, y0, cx + ow, y1), face: up(o.l1) }, width: 2 * ow, t: zSlot - o.l1,
        note: `${tag} socket column from trace layer 1 to the slot floor (computed)` },
      { kind: "conductor", id: `conductor.socket${tag}WallA`, body: "body", material: "cpla", net: end.net, region: { path: rect(cx - ow, y0, cx - hs, y1), face: up(zSlot) }, width: wall, t: zWall - zSlot,
        note: `${tag} socket wall on -x (computed)` },
      { kind: "conductor", id: `conductor.socket${tag}WallB`, body: "body", material: "cpla", net: end.net, region: { path: rect(cx + hs, y0, cx + ow, y1), face: up(zSlot) }, width: wall, t: zWall - zSlot,
        note: `${tag} socket wall on +x (computed)` },
    );
    const sock: Vec2 = [cx, (y0 + y1) / 2];
    features.push({ kind: "conductor", id: `conductor.lead${tag}`, body: "body", material: "cpla", net: end.net, region: { centreline: [end.at, sock], face: up(o.l1) }, width: o.tw, t: o.trace,
      note: `lead from the key's ${end.net} post to the ${tag} socket (computed)` });
    const len = Math.hypot(sock[0] - end.at[0], sock[1] - end.at[1]);
    rLeads += ohm(rhoAlong.ohmCm, len, o.tw * o.trace)
      + ohm(rhoZ.ohmCm, o.floor - o.l1, Math.PI * end.postR * end.postR)
      + ohm(rhoZ.ohmCm, zSlot - o.l1, 2 * ow * sockLen);
  }

  const rTiers = [rhoAlong.provenance.tier, rhoZ.provenance.tier];
  const tierOf = (id: (typeof JACK_IDS)[number]) => c(id).provenance.tier;
  const metric = (id: string, value: number, unit: string, note: string, tiers: readonly (Tier | null)[]): Metric =>
    ({ id, value: Number(value.toFixed(3)), unit, ...qualify(tiers), note, gate: "informational", group: "jack" });
  if (sockLen < pinMin.value) k.warn("FIT", `jack leg depth ${sockLen.toFixed(2)} mm is under the ${pinMin.value.toFixed(2)} mm a printed socket needs (computed)`);
  const metrics: Metric[] = [
    metric("jack.legDepth", sockLen, "mm", `leg length in each socket, against seat.socketPinMin ${pinMin.value.toFixed(1)} mm; the PJ398SM leg length is unknown, so this holds only for a leg at least this long past the body`, [tierOf("jack.socketLen"), pinMin.provenance.tier]),
    metric("jack.axisZ", zc, "mm", "jack axis above the bed: the pocket floor plus half the body", [tierOf("jack.clr")]),
    metric("jack.wall", panelT, "mm", "PETG the nut clamps at the bore, on the axis; the body is round, so the wall is thinner off the axis", [tierOf("jack.panelT")]),
    metric("R.leads", rLeads, "ohm", "both nets: lead along trace layer 1, the key's terminal post and the socket column through the layers (PIP model.js lines 453 to 460)", rTiers),
  ];
  return { features, metrics, rLeads, rTiers };
}
