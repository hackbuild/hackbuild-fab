// spec/circuit.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// Nets extracted from built conductive geometry, how a pin reads them, and
// the operating point checked against the receiving pin's thresholds.
// Version 4, 2026-10-04. Carries D-076, D-077, D-078, D-079, D-081, D-085,
// D-086, D-098.
// 2026-10-05: auto E12 pullup, rc-time and slide read models (gold standard P-22);
// PinReading.pullupOhm is null for a floating read (D-225).
//
// The model carries capacitance and contact resistance as well as bulk
// resistance: tau is R x C, so every C and every series contact element is
// a typed, qualified value. PIP measured crossings run 10 to 30 times the
// computed settle on eight of ten keys (D-079); ReadOutputs.residual keeps
// that gap as a number per net instead of prose.
//
// Pipeline (D-086): nets from conductive bodies; bulk resistance from a
// voxel conductance solve over the built conductive bodies with an
// anisotropic conductivity per cell from the along, across and through
// resistivity rows (NetResistance.solved), and a 1D path estimate kept as a
// fast preview (NetResistance.preview); analytic DC nodal solve over those
// resistances in the offline bake; eecircuit-engine 1.8.0 loads lazily only
// for device models and transients.
//
// Why a field solve: a 1D sum of length over mean area gives one answer for
// two nets with equal length and mean area whatever their Z transitions,
// pad fan-outs, T-junctions or key cones. Those are where printed nets lose
// resistance, and the through row is 4 times the along row in the PIP preset
// (2000 against 500 ohm cm, inferred, pip-controller src/layout.js:46).

import type { Micros, Ohm, Qualified, Qualifier, Tier, Volt, Mm, IsoDate } from "./ids.js";
import type { ContactKind } from "./profile.js";

/** Capacitance in picofarads (pF). */
export type Picofarad = number;

/** Pin read classification against one MCU's thresholds (D-076). */
export type PinState = "LOW" | "UNDEFINED" | "HIGH";

/**
 * Per-MCU pin row, held in the catalog with provenance (D-076). Values as of
 * 2026-10-04, vendor tier:
 * RP2040 pullup 50 to 80 kohm, VIL max 0.8 V, VIH min 2.0 V at IOVDD 3.3 V
 * (RP2040 datasheet pp. 616 to 617); Pico inherits RP2040 GPIO and is not
 * separately checked. ESP32-C3 pullup 45 kohm typical, VIL max 0.825 V
 * (0.25 VDD), VIH min 2.475 V (0.75 VDD) (datasheet v2.4 p. 55).
 */
export interface McuPinSpec {
  /** Catalog id, for example "rp2040", "pico", "esp32-c3". */
  readonly id: string;
  readonly name: string;
  /** Catalog id this row inherits GPIO figures from, for example pico from rp2040. */
  readonly inherits?: string;
  /** Supply the thresholds are stated at, V. */
  readonly vddV: Volt;
  /**
   * Internal pullup. A range when the datasheet gives min and max, a typical
   * value otherwise. circuit.solve sweeps both ends of a range; kind
   * "typical" is the case where the range is unknown, and a result built on
   * it names the typical value it used (ESP32-C3, 45 kohm typical).
   */
  readonly pullup:
    | { readonly kind: "range"; /** ohm */ readonly minOhm: Ohm; /** ohm */ readonly maxOhm: Ohm }
    | { readonly kind: "typical"; /** ohm */ readonly typOhm: Ohm };
  /** Highest input voltage that reads LOW, V. */
  readonly vilMaxV: Volt;
  /** Lowest input voltage that reads HIGH, V. */
  readonly vihMinV: Volt;
  readonly tier: Tier;
  /** Datasheet name, version and page, for example "RP2040 datasheet pp. 616 to 617". */
  readonly source: string;
  /**
   * Input capacitance of one GPIO, unit "pF", with its own qualifier and
   * source. PIP models 7 pF (inferred, pip-controller src/layout.js:46 cpin,
   * docs/electrical.md:121 "assumed 7 pF"); no datasheet figure is recorded
   * for RP2040 or ESP32-C3 as of 2026-10-04.
   */
  readonly inputCap: Qualified;
  /**
   * Input leakage current, unit "nA", with its own qualifier and source.
   * PIP models 1 nA (inferred, src/layout.js:46 leak); pip-controller
   * docs/electrical.md:65-67 states the RP2040 maximum is unconfirmed and
   * may be much higher. Drives idle droop on charge-release reads.
   */
  readonly leakage: Qualified;
  /**
   * Legacy BOSS thresholds, kept only to reproduce BOSS (D-076): one
   * threshold at 0.5 VIO and blocks.html's 0.3 to 0.7 VIO UI hint band, in
   * one record. Never used for a verdict.
   */
  readonly legacy?: LegacyThreshold;
}

/**
 * The BOSS legacy thresholds as one record, so the M05 reproduction can
 * classify against both: `single` is BOSS sim.js's one threshold and
 * `hintBand` is blocks.html's UI hint, both as fractions of VIO, unitless.
 */
export interface LegacyThreshold {
  /** Single read threshold, fraction of VIO, unitless. BOSS: 0.5. */
  readonly single: number;
  /** UI hint band [lo, hi], fractions of VIO, unitless. blocks.html: [0.3, 0.7]. */
  readonly hintBand: readonly [number, number];
}

/**
 * How a port is read (D-078). The firmware emitter reads these; waits are
 * calibrated from a coupon and computed waits carry the computed qualifier.
 */
export type ReadModel =
  | {
      readonly model: "pullup";
      /** Which level a press drives the pin to. */
      readonly active: "low" | "high";
      /**
       * External pullup in ohm; absent means the MCU internal pullup from
       * McuPinSpec. auto (P-22, TOGGLE HOOKUP): the E12 value nearest
       * `ratio` times the solved switch path resistance, recomputed on every
       * build and on every material edit (G-30); the readout states the
       * resistor, the pressed pin voltage and the internal pullup voltage to
       * avoid (G-29).
       */
      readonly externalOhm?: Ohm | { readonly auto: "e12"; /** unitless, TOGGLE 10 */ readonly ratio: number };
    }
  | {
      /**
       * RC time to threshold (P-22, TANG pads): the pin is charged, released
       * and timed until it crosses thresholdV; the readout gives the time in
       * us and in CPU cycles.
       */
      readonly model: "rc-time";
      /** Crossing voltage, V; from the MCU pin table where absent in a coupon. */
      readonly thresholdV: Volt;
      /** CPU clock for the cycle count, Hz. */
      readonly cpuHz: number;
    }
  | {
      /**
       * Two-phase membrane slide read (P-22, TANG): the wiper reads position
       * on the ADC, then a pullup phase reads pressure through the contact.
       */
      readonly model: "slide";
      readonly wiper: "adc";
      readonly pressure: "pullup";
    }
  | {
      readonly model: "charge-release";
      /** Level the pin is driven to before it floats; away from the active level. */
      readonly drive: "high" | "low";
      /** Drive time, us. PIP keys and touch both drive 30 us (computed, pip-controller docs/electrical.md). */
      readonly driveUs: Micros;
      /**
       * Float-and-wait before the read, us. PIP emitted firmware uses 3500 us
       * (pip_stick, measured crossings 113 to 2431 us) until a coupon
       * calibrates it (D-079); pip.ino still ships 200 us (D-080).
       */
      readonly waitUs: Micros;
      /**
       * Where waitUs comes from. "default": the PIP emit default 3500 us
       * (pip_stick.ino:25), a margin above the measured crossings, qualified
       * qualifyRow("inferred") (M05-T05 step 2, D-079). "coupon": the
       * calibrated wait row, qualified qualifyRow(row.provenance.tier). The
       * firmware emitter derives the Qualification; the chase never carries
       * one (D-007).
       */
      readonly waitSource: "default" | "coupon";
    }
  | {
      readonly model: "adc";
      /** ADC resolution, bits. */
      readonly bits: number;
      /** Samples averaged per read, count. */
      readonly samples: number;
      /** Reference voltage, V. */
      readonly refV: Volt;
    }
  | {
      readonly model: "ratiometric";
      /** The two nets whose readings form A / (A + B); their sum is the presence test. */
      readonly pair: readonly [string, string];
    }
  | {
      readonly model: "column-scan";
      /** Row net ids, driven in turn. */
      readonly rows: readonly string[];
      /** Column net ids, read per row. */
      readonly cols: readonly string[];
      /** Settle time after a row switches, us. */
      readonly settleUs: Micros;
    }
  | {
      readonly model: "ladder";
      /** Ladder step resistances, ohm, in key order. */
      readonly stepsOhm: readonly Ohm[];
      /** ADC resolution, bits. */
      readonly bits: number;
    };

export type ReadModelKind = ReadModel["model"];

/**
 * One leg of the 1D path estimate: length over mean cross section along one
 * print direction. Preview only; a verdict never rests on it when a
 * VoxelSolve exists.
 */
export interface DirectionalResistance {
  readonly direction: "along" | "across" | "through";
  /** Path length in this direction, mm. */
  readonly lengthMm: Mm;
  /** Mean cross section normal to the path, mm2. */
  readonly areaMm2: number;
  /** Resistivity used, ohm cm. */
  readonly ohmCm: number;
  /** Resistance contribution, ohm. */
  readonly ohm: Ohm;
}

/**
 * Where a cell's print direction comes from. The build writes the 3MF and
 * does not slice, so slicer toolpaths are not an input.
 * - "declared": the conductor feature declares a raster angle per layer.
 * - "wall-tangent": cells within perimeters x lineWidth of a side wall take
 *   the wall tangent as "along" (perimeters follow the outline).
 * - "interior-mixed": other cells take an in-plane isotropic conductivity at
 *   the geometric mean of along and across, standing in for infill that
 *   alternates direction per layer (inferred rule, replaced by "declared"
 *   or a coupon).
 * "through" is always +Z, the layer normal.
 */
export type DirectionSource = "declared" | "wall-tangent" | "interior-mixed";

/**
 * Cell conductivity in the cell's print frame: a diagonal tensor with along,
 * across and through entries, each from one profile ResistivityRow.
 */
export interface ConductivityTensor {
  /** Profile material id the rows belong to, for example "cpla". */
  readonly material: string;
  /** Resistivity along the print line, ohm cm. PIP preset cPLA 500 (inferred). */
  readonly alongOhmCm: number;
  /** Resistivity across lines in the layer plane, ohm cm. Equals along when the profile has no across row. */
  readonly acrossOhmCm: number;
  /** Resistivity through layers (Z), ohm cm. PIP preset cPLA 2000 (inferred). */
  readonly throughOhmCm: number;
  /** Profile ResistivityRow ids used, in along, across, through order. */
  readonly rows: readonly [string, string, string];
  /** Lowest tier among the three rows. */
  readonly tier: Tier;
}

/** The grid a VoxelSolve ran on. */
export interface VoxelGrid {
  /**
   * Cell size [x, y, z], mm. Default x = y = half the machine line width,
   * z = the layer height: 0.2, 0.2, 0.24 on ffc5p with the 0.4 preset.
   */
  readonly cellMm: readonly [x: Mm, y: Mm, z: Mm];
  /** Conductive cells in the solve, count. A 62 mm by 1.4 mm by 0.72 mm trace is 6,510 cells at the default size; a 12 mm PIP touch pad 0.72 mm thick is about 8,480 (computed). */
  readonly cells: number;
  /** Cells per DirectionSource, count. */
  readonly bySource: Readonly<Record<DirectionSource, number>>;
  /** Cell centre containment against the body mesh; a cell is conductive when its centre is inside. */
  readonly rule: "centre-inside";
}

/**
 * Terminal to terminal resistance from a finite-volume Laplace solve over
 * the voxelised conductive bodies of one net.
 *
 * Method: one unknown potential per cell; face conductance between
 * neighbours i and j is the series (harmonic) combination of each cell's
 * conductivity projected on the face normal, n^T sigma n, over the half-cell
 * distances (two-point flux). Terminal cells are Dirichlet at 1 V and 0 V;
 * all other boundary faces carry no flux. Faces between bodies of different
 * conductive materials join as perfect joints in the solve; their contact
 * resistance is added in series afterwards from Net.contacts, so no contact
 * is counted twice. The system is solved by conjugate gradient with a
 * Jacobi preconditioner in plain TypeScript, no dependency. R is 1 V over
 * the current leaving the 1 V terminal.
 *
 * Two-point flux is exact when the cell's print frame is grid aligned and
 * approximate otherwise; `discretisation` records the error bound the
 * references measure (straight traces at 0 and 45 degrees to the grid).
 */
export interface VoxelSolve {
  readonly method: "voxel-fv";
  /** The two terminal feature ids, in source to sink order. */
  readonly terminals: readonly [from: string, to: string];
  readonly grid: VoxelGrid;
  /** One tensor per conductive material on the net. */
  readonly tensors: readonly ConductivityTensor[];
  /** Solved bulk resistance terminal to terminal, ohm, contacts excluded. */
  readonly ohm: Ohm;
  readonly solver: {
    readonly name: "cg-jacobi";
    /** Iterations to convergence, count. */
    readonly iterations: number;
    /** Stop criterion on the relative residual norm, unitless. Default 1e-8. */
    readonly tolerance: number;
    /** Relative residual norm reached, unitless. */
    readonly residual: number;
    /** False when the iteration cap was hit; the net's qualifier is then "unknown". */
    readonly converged: boolean;
  };
  /**
   * Same solve at half the x and y cell size, when the build or a reference
   * asks for it: resistance in ohm and the relative change, unitless. A
   * change above 0.02 raises a BuildWarning on the net.
   */
  readonly refined?: { readonly ohm: Ohm; readonly relChange: number };
  /** Share of total dissipation by body id, unitless, summing to 1: where the resistance lives. */
  readonly dissipationByBody: Readonly<Record<string, number>>;
  /** Always "computed"; the tier of the result is the lowest tensor tier. */
  readonly qualifier: "computed";
}

/**
 * Both resistance estimates for one terminal pair, recorded together as Part
 * IR metrics (D-049) so the gap between them is visible.
 */
export interface NetResistance {
  readonly terminals: readonly [from: string, to: string];
  /** 1D path estimate: one leg per direction of travel, length over mean area. */
  readonly preview: {
    readonly method: "path-1d";
    readonly segments: readonly DirectionalResistance[];
    /** Sum of segment resistances, ohm. */
    readonly ohm: Ohm;
  };
  /** Voxel solve; null only in an interactive preview before the solve lands. Checks and exports require it. */
  readonly solved: VoxelSolve | null;
  /** solved.ohm over preview.ohm, unitless; null when solved is null. */
  readonly solvedOverPreview: number | null;
}

/**
 * One series contact element on a net: a terminal, or an interface where the
 * conductor changes material (cPLA to cTPU), or a clip, solder joint or
 * press contact. Resistance comes from a profile ContactRow; `ohm` is null
 * when no row exists, and the net's qualifier is then "unknown".
 */
export interface ContactElement {
  /** Terminal, pad or port feature id, or "<bodyA>|<bodyB>" for an interface. */
  readonly at: string;
  readonly kind: ContactKind;
  /** Profile ContactRow id used, or null when no row matches. */
  readonly row: string | null;
  /** Resistance range [lo, hi], ohm; null when no row matches. */
  readonly ohm: readonly [lo: Ohm, hi: Ohm] | null;
  readonly qualifier: Qualifier;
}

/** How a net's capacitance was obtained. */
export type CapMethod =
  /**
   * Parallel plate per overlap: C = eps0 x epsR x A / d, eps0 8.854e-3 pF/mm
   * (physical constant), epsR from profile constant "petg.epsR", A the
   * conductor overlap area and d the dielectric spacing from the buried stack
   * (D-085). Used only when "petg.epsR" carries a source.
   */
  | "parallel-plate"
  /**
   * PIP rule: pin capacitance plus 0.02 pF per mm of trace plus 1 pF
   * (inferred, pip-controller src/model.js:418). Used while "petg.epsR" has
   * no source; coupling is then not computed.
   */
  | "pip-per-mm";

/** A net extracted from the conductive bodies the build produced. */
export interface Net {
  /** Net id as declared on conductor and port features, for example "K1", "GND". */
  readonly id: string;
  /** Conductor feature ids on this net. */
  readonly conductors: readonly string[];
  /** Body ids whose conductive material carries this net. */
  readonly bodies: readonly string[];
  /** Pad and port feature ids on this net. */
  readonly terminals: readonly string[];
  /**
   * Resistance per terminal pair: the read path (pad to port) first, then
   * every other pair on a branched net.
   */
  readonly resistance: readonly NetResistance[];
  /**
   * Bulk resistance of the read path, ohm: resistance[0].solved.ohm, or
   * resistance[0].preview.ohm while the solve is pending (qualifier then
   * "unknown" for any verdict).
   */
  readonly bulkOhm: Ohm;
  /** Every terminal and every material interface on the path, in path order. */
  readonly contacts: readonly ContactElement[];
  /**
   * Total series resistance terminal to terminal [lo, hi], ohm: bulkOhm plus
   * the contact ranges. Contacts with ohm null add nothing and are listed in
   * `unpricedContacts`.
   */
  readonly totalOhm: readonly [lo: Ohm, hi: Ohm];
  /** ContactElement.at values with no profile row, so the total is a lower bound. */
  readonly unpricedContacts: readonly string[];
  /** Capacitance to the ground net, including the receiving pin's inputCap, pF. */
  readonly capToGndPf: Picofarad;
  /**
   * Capacitance to each neighbouring net by net id, pF. Empty under method
   * "pip-per-mm". Feeds crosstalk on charge-release reads.
   */
  readonly couplingPf: Readonly<Record<string, Picofarad>>;
  readonly capMethod: CapMethod;
  /** Lowest tier among the profile rows resistance and capacitance used. */
  readonly tier: Tier;
  /** "unknown" when any contact is unpriced; never "measured" without a coupon row. */
  readonly qualifier: Qualifier;
}

/**
 * Computed against measured for one net (D-079). The first golden is PIP:
 * computed settle 78 us (LEFT key) against measured crossings 113 to
 * 2431 us; ratio 10 to 30 on eight of ten keys, 1.4 on RIGHT, 5.3 on SELECT
 * (measured, pip-controller README.md:155-180). CHK-NET-29 records it.
 */
export interface ReadResidual {
  /** Measured crossing on a printed body or coupon, unit "us", qualifier measured. */
  readonly measuredUs: Qualified;
  /** Computed settle it is compared with, us. */
  readonly computedUs: Micros;
  /** measuredUs over computedUs, unitless. */
  readonly ratio: number;
  /** Source of the measurement: coupon id or repo path with line. */
  readonly source: string;
}

/**
 * Per-net read outputs (D-078). One record feeds the firmware emitter and
 * the drive pad. Waits travel as Qualified so a computed wait never reads
 * as a measured one (D-007).
 */
export interface ReadOutputs {
  readonly net: string;
  /** Resistance tau uses, Net.totalOhm hi end, ohm. */
  readonly rOhm: Ohm;
  /** Capacitance tau uses, Net.capToGndPf, pF. PIP LEFT key 9.109 pF (computed). */
  readonly cPf: Picofarad;
  /**
   * RC time constant of the slowest path, rOhm x cPf, us. PIP worked example
   * 15.7 us (computed: 1722798 ohm x 9.109 pF).
   */
  readonly tauUs: Micros;
  /** Settle criterion in time constants, count: 5 for keys, 3 for touch (pip-controller src/model.js:420 to 428). */
  readonly settleTaus: 3 | 5;
  /** Settle time, settleTaus x tau, us. PIP LEFT key 78 us at 5 tau (computed). */
  readonly settleUs: Micros;
  readonly wait: {
    /** Wait the emitted firmware uses, unit "us". PIP: 3500 us, inferred (waitSource "default", qualifyRow("inferred")), pip_stick.ino:25, until a coupon calibrates it (D-079). */
    readonly emit: Qualified;
    /** settleUs of the slowest path as a candidate wait, unit "us", qualifier computed. */
    readonly computed: Qualified;
    /** Wait the published firmware ships, unit "us", when it differs from emit. PIP: 200 us, pip.ino:20 (D-080). */
    readonly firmwareShipped?: Qualified;
  };
  /** Paths weaker than this do not settle inside wait.emit and are rejected, ohm. PIP A key at 200 us: 4.35 Mohm (computed). */
  readonly rejectOhm: Ohm;
  /** Touch paths accepted below this, ohm. PIP touch about 58 Mohm (computed). */
  readonly acceptOhm?: Ohm;
  /**
   * Pin voltage drift over wait.emit from MCU leakage into cPf, V
   * (leakage x wait / C). PIP touch: about 0.2 V at 1 nA (inferred,
   * docs/electrical.md:65).
   */
  readonly idleDroopV: Volt;
  /** True when wait.emit exceeds settleUs. */
  readonly ok: boolean;
  /** Measured against computed, when a crossing has been measured on this net. */
  readonly residual?: ReadResidual;
  readonly qualifier: Qualifier;
}

/** One solved voltage and its classification. */
export interface PinReading {
  /**
   * Pullup used for this reading, ohm; null when the pin floats with no pull
   * (a charge-release read). Never Infinity: a result has one canonical JSON
   * form (D-225).
   */
  readonly pullupOhm: Ohm | null;
  /** Pin voltage, V. */
  readonly volts: Volt;
  readonly state: PinState;
}

/**
 * Operating point of one net at one receiving pin (D-076, D-077). With a
 * pullup range, readings hold one entry per range end; the verdict takes the
 * worse. The BLOCKS rerun at BOSS 50 kohm reads 1.31 V at 10 mm of cPLA wire
 * to 2.39 to 2.42 V at 200 mm, and 3.15 to 3.27 V with cTPU wires (computed).
 */
export interface OperatingPoint {
  readonly net: string;
  /** McuPinSpec id the readings are classified against. */
  readonly mcu: string;
  /** Path resistance used, ohm. */
  readonly pathOhm: Ohm;
  readonly pressed: readonly PinReading[];
  readonly released: readonly PinReading[];
  /** True when every pressed reading and every released reading land in different defined states. */
  readonly distinguishable: boolean;
  readonly qualifier: Qualifier;
}

/** A coupon-calibrated wait, written to profile by a person (D-078). */
export interface WaitCalibration {
  readonly coupon: string;
  readonly date: IsoDate;
  /** Slowest measured crossing on the coupon, us. */
  readonly slowestUs: Micros;
  /** Wait chosen from it, us. */
  readonly waitUs: Micros;
}
