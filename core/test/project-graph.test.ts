// project.graph (M04-T09). Builds go through part.build into a store in a
// temporary directory, so the graph file is this file's own. Expected values
// come from sources the graph does not write: the reference goldens under
// expected/ (defHash and profileHash are the hashes BuildInputs records, so
// the graph's reads must reproduce them), the profile data rows and the
// legacy SHA256SUMS. The packages/project stale scenarios read
// packages/project/test/fixtures/graph.jsonl; the first describe here checks
// that fixture still equals a fresh recording, and writes it when
// HBF_ACCEPT_GRAPH=1 is set by a person who has read the diff.
//
// Every build here reads the run's build store (support/build-cache.ts,
// R1-speed-01), so a reference another corpus file built is not built
// again. Scenario (a) builds in its own process with no store, as it edits
// the profile in place: project-graph-scenario.test.ts.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { canonicalize } from "@hackbuild/spec";
import { assembleGraph, encodeLines, foldLines, type ProjectGraph } from "@hackbuild/project";
import { defParts, loadDesign, readRow } from "../src/commands/build.js";
import { legacyItem, legacyRows, projectGraph, viewOf, workspaceLines } from "../src/commands/project-graph.js";
import { isWiringDesign } from "../src/exporters/wiring.js";
import { hashOf } from "../src/jcs.js";
import { fullProfile } from "../src/load-build.js";
import { ROOT } from "./hbf.js";
import { OGEE, build, cleanTmps, freshStore, golden, tmp } from "./support/project-graph.js";

vi.mock("../src/commands/build.js", async (importOriginal) => (await import("./support/build-cache.js")).withBuildCache(await importOriginal()));

const FIXTURE = path.join(ROOT, "packages", "project", "test", "fixtures", "graph.jsonl");

/** Every reference directory holding a chase.ts, read from the tree, never typed here. */
function references(): string[] {
  const out: string[] = [];
  const dirs = (p: string): string[] => readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const area of dirs(path.join(ROOT, "reference"))) {
    for (const id of dirs(path.join(ROOT, "reference", area))) if (existsSync(path.join(ROOT, "reference", area, id, "chase.ts"))) out.push(`reference/${area}/${id}`);
  }
  return out;
}

afterAll(cleanTmps);

// Every reference is built once into one store, one test per reference so
// each build has its own time limit; a single test over all of them timed
// out at 300 s under load in full core runs (R1-fix-06). The links describe
// reads the same store.
const recorded = freshStore();
const builtHash = new Map<string, string>();

describe("the packages/project stale fixture equals a fresh recording of every reference", () => {
  for (const ref of references()) {
    it(`records ${ref}`, async () => {
      // A wiring design builds no part, and part.build refuses it; its goldens are the drawing's.
      if (isWiringDesign(await loadDesign(path.join(ROOT, ref), ROOT))) return;
      builtHash.set(ref, await build(recorded, ref));
    }, 120_000);
  }

  it("graph.jsonl holds the made lines of every reference build, report and workspace record", async () => {
    const stored = foldLines(recorded.graphLines());
    const lines = foldLines([...stored, ...workspaceLines(ROOT, new Set(stored.map((l) => l.item.id)))])
      .sort((a, b) => a.item.id.localeCompare(b.item.id));
    const text = encodeLines(lines);
    if (process.env["HBF_ACCEPT_GRAPH"] === "1") writeFileSync(FIXTURE, text);
    expect(text).toBe(readFileSync(FIXTURE, "utf8"));
    expect(viewOf(await projectGraph(ROOT, recorded), { stale: true }).stale).toEqual([]);
  }, 120_000);
});

describe("links written when a build is stored (card step 2)", () => {
  const store = recorded;
  let g: ProjectGraph;
  beforeAll(async () => {
    expect(builtHash.get(OGEE)).toBe(golden(OGEE).buildHash);
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

describe("legacy copies held out of git (D-286)", () => {
  // A synthetic workspace: one legacy tree whose SHA256SUMS names a copy that
  // is on disk and one that is not, and an oracle record that names the tree.
  const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
  let ws: string;
  beforeAll(() => {
    ws = tmp("hbf-held-");
    mkdirSync(path.join(ws, "designs", "x", "legacy"), { recursive: true });
    mkdirSync(path.join(ws, "packages", "p", "records"), { recursive: true });
    writeFileSync(path.join(ws, "designs", "x", "legacy", "kept.txt"), "kept\n");
    writeFileSync(path.join(ws, "designs", "x", "legacy", "SHA256SUMS"), `${sha("kept\n")}  kept.txt\n${sha("held\n")}  held.txt\n`);
    writeFileSync(path.join(ws, "packages", "p", "records", "r.json"), JSON.stringify({ source: "designs/x/legacy/kept.txt" }));
  });

  const graphOf = (): ProjectGraph => {
    const made = foldLines(workspaceLines(ws, new Set()));
    const targets = [...new Set(made.flatMap((l) => l.links.map((k) => k.to)))];
    const rows = legacyRows(ws);
    const current = targets.map((t) => legacyItem(ws, t.slice("legacy:".length), () => rows)).filter((i) => i !== undefined);
    return assembleGraph(made, current);
  };

  it("an absent copy is current at its SHA256SUMS row, so nothing is stale", () => {
    const g = graphOf();
    expect(g.links.map((l) => l.to).sort()).toEqual(["legacy:designs/x/legacy/held.txt", "legacy:designs/x/legacy/kept.txt"]);
    expect(g.stale).toEqual([]);
  });

  it("a copy on disk that no longer equals its row makes the record stale", () => {
    writeFileSync(path.join(ws, "designs", "x", "legacy", "kept.txt"), "edited\n");
    expect(graphOf().stale.map((s) => s.id)).toEqual(["oracleRecord:packages/p/records/r.json"]);
  });
});
