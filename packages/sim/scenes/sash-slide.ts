// SASH slide scene (M02-T10). Reads the runCheck inputs captured from the
// legacy bench by designs/sash/extract/capture.py (one fixture per
// case: the battery preset plus the 21 cases of the bench's sweep.py) and
// hands them to the prismatic raster sweep. Nothing physical is typed here:
// the rasters, pitch, lane frame and every xLeft(k) are the bench's own
// values. The sample step is the bench's half pitch (`k += 0.5`,
// src/part2.js line 829 inside designs/sash/legacy/sash-src.zip).

import { readdirSync, readFileSync } from "node:fs";
import { commandError } from "@hackbuild/spec";
import { prismaticSweep, type PrismaticInput, type PrismaticLaneResult, type RasterFrame } from "../src/sweep/prismatic.js";

export const FIXTURES = new URL("../../../designs/sash/extract/fixtures/", import.meta.url);

/** runCheck samples the travel at half a detent pitch (part2.js:829). */
export const HALF_STEP = 0.5;

/** The bench's `BENCH.check().lanes` row, as captured. */
export interface CapturedLane {
  readonly i: number;
  readonly name: string;
  readonly N: number;
  readonly overlapCells: number;
  readonly overlapK: number;
  readonly [field: string]: unknown;
}

export interface SashFixture {
  readonly case: string;
  readonly js: string;
  readonly res: number;
  readonly fit: { readonly cx: number; readonly cy: number; readonly cz: number };
  readonly front: RasterFrame;
  /** Run-length pairs: value, count. */
  readonly wall: readonly number[];
  readonly lanes: readonly {
    readonly i: number;
    readonly N: number;
    readonly p: number;
    readonly Ls: number;
    readonly Ws: number;
    readonly slideY: number;
    readonly dir: 1 | -1;
    readonly xLeft: readonly (readonly [number, number])[];
    readonly slide: RasterFrame & { readonly meta: readonly number[] };
  }[];
  readonly check: readonly CapturedLane[];
  /** Battery preset only: the bench's runCheck on its wall raster shifted toward lane 0's slide body. */
  readonly negative?: readonly { readonly shiftCells: number; readonly lanes: readonly { readonly i: number; readonly overlapCells: number; readonly overlapK: number }[] }[];
}

/** Every fixture slug on disk, sorted; the battery preset is `battery-default`. */
export function sashCases(): string[] {
  return readdirSync(FIXTURES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

export function decodeRle(pairs: readonly number[], cells: number): Uint8Array {
  const out = new Uint8Array(cells);
  let at = 0;
  for (let q = 0; q < pairs.length; q += 2) {
    out.fill(pairs[q]!, at, at + pairs[q + 1]!);
    at += pairs[q + 1]!;
  }
  if (at !== cells) throw commandError({ code: "E_SCHEMA", path: "rle", got: at, expected: `${cells} cells`, hint: `a SASH fixture raster decodes to ${at} cells, expected ${cells}`, record: "viewer-sim" });
  return out;
}

export function loadSashFixture(slug: string): SashFixture {
  const names = sashCases();
  if (!names.includes(slug)) throw commandError({ code: "E_REF", got: slug, expected: "a SASH fixture slug", hint: `no SASH fixture ${slug}`, didYouMean: names.slice(0, 5), record: "viewer-sim" });
  return JSON.parse(readFileSync(new URL(`${slug}.json`, FIXTURES), "utf8")) as SashFixture;
}

/** The sweep input of a fixture; `wall` replaces the captured wall raster when given. */
export function sashInput(fx: SashFixture, wall?: Uint8Array): PrismaticInput {
  const f = fx.front;
  return {
    frame: f,
    wall: wall ?? decodeRle(fx.wall, f.W * f.H),
    step: HALF_STEP,
    lanes: fx.lanes.map((l) => {
      const table = new Map(l.xLeft.map(([k, x]) => [k, x]));
      const name = fx.check.find((c) => c.i === l.i)?.name ?? `lane ${l.i + 1}`;
      return {
        name,
        N: l.N,
        Ls: l.Ls,
        Ws: l.Ws,
        slideY: l.slideY,
        dir: l.dir,
        xLeft: (k: number) => {
          const x = table.get(k);
          if (x === undefined) throw commandError({ code: "E_REF", got: k, expected: "a captured position", hint: `fixture ${fx.case} has no xLeft at k ${k}`, record: "viewer-sim" });
          return x;
        },
        slide: { ...l.slide, meta: decodeRle(l.slide.meta, l.slide.W * l.slide.H) },
      };
    }),
  };
}

export function sashSlideSweep(slug: string): PrismaticLaneResult[] {
  return prismaticSweep(sashInput(loadSashFixture(slug)));
}
