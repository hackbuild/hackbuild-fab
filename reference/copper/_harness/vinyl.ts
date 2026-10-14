// Test support for the cut-sheet references under reference/copper
// (M05-T14). It reads a reference's chase.ts as data, resolves params the
// way part.build does (core resolveParams), and loads the family's shipped
// inputs (core loadVinylInputs): the three Plex Mono woff2 files through
// node's brotli, and the owner's mark through the D-166 SVG document
// sanitiser. Nothing here measures geometry; packages/copper and
// packages/checks do.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Chase } from "@hackbuild/spec";
import type { VinylInputs } from "@hackbuild/copper";
import { readChaseSource } from "@hackbuild/chase";
import { resolveParams, type Values } from "../../../core/src/commands/build.js";
import { SURFACE_CHASE, loadVinylInputs } from "../../../core/src/commands/surface.js";

export const ROOT = new URL("../../../", import.meta.url);
export const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");
export const readBytes = (rel: string): Uint8Array => new Uint8Array(readFileSync(new URL(rel, ROOT)));

/** The family's fonts and mark, loaded as hbf parity loads them. */
export function loadInputs(): VinylInputs {
  return loadVinylInputs(fileURLToPath(ROOT));
}

/**
 * The chase of a surface reference, chase.surface.ts: core's surface build
 * path (core/src/commands/surface.ts) reads it for hbf parity, and it keeps
 * its own name because part.build, the metric record, the project graph,
 * cold rebuild and the determinism hashes enumerate every
 * reference/<area>/<id>/chase.ts as a part.build reference.
 */
export { SURFACE_CHASE };

export function chaseOf(dir: string): Chase {
  return readChaseSource(read(`${dir}/${SURFACE_CHASE}`), `${dir}/${SURFACE_CHASE}`).chase as Chase;
}

/** Params at the defaults, or with JSON pointer edits applied, as part.build resolves them. */
export function paramsOf(chase: Chase, edits?: Values): Values {
  return resolveParams(chase, edits, undefined);
}
