// M04-T11: the oracle inputs of the OGEE R16-P printed audit against the
// originals of record. audit_print.py, kin.py and params.scad of
// fab-knowledge:originals/ogee16/files/src/source are the bytes the pose
// files name (ogee16-audit.test.ts holds those names to the M04 header).
// Reads through localOriginal, so it runs on the owner runner and never
// skips.

import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { sha256Hex } from "@hackbuild/spec";
import { localOriginal } from "../../../tools/test-support/originals-root.js";
import { readPoseFile } from "../../sim/scenes/ogee16-printed";

test("audit_print.py, kin.py and params.scad are the bytes both pose files name", () => {
  for (const scene of ["ogee16-printed", "ogee16-printed-negatives"] as const) {
    const f = readPoseFile(scene);
    for (const m of ["audit_print.py", "kin.py", "params.scad"]) {
      expect(sha256Hex(new Uint8Array(readFileSync(localOriginal(`fab-knowledge:originals/ogee16/files/src/source/${m}`)))), `${scene} ${m}`).toBe(f.sources[m]);
    }
  }
});
