// Loads a check fixture (packages/checks/test/fixtures/<id>/<case>.json or
// .3mf) into the targets, views and sim handle one registry run needs.
//
// A JSON fixture holds Part IR and assembly declarations as data. Meshes
// are named recipes, built here with the kernel's own mesher: "box" and
// "prism" go through packages/mesh prismFromComponents (the BLOCKS
// constructive prism, D-054 grid), "revolve" is a lathe of a closed (r, z)
// profile, and "drop" removes triangles to open a shell. A body or solid
// written "@name" gets the MeshRef packages/mesh meshRef computes for that
// recipe. Source text may carry {U+XXXX} for characters the repository
// itself refuses (RULES.md Language), expanded here. A sim block scripts
// the measurements a SimHandle reports, and the insertion search results
// the insert view hands CHK-ASM-10; the checks hold the verdicts. A 3MF
// check that reads a rebuild gets the file REBUILD_FROM names as what the
// rebuild of the stated source gives (CHK-ART-02: pass.3mf, the export
// core/test/artifact-rebuild.test.ts proves the real rebuild writes).

import { readFileSync } from "node:fs";
import type {
  ArtifactBytes, Assembly, ClosestApproach, MeshRef, Part, ShapeDecl, SimHandle, SourceFile, SweepResult, Vec2, Vec3,
} from "@hackbuild/spec";
import type { HookupDecl, Net } from "@hackbuild/spec";
import { joinMeshes, meshRef, prismFromComponents, signedVolume, type MeshData } from "@hackbuild/mesh";
import { chargePort, type ChargeHookup, type ChargePort, type PressedPathOhm } from "@hackbuild/circuit";
import { mcuPinRow } from "@hackbuild/catalog";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import type { InsertMeasure, KernelViews, TargetSet } from "../src/index";

const dir = new URL("./fixtures/", import.meta.url);

type Solid =
  | { readonly box: readonly [number, number, number, number, number, number] }
  | { readonly prism: { readonly outline: readonly Vec2[]; readonly holes?: readonly (readonly Vec2[])[]; readonly z: readonly [number, number]; readonly axis?: "x" | "y" | "z" } }
  | { readonly revolve: { readonly profile: readonly Vec2[]; readonly segments: number; readonly at?: Vec3 } };

interface MeshRecipe {
  readonly solids: readonly Solid[];
  /** Triangle indices to remove, after the solids are joined. */
  readonly drop?: readonly number[];
}

export interface FixtureJson {
  readonly note: string;
  readonly meshes?: Readonly<Record<string, MeshRecipe>>;
  readonly parts?: readonly Record<string, unknown>[];
  readonly assembly?: Record<string, unknown>;
  readonly source?: { readonly path: string; readonly text: string };
  readonly shapes?: Readonly<Record<string, ShapeDecl>>;
  readonly sim?: {
    readonly closest?: readonly (ClosestApproach & { readonly a: string; readonly b: string })[];
    readonly sweep?: readonly (SweepResult & { readonly part: string; readonly joint: string })[];
    /** Insertion search results by insertable assertion (part into into), as sim.sweep --mode insert reports them. */
    readonly insert?: readonly (InsertMeasure & { readonly part: string; readonly into: string })[];
  };
  readonly expect?: { readonly error: string; readonly path?: string };
  /** The design's interference declaration CHK-ASM-11 reads (tolerance, touch ceiling, box margin, origin). */
  readonly interference?: { readonly tolMm3: number; readonly touchCeilingMm3: number; readonly boxMarginMm: number; readonly origin: string };
  /** Net records, each a net target on the first part (the circuit checks, M05-T19). */
  readonly nets?: readonly Net[];
  /** The chase hookup the circuit checks read through CheckCtx. */
  readonly hookup?: readonly HookupDecl[];
  /** Pressed paths of charge-release ports: the circuit view answers chargePort over each (M05-T19). */
  readonly charges?: readonly { readonly port: string; readonly path: PressedPathOhm }[];
}

export interface Loaded {
  readonly targets: TargetSet;
  readonly views: KernelViews;
  readonly hookup?: readonly HookupDecl[];
  readonly sim?: SimHandle;
  readonly expect?: FixtureJson["expect"];
  readonly note: string;
}

const area2 = (r: readonly Vec2[]): number => r.reduce((s, p, i) => {
  const q = r[(i + 1) % r.length]!;
  return s + p[0] * q[1] - q[0] * p[1];
}, 0);
const ccw = (r: readonly Vec2[]): readonly Vec2[] => (area2(r) >= 0 ? r : [...r].reverse());
const cw = (r: readonly Vec2[]): readonly Vec2[] => (area2(r) <= 0 ? r : [...r].reverse());

/** z-extruded prism through the kernel mesher, then turned so its extrusion runs along axis (a cyclic swap keeps the winding). */
function prismSolid(outline: readonly Vec2[], holes: readonly (readonly Vec2[])[], z: readonly [number, number], axis: "x" | "y" | "z"): MeshData {
  const m = prismFromComponents([{ outer: ccw(outline), holes: holes.map(cw) }], z).mesh;
  if (axis === "z") return m;
  const p = m.positions;
  const out = new Float64Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const [u, v, w] = [p[i]!, p[i + 1]!, p[i + 2]!];
    // axis x: (u, v, w) to (w, u, v); axis y: (u, v, w) to (v, w, u).
    const xyz = axis === "x" ? [w, u, v] : [v, w, u];
    out[i] = xyz[0]!; out[i + 1] = xyz[1]!; out[i + 2] = xyz[2]!;
  }
  return { positions: out, triangles: m.triangles };
}

/** A lathe of a closed (r, z) profile about the z axis through `at`, wound outward. */
function revolveSolid(profile: readonly Vec2[], segments: number, at: Vec3 = [0, 0, 0]): MeshData {
  const n = profile.length;
  const pos: number[] = [];
  for (let s = 0; s < segments; s++) {
    const a = (2 * Math.PI * s) / segments;
    for (const [r, z] of profile) pos.push(at[0] + r * Math.cos(a), at[1] + r * Math.sin(a), at[2] + z);
  }
  const tri: number[] = [];
  const id = (s: number, k: number): number => (s % segments) * n + (k % n);
  for (let s = 0; s < segments; s++) {
    for (let k = 0; k < n; k++) {
      const a = id(s, k), b = id(s, k + 1), c = id(s + 1, k + 1), d = id(s + 1, k);
      tri.push(a, b, c, a, c, d);
    }
  }
  let m: MeshData = { positions: Float64Array.from(pos), triangles: Uint32Array.from(tri) };
  if (signedVolume(m) < 0) {
    const t = m.triangles.slice();
    for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2]!, t[i + 1]!];
    m = { positions: m.positions, triangles: t };
  }
  return m;
}

function solidOf(s: Solid): MeshData {
  if ("box" in s) {
    const [x0, y0, z0, x1, y1, z1] = s.box;
    return prismSolid([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [], [z0, z1], "z");
  }
  if ("prism" in s) return prismSolid(s.prism.outline, s.prism.holes ?? [], s.prism.z, s.prism.axis ?? "z");
  return revolveSolid(s.revolve.profile, s.revolve.segments, s.revolve.at);
}

export function meshOfRecipe(r: MeshRecipe): MeshData {
  const m = joinMeshes(r.solids.map(solidOf));
  if (r.drop === undefined || r.drop.length === 0) return m;
  const drop = new Set(r.drop);
  const t: number[] = [];
  for (let k = 0; k < m.triangles.length / 3; k++) if (!drop.has(k)) t.push(m.triangles[k * 3]!, m.triangles[k * 3 + 1]!, m.triangles[k * 3 + 2]!);
  return { positions: m.positions, triangles: Uint32Array.from(t) };
}

// The build hash a chase entry states (Metadata/hackbuild_chase.json, M00-T07 step 7).
const STATED = /"buildHash"\s*:\s*"([0-9a-f]{64})"/;

/** The fixture a check's rebuild view returns, by check id. */
const REBUILD_FROM: Readonly<Record<string, string>> = { "CHK-ART-02": "pass.3mf" };

/** The rebuild view of a 3MF fixture directory: the REBUILD_FROM file and the build hash its chase entry states. */
function rebuildView(id: string): KernelViews {
  const from = REBUILD_FROM[id];
  if (from === undefined) return {};
  const file = new URL(`${id}/${from}`, dir);
  const bytes = new Uint8Array(readFileSync(file));
  return {
    rebuild: async () => {
      const { default: JSZip } = await import("jszip");
      const meta = await (await JSZip.loadAsync(bytes)).file("Metadata/hackbuild_chase.json")?.async("string");
      const hash = meta === undefined ? undefined : STATED.exec(meta)?.[1];
      return hash === undefined ? { reason: `${id}/${from} states no build hash` } : { buildHash: hash, bytes };
    },
  };
}

const expandText = (s: string): string => s.replace(/\{U\+([0-9A-Fa-f]{4,6})\}/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)));

const ZERO_HASH = "0".repeat(64);

export function loadFixture(id: string, which: string): Loaded {
  let json: FixtureJson;
  try {
    json = JSON.parse(readFileSync(new URL(`${id}/${which}.json`, dir), "utf8")) as FixtureJson;
  } catch (e) {
    if ((e as { code?: string }).code !== "ENOENT") throw e;
    const bytes = new Uint8Array(readFileSync(new URL(`${id}/${which}.3mf`, dir)));
    const artifact: ArtifactBytes = { exporter: "3mf", name: `${id}/${which}.3mf`, bytes };
    return { targets: { artifacts: [artifact] }, views: rebuildView(id), note: `${id} ${which}.3mf (make-3mf.mjs)` };
  }
  return loadFixtureJson(json, `${id}/${which}`);
}

/** A fixture held as data rather than a file: a fix fixture's build returns one per param value (M04-T04). */
export function loadFixtureJson(json: FixtureJson, label: string): Loaded {
  const meshes = new Map<string, MeshData>();
  const refs = new Map<string, MeshRef>();
  for (const [name, recipe] of Object.entries(json.meshes ?? {})) {
    const m = meshOfRecipe(recipe);
    meshes.set(name, m);
    refs.set(name, meshRef(m));
  }
  const byUri = new Map<string, MeshData>();
  const byHash = new Map<string, MeshData>();
  for (const [name, ref] of refs) {
    byUri.set(ref.uri, meshes.get(name)!);
    byHash.set(ref.hash, meshes.get(name)!);
  }
  const ref = (v: unknown): MeshRef => {
    if (typeof v === "string" && v.startsWith("@")) {
      const r = refs.get(v.slice(1));
      if (r === undefined) throw new Error(`${label}: no mesh ${v}`);
      return r;
    }
    return v as MeshRef;
  };
  const partOf = (p: Record<string, unknown>): Part => {
    const bodies = ((p["bodies"] as Record<string, unknown>[] | undefined) ?? []).map((b) => ({
      material: "petg", slot: 1, role: "body", ...b, mesh: ref(b["mesh"]),
    }));
    let solid: MeshRef;
    if (p["solid"] !== undefined) solid = ref(p["solid"]);
    else {
      const all = bodies.map((b) => byUri.get(b.mesh.uri)).filter((m): m is MeshData => m !== undefined);
      const joined = joinMeshes(all);
      solid = meshRef(joined);
      byUri.set(solid.uri, joined);
      byHash.set(solid.hash, joined);
    }
    const frame = { originOnAxis: false, carriesOffset: false, pose: "print", ...(p["frame"] as object | undefined) } as Part["frame"];
    const twin = (frame as { assemblyTwin?: string }).assemblyTwin;
    return {
      name: String(p["id"]), process: "fdm", machine: "ffc5p", features: [], source: { kind: "kernel", routes: ["prism"] },
      metrics: [], warnings: [], assertions: [], buildHash: ZERO_HASH,
      ...p,
      frame: twin !== undefined && twin.startsWith("@") ? { ...frame, assemblyTwin: ref(twin).hash } : frame,
      bodies, solid,
    } as unknown as Part;
  };
  const parts = json.parts?.map(partOf);
  let assemblies: Assembly[] | undefined;
  if (json.assembly !== undefined) {
    const a = json.assembly;
    assemblies = [{
      instances: [], joints: [], connections: [], assertions: [], metrics: [], warnings: [], buildHash: ZERO_HASH,
      ...a,
      parts: ((a["parts"] as Record<string, unknown>[] | undefined) ?? []).map(partOf),
      bought: ((a["bought"] as Record<string, unknown>[] | undefined) ?? []).map((b) => ({ ...b, envelope: ref(b["envelope"]) })),
    } as unknown as Assembly];
  }
  const source: SourceFile | undefined = json.source === undefined ? undefined : { path: json.source.path, text: expandText(json.source.text) };
  const shapes = json.shapes ?? {};
  const inserts = json.sim?.insert;
  const views: KernelViews = {
    mesh: (r) => byUri.get(r.uri),
    meshByHash: (h) => byHash.get(h),
    shape: (part, body) => shapes[`${part}/${body}`],
    ...(inserts === undefined ? {} : { insert: async (_a: string, x: { readonly part: string; readonly into: string }) => inserts.find((c) => c.part === x.part && c.into === x.into) }),
    ...(json.interference === undefined ? {} : { interference: () => json.interference }),
    ...(json.charges === undefined ? {} : { circuit: chargeView(json, parts?.[0]) }),
  } as KernelViews;
  let sim: SimHandle | undefined;
  if (json.sim !== undefined) {
    const s = json.sim;
    sim = {
      closestApproach: (a, b) => {
        const hit = s.closest?.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
        if (hit === undefined) throw new Error(`${label}: the fixture's sim has no closest approach for ${a} and ${b}`);
        return { mm: hit.mm, at: hit.at, state: hit.state };
      },
      sweep: (part, joint) => {
        const hit = s.sweep?.find((w) => w.part === part && w.joint === joint);
        if (hit === undefined) throw new Error(`${label}: the fixture's sim has no sweep for ${part} on ${joint}`);
        return { sweptHash: hit.sweptHash, poses: hit.poses, clashes: hit.clashes };
      },
      trials: () => { throw new Error("trials are not scripted in check fixtures"); },
      snap: () => { throw new Error("snap is not scripted in check fixtures"); },
    };
  }
  const first = parts?.[0];
  const targets: TargetSet = {
    ...(parts === undefined ? {} : { parts }),
    ...(json.nets === undefined || first === undefined ? {} : { nets: json.nets.map((net) => ({ net, part: first })) }),
    ...(assemblies === undefined ? {} : { assemblies }),
    ...(source === undefined ? {} : { sources: [source] }),
  };
  return {
    targets, views, ...(sim === undefined ? {} : { sim }), ...(json.expect === undefined ? {} : { expect: json.expect }),
    ...(json.hookup === undefined ? {} : { hookup: json.hookup }), note: json.note,
  };
}

/** The circuit view of a fixture's charge-release ports: the one reader, chargePort, over each declared pressed path. */
function chargeView(json: FixtureJson, part: Part | undefined): NonNullable<KernelViews["circuit"]> {
  const profile = createProfileLookup(loadProfile());
  const byPort = new Map<string, ChargePort>();
  for (const c of json.charges ?? []) {
    const h = json.hookup?.find((x) => x.port === c.port);
    const port = part?.features.find((f) => f.kind === "port" && f.id === c.port);
    if (h === undefined || h.read.model !== "charge-release" || port === undefined || port.kind !== "port") throw new Error(`charge ${c.port} has no charge-release hookup entry or port`);
    byPort.set(c.port, chargePort({ hookup: h as ChargeHookup, port, mcu: mcuPinRow(h.mcu), path: c.path, profile, unknown: false, source: "the fixture's pressed path" }));
  }
  return (p, port) => (p === part?.id ? byPort.get(port) : undefined);
}

/**
 * A fix fixture (M04-T04): a check, the chase params a fix may set, the
 * values the failing build ran with, and a build from values to fixture
 * data, so a fix is predicted and then applied by rebuilding. The goldens
 * sit beside it in expected.json.
 */
export interface FixFixture {
  readonly check: string;
  readonly note: string;
  readonly params: readonly import("@hackbuild/spec").ParamGroup[];
  readonly values: Readonly<Record<string, unknown>>;
  /** True when the check measures the driving param itself (fix.ts). */
  readonly measuresParam: boolean;
  build(values: Readonly<Record<string, unknown>>): FixtureJson;
}

/** A fixture's JSON file read as data, for a fix fixture to vary. */
export function fixtureJson(id: string, which: string): FixtureJson {
  return JSON.parse(readFileSync(new URL(`${id}/${which}.json`, dir), "utf8")) as FixtureJson;
}
