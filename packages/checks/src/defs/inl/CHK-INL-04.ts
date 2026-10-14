// CHK-INL-04, bed-face art mirrored in X at extrude (python hackbuild coin
// v1 2026-08: the back wordmark printed backwards). The run body is owned
// by the inlay kernel (packages/inlay checks/inl-04.ts, M03-T08).

import { runInl04 } from "@hackbuild/inlay";
import { defineCheck } from "../../registry.js";

export const check = defineCheck({
  id: "CHK-INL-04",
  level: "part",
  run: (t, ctx) => runInl04(t, ctx),
});
