// designs/bail/build.ts
// The BAIL build, written the way a skill page writes one against
// @hackbuild/engine (docs/skill/LIBRARIES.md, "writing a build"): params in,
// a part draft out, geometry through the author calls on `k`. It imports spec
// only. Ported from bail.html (canonical, D-222; knowledge/designs/bail.md):
//   the blank shapes     blankPath, 1508 to 1529
//   the clasp numbers    claspGeom, 1685 to 1697, and buildSlide, 1699 to 1795
//   the store back       applyBackHw, 1112 to 1120
//   the tips             tipProfile and buildTip, 1879 to 2018
//   the plate            plateLayout, 2049 to 2068
// What the kernel offered differently is listed in README.md. The slide is a
// prism in the body slot with one inlay feature per art slot, as
// reference/cosmetic/art-layers does; the rim, the clasp bodies and the tips
// are further bodies of the one part, laid out on the plate. The rim is a ring
// prism through the whole thickness in the rim slot and the slide prism stands
// inside it, as BAIL labels the rim band on every layer (composeFace, 1635).

import {
  canonicalize, commandError, defineBuild, qualify, qualifyRow, sha256Hex,
  type ArtDocument, type ArtLayer, type Bound, type BodyDraft, type FaceFrame, type Feature, type Qualification, type Ring, type ShapeDecl, type Vec2,
} from "@hackbuild/spec";
import { chase } from "./chase";

/** Evidence file the rigid fin warning names (the owner's print note). */
const PRINT_NOTE = "fab-knowledge:originals/bail/evidence/PRINT-NOTES.md, entered 2026-11-02";

/**
 * The family and weight of BAIL's font keys (bail.html FONTS and FONTW, 1068 and 1069); plexb lowers to 700.
 * The node text route carries only IBM Plex Mono (kernels/art-inlay), so marker, elite and vt set in Plex bold
 * and the build says so; the faces return when the route carries them.
 */
const FONT = {
  marker: { family: "IBM Plex Mono", bold: true, swap: "Permanent Marker" }, plexb: { family: "IBM Plex Mono", bold: true }, plex: { family: "IBM Plex Mono", bold: false },
  elite: { family: "IBM Plex Mono", bold: true, swap: "Special Elite" }, vt: { family: "IBM Plex Mono", bold: true, swap: "VT323" },
} as const satisfies Record<string, { family: string; bold: boolean; swap?: string }>;

/**
 * BAIL's own limits, read from the bench and not yet profile rows (README, "numbers awaiting profile rows").
 * Each is quoted in its warning with the bail.html line it is read from and the qualifier inferred.
 */
const PAD_EDGE_MM = 1.2; // bail.html 1776
const BRIDGE_EDGE_MM = 0.6; // bail.html 1771
const BRIDGE_TRIM_ERR = 0.05; // bail.html 1788
const KIT_BORE_TOL_MM = 0.05; // bail.html 1977
const TIP_WALL_MM = 0.9; // bail.html 1986
const TIP_SLOPE_MAX = 1.05; // bail.html 1992
/** Catalog row bail-tips-kit32 (packages/catalog/data/connectors), tier inferred; test/catalog.test.ts holds this equal to the row. */
const KIT_TIP = { row: "bail-tips-kit32", lengthMm: 32, diameterMm: 8.8, boreMm: 4 } as const;

type Paint = Record<string, unknown>;

const r4 = (v: number): number => Math.round(v * 1e4) / 1e4;
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** A floor or ceiling a warning quotes; kernel inlay because the slide, bridges and tips ride on the inlay host. */
const limit = (value: number, side: "lo" | "hi", reason: string, source: string, q: Qualification): Bound => ({ value, side, kernel: "inlay", reason, source, ...q });
/** BAIL's rule of thumb, qualifier inferred. */
const OWNER_RULE = qualifyRow("inferred");
/** An equation over params and geometry, no profile row read. */
const COMPUTED = qualify([]);

/** Even-odd containment of a point in a ring. */
function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to the nearest edge of a ring, mm. */
function edgeDist(x: number, y: number, ring: Ring): number {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j]!, [bx, by] = ring[i]!, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

/** Points along a ring at most `step` mm apart. */
function along(ring: Ring, step: number): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]!, [bx, by] = ring[(i + 1) % ring.length]!, n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let s = 0; s < n; s++) out.push([ax + (bx - ax) * s / n, ay + (by - ay) * s / n]);
  }
  return out;
}

/** TIP_DEFAULTS bands (bail.html 1879 to 1946): the profile as [z, r] points and the bands as [z0, role]. */
function tipProfile(kind: string, L: number, R: number): { pts: Vec2[]; bands: [number, string][] } {
  const c = Math.min(0.4, R * 0.1);
  const dome = (z0: number, r0: number, h: number, n: number): Vec2[] => {
    const o: Vec2[] = [];
    for (let i = 1; i <= n; i++) { const t = i / n * Math.PI / 2; o.push([z0 + h * Math.sin(t), i === n ? 0 : r0 * Math.cos(t)]); }
    return o;
  };
  switch (kind) {
    case "bullet":
      return { pts: [[0, R - c], [c, R], [0.16 * L, R], [0.16 * L, 0.9 * R], [0.6 * L, 0.9 * R], ...dome(0.6 * L, 0.9 * R, 0.4 * L, 16)], bands: [[0, "B"], [0.16 * L, "A"], [0.55 * L, "B"], [0.6 * L, "A"]] };
    case "cone": {
      const tr = 0.34 * R, zt = L - tr;
      return { pts: [[0, R - c], [c, R], [0.12 * L, R], [0.12 * L, 0.94 * R], [zt, tr], ...dome(zt, tr, tr, 8)], bands: [[0, "B"], [0.12 * L, "A"], [zt, "B"]] };
    }
    case "jack":
      return {
        pts: [[0, R - c], [c, R], [0.42 * L, R], [0.46 * L, 0.74 * R], [0.46 * L, 0.5 * R], [0.68 * L, 0.5 * R], [0.68 * L, 0.42 * R], [0.72 * L, 0.42 * R], [0.72 * L, 0.5 * R],
          [0.83 * L, 0.5 * R], [0.83 * L, 0.42 * R], [0.87 * L, 0.42 * R], [0.87 * L, 0.5 * R], [0.94 * L, 0.5 * R], [0.965 * L, 0.3 * R], ...dome(0.965 * L, 0.3 * R, 0.035 * L, 6)],
        bands: [[0, "A"], [0.46 * L, "B"], [0.68 * L, "C"], [0.72 * L, "B"], [0.83 * L, "C"], [0.87 * L, "B"]],
      };
    case "probe": {
      const hr = 0.9 * R, pr = 0.06 * L, zg = 0.55 * L;
      const pts: Vec2[] = [[0, hr - c], [c, hr], [0.08 * L, hr]];
      for (let z = 0.08 * L; z + pr <= 0.5 * L; z += pr) { pts.push([z + pr / 2, hr + 0.12 * R]); pts.push([z + pr, hr]); }
      pts.push([zg, hr], [zg + 0.4 * R, 1.24 * R], [zg + 0.4 * R + 0.04 * L, 1.24 * R], [zg + 0.4 * R + 0.04 * L, 0.28 * R], [0.9 * L, 0.28 * R], [L, 0]);
      return { pts, bands: [[0, "A"], [zg, "B"], [zg + 0.4 * R + 0.04 * L, "C"]] };
    }
    case "fuse": {
      const c2 = Math.min(0.6, R * 0.12);
      return { pts: [[0, R - c], [c, R], [0.18 * L, R], [0.18 * L, 0.86 * R], [0.82 * L, 0.86 * R], [0.82 * L + 0.14 * R, R], [L - c2, R], [L, R - c2], [L, 0]], bands: [[0, "B"], [0.18 * L, "A"], [0.82 * L, "B"]] };
    }
    case "hex": {
      const Rc = R / Math.cos(Math.PI / 6), c2 = Math.min(0.8, R * 0.2);
      return { pts: [[0, Rc - c], [c, Rc], [L - c2, Rc], [L, Rc - c2], [L, 0]], bands: [[0, "A"], [0.4 * L, "B"], [0.47 * L, "A"], [0.53 * L, "B"], [0.6 * L, "A"]] };
    }
    default: {
      const nr = 0.62 * R, zs = 0.3 * L + (R - nr);
      return { pts: [[0, nr - c], [c, nr], [0.3 * L, nr], [zs, R], ...dome(zs, R, Math.max(0.5 * R, L - zs), 16)], bands: [[0, "B"], [0.3 * L, "A"]] };
    }
  }
}

/** Outer radius at z, taking the smaller side of any step (bail.html rAt, 1948). */
function rAt(pts: readonly Vec2[], z: number): number {
  let r = Infinity, hit = false;
  for (let i = 0; i < pts.length - 1; i++) {
    const [za, ra] = pts[i]!, [zb, rb] = pts[i + 1]!;
    if (z < Math.min(za, zb) - 1e-9 || z > Math.max(za, zb) + 1e-9) continue;
    hit = true;
    r = Math.abs(zb - za) < 1e-9 ? Math.min(r, ra, rb) : Math.min(r, ra + (rb - ra) * (z - za) / (zb - za));
  }
  return hit ? r : 0;
}

/** The part of a [z, r] chain between z0 and z1 (bail.html clipChain). */
function clipChain(pts: readonly Vec2[], z0: number, z1: number): Vec2[] {
  const out: Vec2[] = [], e = 1e-9;
  for (let i = 0; i < pts.length; i++) {
    const [za, ra] = pts[i]!;
    if (za >= z0 - e && za <= z1 + e) out.push([Math.min(z1, Math.max(z0, za)), ra]);
    if (i < pts.length - 1) {
      const [zb, rb] = pts[i + 1]!;
      const cs: number[] = [];
      for (const zc of [z0, z1]) if ((za < zc - e && zb > zc + e) || (za > zc + e && zb < zc - e)) cs.push((zc - za) / (zb - za));
      cs.sort((a, b) => a - b);
      for (const t of cs) out.push([za + t * (zb - za), ra + t * (rb - ra)]);
    }
  }
  while (out.length >= 2 && Math.abs(out[0]![0] - z0) < 1e-7 && Math.abs(out[1]![0] - z0) < 1e-7) out.shift();
  while (out.length >= 2 && Math.abs(out[out.length - 1]![0] - z1) < 1e-7 && Math.abs(out[out.length - 2]![0] - z1) < 1e-7) out.pop();
  return out;
}

export const build = defineBuild(chase, (p, k) => {
  const m = k.machine("ffc5p");
  const lh = m.layerHeight;
  const snapUp = (v: number): number => r4(Math.ceil(v / lh - 1e-6) * lh);
  const snapL = (v: number): number => r4(Math.max(0, Math.round(v / lh)) * lh);
  const slotMaterial = (slot: number): string => chase.materials.find((s) => s.slot === slot)?.material ?? "petg";

  // ---- the slide: thickness on a layer top, colour depth in whole layers
  let thk = m.layer(p.thk);
  if (Math.abs(thk - p.thk) > 1e-6) {
    k.warn(
      "CLAMP",
      `thickness ${p.thk} mm moved up to the layer top ${thk.toFixed(2)} mm (computed), legal ${thk.toFixed(2)} mm, the ${m.firstLayer} mm first layer plus whole ${lh} mm layers, constraint the slicer cuts layers on the ${m.id} grid, origin profile machine ${m.id}. set the thickness to ${thk.toFixed(2)} mm`,
      { param: "/thk", bound: limit(thk, "lo", `layer top over ${p.thk} mm on ${m.id}, first layer ${m.firstLayer} mm, layer ${lh} mm`, `profile machine ${m.id}`, COMPUTED) },
    );
  }
  const layers = Math.round(p.inlayDepth / lh);
  if (layers < 1 || Math.abs(layers * lh - p.inlayDepth) > 1e-6) {
    throw commandError({
      code: "E_SCHEMA", path: "/inlayDepth", got: p.inlayDepth, expected: `a whole number of ${lh} mm layers on ${m.id}`,
      hint: `set the colour depth to ${(Math.max(1, Math.floor(p.inlayDepth / lh)) * lh).toFixed(2)} or ${((Math.floor(p.inlayDepth / lh) + 1) * lh).toFixed(2)} mm (computed)`,
    });
  }

  // ---- the clasp numbers (claspGeom, bail.html 1685 to 1697)
  const faceDown = p.orient === "down";
  let clasp: string = p.clasp;
  if (clasp === "buried") {
    // A channel inside the host needs a void the inlay host (a prism from the bed) cannot hold, and the bore kind has no generator in this build.
    if (!faceDown) throw commandError({ code: "E_KERNEL", path: "/clasp", got: "buried at front face up", expected: "bridge, pad or buried at front face down", record: "kernels/art-inlay", hint: "set the print pose to front face down, or pick the store back recess" });
    clasp = "bridge";
    k.warn("BURIED_AS_BRIDGE", "buried channels need a void inside the inlay host, which this kernel build cannot cut. built as twin printed bridges with the same spacing and channel", { param: "/clasp" });
  }
  if (!faceDown && clasp === "bridge") {
    throw commandError({ code: "E_KERNEL", path: "/clasp", got: "bridge at front face up", expected: "bridges need the back face up", record: "kernels/art-inlay", hint: "set the print pose to front face down, or pick the store back recess" });
  }
  const single = p.pair === "single";
  const cw = single ? 2 * p.cord + p.clr : p.cord + p.clr;
  const ch = snapUp(p.cord + p.clr);
  const xs = single ? [0] : [-p.spacing / 2, p.spacing / 2];
  const finP = Math.min(cw / 2 - 0.2, p.clr / 2 + p.gripP);
  const ribW = Math.max(0.9, p.minF * 1.5);
  const roof = snapUp(p.roof);
  if (p.clr < 0.25 && clasp !== "pad") k.warn("CLEARANCE", `cord clearance ${p.clr} mm, legal from 0.25, constraint braided cord binds in the channel, origin bail.html line 1794`, { param: "/clr" });

  // ---- the outline of the blank (blankPath, bail.html 1508 to 1529); Math.sin and Math.cos points snap to the 1/1024 mm grid in the kernel
  const w = p.w, h = p.shape === "round" || p.shape === "concho" ? p.w : p.h;
  const outline = ((): Ring => {
    switch (p.shape) {
      case "round": return k.ring.circle(w / 2, [0, 0], 128);
      case "oval": return k.ring.circle(1, [0, 0], 128).map(([x, y]): Vec2 => [x * w / 2, y * h / 2]);
      case "rect": return k.ring.roundRect(w, h, Math.min(p.r, w / 2, h / 2));
      case "shield": {
        const pts: Vec2[] = [];
        const quad = (a: Vec2, c: Vec2, b: Vec2, n: number): void => { for (let i = 0; i <= n; i++) { const t = i / n; pts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]); } };
        const cub = (a: Vec2, b: Vec2, c: Vec2, d: Vec2, n: number): void => {
          for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0], u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1]]); }
        };
        quad([-w / 2, h / 2], [0, h / 2 - h * 0.1], [w / 2, h / 2], 16);
        pts.push([w / 2, -h * 0.02]);
        cub([w / 2, -h * 0.02], [w / 2, -h * 0.3], [w * 0.22, -h * 0.42], [0, -h / 2], 16);
        cub([0, -h / 2], [-w * 0.22, -h * 0.42], [-w / 2, -h * 0.3], [-w / 2, -h * 0.02], 16);
        return pts.reverse();
      }
      case "concho": {
        const R = w / 2, n = Math.max(3, Math.round(p.scallops)), pts: Vec2[] = [];
        for (let i = 0; i < 360; i++) { const a = i / 360 * Math.PI * 2, r = R - p.scallopD * (1 - Math.abs(Math.cos(n * a / 2))); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
        return pts;
      }
      case "hex": return [0, 1, 2, 3, 4, 5].map((i): Vec2 => { const a = i * Math.PI / 3; return [Math.cos(a) * w / 2, Math.sin(a) * h / 2 / Math.sin(Math.PI / 3)]; });
      case "octagon": return [0, 1, 2, 3, 4, 5, 6, 7].map((i): Vec2 => { const a = Math.PI / 8 + i * Math.PI / 4, c = Math.cos(Math.PI / 8); return [Math.cos(a) / c * w / 2, Math.sin(a) / c * h / 2]; });
      default: return ([[-0.3, 0.5], [-0.3, 0.36], [-0.5, 0.25], [0, -0.5], [0.5, 0.25], [0.3, 0.36], [0.3, 0.5]] as Vec2[]).map(([x, y]): Vec2 => [x * w, y * h]);
    }
  })();
  const xsAll = outline.map((q) => q[0]), ysAll = outline.map((q) => q[1]);
  const ext = { x0: Math.min(...xsAll), x1: Math.max(...xsAll), y0: Math.min(...ysAll), y1: Math.max(...ysAll) };
  const slideShape = (z0: number, z1: number): ShapeDecl => ({ route: "prism", outline: [outline], z: [z0, z1] });

  // ---- the art document lowered to painter layers (bail.html partsOf and paintLayer, 1282 to 1496)
  const doc: ArtDocument | null = p.art?.doc ?? null;
  const lowerLayer = (L: ArtLayer): Paint | null => {
    if (L.cut !== "none") { k.warn("LAYER_SKIPPED", `layer ${L.id} cuts the slide (${L.cut}); the inlay kind carves no cut yet, so it is skipped`); return null; }
    const flags = L.mute ? { off: true } : {};
    const place = { dx: L.dx, dy: L.dy, rot: L.rot };
    switch (L.kind) {
      case "text": {
        const f = FONT[L.font], arc = L.arc !== 0;
        if ("swap" in f) k.warn("FONT_SWAP", `layer ${L.id} asks for ${f.swap}; the node text route sets only IBM Plex Mono, so it is set in Plex bold`);
        return {
          kind: "text", text: L.text, slot: L.slot, ...(!arc && L.text.includes("|") ? { accent: L.slot2 } : {}), font: f.family, ...(f.bold ? { bold: true } : {}), size: L.size,
          runGap: arc ? 0 : L.splitGap, mode: arc ? "arc" : "straight", ...(arc ? { arcR: Math.abs(L.arc), arcDeg: L.arc > 0 ? 90 : -90, flip: L.arc < 0, anchored: true } : {}),
          ...place, baseline: "middle", ls: L.ls, ...flags,
        };
      }
      case "shape": return { kind: "shape", shape: L.shape, w: L.w, h: L.h, t: L.t, n: L.n, ...place, slot: L.slot, ...flags };
      case "logo": {
        if (L.brand === "hsl" && L.slot === L.slot2) throw commandError({ code: "E_SCHEMA", path: `/art/${L.id}/slot2`, got: L.slot2, expected: "a slot other than slot", hint: "the HeatSync mark is two pieces: the sun disc and the flames need different slots" });
        if (L.brand === "hsl" && L.slot === p.body) k.warn("LOGO_ON_BODY", "the HeatSync flames are on the body slot, so only the disc will show", { param: "/body" });
        return { kind: "logo", brand: L.brand, w: L.w, ...place, slot: L.slot, slot2: L.slot2, ...flags };
      }
      case "scope": return { kind: "scope", a: L.a, b: L.b, phase: L.phase, w: L.w, h: L.h, t: L.t, ...place, slot: L.slot, ...flags };
      case "circuit": return { kind: "circuit", seed: L.seed, w: L.w, h: L.h, pitch: L.pitch, tw: L.tw, pad: L.pad, drill: L.drill, density: L.density, clip: L.clip, ...place, slot: L.slot, slot2: L.slot2, ...flags };
      case "path": {
        const s = L.w / L.bw, cx = L.bx + L.bw / 2, cy = L.by + L.bh / 2, r = L.rot * Math.PI / 180, sn = s * Math.sin(r), cs = s * Math.cos(r);
        return { kind: "path", d: L.d, transform: [cs, sn, sn, -cs, L.dx - (cs * cx + sn * cy), L.dy - (sn * cx + -cs * cy)], slot: L.slot, ...flags };
      }
      default:
        k.warn("LAYER_SKIPPED", `layer ${L.id} is an ${L.kind} layer; the image and relief painters are not built, so it is skipped`);
        return null;
    }
  };

  // The rim band. BAIL labels it on every layer (composeFace, 1635; buildSlide, 1714), so it is a ring prism through the whole thickness in the rim slot and the slide prism stands inside it. BAIL measures an exact distance field and k.ring.offset is not in this kernel build, so the inner edge is the outline scaled on each axis. Art that runs into the band is refused by the inlay kind, where BAIL clips it at the band.
  const rimBody = p.rimOn && p.rim !== p.body;
  const rimInner: Ring = ((): Ring => {
    const sx = Math.max(0.05, (w - 2 * p.rimW) / w), sy = Math.max(0.05, (h - 2 * p.rimW) / h);
    return outline.map(([x, y]): Vec2 => [x * sx, y * sy]);
  })();
  const lowered = (face: readonly ArtLayer[]): Paint[] => face.map(lowerLayer).filter((x): x is Paint => x !== null);
  const front = doc === null ? [] : lowered(doc.faces.front);
  const back = doc === null ? [] : lowered(doc.faces.back);
  // The front prints on the bed when the pose is face down.
  const layersOf = faceDown ? { top: back, bed: front } : { top: front, bed: back };

  // ---- the host and the inlay features
  const slide = k.body("slide", { role: "body", slot: p.body, material: slotMaterial(p.body), base: { route: "prism", outline: [rimBody ? rimInner : outline], z: [0, thk] } });
  const top: FaceFrame = { origin: [0, 0, thk], normal: [0, 0, 1], u: [1, 0, 0] };
  const palette = [...chase.materials].sort((a, b) => a.slot - b.slot).map((s) => s.preview);
  const used = new Set<number>();
  for (const l of [...front, ...back]) {
    if (l["off"] === true) continue;
    for (const key of ["slot", "slot2", "accent"]) { const v = l[key]; if (typeof v === "number" && !(key === "slot2" && l["kind"] !== "logo" && l["kind"] !== "circuit")) used.add(v); }
  }
  used.delete(p.body);
  const art = {
    grid: { w: Math.ceil((ext.x1 - ext.x0) * p.cells) + 8, h: Math.ceil((ext.y1 - ext.y0) * p.cells) + 8, res: p.cells },
    layers: layersOf, recipe: "print-forge", boost: p.boost, gap: p.gap, palette, minFeature: p.minF,
    despeckle: k.profile.constant("despeckle.factor").value,
  };
  const uri = `hbf://art/${sha256Hex(canonicalize(art))}`;
  const features: Feature[] = [];
  for (const slot of [...used].sort((a, b) => a - b)) {
    features.push(k.bind({
      kind: "inlay" as const, id: `inlay.s${slot}`, body: slide.id, art: uri, face: top, slot, depthLayers: layers, minFeature: art.minFeature, despeckle: art.despeckle,
      grid: art.grid, layers: art.layers, recipe: art.recipe, boost: art.boost, gap: art.gap, palette: art.palette, material: slotMaterial(slot),
    }, { depthLayers: "/inlayDepth", minFeature: "/minF" }));
  }

  // ---- the clasp, on the back face (the top face when the front prints on the bed)
  const bodies: BodyDraft[] = [slide];
  if (rimBody) bodies.push(k.body("rim", { role: "body", slot: p.rim, material: slotMaterial(p.rim), base: { route: "prism", outline: [outline, rimInner], z: [0, thk] } }));
  const bodyMat = slotMaterial(p.body);
  const outlinePrism = (z1: number): ShapeDecl => slideShape(thk - 1, z1);
  if (clasp === "pad") {
    if (!faceDown) {
      k.warn("POSE_NOTE", "front face up: no recess, glue the store back flat to the back face", { param: "/orient" });
    } else {
      const padW = r4(p.hwW + 0.4), padH = r4(p.hwL + 0.4), padR = 0.6;
      const padDepth = Math.max(2 * lh, snapL(Math.ceil((p.plateT + 0.1) / lh) * lh));
      const ring = k.ring.roundRect(padW, padH, Math.min(padR, padW / 2, padH / 2), [0, p.padY]);
      // BAIL's padMin (buildSlide, 1770 to 1776): the least distance from the recess to the blank edge, -1 when a recess cell is outside the blank. An edge of the recess holds the least distance because a distance to the outline has no minimum inside it.
      const padMin = along(ring, 0.1).reduce((least, [x, y]) => Math.min(least, inRing(x, y, outline) ? edgeDist(x, y, outline) : -1), Infinity);
      if (padMin < 0) {
        throw commandError({
          code: "E_SCHEMA", path: "/padY", got: `recess leaves the blank, ${padW} x ${padH} mm at offset ${p.padY} mm (computed)`,
          expected: `a recess at least ${PAD_EDGE_MM} mm inside the edge (inferred, bail.html line 1776)`, hint: "make the slide bigger or move the recess toward the centre (recess offset)",
        });
      }
      if (padMin < PAD_EDGE_MM) {
        k.warn(
          "PAD_EDGE",
          `store back recess comes within ${padMin.toFixed(1)} mm of the slide edge (computed), legal from ${PAD_EDGE_MM} mm (inferred), constraint the wall left at the edge around the recess is too thin, origin bail.html line 1776. make the slide bigger or move the recess (recess offset)`,
          { param: "/padY", bound: limit(PAD_EDGE_MM, "lo", `recess ${padW} x ${padH} mm at offset ${p.padY} mm sits ${padMin.toFixed(2)} mm from the edge`, "bail.html line 1776", OWNER_RULE) },
        );
      }
      // A pocket cutter rises one machine layer past its face (toggle/build.ts), so the face sits a layer under the top.
      features.push({
        kind: "pocket", id: "pocket.store-back", body: slide.id, outline: ring, face: { origin: [0, 0, thk - lh], normal: [0, 0, 1], u: [1, 0, 0] }, depth: r4(padDepth - lh), floor: "flat",
        fit: { class: k.fit("LOCATE"), drawnPerSide: 0.2, basis: "perSide" }, note: "recess for the bought back plate; catalog row bail-back-uclip",
      });
      if (p.hole > 0) {
        const pegW = Math.max(1.2, r4(p.hole - 0.2)), pegH = r4(padDepth + lh);
        if (pegW > padW - 2) throw commandError({ code: "E_SCHEMA", path: "/hole", got: p.hole, expected: `a peg under ${(padW - 2).toFixed(1)} mm`, hint: "the locating peg is wider than the recess; make the hole smaller" });
        bodies.push(k.body("peg", { role: "body", slot: p.body, material: bodyMat, base: { route: "prism", outline: [rect(-pegW / 2, p.padY - pegW / 2, pegW / 2, p.padY + pegW / 2)], z: [r4(thk - padDepth), r4(thk - padDepth + pegH)] } }));
      }
      k.warn("HARDWARE_PHOTO", "the back plate length along the cord and the square hole are read off the photo, tier inferred; measure one clip and correct them", { param: "/hwL" });
    }
  }
  const spanMax = k.profile.constant("bridge.maxMm").value;
  if (clasp === "bridge") {
    const between = single ? Infinity : p.spacing - cw;
    if (between < 0.8) throw commandError({ code: "E_SCHEMA", path: "/spacing", got: p.spacing, expected: `at least ${(cw + 0.8).toFixed(1)} mm`, hint: `the two channels are ${Math.max(0, between).toFixed(2)} mm apart` });
  }
  if (clasp === "bridge") {
    if (cw > spanMax) k.warn("SPAN", `bridge span ${cw.toFixed(2)} mm, legal to ${spanMax} mm (profile bridge.maxMm, inferred), constraint a layer bridging more sags`, { param: "/cord" });
    const y0 = p.tunY - p.len / 2, y1 = p.tunY + p.len / 2;
    const claspMat = slotMaterial(p.claspSlot);
    // The fin body role follows the profile: a material whose handling needs a flexible feed path is flex, any other is a rigid body.
    const gripMat = p.grip ? k.profile.material(slotMaterial(p.gripSlot)) : null;
    const gripFlex = gripMat?.handling?.flexible === true;
    // BAIL's trimmed bridge count (buildSlide, 1771 and 1788): footprint cells outside the blank or within 0.6 mm of its edge. This build clips at the outline only.
    const px = 1 / p.cells;
    let footprint = 0, hanging = 0;
    for (const xc of xs) {
      const x0 = xc - cw / 2 - p.wall, x1 = xc + cw / 2 + p.wall;
      for (let gx = x0 + px / 2; gx < x1; gx += px) {
        for (let gy = y0 + px / 2; gy < y1; gy += px) {
          footprint++;
          if (!inRing(gx, gy, outline) || edgeDist(gx, gy, outline) < BRIDGE_EDGE_MM) hanging++;
        }
      }
    }
    if (hanging > 0) {
      const pct = 100 * hanging / footprint;
      if (hanging > footprint * BRIDGE_TRIM_ERR) {
        throw commandError({
          code: "E_SCHEMA", path: "/len", got: `${pct.toFixed(1)} percent of the bridge footprint is outside the blank or within ${BRIDGE_EDGE_MM} mm of its edge (computed)`,
          expected: `at most ${100 * BRIDGE_TRIM_ERR} percent (inferred, bail.html line 1788)`, hint: "shorten the bridges (bridge length), move them (bridge offset, channel spacing) or make the slide bigger",
        });
      }
      k.warn(
        "BRIDGE_TRIMMED",
        `part of the bridges hangs off the slide: ${pct.toFixed(1)} percent of the bridge footprint is outside the blank or within ${BRIDGE_EDGE_MM} mm of its edge (computed), legal none, refused past ${100 * BRIDGE_TRIM_ERR} percent (inferred), constraint a bridge over the edge is cut away at the outline, origin bail.html line 1788. shorten the bridges (bridge length) or move them (bridge offset)`,
        { param: "/len", bound: limit(0, "hi", `${hanging} of ${footprint} footprint cells at ${px.toFixed(3)} mm hang off or sit within ${BRIDGE_EDGE_MM} mm of the edge`, "bail.html line 1788", OWNER_RULE) },
      );
    }
    xs.forEach((xc, i) => {
      const block: ShapeDecl = { route: "prism", outline: [rect(xc - cw / 2 - p.wall, y0, xc + cw / 2 + p.wall, y1)], z: [thk, r4(thk + ch + roof)] };
      const tunnel: ShapeDecl = { route: "prism", outline: [rect(xc - cw / 2, y0 - 1, xc + cw / 2, y1 + 1)], z: [thk - 1, r4(thk + ch)] };
      bodies.push(k.body(`bridge${i + 1}`, {
        role: "body", slot: p.claspSlot, material: claspMat,
        base: { route: "csg", op: "intersection", of: [{ route: "csg", op: "difference", of: [block, tunnel] }, outlinePrism(r4(thk + ch + roof + 1))] },
      }));
      if (p.grip) {
        const ribs: ShapeDecl[] = [];
        for (let y = y0; y < y1 - 1e-6; y += p.gripPitch) {
          const ya = y, yb = Math.min(y + ribW, y1);
          ribs.push({ route: "prism", outline: [rect(xc - cw / 2, ya, xc - cw / 2 + finP, yb)], z: [thk, r4(thk + ch)] });
          ribs.push({ route: "prism", outline: [rect(xc + cw / 2 - finP, ya, xc + cw / 2, yb)], z: [thk, r4(thk + ch)] });
        }
        bodies.push(k.body(`fins${i + 1}`, {
          role: gripFlex ? "flex" : "body", slot: p.gripSlot, material: slotMaterial(p.gripSlot),
          base: { route: "csg", op: "intersection", of: [{ route: "csg", op: "union", of: ribs }, outlinePrism(r4(thk + ch + 1))] },
        }));
      }
    });
    // Grip fins on a slot whose material is not flexible in the profile: the cord did not pass in the owner's print (PRINT-NOTES.md).
    if (gripMat !== null && !gripFlex) {
      const squeeze = 2 * p.gripP;
      const handling = gripMat.handling;
      const flexNote = handling === undefined ? "no handling row" : `handling.flexible false, tier ${handling.provenance.tier}`;
      k.warn(
        "GRIP_RIGID",
        `grip fins squeeze the ${p.cord} mm cord by ${squeeze.toFixed(2)} mm (computed) in slot ${p.gripSlot}, ${gripMat.id} at ${gripMat.modulusMPa ?? "unknown"} MPa (profile); legal: no squeeze for a rigid fin; constraint: the material of slot ${p.gripSlot} is not flexible in the profile (${flexNote}); origin: owner print note, ${PRINT_NOTE}, braided cord did not pass fins printed in PETG. set the grip slot to the TPU slot or turn the fins off`,
        {
          param: "/gripSlot",
          bound: limit(0, "hi", `fin squeeze ${squeeze.toFixed(2)} mm on ${gripMat.id}, ${flexNote}`, PRINT_NOTE, handling === undefined ? qualify([null]) : qualifyRow(handling.provenance.tier)),
        },
      );
    }
  }
  // ---- the tips (buildTip, bail.html 1966 to 2018), revolved bodies standing on their open end, banded across the slots
  const gap = 6;
  if (p.tips !== "ots") {
    const L = p.tipL, R = p.tipD / 2, hex = p.tips === "hex";
    const segs = hex ? 6 : 48;
    const rbRaw = (p.cord + p.tipClr) / 2, rb = rbRaw / Math.cos(Math.PI / segs);
    const prof = tipProfile(p.tips, L, R);
    const wallOK = (bd: number): boolean => {
      for (let z = 0.45; z <= bd + rb; z += 0.05) {
        const ri = z <= bd ? rb : Math.max(0, rb - (z - bd));
        if (rAt(prof.pts, z) * Math.cos(Math.PI / segs) - ri < TIP_WALL_MM) return false;
      }
      return bd + rb < L - 1;
    };
    let bd = p.bore;
    if (!wallOK(bd)) {
      let b = bd;
      while (b > 2 && !wallOK(b)) b -= 0.25;
      if (b <= 2) throw commandError({ code: "E_SCHEMA", path: "/tipD", got: p.tipD, expected: `a tip that keeps a ${TIP_WALL_MM} mm wall around a ${p.cord} mm cord`, hint: "make the tip fatter" });
      k.warn(
        "CLAMP",
        `tip bore depth limited from ${bd} mm to ${b.toFixed(2)} mm (computed), legal to ${b.toFixed(2)} mm for a ${TIP_WALL_MM} mm wall (inferred), constraint the ${p.tips} profile thins the wall around a ${(2 * rbRaw).toFixed(2)} mm bore deeper than that, origin bail.html line 1988. set the bore depth to ${b.toFixed(2)} mm or make the tip fatter (tip diameter)`,
        { param: "/bore", bound: limit(b, "hi", `deepest bore that keeps a ${TIP_WALL_MM} mm wall around a ${(2 * rbRaw).toFixed(2)} mm bore in the ${p.tips} tip`, "bail.html line 1988", OWNER_RULE) },
      );
      bd = b;
    }
    let slope = 0;
    for (let i = 0; i < prof.pts.length - 1; i++) { const [za, ra] = prof.pts[i]!, [zb, rb2] = prof.pts[i + 1]!; if (zb - za > 1e-6 && rb2 > ra) slope = Math.max(slope, (rb2 - ra) / (zb - za)); }
    if (slope > TIP_SLOPE_MAX) {
      k.warn(
        "SLOPE",
        `the ${p.tips} tip widens at slope ${slope.toFixed(2)} going up (computed), legal to ${TIP_SLOPE_MAX} (inferred), constraint a wall steeper than 45 degrees prints a rough underside, origin bail.html line 1992. lengthen the tip (tip length) or narrow it (tip diameter)`,
        { param: "/tips", bound: limit(TIP_SLOPE_MAX, "hi", `steepest rising segment of the ${p.tips} profile at ${p.tipL} mm long and ${p.tipD} mm wide`, "bail.html line 1992", OWNER_RULE) },
      );
    }
    const inner: Vec2[] = [[0, rb], [bd, rb], [bd + rb, 0], [L, 0]];
    const roleSlot: Record<string, number> = { A: p.slotA, B: p.slotB, C: p.slotC };
    const bands: { z0: number; z1: number; slot: number }[] = [];
    prof.bands.forEach(([z0, role], i) => {
      const z1 = i + 1 < prof.bands.length ? prof.bands[i + 1]![0] : L, s = roleSlot[role] ?? p.slotA, last = bands[bands.length - 1];
      if (last !== undefined && last.slot === s) last.z1 = z1; else bands.push({ z0, z1, slot: s });
    });
    const rmax = Math.max(...prof.pts.map(([, r]) => r));
    const td = 2 * rmax;
    const tipX = ext.x1 + gap + td / 2;
    [-1, 1].forEach((side, ti) => {
      const origin: [number, number, number] = [tipX, side * (td + gap) / 2, 0];
      bands.forEach((b, bi) => {
        const poly = [...clipChain(prof.pts, b.z0, b.z1), ...clipChain(inner, b.z0, b.z1).reverse()];
        const clean: Vec2[] = [];
        for (const [z, r] of poly) {
          const last = clean[clean.length - 1];
          if (last === undefined || Math.abs(last[1] - z) > 1e-7 || Math.abs(last[0] - r) > 1e-7) clean.push([r < 1e-7 ? 0 : r, z]);
        }
        bodies.push(k.body(`tip${ti + 1}.band${bi + 1}`, {
          role: "body", slot: b.slot, material: slotMaterial(b.slot),
          base: { route: "revolve", profile: clean, axis: { origin, dir: [0, 0, 1] }, segments: segs },
        }));
      });
    });
  } else {
    // BAIL buildTip, 1977: the cord has to fit the bore of the bought tip.
    if (p.cord > KIT_TIP.boreMm + KIT_BORE_TOL_MM) {
      throw commandError({
        code: "E_SCHEMA", path: "/cord", got: `${p.cord} mm cord against a ${KIT_TIP.boreMm} mm kit tip bore (computed)`,
        expected: `a cord up to ${r4(KIT_TIP.boreMm + KIT_BORE_TOL_MM)} mm (kit bore ${KIT_TIP.boreMm} mm, inferred, plus ${KIT_BORE_TOL_MM} mm, bail.html line 1977)`,
        hint: `use a cord of ${KIT_TIP.boreMm} mm or less, or set tips to a printed kind`,
      });
    }
    k.warn("KIT_TIPS", `store bought kit tips, catalog row ${KIT_TIP.row} (${KIT_TIP.lengthMm} x ${KIT_TIP.diameterMm} mm, ${KIT_TIP.boreMm} mm bore, inferred, read off the photo); the cord is ${p.cord} mm (legal to ${r4(KIT_TIP.boreMm + KIT_BORE_TOL_MM)} mm, inferred, bail.html line 1977) and glues in, no tip is printed`, { param: "/tips" });
  }

  return k.part({
    id: "bail", name: "bail", process: "fdm", machine: "ffc5p",
    bodies,
    features,
    faces: [k.face("slide.top", top)],
  });
});
