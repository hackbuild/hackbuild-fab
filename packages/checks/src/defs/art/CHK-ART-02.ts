// CHK-ART-02, an artifact rebuilds from its shipped source to the same mesh
// hash (M04-T10 step 5, CHECKS.md 9.7, D-051, D-052). Origin: NACELLE
// 2026-08-02 to 08-03. Its shipped params.scad and nacelle_body.scad build
// the Aug 2 console body, 200 x 230 x 73, while the shipped
// nacelle_body.stl is the Aug 3 CRT body, 170 x 233 x 193.2; the screen STL
// matched its SCAD (knowledge/designs/nacelle.md 1.2, benches-coins-inlay.md
// section 6). The drift showed only as one body whose bounding box the
// source did not reproduce, so the check compares every mesh object on its
// own and reports both boxes on a mismatch.
//
// The artifact states its source in Metadata/hackbuild_chase.json as
// {chase, buildHash} (M00-T07 step 7) and its SOURCE_DATE_EPOCH in the zip
// mtime every entry carries (D-052). The rebuild itself runs in core, the
// only holder of BuildInputs, and reaches the check as the `rebuild` view:
// given the stated source it returns the build hash and the 3MF bytes the
// same writer gives at those inputs. Both packages pass through the D-166
// reader and the same model parse, and meshHash is our own over welded
// vertices and sorted triangles (CHECKS.md 9.7: never a library's export),
// so entry bytes from another writer cannot move the verdict.

import type { ArtifactBytes, Finding, ResultTarget, TargetOf } from "@hackbuild/spec";
import { readEntries, readModels, scanTags, type ModelPart } from "@hackbuild/3mf";
import { bounds, meshHash, type MeshData } from "@hackbuild/mesh";
import { defineCheck } from "../../registry.js";
import { viewsOf, type ArtifactRebuild, type StatedSource } from "../../views.js";
import { boolFinding, fmt } from "../common.js";

export const CHASE_ENTRY = "Metadata/hackbuild_chase.json";
const MODEL_SETTINGS = "Metadata/model_settings.config";

export type { ArtifactRebuild, Rebuilt, StatedSource } from "../../views.js";

/**
 * SOURCE_DATE_EPOCH from the first local file header's DOS date and time.
 * The writer sets them from the UTC fields of the epoch (packages/3mf
 * zip.ts), so they are read back as UTC. undefined when the bytes hold no
 * local header.
 */
export function zipEpoch(bytes: Uint8Array): number | undefined {
  if (bytes.length < 30 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) return undefined;
  const time = bytes[10]! | (bytes[11]! << 8);
  const date = bytes[12]! | (bytes[13]! << 8);
  const year = 1980 + (date >> 9);
  const month = (date >> 5) & 0x0f;
  const day = date & 0x1f;
  return Date.UTC(year, month - 1, day, time >> 11, (time >> 5) & 0x3f, (time & 0x1f) * 2) / 1000;
}

/** One mesh object of a package: where it sits, the name a person reads, its mesh. */
interface MeshObject {
  readonly key: string;
  readonly name: string;
  readonly mesh: MeshData;
}

// Kernels compile without DOM or node types; TextDecoder is a runtime global in both.
declare const TextDecoder: new (label: string) => { decode(input: Uint8Array): string };

const text = (v: string | Uint8Array | undefined): string | undefined =>
  v === undefined ? undefined : typeof v === "string" ? v : new TextDecoder("utf-8").decode(v);

/** Part names by mesh object id from Metadata/model_settings.config, as the slicer shows them. */
function settingsNames(entries: Readonly<Record<string, string | Uint8Array>>): Map<number, string> {
  const out = new Map<number, string>();
  const xml = text(entries[MODEL_SETTINGS]);
  if (xml === undefined) return out;
  let part: number | undefined;
  for (const t of scanTags(xml)) {
    if (t.name === "part") part = t.close ? undefined : Number(t.attrs["id"]);
    else if (t.name === "metadata" && part !== undefined && t.attrs["key"] === "name" && t.attrs["value"] !== undefined) out.set(part, t.attrs["value"]);
  }
  return out;
}

function meshObjects(entries: Readonly<Record<string, string | Uint8Array>>): MeshObject[] {
  const names = settingsNames(entries);
  const out: MeshObject[] = [];
  const models: Map<string, ModelPart> = readModels(entries);
  for (const [file, model] of models) {
    for (const o of model.objects.values()) {
      if (o.positions === undefined || o.triangles === undefined) continue;
      const name = (file === "3D/3dmodel.model" ? names.get(o.id) : undefined) ?? o.name ?? `object ${o.id}`;
      out.push({ key: `${file}#${o.id}`, name, mesh: { positions: o.positions, triangles: o.triangles } });
    }
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

const size = (m: MeshData): string => {
  const [lo, hi] = bounds(m);
  return `${fmt(hi[0] - lo[0], 1)} x ${fmt(hi[1] - lo[1], 1)} x ${fmt(hi[2] - lo[2], 1)}`;
};

/** The stated source, or the reason the artifact states none. */
export function statedSource(artifact: ArtifactBytes, entries: Readonly<Record<string, string | Uint8Array>>): StatedSource | { readonly reason: string } {
  const raw = text(entries[CHASE_ENTRY]);
  if (raw === undefined) return { reason: `${artifact.name} has no ${CHASE_ENTRY}; it names no source to rebuild` };
  let meta: unknown;
  try { meta = JSON.parse(raw); } catch { return { reason: `${CHASE_ENTRY} in ${artifact.name} is not json` }; }
  const m = meta as { chase?: unknown; buildHash?: unknown };
  if (typeof m.chase !== "string" || m.chase === "" || typeof m.buildHash !== "string" || !/^[0-9a-f]{64}$/.test(m.buildHash)) {
    return { reason: `${CHASE_ENTRY} in ${artifact.name} states no chase id and 64 hex buildHash` };
  }
  const epoch = zipEpoch(artifact.bytes);
  if (epoch === undefined) return { reason: `${artifact.name} carries no zip mtime to read SOURCE_DATE_EPOCH from` };
  return { chase: m.chase, buildHash: m.buildHash, sourceDateEpoch: epoch };
}

/**
 * The findings for one artifact: one on the build hash, one per mesh object
 * of either package. A missing stated source or rebuild view is a skip with
 * its reason; a rebuild that cannot run fails, since a stranger could not
 * reproduce the artifact either.
 */
export async function art02Findings(artifact: ArtifactBytes, rebuild: ArtifactRebuild | undefined): Promise<readonly Finding[]> {
  const at = (path: string): ResultTarget => ({ level: "artifact", artifact: artifact.name, path });
  const skip = (path: string, why: string): Finding => ({ verdict: "skip", target: at(path), legal: { kind: "none" }, measured: "not run", constraint: why });
  const shipped = artifact.entries === undefined ? await readEntries(artifact.bytes) : Object.fromEntries(artifact.entries);
  const stated = statedSource(artifact, shipped);
  if ("reason" in stated) return [skip(CHASE_ENTRY, `not run: ${stated.reason}`)];
  if (rebuild === undefined) return [skip(CHASE_ENTRY, "not run: no rebuild view; core supplies the rebuild of the stated chase")];
  const again = await rebuild(stated);
  if ("reason" in again) {
    return [boolFinding(at(CHASE_ENTRY), false, `chase ${stated.chase} at epoch ${stated.sourceDateEpoch} does not rebuild: ${again.reason}`, { sourceDateEpoch: stated.sourceDateEpoch })];
  }
  const out: Finding[] = [boolFinding(at(CHASE_ENTRY), again.buildHash === stated.buildHash,
    `build hash stated ${stated.buildHash.slice(0, 12)}, rebuild of chase ${stated.chase} at epoch ${stated.sourceDateEpoch} gives ${again.buildHash.slice(0, 12)}`,
    { statedBuildHash: stated.buildHash, rebuiltBuildHash: again.buildHash, sourceDateEpoch: stated.sourceDateEpoch })];
  const mine = meshObjects(shipped);
  const theirs = new Map(meshObjects(await readEntries(again.bytes)).map((o) => [o.key, o]));
  for (const o of mine) {
    const r = theirs.get(o.key);
    theirs.delete(o.key);
    const h = meshHash(o.mesh);
    if (r === undefined) {
      out.push(boolFinding(at(o.key), false, `object ${o.name} (${size(o.mesh)} mm) ships with no counterpart in the rebuild`, { object: o.name, shippedMeshHash: h }));
      continue;
    }
    const rh = meshHash(r.mesh);
    out.push(boolFinding(at(o.key), h === rh,
      h === rh
        ? `object ${o.name} meshHash ${h.slice(0, 12)} equals the rebuild`
        : `object ${o.name} meshHash ${h.slice(0, 12)} shipped (${size(o.mesh)} mm), rebuild gives ${rh.slice(0, 12)} (${size(r.mesh)} mm)`,
      { object: o.name, shippedMeshHash: h, rebuiltMeshHash: rh, shippedSizeMm: size(o.mesh), rebuiltSizeMm: size(r.mesh) }));
  }
  for (const r of theirs.values()) {
    out.push(boolFinding(at(r.key), false, `object ${r.name} (${size(r.mesh)} mm) in the rebuild is missing from the shipped artifact`, { object: r.name, rebuiltMeshHash: meshHash(r.mesh) }));
  }
  return out;
}

export const check = defineCheck({
  id: "CHK-ART-02",
  level: "artifact",
  run: (t: TargetOf<"artifact">, ctx) => art02Findings(t.artifact, viewsOf(ctx).rebuild),
});
