// reference/keys/access-switch/build.ts
// One click-spring-key (Author.arch) at the centre of a round PETG body
// with the PIP buried stack, under a round PETG paddle. The archetype sits
// on the stack floor face and reports the body top it needs (host.top);
// the body rises to it, and a rim of the body's wall rises past it to the
// cap top, holding a guide bore for the paddle skirt. The paddle boss
// rests on the cap; the skirt edge stops on the body top at the spring's
// contact travel plus click.stopOvertravel, the travel eStop is read to.
// The spring element, the cap and the paddle print beside the body; the
// paddle prints plate down. The jack seat (jack.ts) sets a PJ398SM in the
// -y wall and runs one lead per net on trace layer 1 from the key's routed
// terminals to its T and S sockets. Conditionals live here (D-178).

import { defineBuild, qualify, type ContactFn, type FaceFrame, type Metric, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";
import { PRESS_IDS, pressBand } from "./claim";
import { jackSeat } from "./jack";

const ID = "click-spring-key";
const SEGMENTS = 64;
/** Force curve samples the archetype emits as spring.curve metrics, for the drive force readout and the curve panel. */
const CURVE_SAMPLES = 24;
const up = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });

/** Prisms of a CSG union, in order, with their z spans and outer rings. */
const prismsOf = (s: ShapeDecl): { z: readonly [number, number]; ring: readonly Vec2[] }[] =>
  s.route === "prism" ? [{ z: s.z, ring: s.outline[0] ?? [] }] : s.route === "csg" ? s.of.flatMap(prismsOf) : [];

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const skin = c("stack.skin"), trace = c("stack.trace"), iso = c("stack.iso"), overL2 = c("stack.overL2"), tw = c("stack.traceWidth");
  const floor = skin + trace + iso + trace + overL2;
  const petg = k.profile.material("petg");
  const E = petg.modulusMPa;
  if (E === undefined) throw new Error("profile material petg has no modulusMPa; the spring needs it");
  const R = p.D / 2 + p.wall;

  // The spring element and the cap print beyond the body's near edge.
  const out = k.arch(ID, up(floor), { l: p.l, t: p.t, Q: p.Q, w: p.w, E, loose: [-12, -R - 14], curveSamples: CURVE_SAMPLES });
  const metricOf = (id: string): number => {
    const v = out.metrics?.find((m) => m.id === `${ID}.0.${id}`)?.value;
    if (typeof v !== "number") throw new Error(`click-spring-key reported no ${id}`);
    return v;
  };
  const top = metricOf("host.top");
  const cg = metricOf("spring.cg");

  // The cap prints flange down: its first prism is the flange, its second
  // the stem; the flange top sits at the host top when assembled.
  const cap = out.bodies.find((b) => b.id === `${ID}.0.cap` || b.id === "cap");
  const capPrisms = cap === undefined ? [] : prismsOf(cap.base);
  if (capPrisms.length < 2) throw new Error("click-spring-key cap is not a flange and a stem");
  const flangeT = capPrisms[0]!.z[1];
  const capTop = top - flangeT + Math.max(...capPrisms.map((q) => q.z[1]));
  const stem = capPrisms[1]!.ring;
  const sx = stem.map((q) => q[0]);
  const capR = (Math.max(...sx) - Math.min(...sx)) / 2;

  // Body: the host disc to host.top and the rim, from there to the cap top
  // snapped up a layer, around the guide bore.
  const m = k.machine();
  const down = (z: number): number => { const u = m.layer(z); return u > z + 1e-9 ? u - m.layerHeight : u; };
  const rimTop = m.layer(capTop);
  const clr = c("access.paddleGuideClr");
  const boreR = p.D / 2 + clr / 2;
  // Two stack bands overlapping by the middle of profile stack.bandOverlap (CHK-PRT-02).
  const ov = (c("stack.bandOverlap.lo") + c("stack.bandOverlap.hi")) / 2;
  const body = k.body("body", { role: "body", slot: 1, base: { route: "stack", bands: [
    { outline: [k.ring.circle(R, [0, 0], SEGMENTS)], z: [0, top] },
    { outline: [k.ring.circle(R, [0, 0], SEGMENTS), k.ring.circle(boreR, [0, 0], SEGMENTS)], z: [top - ov, rimTop] },
  ] } });

  // Paddle, print pose (plate on the bed), every face on a layer top: plate
  // tp, skirt edge Hs, boss tip zb. Assembled, the boss tip rests on the cap
  // top and the skirt edge sits over the body top by the travel to the stop,
  // contact travel plus click.stopOvertravel snapped down a layer so the
  // stop comes no later than the travel eStop is read to. The skirt must
  // outreach the plate and the rim, or the plate lands on the rim first; a
  // shorter paddle is raised and warned.
  const tp = m.layer(p.wall);
  const rimH = rimTop - top;
  let Hs = m.layer(p.H);
  if (Hs < tp + rimH + m.layerHeight) {
    Hs = m.layer(tp + rimH + m.layerHeight);
    k.warn("CLAMP", `paddle height ${p.H.toFixed(2)} mm lands the plate on the rim before the skirt stops, raised to ${Hs.toFixed(2)} mm (computed)`);
  }
  const zb = down(Hs + top + cg + c("click.stopOvertravel") - capTop);
  const travel = capTop + zb - Hs - top;
  const bossR = Math.min(capR, p.D / 2 - p.wall);
  const pr = p.D / 2;
  const at: Vec2 = [R + 6 + pr, 0];
  const paddle = k.body("paddle", { role: "body", slot: 1, base: { route: "revolve", segments: SEGMENTS, axis: { origin: [at[0], at[1], 0], dir: [0, 0, 1] }, profile: [
    [0, 0], [pr, 0], [pr, Hs], [pr - p.wall, Hs], [pr - p.wall, tp], [bossR, tp], [bossR, zb], [0, zb],
  ] } });
  // Pappus over the drawn profile at full density; infill lowers it (unknown).
  const volMm3 = Math.PI * (pr * pr * tp + (pr * pr - (pr - p.wall) ** 2) * (Hs - tp) + bossR * bossR * (zb - tp));
  const density = petg.densityGcm3;
  if (density === undefined) throw new Error("profile material petg has no densityGcm3; the paddle mass needs it");
  const massG = (volMm3 * density) / 1000;

  // The key's routed terminal posts: centre, net and radius, for the jack leads.
  const end = (tag: string) => {
    const f = out.features.find((x) => x.id === `${ID}.0.conductor.post${tag}`);
    if (f === undefined || f.kind !== "conductor" || !("path" in f.region)) throw new Error(`click-spring-key reported no conductor.post${tag}`);
    const xs = f.region.path.map((q) => q[0]), ys = f.region.path.map((q) => q[1]);
    const at: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    return { at, net: f.net, postR: f.width / 2 };
  };
  const jack = jackSeat(k, { R, top, rimTop, l1: skin, trace, l2Top: skin + trace + iso + trace, floor, tw, T: end(""), S: end("Common") });
  const rClosed = metricOf("key.R.switch") + metricOf("key.R.pads") + jack.rLeads;

  // The press claim's band (claim.ts), so the panel and the card read it
  // from the build; the spread needs the sim and lives in the claim test.
  const target = k.profile.constant(PRESS_IDS.targetN), bandPct = k.profile.constant(PRESS_IDS.bandPct);
  const band = pressBand(target.value, bandPct.value);
  const bandTiers = [target.provenance.tier, bandPct.provenance.tier];
  const claimNote = "press.peak band, unproven until coupon; the spread over beam print error and modulus is in the claim test";

  const tier = petg.provenance.tier;
  const metric = (group: string, id: string, value: number, unit: string, note: string, tiers: Parameters<typeof qualify>[0]): Metric =>
    ({ id, value: Number(value.toFixed(3)), unit, ...qualify(tiers), note, gate: "informational", group });
  const claimMetrics: Metric[] = [
    metric("claim", "claim.press.targetN", band.targetN, "N", `${claimNote}; target`, [target.provenance.tier]),
    metric("claim", "claim.press.lo", band.lo, "N", `${claimNote}; low edge`, bandTiers),
    metric("claim", "claim.press.hi", band.hi, "N", `${claimNote}; high edge`, bandTiers),
  ];
  const metrics: Metric[] = [
    ...(out.metrics ?? []),
    metric("paddle", "paddle.massG", massG, "g", `solid paddle volume ${volMm3.toFixed(0)} mm3 at petg density; it rests on the cap and preloads the spring, never subtracted from peakN`, [tier]),
    metric("paddle", "paddle.guideClr", clr, "mm", "diametral, skirt in the guide bore; no CHK-FIT row covers it", [k.profile.constant("access.paddleGuideClr").provenance.tier]),
    metric("paddle", "paddle.travel", travel, "mm", "skirt edge to the body top at rest: contact travel plus stop overtravel, snapped down a layer", [k.profile.constant("click.stopOvertravel").provenance.tier]),
    metric("paddle", "paddle.boss", zb - tp, "mm", "boss from the paddle plate to the cap top", []),
    metric("layout", "layout.diameter", 2 * R, "mm", "body, paddle diameter plus two walls", []),
    metric("layout", "layout.top", top, "mm", "body top, the spring's need", []),
    metric("layout", "layout.rimTop", rimTop, "mm", "rim top, the cap top snapped up a layer", []),
    ...claimMetrics,
    ...jack.metrics,
    metric("jack", "R.closed", rClosed, "ohm", "pressed, T to S: key.R.switch + key.R.pads + R.leads (PIP model.js line 481); the legs in their printed sockets add a contact resistance with no profile row (unknown)", jack.rTiers),
  ];

  return k.part({
    id: "body", name: "ACCESS SWITCH", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body, ...out.bodies, paddle],
    features: [...out.features, ...jack.features],
    metrics,
    assertions: [],
  });
});

// The drive pad's contact function (bench.ts views.drive.contact, G-20): a
// travel stimulus in mm, or a hold that presses the paddle to its stop
// (paddle.travel). The tip closes the pad split once the travel reaches the
// spring's contact travel cg; the force is the archetype's sampled SNAPFE
// curve, linear between samples and held at its ends. One function for the
// pad, the 3D pose, the readout, the curve panel and BENCH.drive.
export const contact: ContactFn = (metrics, target, stimulus) => {
  const num = (id: string): number | undefined => {
    const v = metrics.find((m) => m.id === id)?.value;
    return typeof v === "number" ? v : undefined;
  };
  const key = `${ID}.${target}`;
  const cg = num(`${key}.spring.cg`);
  const stop = num("paddle.travel") ?? 0;
  const asked = stimulus === true ? stop : typeof stimulus === "number" ? stimulus : 0;
  const travel = Math.min(Math.max(asked, 0), stop);
  const n = num(`${key}.spring.curve.n`) ?? 0;
  const d: number[] = [], F: number[] = [];
  for (let i = 0; i < n; i++) {
    const di = num(`${key}.spring.curve.d${i}`), Fi = num(`${key}.spring.curve.F${i}`);
    if (di === undefined || Fi === undefined) break;
    d.push(di);
    F.push(Fi);
  }
  let forceN: number | undefined;
  if (d.length > 0) {
    let j = 1;
    while (j < d.length && d[j]! < travel) j++;
    if (travel <= d[0]!) forceN = F[0]!;
    else if (j >= d.length) forceN = F[d.length - 1]!;
    else {
      const span = d[j]! - d[j - 1]!;
      forceN = span > 0 ? F[j - 1]! + ((F[j]! - F[j - 1]!) * (travel - d[j - 1]!)) / span : F[j]!;
    }
  }
  return {
    closed: cg !== undefined && travel >= cg ? [`${key}.conductor.pad`, `${key}.conductor.padCommon`] : [],
    pose: { travelMm: travel },
    ...(forceN === undefined ? {} : { forceN }),
  };
};
