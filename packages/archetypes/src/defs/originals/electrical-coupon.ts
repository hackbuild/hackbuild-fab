// electrical-coupon: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origElectricalCoupon = refusedArchetype({
  id: "electrical-coupon",
  family: "coupon",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "PIP originals (M06-T14, D-222); CANONS.md 11.3: coupon on the same stack: trace runs, layer crossing, split widths, bump pair, flex key, click spring; fix the bleed omission and the settle rule",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pip/files/haft-src/src/coupon.js lines 45 to 246 yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: fix the bleed omission and the settle rule; promotes at M10-T13 with reference coupons/pip-electrical",
  original: [
    { slug: "pip", file: "files/haft-src/src/coupon.js", lines: "45 to 246", sha256: "a33e2741ba772f96ab557c8b9e087fb04796e28f118cbf7f65e9dfaec7eebb35", record: "pip RECORD.md" },
  ],
});
