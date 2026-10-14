// OGEE R16-P printed assembly at its audit poses (M04-T11 step 3). The
// placements are the ones audit_print.build() applies, written per pose by
// tools/py/ogee16/export_poses.py into designs/ogee16/legacy/poses/ from the
// legacy source run unedited; kin.py is not ported here (the kinematics
// module at M07 must reproduce these placements, D-139). The bodies are the
// shipped print STLs read through the mesh imported route and staged into
// Part IR, one part per STL. Each pose is one AssemblyDraft: 75 instances
// (computed by the exporter), and one contact assertion per pair
// audit_print.is_touch declares. Nothing physical is typed here: the
// volume tolerance, the squeeze ceiling and the box margin are the ones
// audit_print.audit() holds, read from its source by the exporter and
// carried in the pose file with their origin.

import { readFileSync } from "node:fs";
import {
  canonicalize, commandError, sha256Hex,
  type Assembly, type AssemblyDraft, type Assertion, type BodyDraft, type Hash, type Part, type PartDraft, type Pose, type Quat,
} from "@hackbuild/spec";
import { assemblePart, importStl, stageImported, type MeshData } from "@hackbuild/mesh";

const LEGACY = new URL("../../../designs/ogee16/legacy/", import.meta.url);

/** Scene id to its pose file under designs/ogee16/legacy/poses/. */
export const OGEE_PRINTED_FILES = {
  "ogee16-printed": "printed-4.json",
  "ogee16-printed-negatives": "printed-negatives.json",
} as const;
export type OgeePrintedScene = keyof typeof OGEE_PRINTED_FILES;

export interface PoseBody {
  readonly label: string;
  readonly stl: string;
  /** Row-major 4x4 transform audit_print.build() applied, mm. */
  readonly matrix: readonly number[];
}

/** One pair's overlap as the exporter measured it with the oracle's own trimesh calls (computed). */
export interface OracleOverlap {
  readonly a: string;
  readonly b: string;
  readonly mm3: number;
  readonly touch: boolean;
}

export interface PoseRecord {
  readonly label: string;
  readonly zR: readonly number[];
  readonly zC: readonly number[];
  readonly lp: number;
  readonly bodies: readonly PoseBody[];
  readonly boxPairs: number;
  readonly overlaps: readonly OracleOverlap[];
  readonly clashes: readonly OracleOverlap[];
  readonly exceptions: readonly { readonly a: string; readonly b: string; readonly error: string }[];
  readonly nonWatertight: readonly string[];
}

export interface PoseFile {
  readonly format: "hbf-ogee16-poses-1";
  readonly origin: string;
  readonly sources: Readonly<Record<string, string>>;
  /** STL name to sha256 of its bytes. */
  readonly stl: Readonly<Record<string, string>>;
  /** audit_print.audit() tol, mm3. */
  readonly tolMm3: number;
  /** audit_print.audit() squeeze ceiling on a declared touch pair, mm3. */
  readonly touchCeilingMm3: number;
  /** audit_print.audit() bounding box margin, mm. */
  readonly boxMarginMm: number;
  readonly touchPrefixes: readonly (readonly [string, string])[];
  readonly touch: readonly (readonly [string, string])[];
  readonly poses: readonly PoseRecord[];
}

/** What CHK-ASM-11 reads beside the assembly: the thresholds the design declares and where they come from. */
export interface AuditDecl {
  readonly tolMm3: number;
  readonly touchCeilingMm3: number;
  readonly boxMarginMm: number;
  readonly origin: string;
}

function refuse(path: string, got: unknown, expected: string, hint: string): never {
  throw commandError({ code: "E_REF", path, got: got as never, expected, hint, record: "viewer-sim" });
}

export function readPoseFile(scene: OgeePrintedScene): PoseFile {
  const name = OGEE_PRINTED_FILES[scene];
  const doc = JSON.parse(readFileSync(new URL(`poses/${name}`, LEGACY), "utf8")) as PoseFile;
  if (doc.format !== "hbf-ogee16-poses-1") {
    refuse("/format", doc.format, "hbf-ogee16-poses-1", `designs/ogee16/legacy/poses/${name} is not a pose file; rerun tools/py/ogee16/export_poses.py`);
  }
  return doc;
}

/**
 * A rigid row-major 4x4 transform as a Pose: translation and unit
 * quaternion. E_REF when the 3x3 block is not a rotation, since a Pose
 * cannot carry scale or shear.
 */
export function poseOfMatrix(m: readonly number[], path: string): Pose {
  const r = (i: number, j: number): number => m[i * 4 + j]!;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      let dot = 0;
      for (let k = 0; k < 3; k += 1) dot += r(k, i) * r(k, j);
      if (Math.abs(dot - (i === j ? 1 : 0)) > 1e-9) refuse(path, m.slice(0, 12), "a rotation and a translation", "the exporter wrote a transform with scale or shear; a Pose carries only rotation and translation");
    }
  }
  const tr = r(0, 0) + r(1, 1) + r(2, 2);
  let q: [number, number, number, number];
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [(r(2, 1) - r(1, 2)) / s, (r(0, 2) - r(2, 0)) / s, (r(1, 0) - r(0, 1)) / s, s / 4];
  } else if (r(0, 0) > r(1, 1) && r(0, 0) > r(2, 2)) {
    const s = Math.sqrt(1 + r(0, 0) - r(1, 1) - r(2, 2)) * 2;
    q = [s / 4, (r(0, 1) + r(1, 0)) / s, (r(0, 2) + r(2, 0)) / s, (r(2, 1) - r(1, 2)) / s];
  } else if (r(1, 1) > r(2, 2)) {
    const s = Math.sqrt(1 + r(1, 1) - r(0, 0) - r(2, 2)) * 2;
    q = [(r(0, 1) + r(1, 0)) / s, s / 4, (r(1, 2) + r(2, 1)) / s, (r(0, 2) - r(2, 0)) / s];
  } else {
    const s = Math.sqrt(1 + r(2, 2) - r(0, 0) - r(1, 1)) * 2;
    q = [(r(0, 2) + r(2, 0)) / s, (r(1, 2) + r(2, 1)) / s, s / 4, (r(1, 0) - r(0, 1)) / s];
  }
  return { frame: "assembly", pos: [r(0, 3), r(1, 3), r(2, 3)], rot: q as unknown as Quat };
}

/** One body per STL, imported as the file gives it (the M04-T14 import-for-audit draft). */
function partDraft(stl: string): PartDraft {
  const body: BodyDraft = {
    id: stl, role: "body", slot: 1, material: "",
    base: { route: "imported", uri: `designs/ogee16/legacy/out/print/${stl}.stl`, format: "stl", tier: "inferred" },
  };
  return {
    id: stl, name: `${stl}.stl`, process: "fdm", machine: "",
    frame: { originOnAxis: false, carriesOffset: true, pose: "assembly" }, bodies: [body], features: [],
  };
}

const poseId = (scene: OgeePrintedScene, label: string): string => `${scene}@${label}`;

/** The declaration of every pose: the drafts, the thresholds, and the hash of the whole declaration. */
export interface OgeePrintedDecl {
  readonly scene: OgeePrintedScene;
  readonly drafts: readonly AssemblyDraft[];
  readonly audit: AuditDecl;
  /** sha256 over the canonical pose file and the STL hashes it names: the poses enter the declaration hash (M04-T11 step 3). */
  readonly declHash: Hash;
  readonly file: PoseFile;
}

export function ogeePrintedDecl(scene: OgeePrintedScene): OgeePrintedDecl {
  const file = readPoseFile(scene);
  const touch: Assertion[] = file.touch.map(([a, b]) => ({ type: "contact", a, b, over: "rest" }));
  const parts = Object.keys(file.stl).sort().map(partDraft);
  const drafts = file.poses.map((p, i): AssemblyDraft => ({
    id: poseId(scene, p.label), name: `OGEE R16-P printed, ${p.label}`,
    parts, bought: [], joints: [], connections: [], assertions: touch,
    instances: p.bodies.map((b, j) => {
      if (file.stl[b.stl] === undefined) refuse(`/poses/${i}/bodies/${j}/stl`, b.stl, "an STL the pose file hashes", "rerun tools/py/ogee16/export_poses.py");
      return { id: b.label, part: b.stl, pose: poseOfMatrix(b.matrix, `/poses/${i}/bodies/${j}/matrix`) };
    }),
  }));
  return {
    scene, drafts, file,
    audit: { tolMm3: file.tolMm3, touchCeilingMm3: file.touchCeilingMm3, boxMarginMm: file.boxMarginMm, origin: file.origin },
    declHash: sha256Hex(canonicalize(file)) as Hash,
  };
}

/** Built scene: one Assembly per pose, and the meshes its Part IR names, by mesh hash. */
export interface OgeePrintedBuilt {
  readonly decl: OgeePrintedDecl;
  readonly assemblies: readonly Assembly[];
  readonly meshes: ReadonlyMap<string, MeshData>;
}

/**
 * Stage each STL through the imported route into Part IR and place the
 * instances. The caller assigns the build hash from the declaration hash,
 * since only core holds BuildInputs (D-051). E_REF when an STL's bytes
 * differ from the hash the pose file recorded, since the placements were
 * taken on those bytes.
 */
export async function buildOgeePrinted(scene: OgeePrintedScene, buildHashOf: (declHash: Hash) => Hash): Promise<OgeePrintedBuilt> {
  const decl = ogeePrintedDecl(scene);
  const buildHash = buildHashOf(decl.declHash);
  const meshes = new Map<string, MeshData>();
  const parts: Part[] = [];
  for (const draft of decl.drafts[0]!.parts) {
    const stl = draft.id;
    const uri = `designs/ogee16/legacy/out/print/${stl}.stl`;
    const bytes = new Uint8Array(readFileSync(new URL(`out/print/${stl}.stl`, LEGACY)));
    const sum = sha256Hex(bytes);
    if (sum !== decl.file.stl[stl]) {
      refuse(`/stl/${stl}`, sum, decl.file.stl[stl]!, `${uri} moved since the poses were exported; restore it from SHA256SUMS or rerun tools/py/ogee16/export_poses.py`);
    }
    const { staged } = await stageImported([{ draft: draft.bodies[0]!, read: importStl(bytes, `${stl}.stl`) }]);
    const built = assemblePart(draft, staged);
    meshes.set(built.part.solid.hash, staged.solid);
    meshes.set(built.part.bodies[0]!.mesh.hash, staged.bodies[0]!.mesh);
    parts.push({ ...built.part, source: { kind: "imported", format: "stl", tier: "inferred", uri }, buildHash });
  }
  const assemblies = decl.drafts.map((d): Assembly => ({
    id: d.id, parts, instances: d.instances, bought: d.bought, joints: d.joints,
    connections: d.connections, assertions: d.assertions, metrics: [], warnings: [], buildHash,
  }));
  return { decl, assemblies, meshes };
}

/** What check.run --scene reads from an audit scene (core/src/commands/check-run.ts). */
export interface AuditScene {
  readonly assemblies: readonly Assembly[];
  readonly meshes: ReadonlyMap<string, MeshData>;
  readonly audit: AuditDecl;
}

/** The audit scene check.run --scene names; E_REF for an id this module does not hold. */
export async function auditScene(id: string, buildHashOf: (declHash: Hash) => Hash): Promise<AuditScene> {
  if (!Object.hasOwn(OGEE_PRINTED_FILES, id)) {
    refuse("/scene", id, Object.keys(OGEE_PRINTED_FILES).join(" or "), `ogee16-printed.ts holds ${Object.keys(OGEE_PRINTED_FILES).join(" and ")}`);
  }
  const b = await buildOgeePrinted(id as OgeePrintedScene, buildHashOf);
  return { assemblies: b.assemblies, meshes: b.meshes, audit: b.decl.audit };
}
