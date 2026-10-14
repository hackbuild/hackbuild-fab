// Links are written when the thing is made (M04-T09 step 2). Each maker
// hands over the hashes it saw; these functions turn them into graph lines.
// A build reads its chase, build.ts and the modules it imports, its params,
// every profile row its ProfileLookup saw and every feature kind version it
// resolved; each mesh is produced by its build. A report is checked against
// its build and every CheckDef version the run resolved. A legacy oracle
// record, or a scene that reads a legacy tree, is a record of each file of
// that tree at the sha256 its SHA256SUMS states; a reference golden expects
// the build hash it states. bake links arrive with M09.

import { defHash, itemId, type Item, type Link, type LinkKind, type MadeLine } from "./graph.js";

export type ProfileSource = "data" | "seed";

/** One profile read with the hash of the row it returned (profileRowHash). */
export interface RowRead { readonly table: string; readonly id: string; readonly hash: string }

/** What a build saw, by hash. */
export interface BuildFacts {
  /** Design directory relative to the workspace, forward slashes. */
  readonly target: string;
  readonly buildHash: string;
  /** hashValue of the chase object, the chase part of defHash. */
  readonly chaseHash: string;
  /** hashValue of the source closure of build.ts, the source part of defHash (D-178). */
  readonly buildScriptHash: string;
  readonly paramsHash: string;
  /**
   * The tables the reads came from: "data" is packages/profile/data, the
   * profile of record; "seed" is the M-S seed slice the draft kinds of
   * DRAFT_KIND_DIRS still build with. One row can differ in shape between
   * the two, so each source is its own item.
   */
  readonly profile: ProfileSource;
  readonly reads: readonly RowRead[];
  /** Package feature kind id to the version the build resolved. */
  readonly kinds: Readonly<Record<string, string>>;
  /**
   * Draft feature kind id to version: the kinds a DRAFT_KIND_DIRS design
   * registers on itself (skeleton-kinds.ts). A draft kind can share its id
   * with a package kind at another version (flex-pair's draft pad and
   * packages/circuit's pad), so each is an item of the design that holds it.
   */
  readonly draftKinds?: Readonly<Record<string, string>>;
  /** Body id to meshHash. */
  readonly meshes: Readonly<Record<string, string>>;
}

const link = (from: string, to: string, kind: LinkKind, hashAtLink: string): Link => ({ from, to, kind, hashAtLink });

/** Item ids of the things a design target owns. */
export const ids = {
  build: (target: string): string => itemId("build", target),
  report: (target: string): string => itemId("report", target),
  chase: (target: string): string => itemId("chase", target),
  buildScript: (target: string): string => itemId("buildScript", target),
  params: (target: string): string => itemId("params", target),
  mesh: (target: string, body: string): string => itemId("mesh", `${target}/${body}`),
  profileRow: (table: string, id: string, source: ProfileSource = "data"): string => itemId("profileRow", `${source === "seed" ? "seed/" : ""}${table}/${id}`),
  checkDef: (id: string): string => itemId("checkDef", id),
  /** A package kind is `featureKind:<kind>`; a draft kind is `featureKind:<target>/<kind>`, the design that registers it. */
  featureKind: (kind: string, target?: string): string => itemId("featureKind", target === undefined ? kind : `${target}/${kind}`),
  legacy: (file: string): string => itemId("legacy", file),
} as const;

/** The lines one build writes: its params, the build with its reads, and each mesh it produced. */
export function buildLines(f: BuildFacts): MadeLine[] {
  const build = ids.build(f.target);
  const params: Item = { id: ids.params(f.target), kind: "params", uri: `${f.target}#params`, hash: f.paramsHash };
  const links: Link[] = [
    link(build, ids.chase(f.target), "reads", f.chaseHash),
    link(build, ids.buildScript(f.target), "reads", f.buildScriptHash),
    link(build, params.id, "reads", f.paramsHash),
    ...f.reads.map((r) => link(build, ids.profileRow(r.table, r.id, f.profile), "reads", r.hash)),
    ...Object.entries(f.kinds).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => link(build, ids.featureKind(k), "reads", defHash(k, v))),
    ...Object.entries(f.draftKinds ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => link(build, ids.featureKind(k, f.target), "reads", defHash(k, v))),
  ];
  const meshes = Object.entries(f.meshes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([body, h]): MadeLine => ({
    item: { id: ids.mesh(f.target, body), kind: "mesh", uri: `hbf://mesh/${h}`, hash: h },
    links: [link(ids.mesh(f.target, body), build, "produced", f.buildHash)],
  }));
  return [
    { item: params, links: [] },
    { item: { id: build, kind: "build", uri: `hbf://build/${f.buildHash}`, hash: f.buildHash }, links },
    ...meshes,
  ];
}

/** The line a check run writes: the report, checked against its build and each CheckDef version it resolved. */
export function reportLine(target: string, reportHash: string, buildHash: string, checks: Readonly<Record<string, string>>): MadeLine {
  const id = ids.report(target);
  return {
    item: { id, kind: "report", uri: `hbf://report/${reportHash}`, hash: reportHash },
    links: [
      link(id, ids.build(target), "checked", buildHash),
      ...Object.entries(checks).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([c, v]) => link(id, ids.checkDef(c), "checked", defHash(c, v))),
    ],
  };
}

/** The line export.run writes once a person approved the file: the artifact, exported from its build. */
export function exportedLine(target: string, kind: string, artifactHash: string, buildHash: string): MadeLine {
  const id = itemId("artifact", `${target}/${kind}`);
  return { item: { id, kind: "artifact", uri: `hbf://artifact/${artifactHash}`, hash: artifactHash }, links: [link(id, ids.build(target), "exported", buildHash)] };
}

/** One row of a legacy tree's SHA256SUMS: the file, workspace relative, and its sha256 at copy time. */
export interface LegacySum { readonly file: string; readonly sha256: string }

/** Rows of a SHA256SUMS file under `dir` (workspace relative); a line that is no `<64 hex>  <path>` row is skipped. */
export function parseSums(dir: string, text: string): LegacySum[] {
  const out: LegacySum[] = [];
  for (const line of text.split("\n")) {
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line.trim());
    if (m !== null) out.push({ file: `${dir}/${m[2]!}`, sha256: m[1]! });
  }
  return out;
}

/**
 * A made item that names a legacy tree (an oracle record, a scene build):
 * one link per file of that tree at its SHA256SUMS hash. The record does
 * not list which files its script opened, so the whole tree it names is
 * its input set (the legacy copy is checked as a unit, D-142).
 */
export function legacyLine(item: Item, kind: "recordOf" | "reads", sums: readonly LegacySum[]): MadeLine {
  return { item, links: sums.map((s) => link(item.id, ids.legacy(s.file), kind, s.sha256)) };
}

/** A reference golden expects the build hash it states. */
export function goldenLine(file: string, fileHash: string, target: string, buildHash: string): MadeLine {
  const id = itemId("golden", file);
  return { item: { id, kind: "golden", uri: file, hash: fileHash }, links: [link(id, ids.build(target), "expects", buildHash)] };
}
