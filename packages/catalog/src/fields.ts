// What each catalog field feeds (D-102, M08-T03 steps 2 and 4). This table
// is the one place a field name gets its use: the loader stamps it on every
// stored field, the row tier reads it, and the export gate reads it. A
// geometry or connectivity field reaches the fabrication gate; a check field
// (thresholds, pullups, strapping notes, actuator dynamics) reaches checks
// and sim only, and its tier is reported inside the check result.
//
// Names are the stored keys of a row's `fields`. A dotted name takes the use
// of its prefix: `dims.shaftOffset` is geometry, `dyn.slew` is a check field.

import type { CatalogFieldUse } from "@hackbuild/spec";

const EXACT: Readonly<Record<string, CatalogFieldUse>> = {
  /** Land pattern: pad positions, sizes, drills. */
  pads: "geometry",
  /** Pin numbering and names. */
  pins: "connectivity",
  /** Body envelope as declared box or mesh. */
  envelope: "geometry",
  mountHoles: "geometry",
  keepouts: "geometry",
  /** Output shaft position and direction (actuators, D-104). */
  mout: "geometry",
  /** Strapping pins and boot activity, read by CHK-BRD-04 only. */
  strapping: "check",
  bootActivity: "check",
  /** Input thresholds and pullups (D-076), read by circuit checks only. */
  vil: "check",
  vih: "check",
  pullup: "check",
};

const PREFIX: Readonly<Record<string, CatalogFieldUse>> = {
  /** Named dimensions of the body, shaft, flange, glass, can. */
  dims: "geometry",
  /** Dynamics: ratio, torque, slew, accel, inertia, steps, servo control. */
  dyn: "check",
};

/** The use of a field name, or undefined when the name is not one the catalog knows. */
export function fieldUse(name: string): CatalogFieldUse | undefined {
  const exact = EXACT[name];
  if (exact !== undefined) return exact;
  const dot = name.indexOf(".");
  if (dot <= 0 || dot === name.length - 1) return undefined;
  return PREFIX[name.slice(0, dot)];
}

/** True when a field of this name reaches the fabrication export gate. Unknown names count as gated, so a typo fails closed. */
export function gatesExport(name: string): boolean {
  const use = fieldUse(name.split("/")[0] ?? name);
  return use !== "check";
}

/** Every exact name and prefix, for error messages. */
export const FIELD_NAMES: readonly string[] = [...Object.keys(EXACT), ...Object.keys(PREFIX).map((p) => `${p}.<name>`)];
