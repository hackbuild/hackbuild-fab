// M02-T07: the OGEE16 sweep oracle golden against the originals of record.
// check_sweep.py and params.scad of fab-knowledge:originals/ogee16/files/src/source
// and the three crank assemblies of ogee16-print-stl.zip are the bytes
// packages/sim/test/goldens/ogee-sweep-oracle.json names. Reads through
// localOriginal, so it runs on the owner runner and never skips.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { localOriginal } from "../../tools/test-support/originals-root.js";
import { zipMember } from "../../tools/test-support/stored-inputs.js";

const SOURCE = "fab-knowledge:originals/ogee16/files/src/source/";
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const golden = JSON.parse(readFileSync(new URL("../../packages/sim/test/goldens/ogee-sweep-oracle.json", import.meta.url), "utf8")) as {
  checkSweepSha256: string; paramsSha256: string; shippedSha256: Record<string, string>;
};

test("the oracle golden names the original check_sweep.py, params.scad and shipped cranks byte for byte", () => {
  expect(sha(readFileSync(localOriginal(`${SOURCE}check_sweep.py`)))).toBe(golden.checkSweepSha256);
  expect(sha(readFileSync(localOriginal(`${SOURCE}params.scad`)))).toBe(golden.paramsSha256);
  const zip = readFileSync(localOriginal("fab-knowledge:originals/ogee16/files/exports/ogee16-print-stl.zip"));
  for (const [c, want] of Object.entries(golden.shippedSha256)) expect(sha(zipMember(zip, `print/${c}.stl`)), c).toBe(want);
});
