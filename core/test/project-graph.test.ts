// project.graph (M04-T09). Builds go through part.build into a store in a
// temporary directory, so the graph file is this file's own. Expected values
// come from sources the graph does not write: the reference goldens under
// expected/ (defHash and profileHash are the hashes BuildInputs records, so
// the graph's reads must reproduce them), the profile data rows and the
// legacy SHA256SUMS. Scenario (a) edits the SLIDE fit band row in this
// worker's loaded profile, the tables the build sandbox is handed, so no
// file in the workspace changes. The packages/project stale scenarios read
// packages/project/test/fixtures/graph.jsonl; the last describe here checks
// that fixture still equals a fresh recording, and writes it when
// HBF_ACCEPT_GRAPH=1 is set by a person who has read the diff.

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalize, type BuildInputs, type FitBand } from "@hackbuild/spec";
import { encodeLines, foldLines, type ProjectGraph } from "@hackbuild/project";
import { defParts, loadDesign, readRow } from "../src/commands/build.js";
import { runPartBuild } from "../src/commands/part-build.js";
import { projectGraph, runProjectGraph, viewOf, workspaceLines, type GraphOut } from "../src/commands/project-graph.js";
import { isWiringDesign } from "../src/exporters/wiring.js";
import { hashOf } from "../src/jcs.js";
import { fullProfile } from "../src/load-build.js";
import type { CoreCtx } from "../src/registry.js";
import { Store } from "../src/store.js";
import { ROOT } from "./hbf.js";

const OGEE = "reference/fit/ogee16-r16p";
const CLICK = "reference/keys/click-spring-window";
const FIXTURE = path.join(ROOT, "packages", "project", "test", "fixtures", "graph.jsonl");

const golden = (ref: string): { buildHash: string; inputs: BuildInputs } =>
  JSON.parse(readFileSync(path.join(ROOT, ref, "expected", "build.json"), "utf8")) as { buildHash: string; inputs: BuildInputs };

/** Every reference directory holding a chase.ts, read from the tree, never typed here. */
function references(): string[] {
  const out: string[] = [];
  const dirs = (p: string): string[] => readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const area of dirs(path.join(ROOT, "reference"))) {
    for (const id of dirs(path.join(ROOT, "reference", area))) if (existsSync(path.join(ROOT, "reference", area, id, "chase.ts"))) out.push(`reference/${area}/${id}`);
  }
  return out;
}

const tmps: string[] = [];
function freshStore(): Store {
  const dir = mkdtempSync(path.join(tmpdir(), "hbf-graph-"));
  tmps.push(dir);
  return new Store(dir);
}
afterAll(() => {
  for (const d of tmps) rmSync(d, { recursive: true, force: true });
});

const ctxOf = (store: Store): CoreCtx => ({ workspace: ROOT, cwd: ROOT, store, inputsHash: hashOf("project-graph-test") } as unknown as CoreCtx);

async function build(store: Store, ref: string): Promise<string> {
  const r = await runPartBuild({ chase: ref }, ctxOf(store));
  return r.buildHash!;
}

async function staleView(store: Store, opts: { stale?: boolean; from?: string } = { stale: true }): Promise<GraphOut> {
  return (await runProjectGraph(opts, ctxOf(store))).result as GraphOut;
}

describe("links written when a build is stored (card step 2)", () => {
  let store: Store;
  let g: ProjectGraph;
  beforeAll(async () => {
    store = freshStore();
    expect(await build(store, OGEE)).toBe(golden(OGEE).buildHash);
    g = await projectGraph(ROOT, store);
  }, 120_000);

  it("the chase and build.ts items are the two parts of the golden defHash", async () => {
    const d = await loadDesign(path.join(ROOT, OGEE), ROOT);
    const parts = defParts(d);
    expect(hashOf({ chase: d.chase, sources: parts.sources })).toBe(golden(OGEE).inputs.defHash);
    const links = g.links.filter((l) => l.from === `build:${OGEE}`);
    expect(links.find((l) => l.to === `chase:${OGEE}`)?.hashAtLink).toBe(parts.chase);
    expect(links.find((l) => l.to === `buildScript:${OGEE}`)?.hashAtLink).toBe(parts.buildScript);
    expect(links.find((l) => l.to === `params:${OGEE}`)?.hashAtLink).toBe(golden(OGEE).inputs.paramsHash);
  });

  it("the profile rows linked, in link order, hash to the golden profileHash: the links are the ProfileLookup record", () => {
    const rows = g.links.filter((l) => l.from === `build:${OGEE}` && l.to.startsWith("profileRow:")).map((l) => {
      const key = l.to.slice("profileRow:".length);
      const at = key.indexOf("/");
      return readRow(fullProfile(), { table: key.slice(0, at), id: key.slice(at + 1) } as Parameters<typeof readRow>[1]);
    });
    expect(rows.map((r) => `${r.table}/${r.id}`)).toContain("fit/SLIDE");
    expect(hashOf(rows)).toBe(golden(OGEE).inputs.profileHash);
  });

  it("each mesh is produced by the build at the golden mesh hashes, and the report is checked against the build", () => {
    const meshes = g.items.filter((i) => i.id.startsWith(`mesh:${OGEE}/`)).map((i) => i.hash).sort();
    expect(meshes).toEqual(Object.values((golden(OGEE) as unknown as { meshHashes: Record<string, string> }).meshHashes).sort());
    expect(g.links).toContainEqual({ from: `report:${OGEE}`, to: `build:${OGEE}`, kind: "checked", hashAtLink: golden(OGEE).buildHash });
  });

  it("an unchanged workspace has nothing stale", () => {
    expect(g.stale).toEqual([]);
  });

  it("a missing graph file is rebuilt from the store to the same graph (card step 6)", async () => {
    rmSync(store.graphFile);
    const again = await projectGraph(ROOT, store);
    expect(again.items).toEqual(g.items);
    expect(new Set(again.links.map((l) => canonicalize(l)))).toEqual(new Set(g.links.map((l) => canonicalize(l))));
    expect(existsSync(store.graphFile)).toBe(true);
  });
});

describe("scenario (a) through project.graph: the SLIDE fit band row edited", () => {
  const fits = fullProfile().fits!.fits as FitBand[];
  const at = fits.findIndex((f) => f.class === "SLIDE");
  const original = fits[at]!;
  const edit = (row: FitBand): void => {
    fits[at] = row;
  };
  let store: Store;
  beforeAll(async () => {
    store = freshStore();
    await build(store, OGEE);
    await build(store, CLICK);
  }, 120_000);
  afterAll(() => edit(original));

  it("lists the ogee16 build and its report, each with because ending in the row id, and leaves click-spring-window fresh", async () => {
    edit({ ...original, realHiPerSide: original.realHiPerSide + 0.01 });
    const v = await staleView(store);
    const why = new Map(v.because.map((s) => [s.id, s.because] as const));
    expect(why.get(`build:${OGEE}`)).toEqual(["reads profileRow:fit/SLIDE"]);
    expect(why.get(`report:${OGEE}`)).toEqual([`checked build:${OGEE}`, "reads profileRow:fit/SLIDE"]);
    // The meshes and the golden are made from that build, so the stale rule carries them too.
    expect(v.stale).toEqual([
      `build:${OGEE}`, `golden:${OGEE}/expected/build.json`, `mesh:${OGEE}/bore`, `mesh:${OGEE}/shaft`, `report:${OGEE}`,
    ]);
    for (const s of v.because) expect(s.because.at(-1)).toBe("reads profileRow:fit/SLIDE");
    expect(v.stale.some((id) => id.includes(CLICK))).toBe(false);
  });

  it("--from profileRow:fit/SLIDE lists exactly the items made from the row", async () => {
    const v = await staleView(store, { from: "profileRow:fit/SLIDE" });
    expect(v.items.map((i) => i.id)).toEqual([
      `build:${OGEE}`, `golden:${OGEE}/expected/build.json`, `mesh:${OGEE}/bore`, `mesh:${OGEE}/shaft`, `report:${OGEE}`,
    ]);
    await expect(runProjectGraph({ from: "profileRow:fit/SLIDEX" }, ctxOf(store))).rejects.toMatchObject({ hbf: { code: "E_REF", path: "/from", didYouMean: expect.arrayContaining(["profileRow:fit/SLIDE"]) } });
  });

  it("rebuilding clears the build and report; the golden stays stale until accepted; restoring the row and rebuilding clears all", async () => {
    await build(store, OGEE);
    expect((await staleView(store)).because).toEqual([
      { id: `golden:${OGEE}/expected/build.json`, because: [`expects build:${OGEE}`] },
    ]);
    edit(original);
    expect((await staleView(store)).stale).toContain(`build:${OGEE}`);
    expect(await build(store, OGEE)).toBe(golden(OGEE).buildHash);
    expect((await staleView(store)).stale).toEqual([]);
  }, 120_000);
});

describe("the packages/project stale fixture equals a fresh recording of every reference", () => {
  it("graph.jsonl holds the made lines of every reference build, report and workspace record", async () => {
    const store = freshStore();
    for (const ref of references()) {
      // A wiring design builds no part, and part.build refuses it; its goldens are the drawing's.
      if (isWiringDesign(await loadDesign(path.join(ROOT, ref), ROOT))) continue;
      await build(store, ref);
    }
    const stored = foldLines(store.graphLines());
    const lines = foldLines([...stored, ...workspaceLines(ROOT, new Set(stored.map((l) => l.item.id)))])
      .sort((a, b) => a.item.id.localeCompare(b.item.id));
    const text = encodeLines(lines);
    if (process.env["HBF_ACCEPT_GRAPH"] === "1") writeFileSync(FIXTURE, text);
    expect(text).toBe(readFileSync(FIXTURE, "utf8"));
    expect(viewOf(await projectGraph(ROOT, store), { stale: true }).stale).toEqual([]);
  }, 300_000);
});
