// designs/toggle/build.ts
// The TOGGLE layout, as the original's T.build orders it
// (originals/toggle/files/src/src/part2d.js lines 417 to 453): the host
// plan (layoutXY lines 60 to 114, toggleHost), the route search over it
// (routeAll, packages/copper routeSearch), the floor stack at the layer
// count the route settled on, then the bodies of the slab plan (features,
// lines 263 to 326). Conductors are the kernel's regions where the original
// paints a 0.1 mm raster (toggle.md 5.12). Conditionals and loops live here
// (D-178).
//
// The stick, collar, pads, ring, COM column and the well, roof, gate and
// lathe keep-outs come from the tilt-stick archetype at the route's layer
// count, COM gap and lead angles. This file adds:
// - the host body: the square or round outline (round with the low tab
//   under a pin row that pokes out, line 273) up to the solved body top,
//   or on BLOCKS the footprint up to the ledge top and the brick block up
//   to the body top;
// - solo header or wire terminals: a conductive PLA cup from the bed up
//   to the cup top with the pin bore open at the bottom (lines 305 to
//   307); the bore is a hole in the host's lowest band and a hole in the
//   cup, since a conductor region is one ring without a hole; pads are a
//   flush disc up to the top trace layer;
// - BLOCKS positions (lines 313 to 324): socket rings in conductive TPU on
//   used nets and TPU on plain ones, the socket bore as a host hole, a
//   conductive flange and post under a used position, a ledge stud,
//   conductive on a used position;
// - the routed leads on their trace layers and each via as a square in the
//   separation layer (lines 293 to 299). A lead that ends in a bored cup
//   stops at the cup's outer edge: the original paints the bore over the
//   lead end (order 9), a centreline conductor cannot carry the bore.

import { commandError, defineBuild, qualify, type BodyDraft, type FaceFrame, type Feature, type Metric, type Ring, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { TOGGLE_BLOCKS, TOGGLE_NAMES, routeSearch, toggleHost, toggleParams } from "@hackbuild/kernel/author";
import { STICK } from "./contact";
import { chase } from "./chase";

const BED: FaceFrame = { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] };
const at = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });
/** Facets of a terminal or stud circle (the archetype's wall polygon uses 96 on a radius near 5 mm). */
const SEG = 48;

const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const prism = (outline: readonly Ring[], z0: number, z1: number): ShapeDecl => ({ route: "prism", outline, z: [z0, z1] });
const holeOf = (r: Ring): Ring => [...r].reverse();

/** The polyline cut where it last enters the circle of radius d about c, from the far end; null when it never leaves it. */
function stopAt(pts: readonly Vec2[], c: Vec2, d: number): Vec2[] | null {
  const dist = (q: Vec2): number => Math.hypot(q[0] - c[0], q[1] - c[1]);
  for (let i = pts.length - 1; i > 0; i--) {
    const a = pts[i - 1] as Vec2, b = pts[i] as Vec2;
    if (dist(a) < d) continue;
    // a is outside, b inside: the crossing on segment a to b
    const dx = b[0] - a[0], dy = b[1] - a[1], fx = a[0] - c[0], fy = a[1] - c[1];
    const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - d * d;
    const t = (-B - Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
    const q: Vec2 = [a[0] + t * dx, a[1] + t * dy];
    return [...pts.slice(0, i), q].filter((p, j, all) => j === 0 || Math.hypot(p[0] - (all[j - 1] as Vec2)[0], p[1] - (all[j - 1] as Vec2)[1]) > 1e-9);
  }
  return null;
}

/**
 * One routed run as one ring: the original's traceRects (part2c.js lines
 * 207 to 220), a rectangle per segment grown by half the trace width on
 * every side, and their union, which the original gets by painting them
 * into one raster. The union is traced on the grid of the rectangles'
 * edges, counter clockwise, collinear points dropped.
 */
function traceOutline(pts: readonly Vec2[], h: number): Ring {
  const rects = pts.length === 1
    ? [[(pts[0] as Vec2)[0] - h, (pts[0] as Vec2)[1] - h, (pts[0] as Vec2)[0] + h, (pts[0] as Vec2)[1] + h]]
    : pts.slice(1).map((b, k) => { const a = pts[k] as Vec2; return [Math.min(a[0], b[0]) - h, Math.min(a[1], b[1]) - h, Math.max(a[0], b[0]) + h, Math.max(a[1], b[1]) + h]; });
  const uniq = (v: number[]): number[] => [...new Set(v.map((x) => Number(x.toFixed(9))))].sort((a, b) => a - b);
  const xs = uniq(rects.flatMap((q) => [q[0] as number, q[2] as number])), ys = uniq(rects.flatMap((q) => [q[1] as number, q[3] as number]));
  const on = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
    const cx = ((xs[i] as number) + (xs[i + 1] as number)) / 2, cy = ((ys[j] as number) + (ys[j + 1] as number)) / 2;
    return rects.some((q) => cx > (q[0] as number) && cx < (q[2] as number) && cy > (q[1] as number) && cy < (q[3] as number));
  };
  // directed boundary edges, covered cell on the left
  const next = new Map<string, [number, number]>();
  const key = (i: number, j: number): string => `${i},${j}`;
  const edge = (a: [number, number], b: [number, number]): void => {
    if (next.has(key(...a))) throw commandError({ code: "E_KERNEL", path: "/route", got: "a pinched trace", expected: "one ring per routed run", hint: "set trace layers to 2; this route touches itself at a corner" });
    next.set(key(...a), b);
  };
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      if (!on(i, j)) continue;
      if (!on(i, j - 1)) edge([i, j], [i + 1, j]);
      if (!on(i + 1, j)) edge([i + 1, j], [i + 1, j + 1]);
      if (!on(i, j + 1)) edge([i + 1, j + 1], [i, j + 1]);
      if (!on(i - 1, j)) edge([i, j + 1], [i, j]);
    }
  }
  const [start] = next.keys();
  if (start === undefined) throw new Error("a routed run with no copper");
  const loop: [number, number][] = [];
  let cur = start;
  do {
    const [i, j] = cur.split(",").map(Number) as [number, number];
    loop.push([i, j]);
    const n = next.get(cur) as [number, number];
    next.delete(cur);
    cur = key(...n);
  } while (cur !== start);
  if (next.size > 0) throw commandError({ code: "E_KERNEL", path: "/route", got: "a trace with a hole", expected: "one ring per routed run", hint: "set trace layers to 2; this route closes on itself" });
  const ring = loop.filter((p, k) => {
    const a = loop[(k + loop.length - 1) % loop.length] as [number, number], b = loop[(k + 1) % loop.length] as [number, number];
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
  });
  return ring.map(([i, j]): Vec2 => [xs[i] as number, ys[j] as number]);
}

/**
 * The round outline joined with the tab under its pin row (part2d.js
 * lines 70 to 77): the circle from where it meets the tab's right side,
 * over the top, to where it meets the left side, then down the tab and
 * along its bottom. The tab hangs below the circle and its sides cut it.
 */
function roundWithTab(circle: Ring, R: number, tab: { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }): Ring {
  if (!(tab.x1 < R && -tab.x0 < R) || !(tab.y0 < -Math.sqrt(R * R - tab.x1 * tab.x1))) {
    throw commandError({ code: "E_SCHEMA", path: "/outline", got: "round", expected: "a tab whose sides cut the circle", hint: "set outline to square; this round body and pin row leave a tab the host does not join" });
  }
  const yR = -Math.sqrt(R * R - tab.x1 * tab.x1), yL = -Math.sqrt(R * R - tab.x0 * tab.x0);
  // circle vertices outside the tab's x span or above its corners, in ring order from the right side
  const keep = (q: Vec2): boolean => q[0] > tab.x1 || q[0] < tab.x0 || q[1] > Math.max(yR, yL);
  const ang = (q: Vec2): number => { const a = Math.atan2(q[1], q[0]) - Math.atan2(yR, tab.x1); return a < 0 ? a + 2 * Math.PI : a; };
  const arc = circle.filter(keep).sort((a, b) => ang(a) - ang(b));
  return [[tab.x1, yR], ...arc, [tab.x0, yL], [tab.x0, tab.y0], [tab.x1, tab.y0]];
}

export const build = defineBuild(chase, (p, k) => {
  const machine = chase.meta.machines[0];
  if (p.dirs !== 4 && p.dirs !== 8) {
    throw commandError({ code: "E_SCHEMA", path: "/dirs", got: p.dirs, expected: "4 or 8", hint: "set directions to 4 way or 8 way" });
  }
  const { route, ...stickParams } = p;
  const P0 = toggleParams.parse({ ...stickParams, dirs: p.dirs });
  const first = toggleHost(P0, k.profile, machine, route);
  const r = routeSearch(first.plan, k.profile);
  const dirs = first.G.dirs;
  const comGap = ((Math.round(r.phiA * dirs / (2 * Math.PI) - 0.5) % dirs) + dirs) % dirs;
  const P = toggleParams.parse({ ...P0, layers: r.layers, comGap, leadAng: [...r.lead] });
  const host = toggleHost(P, k.profile, machine, route);
  const G = host.G, L = G.L;
  for (const w of host.warnings) k.warn("TOGGLE", w);
  for (const w of r.warnings) k.warn(w.code, w.text);

  const preset = G.blocks ? "blocks8" : dirs === 8 ? "solo8" : "solo4";
  const stick = k.arch(STICK, BED, { ...P, preset });
  const names = TOGGLE_NAMES[dirs];
  const netName = (q: number): string => (q < dirs ? names[q] as string : P.common);
  // net of each terminal: map[q] is the terminal of net q
  const termNet = new Map<number, string>(r.map.map((t, q) => [t, netName(q)] as const));

  const features: Feature[] = [];
  const bodies: BodyDraft[] = [];
  const cond = (id: string, net: string, ring: Ring, z0: number, z1: number, width: number): Feature =>
    ({ kind: "conductor", id, body: "body", material: "cpla", net, region: { path: ring, face: at(z0) }, width, t: z1 - z0 });
  const circle = (r0: number, c: Vec2): Ring => k.ring.circle(r0, c, SEG);
  // a pocket cutter rises one machine layer past its face (packages/mesh pocket kind), so the
  // face sits a layer under `top` and the cut runs from `top` down past the bed
  const lh = k.machine(machine).layerHeight;
  const bore = (id: string, ring: Ring, top: number): Feature =>
    ({ kind: "pocket", id, body: "body", outline: ring, face: at(top - lh), depth: top, floor: "flat", fit: { class: k.fit("LOCATE"), drawnPerSide: 0, basis: "perSide" } });

  // Host body and terminals. The host is one prism, or full bands each
  // over the one below by the middle of profile stack.bandOverlap
  // (CHK-PRT-02), so a routed lead clips to its plan outline. A pin bore or
  // socket bore is a pocket in the host cut from its slab top down through
  // the bed, drawn at the conductor's own bore (LOCATE, 0 per side): the
  // conductor around it carries the hole, the pocket clears the PETG.
  const ov = (k.profile.constant("stack.bandOverlap.lo").value + k.profile.constant("stack.bandOverlap.hi").value) / 2;
  const stack = (bands: readonly { readonly outline: readonly Ring[]; readonly z: readonly [number, number] }[]): ShapeDecl =>
    bands.length === 1 ? prism((bands[0] as { outline: readonly Ring[] }).outline, ...(bands[0] as { z: readonly [number, number] }).z)
      : { route: "stack", bands: bands.map((b, i) => ({ outline: b.outline, z: [i === 0 ? b.z[0] : b.z[0] - ov, b.z[1]] as const })) };
  let hostBase: ShapeDecl;
  if (!G.blocks) {
    const tab = host.plan.tab;
    const outer = G.outKind === "square" ? rect(-G.outHx, -G.outHy0, G.outHx, G.outHy1) : circle(G.outR, [0, 0]);
    const low = tab === null ? outer : roundWithTab(outer, G.outR, tab);
    const bands: { outline: Ring[]; z: [number, number] }[] = [];
    if (host.boreTop !== null && host.cupTop !== null) {
      const boreTop = host.boreTop, cupTop = host.cupTop;
      host.terms.forEach((t, i) => {
        bodies.push(k.body(`cup${i + 1}`, { role: "conductor", slot: 2, material: "cpla", base: { route: "csg", op: "difference", of: [
          prism([circle(t.r, [t.x, t.y])], 0, cupTop),
          prism([circle(host.boreR, [t.x, t.y])], -L, boreTop),
        ] } }));
        features.push(bore(`pocket.cup${i + 1}`, circle(t.r, [t.x, t.y]), boreTop));
      });
      if (tab !== null && host.tabTop !== null) bands.push({ outline: [low], z: [0, host.tabTop] }, { outline: [outer], z: [host.tabTop, G.zT] });
      else bands.push({ outline: [outer], z: [0, G.zT] });
    } else {
      if (tab !== null && host.tabTop !== null) bands.push({ outline: [low], z: [0, host.tabTop] }, { outline: [outer], z: [host.tabTop, G.zT] });
      else bands.push({ outline: [outer], z: [0, G.zT] });
      host.terms.forEach((t, i) => features.push(cond(`conductor.pad${i + 1}`, termNet.get(i) ?? P.common, circle(t.r, [t.x, t.y]), 0, G.topTrace.z1, 2 * t.r)));
    }
    hostBase = stack(bands);
  } else {
    const K = TOGGLE_BLOCKS, f = host.plan.foot;
    const ledgeTop = host.ledgeTop as number;
    if (f === null) throw new Error("a BLOCKS plan carries its footprint");
    const sock = G.floor.find((s) => s.name === "sockets"), flange = G.floor.find((s) => s.name === "flange"), spacer = G.floor.find((s) => s.name === "spacer");
    const footRing = rect(f.x0, f.y0, f.x1, f.y1);
    const termAt = new Map(host.terms.map((t, i) => [`${t.x},${t.y}`, i] as const));
    for (const pos of host.positions) {
      const ti = termAt.get(`${pos.x},${pos.y}`);
      const net = ti === undefined ? undefined : termNet.get(ti);
      const c: Vec2 = [pos.x, pos.y];
      if (sock !== undefined && flange !== undefined) {
        const ring = [circle(K.socketR1, c), holeOf(circle(K.socketR0, c))];
        if (net !== undefined) bodies.push(k.body(`socket.${pos.label}`, { role: "flex-conductor", slot: 4, material: "ctpu", base: prism(ring, sock.z0, sock.z1) }));
        else if (P.plain === "tpu") bodies.push(k.body(`socket.${pos.label}`, { role: "flex", slot: 3, material: "tpu95", base: prism(ring, sock.z0, sock.z1) }));
        features.push(bore(`pocket.socket.${pos.label}`, circle(net !== undefined || P.plain === "tpu" ? K.socketR0 : K.petgBoreR, c), sock.z1));
        if (net !== undefined) features.push(cond(`conductor.flange.${pos.label}`, net, circle(K.flangeR, c), flange.z0, flange.z1, 2 * K.flangeR));
      }
      if (net !== undefined) {
        const z0 = sock !== undefined && flange !== undefined ? flange.z1 : (spacer as { z0: number }).z0;
        features.push(cond(`conductor.post.${pos.label}`, net, circle(K.postR, c), z0, pos.ledge ? ledgeTop : G.topTrace.z1, 2 * K.postR));
      }
      if (pos.ledge) {
        if (net !== undefined) features.push(cond(`conductor.stud.${pos.label}`, net, circle(K.studR, c), ledgeTop, ledgeTop + K.studH, 2 * K.studR));
        else bodies.push(k.body(`stud.${pos.label}`, { role: "body", slot: 1, base: prism([circle(K.studR, c)], ledgeTop, ledgeTop + K.studH) }));
      }
    }
    const bands: { outline: Ring[]; z: [number, number] }[] = [{ outline: [footRing], z: [0, ledgeTop] }];
    if (G.zT > ledgeTop) bands.push({ outline: [rect(-G.outHx, -G.outHy0, G.outHx, G.outHy1)], z: [ledgeTop, G.zT] });
    hostBase = stack(bands);
  }
  const body = k.body("body", { role: "body", slot: 1, base: hostBase });

  // Routed leads and vias.
  const sep = G.floor.find((s) => s.name === "sep");
  const bored = host.boreTop !== null;
  r.res?.nets.forEach((rn, q) => {
    if (rn === null) return;
    const net = netName(q);
    const t = host.terms[r.map[q] as number];
    rn.runs.forEach((run, i) => {
      let pts: Vec2[] | null = run.pts.map((pt): Vec2 => [pt[0], pt[1]]);
      if (bored && t !== undefined) {
        const c: Vec2 = [t.x, t.y];
        const near = (pt: Vec2): number => Math.hypot(pt[0] - c[0], pt[1] - c[1]);
        if (pts.length > 1 && near(pts[0] as Vec2) < near(pts[pts.length - 1] as Vec2)) pts.reverse();
        // the lead's square end stops a twentieth of a millimetre short of the bore, inside the cup
        pts = near(pts[pts.length - 1] as Vec2) < t.r ? stopAt(pts, c, host.boreR + G.w / 2 + 0.05) : pts;
      }
      if (pts === null) return;
      const slab = G.trace[run.l];
      if (slab === undefined) throw new Error(`route run on layer ${run.l}, the stack has ${G.trace.length}`);
      features.push({ kind: "conductor", id: `conductor.${net}.${i + 1}`, body: "body", material: "cpla", net,
        region: { path: traceOutline(pts, G.w / 2), face: at(slab.z0) }, width: G.w, t: slab.z1 - slab.z0 });
    });
    rn.vias.forEach((v, i) => {
      if (sep === undefined) throw new Error("a via on a one layer stack");
      features.push(cond(`conductor.${net}.via${i + 1}`, net, rect(v.x - G.w / 2, v.y - G.w / 2, v.x + G.w / 2, v.y + G.w / 2), sep.z0, sep.z1, G.w));
    });
  });

  const metric = (id: string, value: number | string, unit: string | undefined, note: string, group = "layout"): Metric =>
    ({ id, value: typeof value === "number" ? Number(value.toFixed(6)) : value, ...(unit === undefined ? {} : { unit }), ...qualify([]), note, gate: "informational", group });
  const metrics: Metric[] = [
    ...(stick.metrics ?? []),
    metric("layout.width", host.plan.bbox[2] - host.plan.bbox[0], "mm", "plan width"),
    metric("layout.depth", host.plan.bbox[3] - host.plan.bbox[1], "mm", "plan depth"),
    metric("layout.top", G.zT, "mm", "body top, the solved lip top"),
    metric("route.layers", r.layers, "count", "trace layers the route settled on"),
    metric("route.tries", r.tries, "count", "route attempts before the first clean one"),
    metric("route.comDeg", r.phiA * 180 / Math.PI, "deg", "COM column angle from east"),
    ...(G.blocks ? [metric("layout.studs", G.studs, "count", "body studs: the set count, or at 0 the fewest that hold the collar"), metric("layout.ledgeTop", host.ledgeTop ?? 0, "mm", "ledge stud base")] : []),
    ...host.terms.map((t, i) => metric(`pinout.${t.label}`, termNet.get(i) ?? "none", undefined, `net on terminal ${t.label}`, "pinout")),
    // The drive pad's targets: direction name to sector index and its centre angle.
    ...names.map((n, i) => metric(`drive.${n}`, i, "count", `sector index of direction ${n}`, "drive")),
    ...names.map((n, i) => metric(`drive.${n}.deg`, G.sectors[i] === undefined ? 0 : (G.sectors[i] as { c: number }).c * 180 / Math.PI, "deg", `sector centre of direction ${n}`, "drive")),
  ];

  return k.part({
    id: "toggle", name: "TOGGLE", process: "fdm", machine,
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body, ...bodies, ...stick.bodies],
    features: [...stick.features, ...features],
    metrics,
    assertions: [{ type: "apart", nets: [...names, P.common] }],
  });
});

export { contact } from "./contact";
