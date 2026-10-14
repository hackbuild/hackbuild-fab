// Declared series nets (M05-T12, D-021, C-13): the Capricate reproduction.
// Capricate swept touch electrodes of 5, 10, 15 and 20 mm against series
// resistors of 20 to 120 kohm in 10 kohm steps; the resistors stood in for
// trace resistance (Schmitz et al., UIST 2015, capricate.txt lines 407 to
// 416). A chase that declares scene.series names, per net, the electrode it
// reads, the resistor and the leads on its path. The total is the resistor
// plus each lead's resistance, and each lead is one path1d leg (legOf): a
// straight centreline run "along" at its declared width and thickness,
// read through profile sectionResistance, the one home of R = rho L / (w t).
// The electrode is the sensing surface and is never on the path.
//
// The leads are priced as in-memory conductor features built from the
// declaration, the way solveLegacy builds its ports: they never enter the
// Part IR or its buildHash. A resistor is wiring a mesh does not hold, so
// it is declared and never inferred.

import type { ConductorFeature, Ohm, ProfileLookup, Qualification, SeriesSceneDecl, Tier } from "@hackbuild/spec";
import { qualify } from "@hackbuild/spec";
import { circuitError, legOf, type PathLeg } from "../path1d.js";

/** One solved series net: what circuit.solve prints and CHK-NET-28 reads (views.circuit). */
export interface SeriesPort {
  /** The sensing port circuit.solve keys the net by: "port." plus the net id. */
  readonly port: string;
  readonly net: string;
  /** Port interface registry id, for example "capacitive". */
  readonly interface: string;
  /** Electrode id the net reads; null when it has none. */
  readonly electrode: string | null;
  /** Declared series resistor, ohm. */
  readonly resistorOhm: Ohm;
  /** Summed lead length on the path, mm; 0 when the resistor sits on the electrode edge. */
  readonly leadMm: number;
  /** Summed lead resistance, ohm: the conductor share of the total. */
  readonly conductorOhm: Ohm;
  /** resistorOhm plus conductorOhm, ohm. */
  readonly totalOhm: Ohm;
  /** One leg per lead, in path order. */
  readonly legs: readonly PathLeg[];
  /** Lowest tier of the rows the legs read; null when the path reads no row. */
  readonly tier: Tier | null;
  /** qualify over the leg rows: computed, with the lowest leg tier as basis. */
  readonly q: Qualification;
}

/** The port id a series net is read at. */
export const seriesPortId = (net: string): string => `port.${net}`;

/** A straight lead as the conductor feature legOf prices: a +z face at the origin, u along +x. */
function leadFeature(lead: SeriesSceneDecl["leads"][number], net: string, material: string): ConductorFeature {
  return {
    kind: "conductor", id: lead.id, material, net, width: lead.widthMm, t: lead.tMm,
    region: { centreline: [[0, 0], [lead.lengthMm, 0]], face: { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] } },
  };
}

const positive = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v) && v > 0;

/** Every declared series net solved: E_REF for an unknown electrode or lead, E_SCHEMA for a bad resistor, lead or repeated net. */
export function solveSeriesScene(decl: SeriesSceneDecl, profile: ProfileLookup): readonly SeriesPort[] {
  const at = "/scene/series";
  const electrodes = new Set(decl.electrodes.map((e) => e.id));
  decl.leads.forEach((l, i) => {
    for (const k of ["lengthMm", "widthMm", "tMm"] as const) {
      if (!positive(l[k])) {
        throw circuitError({ code: "E_SCHEMA", path: `${at}/leads/${i}/${k}`, got: l[k] ?? null, expected: "a length above 0 mm", hint: `lead ${l.id}: declare ${k} in mm` });
      }
    }
  });
  const seen = new Set<string>();
  return decl.nets.map((n, i): SeriesPort => {
    const here = `${at}/nets/${i}`;
    if (seen.has(n.net)) throw circuitError({ code: "E_SCHEMA", path: `${here}/net`, got: n.net, expected: "a net id declared once", hint: "name each series net once" });
    seen.add(n.net);
    if (!(typeof n.resistorOhm === "number" && Number.isFinite(n.resistorOhm) && n.resistorOhm >= 0)) {
      throw circuitError({ code: "E_SCHEMA", path: `${here}/resistorOhm`, got: n.resistorOhm ?? null, expected: "a resistance of 0 ohm or more", hint: `net ${n.net}: declare the series resistor in ohm, 0 for none` });
    }
    if (n.electrode !== undefined && !electrodes.has(n.electrode)) {
      throw circuitError({ code: "E_REF", path: `${here}/electrode`, got: n.electrode, hint: `net ${n.net}: name an electrode scene.series declares` });
    }
    const legs = n.leads.map((id, j) => {
      const lead = decl.leads.find((l) => l.id === id);
      if (lead === undefined) throw circuitError({ code: "E_REF", path: `${here}/leads/${j}`, got: id, hint: `net ${n.net}: name a lead scene.series declares` });
      return legOf(leadFeature(lead, n.net, decl.material), profile);
    });
    const conductorOhm = legs.reduce((s, l) => s + l.ohm, 0);
    const q = qualify(legs.map((l) => l.tier));
    return {
      port: seriesPortId(n.net), net: n.net, interface: n.interface, electrode: n.electrode ?? null,
      resistorOhm: n.resistorOhm, leadMm: legs.reduce((s, l) => s + l.lengthMm, 0), conductorOhm,
      totalOhm: n.resistorOhm + conductorOhm, legs, tier: q.basis, q,
    };
  });
}
