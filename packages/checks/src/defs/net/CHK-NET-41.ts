// CHK-NET-41, slider travel (VERNIER 2026-08), entered by M05-T17 with its run body
// in packages/checks/src/copper, which runVinyl reaches over a cut-sheet
// board. No producer emits a vinyl board into Part IR yet, so the registry
// keeps it pending; the skip rule reports it until one does.

import { defineCheck } from "../../registry.js";

export const check = defineCheck({ id: "CHK-NET-41", level: "sheet", pending: "M05" });
