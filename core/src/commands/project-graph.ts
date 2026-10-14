// project.graph (M04-T09, D-050, D-051, D-106; group look, CLI only, also
// served as hbf://project/graph). The made lines come from .hbf/graph.jsonl,
// which builds and reports append when they are stored (store.ts), plus the
// lines the workspace files state themselves: a reference golden expects
// the build hash it records, and an oracle record or a scene that names a
// legacy tree is made from that tree at its SHA256SUMS hashes. Every source
// item a line links to is hashed as the workspace holds it now; a link whose
// recorded hash differs, or whose target is gone, makes its item stale and
// every item downstream of it. Exit 0 always; staleness is information.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { sha256Hex, type CommandInput, type ProfileRead, type ProjectGraph as SpecGraph } from "@hackbuild/spec";
import {
  assembleGraph, defHash, downstream, foldLines, goldenLine, ids, itemId, legacyLine, parseItemId, parseSums, profileRowHash,
  type Item, type LegacySum, type MadeLine, type ProjectGraph, type StaleEntry,
} from "@hackbuild/project";
import { readSeedRows } from "../checks.js";
import { cmdError, didYouMean } from "../errors.js";
import type { CoreCtx } from "../registry.js";
import type { CommandOut } from "../result.js";
import { fullProfile } from "../load-build.js";
import { Store } from "../store.js";
import { defParts, loadDesign, loadWorkspace, readRow } from "./build.js";

/** The spec input plus the CLI-only filters of card step 5. */
export interface ProjectGraphInput extends CommandInput<"project.graph"> {
  /** Print only stale items. */
  readonly stale?: boolean;
  /** Print only the items downstream of this item id. */
  readonly from?: string;
}

/** spec ProjectGraph (links by rel, stale by id) widened with each item's uri, each link's hash at link time and the stale reasons. */
export interface GraphOut extends SpecGraph {
  readonly items: readonly Item[];
  readonly links: readonly { readonly from: string; readonly to: string; readonly rel: string; readonly hashAtLink: string }[];
  readonly stale: readonly string[];
  readonly because: readonly StaleEntry[];
}

const posix = (p: string): string => p.split(path.sep).join("/");
const sha256File = (file: string): string => sha256Hex(new Uint8Array(readFileSync(file)));
const listDir = (dir: string): string[] => (existsSync(dir) && statSync(dir).isDirectory() ? readdirSync(dir).sort() : []);

/** Every SHA256SUMS row under designs/<id>/legacy, by legacy tree, workspace relative. */
function legacyTrees(root: string): Map<string, LegacySum[]> {
  const trees = new Map<string, LegacySum[]>();
  for (const design of listDir(path.join(root, "designs"))) {
    const tree = `designs/${design}/legacy`;
    const sums: LegacySum[] = [];
    const walk = (rel: string): void => {
      for (const e of listDir(path.join(root, rel))) {
        const child = `${rel}/${e}`;
        if (statSync(path.join(root, child)).isDirectory()) walk(child);
        else if (e === "SHA256SUMS") sums.push(...parseSums(rel, readFileSync(path.join(root, child), "utf8")));
      }
    };
    if (existsSync(path.join(root, tree))) walk(tree);
    if (sums.length > 0) trees.set(tree, sums);
  }
  return trees;
}

/** The legacy trees a file names by its designs/<id>/legacy path. */
function treesNamed(text: string, trees: ReadonlyMap<string, LegacySum[]>): LegacySum[] {
  return [...trees.keys()].filter((t) => text.includes(`${t}/`) || text.includes(`"${t}"`)).flatMap((t) => trees.get(t)!);
}

/**
 * Lines the workspace states for itself: oracle records under
 * packages/<pkg>/records, scenes under packages/sim/scenes (a scene build is
 * build:scene/<id>), and reference goldens for the builds the graph holds.
 */
export function workspaceLines(root: string, built: ReadonlySet<string>): MadeLine[] {
  const trees = legacyTrees(root);
  const out: MadeLine[] = [];
  for (const pkg of listDir(path.join(root, "packages"))) {
    const dir = `packages/${pkg}/records`;
    for (const f of listDir(path.join(root, dir)).filter((n) => n.endsWith(".json"))) {
      const file = `${dir}/${f}`;
      const sums = treesNamed(readFileSync(path.join(root, file), "utf8"), trees);
      if (sums.length > 0) out.push(legacyLine({ id: itemId("oracleRecord", file), kind: "oracleRecord", uri: file, hash: sha256File(path.join(root, file)) }, "recordOf", sums));
    }
  }
  const scenes = "packages/sim/scenes";
  for (const f of listDir(path.join(root, scenes)).filter((n) => n.endsWith(".ts"))) {
    const file = `${scenes}/${f}`;
    const sums = treesNamed(readFileSync(path.join(root, file), "utf8"), trees);
    if (sums.length > 0) out.push(legacyLine({ id: ids.build(`scene/${f.slice(0, -3)}`), kind: "build", uri: file, hash: sha256File(path.join(root, file)) }, "reads", sums));
  }
  for (const area of listDir(path.join(root, "reference"))) {
    for (const ref of listDir(path.join(root, "reference", area))) {
      const target = `reference/${area}/${ref}`;
      const file = `${target}/expected/build.json`;
      if (!built.has(ids.build(target)) || !existsSync(path.join(root, file))) continue;
      const golden = JSON.parse(readFileSync(path.join(root, file), "utf8")) as { buildHash?: unknown };
      if (typeof golden.buildHash === "string") out.push(goldenLine(file, sha256File(path.join(root, file)), target, golden.buildHash));
    }
  }
  return out;
}

/** Source items as the workspace holds them now, for every link target no made line provides. */
async function currentItems(root: string, made: readonly MadeLine[]): Promise<Item[]> {
  const madeIds = new Set(made.map((l) => l.item.id));
  const targets = [...new Set(made.flatMap((l) => l.links.map((k) => k.to)))].filter((t) => !madeIds.has(t)).sort();
  const ws = await loadWorkspace(root);
  const seed = readSeedRows(root);
  const designs = new Map<string, Awaited<ReturnType<typeof loadDesign>> | null>();
  const design = async (target: string): Promise<Awaited<ReturnType<typeof loadDesign>> | null> => {
    if (!designs.has(target)) {
      try {
        designs.set(target, await loadDesign(path.join(root, target), root));
      } catch {
        designs.set(target, null);
      }
    }
    return designs.get(target) ?? null;
  };
  // Package feature kind versions as the designs that link them resolve
  // them now. A design without stages registers draft kinds on itself; those
  // are `featureKind:<target>/<kind>` items, read from that design below.
  const kinds = new Map<string, string>();
  for (const l of made) {
    const p = parseItemId(l.item.id);
    if (p?.kind !== "build" || !l.links.some((k) => k.to.startsWith("featureKind:"))) continue;
    const d = await design(p.key);
    if (d === null) continue;
    for (const [k, v] of Object.entries({ ...(d.stages ? d.kinds : {}), ...(d.onUseKinds ?? {}) })) kinds.set(k, v);
  }
  const out: Item[] = [];
  for (const id of targets) {
    const p = parseItemId(id);
    if (p === undefined) continue;
    if (p.kind === "chase" || p.kind === "buildScript") {
      const d = await design(p.key);
      if (d !== null) out.push({ id, kind: p.kind, uri: `${p.key}/${p.kind === "chase" ? "chase.ts" : posix(path.relative(d.dir, d.buildFile))}`, hash: defParts(d)[p.kind] });
    } else if (p.kind === "profileRow") {
      const seedSlice = p.key.startsWith("seed/");
      const key = seedSlice ? p.key.slice(5) : p.key;
      const at = key.indexOf("/");
      const read = { table: key.slice(0, at), id: key.slice(at + 1) } as ProfileRead;
      // A table the row reader does not hold (strain, contact, bleed) hashes as row null, as profileHash does.
      const r = readRow(seedSlice ? ws.tables : fullProfile(), read);
      out.push({ id, kind: p.kind, uri: `hbf://profile/${key}`, hash: profileRowHash(r.table, r.id, r.row) });
    } else if (p.kind === "checkDef") {
      const row = seed.get(p.key);
      if (row !== undefined) out.push({ id, kind: p.kind, uri: `hbf://check/${p.key}`, hash: defHash(p.key, row.version) });
    } else if (p.kind === "featureKind") {
      const at = p.key.lastIndexOf("/");
      const kind = p.key.slice(at + 1);
      const v = at < 0 ? kinds.get(kind) : (await design(p.key.slice(0, at)))?.kinds[kind];
      if (v !== undefined) out.push({ id, kind: p.kind, uri: `hbf://feature-kind/${p.key}`, hash: defHash(kind, v) });
    } else if (p.kind === "legacy") {
      const file = path.join(root, p.key);
      if (existsSync(file)) out.push({ id, kind: p.kind, uri: p.key, hash: sha256File(file) });
    }
  }
  return out;
}

/** The whole graph of a workspace: made lines from the store's graph file and the workspace, with the stale list. */
export async function projectGraph(root: string, store: Store = new Store(root)): Promise<ProjectGraph> {
  const stored = foldLines(store.graphLines());
  const built = new Set(stored.map((l) => l.item.id));
  const made = foldLines([...stored, ...workspaceLines(root, built)]);
  return assembleGraph(made, await currentItems(root, made));
}

/** The graph a command prints: everything, only stale items, or only what lies downstream of one item. */
export function viewOf(g: ProjectGraph, opts: { readonly stale?: boolean; readonly from?: string }): GraphOut {
  let keep = new Set(g.items.map((i) => i.id));
  if (opts.from !== undefined) {
    const from = opts.from;
    if (!keep.has(from)) {
      throw cmdError({ code: "E_REF", path: "/from", got: from, didYouMean: didYouMean(from, [...keep]), hint: "name an item id project.graph printed, for example profileRow:fit/SLIDE" });
    }
    keep = new Set(downstream(g.links, from));
  }
  if (opts.stale === true) keep = new Set(g.stale.map((s) => s.id).filter((id) => keep.has(id)));
  const because = g.stale.filter((s) => keep.has(s.id));
  return {
    items: g.items.filter((i) => keep.has(i.id)),
    links: g.links.filter((l) => keep.has(l.from)).map((l) => ({ from: l.from, to: l.to, rel: l.kind, hashAtLink: l.hashAtLink })),
    stale: because.map((s) => s.id),
    because,
  };
}

export async function runProjectGraph(input: ProjectGraphInput, ctx: CoreCtx): Promise<CommandOut<GraphOut>> {
  const root = input.project === undefined ? ctx.workspace : path.resolve(ctx.cwd, input.project);
  const g = await projectGraph(root, input.project === undefined ? ctx.store : new Store(root));
  const result = viewOf(g, { ...(input.stale === undefined ? {} : { stale: input.stale }), ...(input.from === undefined ? {} : { from: input.from }) });
  return {
    verdict: "pass", stage: "done", inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [], artifacts: [], next: [], result,
  };
}
