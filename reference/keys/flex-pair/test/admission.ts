// Compile-time proof for M-S-T04: a design other than keys flex-pair cannot
// declare a draft kind through PartDraftAt before the kind's admitting
// milestone (spec/features.ts FEATURE_KIND_ADMISSION). tsc -b fails on an
// unused @ts-expect-error, so each refusal below is checked on every build.

import type { FitClassId, PartDraftAt, PocketFeature } from "@hackbuild/spec";

const tray = (z: number) => ({ origin: [0, 0, z] as const, normal: [0, 0, 1] as const, u: [1, 0, 0] as const });

const pocket: PocketFeature = {
  kind: "pocket", id: "pocket.coin", outline: [[-5, -5], [5, -5], [5, 5], [-5, 5]], face: tray(4), depth: 2,
  floor: "flat", fit: { class: "LOCATE" as FitClassId, drawnPerSide: 0.3, basis: "perSide" },
};

const base = {
  name: "COIN TRAY", process: "fdm", machine: "ffc5p",
  frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
  bodies: [],
} as const;

/** M00 admits no feature kind, so a pocket in another design is refused. */
export const trayAtM00: PartDraftAt<"M00"> = {
  ...base, id: "coin-tray",
  // @ts-expect-error pocket is admitted at M03 (FEATURE_KIND_ADMISSION); M00 admits no kind
  features: [pocket],
};

/** M03 admits pocket, and the same draft compiles. */
export const trayAtM03: PartDraftAt<"M03"> = { ...base, id: "coin-tray", features: [pocket] };

/** conductor waits for M05, so M03 refuses it. */
export const traceAtM03: PartDraftAt<"M03"> = {
  ...base, id: "coin-tray",
  features: [
    // @ts-expect-error conductor is admitted at M05 (FEATURE_KIND_ADMISSION)
    { kind: "conductor", id: "conductor.ring", material: "cpla", net: "GND", width: 1.4, t: 0.72,
      region: { centreline: [[0, 0], [10, 0]], face: tray(0.73) } },
  ],
};
