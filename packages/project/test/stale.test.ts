// The stale rule over a recorded project graph (M04-T09 acceptance). The
// made lines are packages/project/test/fixtures/graph.jsonl, recorded by
// part.build over every reference and the workspace's own records
// (core/test/project-graph.test.ts checks it equals a fresh recording).
// Each scenario first pins the fixture to a source the graph does not
// write (the profile data row, the legacy file bytes and its SHA256SUMS
// row, the check seed version, the reference golden), then changes that
// source and asks which items went stale. The baseline holds every other
// source at the hash its links recorded.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadProfile } from "@hackbuild/profile";
import {
  assembleGraph, buildLines, computeStale, decodeLines, defHash, downstream, exportedLine, parseItemId, profileRowHash,
  type Item, type ProjectGraph,
} from "../src/index";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (rel: string): Buffer => readFileSync(path.join(ROOT, rel));
const LINES = decodeLines(read("packages/project/test/fixtures/graph.jsonl").toString("utf8"));
const OGEE = "reference/fit/ogee16-r16p";
const CLICK = "reference/keys/click-spring-window";
/** The graph item: the legacy copy the oracle records cite. */
const PARAMS_SCAD = "designs/ogee16/legacy/source/params.scad";
/** The same bytes, stored whole for motion and core (lineage ogee16.params/motion-stored). */
const PARAMS_STORED = "packages/motion/inputs/ogee16/params.scad";

/** Every source item at the one hash all its links recorded; a source two links disagree on fails here. */
function baseline(): Map<string, Item> {
  const made = new Set(LINES.map((l) => l.item.id));
  const out = new Map<string, Item>();
  for (const l of LINES.flatMap((m) => m.links)) {
    if (made.has(l.to)) continue;
    const seen = out.get(l.to);
    if (seen !== undefined) expect(seen.hash, `two links record two hashes for ${l.to}`).toBe(l.hashAtLink);
    out.set(l.to, { id: l.to, kind: parseItemId(l.to)!.kind, uri: l.to, hash: l.hashAtLink });
  }
  return out;
}

function graphWith(changes: Readonly<Record<string, string>>): ProjectGraph {
  const current = baseline();
  for (const [id, hash] of Object.entries(changes)) {
    expect(current.has(id), `${id} is a source the fixture links`).toBe(true);
    current.set(id, { ...current.get(id)!, hash });
  }
  return assembleGraph(LINES, [...current.values()]);
}

const builds = (g: ProjectGraph): string[] => g.items.filter((i) => i.kind === "build").map((i) => i.id);
const sha256 = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

describe("the recorded graph", () => {
  it("holds a build and a report of every reference, the ogee16 build at its golden buildHash, and nothing stale", () => {
    const g = graphWith({});
    expect(g.stale).toEqual([]);
    const golden = JSON.parse(read(`${OGEE}/expected/build.json`).toString("utf8")) as { buildHash: string };
    expect(g.items.find((i) => i.id === `build:${OGEE}`)?.hash).toBe(golden.buildHash);
    for (const ref of [OGEE, CLICK]) expect(g.items.map((i) => i.id)).toEqual(expect.arrayContaining([`build:${ref}`, `report:${ref}`]));
  });

  it("each golden line records the committed expected/build.json: its sha256, and the buildHash that file holds on its expects link", () => {
    // The committed golden is a source the graph does not write, so a fixture recorded against
    // an unaccepted golden fails here, and the nothing stale case above cannot hide it.
    const goldens = LINES.filter((l) => l.item.kind === "golden");
    expect(goldens.length).toBeGreaterThan(0);
    const drift = goldens.flatMap((l) => {
      const bytes = read(l.item.uri);
      const { buildHash } = JSON.parse(bytes.toString("utf8")) as { buildHash: string };
      const expects = l.links.filter((k) => k.kind === "expects").map((k) => k.hashAtLink);
      const out: string[] = [];
      if (l.item.hash !== sha256(bytes)) out.push(`${l.item.id} hash ${l.item.hash.slice(0, 8)}, file ${sha256(bytes).slice(0, 8)}`);
      if (expects.length !== 1 || expects[0] !== buildHash) out.push(`${l.item.id} expects ${expects.map((h) => h.slice(0, 8)).join(",")}, file buildHash ${buildHash.slice(0, 8)}`);
      return out;
    });
    expect(drift).toEqual([]);
  });

  it("every report is checked against a build the graph holds, board builds included", () => {
    const made = new Set(LINES.map((l) => l.item.id));
    const checked = LINES.flatMap((l) => l.links).filter((l) => l.kind === "checked" && l.to.startsWith("build:"));
    expect(checked.filter((l) => !made.has(l.to)).map((l) => l.from)).toEqual([]);
    expect(checked.some((l) => l.to.startsWith("build:reference/boards/"))).toBe(true);
  });

  it("a draft kind is an item of its design: flex-pair's draft pad and the package pad are two sources at two versions", () => {
    const FLEX = "reference/keys/flex-pair";
    const to = (id: string): Set<string> => new Set(LINES.flatMap((l) => l.links).filter((l) => l.to === id).map((l) => `${l.from} ${l.hashAtLink}`));
    const draft = [...to(`featureKind:${FLEX}/pad`)];
    const pkg = [...to("featureKind:pad")];
    expect(draft).toEqual([`build:${FLEX} ${defHash("pad", "0.1.0-draft.0")}`]);
    expect(pkg.length).toBeGreaterThan(0);
    expect(pkg.some((x) => x.startsWith(`build:${FLEX} `))).toBe(false);
    expect(new Set(pkg.map((x) => x.split(" ")[1])).size).toBe(1);
    expect(pkg[0]!.split(" ")[1]).not.toBe(defHash("pad", "0.1.0-draft.0"));
    const lines = buildLines({
      target: "t", buildHash: "h", chaseHash: "c", buildScriptHash: "s", paramsHash: "p", profile: "seed", reads: [],
      kinds: { conductor: "1.0.0" }, draftKinds: { pad: "0.1.0-draft.0" }, meshes: {},
    });
    expect(lines[1]!.links.filter((l) => l.to.startsWith("featureKind:")).map((l) => [l.to, l.hashAtLink])).toEqual([
      ["featureKind:conductor", defHash("conductor", "1.0.0")],
      ["featureKind:t/pad", defHash("pad", "0.1.0-draft.0")],
    ]);
  });

  it("the stale rule follows a chain and names the path: a change two links up reaches the report through the build", () => {
    const items: Item[] = [
      { id: "profileRow:fit/X", kind: "profileRow", uri: "", hash: "b" },
      { id: "build:t", kind: "build", uri: "", hash: "h" },
      { id: "report:t", kind: "report", uri: "", hash: "r" },
    ];
    const links = [
      { from: "build:t", to: "profileRow:fit/X", kind: "reads" as const, hashAtLink: "a" },
      { from: "report:t", to: "build:t", kind: "checked" as const, hashAtLink: "h" },
    ];
    expect(computeStale(items, links)).toEqual([
      { id: "build:t", because: ["reads profileRow:fit/X"] },
      { id: "report:t", because: ["checked build:t", "reads profileRow:fit/X"] },
    ]);
    expect(computeStale([items[1]!, items[2]!], links)).toEqual([
      { id: "build:t", because: ["reads profileRow:fit/X"] },
      { id: "report:t", because: ["checked build:t", "reads profileRow:fit/X"] },
    ]);
    expect(downstream(links, "profileRow:fit/X")).toEqual(["build:t", "report:t"]);
  });
});

describe("scenario (a): editing the SLIDE fit band row", () => {
  const row = loadProfile().fits!.fits.find((f) => f.class === "SLIDE")!;
  const ROW = "profileRow:fit/SLIDE";

  it("the fixture linked the row at the hash of the packages/profile data row", () => {
    expect(baseline().get(ROW)?.hash).toBe(profileRowHash("fit", "SLIDE", row));
  });

  it("makes the ogee16 build and its report stale with because ending in the row id, and leaves fresh every build whose record lacks the row", () => {
    const g = graphWith({ [ROW]: profileRowHash("fit", "SLIDE", { ...row, realHiPerSide: row.realHiPerSide + 0.01 }) });
    const why = new Map(g.stale.map((s) => [s.id, s.because] as const));
    expect(why.get(`build:${OGEE}`)).toEqual([`reads ${ROW}`]);
    expect(why.get(`report:${OGEE}`)).toEqual([`checked build:${OGEE}`, `reads ${ROW}`]);
    for (const s of g.stale) expect(s.because.at(-1)).toBe(`reads ${ROW}`);
    const readers = new Set(g.links.filter((l) => l.to === ROW).map((l) => l.from));
    expect([...readers]).toEqual([`build:${OGEE}`]);
    for (const b of builds(g)) expect(why.has(b), b).toBe(readers.has(b));
    expect(why.has(`build:${CLICK}`)).toBe(false);
    // click-spring-window's build record holds the machine row only; the strain row and click.dropMin are read by constraints.query.
    expect(g.links.filter((l) => l.from === `build:${CLICK}` && l.to.startsWith("profileRow:")).map((l) => l.to)).toEqual(["profileRow:machine/ffc5p"]);
  });

  it("an approved 3mf export of the ogee16 build goes stale with it, through its exported link", () => {
    const changed = profileRowHash("fit", "SLIDE", { ...row, realHiPerSide: row.realHiPerSide + 0.01 });
    const buildHash = LINES.find((l) => l.item.id === `build:${OGEE}`)!.item.hash;
    const current = [...baseline().values()].map((i) => (i.id === ROW ? { ...i, hash: changed } : i));
    const g = assembleGraph([...LINES, exportedLine(OGEE, "3mf", "0".repeat(64), buildHash)], current);
    expect(g.stale.find((s) => s.id === `artifact:${OGEE}/3mf`)?.because).toEqual([`exported build:${OGEE}`, `reads ${ROW}`]);
  });
});

describe("scenario (b): one byte of the OGEE16 params.scad changed", () => {
  const bytes = new Uint8Array(read(PARAMS_STORED));
  const ID = `legacy:${PARAMS_SCAD}`;

  it("the fixture linked the file at its sha256 and its SHA256SUMS row", () => {
    const sums = read("designs/ogee16/legacy/SHA256SUMS").toString("utf8");
    expect(sums).toContain(`${sha256(bytes)}  source/params.scad`);
    expect(baseline().get(ID)?.hash).toBe(sha256(bytes));
  });

  it("makes the OGEE oracle records stale, and nothing else", () => {
    const edited = bytes.slice();
    edited[0] = edited[0]! ^ 1;
    const g = graphWith({ [ID]: sha256(edited) });
    // The scenes read stored inputs (packages/sim/scenes/inputs, packages/motion/inputs) and link no legacy tree.
    // The M07 motion and nest oracle records rerun OGEE16's own scripts on the same source and cite it.
    const m07 = [
      "packages/motion/records/ogee16-kin.json", "packages/nest/records/dxf-inventory.json", "packages/nest/records/ogee16-connect.json",
      "packages/nest/records/ogee16-cut-footprints.json", "packages/nest/records/ogee16-cut-legacy.json",
      "packages/nest/records/ogee16-plates-legacy.json", "packages/nest/records/ogee16-steps.json",
    ];
    expect(g.stale).toEqual([
      ...m07.map((r) => ({ id: `oracleRecord:${r}`, because: [`recordOf ${ID}`] })),
      { id: "oracleRecord:packages/sim/records/ogee-sweep.json", because: [`recordOf ${ID}`] },
    ]);
  });
});

describe("scenario (c): raising a CheckDef version", () => {
  const rows = (JSON.parse(read("packages/checks/seed/checks.seed.json").toString("utf8")) as { checks: { id: string; version: string }[] }).checks;
  const version = (id: string): string => rows.find((r) => r.id === id)!.version;
  const bump = (v: string): string => `${Number(v.split(".")[0]) + 1}.0.0`;

  for (const id of ["CHK-PRT-09", "CHK-PRT-04"]) {
    it(`${id}: every report that ran it goes stale, and no build`, () => {
      const ID = `checkDef:${id}`;
      const ran = [...new Set(LINES.flatMap((l) => l.links).filter((l) => l.to === ID).map((l) => l.from))].sort();
      if (ran.length > 0) expect(baseline().get(ID)?.hash).toBe(defHash(id, version(id)));
      const g = graphWith(ran.length > 0 ? { [ID]: defHash(id, bump(version(id))) } : {});
      expect(g.stale.map((s) => s.id)).toEqual(ran);
      for (const s of g.stale) expect(s.because).toEqual([`checked ${ID}`]);
      expect(g.stale.some((s) => parseItemId(s.id)?.kind !== "report")).toBe(false);
      // Every reference part report runs both since check.run runs the registry checks of the build levels (D-243).
      // A board build meshes no body and its report runs the board checks, so the part builds are those that produced a mesh.
      const meshed = new Set(g.links.filter((l) => l.kind === "produced").map((l) => l.to));
      expect(ran.length).toBe(builds(g).filter((b) => b.startsWith("build:reference/") && meshed.has(b)).length);
      expect(ran.length).toBeGreaterThan(0);
    });
  }
});
