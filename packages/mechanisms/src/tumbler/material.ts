// The TUMBLER material strip (originals/tumbler/files/tumbler.html lines
// 192 to 203, `MATS` and `G`). These are the bench's declared values, so
// every row reads inferred: no coupon measured a kerf or a modulus here.
// The profile carries ply3 and acrylic3 with kerf null and no POM, HDPE,
// cardboard or print-sheet rows, so the legacy strip is kept as the bench
// preset the parity suite runs (M06-T02 card defects). A sheet part reads
// t, k, c and E only through a SheetMaterial.

import type { Process } from "@hackbuild/spec";

export interface SheetMaterial {
  /** The bench's row name, for example "Delrin/POM 3mm". */
  readonly name: string;
  /** Sheet thickness, mm. */
  readonly t: number;
  /** Kerf, mm; 0 on the print rows. */
  readonly k: number;
  /** Fit clearance per face, mm (G.c). */
  readonly c: number;
  /** Young's modulus, MPa. */
  readonly E: number;
  /** laser for the cut rows, fdm for the three print rows (record 4.3). */
  readonly process: Process;
  /** Where the number comes from. */
  readonly provenance: { readonly tier: "inferred"; readonly method: "declared"; readonly source: string };
}

/** G.c, line 203: fit clearance per face, mm, the bench default for every row. */
export const TUMBLER_FIT = 0.15;

const src = (line: number): SheetMaterial["provenance"] => ({
  tier: "inferred", method: "declared", source: `originals/tumbler/files/tumbler.html line ${line} (MATS); G.c line 203`,
});

const row = (name: string, t: number, k: number, E: number, line: number): SheetMaterial => ({
  name, t, k, c: TUMBLER_FIT, E, process: k === 0 ? "fdm" : "laser", provenance: src(line),
});

/** MATS in the original's order; the first row is the bench default (G, line 203). */
export const TUMBLER_MATERIALS: readonly SheetMaterial[] = [
  row("Delrin/POM 3mm", 3.0, 0.22, 3100, 193),
  row("Delrin/POM 1.5mm", 1.5, 0.20, 3100, 194),
  row("Acrylic 3mm", 3.0, 0.15, 3200, 195),
  row("Plywood 3mm", 3.0, 0.20, 9000, 196),
  row("Cardboard 3mm", 3.0, 0.30, 800, 197),
  row("HDPE 3mm", 3.0, 0.35, 900, 198),
  row("PLA print 2mm", 2.0, 0.00, 3500, 199),
  row("PETG print 2mm", 2.0, 0.00, 2100, 200),
  row("TPU print 1.5mm", 1.5, 0.00, 30, 201),
];

/** The bench default row, Delrin/POM 3 mm. */
export const TUMBLER_DEFAULT_MATERIAL: SheetMaterial = TUMBLER_MATERIALS[0]!;

export function tumblerMaterial(name: string): SheetMaterial | undefined {
  return TUMBLER_MATERIALS.find((m) => m.name === name);
}
