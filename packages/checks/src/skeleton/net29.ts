// CHK-NET-29, charge-release path settles inside the wait (PIP 2026-09,
// CHECKS.md 9.4). The skeleton set (M-S-T06) runs the one run body,
// packages/checks/src/net/net29.ts (M05-T19), over the skeleton's nets:
// with no circuit view it reads the record from the net, Net.totalOhm hi
// end through Net.capToGndPf, by the one charge-release reader.

export { SETTLE_TAUS, runNet29 } from "../net/net29.js";
