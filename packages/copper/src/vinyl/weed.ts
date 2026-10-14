// Weedability proof (D-092, SPLICE rev C README: "eroding every shape by
// 0.75 mm leaves one connected skeleton", so nothing tears while weeding).
// Each net is eroded by the profile constant vinyl.weedErode; a net that
// splits or vanishes fails, named with its piece count.

import type { Section } from "@hackbuild/geom";
import type { Mm } from "@hackbuild/spec";
import { islands, type Vinyl } from "./helpers.js";

export interface WeedNet {
  readonly net: string;
  /** Pieces left after the erosion; 0 when the net vanishes. */
  readonly pieces: number;
  readonly ok: boolean;
}

export interface WeedProof {
  readonly erode: Mm;
  readonly nets: readonly WeedNet[];
  readonly ok: boolean;
  /** Nets that split or vanish. */
  readonly failing: readonly string[];
}

export function weedProof(v: Vinyl, nets: ReadonlyMap<string, Section> | readonly (readonly [string, Section])[], erode: Mm): WeedProof {
  const list = [...nets];
  const out = list.map(([net, s]) => {
    const pieces = islands(v.buffer(s, -erode));
    return { net, pieces, ok: pieces === 1 };
  });
  return { erode, nets: out, ok: out.every((n) => n.ok), failing: out.filter((n) => !n.ok).map((n) => n.net) };
}
