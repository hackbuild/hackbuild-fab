// Catalog rows from the committed data tree or a .hbf cache (D-103,
// M08-T03 steps 1, 2 and 7). The loader is pure: the caller lists the files
// and hands their bytes in, so the package never touches a file system. A
// row lives at `<kind>/<id>.json` or `<kind>/<id>/row.json`, with anything
// it names (footprint, symbol, mesh) beside it. Every field carries its own
// provenance; the use comes from fields.ts; the row tier is its weakest
// geometry or connectivity field.
//
// An imported envelope mesh is read by the mesh kernel's importStl, the one
// winding test in the repo (D-102): its E_KERNEL refusal becomes E_SCHEMA at
// /mesh on the row, so the CRESSET rp2040 stand-in (signed volume -6506 mm3,
// computed) can never become a catalog envelope.

import {
  TIERS, commandError, isThrownCommandError, sha256Hex,
  type ActuatorRow, type CatalogField, type CatalogMesh, type PartRow, type Provenance, type Tier,
} from "@hackbuild/spec";
import { PROFILE_DATA, checkProvenance, findConstant, loadConstants, schemaError } from "@hackbuild/profile";
import { importStl } from "@hackbuild/mesh";
import { FIELD_NAMES, fieldUse } from "./fields.js";
import { mcuPinRow, type McuPinRow } from "./mcu.js";

/** Files under one catalog root, keyed by path relative to it with "/" separators. */
export type CatalogFiles = ReadonlyMap<string, Uint8Array>;

/** Folders that hold rows, one per PartRow kind family. */
export const ROW_DIRS = ["mcu", "modules", "actuators", "displays", "connectors"] as const;

const ROW_FILE = new RegExp(`^(?:${ROW_DIRS.join("|")})/(?:[a-z0-9][a-z0-9-]*\\.json|[a-z0-9][a-z0-9-]*/row\\.json)$`);

/** True for the path of a row file; attachments, READMEs and the M05 threshold table are not rows. */
export const isRowPath = (p: string): boolean => ROW_FILE.test(p);

/** A field the loader resolves from a file beside the row instead of an inline value (M08-T04). */
export type FieldResolver = (spec: Readonly<Record<string, unknown>>, ctx: ResolveCtx) => unknown;

export interface ResolveCtx {
  /** Row id, for messages. */
  readonly id: string;
  /** JSON pointer of the field. */
  readonly path: string;
  /** Text of a file beside the row; E_SCHEMA when absent. */
  text(name: string): string;
}

export interface LoadOptions {
  /** Resolvers by `from.kind`, for fields whose value is parsed from an attachment. */
  readonly resolvers?: Readonly<Record<string, FieldResolver>>;
}

export interface Catalog {
  readonly rows: ReadonlyMap<string, PartRow>;
}

const KINDS: readonly PartRow["kind"][] = ["mcu", "module", "connector", "fastener", "magnet", "insert", "actuator", "display", "sensor", "passive", "board", "other"];
const DRIVES: readonly ActuatorRow["drive"][] = ["servo", "geared-stepper", "stepper", "dc-gear"];

// Kernels compile without DOM or node types; TextDecoder is a runtime global in both.
declare const TextDecoder: new (label: string, opts?: { readonly fatal?: boolean }) => { decode(input: Uint8Array): string };
const decoder = new TextDecoder("utf-8", { fatal: true });

function obj(x: unknown, path: string, what: string): Record<string, unknown> {
  if (typeof x !== "object" || x === null || Array.isArray(x)) throw schemaError(path, `${what} is not an object`);
  return x as Record<string, unknown>;
}

function weakest(fields: readonly CatalogField[]): CatalogField | undefined {
  let lo: CatalogField | undefined;
  for (const f of fields) if (lo === undefined || TIERS.indexOf(f.provenance.tier) > TIERS.indexOf(lo.provenance.tier)) lo = f;
  return lo;
}

const PAD_SHAPES = ["rect", "oval", "circle", "roundrect"];
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Shape rules for the fields whose value a writer or check walks; other values pass as stored. */
function checkValue(name: string, v: unknown, path: string): void {
  if (name === "pins") {
    if (!Array.isArray(v) || v.length === 0) throw schemaError(`${path}/value`, "pins is a non-empty list");
    const seen = new Set<number>();
    v.forEach((x: unknown, i: number) => {
      const o = obj(x, `${path}/value/${i}`, "pin");
      if (!Number.isInteger(o["n"]) || typeof o["name"] !== "string" || o["name"] === "" || typeof o["role"] !== "string" || o["role"] === "") {
        throw schemaError(`${path}/value/${i}`, "a pin has an integer n, a name and a role");
      }
      if (seen.has(o["n"] as number)) throw schemaError(`${path}/value/${i}/n`, `pin ${String(o["n"])} listed twice`);
      seen.add(o["n"] as number);
    });
  } else if (name === "pads") {
    if (!Array.isArray(v) || v.length === 0) throw schemaError(`${path}/value`, "pads is a non-empty list");
    const seen = new Set<string>();
    v.forEach((x: unknown, i: number) => {
      const o = obj(x, `${path}/value/${i}`, "pad");
      const q = `${path}/value/${i}`;
      if (typeof o["pad"] !== "string" || o["pad"] === "" || typeof o["name"] !== "string") throw schemaError(q, "a pad has a pad number and a name");
      if (seen.has(o["pad"])) throw schemaError(`${q}/pad`, `pad ${o["pad"]} listed twice`);
      seen.add(o["pad"]);
      if (!PAD_SHAPES.includes(o["shape"] as string)) throw schemaError(`${q}/shape`, `pad shape ${String(o["shape"])} is not one of ${PAD_SHAPES.join(", ")}`);
      for (const k of ["x", "y", "w", "h"]) if (!finite(o[k])) throw schemaError(`${q}/${k}`, `pad ${k} is not a finite number, mm`);
      for (const k of ["drill", "holeDx"]) if (o[k] !== undefined && !finite(o[k])) throw schemaError(`${q}/${k}`, `pad ${k} is not a finite number, mm`);
    });
  } else if (name === "strapping" || name === "bootActivity") {
    if (!Array.isArray(v) || v.length === 0) throw schemaError(`${path}/value`, `${name} is a non-empty list`);
    v.forEach((x: unknown, i: number) => {
      const o = obj(x, `${path}/value/${i}`, name);
      if (typeof o["pin"] !== "string" || o["pin"] === "") throw schemaError(`${path}/value/${i}/pin`, `a ${name} entry names its pin`);
      if (name === "strapping" && !["high", "low", "any"].includes(o["spiBoot"] as string)) throw schemaError(`${path}/value/${i}/spiBoot`, "spiBoot is high, low or any");
      if (name === "bootActivity" && (typeof o["activity"] !== "string" || typeof o["drives"] !== "boolean")) throw schemaError(`${path}/value/${i}`, "a boot activity has an activity line and drives true or false");
    });
  } else if (name === "mout") {
    const o = obj(v, `${path}/value`, "mout");
    const vec = (x: unknown): x is number[] => Array.isArray(x) && x.length === 3 && x.every(finite);
    if (!vec(o["at"]) || !vec(o["dir"])) throw schemaError(`${path}/value`, "mout is { at: [x, y, z] mm, dir: [x, y, z] }");
    const n = Math.hypot(...(o["dir"] as number[]));
    if (Math.abs(n - 1) > 1e-9) throw schemaError(`${path}/value/dir`, `mout dir has length ${n}, expected a unit vector`);
  } else if (name.startsWith("dims.")) {
    const ok = finite(v) || (Array.isArray(v) && v.length > 0 && v.every(finite));
    if (!ok) throw schemaError(`${path}/value`, `${name} is a number or a list of numbers`);
  }
}

function loadField(name: string, raw: unknown, path: string, id: string, dir: string, files: CatalogFiles, opts: LoadOptions): CatalogField {
  const use = fieldUse(name);
  if (use === undefined) {
    throw schemaError(path, `unknown catalog field ${name}`, { got: name, expected: FIELD_NAMES.join(", ") });
  }
  const f = obj(raw, path, `field ${name}`);
  if (typeof f["unit"] !== "string" || f["unit"] === "") throw schemaError(`${path}/unit`, `field ${name} has no unit; write "unknown" when the source states none`);
  let provenance: Provenance;
  let value: unknown;
  const from0 = f["from"] as Record<string, unknown> | undefined;
  if (from0 !== undefined && from0["kind"] === "profile-constant") {
    // The number stays in profile until every reader moves here; the row
    // points at it and carries the constant's own provenance, so one number
    // keeps one home (PROFILE.md 10, M08-T05 step 6).
    if (f["provenance"] !== undefined || f["value"] !== undefined) throw schemaError(path, `field ${name} reads a profile constant and states neither value nor provenance`);
    const k = findConstant(loadConstants(PROFILE_DATA.constants), String(from0["id"]));
    if (k.unit !== f["unit"]) throw schemaError(`${path}/unit`, `field ${name} unit ${String(f["unit"])} differs from constant ${k.id} unit ${k.unit}`);
    provenance = k.provenance;
    value = k.value;
  } else if (f["from"] !== undefined) {
    provenance = checkProvenance(f["provenance"], `${path}/provenance`);
    if (f["value"] !== undefined) throw schemaError(path, `field ${name} has both value and from`);
    const from = obj(f["from"], `${path}/from`, "from");
    const kind = from["kind"];
    const resolve = typeof kind === "string" ? opts.resolvers?.[kind] : undefined;
    if (resolve === undefined) throw schemaError(`${path}/from/kind`, `no resolver for ${String(kind)}`, { got: kind });
    value = resolve(from, {
      id, path,
      text(file: string): string {
        const bytes = files.get(`${dir}/${file}`);
        if (bytes === undefined) throw schemaError(`${path}/from`, `${dir}/${file} is not beside the row`, { got: file });
        return decoder.decode(bytes);
      },
    });
  } else {
    provenance = checkProvenance(f["provenance"], `${path}/provenance`);
    if (f["value"] === undefined) throw schemaError(`${path}/value`, `field ${name} has no value`);
    value = f["value"];
  }
  checkValue(name, value, path);
  let conflicts: CatalogField["conflicts"];
  if (f["conflicts"] !== undefined) {
    if (!Array.isArray(f["conflicts"]) || f["conflicts"].length < 2) {
      throw schemaError(`${path}/conflicts`, "conflicts lists at least two bench values");
    }
    conflicts = f["conflicts"].map((c: unknown, i: number) => {
      const o = obj(c, `${path}/conflicts/${i}`, "conflict");
      if (o["value"] === undefined || typeof o["source"] !== "string" || o["source"] === "") {
        throw schemaError(`${path}/conflicts/${i}`, "a conflict names a value and its source");
      }
      return { value: o["value"], source: o["source"] };
    });
    if (provenance.tier !== "inferred") {
      throw schemaError(`${path}/provenance/tier`, `field ${name} has conflicting bench values and stays inferred until measured (D-104)`, { got: provenance.tier, expected: "inferred" });
    }
  }
  return { value, unit: f["unit"], use, provenance, ...(conflicts === undefined ? {} : { conflicts }) };
}

function loadMesh(raw: unknown, path: string, id: string, dir: string, files: CatalogFiles): CatalogMesh {
  const m = obj(raw, path, "mesh");
  const file = m["file"];
  if (typeof file !== "string" || file === "") throw schemaError(`${path}/file`, "mesh names no file");
  const bytes = files.get(`${dir}/${file}`);
  if (bytes === undefined) throw schemaError(`${path}/file`, `${dir}/${file} is not beside the row`, { got: file });
  try {
    const body = importStl(bytes, file);
    return { file, sha256: sha256Hex(bytes), signedVolumeMm3: body.volumeMm3 };
  } catch (e) {
    if (isThrownCommandError(e) && e.hbf.code === "E_KERNEL" && typeof e.hbf.got === "number") {
      const v = e.hbf.got;
      throw commandError({
        code: "E_SCHEMA", path, got: v, expected: "signed volume above 0 mm3 (outward winding)",
        hint: `row ${id}: winding inverted, signed volume ${v.toFixed(0)} mm3 (computed); reverse triangle order`,
        record: "D-102",
      });
    }
    throw e;
  }
}

/** One row from its file. `path` is the row file path relative to the catalog root. */
export function loadRow(path: string, files: CatalogFiles, opts: LoadOptions = {}): PartRow {
  const bytes = files.get(path);
  if (bytes === undefined) throw schemaError(`/${path}`, `${path} is not in the file set`);
  let raw: unknown;
  try {
    raw = JSON.parse(decoder.decode(bytes));
  } catch {
    throw schemaError(`/${path}`, `${path} is not JSON`);
  }
  const r = obj(raw, `/${path}`, "row");
  const id = r["id"];
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(id)) throw schemaError(`/${path}/id`, "row id must be lowercase letters, digits and hyphens");
  const stem = path.endsWith("/row.json") ? path.split("/").at(-2) : path.split("/").at(-1)?.replace(/\.json$/, "");
  if (stem !== id) throw schemaError(`/${path}/id`, `row id ${id} differs from its file name ${String(stem)}`, { got: id, expected: String(stem) });
  const dir = path.slice(0, path.lastIndexOf("/"));
  if (typeof r["name"] !== "string" || r["name"] === "") throw schemaError(`/${path}/name`, `row ${id} has no name`);
  if (!KINDS.includes(r["kind"] as PartRow["kind"])) throw schemaError(`/${path}/kind`, `row ${id} kind ${String(r["kind"])} is not a part kind`, { got: r["kind"], expected: KINDS.join(", ") });
  const kind = r["kind"] as PartRow["kind"];
  const rawFields = obj(r["fields"], `/${path}/fields`, "fields");
  const fields: Record<string, CatalogField> = {};
  for (const [name, f] of Object.entries(rawFields)) fields[name] = loadField(name, f, `/${path}/fields/${name}`, id, dir, files, opts);
  // A row may name its per-MCU threshold row in mcu-pins.json (D-076); the thresholds are never copied here.
  let mcu: PartRow["mcu"];
  if (r["mcu"] !== undefined) {
    if (typeof r["mcu"] !== "string") throw schemaError(`/${path}/mcu`, "mcu names a row of mcu-pins.json");
    mcu = mcuPinRow(r["mcu"], `/${path}/mcu` as `/${string}`);
  }
  const all = Object.values(fields);
  const pick = weakest(all.filter((f) => f.use !== "check")) ?? weakest(all);
  if (pick === undefined && mcu === undefined) throw schemaError(`/${path}/fields`, `row ${id} has no fields`);
  const provenance: Provenance = pick?.provenance ?? (mcu as McuPinRow).provenance;
  const tier: Tier = provenance.tier;
  const mesh = r["mesh"] === undefined ? undefined : loadMesh(r["mesh"], `/mesh`, id, dir, files);
  const base: PartRow = { id, name: r["name"], kind, tier, provenance, fields, ...(mcu === undefined ? {} : { mcu }), ...(mesh === undefined ? {} : { mesh }) };
  if (kind !== "actuator") return base;
  if (!DRIVES.includes(r["drive"] as ActuatorRow["drive"])) throw schemaError(`/${path}/drive`, `actuator ${id} drive ${String(r["drive"])} is not one of ${DRIVES.join(", ")}`);
  const mout = fields["mout"];
  if (mout === undefined) throw schemaError(`/${path}/fields/mout`, `actuator ${id} has no mout (D-104)`);
  return { ...base, kind: "actuator", drive: r["drive"] as ActuatorRow["drive"], mout } as ActuatorRow;
}

/** Every row under the root, by id. Two rows with one id are E_SCHEMA. */
export function loadCatalog(files: CatalogFiles, opts: LoadOptions = {}): Catalog {
  const rows = new Map<string, PartRow>();
  for (const p of [...files.keys()].filter(isRowPath).sort()) {
    const row = loadRow(p, files, opts);
    if (rows.has(row.id)) throw schemaError(`/${p}/id`, `row id ${row.id} appears twice in the catalog`);
    rows.set(row.id, row);
  }
  return { rows };
}
