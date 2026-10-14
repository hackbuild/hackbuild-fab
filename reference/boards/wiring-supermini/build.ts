// reference/boards/wiring-supermini/build.ts
// The SPINDLE R1 pin map (fab-work-directory benches/spindle/outputs/spindle
// README.md, "Pin map (verified against the module silkscreen)"): motor X
// on GPIO 0, 1, 3, 4 to J1 IN1 to IN4, motor Y on GPIO 5, 6, 7, 10 to J2,
// the laser gate on GPIO20, the calibration sensor on GPIO2, the spare on
// GPIO21, and the three supply pins. No wire ends: SPINDLE routes copper,
// so the drawing shows the module's pin use only.

import type { WiringDraft } from "@hackbuild/wiring";

export function build(): WiringDraft {
  return {
    kind: "wiring",
    board: "esp32c3-supermini",
    used: [
      { pin: "GPIO0", function: "X IN1" }, { pin: "GPIO1", function: "X IN2" }, { pin: "GPIO3", function: "X IN3" }, { pin: "GPIO4", function: "X IN4" },
      { pin: "GPIO5", function: "Y IN1" }, { pin: "GPIO6", function: "Y IN2" }, { pin: "GPIO7", function: "Y IN3" }, { pin: "GPIO10", function: "Y IN4" },
      { pin: "GPIO20", function: "LASER" }, { pin: "GPIO2", function: "CAL" }, { pin: "GPIO21", function: "SPARE" },
      { pin: "5V", function: "5V" }, { pin: "GND", function: "GND" }, { pin: "3V3", function: "3V3" },
    ],
    ends: [],
  };
}
