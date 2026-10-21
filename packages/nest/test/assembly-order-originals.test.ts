// M07-T09: the viewers' assembly steps extracted again from the originals of
// record and held to the committed record packages/nest/records/ogee16-steps.json,
// which assembly-order.test.ts reads. designs/ogee16/extract/extract-steps.mjs
// reads viewer_template.html and printed_viewer_template.html of
// fab-knowledge:originals/ogee16/files/src/source through
// tools/test-support/originals-root.ts, so this file runs on the owner
// runner (.github/scripts/owner-files.mjs) and never skips.

import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { canonicalize } from "@hackbuild/spec";
// @ts-expect-error the extraction tool is plain JavaScript with no declarations
import { lasercut, printed } from "../../../designs/ogee16/extract/extract-steps.mjs";

const stepsRecord = (JSON.parse(readFileSync(new URL("../records/ogee16-steps.json", import.meta.url), "utf8")) as { result: unknown }).result;

test("the extraction run on the originals equals the committed record", () => {
  expect(canonicalize({ lasercut: lasercut() as unknown, printed: printed() as unknown })).toBe(canonicalize(stepsRecord));
});
