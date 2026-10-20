// reference/keys/access-switch/coupon/build.ts
// Three click-spring-key cells (Author.arch), one per rung, each placed as
// the switch places its spring (../build.ts): on the stack floor face, the
// slot along x, span, rise, width and the PETG modulus read through
// k.profile. Each cell asks for its own host top, so the frame is one
// block per cell, each to that cell's top; a rung's spring then sits in
// the frame exactly as the switch's would at that beam. The rung number
// is debossed beside each slot as bars, at PIP's label stroke and depth
// (coupon.js lines 163 to 165), since no text route debosses an FDM face.
//
// Force only: the archetype's pads, posts and ports are dropped, and the
// tip prints in the cap's TPU, so nothing conducts. The springs, caps and
// coin cups print beside the frame. A cup is a PETG revolve, upright,
// whose underside is a cone socket that centres it on the cap top; the
// cone is as steep as profile overhang.maxDeg allows, snapped up a layer.
// Conditionals live here (D-178).

import { defineBuild, qualify, type BodyDraft, type FaceFrame, type Metric, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "click-spring-key";
const SEGMENTS = 64;
/** Standard gravity, m/s2, exact by definition (CGPM 1901). */
const STANDARD_GRAVITY = 9.80665;
/** PIP coupon label stroke and deboss depth, mm (coupon.js lines 163 and 165) and pad label height (line 37). */
const MARK = { stroke: 0.6, depth: 0.48, h: 2.6 } as const;
/** PIP font advance over cap height (font.js line 29: s h / 6, adv 5.6 s). */
const MARK_ADVANCE = 5.6 / 6;
const up = (at: Vec2, z: number): FaceFrame => ({ origin: [at[0], at[1], z], normal: [0, 0, 1], u: [1, 0, 0] });

/** Prisms of a CSG union, in order, with their z spans and outer rings. */
const prismsOf = (s: ShapeDecl): { z: readonly [number, number]; ring: readonly Vec2[] }[] =>
  s.route === "prism" ? [{ z: s.z, ring: s.outline[0] ?? [] }] : s.route === "csg" ? s.of.flatMap(prismsOf) : [];
const boxOf = (ring: readonly Vec2[]) => {
  const xs = ring.map((q) => q[0]), ys = ring.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
/** Volume of a closed (r, z) profile turned about z, Pappus: 2 pi area centroid radius. */
const turnedVolume = (pts: readonly Vec2[]): number => {
  let a2 = 0, m = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    const c = p[0] * q[1] - q[0] * p[1];
    a2 += c; m += (p[0] + q[0]) * c;
  });
  return Math.abs((Math.PI * m) / 3);
};

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const floor = c("stack.skin") + c("stack.trace") + c("stack.iso") + c("stack.trace") + c("stack.overL2");
  const petg = k.profile.material("petg");
  const E = petg.modulusMPa;
  if (E === undefined) throw new Error("profile material petg has no modulusMPa; the spring needs it");
  const density = petg.densityGcm3;
  if (density === undefined) throw new Error("profile material petg has no densityGcm3; the cup mass needs it");
  const coin = k.profile.constant("coupon.coinMassG");
  const m = k.machine();

  // Cup, print pose: cone socket from (rs, 0) up to its apex at s, floor
  // over the apex, wall to the rim. Assembled it rests on the cap top.
  const ro = p.cup / 2 + p.wall;
  // Cups side by side with a rim between them set the cell pitch.
  const pitch = ro * 2 + p.rim;
  const rows = 3;
  const ts = [p.t1, p.t2, p.t3];
  const ys = ts.map((_, i) => (i - (rows - 1) / 2) * -pitch);
  // Loose rows past the last cell's half pitch: a spring stands about 9 mm
  // above its row line and its cap 6.2 mm below (archetype defaults), so
  // rows 18 mm apart and 13 mm clear of the frame keep them apart.
  const rowY = (j: number): number => ys[rows - 1]! - pitch / 2 - 13 - 18 * j;

  const cells = ts.map((t, i) => {
    const out = k.arch(ID, up([0, ys[i]!], floor), { l: p.l, t, Q: p.Q, w: p.w, E, loose: [-12, rowY(i) - ys[i]!] });
    const metricOf = (id: string): number => {
      const v = out.metrics?.find((x) => x.id === `${ID}.${i}.${id}`)?.value;
      if (typeof v !== "number") throw new Error(`click-spring-key ${i} reported no ${id}`);
      return v;
    };
    const ringOf = (id: string): readonly Vec2[] => {
      const f = out.features.find((x) => x.id === `${ID}.${i}.${id}`);
      return f !== undefined && f.kind === "pocket" ? f.outline : [];
    };
    const cap = out.bodies.find((b) => b.id === `${ID}.${i}.cap` || b.id === "cap");
    const capPrisms = cap === undefined ? [] : prismsOf(cap.base);
    if (capPrisms.length < 2) throw new Error(`click-spring-key ${i} cap is not a flange and a stem`);
    const top = metricOf("host.top");
    const stem = boxOf(capPrisms[1]!.ring);
    return {
      i, t, out, top, peakN: metricOf("spring.peakN"),
      slot: boxOf(ringOf("pocket.slot")),
      well: boxOf(ringOf("pocket.capWell")),
      // Stem steps above the flange, assembled: radius and top z of each.
      steps: capPrisms.slice(1).map((q) => { const b = boxOf(q.ring); return { r: (b.x1 - b.x0) / 2, z: top - capPrisms[0]!.z[1] + q.z[1] }; }),
      capR: (stem.x1 - stem.x0) / 2,
    };
  });

  // Frame: one block per cell to its top, as deep as the cap well plus a
  // rim each side, the rung bars past the slot's +x end, on a plate to the
  // stack floor that ties the blocks into one solid.
  const sx0 = Math.min(...cells.map((q) => q.slot.x0)), sx1 = Math.max(...cells.map((q) => q.slot.x1));
  const barPitch = MARK.h * MARK_ADVANCE;
  const x0 = sx0 - p.rim, xb = sx1 + p.rim, x1 = xb + rows * barPitch + p.rim;
  const prism = (w: number, h: number, at: Vec2, z0: number, z1: number): ShapeDecl =>
    ({ route: "prism", outline: [k.ring.roundRect(w, h, 0, at)], z: [z0, z1] });
  const bw = Math.max(...cells.map((q) => q.well.y1 - q.well.y0)) + 2 * p.rim;
  const span = (rows - 1) * pitch + bw;
  const blocks = [
    prism(x1 - x0, span, [(x0 + x1) / 2, 0], 0, floor),
    ...cells.map((q) => prism(x1 - x0, bw, [(x0 + x1) / 2, ys[q.i]!], 0, q.top)),
  ];
  const depth = m.layer(MARK.depth);
  const bars = cells.flatMap((q) => Array.from({ length: q.i + 1 }, (_, b) =>
    prism(MARK.stroke, MARK.h, [xb + (b + 0.5) * barPitch, ys[q.i]!], q.top - depth, q.top + 0.02)));
  const frame = k.body("body", { role: "body", slot: 1, base: { route: "csg", op: "difference", of: [{ route: "csg", op: "union", of: blocks }, ...bars] } });

  const rs = Math.max(...cells.map((q) => q.capR)) + c("access.paddleGuideClr") / 2;
  const s = m.layer(rs / Math.tan((c("overhang.maxDeg") * Math.PI) / 180));
  const fb = m.layer(s + p.wall), rimZ = m.layer(fb + p.cupH);
  const profile: Vec2[] = [[0, s], [rs, 0], [ro, 0], [ro, rimZ], [ro - p.wall, rimZ], [ro - p.wall, fb], [0, fb]];
  const cupX = x1 + 4 + ro;
  const cups: BodyDraft[] = cells.map((q) => k.body(`cup${q.i + 1}`, { role: "body", slot: 1, base: {
    route: "revolve", segments: SEGMENTS, axis: { origin: [cupX, ys[q.i]!, 0], dir: [0, 0, 1] }, profile,
  } }));
  // At rest the cone touches the highest stem corner it meets: the cup's
  // underside sits at the most of corner z less the cone rise at its radius.
  const lift = Math.min(...cells.map((q) => Math.max(...q.steps.map((st) => st.z - s * Math.max(0, 1 - st.r / rs))) - q.top));
  // Pappus over the drawn profile at full density; infill lowers it (unknown).
  const cupG = (turnedVolume(profile) * density) / 1000;

  const tpu = (b: BodyDraft): BodyDraft => (b.material === "ctpu" ? { ...b, material: "tpu95", role: "flex", slot: 3 } : b);
  const dropped = new Set(["conductor", "port", "pad"]);

  const tier = petg.provenance.tier;
  const metric = (group: string, id: string, value: number, unit: string, note: string, tiers: Parameters<typeof qualify>[0]): Metric =>
    ({ id, value: Number(value.toFixed(3)), unit, ...qualify(tiers), note, gate: "informational", group });
  const metrics: Metric[] = [
    ...cells.flatMap((q) => (q.out.metrics ?? []).filter((x) => !x.id.includes(".R."))),
    ...cells.flatMap((q) => {
      const g = (q.peakN / STANDARD_GRAVITY) * 1000;
      const n = `rung.${q.i + 1}`;
      return [
        metric("rungs", `${n}.t`, q.t, "mm", `drawn beam of the cell marked with ${q.i + 1} bar${q.i === 0 ? "" : "s"}`, []),
        metric("rungs", `${n}.peakG`, g, "g", `${ID}.${q.i}.spring.peakN over standard gravity (SNAPFE, PETG modulus)`, [tier]),
        metric("rungs", `${n}.coins`, g / coin.value, "count", "peak g over coupon.coinMassG, coins in the cup to snap; the cup and cap rest on the spring too and are not subtracted", [tier, coin.provenance.tier]),
      ];
    }),
    metric("cup", "cup.massG", cupG, "g", `solid cup volume at petg density, ${(cupG / coin.value).toFixed(2)} coins of preload, never subtracted from a rung`, [tier]),
    metric("cup", "cup.socket", s, "mm", "cone socket depth, the cap stem radius plus half access.paddleGuideClr at overhang.maxDeg, snapped up a layer", [k.profile.constant("overhang.maxDeg").provenance.tier]),
    metric("cup", "cup.lift", lift, "mm", "least cup underside height over its block top at rest, the cone seated on the cap's stem corners; the cup never lands on the frame while it exceeds the stop travel", []),
    metric("layout", "layout.size", x1 - x0, "mm", "frame along the slots", []),
    metric("layout", "layout.depth", span, "mm", "frame across the slots: cells one cup pitch apart, each block the cap well plus a rim each side", []),
  ];

  return k.part({
    id: "body", name: "ACCESS SWITCH COUPON", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [frame, ...cells.flatMap((q) => q.out.bodies.map(tpu)), ...cups],
    features: cells.flatMap((q) => q.out.features.filter((f) => !dropped.has(f.kind))),
    metrics,
    assertions: [],
  });
});
