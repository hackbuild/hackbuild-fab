// router-negotiated: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origRouterNegotiated = refusedArchetype({
  id: "router-negotiated",
  family: "copper",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "PIP, TOGGLE originals (M06-T14, D-222); CANONS.md 11.3: two-layer PathFinder router with Prim trees, via cost and history; TOGGLE assignment DP and layer escalation; the one router of D-092",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/pip/files/pip-controller/src/router.js yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T13 with reference conductors/router",
  original: [
    { slug: "pip", file: "files/pip-controller/src/router.js", sha256: "c9217561d7341410c99793d72d3356f7637ff99b2be424639e1460111d4c16a0", record: "pip RECORD.md" },
    { slug: "pip", file: "files/haft-src/src/router.js", sha256: "f182a45a493c64c997d137b3eff0f57da782db9d57758e62de18e05522649bd4", record: "pip RECORD.md" },
    { slug: "toggle", file: "files/src/src/part2c.js", sha256: "af62a4f9ddbb90b9bcf1a85e941194aed0d929ea05471abef85fb0888b2aa0ef", record: "toggle RECORD.md" },
    { slug: "toggle", file: "files/src/src/part2d.js", lines: "121 to 260", sha256: "1da486e757df5334a0a920dd40cb54ef1d9780a39ffec7c4c919b3635f951523", record: "toggle RECORD.md" },
  ],
});
