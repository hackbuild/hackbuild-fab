// circuit/capacitive-path-ceiling (M05-T12, D-021, C-12, C-13; CHK-NET-28):
// a capacitive touch electrode reads reliably only while its path stays at
// or under the Capricate ceiling, profile constant capacitive.pathCeilOhm
// (30 kohm, community: Schmitz et al., UIST 2015 saw the SNR fall under
// 5:1 above it for 5 to 20 mm electrodes in cABS). Present only when the
// facts declare capacitive true: the ceiling is a capacitive-touch SNR rule
// and says nothing about a pullup read (verified-claims C3, C12).
//
// net.ohm is the ceiling itself, on a net's total path resistance.
// conductor.pathLen inverts it for a declared section: L <= R w t / rho,
// read as the length whose section resistance (profile sectionResistance,
// the one home of R = rho L / A) meets the ceiling. The resistivity row is
// the material's printed row in facts.direction, along when absent; a range
// row reads its high end, the worst case.

import {
  commandError, qualify, qualifyRow, type Bound, type ConstraintCtx, type ConstraintDef, type ConstraintDim, type ResistivityDirection,
  type ResistivityRow,
} from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";

export const CAPACITIVE_NET_DIM: ConstraintDim = "net.ohm";
export const CAPACITIVE_LEN_DIM: ConstraintDim = "conductor.pathLen";

/** The profile constant the ceiling reads. */
export const CAPACITIVE_CEILING_ID = "capacitive.pathCeilOhm";

const DIRECTIONS: readonly ResistivityDirection[] = ["along", "across", "through"];

/** The ceiling row, ohm; E_SCHEMA when the row is not a resistance in ohm. */
export function capacitiveCeiling(ctx: Pick<ConstraintCtx, "profile">): { readonly ohm: number; readonly row: ReturnType<ConstraintCtx["profile"]["constant"]> } {
  const row = ctx.profile.constant(CAPACITIVE_CEILING_ID);
  if (row.unit !== "ohm" || !(row.value > 0)) {
    throw commandError({
      code: "E_SCHEMA", path: `/constants/${CAPACITIVE_CEILING_ID}`, got: `${String(row.value)} ${row.unit}`, expected: "a resistance above 0 in ohm",
      hint: `set profile constant ${CAPACITIVE_CEILING_ID} to the capacitive path ceiling in ohm`,
    });
  }
  return { ohm: row.value, row };
}

function direction(ctx: ConstraintCtx): ResistivityDirection {
  const d = ctx.facts["direction"] ?? "along";
  if (typeof d === "string" && (DIRECTIONS as readonly string[]).includes(d)) return d as ResistivityDirection;
  throw commandError({
    code: "E_SCHEMA", path: "/facts/direction", got: d, expected: DIRECTIONS.join(", "),
    hint: "direction is the print direction the path runs in: along, across or through", record: capacitivePathCeiling.id,
  });
}

const hiOhmCm = (row: ResistivityRow): number => (typeof row.ohmCm === "number" ? row.ohmCm : row.ohmCm[1]);

/** Resistance of one mm of the declared section, ohm: the high end of a range row. */
function ohmPerMm(row: ResistivityRow, wMm: number, tMm: number): number {
  const r = sectionResistance(row, 1, wMm * tMm).ohm;
  return typeof r === "number" ? r : r[1];
}

export const capacitivePathCeiling: ConstraintDef = {
  id: "circuit/capacitive-path-ceiling",
  version: "1.0.0",
  dims: [CAPACITIVE_NET_DIM, CAPACITIVE_LEN_DIM],
  kernels: ["circuit", "profile"],
  units: { [CAPACITIVE_NET_DIM]: "ohm", [CAPACITIVE_LEN_DIM]: "mm" },
  bounds(dim, ctx): readonly Bound[] {
    if (ctx.facts["capacitive"] !== true) return [];
    if (dim !== CAPACITIVE_NET_DIM && dim !== CAPACITIVE_LEN_DIM) return [];
    const ceil = capacitiveCeiling(ctx);
    // No number is typed here: each one a reason prints traces to a fact or a profile row (message-numbers test, D-010).
    const why = `the Capricate touch SNR ceiling for cABS electrodes (${CAPACITIVE_CEILING_ID}, ${ceil.row.provenance.tier}, measured by others: Schmitz et al., UIST)`;
    if (dim === CAPACITIVE_NET_DIM) {
      return [{
        value: ceil.ohm, side: "hi", kernel: "circuit", source: "CHK-NET-28",
        reason: `capacitive electrode path at most ${String(ceil.ohm)} ohm, ${why}`,
        ...qualifyRow(ceil.row.provenance.tier),
      }];
    }
    const w = ctx.facts["wMm"] as number;
    const t = ctx.facts["tMm"] as number;
    const dir = direction(ctx);
    const row = ctx.profile.resistivity(ctx.material, dir, "printed");
    return [{
      value: ceil.ohm / ohmPerMm(row, w, t), side: "hi", kernel: "circuit", source: "CHK-NET-28",
      reason: `${String(ceil.ohm)} ohm ceiling over a ${String(w)} x ${String(t)} mm section at ${String(hiOhmCm(row))} ohm cm ${dir} (${row.id}, ${row.provenance.tier}): L at most R w t / rho; ${why}`,
      ...qualify([row.provenance.tier, ceil.row.provenance.tier]),
    }];
  },
};
