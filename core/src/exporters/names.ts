// Export file names (PACKAGES.md 8.2 `export file names`, M07-T14 step 6).
// core names every exported file; writers never do. Ported from COTTER
// (lineage cotter.kit/r5 and cotter.app3/r5): the slug and the quantity
// prefix are KIT.slug and KIT.qty (designs/cotter/legacy/kit.js lines 14
// and 15), the 56 character cut and the part, laser and plate forms are
// buildKit's (originals/cotter/files/cotter-src/src/app3.js lines 75, 81
// and 83, sha256 a1262092adbfe0cc), and a name seen twice in one export
// takes -2, -3 as app3.js uniq does (line 73).
//
//   part      xNN_<slug>.<ext>                  NN the quantity, at least two digits
//   laser     xNN_<slug>_<T>mm-<material>.<ext> T the stock thickness to 0.1 mm
//   assembly  <slug>_asm.<ext>
//   plate     plate-NN-of-NN_<group>.3mf        plate index from 1 and the plate count
//
// The 3d repo wrote quantity as a suffix (knobs_x3.stl); quantityOf reads
// it as a legacy alias and no function here writes it.

import { commandError } from "@hackbuild/spec";

/** Longest slug a name carries, characters (app3.js lines 75 and 83). */
export const SLUG_MAX = 56;

/** KIT.slug: lowercase, every run outside [a-z0-9] one dash, no dash at either end. */
export const slugOf = (s: string): string => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** KIT.qty: x and the count, zero padded to two digits. */
export const qtyOf = (n: number): string => {
  if (!Number.isInteger(n) || n < 1) throw commandError({ code: "E_SCHEMA", path: "/qty", got: n, expected: "a whole count of 1 or more", hint: "a file names how many copies to make" });
  return `x${String(n).padStart(2, "0")}`;
};

const cut = (s: string): string => slugOf(s).slice(0, SLUG_MAX);

/** A part file: xNN_<slug>.<ext>. */
export const partName = (slug: string, qty: number, ext: string): string => `${qtyOf(qty)}_${cut(slug)}.${ext}`;

/** A laser file: xNN_<slug>_<T>mm-<material>.<ext>, T the stock thickness in mm to 0.1. */
export const laserName = (slug: string, qty: number, tMm: number, material: string, ext: string): string =>
  `${qtyOf(qty)}_${cut(slug)}_${tMm.toFixed(1)}mm-${slugOf(material)}.${ext}`;

/** An assembly file: <slug>_asm.<ext>. */
export const assemblyName = (slug: string, ext: string): string => `${cut(slug)}_asm.${ext}`;

/** A plate file: plate-NN-of-NN_<group>.3mf, plate from 1. */
export const plateName = (plate: number, plates: number, group: string): string =>
  `plate-${String(plate).padStart(2, "0")}-of-${String(plates).padStart(2, "0")}_${cut(group)}.3mf`;

/** One export's names: a stem seen before takes -2, -3 (app3.js uniq), so no two files share a name. */
export function nameSet(): (name: string) => string {
  const used = new Set<string>();
  return (name: string): string => {
    const dot = name.lastIndexOf(".");
    const stem = dot < 0 ? name : name.slice(0, dot), ext = dot < 0 ? "" : name.slice(dot);
    let k = stem, i = 2;
    while (used.has(k)) k = `${stem}-${i++}`;
    used.add(k);
    return `${k}${ext}`;
  };
}

/** The quantity a file name states: the xNN_ prefix, or the 3d repo's _xN suffix read as a legacy alias; null when it states none. */
export function quantityOf(name: string): number | null {
  const base = name.slice(name.lastIndexOf("/") + 1);
  const pre = /^x(\d{2,})_/.exec(base);
  if (pre !== null) return Number(pre[1]);
  const legacy = /_x(\d+)\.[a-z0-9]+$/i.exec(base);
  return legacy === null ? null : Number(legacy[1]);
}
