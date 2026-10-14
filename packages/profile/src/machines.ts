// Machines, toolheads and dated presets (D-101, PROFILE.md 8). Preset ids
// are <machine>[-n<nozzle x 100>]_<yyyymmdd>, dated by the slicer save they
// were harvested from; the first preset listed is the machine default.

import type { Machine, MachinePreset, Mm } from "@hackbuild/spec";
import { PROCESSES } from "@hackbuild/spec";
import { checkProvenance, schemaError, type ProvenanceRules } from "./provenance.js";

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Preset id form of PROFILE.md 8.1. */
export const PRESET_ID = /^[a-z0-9]+(-n\d{3})?_\d{8}$/;

function checkPreset(x: unknown, path: string, machineId: string, rules: ProvenanceRules): MachinePreset {
  if (!isObj(x)) throw schemaError(path, "preset is not an object");
  const id = x["id"];
  if (typeof id !== "string" || !PRESET_ID.test(id) || !id.startsWith(machineId)) {
    throw schemaError(`${path}/id`, `preset id ${String(id)} is not <machine>[-n<nozzle>]_<yyyymmdd>`, {
      got: id, expected: `${machineId}[-n<nozzle x 100>]_<yyyymmdd>`,
    });
  }
  for (const k of ["nozzle", "layer", "firstLayer", "lineWidth"]) {
    if (!isNum(x[k]) || x[k] <= 0) {
      throw schemaError(`${path}/${k}`, `preset ${id} needs ${k} in mm`, { got: x[k], expected: "a number above 0, mm" });
    }
  }
  const loops = x["wallLoops"];
  if (!isNum(loops) || !Number.isInteger(loops) || loops < 1) {
    throw schemaError(`${path}/wallLoops`, `preset ${id} needs wallLoops, the slicer wall_loops count, a whole number of at least 1`, {
      got: loops, expected: "a whole number of at least 1",
    });
  }
  const s = x["slicer"];
  if (!isObj(s) || ["app", "printer", "process", "filament"].some((k) => typeof s[k] !== "string")) {
    throw schemaError(`${path}/slicer`, `preset ${id} needs slicer app, printer, process and filament`);
  }
  const c = x["comp"];
  if (!isObj(c) || ["xyHole", "xyContour", "elephantFoot", "elephantFootLayers"].some((k) => !isNum(c[k]))) {
    throw schemaError(`${path}/comp`, `preset ${id} needs the four slicer compensation fields`);
  }
  checkProvenance(x["provenance"], `${path}/provenance`, rules);
  return x as unknown as MachinePreset;
}

/** Validate parsed machines.json. */
export function loadMachines(raw: unknown, rules: ProvenanceRules = {}): Machine[] {
  if (!isObj(raw) || !Array.isArray(raw["machines"])) throw schemaError("/machines", "machines.json needs a machines array");
  return raw["machines"].map((x: unknown, i): Machine => {
    const path = `/machines/${i}`;
    if (!isObj(x) || typeof x["id"] !== "string") throw schemaError(path, "machine row needs an id");
    const id = x["id"];
    if (!(PROCESSES as readonly unknown[]).includes(x["process"])) {
      throw schemaError(`${path}/process`, "unknown process", { got: x["process"], expected: PROCESSES.join(", ") });
    }
    const env = x["envelope"];
    const okEnv = (Array.isArray(env) && env.length === 3 && env.every(isNum))
      || (isObj(env) && Array.isArray(env["sheet"]) && env["sheet"].length === 2 && env["sheet"].every(isNum));
    if (!okEnv) throw schemaError(`${path}/envelope`, `machine ${id} envelope needs three mm or a sheet pair`);
    if (x["kerf"] !== undefined && x["kerf"] !== null && !isNum(x["kerf"])) {
      throw schemaError(`${path}/kerf`, "kerf is mm or null until a coupon measures it", { got: x["kerf"], expected: "a number, mm, or null" });
    }
    const heads = x["toolheads"];
    if (!Array.isArray(heads)) throw schemaError(`${path}/toolheads`, `machine ${id} needs a toolheads list`);
    heads.forEach((h: unknown, j) => {
      if (!isObj(h) || h["index"] !== j + 1 || !isNum(h["nozzleMm"]) || typeof h["flexOk"] !== "boolean") {
        throw schemaError(`${path}/toolheads/${j}`, `toolhead ${j + 1} needs index ${j + 1}, nozzleMm and flexOk`);
      }
      checkProvenance(h["provenance"], `${path}/toolheads/${j}/provenance`, rules);
    });
    const presets = x["presets"];
    if (!Array.isArray(presets)) throw schemaError(`${path}/presets`, `machine ${id} needs a presets list`);
    presets.forEach((p: unknown, j) => checkPreset(p, `${path}/presets/${j}`, id, rules));
    if (x["process"] === "fdm" && heads.length > 0 && presets.length === 0) {
      throw schemaError(`${path}/presets`, `fdm machine ${id} with toolheads needs a preset`);
    }
    checkProvenance(x["provenance"], `${path}/provenance`, rules);
    return x as unknown as Machine;
  });
}

// ---- layer grid (MachineView semantics, spec/build.ts) ----

/** Top of layer index i (count from 0), mm: firstLayer + i x layer. */
export function layerTop(p: Pick<MachinePreset, "firstLayer" | "layer">, i: number): Mm {
  return p.firstLayer + i * p.layer;
}

/**
 * Float tolerance of the layer grid, mm (spec/build.ts MachineView): a z
 * within this of a layer top is on it. layerIndex and layerTopsAround share
 * it, so a check and the snap never disagree about a z.
 */
export const LAYER_TOL_MM = 1e-6;

/** Index of the layer whose top is at or above z less LAYER_TOL_MM (count from 0). */
export function layerIndex(p: Pick<MachinePreset, "firstLayer" | "layer">, z: Mm): number {
  if (z <= p.firstLayer) return 0;
  return Math.max(0, Math.ceil((z - p.firstLayer - LAYER_TOL_MM) / p.layer));
}

/**
 * The layer tops around z, mm: above is the snapped top (snapLayer); below
 * is above when z is within LAYER_TOL_MM of it, else the top under it,
 * floored at firstLayer. A z is on the grid when it equals either within
 * the tolerance.
 */
export function layerTopsAround(p: Pick<MachinePreset, "firstLayer" | "layer">, z: Mm): readonly [below: Mm, above: Mm] {
  const i = layerIndex(p, z);
  const above = layerTop(p, i);
  const below = Math.abs(z - above) <= LAYER_TOL_MM ? above : layerTop(p, Math.max(0, i - 1));
  return [below, above];
}

/** Snap an absolute height up to the next layer top, mm. */
export function snapLayer(p: Pick<MachinePreset, "firstLayer" | "layer">, z: Mm): Mm {
  return layerTop(p, layerIndex(p, z));
}
