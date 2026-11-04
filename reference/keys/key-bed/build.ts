// reference/keys/key-bed/build.ts
// A row of `count` flex cone keys below a Raspberry Pi Pico press seat, one
// PETG body with PIP's buried stack (profile stack rows), as midi-pad lays
// its four keys beside an RP2040-Zero seat.
//
// The seat sits USB toward -x (u = +y, so the seat's +y is -x here), so the
// Pico's left column is a row of castellations along x at the pocket's -y
// side, GPIO0 leftmost. Key k (net Kk+1) reads on GPIO k. The keys stand in a
// row along x below the seat, starting a wall past the cable edge.
//
// Signals run on trace layer 1. Each leaves its seat post straight down (-y)
// to a lane, runs along it to its key, and drops to the key's post. Keys left
// of their pad (the first ones) fan left and the rest fan right; within the
// left group the leftmost pad takes the shallowest lane, within the right
// group the rightmost, so no lane runs across another signal's drop (each
// group is a prefix or a suffix, since key pitch exceeds pad pitch). Key
// commons run on layer 2 to a bus between the lanes and the keys, and the
// bus to the seat's GND post. Each drop onto a bus ends a quarter width past
// its centreline on the side it comes from, as midi-pad's do, so its round end crosses the
// centreline and stays inside the bus. Author.arch
// passes each archetype's warnings on, so this file does not repeat them.
//
// A chase cannot list one hookup entry per key of a count, so this file
// emits them (PartDraft.hookup), one charge-release read per key with PIP's
// 3500 us wait until a coupon calibrates it (D-079, waitSource default).

import { defineBuild, qualify, type ApplyOut, type Assertion, type FaceFrame, type Feature, type HookupDecl, type Metric, type Ring, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

const SEAT = "pico-seat";
const KEY = "flex-cone-key";
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

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const skin = c("stack.skin"), trace = c("stack.trace"), iso = c("stack.iso"), overL2 = c("stack.overL2"), w = c("stack.traceWidth");
  const floor = skin + trace + iso + trace + overL2;
  const l1 = skin, l2 = skin + trace + iso;
  const n = p.count;

  // Seat: GND and one GPIO per key.
  const nets: Record<string, string> = { GND: "GND" };
  for (let i = 0; i < n; i++) nets[`K${i + 1}`] = `GPIO${i}`;
  const seat = k.arch(SEAT, { origin: [0, 0, floor], normal: [0, 0, 1], u: [0, 1, 0] }, { nets });
  const top = metricOf(seat, `${SEAT}.0.host.top`);
  const cableX = -metricOf(seat, `${SEAT}.0.seat.cableEdge`);
  const post = (name: string): Vec2 => mid(boxOf(ringOf(seat, `${SEAT}.0.conductor.post${name}`)));
  const pocket = boxOf(ringOf(seat, `${SEAT}.0.pocket.board`));
  const g = post("GND");
  const postBox = boxOf(ringOf(seat, `${SEAT}.0.conductor.postGND`));
  // A lead meets a seat post half a post radius off its centre, toward the lead: ended on the centre, its round end
  // meets the post and its layer discs nearly tangent, and the union leaves slivers there.
  const off = (postBox.x1 - postBox.x0) / 4;
  // GND is pad 3 and GPIO0 pad 1 of one column: two castellation pitches apart.
  const pitchC = Math.abs(g[0] - post("GPIO0")[0]) / 2;

  // Key positions and the lanes they need, from the key's well radius before any key is placed.
  const wellR = k.archDerive(KEY, { top })["wellR"]?.value;
  if (typeof wellR !== "number") throw new Error(`${KEY} derives no wellR`);
  const xs = Array.from({ length: n }, (_, i) => cableX + p.wall + wellR + i * p.pitch);
  const sx = Array.from({ length: n }, (_, i) => post(`GPIO${i}`)[0]);
  const left = xs.filter((x, i) => x <= sx[i]!).length;
  const lane = (i: number): number => (i < left ? i : n - 1 - i);
  const lanes = Math.max(left, n - left);
  const yStart = pocket.y0 - pitchC;
  const laneY = (i: number): number => yStart - lane(i) * pitchC;
  const busY = yStart - lanes * pitchC;
  const ky = busY - pitchC - wellR;

  const keys: ApplyOut[] = xs.map((x, i) => {
    // Turned half a turn (u = -x), so the key's common post stands right of its centre and its signal post left.
    const out = k.arch(KEY, { origin: [x, ky, floor], normal: [0, 0, 1], u: [-1, 0, 0] }, { top, net: `K${i + 1}`, common: "GND" });
    const need = metricOf(out, `${KEY}.${i}.host.top`);
    if (need > top + 1e-6) k.warn("TOP", `key ${i + 1} asks for a body top of ${need.toFixed(2)} mm, the seat sets ${top.toFixed(2)}`);
    return out;
  });

  const leads: Feature[] = [];
  const ln = (id: string, net: string, pts: readonly Vec2[], z: number): Feature =>
    ({ kind: "conductor", id, body: "body", material: "cpla", net, region: { centreline: pts, face: at(z) }, width: w, t: trace });

  // Signals on layer 1: down from the seat post to the lane, along it, down to the key post.
  keys.forEach((o, i) => {
    const s = post(`GPIO${i}`), kp = mid(boxOf(ringOf(o, `${KEY}.${i}.conductor.post`)));
    const y = laneY(i);
    leads.push(ln(`conductor.sig${i + 1}`, `K${i + 1}`, [[s[0], s[1] - off], [s[0], y], [kp[0], y], kp], l1));
  });

  // Commons on layer 2: each up to the bus, the bus along the row to the GND post's x, then up to the post.
  const commons = keys.map((o, i) => mid(boxOf(ringOf(o, `${KEY}.${i}.conductor.postCommon`))));
  commons.forEach((cp, i) => leads.push(ln(`conductor.com${i + 1}`, "GND", [cp, [cp[0], busY - w / 4]], l2)));
  // As midi-pad's: one polyline from the far common along the bus to the GND post's x and up to the post. Every common
  // is right of the post (the keys are turned, below), so the bus has no run past it.
  const far = Math.max(...commons.map((q) => q[0]));
  if (Math.min(...commons.map((q) => q[0])) <= g[0] + w) throw new Error("a key common lies at or left of the seat's GND post; the bus cannot reach it");
  leads.push(ln("conductor.gndBus", "GND", [[far, busY], [g[0], busY], [g[0], g[1] - off]], l2));

  const lastWell = boxOf(ringOf(keys[n - 1] as ApplyOut, `${KEY}.${n - 1}.pocket.well`));
  const xr = Math.max(lastWell.x1 + p.wall, pocket.x1 + p.wall);
  const yb = ky - wellR - p.wall, yt = pocket.y1 + p.wall;
  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [[[cableX, yb], [xr, yb], [xr, yt], [cableX, yt]]], z: [0, top] } });

  const metric = (id: string, value: number, note: string, group = "layout"): Metric =>
    ({ id, value: Number(value.toFixed(3)), unit: "mm", ...qualify([]), note, gate: "informational", group });
  const metrics: Metric[] = [
    ...(seat.metrics ?? []), ...keys.flatMap((o) => o.metrics ?? []),
    metric("layout.width", xr - cableX, "body, cable edge to the far wall"),
    metric("layout.depth", yt - yb, "body, key row edge to the far wall"),
    metric("layout.top", top, "body top, the seat's pocket need"),
    metric("layout.lanes", lanes, "signal lanes between the seat and the keys", "layout"),
    ...keys.map((o, i) => metric(`keys.${i + 1}.travel`, metricOf(o, `${KEY}.${i}.key.travel`), `key ${i + 1}: the gap its cap closes before the pin reads`, "keys")),
  ];

  const keyNets = keys.map((_, i) => `K${i + 1}`);
  const assertions: Assertion[] = [
    { type: "apart", nets: ["GND", ...keyNets] },
    ...keyNets.map((net, i): Assertion => ({ type: "apartExcept", nets: [net, "GND"], cut: `${KEY}.${i}.cap` })),
  ];
  const hookup: HookupDecl[] = keys.map((_, i) => ({
    port: `${KEY}.${i}.port.key`, mcu: "pico", pin: `GPIO${i}`,
    read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" },
  }));

  return k.part({
    id: "bed", name: "KEY BED", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body, ...seat.bodies, ...keys.flatMap((o) => o.bodies)],
    features: [...seat.features, ...keys.flatMap((o) => o.features), ...leads],
    metrics, assertions, hookup,
  });
});
