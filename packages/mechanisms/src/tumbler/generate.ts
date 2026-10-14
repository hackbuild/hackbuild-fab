// The TUMBLER generator (M06-T02 step 3): a module's cut parts as sheet
// bodies on the M00 prism route. Parts are laid out by the original's own
// shelf packer at the cut file's width (packSheet, 240 mm, gap 9; the
// cut SVG of planSVGFile, lines 1762 to 1773), so no two bodies overlap,
// and each part is extruded from z 0 to the sheet thickness. Score lines
// carry no geometry (record 4.2: an engrave layer). sheetAudit's warnings
// become BuildWarnings (step 4).

import type { BodyDraft, BuildWarning, Ring, Vec2 } from "@hackbuild/spec";
import { packSheet, sheetAudit, type Placed, type SheetPart } from "./kit.js";
import type { SheetMaterial } from "./material.js";
import type { ModuleParams, TumblerModule } from "./modules.js";

/** The cut file's sheet width and part gap, mm (planSVGFile, lines 1762 to 1773). */
export const CUT_SHEET_WIDTH = 240;
export const CUT_SHEET_GAP = 9;

export interface SheetBuild {
  readonly parts: readonly SheetPart[];
  readonly placed: readonly Placed[];
  /** Sheet extents of the packed cut file, mm. */
  readonly sheet: { readonly w: number; readonly h: number };
  readonly bodies: readonly BodyDraft[];
  readonly warnings: readonly BuildWarning[];
}

/** A body id from a part name: "HINGE PANEL" gives "hinge-panel"; a repeat gains its index. */
function bodyIds(parts: readonly SheetPart[]): string[] {
  const used = new Set<string>();
  return parts.map((p, i) => {
    const base = p.name.toLowerCase().replace(/\(.*$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `part-${i + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
    used.add(id);
    return id;
  });
}

/** Signed area of a ring, mm2; positive when counter-clockwise. */
function area(r: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i]!;
    const q = r[(i + 1) % r.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Outer ring counter-clockwise, holes clockwise, as the prism route reads them. */
export function wind(r: readonly Vec2[], ccw: boolean): Ring {
  return (area(r) > 0) === ccw ? r : [...r].reverse();
}

/**
 * Plan the module and lay its parts out as prism bodies on one sheet at
 * [ox, oy, oz]. `slot` and `material` name the chase material slot every
 * body cuts from.
 */
export function generateSheet(mod: TumblerModule, p: ModuleParams, m: SheetMaterial, slot: number, material: string, at: readonly [number, number, number] = [0, 0, 0]): SheetBuild {
  const parts = mod.plan(p, m);
  const pack = packSheet(parts, CUT_SHEET_WIDTH, CUT_SHEET_GAP);
  const ids = bodyIds(parts);
  const move = (pts: readonly (readonly [number, number])[], x: number, y: number): Vec2[] => pts.map((q) => [q[0] + x + at[0], q[1] + y + at[1]]);
  const bodies = pack.placed.map((pl, i): BodyDraft => ({
    id: ids[i]!, role: "body", slot, material,
    base: {
      route: "prism",
      outline: [wind(move(pl.p.outer, pl.x, pl.y), true), ...pl.p.holes.map((h) => wind(move(h, pl.x, pl.y), false))],
      z: [at[2], at[2] + m.t],
    },
  }));
  const warnings = parts.flatMap((q) => sheetAudit(q, m.k).map((text): BuildWarning => ({ code: "SHEET_AUDIT", text: text.toLowerCase() })));
  return { parts, placed: pack.placed, sheet: { w: pack.w, h: pack.h }, bodies, warnings };
}
