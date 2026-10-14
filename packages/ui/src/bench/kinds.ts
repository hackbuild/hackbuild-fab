// Bench kinds and their region maps (D-126). Six kinds are fixed; M09 builds
// single and composer. surface, board, machine and catalog mount at M10
// with their designs, and the shell refuses any kind without an entry here
// with an error that names it.
//
// composer (PIP, BLOCKS): header, steps, guide, stage left, one raised rail
// right at --hb-rail with a 3 px ink left edge, one pane per step.
// single (COLLAR): header, steps, guide, a sunk design rail left, the stage,
// a readout rail right; 330 / 1fr / 300, two columns at 1180.

export interface KindRegions {
  /** Where the step's params panels go. */
  readonly design: "rail" | "left";
  /** Class on the shell root that bench.css lays out. */
  readonly layout: string;
}

export const KINDS: Readonly<Record<string, KindRegions>> = {
  composer: { design: "rail", layout: "hbf-kind-composer" },
  single: { design: "left", layout: "hbf-kind-single" },
};

/** Error line for a kind the shell cannot mount; null when it can. */
export function kindError(kind: string): string | null {
  if (Object.hasOwn(KINDS, kind)) return null;
  return `bench kind ${kind} has no region map in this shell; it mounts ${Object.keys(KINDS).join(" and ")} (D-126)`;
}
