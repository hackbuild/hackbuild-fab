// The hbf:// resolver (M04-T08 step 3, D-050, ARCHITECTURE.md 6). One
// function takes any uri and the sources it reads, so the CLI, the MCP
// resources and a baked bench resolve the same strings. The sources are
// passed in: the store and the workspace files live in core, which owns
// the file system; this tier stays headless. An unknown id in a static
// namespace (check, feature-kind, profile, knowledge) is E_HANDLE with up to
// three near uris; a store hash has no near ids, and the store names the
// chase to rebuild when it recorded one.

import {
  PRE_UNION_KINDS, commandError, didYouMean,
  type AnyFeatureKindDef, type BuildStage, type FitClassId, type HbfUri, type Part,
} from "@hackbuild/spec";
import { createProfileLookup, type ProfileTables } from "@hackbuild/profile";
import type { MeshData } from "@hackbuild/mesh";
import type { StoredReport } from "./store-objects.js";

/** A build record as the store returns it after its hash checks pass. */
export interface StoredBuild {
  readonly buildHash: string;
  readonly chase: string;
  readonly target: string;
  readonly part: Part;
}

/** What the resolver reads from the store; each call refuses a missing, collected or damaged object with E_HANDLE. */
export interface StoreReader {
  build(uri: string, at: string): StoredBuild;
  report(hash: string, at: string): StoredReport;
  mesh(hash: string, at: string): MeshData;
  artifact(hash: string, at: string): Promise<{ readonly ext: string; readonly bytes: Uint8Array }>;
}

/** Everything the resolver reads. */
export interface ResolveSources {
  readonly store: StoreReader;
  /** Static check pages by id (M04-T02); `ids` is the namespace didYouMean searches. */
  readonly checks: { readonly ids: readonly string[]; page(id: string): unknown };
  /** The registered feature kinds. */
  readonly featureKinds: readonly AnyFeatureKindDef[];
  /** The profile tables of the workspace. */
  readonly profile: ProfileTables;
  /** Knowledge records by id, the path under knowledge/ without .md. */
  readonly knowledge: { readonly ids: readonly string[]; read(id: string): string };
  /** The project graph (M04-T09); absent where no graph builder is wired. */
  readonly projectGraph?: () => unknown | Promise<unknown>;
  /**
   * The canon registries as static resources (M06-T11 step 5): ids for
   * didYouMean and a view per id, the def with its derive() source text.
   * Absent where no canon is wired, and the namespaces stay refused.
   */
  readonly canon?: {
    readonly mechanism: { readonly ids: readonly string[]; view(id: string): unknown };
    readonly archetype: { readonly ids: readonly string[]; view(id: string): unknown };
  };
}

/** The namespaces of the addressing table. */
export const URI_NAMESPACES = [
  "build", "mesh", "report", "artifact", "check", "feature-kind", "profile", "knowledge", "project",
  "chase", "archetype", "mechanism", "reference",
] as const;
export type UriNamespace = (typeof URI_NAMESPACES)[number];

/** Namespaces in ARCHITECTURE.md 6 that M04-T08 step 3 does not list; each is refused with that reason. */
const NOT_AT_M04: Readonly<Partial<Record<UriNamespace, string>>> = {
  chase: "hbf://chase/<id>", archetype: "hbf://archetype/<id>", mechanism: "hbf://mechanism/<id>", reference: "hbf://reference/<id>",
};

export interface Resolved {
  readonly uri: string;
  readonly namespace: UriNamespace;
  readonly value: unknown;
}

/** What hbf://feature-kind/<kind> serves: schema, the stages a generator may emit, checks, fit class, references. */
export interface FeatureKindView {
  readonly kind: string;
  readonly version: string;
  /** The Standard Schema the feature validates against, by vendor. */
  readonly schema: { readonly standard: 1; readonly vendor: string };
  /** BUILD_STAGES a generator of this kind may emit into; preUnionCutters only for PRE_UNION_KINDS (D-047). */
  readonly stages: readonly BuildStage[];
  readonly checks: readonly string[];
  /** "none" stated by the kind, or "per-feature" when FeatureKindDef.fit maps each feature to its class. */
  readonly fit: "none" | "per-feature";
  readonly reference: readonly string[];
  readonly routes?: readonly string[];
  readonly planes?: readonly string[];
  readonly sim?: string;
}

export function featureKindView(def: AnyFeatureKindDef): FeatureKindView {
  const pre = (PRE_UNION_KINDS as readonly string[]).includes(def.kind);
  const stages: BuildStage[] = [...(pre ? (["preUnionCutters"] as const) : []), "unionPositives", "postUnionCutters", "partition"];
  return {
    kind: def.kind, version: def.version,
    schema: { standard: 1, vendor: def.schema["~standard"].vendor },
    stages, checks: [...def.checks], fit: def.fit === "none" ? "none" : "per-feature", reference: [...def.reference],
    ...(def.routes === undefined ? {} : { routes: [...def.routes] }),
    ...(def.planes === undefined ? {} : { planes: [...def.planes] }),
    ...(def.sim === undefined ? {} : { sim: def.sim }),
  };
}

const unknownIn = (uri: string, at: string, near: readonly string[], prefix: string, hint: string): never => {
  throw commandError({ code: "E_HANDLE", path: at, got: uri, didYouMean: near.map((n) => `${prefix}${n}`), hint });
};

/** The part hbf://build/<h>/part/<partId> names in a stored build, or E_HANDLE naming the part it holds. */
export function partOf<B extends StoredBuild>(rec: B, partId: string, uri: string, at: string): B["part"] {
  if (rec.part.id === partId) return rec.part;
  return unknownIn(uri, at, [rec.part.id], `hbf://build/${rec.buildHash}/part/`, `build ${rec.buildHash.slice(0, 6)} holds part ${rec.part.id}`);
}

const PROFILE_TABLES = ["material", "machine", "fit"] as const;
type ProfileTable = (typeof PROFILE_TABLES)[number];

function profileRow(tables: ProfileTables, table: ProfileTable, id: string, uri: string, at: string): unknown {
  const ids = table === "material" ? tables.materials.map((m) => m.id)
    : table === "machine" ? tables.machines.map((m) => m.id)
    : (tables.fits?.fits ?? []).map((f) => f.class as string);
  if (!ids.includes(id)) return unknownIn(uri, at, didYouMean(id, ids), `hbf://profile/${table}/`, `name a ${table} row the profile holds`);
  // One lookup per resolve, so profileHash covers exactly the row served (D-051).
  const lookup = createProfileLookup(tables);
  const row = table === "material" ? lookup.material(id) : table === "machine" ? lookup.machine(id) : lookup.fit(id as FitClassId);
  return { table, id, row, provenance: (row as { provenance?: unknown }).provenance, profileHash: lookup.profileHash() };
}

/** Resolve one hbf:// uri against its sources, or throw E_HANDLE. */
export async function resolveUri(uri: string, src: ResolveSources, at = "/uri"): Promise<Resolved> {
  if (uri === "hbf://project/graph") {
    if (src.projectGraph === undefined) {
      throw commandError({ code: "E_HANDLE", path: at, got: uri, hint: "no project graph is wired for these sources; hbf project.graph builds it from the workspace" });
    }
    return { uri, namespace: "project", value: await src.projectGraph() };
  }
  const m = /^hbf:\/\/([a-z-]+)\/(.+)$/.exec(uri);
  const ns = m === null ? undefined : (URI_NAMESPACES as readonly string[]).find((n) => n === m[1]) as UriNamespace | undefined;
  if (m === null || ns === undefined || ns === "project") {
    const seg = m?.[1] ?? "";
    throw commandError({
      code: "E_HANDLE", path: at, got: uri,
      didYouMean: didYouMean(seg, [...URI_NAMESPACES]).map((n) => (n === "project" ? "hbf://project/graph" : `hbf://${n}/`)),
      hint: "name an hbf:// uri of the addressing table, for example hbf://check/CHK-PRT-01",
    });
  }
  const rest = m[2]!;
  if ((ns === "mechanism" || ns === "archetype") && src.canon !== undefined) {
    const reg = src.canon[ns];
    if (!reg.ids.includes(rest)) return unknownIn(uri, at, didYouMean(rest, reg.ids), `hbf://${ns}/`, `name a registered ${ns} id; ${ns === "mechanism" ? "mech.find" : "arch.find"} lists them`);
    return { uri, namespace: ns, value: reg.view(rest) };
  }
  const not = NOT_AT_M04[ns];
  if (not !== undefined) {
    throw commandError({ code: "E_HANDLE", path: at, got: uri, expected: not, hint: `${not} is in the addressing table but no resolver serves it at M04 (M04-T08 step 3)` });
  }
  switch (ns) {
    case "build": {
      const part = /^([0-9a-f]+)\/part\/(.+)$/.exec(rest);
      const rec = src.store.build(`hbf://build/${part === null ? rest : part[1]!}`, at);
      if (part === null) return { uri, namespace: ns, value: rec };
      return { uri, namespace: ns, value: { build: `hbf://build/${rec.buildHash}`, chase: rec.chase, part: partOf(rec, part[2]!, uri, at) } };
    }
    case "report":
      return { uri, namespace: ns, value: src.store.report(rest, at) };
    case "mesh": {
      const mesh = src.store.mesh(rest, at);
      return { uri, namespace: ns, value: { meshHash: rest, vertices: mesh.positions.length / 3, triangles: mesh.triangles.length / 3 } };
    }
    case "artifact": {
      const a = await src.store.artifact(rest, at);
      return { uri, namespace: ns, value: { hash: rest, ext: a.ext, bytes: a.bytes.length } };
    }
    case "check": {
      if (!src.checks.ids.includes(rest)) return unknownIn(uri, at, didYouMean(rest, src.checks.ids), "hbf://check/", "name a registered check id; hbf explain <id> prints the record");
      return { uri, namespace: ns, value: src.checks.page(rest) };
    }
    case "feature-kind": {
      const def = src.featureKinds.find((k) => k.kind === rest);
      if (def === undefined) {
        return unknownIn(uri, at, didYouMean(rest, src.featureKinds.map((k) => k.kind)), "hbf://feature-kind/", "name a registered feature kind");
      }
      return { uri, namespace: ns, value: featureKindView(def) };
    }
    case "profile": {
      const p = /^([a-z]+)\/(.+)$/.exec(rest);
      const table = p === null ? undefined : PROFILE_TABLES.find((t) => t === p[1]);
      if (p === null || table === undefined) {
        return unknownIn(uri, at, didYouMean(p?.[1] ?? rest, [...PROFILE_TABLES]), "hbf://profile/", "name hbf://profile/material/<id>, /machine/<id> or /fit/<class>");
      }
      return { uri, namespace: ns, value: profileRow(src.profile, table, p[2]!, uri, at) };
    }
    case "knowledge": {
      if (!src.knowledge.ids.includes(rest)) {
        return unknownIn(uri, at, didYouMean(rest, src.knowledge.ids), "hbf://knowledge/", "name a knowledge record by its path under knowledge/ without .md");
      }
      return { uri, namespace: ns, value: { id: rest, path: `knowledge/${rest}.md`, text: src.knowledge.read(rest) } };
    }
    default:
      throw commandError({ code: "E_HANDLE", path: at, got: uri as HbfUri, hint: "name an hbf:// uri of the addressing table" });
  }
}
