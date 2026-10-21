// The SLUG page line the vend tests take as their check on the profile row,
// read from the original of record (fab-knowledge:originals/slug/files/slug.html,
// lineage slug.vend-program/slug-12): STEPS_REV on line 224 equals the
// half steps per revolution the drive reads from profile. Reads through
// localOriginal, so it runs on the owner runner and never skips.

import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { slugDrive } from "@hackbuild/motion";
import { localOriginal } from "../../../tools/test-support/originals-root.js";

const scad = readFileSync(new URL("../inputs/slug/slug.scad", import.meta.url), "utf8");
const page = readFileSync(localOriginal("fab-knowledge:originals/slug/files/slug.html"), "utf8").split("\n");

test("slug.html line 224 types the STEPS_REV the profile row holds", () => {
  const D = slugDrive(createProfileLookup(loadProfile()), scad);
  expect(page[223]).toContain(`const STEPS_REV = ${D.halfStepsPerRev};`);
});
