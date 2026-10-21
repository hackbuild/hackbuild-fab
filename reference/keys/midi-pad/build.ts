// reference/keys/midi-pad/build.ts
// The MIDI pad layout. Every solid comes from an archetype through
// Author.arch; this file places them and lays the buried leads between
// them. Conditionals and loops live here (D-178).
//
// Placement, top view:
// - the RP2040-Zero seat sits on the stack floor with its USB end toward
//   -x, so its left castellation row (5V, GND, 3V3, GP29 to GP26) faces
//   the fader below and its right row (GP0 to GP8) faces up; the body's
//   -x edge stands at the seat's cable edge, as reference
//   seats/rp2040-zero-pressfit places its +y edge;
// - four flex cone keys in a row to the right of the board pocket, at the
//   pocket's centre line, one pitch apart, half a pitch past the pocket;
// - the THINPOT fader on the bed below the body, its base abutting the
//   body's bottom edge, its terminals at the -x end and its membrane and
//   collector strip posed below the base, where the original poses them.
//
// Leads, on the PIP buried stack (profile stack rows, reference
// electrical/pip-buried-route): key signals on trace layer 1 from GP8,
// GP7, GP6 and GP5 up into nested lanes one castellation pitch apart and
// down onto each key's routed signal post; the key commons on trace layer
// 2 into a bus one pitch under the key centres, under the board to the
// seat's GND post. The fader's three leads run on trace layer 1 straight
// down from GND, 3V3 and GP26 into the fader base and onto a post under
// each terminal pad: 3V3 to T1, GP26 to T2 (the collector), GND to T3.
// The posts sit in one column between the 3V3 and GP26 leads, so the GND
// lead passes the T1 and T2 posts on the far side and no lead crosses
// another.
//
// Every net ends at the seat: the seat's ports tap its bumps (K-04), so no
// lead runs to the body edge only to give the solve a terminal, and the
// fader leads are hosted in the fader base itself.
//
// The fader base thickness is set to the trace layer 2 bottom (skin +
// trace + iso), so a layer 1 lead under a terminal pad of another net has
// the stack's isolation over it. The original's default base is 2 mm.
//
// The THINPOT archetype emits bodies and readouts only, no terminal
// features (G5), so this file reads the terminal pads from the track body
// (the three prisms with a wire hole) and shifts the fader's bodies to the
// place the seat's posts ask for, since Author has no move for an applied
// archetype.

import { defineBuild, qualify, type ApplyOut, type Assertion, type BodyDraft, type ContactFn, type FaceFrame, type Feature, type Metric, type Ring, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

const SEAT = "rp2040-zero-seat";
const KEY = "flex-cone-key";
const POT = "membrane-slider-thinpot";
const at = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });

interface Box { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }
const boxOf = (pts: readonly Vec2[]): Box => {
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const mid = (b: Box): Vec2 => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];

const ringOf = (out: ApplyOut, id: string): Ring => {
  const f = out.features.find((x) => x.id === id);
  if (f !== undefined && f.kind === "conductor" && "path" in f.region) return f.region.path;
  if (f !== undefined && f.kind === "pocket") return f.outline;
  throw new Error(`no ring on ${id}`);
};
const metricOf = (out: ApplyOut, id: string): number => {
  const v = out.metrics?.find((m) => m.id === id)?.value;
  if (typeof v !== "number") throw new Error(`no metric ${id}`);
  return v;
};

// The prisms of a declared shape, depth first.
const prismsOf = (d: ShapeDecl): Extract<ShapeDecl, { route: "prism" }>[] => {
  if (d.route === "prism") return [d];
  if (d.route === "csg") return d.of.flatMap(prismsOf);
  throw new Error(`no prisms in a ${d.route} shape`);
};
const shift = (d: ShapeDecl, dx: number, dy: number): ShapeDecl => {
  if (d.route === "prism") return { ...d, outline: d.outline.map((r) => r.map(([x, y]): Vec2 => [x + dx, y + dy])) };
  if (d.route === "csg") return { ...d, of: d.of.map((s) => shift(s, dx, dy)) };
  throw new Error(`cannot shift a ${d.route} shape`);
};

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const skin = c("stack.skin"), trace = c("stack.trace"), iso = c("stack.iso"), overL2 = c("stack.overL2"), w = c("stack.traceWidth");
  const floor = skin + trace + iso + trace + overL2;
  const l1 = skin, l2 = skin + trace + iso;

  // Seat: USB toward -x (u = +y, so the seat's +y is -x here).
  const nets: Record<string, string> = { GND: "GND", "3V3": "3V3", W: "GP26", K1: "GP8", K2: "GP7", K3: "GP6", K4: "GP5" };
  const seat = k.arch(SEAT, { origin: [0, 0, floor], normal: [0, 0, 1], u: [0, 1, 0] }, { nets });
  const top = metricOf(seat, `${SEAT}.0.host.top`);
  const cableX = -metricOf(seat, `${SEAT}.0.seat.cableEdge`);
  const post = (name: string): Vec2 => mid(boxOf(ringOf(seat, `${SEAT}.0.conductor.post${name}`)));
  const postBox = boxOf(ringOf(seat, `${SEAT}.0.conductor.postGND`));
  const postR = (postBox.x1 - postBox.x0) / 2;
  const pocket = boxOf(ringOf(seat, `${SEAT}.0.pocket.board`));
  const g = post("GND"), v = post("3V3"), wp = post("GP26");
  const pitchC = Math.abs(v[0] - g[0]);

  // Keys, in a row right of the pocket on its centre line.
  const ky = (pocket.y0 + pocket.y1) / 2;
  const keys: ApplyOut[] = [];
  for (let i = 0; i < 4; i++) {
    const kx = pocket.x1 + p.wall + p.pitch / 2 + i * p.pitch;
    const out = k.arch(KEY, { origin: [kx, ky, floor], normal: [0, 0, 1], u: [1, 0, 0] }, { top, net: `K${i + 1}`, common: "GND" });
    const need = metricOf(out, `${KEY}.${i}.host.top`);
    if (need > top + 1e-6) k.warn("TOP", `key ${i + 1} asks for a body top of ${need.toFixed(2)} mm, the seat sets ${top.toFixed(2)}`);
    keys.push(out);
  }
  const lastWell = boxOf(ringOf(keys[3] as ApplyOut, `${KEY}.3.pocket.well`));
  const firstWell = boxOf(ringOf(keys[0] as ApplyOut, `${KEY}.0.pocket.well`));
  if (firstWell.x0 < pocket.x1 + p.wall) k.warn("KEY_POCKET", `key 1 well starts ${(firstWell.x0 - pocket.x1).toFixed(2)} mm past the board pocket, wall ${p.wall}`);

  const leads: Feature[] = [];
  const ln = (id: string, net: string, pts: readonly Vec2[], z: number, body = "body", width = w): Feature =>
    ({ kind: "conductor", id, body, material: "cpla", net, region: { centreline: pts, face: at(z) }, width, t: trace });

  // Key signals on layer 1, nested lanes above the seat's top row.
  const topRowY = post("GP8")[1];
  for (let i = 0; i < 4; i++) {
    const s = post(`GP${8 - i}`);
    const kp = mid(boxOf(ringOf(keys[i] as ApplyOut, `${KEY}.${i}.conductor.post`)));
    const lane = topRowY + (i + 1) * pitchC;
    leads.push(ln(`conductor.sig${i + 1}`, `K${i + 1}`, [s, [s[0], lane], [kp[0], lane], kp], l1));
  }
  const laneTop = topRowY + 4 * pitchC;
  const yt = laneTop + w / 2 + p.wall;

  // Key commons on layer 2: a bus one pitch under the key centres, under the board to GND.
  const busY = ky - pitchC;
  const commons = keys.map((o, i) => mid(boxOf(ringOf(o, `${KEY}.${i}.conductor.postCommon`))));
  // Each drop ends a quarter width past the bus centreline: ended on it, the
  // drop's round end meets the bus edge at a tangent and the bus mesh opens.
  commons.forEach((cp, i) => leads.push(ln(`conductor.com${i + 1}`, "GND", [cp, [cp[0], busY + w / 4]], l2)));
  const lastCommon = commons[3] as Vec2;
  leads.push(ln("conductor.gndBus", "GND", [[lastCommon[0], busY], [g[0], busY], g], l2));

  // Fader: place at the origin, read its plate and terminal pads, shift it under the body.
  const raw = k.arch(POT, { origin: [0, 0, 0], normal: [0, 0, 1], u: [0, -1, 0] }, { len: p.len, baseT: l2 });
  const baseId = `${POT}.0.base`, trackId = `${POT}.0.track`;
  const bodyOf = (id: string): BodyDraft => {
    const b = raw.bodies.find((x) => x.id === id);
    if (b === undefined) throw new Error(`${POT} built no ${id}`);
    return b;
  };
  const plate = boxOf((prismsOf(bodyOf(baseId).base)[0]?.outline[0] ?? []) as Vec2[]);
  const pads = prismsOf(bodyOf(trackId).base).filter((q) => q.outline.length === 2).map((q) => boxOf(q.outline[0] as Vec2[]));
  if (pads.length !== 3) throw new Error(`${POT} track shows ${pads.length} terminal pads, expected 3`);
  pads.sort((a, b) => b.y1 - a.y1);
  const [t1, t2, t3] = pads as [Box, Box, Box];
  // Each terminal post sits a quarter of the pad length in from its inner end, clear of the wire hole.
  const postX0 = t1.x1 - (t1.x1 - t1.x0) / 4;
  const xp = v[0] + pitchC / 2;
  const yb = pocket.y0 - p.wall;
  const dx = xp - postX0, dy = yb - plate.y1;
  const potBodies: BodyDraft[] = raw.bodies.map((b) => ({ ...b, base: shift(b.base, dx, dy) }));
  const ty = (b: Box): number => (b.y0 + b.y1) / 2 + dy;
  const T1: Vec2 = [xp, ty(t1)], T2: Vec2 = [xp, ty(t2)], T3: Vec2 = [xp, ty(t3)];

  const fader: [string, string, Vec2, Vec2, string][] = [["3V3", "3V3", v, T1, "t1"], ["W", "W", wp, T2, "t2"], ["GND", "GND", g, T3, "t3"]];
  // The wiper lead takes its own width (constraints.query, chase.ts); 3V3 and GND keep the stack width, held by the castellation pitch.
  for (const [net, tag, from, to, t] of fader) {
    const lw = net === "W" ? p.wW : w;
    const a = ln(`conductor.fader${tag}`, net, [from, [from[0], yb]], l1, "body", lw);
    const b = ln(`conductor.fader${tag}Base`, net, [[from[0], yb], [from[0], to[1]], to], l1, baseId, lw);
    leads.push(...(net === "W" ? [k.bind(a, { width: "/wW" }), k.bind(b, { width: "/wW" })] : [a, b]));
    leads.push({ kind: "conductor", id: `conductor.${t}post`, body: baseId, material: "cpla", net,
      region: { path: k.ring.circle(postR, to, 24), face: at(l1) }, width: 2 * postR, t: l2 - l1 });
  }

  const xr = Math.max(lastWell.x1 + p.wall, plate.x1 + dx);
  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [[[cableX, yb], [xr, yb], [xr, yt], [cableX, yt]]], z: [0, top] } });

  const metric = (id: string, value: number, note: string, group = "layout"): Metric =>
    ({ id, value: Number(value.toFixed(3)), unit: "mm", ...qualify([]), note, gate: "informational", group });
  const metrics: Metric[] = [
    ...(seat.metrics ?? []), ...keys.flatMap((o) => o.metrics ?? []), ...(raw.metrics ?? []),
    metric("layout.width", xr - cableX, "body, cable edge to the far wall"),
    metric("layout.depth", yt - yb, "body, fader edge to the far wall"),
    metric("layout.faderOverhang", cableX - (plate.x0 + dx), "fader base past the cable edge"),
    metric("layout.top", top, "body top, the seat's pocket need"),
    // The drive pad's targets (bench.ts drive, metrics.keys): key n's travel, read from its archetype.
    ...keys.map((o, i) => metric(`keys.${i + 1}.travel`, metricOf(o, `${KEY}.${i}.key.travel`), `key ${i + 1}: the gap its cap closes before the pin reads`, "keys")),
  ];

  const keyNets = ["K1", "K2", "K3", "K4"];
  const assertions: Assertion[] = [
    { type: "apart", nets: ["GND", "W", ...keyNets] },
    { type: "apart", nets: ["3V3", "W", ...keyNets] },
    // The fader track joins its two ends; cut it and they fall apart.
    { type: "apartExcept", nets: ["3V3", "GND"], cut: trackId },
    ...keyNets.map((n, i): Assertion => ({ type: "apartExcept", nets: [n, "GND"], cut: `${KEY}.${i}.cap` })),
  ];

  return k.part({
    id: "pad", name: "MIDI PAD", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body, ...seat.bodies, ...keys.flatMap((o) => o.bodies), ...potBodies],
    features: [...seat.features, ...keys.flatMap((o) => o.features), ...leads],
    metrics, assertions,
  });
});

// The drive pad's contact function: a held key closes its contact once it
// travels its gap. One function for the pad, the 3D pose, the readout and
// BENCH.drive (G-20). Target n is key n, archetype instance n - 1.
export const contact: ContactFn = (metrics, target, stimulus) => {
  const travel = metrics.find((m) => m.id === `keys.${target}.travel`);
  const held = stimulus === true;
  return {
    closed: held && travel ? [`${KEY}.${Number(target) - 1}.contact.key`] : [],
    pose: { travelMm: held && typeof travel?.value === "number" ? travel.value : 0 },
  };
};
