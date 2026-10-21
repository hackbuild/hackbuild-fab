// The SLUG BUILD.md lines the trials and the scenes quote, read from the
// original of record (fab-knowledge:originals/slug/files/BUILD.md, sha256
// 9babb59b): the declared 126 of 128 of SLUG_SCENE.expected and the hood
// note the open-hood trial in slug-trials.test.ts rests on. Reads through
// localOriginal, so it runs on the owner runner and never skips.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { localOriginal } from "../../../tools/test-support/originals-root.js";
import { SLUG_SCENE } from "../scenes/slug.js";

const bytes = readFileSync(localOriginal("fab-knowledge:originals/slug/files/BUILD.md"));
const build = bytes.toString("utf8").split("\n");

test("BUILD.md is the file the scenes cite by sha256", () => {
  const sum = createHash("sha256").update(bytes).digest("hex");
  expect(sum).toBe("9babb59b59ecbc3f5a6f991c2804d10858fd6cc155baa1223ec1117b7f2e4a3e");
  expect(SLUG_SCENE.expected?.source).toContain(sum);
});

test("the declared expectation is BUILD.md line 266", () => {
  expect(build[265]).toContain("126 of 128 vends across eight trials delivered exactly one capsule");
  expect(build[266]).toContain("both the first vend of a run");
});

test("without the hood the exit pocket refills (BUILD.md lines 219 to 221)", () => {
  expect(build.slice(218, 221).join(" ")).toContain("Without the hood, the pocket sitting on the exit is refilled from above");
});
