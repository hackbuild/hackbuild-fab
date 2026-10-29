// designs/pip/build.ts
// PIP as the original's layout() and model() order it
// (originals/pip/files/haft-src/src/layout.js lines 61 to 78 and 163 to
// 421, model.js lines 29 to 50 and 301 to 319, recorded as lineage rows
// pip.layout/haft-9-designs-pip-build and pip.model/haft-9-designs-pip-build;
// pip-controller b137deb carries the same code at other line numbers): the body outline, the buttons of each group, one host top for
// every key and the board pocket, the click slot directions, the routed
// terminals, the buried trace layers, and the bezel. Conditionals and
// loops live here (D-178).
//
// Each button and the seat come from their archetype through Author.arch
// (flex-cone-key, click-spring-key, touch-comb-key, tilt-stick with its
// PIP preset, rp2040-zero-seat), each on the stack floor face at the one
// host top. The terminals the router joins are the posts those archetypes
// emit; the router is packages/copper route() (M05-T08), and the buried
// trace layers are packages/copper emitTraceLayers, the one port of
// model.js lines 30 to 51 (M05-T10).
//
// Release 1 differences from the original, each named in README.md: the
// bezel is a plain plate with the button holes, the USB notch and the press
// ribs, printed flipped beside the body (no stepped chamfer, labels, mark,
// pegs, lip or pry notch); the click springs and caps print below the body
// in a fixed grid, not the original's plate packer; wire cups are not
// ported (D-096); the grips outline routes inside its stadium.

import { commandError, defineBuild, qualify, type ApplyOut, type BodyDraft, type FaceFrame, type Feature, type Metric, type Ring, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import {
  clickDerive, clickParams, emitTraceLayers, pipCircle, flexDims, flexParams, flexZ, loadGeom, pipStack, route, routeMetrics, routeRecord, seatParams, seatZ,
  snapRing, snapUp, stickParams, stickZ, touchParams, touchZ, traceStack, type RouteNet,
} from "@hackbuild/kernel/author";
import { chase } from "./chase";

const deg = Math.PI / 180;
/** Facets of the stadium ends (layout.js line 69, n = 96). */
const ENDS = 96;
/** The wall a click slot keeps from every other cavity, and the edge margin a cavity keeps (layout.js lines 315 and 350). */
const WALL = 1.2;
const EDGE = 1.6;
/** Gap between objects on the plate, mm (model.js line 435 packs at 6; 8 leaves room for the bezel's ribs). */
const PLATE_GAP = 8;

type BtnType = "flex" | "clicky" | "touch" | "stick";
interface Btn { readonly id: string; readonly group: "left" | "face" | "menu" | "shoulder"; readonly type: BtnType; readonly x: number; readonly y: number; ang: number }
type Cav = { kind: "c"; x: number; y: number; r: number; who: string } | { kind: "r"; x0: number; y0: number; x1: number; y1: number; who: string } | { kind: "p"; poly: Vec2[]; who: string };

/** The four stick directions in pad order (layout.js line 385; tilt-stick pads 0 to 3). */
const STICK_DIRS = ["RIGHT", "UP", "LEFT", "DOWN"] as const;

/** Convex hull, counter-clockwise (the original's CrossSection hull, layout.js line 70). */
function hull(points: readonly Vec2[]): Ring {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Vec2, a: Vec2, b: Vec2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Vec2[]): Vec2[] => {
    const h: Vec2[] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2] as Vec2, h[h.length - 1] as Vec2, p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...half(pts), ...half([...pts].reverse())];
}

function inPoly(x: number, y: number, poly: readonly Vec2[]): boolean {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as Vec2, b = poly[j] as Vec2;
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) ok = !ok;
  }
  return ok;
}

function segDist(px: number, py: number, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

/** layout.js lines 295 to 298: a w by h rectangle centred at (cx, cy) turned by a. */
function rectCorners(cx: number, cy: number, w: number, h: number, a: number): Vec2[] {
  const c = Math.cos(a), s = Math.sin(a);
  return ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as const).map(([u, v]): Vec2 => [cx + u * c - v * s, cy + u * s + v * c]);
}
/** layout.js lines 299 to 303. */
function circRectHit(cx: number, cy: number, r: number, poly: readonly Vec2[]): boolean {
  if (inPoly(cx, cy, poly)) return true;
  for (let i = 0; i < 4; i++) if (segDist(cx, cy, poly[i] as Vec2, poly[(i + 1) % 4] as Vec2) < r) return true;
  return false;
}
/** layout.js lines 304 to 313, separating axes of two rectangles. */
function rectRectHit(p1: readonly Vec2[], p2: readonly Vec2[]): boolean {
  const axes: Vec2[] = [];
  for (const p of [p1, p2]) for (let i = 0; i < 2; i++) { const a = p[i] as Vec2, q = p[i + 1] as Vec2; axes.push([-(q[1] - a[1]), q[0] - a[0]]); }
  for (const [ax, ay] of axes) {
    const A = p1.map((v) => v[0] * ax + v[1] * ay), B = p2.map((v) => v[0] * ax + v[1] * ay);
    if (Math.max(...A) < Math.min(...B) || Math.max(...B) < Math.min(...A)) return false;
  }
  return true;
}

/** A unit direction with the quadrant angles exact, so a turned frame stays on the axes. */
const dir = (a: number): [number, number] => [Number(Math.cos(a).toFixed(12)), Number(Math.sin(a).toFixed(12))];

export const build = defineBuild(chase, async (p, k) => {
  const machine = chase.meta.machines[0];
  const s = pipStack(k.profile, machine, { body: "petg", trace: "cpla" });
  const prism = (outline: readonly Ring[], z0: number, z1: number): ShapeDecl => ({ route: "prism", outline, z: [z0, z1] });
  const circle = (r: number, at: Vec2, n = 64): Ring => k.ring.circle(r, at, n);
  const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

  // Outline (layout.js lines 61 to 78). The router and the edge tests read
  // `plan`; grips add two lobes to the body that the plan leaves out.
  const W = p.W, Hh = p.H, halfH = Hh / 2, cx = W / 2 - Hh / 2;
  const plan: Ring = p.shape === "slab"
    ? k.ring.roundRect(W, Hh, Math.min(p.corner, Hh / 2 - 0.5, W / 2 - 0.5))
    : hull([...pipCircle(Hh / 2, [-cx, 0], ENDS), ...pipCircle(Hh / 2, [cx, 0], ENDS)]);
  /**
   * The outline as a solid over z0 to z1, each ring snapped to the 1/1024 mm
   * grid (D-054) and passed through `map`: the plan, and on grips the two
   * lobes. The router reads the plan as the original computes it, unsnapped.
   */
  const ring = (r: Ring, map: (r: Ring) => Ring): Ring => map(snapRing(r));
  const outlineSolid = (z0: number, z1: number, map: (r: Ring) => Ring): ShapeDecl => p.shape !== "grips" ? prism([ring(plan, map)], z0, z1) : {
    route: "csg", op: "union", of: [prism([ring(plan, map)], z0, z1), ...[-1, 1].map((sg): ShapeDecl => ({
      route: "csg", op: "hull", of: [prism([ring(pipCircle(Hh / 2, [sg * cx, 0], ENDS), map)], z0, z1), prism([ring(pipCircle(Hh / 2 - 4, [sg * (cx - 6), -p.drop], ENDS), map)], z0, z1)],
    }))],
  };
  const lobeLow = p.shape === "grips" ? -p.drop - (Hh / 2 - 4) : -halfH;
  if (p.shape === "grips") k.warn("LAYOUT", "grips: the router and the edge tests keep inside the stadium; the lobes hold no trace");
  const inside = (x: number, y: number, m: number): boolean =>
    inPoly(x, y, plan) && plan.every((a, i) => segDist(x, y, a, plan[(i + 1) % plan.length] as Vec2) >= m);

  // Buttons (layout.js lines 186 to 216).
  const btns: Btn[] = [];
  if (p.leftOn) {
    const t = p.leftType as BtnType, P = p.leftPitch, x = p.leftX, y = p.leftY;
    if (p.leftKind === "stick") btns.push({ id: "STICK", group: "left", type: "stick", x, y, ang: 0 });
    else btns.push(
      { id: "UP", group: "left", type: t, x, y: y + P, ang: 90 * deg }, { id: "DOWN", group: "left", type: t, x, y: y - P, ang: 90 * deg },
      { id: "LEFT", group: "left", type: t, x: x - P, y, ang: 0 }, { id: "RIGHT", group: "left", type: t, x: x + P, y, ang: 0 });
  }
  if (p.faceOn) {
    const t = p.faceType as BtnType, P = p.facePitch, x = p.faceX, y = p.faceY;
    btns.push(
      { id: "X", group: "face", type: t, x, y: y + P, ang: 90 * deg }, { id: "B", group: "face", type: t, x, y: y - P, ang: 90 * deg },
      { id: "Y", group: "face", type: t, x: x - P, y, ang: 0 }, { id: "A", group: "face", type: t, x: x + P, y, ang: 0 });
  }
  if (p.menuOn) {
    const t = p.menuType as BtnType, P = p.menuPitch;
    btns.push({ id: "SELECT", group: "menu", type: t, x: p.menuX - P / 2, y: p.menuY, ang: 90 * deg }, { id: "START", group: "menu", type: t, x: p.menuX + P / 2, y: p.menuY, ang: 90 * deg });
  }
  if (p.shoulderOn) {
    const t = p.shoulderType as BtnType;
    btns.push({ id: "L", group: "shoulder", type: t, x: -Math.abs(p.shoulderX), y: p.shoulderY, ang: 0 }, { id: "R", group: "shoulder", type: t, x: Math.abs(p.shoulderX), y: p.shoulderY, ang: 0 });
  }
  const types = new Set(btns.map((b) => b.type));
  const groupAt = { left: [p.leftX, p.leftY], face: [p.faceX, p.faceY], menu: [p.menuX, p.menuY], shoulder: [p.shoulderX, p.shoulderY] } as const;

  // The archetype params, from the chase rows.
  const F = flexParams.parse({ face: p.flexFace, Hs: p.flexHs, alpha: p.flexAlpha, wall: p.flexWall, hole: p.flexHole, cap: p.flexCap, faceT: p.flexFaceT, protrude: p.flexProtrude, gapPct: p.flexGapPct, colGap: p.flexSplit, bezel: p.bezel });
  const petgE = k.profile.material("petg").modulusMPa;
  if (petgE === undefined) throw commandError({ code: "E_REF", path: "/materials/petg/modulusMPa", got: "petg", expected: "a petg row with modulusMPa", hint: "give the petg profile row its modulus; the click spring curve reads it" });
  const C = clickParams.parse({
    l: p.clickSpan, t: p.clickBeam, Q: p.clickRise, w: p.clickWidth, g: p.clickGap, cap: p.clickCap, protrude: p.clickProtrude, E: petgE,
    eb: p.clickEnd, sw: p.clickShuttle, tip: p.clickTip, flange: p.clickFlange, flangeT: p.clickFlangeT, slotClr: p.clickSlotClr, relief: p.clickRelief, rib: p.clickRib, bezel: p.bezel,
  });
  const T = touchParams.parse({ d: p.touchD, finger: p.touchFinger, gap: p.touchGap, spine: p.touchSpine, rim: p.touchRim, bezel: p.bezel });
  const S = stickParams.parse({
    tilt: p.stickTilt, over: p.stickOver, bandR: p.stickBandR, bandH: p.stickBandH, neckD: p.stickNeckD, neckH: p.stickNeckH,
    stemD: p.stickStemD, capD: p.stickCapD, capH: p.stickCapH, capDish: p.stickDish, padGap: p.stickPadGap, bezel: p.bezel,
  });
  if (p.clickCapMat === "petg" && types.has("clicky")) k.warn("CLICKY", "cap material petg is not ported; the caps are tpu on slot 3");
  if (p.stickTop === "press" && types.has("stick")) k.warn("STICK", "the separate thumb cap is not ported; the thumb pad is printed on");
  if (p.mode !== "press") k.warn("MOUNT", `mount ${p.mode}: wire cups are not ported (D-096); the board seats press fit`);

  // Pins: the chase hookup names the pin of each key (layout.js line 42).
  const pins = new Map(chase.hookup.map((h) => [h.port.slice("port.".length), h.pin] as const));
  const logical = btns.flatMap((b) => (b.type === "stick" ? [...STICK_DIRS] : [b.id]));
  const seatNets: Record<string, string> = {};
  for (const n of logical) {
    const pin = pins.get(n);
    if (pin === undefined) k.warn("PIN", `${n} has no pin`);
    else seatNets[n] = pin;
  }
  if ([...types].some((t) => t !== "touch")) seatNets["GND"] = "GND";
  if (types.has("touch")) seatNets["3V3"] = "3V3";
  const B = seatParams.parse({
    contact: p.contact, press: p.press, bumpH: p.bumpH, bumpW: p.bumpW, clr: p.pocketClr, sockOD: p.sockOD, sockBore: p.sockBore,
    pinLen: p.pinLen, headerT: p.headerT, datum: p.datum, window: p.window, bezel: p.bezel, nets: seatNets,
  });

  // One host top for every key and the pocket (layout.js lines 220 to 230):
  // each archetype's own need snapped up a layer, and the highest wins.
  const seat = seatZ(B, s);
  const tops = [seat.top, snapUp(s.z.floor + 1.44, s.layer)];
  if (types.has("flex")) tops.push(flexZ(F, s).top);
  if (types.has("clicky")) tops.push(clickDerive(C, k.profile, machine)["top"]?.value ?? 0);
  if (types.has("touch")) tops.push(touchZ(T, s).top);
  if (types.has("stick")) tops.push(stickZ(S, s).top);
  const top = Math.max(...tops);
  const zbt = top + p.bezel;
  k.derive("bodyThickness", zbt, "body top plus the bezel: the highest key, stick or pocket need snapped up a layer, then the bezel");

  // Cavities and the click slot directions (layout.js lines 247 to 345).
  const fd = flexDims(F);
  const stick = types.has("stick") ? stickZ({ ...S, top }, s) : null;
  const radius = (b: Btn): number =>
    b.type === "flex" ? fd.wellR : b.type === "clicky" ? C.cap / 2 + C.flange + 0.4 : b.type === "touch" ? T.d / 2 : (stick as { d: { Rw: number } }).d.Rw + 3.5;
  const cav: Cav[] = btns.map((b) => ({ kind: "c", x: b.x, y: b.y, r: radius(b), who: b.id }));
  const by = halfH - B.usbOver - B.L / 2;
  cav.push({ kind: "r", x0: -B.W / 2 - B.clr, x1: B.W / 2 + B.clr, y0: by - B.L / 2 - B.clr, y1: halfH + 2, who: "pocket" });
  const slotW = C.w + C.slotClr + C.relief, slotLen = C.l + 2 * C.eb + C.endClr;
  for (const b of btns) {
    if (b.type !== "clicky") continue;
    const [gx, gy] = groupAt[b.group];
    const radial = Math.atan2(b.y - gy, b.x - gx);
    const tries = b.group === "shoulder" ? [0, 90 * deg] : b.group === "menu" ? [90 * deg, 0] : [radial, radial + 90 * deg, 0, 90 * deg];
    tries.push(45 * deg, 135 * deg);
    let chosen: number | null = null;
    for (const a of tries) {
      const poly = rectCorners(b.x, b.y, slotLen + 2 * WALL, slotW + 2 * WALL, a);
      const bad = cav.some((c) => c.who !== b.id && (
        c.kind === "c" ? circRectHit(c.x, c.y, c.r, poly)
          : c.kind === "r" ? rectRectHit(poly, [[c.x0, c.y0], [c.x1, c.y0], [c.x1, c.y1], [c.x0, c.y1]])
            : rectRectHit(poly, c.poly)));
      if (!bad && rectCorners(b.x, b.y, slotLen, slotW, a).every((q) => inside(q[0], q[1], EDGE))) {
        chosen = a;
        cav.push({ kind: "p", poly, who: `${b.id}-slot` });
        break;
      }
    }
    if (chosen === null) { chosen = tries[0] as number; k.warn("LAYOUT", `${b.id}: no clear direction for its click element slot`); }
    b.ang = chosen;
  }
  // Edge and pairwise checks of the round cavities (layout.js lines 346 to 360).
  cav.forEach((c, i) => {
    if (c.kind !== "c") return;
    if (!inside(c.x, c.y, c.r + EDGE)) k.warn("LAYOUT", `${c.who} is too close to the edge`);
    for (const d of cav.slice(i + 1)) {
      if (d.kind === "c" && Math.hypot(c.x - d.x, c.y - d.y) < c.r + d.r + WALL) k.warn("LAYOUT", `${c.who} overlaps ${d.who}`);
      if (d.kind === "r") {
        const nx = Math.max(d.x0, Math.min(c.x, d.x1)), ny = Math.max(d.y0, Math.min(c.y, d.y1));
        if (Math.hypot(c.x - nx, c.y - ny) < c.r + WALL) k.warn("LAYOUT", `${c.who} overlaps the ${d.who}`);
      }
    }
  });

  // The archetypes on the stack floor, every one at the host top.
  const onFloor = (x: number, y: number, a: number): FaceFrame => { const [c, sn] = dir(a); return { origin: [x, y, s.z.floor], normal: [0, 0, 1], u: [c, sn, 0] }; };
  const outs: ApplyOut[] = [];
  const prefixOf = new Map<string, string>();
  const used = new Map<string, number>();
  const place = (arch: string, key: string, out: ApplyOut): void => {
    const n = used.get(arch) ?? 0;
    used.set(arch, n + 1);
    prefixOf.set(key, `${arch}.${n}`);
    outs.push(out);
  };
  // Click springs and caps print below the body, two to a row, at these plate spots.
  const clickies = btns.filter((b) => b.type === "clicky");
  const looseAt = (i: number): Vec2 => [-45 + 90 * (i % 2), lobeLow - PLATE_GAP - 16 - 40 * Math.floor(i / 2)];
  for (const b of btns) {
    const face = onFloor(b.x, b.y, b.type === "clicky" ? b.ang : 0);
    if (b.type === "flex") place("flex-cone-key", b.id, k.arch("flex-cone-key", face, { ...F, top, net: b.id, common: "GND" }));
    else if (b.type === "touch") place("touch-comb-key", b.id, k.arch("touch-comb-key", face, { ...T, top, net: b.id, common: "3V3" }));
    else if (b.type === "stick") place("tilt-stick", b.id, k.arch("tilt-stick", face, { ...S, preset: "pip", top, common: "GND" }));
    else {
      const [c, sn] = dir(b.ang);
      const [wx, wy] = looseAt(clickies.indexOf(b));
      const dx = wx - b.x, dy = wy - b.y;
      place("click-spring-key", b.id, k.arch("click-spring-key", face, { ...C, top, net: b.id, common: "GND", loose: [dx * c + dy * sn, -dx * sn + dy * c] }));
    }
  }
  const seatOut = k.arch("rp2040-zero-seat", onFloor(0, by, 0), { ...B, top });
  outs.push(seatOut);

  // Routed terminals: every post an archetype emits, on its net (layout.js lines 363 to 421).
  const POST = flexParams.parse({}).post;
  const rank = (n: string): number => (n === "GND" ? 0 : n === "3V3" ? 1 : 2);
  const terms = new Map<string, { x: number; y: number; r: number }[]>();
  for (const f of outs.flatMap((o) => o.features)) {
    if (f.kind !== "conductor" || !/\.conductor\.post[A-Za-z0-9]*$/.test(f.id) || !("path" in f.region)) continue;
    const xs = f.region.path.map((q) => q[0]), ys = f.region.path.map((q) => q[1]);
    const list = terms.get(f.net) ?? [];
    list.push({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, r: POST });
    terms.set(f.net, list);
  }
  // Net order is the original's (layout.js lines 364 to 371): the commons
  // first, then each net as its first terminal appears; the router reads it.
  const order = [...terms.keys()].sort((a, b) => rank(a) - rank(b));
  const nets: RouteNet[] = [];
  for (const name of order) {
    const list = terms.get(name) as { x: number; y: number; r: number }[];
    if (list.length < 2) k.warn("NET", `net ${name} has one terminal`);
    else nets.push({ name, terms: list });
  }
  const r = route({ outline: [plan], nets, settings: { w: s.w, clr: p.routeClr, grid: Number(p.routeGrid), via: p.routeVia, margin: p.routeMargin, iters: p.iters } }, k.profile);
  const rec = routeRecord(r);
  const routed = new Set(nets.map((n) => n.name));
  for (const w of rec.warnings) k.warn(w.code, w.text);

  // The buried trace layers and posts (model.js lines 30 to 51), emitted by
  // emitTraceLayers as reference/electrical/pip-buried-route takes them: one
  // region per net and layer (strokes, stubs and the discs of its terminals
  // and vias), a post up from each terminal and between the layers at each
  // via. The archetypes' own terminal posts and discs on a routed net are
  // dropped below, since the stack carries the same ones (model.js lines 43
  // and 50), so the stack is the original's union and no piece is held twice.
  const traces: Feature[] = [];
  const at = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });
  const emitted = emitTraceLayers(await loadGeom(), { routed: r.nets, nets, w: s.w, via: p.routeVia, bleed: s.bleed, stack: traceStack(k.profile, s.layer) }, k.profile);
  for (const n of emitted) {
    for (const l of n.layers) {
      l.regions.forEach((g, i) => {
        if (g.holes.length > 0) throw commandError({ code: "E_KERNEL", path: `/route/${n.name}`, got: "a trace region with a hole", expected: "one ring per region", hint: "change the routing grid or clearance; this route closes a loop on one layer" });
        traces.push({ kind: "conductor", id: `conductor.${n.name}.l${l.layer + 1}.${i + 1}`, body: "body", material: "cpla", net: n.name, region: { path: g.outer, face: at(l.z[0]) }, width: s.w - s.bleed, t: l.z[1] - l.z[0] });
      });
    }
    n.posts.forEach((v, i) => traces.push({ kind: "conductor", id: `conductor.${n.name}.${v.kind === "via" ? "via" : "post"}${i + 1}`, body: "body", material: "cpla", net: n.name, region: { path: v.ring, face: at(v.z[0]) }, width: 2 * v.drawnR, t: v.z[1] - v.z[0] }));
  }

  // Host body, up to the host top.
  const body = k.body("body", { role: "body", slot: 1, base: outlineSolid(0, top, (q) => q) });

  // Bezel (model.js lines 301 to 319): the plate with a hole per button, the
  // USB notch where the seat's opening rises past the host top, and the
  // press ribs over the castellation rows, flipped onto the plate above
  // the body: (x, y, z) to (x, Y0 - y, zbt - z).
  const bezR = (b: Btn): number =>
    b.type === "flex" ? fd.rFace + 0.5 : b.type === "clicky" ? C.cap / 2 + 0.25 : b.type === "touch" ? T.d / 2 + 0.3 : (stick as { sc: { hole: number } }).sc.hole;
  const Y0 = 2 * halfH + PLATE_GAP;
  const flip = (ring: Ring): Ring => [...ring].reverse().map(([x, y]): Vec2 => [x, Y0 - y]);
  const up = (z0: number, z1: number): [number, number] => [zbt - z1, zbt - z0];
  const plateOf = outlineSolid(0, p.bezel, flip);
  const cuts: ShapeDecl[] = btns.map((b) => prism([flip(circle(bezR(b), [b.x, b.y]))], -0.1, p.bezel + 0.1));
  if (seat.notchTop > top + 1e-6) cuts.push(prism([flip(rect(-seat.notchW / 2, by + B.L / 2 - 0.3, seat.notchW / 2, halfH + 6))], ...up(top - 0.1, seat.notchTop)));
  const ribBot = seat.boardTop - B.press;
  const ribs: ShapeDecl[] = top - ribBot > 0.05
    ? [-1, 1].map((sg) => { const rx = sg * (B.W / 2 - 0.8); return prism([flip(rect(rx - 0.5, by - B.L / 2 + 1.0, rx + 0.5, by + B.L / 2 - 5.0))], ...up(ribBot, top + 0.02)); })
    : [];
  const bezel = k.body("bezel", { role: "body", slot: 1, base: { route: "csg", op: "union", of: [{ route: "csg", op: "difference", of: [plateOf, ...cuts] }, ...ribs] } });
  const unbuilt = [p.labels && "labels", p.mark && "mark", p.lip && "lip and groove", p.pry && "pry notch", p.pegs && "pegs"].filter((x): x is string => typeof x === "string");
  if (unbuilt.length > 0) k.warn("BEZEL", `bezel ${unbuilt.join(", ")} not built in release 1; the bezel is the plate, holes, notch and ribs`);

  const metric = (id: string, value: number | string, unit: string | undefined, note: string, group = "layout"): Metric =>
    ({ id, value: typeof value === "number" ? Number(value.toFixed(6)) : value, ...(unit === undefined ? {} : { unit }), ...qualify([]), note, gate: "informational", group });
  const bodies: BodyDraft[] = [body, bezel, ...outs.flatMap((o) => o.bodies)];
  const metrics: Metric[] = [
    ...outs.flatMap((o) => o.metrics ?? []),
    ...routeMetrics(rec),
    metric("layout.top", top, "mm", "host top: the highest key, stick or pocket need snapped up a layer"),
    metric("layout.bezelTop", zbt, "mm", "bezel top over the bed in the assembled pose"),
    metric("layout.floor", s.z.floor, "mm", "stack floor, the pads flush here"),
    metric("layout.buttons", btns.length, "count", "buttons placed"),
    ...btns.filter((b) => b.type === "clicky").map((b) => metric(`layout.slot.${b.id}`, Number((b.ang / deg).toFixed(6)), "deg", `click slot direction of ${b.id} from +x`)),
    // The drive pad's targets: key to the archetype instance that reads it.
    ...btns.flatMap((b) => (b.type === "stick"
      ? STICK_DIRS.map((n, q) => metric(`drive.${n}`, `${prefixOf.get(b.id) ?? ""}.conductor.pad${q}`, undefined, `stick wall pad of ${n}`, "drive"))
      : [metric(`drive.${b.id}`, `${prefixOf.get(b.id) ?? ""}.${b.type === "flex" ? "conductor.col" : b.type === "clicky" ? "conductor.pad" : "conductor.comb"}`, undefined, `${b.type} key contact of ${b.id}`, "drive")])),
  ];
  const keyNets = [...new Set(logical)];
  return k.part({
    id: "pip", name: "PIP", process: "fdm", machine,
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies,
    features: [...outs.flatMap((o) => o.features).filter((f) => !/\.conductor\.(disc[12]|post)[A-Za-z0-9]*$/.test(f.id) || !routed.has(f.kind === "conductor" ? f.net : "")), ...traces],
    metrics,
    assertions: keyNets.length === 0 ? [] : [{ type: "apart", nets: [...keyNets, ...Object.keys(seatNets).filter((n) => n === "GND" || n === "3V3")] }],
  });
});

export { contact } from "./contact";
