// CHK-INL-02, despeckle at 0.35 x min-feature disc area (COLLAR v3 2026-08:
// despeckle at the full disc ate the full stop of hack.build). The run body
// is owned by the inlay kernel (packages/inlay checks/inl-02.ts, M03-T08).

import { runInl02 } from "@hackbuild/inlay";
import { defineCheck } from "../../registry.js";

export const check = defineCheck({
  id: "CHK-INL-02",
  level: "part",
  run: (t, ctx) => runInl02(t, ctx),
});
