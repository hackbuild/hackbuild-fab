// layoutHash (D-051): sha256 of the RFC 8785 canonical JSON of the
// placements sorted by sheet, then id by UTF-16 code units, then copy, so
// the hash names the layout and never the order a packer produced it in.

import { canonicalize, sha256Hex, type Hash, type Placement } from "@hackbuild/spec";

const byKey = (a: Placement, b: Placement): number =>
  a.sheet - b.sheet || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) || a.copy - b.copy;

/** Placements in hash order. */
export function sortPlacements(placements: readonly Placement[]): Placement[] {
  return placements.slice().sort(byKey);
}

export function layoutHash(placements: readonly Placement[]): Hash {
  return sha256Hex(canonicalize(sortPlacements(placements))) as Hash;
}
