// CHK-INL-03, inlay depth meets opacity floor for the filament pair
// (python hackbuild coin v1 2026-08: a 0.8 inlay over black tinted pink and
// white grey; 1.2 fixed it). The run body and drivenBy are owned by the
// inlay kernel (packages/inlay checks/inl-03.ts, M03-T08).

import { inl03DrivenBy, runInl03, type InlayDecl } from "@hackbuild/inlay";
import { defineCheck } from "../../registry.js";

export const check = defineCheck<"feature", "inlay">({
  id: "CHK-INL-03",
  level: "feature",
  run: (t, ctx) => runInl03({ part: t.part, feature: t.feature as InlayDecl }, ctx),
  drivenBy: (t) => inl03DrivenBy({ feature: t.feature as InlayDecl }),
});
