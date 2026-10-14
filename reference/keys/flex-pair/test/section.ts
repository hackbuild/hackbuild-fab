// Key sections for keys flex-pair (M-S-T09): each meshed body cut by the
// plane y = 0, which holds every key centre, then read for the split
// contact column and the cap over it, and drawn as SVG for a person to
// read. Every figure here is computed from the mesh, never typed.

import type { ManifoldToplevel } from "manifold-3d";
import type { ContactFeature, ConductorFeature, Feature, FeatureOf, PartDraft } from "@hackbuild/spec";
import { scope } from "@hackbuild/mesh";

export interface SectionBody {
  readonly id: string;
  readonly material: string;
  /** Net of the conductor feature that made this body, if any. */
  readonly net?: string | undefined;
  readonly mesh: { readonly positions: Float64Array; readonly triangles: Uint32Array };
}

/** One closed loop in the section plane, as [x, z] in mm. */
export type Loop = readonly (readonly [number, number])[];

export interface BodySection {
  readonly id: string;
  readonly material: string;
  readonly net?: string | undefined;
  readonly loops: readonly Loop[];
}

/**
 * Cut every body by y = 0 and return its loops as [x, z]. Every wasm object
 * it makes is owned by one mesh scope and freed when the scope closes
 * (D-055), so the live count returns to where it was.
 */
export function sectionAtY0(wasm: ManifoldToplevel, bodies: readonly SectionBody[]): BodySection[] {
  return scope(() => bodies.map((b) => {
    const mesh = new wasm.Mesh({
      numProp: 3,
      vertProperties: Float32Array.from(b.mesh.positions),
      triVerts: Uint32Array.from(b.mesh.triangles),
    });
    const solid = new wasm.Manifold(mesh);
    // A quarter turn about x sends y to z' and z to -y', so z' = 0 is y = 0.
    const cut = solid.rotate([90, 0, 0]).slice(0);
    const loops = cut.toPolygons().map((poly) => poly.map(([x, yp]) => [x, -yp] as const));
    return { id: b.id, material: b.material, net: b.net, loops };
  }));
}

interface Box { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number }

function boxOf(loops: readonly Loop[]): Box {
  const pts = loops.flat();
  return {
    x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])),
    z0: Math.min(...pts.map((p) => p[1])), z1: Math.max(...pts.map((p) => p[1])),
  };
}

/** Heights where the vertical line x crosses the loops, ascending. */
function crossings(loops: readonly Loop[], x: number): number[] {
  const out: number[] = [];
  for (const loop of loops) {
    loop.forEach((a, i) => {
      const b = loop[(i + 1) % loop.length]!;
      if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) out.push(a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]));
    });
  }
  return out.sort((p, q) => p - q);
}

const byId = <K extends Feature["kind"]>(features: readonly Feature[], kind: K, id: string): FeatureOf<K> => {
  const f = features.find((x) => x.kind === kind && x.id === id);
  if (f === undefined) throw new Error(`section: no ${kind} ${id} in the draft`);
  return f as FeatureOf<K>;
};

/** What the section through key n reads, mm (computed from the mesh unless named declared). */
export interface KeyReading {
  readonly key: number;
  readonly x: number;
  readonly kHalf: Box;
  readonly gndHalf: Box;
  /** Lowest cap surface over the column, read on the key axis. */
  readonly capUnderside: number;
  /** Cap underside minus the higher column half top. */
  readonly gapRead: number;
  /** Space between the halves across the split. */
  readonly splitRead: number;
  readonly declared: {
    readonly traceBand: readonly [number, number];
    readonly colTop: number;
    readonly gap: number;
    readonly coneH: number;
  };
}

export function readKey(sections: readonly BodySection[], draft: PartDraft, n: number, keyX: number): KeyReading {
  const loops = (id: string): readonly Loop[] => {
    const s = sections.find((x) => x.id === id);
    if (s === undefined || s.loops.length === 0) throw new Error(`section: body ${id} has no loops at y = 0`);
    return s.loops;
  };
  const near = (ls: readonly Loop[]): Loop[] => ls.filter((l) => l.some((p) => Math.abs(p[0] - keyX) < 8));
  const kHalf = boxOf(loops(`conductor.key${n}col`));
  const gndHalf = boxOf(loops(`conductor.gnd${n}col`));
  const capCross = crossings(near(loops(`cap${n}`)), keyX).filter((z) => z > Math.max(kHalf.z1, gndHalf.z1));
  const capUnderside = capCross[0] ?? Number.NaN;
  const kCol = byId(draft.features, "conductor", `conductor.key${n}col`) as ConductorFeature;
  const trace = byId(draft.features, "conductor", `conductor.key${n}`) as ConductorFeature;
  const contact = byId(draft.features, "contact", `contact.key${n}`) as ContactFeature;
  const skin = "face" in kCol.region ? kCol.region.face.origin[2] : Number.NaN;
  return {
    key: n, x: keyX, kHalf, gndHalf, capUnderside,
    gapRead: capUnderside - Math.max(kHalf.z1, gndHalf.z1),
    splitRead: kHalf.x0 - gndHalf.x1,
    declared: { traceBand: [skin, skin + trace.t], colTop: skin + kCol.t, gap: contact.gap ?? Number.NaN, coneH: contact.coneH ?? Number.NaN },
  };
}

// ---- drawing ----

const PX = 56; // px per mm
const PAD = 24;
const LABEL_W = 330;
const HALF_W = 7; // mm either side of the key axis

const FILL: Readonly<Record<string, string>> = { petg: "#d9d2c3", tpu95: "#ffffff", ctpu: "#8c8c8c" };
const K_FILL = "#FE0386";
const GND_FILL = "#1a1a1a";
const INK = "#1a1a1a";
const PAPER = "#f5f0e6";

const f3 = (v: number): string => v.toFixed(3);
const f2 = (v: number): string => v.toFixed(2);

/** One key section as a deterministic SVG: fills by body, the column read beside it. */
export function keySvg(sections: readonly BodySection[], r: KeyReading, padTop: number, title: string): string {
  const zTop = padTop + 0.4;
  const zBot = -0.4;
  const w = 2 * HALF_W * PX;
  const h = (zTop - zBot) * PX;
  const W = PAD * 2 + w + LABEL_W;
  const H = PAD * 2 + h + 40 + 96;
  const sx = (x: number): string => f2(PAD + (x - (r.x - HALF_W)) * PX);
  const sz = (z: number): string => f2(PAD + 40 + (zTop - z) * PX);
  const fillOf = (s: BodySection): string =>
    s.net === `K${r.key}` ? K_FILL
      : s.material === "cpla" ? GND_FILL
        : FILL[s.material] ?? "#bbbbbb";
  const order = (s: BodySection): number => (s.material === "petg" ? 0 : s.material === "cpla" ? 2 : 1);
  const shapes = [...sections].sort((a, b) => order(a) - order(b) || (a.id < b.id ? -1 : 1)).map((s) => {
    const d = s.loops.map((l) => `M${l.map((p) => `${sx(p[0])} ${sz(p[1])}`).join("L")}Z`).join("");
    return `<path d="${d}" fill="${fillOf(s)}" fill-rule="evenodd" stroke="${INK}" stroke-width="0.6"/>`;
  });
  const guide = (z: number, label: string): string =>
    `<line x1="${sx(r.x - HALF_W)}" y1="${sz(z)}" x2="${f2(PAD + w + 8)}" y2="${sz(z)}" stroke="${INK}" stroke-width="0.8" stroke-dasharray="4 4"/>`
    + `<text x="${f2(PAD + w + 12)}" y="${f2(Number(sz(z)) + 4)}">${label}</text>`;
  const colTop = Math.max(r.kHalf.z1, r.gndHalf.z1);
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${f2(H)}" viewBox="0 0 ${W} ${f2(H)}" font-family="IBM Plex Mono, Menlo, monospace" font-size="13" fill="${INK}">`,
    `<rect width="100%" height="100%" fill="${PAPER}"/>`,
    `<text x="${PAD}" y="${PAD + 10}" font-size="15">${title}</text>`,
    `<clipPath id="win"><rect x="${PAD}" y="${PAD + 40}" width="${w}" height="${f2(h)}"/></clipPath>`,
    `<g clip-path="url(#win)">${shapes.join("")}</g>`,
    `<rect x="${PAD}" y="${PAD + 40}" width="${w}" height="${f2(h)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    guide(r.capUnderside, `cap underside ${f3(r.capUnderside)} mm`),
    guide(colTop, `colTop ${f3(colTop)} mm`),
    guide(r.declared.traceBand[1], `trace band top ${f3(r.declared.traceBand[1])} mm`),
    guide(r.declared.traceBand[0], `trace band floor ${f3(r.declared.traceBand[0])} mm`),
    ...[
      `gap read ${f3(r.gapRead)} mm, cap underside to colTop; declared ${f3(r.declared.gap)} mm`,
      `split read ${f3(r.splitRead)} mm between the halves`,
      `pink net K${r.key}, ink net GND, grey cTPU cap, white TPU cone and key top, tan PETG pad`,
      "all mm computed from the mesh",
    ].map((t, i) => `<text x="${PAD}" y="${f2(PAD + 40 + h + 26 + 22 * i)}">${t}</text>`),
    `</svg>`,
  ];
  return `${lines.join("\n")}\n`;
}
