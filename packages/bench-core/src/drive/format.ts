// The drive pad readout line (M09-T10 step 2). One line per held target:
//   <target> <pin> reads <LOW|UNDEFINED|HIGH> on <mcu>, <R> Mohm computed,
//   settles <t> us computed, wait <w> us <qualifier> (<source>, <calibrated|uncalibrated>)
// PIP printed `A GP4 reads LOW (1.69 Mohm, crosses in 78 us)` (part3.js
// line 389): the same Mohm to two places, but its "crosses in" was the
// computed settle, which measured crossings of 113 to 2431 us outran
// (D-079). Here the settle is labelled computed and the wait the firmware
// uses stands beside it with its own qualifier.

import type { PinState } from "@hackbuild/spec";
import type { DriveRead, PadModel } from "./drive.js";

/** The source word of a wait: the firmware file the default came from, or the coupon id. */
export function waitSourceWord(r: Pick<DriveRead, "waitSource" | "waitFrom">): string {
  if (r.waitSource === "coupon") return `coupon ${r.waitFrom.trim() || "unknown"}`;
  const file = /([\w.-]+)\.\w+(?::\d+)?(?:\s|$)/.exec(r.waitFrom)?.[1];
  return file ?? (r.waitFrom.trim() || r.waitSource);
}

/** A time in us: whole numbers from 100 up, three significant figures below. */
export function us(t: number): string {
  return t >= 100 ? t.toFixed(0) : String(Number(t.toPrecision(3)));
}

export function readoutLine(r: DriveRead): string {
  return `${r.target} ${r.pin} reads ${r.logic} on ${r.mcu}, ${(r.ohm / 1e6).toFixed(2)} Mohm computed, `
    + `settles ${us(r.settleUs)} us computed, wait ${us(r.waitUs)} us ${r.waitQualifier} `
    + `(${waitSourceWord(r)}, ${r.calibrated ? "calibrated" : "uncalibrated"})`;
}

/**
 * The idle line: `all pins idle`, then the level each read model leaves
 * its pins at after the float (PIP: mech pins read high after the float,
 * touch pins low).
 */
export function idleLine(model: PadModel): string {
  const by = new Map<PinState, string[]>();
  for (const t of model.targets) {
    if (t.read === null || t.idle === null) continue;
    by.set(t.idle, [...(by.get(t.idle) ?? []), t.read.pin]);
  }
  const parts = [...by].map(([state, pins]) => `${pins.join(", ")} ${pins.length === 1 ? "reads" : "read"} ${state} after the float`);
  return parts.length === 0 ? "all pins idle" : `all pins idle: ${parts.join("; ")}`;
}

/** The pad's text: one line per held target that has a read, else the idle line. */
export function padLines(model: PadModel, held: readonly string[]): string[] {
  const lines = held.flatMap((id) => {
    const t = model.targets.find((x) => x.target === id);
    if (t === undefined) return [];
    return [t.read === null ? `${id} not read: ${t.missing ?? "no read"}` : readoutLine(t.read)];
  });
  return lines.length === 0 ? [idleLine(model)] : lines;
}
