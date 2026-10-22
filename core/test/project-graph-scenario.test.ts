// project.graph scenario (a) (M04-T09), apart from project-graph.test.ts
// (R1-speed-01): it edits the SLIDE fit band row in this worker's loaded
// profile, the tables the build sandbox is handed, so no file in the
// workspace changes, and it builds into its own stores with no shared
// build store, as the test is about what a build reads.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FitBand } from "@hackbuild/spec";
import { runProjectGraph } from "../src/commands/project-graph.js";
import { fullProfile } from "../src/load-build.js";
import type { Store } from "../src/store.js";
import { CLICK, OGEE, build, cleanTmps, ctxOf, freshStore, golden, staleView } from "./support/project-graph.js";

afterAll(cleanTmps);

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
