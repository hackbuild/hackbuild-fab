// Scene slug-mouth58: the 58 mm mouth regression of the SLUG bench (M02-T08
// step 7). The slug scene with fb 29, so the square mouth is 58 mm (1.14
// capsule diameters), run as the bench record ran it: six trials of 13
// vends. The bench record is mean 5.5 of 13, worst 2 (BUILD.md lines 233
// to 234, declared); this scene declares no expectation of its own, and
// the test asserts only that its mean is below the 156 mm mouth's mean.
// Data only, types imported.

import type { SlugSceneVariant } from "../src/capsule/vend.js";

const BUILD = "fab-knowledge:originals/slug/files/BUILD.md (sha256 9babb59b59ecbc3f5a6f991c2804d10858fd6cc155baa1223ec1117b7f2e4a3e)";

export const SLUG_MOUTH58: SlugSceneVariant = {
  id: "slug-mouth58",
  base: "slug",
  geometry: {
    provenance: { tier: "inferred", method: "derived", date: "2026-10-07", source: `${BUILD} line 233 ("A 58 mm mouth is 1.14 capsule diameters"); fb is half the square mouth (slug.html line 836)` },
    fb: 29,
  },
  protocol: {
    provenance: { tier: "inferred", method: "derived", date: "2026-10-07", source: `${BUILD} line 234 ("six trials, mean 5.5 of a possible 13 vends, worst case 2")` },
    vends: 13,
  },
  trials: 6,
  seed: 1,
  status: "informational",
};
