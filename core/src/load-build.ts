// Loading and building a design (M00-T13 step 7). chase.ts is read
// as data by the D-178 source reader (packages/chase), never executed;
// build.ts runs only in the build sandbox (sandbox.ts). Every design meshes
// on the packages/mesh stage runner (D-047) through packages/pipeline
// (stageDesign, stageMesh, adapterOf), which a baked bench shares (D-264).
// This file resolves a target given as a chase id and writes the build to
// the store.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Chase } from "@hackbuild/spec";
import { readChaseSource } from "@hackbuild/chase";
import type { MeshData } from "@hackbuild/mesh";
import { buildLines } from "@hackbuild/project";
import { stageDesign } from "@hackbuild/pipeline";
import type { Built, Design, Workspace } from "./commands/build.js";
import { cmdError, didYouMean } from "./errors.js";
import { Store, type BuildRecord, type SlotView } from "./store.js";

export { adapterOf, fullProfile, stageInputsOf, stageMesh, type Generated, type StageInputs } from "@hackbuild/pipeline";

/** A design without draft kinds, with its package kinds (packages/pipeline stageDesign). */
export function loadStageDesign(d: {
  readonly dir: string; readonly target: string; readonly chase: Chase;
  readonly buildFile: string; readonly defHash: Design["defHash"]; readonly ws: Workspace;
}): Design {
  return stageDesign(d);
}

/** Directories that may hold a chase: reference/<area>/<id> and designs/<id>, sorted. */
function chaseDirs(root: string): string[] {
  const out: string[] = [];
  const sub = (d: string): string[] => (existsSync(d) ? readdirSync(d).sort().map((x) => path.join(d, x)).filter((x) => statSync(x).isDirectory()) : []);
  for (const area of sub(path.join(root, "reference"))) out.push(...sub(area));
  out.push(...sub(path.join(root, "designs")));
  return out.filter((d) => existsSync(path.join(d, "chase.ts")));
}

/** The chase id and aliases a chase.ts declares, read as data; a chase the reader refuses names none. */
function chaseNamesOf(dir: string): { readonly id?: string; readonly aliases: readonly string[] } {
  try {
    const { chase } = readChaseSource(readFileSync(path.join(dir, "chase.ts"), "utf8"), path.join(dir, "chase.ts"));
    return { id: chase.meta.id, aliases: Array.isArray(chase.meta.aliases) ? chase.meta.aliases.filter((a): a is string => typeof a === "string") : [] };
  } catch {
    return { aliases: [] };
  }
}

/**
 * Every chase directory with the names a target may use for it: id,
 * aliases, basename and, under reference/, the <area>/<id> form the canon
 * registries list in CanonHit.reference.
 */
export function chaseIndex(root: string): { readonly dir: string; readonly rel: string; readonly names: readonly string[] }[] {
  return chaseDirs(root).map((d) => {
    const n = chaseNamesOf(d);
    const rel = path.relative(root, d);
    const parts = rel.split(path.sep);
    const areaId = parts.length === 3 && parts[0] === "reference" ? [`${parts[1]}/${parts[2]}`] : [];
    return { dir: d, rel, names: [...new Set([...(n.id === undefined ? [] : [n.id]), ...n.aliases, path.basename(d), ...areaId])] };
  });
}

/**
 * A design directory or a chase id, alias or directory name. An unknown
 * name is E_REF with the nearest names; a name two directories answer to is
 * E_REF listing both, so a copied design cannot shadow another by id.
 */
export function resolveTarget(target: string, cwd: string, root: string, at = "/chase"): string {
  const dir = path.resolve(cwd, target);
  if (existsSync(dir) && statSync(dir).isDirectory()) return dir;
  const known = chaseIndex(root);
  const hits = known.filter((k) => k.names.includes(target));
  if (hits.length === 1) return hits[0]!.dir;
  if (hits.length > 1) {
    throw cmdError({
      code: "E_REF", path: at, got: target, expected: "a name one chase directory answers to",
      didYouMean: hits.map((h) => h.rel).slice(0, 3),
      hint: `${hits.length} chase directories answer to ${target}: ${hits.map((h) => h.rel).join(", ")}; name the directory`,
    });
  }
  throw cmdError({
    code: "E_REF", path: at, got: target, expected: "a design or reference directory holding chase.ts, or its chase id",
    didYouMean: didYouMean(target, known.flatMap((k) => [k.rel, ...k.names])),
    hint: "name a design directory such as reference/keys/flex-pair, or a chase id",
  });
}

/** Slot views for the renderer: label and preview colour per chase slot. */
export function slotViews(built: Built): SlotView[] {
  const { chase, ws } = built.design;
  const used = [...new Set(built.part.bodies.map((b) => b.slot))].sort((a, b) => a - b);
  return used.map((slot) => {
    const decl = chase.materials.find((m) => m.slot === slot);
    const colour = decl?.preview ?? ws.template.keys["filament_colour"]?.[slot - 1] ?? "#808080";
    return { slot, material: decl?.material ?? "", label: decl?.label ?? `slot${slot}`, colour };
  });
}

/** Write a build and its meshes to the store; returns the record. */
export function storeBuild(store: Store, built: Built): BuildRecord {
  const rec: BuildRecord = {
    format: "hbf-build-1", buildHash: built.part.buildHash, chase: built.design.chase.meta.id, target: built.design.target,
    values: built.values, inputs: built.inputs, part: built.part, slots: slotViews(built), graph: buildLines(built.graph),
  };
  const meshes: MeshData[] = [...built.meshed.bodies.map((b) => b.mesh), ...built.meshed.slots.map((s) => s.mesh)];
  store.putBuild(rec, meshes);
  return rec;
}
