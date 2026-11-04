// pico-seat: the PIP press seat (src/pip/seat.ts, pip.md 5.7) holding a
// Raspberry Pi Pico, added in build mode (D-667) for a key bed on a Pico (the
// 2026-10-21 persona run, fab-knowledge evals/2026-10-21). The pads are the
// catalog row's KiCad footprint, two columns of 20 castellations 17.78 mm
// apart (packages/catalog/data/modules/pico/pins.json); the board is 21 by
// 51 by 1 mm (vendor, Pico datasheet section 2, as BOSS parts.js line 18
// declares it). The micro-USB height and overhang are inferred: no Pico
// drawing or STEP is in the repo, so the build warns until a person measures
// one board. Its reference is seats/pico-pressfit.

import type { ApplyIn, SchemaLike } from "@hackbuild/spec";
import { provenArchetype } from "../def.js";
import { PICO_BOARD, PICO_USB_INFERRED, picoSeatParams, seatApply, seatDerive, type SeatParams } from "../pip/seat.js";

export const picoSeat = provenArchetype({
  version: "1.0.0",
  id: "pico-seat",
  family: "printed",
  channels: null,
  senses: [],
  emits: ["pocket", "contact", "port", "window"],
  read: "none",
  limits: [
    "the USB height and overhang are inferred until a board is measured",
    "read charge-release; keys wait 3500 us in emitted firmware until a coupon calibrates, as the RP2040-Zero seat",
  ],
  provenance: "HAFT 2026-09-18 (the press seat), BOSS 2026-09 (the Pico board row), KiCad RaspberryPi_Pico_Common_THT (the pads)",
  status: "proven",
  reference: ["seats/pico-pressfit"],
  original: [
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "180 to 248", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip 5.7" },
    { slug: "boss", file: "files/boss-src/src/parts.js", fn: "BOARDS.pico", lines: "18 to 21", sha256: "e9e44eaca651fac61e248e5d066cb523ec7d71252c8a792d1ef09057f801d9e6", record: "boss 5.5" },
  ],
  params: picoSeatParams as unknown as SchemaLike<unknown, SeatParams>,
  derive: (p, profile) => seatDerive(p, profile, "ffc5p", PICO_BOARD),
  apply: (input: ApplyIn<SeatParams>) => {
    const out = seatApply(input, "pico-seat", PICO_BOARD);
    return { ...out, warnings: [...(out.warnings ?? []), { code: "USB_INFERRED", text: PICO_USB_INFERRED, param: "/usbH" }] };
  },
});
