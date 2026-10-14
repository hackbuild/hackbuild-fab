// reference/keys/flex-pair/build.ts
// The reduced keys flex-pair build (M-S walking skeleton, D-179) and the
// drive pad's contact function. Conditionals and loops live here, never in
// chase.ts. Its bytes enter defHash (D-174, D-178).
//
// Each key is the PIP flex cone key (pip.md 5.1, D-085, D-223), ported from
// pip-controller src/layout.js flexDims (lines 149 to 160) and src/model.js
// (the flex branch, lines 61 to 88): a TPU 95A cone and its buried foot
// ring as one revolved profile on slot 3, wall 0.6 mm at 40 degrees, foot
// ring one layer into the body; a separate cTPU cap disc on slot 4, radius
// rnt + 0.3 mm and 0.72 mm thick, bridging the 3.6 mm hole; the TPU key top
// (collar, 45 degree flare, face disc) as a second revolved profile; under
// the cap a split cPLA column on slot 2, radius colR = max(0.9, rh - 0.2) =
// 1.6 mm drawn with 40 sides, halves 0.8 mm apart, rising from the trace
// band to colTop = zf + cone - gap; and a well of radius wellR = rsb + 0.6
// mm cut from the pad.
// A press closes the gap and the cap bridges the K<n> half to the GND half
// (contact.key<n>, actuator cap<n> moving along -z); K<n> and GND may share
// only that cap (apartExcept, cut cap<n>).
//
// Lineage: the rows pip.model/pip-controller-b137deb and
// pip.layout/pip-controller-b137deb are the copies read here. The split is
// drawn at colGap, with no print bleed: bleed is a profile field applied
// once at emit, default 0 (D-084), which equals haft (9) model.js at bleed 0
// (its cg2 = (colGap + bleed) / 2, line 64). The build never adds bleed.
//
// Deviations from PIP, each named where it lands: the key height counts the
// collar layer as this machine's layer height, not PIP's literal 0.24
// (layout.js line 157), so the face stays faceT thick on any preset.
//
// The pad top is PIP's body top: the flex need subtracts the bezel
// (layout.js line 223, pip.md 4.3) though no bezel is printed here, so the
// cap and key top stand above the pad as they stand above PIP's printed body
// and the face stands bezel + protrude proud. Without the bezel term the
// cap top lies five layers under the pad top, inside the pad's top shells,
// and Flash Studio (Orca-Flashforge 2.3.2) prints the pad's first top shell
// layer, an internal bridge, in PETG across the key top interior over the
// cap (virtual print 2026-10-07, computed from the G-code).
//
// Layout on the trace face (computed from the defaults): key n's trace runs
// from under its own half, 1.1 mm right of the key centre (colGap / 2 + w /
// 2), straight to the bottom edge at y = -H/2, 15 mm; a GND stub runs from
// under the other half, 1.1 mm left, up to the GND bus at y = 3 mm, which
// runs from the leftmost key to the right edge, 30 mm. Edge to edge the bus
// clears each key trace by 1.6 mm and the K<n> column half by 0.756 mm, and
// each lead clears the other net's half by 0.8 mm (round ends,
// spec/features.ts ConductorFeature), above the 0.60 mm net-to-net floor
// (D-085). Each key net ends at an rp2040 pin read by
// charge-release with a 3500 us wait (inferred margin over the measured
// 113 to 2431 us crossings, D-079) until a coupon calibrates it.

import { defineBuild, qualify, type Assertion, type BodyDraft, type ContactFn, type FaceFrame, type Feature, type Metric, type Ring, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

const top = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });

// PIP flex key source values (pip-controller src/layout.js line 35), not
// profile rows: cone wall 0.6 mm at 40 degrees, a 3.6 mm hole at the cone
// top closed by a 0.72 mm cTPU cap, face disc 1.2 mm thick standing 2.6 mm
// proud, split column halves 0.8 mm apart. Cone height, face and travel
// come from params.
// The column radius is max(colRMin, hole / 2 - colInset); the well clears
// the cone base by wellClear; the cap overhangs the cone top by capOver
// (src/layout.js lines 149 to 160, src/model.js lines 83 and 87).
// bezel is PIP's stack.bezel (src/layout.js lines 27 and 219), the height
// the flex need and the key floor step over (lines 223 and 231).
const FLEX = {
  wall: 0.6, alphaDeg: 40, hole: 3.6, cap: 0.72, faceT: 1.2, protrude: 2.6, colGap: 0.8,
  colRMin: 0.9, colInset: 0.2, wellClear: 0.6, capOver: 0.3, bezel: 2.4,
} as const;
// PIP's rules and fits rows for the flex key (src/model.js lines 455 to 462
// and 527 to 530): cap bridge at most 4.5 mm, split at least 0.6 mm, column
// to cone wall over 0.5 mm, face proud at least 0.8 mm, smallest feature at
// least 0.4 mm (source values).
const FITS = { bridgeMax: 4.5, splitMin: 0.6, wallMin: 0.5, proudMin: 0.8, featureMin: 0.4 } as const;
// PIP's EZ (src/model.js line 8): the overlap that keeps a revolved profile
// vertex off a cavity face (CHK-KEY-06), mm.
const EZ = 0.02;
// Revolve columns per key, as PIP's lathe (src/model.js lines 80 and 86).
const SEGMENTS = 64;
// Sides of the split contact column, as PIP's circle(colR, x, y, 40)
// (src/model.js line 65).
const COLUMN_SEGMENTS = 40;
// The clip pad a lead ends in (M05-T18 step 3): 3 x 3 mm, inferred, a plan
// value with no clip coupon behind it. PadFeature carries no position, so
// the pad generates no solid; its note names where the trace meets the pad
// edge, and circuit extraction reads it as a terminal of its net.
const CLIP_PAD: Vec2 = [3, 3];
// PIP's feel readout over wall across / cone height (bench/part3.js line
// 429, src/model.js line 441): soft under 0.16, medium under 0.24, stiff
// from 0.24 (source values).
const FEEL = { soft: 0.16, medium: 0.24 } as const;

/** The half of a ring on one side of the line x = cut, with the crossing points added. */
const halfRing = (ring: Ring, cut: number, side: 1 | -1): Ring => {
  const out: Vec2[] = [];
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length] ?? a;
    const da = side * (a[0] - cut);
    const db = side * (b[0] - cut);
    if (da >= 0) out.push(a);
    if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
      const t = da / (da - db);
      out.push([cut, a[1] + t * (b[1] - a[1])]);
    }
  });
  return out;
};

// Reduced build: stack, pad body, a GND bus with its clip pad, and per key
// the PIP flex key: TPU cone with its foot ring, cTPU cap, TPU key top, a
// split cPLA contact column under the cap (one half per net), the well, a
// key trace from its own half, a GND stub from the other half to the bus,
// a contact, a port, a clip pad at the key trace end, a travel metric
// gated by CHK-KEY-01 and PIP's fits rows.
export const build = defineBuild(chase, (p, k) => {
  const m = k.machine("ffc5p");
  // m.layer snaps an absolute z to a layer top (first layer included), so
  // each thickness snaps through its top.
  const skin = m.layer(0.72);
  const band = m.layer(skin + 0.72) - skin;
  // The isolation top is PIP's z.floor: the lowest key floor.
  const z0 = m.layer(skin + band + 0.96);
  const lay = m.layerHeight;
  // Nearest layer top, PIP's snapN on this machine's grid.
  const snapNear = (z: number): number => {
    const up = m.layer(z);
    const down = m.layerTop(Math.max(0, m.layerIndex(z) - 1));
    return up - z <= z - down ? up : down;
  };
  // The top of the last layer a slicer prints a solid ending at z: the
  // slicer cuts each layer at its mid-height (inferred, PrusaSlicer family),
  // so a solid reaches a layer only when it passes that layer's middle.
  const printedTop = (z: number): number => {
    const i = m.layerIndex(z);
    const mid = m.layerTop(i) - (i === 0 ? m.firstLayer : lay) / 2;
    return mid < z - 1e-9 ? m.layerTop(i) : i === 0 ? 0 : m.layerTop(i - 1);
  };

  // flexDims (src/layout.js lines 149 to 160).
  const alpha = (FLEX.alphaDeg * Math.PI) / 180;
  const wallH = FLEX.wall / Math.sin(Math.PI / 2 - alpha);
  const rh = FLEX.hole / 2;
  const rnt = rh + wallH;
  const colR = Math.max(FLEX.colRMin, rh - FLEX.colInset);
  const cg2 = FLEX.colGap / 2;
  // PIP writes the collar layer as 0.24 (layout.js line 157); here it is
  // lay, the same layer zA steps over, so the face disc is faceT thick.
  const keyHOf = (cone: number, d: number): number => cone + FLEX.cap + lay + Math.max(0, d / 2 - rnt) + FLEX.faceT;
  // The cone top snaps to a layer top so the cap starts on a layer.
  const coneOf = (h: number) => m.layer(z0 + h) - z0;

  // Body top from the flex need (src/layout.js lines 223 to 227): the face
  // stands bezel + protrude above it. PIP's layout reads the cone param, as here.
  const needs = p.keys.map((key) => z0 + keyHOf(key.cone, key.d) - FLEX.protrude - FLEX.bezel);
  const T = k.derive("padThickness", m.layer(Math.max(...needs)),
    "isolation top + key height - protrude - bezel, snapped up to a layer top (PIP layout.js flex need)", ["/keys/*/cone", "/keys/*/d"]);

  const outline: Ring = k.ring.roundRect(p.W, p.H, p.r);
  const pad = k.body("pad", { role: "body", slot: 1, base: { route: "prism", outline: [outline], z: [0, T] } });
  // Each lead centreline sits w / 2 past the split, so its edge clears the
  // other net's half by colGap.
  const lead = cg2 + p.w / 2;

  const flex: BodyDraft[] = [];
  const features: Feature[] = [];
  const metrics: Metric[] = [];
  const nets: string[] = ["GND"];
  const pressed: Assertion[] = [];

  const busY = 3;
  const busStart = Math.min(...p.keys.map((key) => key.x));
  const bus: readonly Vec2[] = [[busStart, busY], [p.W / 2, busY]];
  features.push(
    { kind: "conductor", id: "conductor.gnd", body: "pad", material: "cpla", net: "GND",
      region: { centreline: bus, face: top(skin) }, width: p.w, t: band },
    { kind: "port", id: "port.gnd", body: "pad", net: "GND", type: "gnd", interface: "digital" },
  );
  // One clip pad per net at its trace end; wire cups get no pad kind (D-096).
  const clip = (net: string, id: string, at: Vec2): void => {
    if (p.pads === "clip") {
      features.push({ kind: "pad", id, body: "pad", net, size: CLIP_PAD, for: "clip",
        note: `clip pad where the ${net} trace meets the pad edge at x ${Number(at[0].toFixed(3))}, y ${Number(at[1].toFixed(3))} mm (computed)` });
    }
  };
  clip("GND", "pad.gnd", bus[bus.length - 1] ?? [p.W / 2, busY]);

  const fit = (id: string, value: number, ok: boolean, note: string, drivenBy: readonly string[]): void => {
    metrics.push({ id, value: Number(value.toFixed(3)), unit: "mm", ...qualify([]), note, drivenBy, gate: "informational", group: "fits" });
    if (!ok) k.warn("FIT", `${id} is ${value.toFixed(2)} mm, ${note}`);
  };

  p.keys.forEach((key, i) => {
    const n = i + 1;
    const at: Vec2 = [key.x, 0];
    const axis = { origin: [key.x, 0, 0] as const, dir: [0, 0, 1] as const };
    // Key floor (src/layout.js line 231): the face stands bezel + protrude above the top.
    const zf = snapNear(Math.max(z0, T + FLEX.bezel + FLEX.protrude - keyHOf(key.cone, key.d)));
    const cone = coneOf(key.cone);
    const rsb = rnt + cone * Math.tan(alpha);
    const rIn = rsb - wallH;
    const rFace = key.d / 2;
    const flare = Math.max(0, rFace - rnt);
    const keyH = keyHOf(cone, key.d);
    const wellR = rsb + FLEX.wellClear;
    const colTop = zf + cone - key.gap;
    const zc0 = zf + cone;
    const zc1 = zc0 + FLEX.cap;
    const kt = (zc0 + EZ - zf) / cone;
    const zIn = zf + (EZ * cone) / Math.max(0.1, rIn - rh);
    const zA = zc1 + lay;

    // Cone and its buried foot ring as one revolved profile, from one layer
    // into the body; the kinks sit EZ inside the well so no profile vertex
    // lands on a cavity face (src/model.js lines 77 to 81, CHK-KEY-06).
    flex.push(k.body(`cone${n}`, { role: "flex", slot: 3, base: { route: "revolve", axis, segments: SEGMENTS, profile: [
      [rIn - EZ, z0 - lay], [rsb, z0 - lay], [rsb, zf + EZ], [rsb + (rnt - rsb) * kt, zc0 + EZ],
      [rIn + (rh - rIn) * kt, zc0 + EZ], [rIn - EZ, zIn],
    ] } }));
    // The cap disc bridges the hole unsupported (src/model.js line 83).
    flex.push(k.body(`cap${n}`, { role: "flex-conductor", slot: 4, base: { route: "prism", outline: [k.ring.circle(rnt + FLEX.capOver, at, SEGMENTS)], z: [zc0, zc1] } }));
    // Key top: collar over the cap, 45 degree flare, face disc, one profile (src/model.js line 86).
    flex.push(k.body(`top${n}`, { role: "flex", slot: 3, base: { route: "revolve", axis, segments: SEGMENTS, profile: [
      [0, zc1 - EZ], [rnt, zc1 - EZ], [rnt, zA], [rFace, zA + flare], [rFace, zf + keyH], [0, zf + keyH],
    ] } }));
    if (colR + FLEX.wellClear > rh + key.gap * Math.tan(alpha)) k.warn("COLUMN_WALL", `key ${n}: contact column nearly touches the cone wall`);

    const column = k.ring.circle(colR, at, COLUMN_SEGMENTS);
    features.push(
      // The well (src/model.js line 87), cut from the key floor to the top.
      { kind: "pocket", id: `pocket.key${n}`, body: "pad", outline: k.ring.circle(wellR, at, SEGMENTS),
        face: top(T), depth: T - zf, floor: "flat", fit: { class: k.fit("LOCATE"), drawnPerSide: FLEX.wellClear, basis: "perSide" } },
    );
    // A key floor above the body floor opens a cylinder rIn under the cone (src/model.js line 82).
    if (zf > z0 + 1e-6) {
      features.push({ kind: "pocket", id: `pocket.key${n}under`, body: "pad", outline: k.ring.circle(rIn, at, SEGMENTS),
        face: top(zf + EZ), depth: zf + EZ - z0, floor: "flat", fit: { class: k.fit("LOCATE"), drawnPerSide: 0, basis: "perSide" } });
    }
    features.push(
      { kind: "conductor", id: `conductor.key${n}col`, body: "pad", material: "cpla", net: `K${n}`,
        region: { path: halfRing(column, key.x + cg2, 1), face: top(skin) }, width: colR - cg2, t: colTop - skin },
      { kind: "conductor", id: `conductor.gnd${n}col`, body: "pad", material: "cpla", net: "GND",
        region: { path: halfRing(column, key.x - cg2, -1), face: top(skin) }, width: colR - cg2, t: colTop - skin },
      { kind: "conductor", id: `conductor.key${n}`, body: "pad", material: "cpla", net: `K${n}`,
        region: { centreline: [[key.x + lead, 0], [key.x + lead, -p.H / 2]], face: top(skin) }, width: p.w, t: band },
      { kind: "conductor", id: `conductor.gnd${n}stub`, body: "pad", material: "cpla", net: "GND",
        region: { centreline: [[key.x - lead, 0], [key.x - lead, busY]], face: top(skin) }, width: p.w, t: band },
      // A press moves the cap straight down by the travel onto both column halves (CHK-NET-27, M05-T19).
      { kind: "contact", id: `contact.key${n}`, a: `conductor.key${n}col`, b: `conductor.gnd${n}col`,
        forceMinN: 0.5, maxOhm: 2e6, gap: key.gap, coneH: cone, actuator: `cap${n}`, axis: [0, 0, -1] },
      { kind: "port", id: `port.key${n}`, body: "pad", net: `K${n}`, type: "signal", interface: "digital" },
    );
    clip(`K${n}`, `pad.key${n}`, [key.x + lead, -p.H / 2]);
    nets.push(`K${n}`);
    // K<n> and GND may share only the cap: pressed they join through it, without it they fall apart (CHK-NET-26, M05-T19).
    pressed.push({ type: "apartExcept", nets: [`K${n}`, "GND"], cut: `cap${n}` });
    metrics.push({ id: `keys.${n}.travel`, value: key.gap, unit: "mm", ...qualify([]),
      note: `${Math.round((100 * key.gap) / cone)} percent of the cone`, drivenBy: [`/keys/${i}/gap`], gate: "CHK-KEY-01", group: "keys" });
    // The travel as sliced: colTop is a layer top only when the gap is a
    // whole number of layers, so the column ends one layer lower otherwise.
    const printed = zc0 - printedTop(colTop);
    metrics.push({ id: `keys.${n}.printedTravel`, value: Number(printed.toFixed(3)), unit: "mm", ...qualify([]),
      note: `cap underside to the last sliced column layer, ${Math.round((100 * printed) / cone)} percent of the cone (mid-layer slicing inferred)`,
      drivenBy: [`/keys/${i}/gap`, `/keys/${i}/cone`], gate: "informational", group: "keys" });
    const feel = wallH / key.cone;
    metrics.push({ id: `keys.${n}.feel`, value: Number(feel.toFixed(3)), ...qualify([]),
      note: `${feel < FEEL.soft ? "soft" : feel < FEEL.medium ? "medium" : "stiff"}: wall across over cone height, soft under ${FEEL.soft}, medium under ${FEEL.medium}, stiff above (PIP bench/part3.js line 429)`,
      drivenBy: [`/keys/${i}/cone`], gate: "informational", group: "keys" });
    fit(`keys.${n}.capBridge`, FLEX.hole, FLEX.hole <= FITS.bridgeMax, "conductive TPU spanning the hole, unsupported", []);
    fit(`keys.${n}.split`, FLEX.colGap, FLEX.colGap >= FITS.splitMin, "exposed, a string across it reads as a press", []);
    const wallGap = rh + key.gap * Math.tan(alpha) - colR;
    fit(`keys.${n}.columnToWall`, wallGap, wallGap > FITS.wallMin, "at the top of the column", [`/keys/${i}/gap`]);
    const proud = zf + keyH - T;
    fit(`keys.${n}.proud`, proud, proud >= FITS.proudMin, "face above the pad top", [`/keys/${i}/cone`, `/keys/${i}/d`]);
  });
  const smallest = Math.min(p.w, FLEX.colGap, FLEX.wall);
  fit("print.smallestFeature", smallest, smallest >= FITS.featureMin, smallest < 0.6 ? "under one nozzle width, check it slices" : "least of trace width, split and cone wall", ["/w"]);
  const assertions: Assertion[] = [{ type: "apart", nets }, ...pressed];
  if (p.pads === "cup") k.warn("LEADS", "wire cups chosen; clip pads are the tested lead");

  return k.part({
    id: "pad", name: "FLEX PAIR", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [pad, ...flex],
    features, metrics, assertions,
  });
});

// The drive pad's contact function: a held key closes its contact. One
// function for the pad, the 3D pose, the readout and BENCH.drive (G-20).
export const contact: ContactFn = (metrics, target, stimulus) => {
  const travel = metrics.find((m) => m.id === `keys.${target}.travel`);
  const held = stimulus === true;
  return {
    closed: held && travel ? [`contact.key${target}`] : [],
    pose: { travelMm: held && typeof travel?.value === "number" ? travel.value : 0 },
  };
};
