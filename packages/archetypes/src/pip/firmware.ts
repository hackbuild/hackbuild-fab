// The firmware stub a PIP button reference emits (M06-T08 acceptance): the
// charge-release read with the waits D-079 sets for emitted firmware, keys
// 3500 us as pip_stick ships them (pip_stick.ino line 25) and touch 1500 us
// (pip.ino line 21, layout.js line 46), each with a comment naming the
// coupon that replaces it. pip.ino itself still ships KEY_WAIT_US 200;
// hackbuild-fab does not edit pip-controller (D-080, owner default).

/** Emitted waits, us (D-079; design values, inferred until a coupon). */
export const KEY_WAIT_US = 3500;
export const TOUCH_WAIT_US = 1500;

export interface StubPin {
  readonly name: string;
  readonly pin: string;
  readonly kind: "key" | "touch";
}

export function firmwareStub(design: string, pins: readonly StubPin[]): string {
  const lines = [
    `// ${design}: charge-release read stub, emitted by hackbuild-fab from the archetype.`,
    "// Drive the pin high for DRIVE_US, float it, read after the wait: low means pressed.",
    "#define DRIVE_US 30",
    `#define KEY_WAIT_US ${KEY_WAIT_US} // D-079 default as pip_stick ships it; replaced by the charge-release wait coupon (key path)`,
    `#define TOUCH_WAIT_US ${TOUCH_WAIT_US} // pip.ino line 21; replaced by the charge-release wait coupon (touch path, skin)`,
    "",
    ...pins.map((p) => `const int PIN_${p.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")} = ${p.pin.replace(/^GP/, "")}; // ${p.kind}, waits ${p.kind === "touch" ? "TOUCH_WAIT_US" : "KEY_WAIT_US"}`),
    "",
    "bool readPin(int pin, unsigned long waitUs) {",
    "  pinMode(pin, OUTPUT); digitalWrite(pin, HIGH); delayMicroseconds(DRIVE_US);",
    "  pinMode(pin, INPUT); delayMicroseconds(waitUs);",
    "  return digitalRead(pin) == LOW;",
    "}",
    "",
  ];
  return lines.join("\n");
}
