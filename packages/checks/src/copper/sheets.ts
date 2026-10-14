// Sheet gates (gen_keyway.py lines 285 to 287 and 382 to 383): every film
// inside the outline keepout (CHK-NET-36), each spacer one connected piece
// (CHK-NET-37), and every emitted layer document reporting one W x H
// (CHK-NET-38). The generator ran the document size gate after writing,
// where it could not block emission (knowledge/designs/keyway.md 7.2);
// here the documents are built in memory and the gate runs before any is
// written.

import { contains, islands } from "@hackbuild/copper";
import type { EmittedLayer } from "@hackbuild/copper";
import { boolGate, sheetTarget, type Gate, type GateCtx } from "./gate.js";

export function filmKeepout(ctx: GateCtx): Gate {
  const d = ctx.board.draft;
  const films = ctx.v.union(d.films.map(ctx.board.shape));
  const ok = contains(ctx.board.keepout, films);
  const name = d.filmName ?? "film";
  return boolGate("CHK-NET-36", ok, `${name} inside the shared outline keepout`, sheetTarget(ctx, "film"),
    `every ${name} piece lies inside the outline inset by the board's edge keep`);
}

export function spacersOnePiece(ctx: GateCtx): Gate {
  const counts = ctx.board.draft.spacers.map((s) => islands(ctx.board.shape(s)));
  const ok = counts.every((n) => n === 1);
  const n = counts.length;
  return boolGate("CHK-NET-37", ok, `${n === 2 ? "both spacers are" : `all ${n} spacers are`} single connected pieces`, sheetTarget(ctx, "spacer"),
    "each spacer sheet is one connected piece, so it lifts and places whole", { pieces: counts.join(" ") });
}

/** Python's repr of a float: 110.0, 174.5. */
const pyFloat = (v: number): string => (Number.isInteger(v) ? `${v}.0` : String(v));

export function oneDocumentSize(ctx: GateCtx, layers: readonly EmittedLayer[]): Gate {
  const sizes = new Set(layers.map((l) => (l.size === null ? "none" : `(${pyFloat(l.size[0])}, ${pyFloat(l.size[1])})`)));
  const ok = sizes.size === 1 && !sizes.has("none");
  return boolGate("CHK-NET-38", ok, `all ${layers.length} layer SVGs report one doc size ${[...sizes].join(" ")}`, { level: "artifact", artifact: "layers" },
    "every layer document reports the same W x H, so sizing one layer in the cutter's software registers all", { sizes: [...sizes].join(" ") });
}
