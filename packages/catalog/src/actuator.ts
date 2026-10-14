// Actuator rows (D-104, M08-T05): servos and geared steppers share one row
// type. mout is the physical output shaft in the part frame, branded
// ShaftDir; the anatomical axis belongs to the design that places the part
// and carries the AnatomicalAxis brand, so the type system keeps the two
// apart (PAWL pawl.html lines 182 to 185: knee and hip shafts pointed
// inboard until mout was separated from axis).

import type { ActuatorRow, CatalogField, PartRow, ShaftDir, ShaftOut, Vec3 } from "@hackbuild/spec";
import { schemaError } from "@hackbuild/profile";
import type { Catalog } from "./load.js";
import { unknownPart } from "./lookup.js";

export const isActuator = (r: PartRow): r is ActuatorRow => r.kind === "actuator";

/** The actuator row for id; E_REF when absent, E_SCHEMA when the row is not an actuator. */
export function actuatorRow(catalog: Catalog, id: string): ActuatorRow {
  const r = catalog.rows.get(id);
  if (r === undefined) throw unknownPart(id, [...catalog.rows.values()].filter(isActuator).map((x) => x.id));
  if (!isActuator(r)) throw schemaError(`/catalog/${id}/kind`, `${id} is a ${r.kind} row, not an actuator`);
  return r;
}

/** The output shaft, brand applied: only a validated row field becomes a ShaftDir. */
export function shaftOut(row: ActuatorRow): ShaftOut {
  const v = row.mout.value as { at: Vec3; dir: Vec3 };
  return { at: v.at, dir: v.dir as ShaftDir };
}

/** What a design reads off one actuator field: the value, its tier and every bench value when the corpus disagrees. */
export interface ActuatorRead<T> {
  readonly value: T;
  readonly unit: string;
  readonly tier: CatalogField["provenance"]["tier"];
  readonly source: string;
  readonly benches: readonly { readonly value: T; readonly source: string }[];
}

export function readActuator<T = unknown>(row: ActuatorRow, field: string): ActuatorRead<T> {
  const f = row.fields[field] as CatalogField<T> | undefined;
  if (f === undefined) throw schemaError(`/catalog/${row.id}/${field}`, `actuator ${row.id} has no field ${field}`);
  return { value: f.value, unit: f.unit, tier: f.provenance.tier, source: f.provenance.source, benches: f.conflicts ?? [] };
}
