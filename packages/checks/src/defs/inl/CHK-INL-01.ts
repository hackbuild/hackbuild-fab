// CHK-INL-01, no stroke below line width (SPRUE 2026-08). The run body is
// owned by the inlay kernel (packages/inlay checks/inl-01.ts, M03-T08); the
// registry reads it here. Its version constant must equal the seed row
// (registry test).

import { runInl01, type InlayDecl } from "@hackbuild/inlay";
import { defineCheck } from "../../registry.js";

export const check = defineCheck<"feature", "inlay">({
  id: "CHK-INL-01",
  level: "feature",
  run: (t, ctx) => runInl01({ part: t.part, feature: t.feature as InlayDecl }, ctx),
});
