// CHK-3MF-06 and CHK-3MF-07 on an exported package (CASK 2026-09; CHECKS.md
// 7.2 and 7.3, D-068, D-069, D-159). Both read the package entries, never
// the geometry: 06 resolves every component reference across model parts,
// 07 types every per-filament vector in Metadata/project_settings.config
// against the harvested filament template.

import JSZip from "jszip";
import type { ArtifactBytes, Finding, TargetOf } from "@hackbuild/spec";
import type { FilamentTemplate } from "@hackbuild/3mf";
import { checkError } from "./common.js";

const ROOT_MODEL = "3D/3dmodel.model";
const ROOT_RELS = "3D/_rels/3dmodel.model.rels";
const SETTINGS = "Metadata/project_settings.config";
/** Keys the hackbuild writer must keep in export mode (CHECKS.md 7.3 rule 5, C-07). */
export const EXPORT_KEYS = ["filament_map", "filament_self_index", "filament_extruder_variant"] as const;
const PERCENT = /^[0-9]+%$/;

/** Package entries by name, inflated. */
export async function entriesOf(artifact: ArtifactBytes): Promise<ReadonlyMap<string, Uint8Array>> {
  if (artifact.entries !== undefined) return artifact.entries;
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(artifact.bytes);
  } catch (e) {
    throw checkError({
      code: "E_SCHEMA", path: `/artifacts/${artifact.name}`, got: String(e), expected: "a zip package",
      hint: `${artifact.name} is not a readable 3mf package; re-export it`, record: "3mf-dialect",
    });
  }
  const out = new Map<string, Uint8Array>();
  for (const f of Object.values(zip.files)) {
    if (!f.dir) out.set(f.name, await f.async("uint8array"));
  }
  return out;
}

// Kernels compile without DOM or node types; TextDecoder is a runtime global in both.
declare const TextDecoder: new (label: string) => { decode(input: Uint8Array): string };
const text = (b: Uint8Array): string => new TextDecoder("utf-8").decode(b);
const norm = (p: string): string => p.replace(/^\/+/, "");

function attrs(tag: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of tag.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
    if (m[1] !== undefined && m[2] !== undefined) out.set(m[1], m[2]);
  }
  return out;
}

const tags = (xml: string, name: string): Map<string, string>[] =>
  [...xml.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "g"))].map((m) => attrs(m[1] ?? ""));

const artifactTarget = (a: ArtifactBytes, path?: string): Finding["target"] =>
  ({ level: "artifact", artifact: a.name, ...(path === undefined ? {} : { path }) });

/** CHK-3MF-06: every component p:path resolves to a model part other than the root, and the object id exists there. */
export async function run3mf06(target: TargetOf<"artifact">): Promise<readonly Finding[]> {
  const entries = await entriesOf(target.artifact);
  const models = new Map<string, string>();
  for (const [name, bytes] of entries) if (/\.model$/i.test(name)) models.set(name, text(bytes));
  const relsBytes = entries.get(ROOT_RELS);
  const listed = new Set(relsBytes === undefined ? [] : tags(text(relsBytes), "Relationship").map((r) => norm(r.get("Target") ?? "")));
  const objectIds = new Map([...models].map(([name, xml]) => [name, new Set(tags(xml, "object").map((o) => o.get("id")))] as const));

  const failures: string[] = [];
  let components = 0;
  for (const [name, xml] of models) {
    tags(xml, "component").forEach((c, i) => {
      components += 1;
      const obj = c.get("objectid") ?? "";
      const raw = c.get("p:path");
      const where = `${name}#${obj}/${i}`;
      if (raw === undefined) {
        if (!objectIds.get(name)?.has(obj)) failures.push(`${where} missing object`);
        return;
      }
      const path = norm(raw);
      if (path === ROOT_MODEL) failures.push(`${where} self-reference`);
      else if (!listed.has(path) || !models.has(path)) failures.push(`${where} missing part`);
      else if (!objectIds.get(path)?.has(obj)) failures.push(`${where} missing object`);
    });
  }
  if (!models.has(ROOT_MODEL)) failures.push(`${ROOT_MODEL} missing part`);
  const ok = failures.length === 0;
  return [{
    verdict: ok ? "pass" : "fail",
    target: artifactTarget(target.artifact, ok ? undefined : ROOT_MODEL),
    measured: ok,
    legal: { kind: "boolean", must: true },
    constraint: "a component p:path names a model part listed in 3D/_rels/3dmodel.model.rels, other than the root model, holding the object id (D-068)",
    extra: { modelParts: models.size, components, failures: failures.length, ...(ok ? {} : { first: failures.slice(0, 5).join("; ") }) },
  }];
}

type ElementType = "nil" | "percent" | "int" | "float" | "string";

export function elementType(s: string): ElementType {
  if (s === "nil") return "nil";
  if (/^-?\d+(\.\d+)?%$/.test(s)) return "percent";
  if (/^-?\d+$/.test(s)) return "int";
  if (/^-?(\d+\.\d*|\.\d+|\d+)(e[-+]?\d+)?$/i.test(s)) return "float";
  return "string";
}

/**
 * Types a key's elements may take, from every slot of the template. The
 * template holds harvested values, not declared types, so a float key whose
 * gold slots all read "1" (filament_flow_ratio) looks like an integer key:
 * integer and float strings compare as one numeric class until the
 * template carries a type per key.
 */
function allowedTypes(values: readonly string[]): Set<ElementType> {
  const out = new Set(values.map(elementType));
  if (out.has("float") || out.has("int")) {
    out.add("int");
    out.add("float");
  }
  return out;
}

/** CHK-3MF-07: per-filament vectors one element per filament with the per-slot type; overhang_fan_threshold matches ^[0-9]+%$. */
export async function run3mf07(target: TargetOf<"artifact">, template: FilamentTemplate): Promise<readonly Finding[]> {
  const entries = await entriesOf(target.artifact);
  const bytes = entries.get(SETTINGS);
  const failures: string[] = [];
  let settings: Record<string, unknown> = {};
  if (bytes === undefined) failures.push(`${SETTINGS} missing`);
  else {
    try {
      const parsed: unknown = JSON.parse(text(bytes));
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) settings = parsed as Record<string, unknown>;
      else failures.push(`${SETTINGS} is not a json object`);
    } catch {
      failures.push(`${SETTINGS} is not json`);
    }
  }
  const types = settings["filament_type"];
  const n = Array.isArray(types) ? types.length : 0;
  if (bytes !== undefined && n === 0) failures.push("filament_type missing; filament count unknown");

  if (n > 0) {
    for (const [key, tvals] of Object.entries(template.keys)) {
      const v = settings[key];
      if (v === undefined) {
        failures.push(`${key} missing`);
        continue;
      }
      if (!Array.isArray(v)) {
        failures.push(`${key} is not a vector`);
        continue;
      }
      if (v.length !== n) failures.push(`${key} has ${v.length} elements for ${n} filaments`);
      const allowed = allowedTypes(tvals);
      v.forEach((el: unknown, slot) => {
        if (typeof el !== "string") failures.push(`${key} slot ${slot} holds ${JSON.stringify(el)}, not a string`);
        else if (key === "overhang_fan_threshold" && !PERCENT.test(el)) failures.push(`${key} slot ${slot} holds ${JSON.stringify(el)}, not ^[0-9]+%$`);
        else if (!allowed.has("string") && !allowed.has(elementType(el))) {
          failures.push(`${key} slot ${slot} holds ${JSON.stringify(el)}, type ${elementType(el)}, template ${[...allowed].join(" or ")}`);
        }
      });
    }
    for (const key of EXPORT_KEYS) if (!(key in settings) && !failures.includes(`${key} missing`)) failures.push(`${key} missing`);
  }
  const ok = failures.length === 0;
  return [{
    verdict: ok ? "pass" : "fail",
    target: artifactTarget(target.artifact, SETTINGS),
    measured: ok,
    legal: { kind: "boolean", must: true },
    constraint: `filament template of ${Object.keys(template.keys).length} per-slot keys (D-159); one element per filament, per-slot type from the template`,
    extra: { filaments: n, templateKeys: Object.keys(template.keys).length, failures: failures.length, ...(ok ? {} : { first: failures.slice(0, 5).join("; ") }) },
  }];
}
