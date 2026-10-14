// pin-free-balance-beam: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01; derive() ported at M06-T03 from STIPPLE R17b's
// link() (src/derive/balance-beam.ts) and typed at M06-T06 when its body,
// the page's geomOf("link") (src/bodies/balance-beam-link.ts), regenerated
// under the originals rule (test/balance-beam.body.test.ts). The original
// is the CANONS.md 11.1 row (D-222).

import type { MechanismDef } from "@hackbuild/spec";
import { BALANCE_BEAM_PARAMS, balanceBeamDerive } from "../derive/balance-beam.js";
import { inputSchema, type Values } from "../derive/common.js";
import { balanceBeamApply } from "../bodies/balance-beam-link.js";

export const pinFreeBalanceBeam: MechanismDef<Values> = {
  id: "pin-free-balance-beam",
  version: "1.0.0",
  family: "linkage",
  dof: null,
  params: inputSchema(BALANCE_BEAM_PARAMS),
  derive: (p) => balanceBeamDerive(p),
  apply: (input) => balanceBeamApply(input),
  governs: ["crown_top = (z_col + z_row)/2 + crown_r exactly"],
  failureModes: [],
  processes: ["laser"],
  provenance: "OGEE R17 STIPPLE 2026-08",
  status: "typed",
  reference: ["joints/balance-beam"],
  original: [
    { slug: "stipple", file: "files/stipple-r17b.html", fn: "DATA.parts.link, geomOf, link", lines: "117, 125 to 194", sha256: "f4afad81c417627e84349c5f6cf6b1016e520083ce8ac631b7d71fc6c02f1767", record: "stipple 4.1, 5" },
  ],
};
