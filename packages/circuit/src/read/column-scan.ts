// Column-scan read model (M05-T05 step 1, D-078): drive one row high, read
// every column against its internal pull-down, threshold, next row. Ported
// from the BAFFLE key matrix (BAFFLE R1 README lines 85 to 88 and 120 to
// 124, originals baffle-r2/files/r1-raster/README.md; lineage
// baffle.readme/r1-raster): a closed key joins the
// driven row to the column through keyOhm, so the column sits at the
// divider VDD Rpd / (Rpd + Rkey) and reads HIGH above VIH; with no key the
// pull-down holds it at 0. The pull is the caller's (the BAFFLE C3 reads
// about 45 kohm, README line 99, inferred); spec McuPinSpec has no pull-down
// row, so no catalog value stands in. Settle: the slower of the pressed
// node (Rkey parallel Rpd) and the released node (Rpd) at SETTLE_TAUS.key
// time constants must fit inside the declared settleUs.

import type { McuPinSpec, Micros, Ohm, PinReading, Qualifier, ReadModel, Tier } from "@hackbuild/spec";
import { qualify } from "@hackbuild/spec";
import { rcTauUs } from "../flex-switch.js";
import { SETTLE_TAUS } from "./charge-release.js";
import { classify, distinguishable, dividerV } from "./pullup.js";

export type ColumnScanRead = Extract<ReadModel, { model: "column-scan" }>;

export interface ColumnScanInput {
  readonly read: ColumnScanRead;
  /** A closed key from row to column, ohm. */
  readonly keyOhm: Ohm;
  readonly keyTiers?: readonly (Tier | null)[];
  /** The column pin's internal pull-down, each end of its range, ohm. */
  readonly pulldownOhm: readonly Ohm[];
  readonly mcu: McuPinSpec;
  /** Column node capacitance, pF; absent means the row's inputCap. */
  readonly nodePf?: number;
}

export interface ColumnScanOutputs {
  readonly rows: readonly string[];
  readonly cols: readonly string[];
  /** One reading per pull-down end with the key closed and with it open. */
  readonly pressed: readonly PinReading[];
  readonly released: readonly PinReading[];
  readonly distinguishable: boolean;
  /** Slowest settle, SETTLE_TAUS.key x the slower tau, us. */
  readonly settleNeededUs: Micros;
  readonly ok: boolean;
  readonly qualifier: Qualifier;
}

export function columnScan(i: ColumnScanInput): ColumnScanOutputs {
  const vdd = i.mcu.vddV;
  const pf = i.nodePf ?? i.mcu.inputCap.value;
  // PinReading.pullupOhm carries the pull resistance whichever rail it ties to.
  const pressed = i.pulldownOhm.map((rpd): PinReading => {
    const volts = dividerV(vdd, i.keyOhm, 0, rpd);
    return { pullupOhm: rpd, volts, state: classify(volts, i.mcu) };
  });
  const released = i.pulldownOhm.map((rpd): PinReading => ({ pullupOhm: rpd, volts: 0, state: classify(0, i.mcu) }));
  const slowest = Math.max(...i.pulldownOhm.map((rpd) => Math.max(rcTauUs((i.keyOhm * rpd) / (i.keyOhm + rpd), pf), rcTauUs(rpd, pf))));
  const settleNeededUs = SETTLE_TAUS.key * slowest;
  const told = distinguishable(pressed, released);
  return {
    rows: i.read.rows,
    cols: i.read.cols,
    pressed,
    released,
    distinguishable: told,
    settleNeededUs,
    ok: told && i.read.settleUs >= settleNeededUs,
    qualifier: qualify([...(i.keyTiers ?? []), i.mcu.tier]).qualifier,
  };
}
