// Draws the ESP32-C3 SuperMini footprint and symbol beside its catalog row.
// Both files are drawn here from published module facts so the catalog
// carries no third-party KiCad file (publish audit S-02, 2026-10-13):
// 2 rows of 8 at 2.54 mm pitch, rows 15.24 mm apart, body 22.52 x 18 mm
// (row.json dims.body, vendor listing), pad 1.14 mm and drill 0.84 mm
// (the values SPINDLE built with, vendor listing), and the pin map on the
// module silkscreen (GPIO0 to GPIO4, 3V3, GND, 5V down one side, GPIO5 to
// GPIO10, GPIO20, GPIO21 up the other).
//
// Run: node packages/catalog/scripts/draw-supermini.mjs

import { writeFileSync } from "node:fs";

const DIR = new URL("../data/modules/esp32c3-supermini/", import.meta.url);
const PITCH = 2.54;
const ROW_X = 7.62;
const PAD = 1.14;
const DRILL = 0.84;
const BODY_W = 18;
const BODY_L = 22.52;

// Pin number, name, KiCad electrical type. Numbers run 1 to 8 down x = +7.62
// from the top, then 9 to 16 back up x = -7.62.
const PINS = [
  [1, "GPIO0", "bidirectional"], [2, "GPIO1", "bidirectional"], [3, "GPIO2", "bidirectional"],
  [4, "GPIO3", "bidirectional"], [5, "GPIO4", "bidirectional"], [6, "3V3", "power_out"],
  [7, "GND", "power_in"], [8, "5V", "power_in"], [9, "GPIO5", "bidirectional"],
  [10, "GPIO6", "bidirectional"], [11, "GPIO7", "bidirectional"], [12, "GPIO8", "bidirectional"],
  [13, "GPIO9", "bidirectional"], [14, "GPIO10", "bidirectional"], [15, "GPIO20", "bidirectional"],
  [16, "GPIO21", "bidirectional"],
];

const r = (v) => Number(v.toFixed(4));

/** KiCad y is down; pin 1 sits at the bottom of the +x row in the part frame (+y up). */
function padAt(n) {
  const i = n <= 8 ? n - 1 : n - 9;
  const y = r((3.5 - i) * PITCH);
  return n <= 8 ? [ROW_X, y] : [-ROW_X, -y];
}

const hw = BODY_W / 2;
const hl = BODY_L / 2;
const mod = [
  '(footprint "hbf-esp32c3-supermini"',
  "  (version 20241229)",
  '  (generator "hackbuild-fab")',
  '  (layer "F.Cu")',
  '  (property "Reference" "REF**" (at 0 -13.5 0) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))',
  '  (property "Value" "ESP32-C3 SuperMini" (at 0 13.5 0) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15))))',
  "  (attr through_hole)",
  `  (fp_rect (start ${-hw} ${-hl}) (end ${hw} ${hl}) (stroke (width 0.1) (type solid)) (fill no) (layer "F.Fab"))`,
  `  (fp_rect (start ${r(-hw - 0.5)} ${r(-hl - 0.5)}) (end ${r(hw + 0.5)} ${r(hl + 0.5)}) (stroke (width 0.05) (type solid)) (fill no) (layer "F.CrtYd"))`,
  ...PINS.map(([n]) => {
    const [x, y] = padAt(n);
    return `  (pad "${n}" thru_hole circle (at ${x} ${y}) (size ${PAD} ${PAD}) (drill ${DRILL}) (layers "*.Cu" "*.Mask"))`;
  }),
  ")",
  "",
].join("\n");

const pinLine = ([n, name, type]) => {
  const left = n >= 9;
  const k = left ? n - 9 : n - 1;
  const y = r(8.89 - k * PITCH);
  const x = left ? -12.7 : 12.7;
  return `      (pin ${type} line (at ${x} ${y} ${left ? 0 : 180}) (length 2.54) (name "${name}" (effects (font (size 1.27 1.27)))) (number "${n}" (effects (font (size 1.27 1.27)))))`;
};
const sym = [
  "(kicad_symbol_lib",
  "  (version 20241209)",
  '  (generator "hackbuild-fab")',
  '  (symbol "hbf-esp32c3-supermini" (in_bom yes) (on_board yes)',
  '    (property "Reference" "U" (at 0 11.43 0) (effects (font (size 1.27 1.27))))',
  '    (property "Value" "ESP32-C3 SuperMini" (at 0 -11.43 0) (effects (font (size 1.27 1.27))))',
  '    (property "Footprint" "hbf-esp32c3-supermini" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))',
  '    (symbol "hbf-esp32c3-supermini_1_1"',
  "      (rectangle (start -10.16 10.16) (end 10.16 -10.16) (stroke (width 0) (type solid)) (fill (type background)))",
  ...PINS.map(pinLine),
  "    )",
  "  )",
  ")",
  "",
].join("\n");

writeFileSync(new URL("supermini.kicad_mod", DIR), mod);
writeFileSync(new URL("supermini.kicad_sym", DIR), sym);
