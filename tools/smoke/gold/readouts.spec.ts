// Gold rules, readouts (TESTING.md 8.5). No bench-layer rule sits in this
// group: G-25, G-26, G-27, G-29 and G-30 are chase-bound hook rows that
// M10-T17 adds here; G-28 is a check row and G-31 a unit row.
// Run: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { chaseBound } from "./gold.ts";

chaseBound("G-25", "a panel's readout text changes with its params");
chaseBound("G-26", "a readout with a verdict renders the threshold word");
chaseBound("G-27", "a field past its limit carries the error class and the limit check");
chaseBound("G-29", "HOOKUP states the resistor, the pressed pin voltage and the configuration to avoid");
chaseBound("G-30", "a resistivity edit moves every dependent readout in the same commit");
