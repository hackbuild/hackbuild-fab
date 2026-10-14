// M09-T03: the bench interaction contract under fake timers. The numbers
// are PIP's (bench/part2.js): `schedule` 320 ms, `HIST` 450 ms and 80 deep;
// the slow build bound 2.5 s is COLLAR's (collar.html line 2808, D-213). They are typed here from those sources, never read from the
// module under test, so a changed constant fails.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createBenchCore, PRESET_OVER_ART, type BenchCore, type BuildOutput } from "../../src/bench/core.js";
import { mergeOntoBlank } from "../../src/bench/merge.js";

interface S {
  a: number;
  nest: { b: number; c: string };
  list: number[];
  colour: string;
}

const blank = (): S => ({ a: 0, nest: { b: 2, c: "x" }, list: [1, 2], colour: "pink" });
const out = (s: S): BuildOutput<number, null> => ({ part: s.a, report: null, buildHash: `h${s.a}` });

interface Rig {
  core: BenchCore<S, number, null>;
  builds: S[];
  lights: number;
}

function rig(build?: (s: S) => Promise<BuildOutput<number, null>>, extra: Partial<Parameters<typeof createBenchCore<S, number, null>>[0]> = {}): Rig {
  const r: Rig = { core: undefined as unknown as BenchCore<S, number, null>, builds: [], lights: 0 };
  r.core = createBenchCore<S, number, null>({
    app: "test",
    v: 1,
    blank,
    build: async (s) => {
      r.builds.push(s);
      return build ? build(s) : out(s);
    },
    light: () => {
      r.lights += 1;
    },
    ...extra,
  });
  return r;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("rebuild debounce", () => {
  test("one commit at 0 ms builds at 320 ms, not at 319 ms", () => {
    const { core, builds } = rig();
    core.commit();
    vi.advanceTimersByTime(319);
    expect(builds.length).toBe(0);
    expect(core.busy).toBe(true);
    vi.advanceTimersByTime(1);
    expect(builds.length).toBe(1);
  });

  test("a second commit at 200 ms moves the build to 520 ms; exactly one build", async () => {
    const { core, builds } = rig();
    core.commit();
    vi.advanceTimersByTime(200);
    core.commit();
    vi.advanceTimersByTime(319);
    expect(builds.length).toBe(0);
    vi.advanceTimersByTime(1);
    expect(builds.length).toBe(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(builds.length).toBe(1);
    expect(core.built).toBe(core.rev);
    expect(core.busy).toBe(false);
  });

  test("touch bumps no rev and runs no build", async () => {
    const { core, builds } = rig();
    core.touch();
    expect(core.rev).toBe(0);
    expect(core.stale).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(builds.length).toBe(0);
  });

  test("auto off leaves the build to ensureMesh", async () => {
    const { core, builds } = rig();
    core.auto = false;
    core.commit();
    await vi.advanceTimersByTimeAsync(5000);
    expect(builds.length).toBe(0);
    await core.ensureMesh();
    expect(builds.length).toBe(1);
  });
});

describe("rebuild runner", () => {
  test("a commit during a running build produces exactly one follow-up build", async () => {
    const gate = deferred();
    let first = true;
    const { core, builds } = rig(async (s) => {
      if (first) {
        first = false;
        await gate.promise;
      }
      return out(s);
    });
    core.set("a", 1);
    core.commit();
    vi.advanceTimersByTime(320);
    expect(builds.length).toBe(1);
    expect(core.building).toBe(true);
    core.set("a", 2);
    core.commit();
    vi.advanceTimersByTime(320);
    core.set("a", 3);
    core.commit();
    vi.advanceTimersByTime(320);
    expect(core.queued).toBe(true);
    expect(builds.length).toBe(1);
    gate.resolve();
    await vi.advanceTimersByTimeAsync(5000);
    expect(builds.length).toBe(2);
    expect(builds[1]?.a).toBe(3);
    expect(core.result?.buildHash).toBe("h3");
    expect(core.built).toBe(core.rev);
  });

  test("a thrown build logs, keeps the previous model and clears busy", async () => {
    const { core } = rig(async (s) => {
      if (s.a === 99) throw new Error("wall under 0.8 mm");
      return out(s);
    });
    core.set("a", 5);
    core.commit();
    await vi.advanceTimersByTimeAsync(320);
    expect(core.result?.buildHash).toBe("h5");
    core.set("a", 99);
    core.commit();
    await vi.advanceTimersByTimeAsync(320);
    expect(core.result?.buildHash).toBe("h5");
    expect(core.error).toBe("wall under 0.8 mm");
    expect(core.log).toContain("build failed: wall under 0.8 mm");
    expect(core.busy).toBe(false);
    await expect(core.ensureMesh()).rejects.toThrow("build failed: wall under 0.8 mm");
    core.set("a", 6);
    core.commit();
    await vi.advanceTimersByTimeAsync(320);
    expect(core.error).toBeNull();
    expect(core.result?.buildHash).toBe("h6");
  });

  test("the build reads a copy, so an edit during the build does not reach it", async () => {
    const gate = deferred();
    const { core, builds } = rig(async (s) => {
      await gate.promise;
      return out(s);
    });
    core.set("a", 1);
    core.commit();
    vi.advanceTimersByTime(320);
    core.set("a", 2);
    gate.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(builds[0]?.a).toBe(1);
    expect(core.result?.buildHash).toBe("h1");
  });
});

describe("light commit", () => {
  test("calls build zero times and light once; built equals rev at once", async () => {
    const { core, builds } = rig();
    core.commit();
    await vi.advanceTimersByTimeAsync(320);
    expect(builds.length).toBe(1);
    const hash = core.result?.buildHash;
    core.set("colour", "ink");
    core.commitLight();
    expect(core.built).toBe(core.rev);
    await vi.advanceTimersByTimeAsync(5000);
    expect(builds.length).toBe(1);
    expect(core.result?.buildHash).toBe(hash);
    expect(core.busy).toBe(false);
  });

  test("commitAs dispatches each ParamField.commit kind", async () => {
    const r = rig();
    r.core.commitAs("commit");
    await vi.advanceTimersByTimeAsync(320);
    r.core.commitAs("light");
    r.core.commitAs("touch");
    expect(r.lights).toBe(1);
    expect(r.core.stale).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(r.builds.length).toBe(1);
  });

  test("a light commit behind a pending geometry commit keeps that build", async () => {
    const { core, builds } = rig();
    core.commit();
    await vi.advanceTimersByTimeAsync(320);
    core.set("a", 4);
    core.commit();
    core.commitLight();
    expect(core.built).toBeLessThan(core.rev);
    await vi.advanceTimersByTimeAsync(320);
    expect(builds.length).toBe(2);
    expect(core.built).toBe(core.rev);
  });
});

describe("ensureMesh", () => {
  test("right after a commit resolves with a model of the new rev", async () => {
    const { core, builds } = rig();
    core.commit();
    await vi.advanceTimersByTimeAsync(320);
    core.set("a", 7);
    core.commit();
    const m = await core.ensureMesh();
    expect(m.rev).toBe(core.rev);
    expect(m.buildHash).toBe("h7");
    await vi.advanceTimersByTimeAsync(5000);
    expect(builds.length).toBe(2);
  });

  test("during a build of an older rev waits, then builds the current rev", async () => {
    const gate = deferred();
    let first = true;
    const { core, builds } = rig(async (s) => {
      if (first) {
        first = false;
        await gate.promise;
      }
      return out(s);
    });
    core.set("a", 1);
    core.commit();
    vi.advanceTimersByTime(320);
    core.set("a", 2);
    core.commit();
    const p = core.ensureMesh();
    gate.resolve();
    const m = await p;
    expect(m.buildHash).toBe("h2");
    expect(m.rev).toBe(core.rev);
    await vi.advanceTimersByTimeAsync(5000);
    expect(builds.length).toBe(2);
  });
});

describe("undo", () => {
  test("81 commits 500 ms apart keep 80 snapshots; the first state is gone; 80 undos and 80 redos return", () => {
    const { core } = rig();
    for (let i = 1; i <= 81; i++) {
      core.set("a", i);
      core.commit();
      vi.advanceTimersByTime(500);
    }
    const last = core.designJson();
    const seen = new Set<number>();
    for (let k = 0; k < 80; k++) {
      core.undo();
      seen.add(core.state.a);
    }
    expect(seen.size).toBe(79);
    expect(seen.has(0)).toBe(false);
    expect(seen.has(1)).toBe(false);
    expect(core.state.a).toBe(2);
    expect(core.undo()).toBe(false);
    for (let k = 0; k < 80; k++) core.redo();
    expect(core.designJson()).toBe(last);
    expect(core.redo()).toBe(false);
  });

  test("undo inside the 450 ms window takes the pending snapshot first", () => {
    const { core } = rig();
    core.set("a", 1);
    core.commit();
    vi.advanceTimersByTime(500);
    core.set("a", 2);
    core.commit();
    vi.advanceTimersByTime(449);
    expect(core.undo()).toBe(true);
    expect(core.state.a).toBe(1);
    expect(core.redo()).toBe(true);
    expect(core.state.a).toBe(2);
  });

  test("undo bumps rev and schedules a build", async () => {
    const { core, builds } = rig();
    core.set("a", 1);
    core.commit();
    await vi.advanceTimersByTimeAsync(500);
    const rev = core.rev;
    core.undo();
    expect(core.rev).toBe(rev + 1);
    await vi.advanceTimersByTimeAsync(320);
    expect(builds.length).toBe(2);
    expect(core.result?.buildHash).toBe("h0");
  });
});

describe("loadDesign", () => {
  test("an unknown key logs one line naming it; state is blank merged with the known keys", () => {
    const { core } = rig();
    const ok = core.loadDesign(JSON.stringify({ app: "test", v: 1, state: { a: 5, ghost: 1, nest: { b: 9 }, list: [7] } }));
    expect(ok).toBe(true);
    expect(core.log.length).toBe(1);
    expect(core.log[0]).toContain("/ghost");
    expect(core.state).toEqual(mergeOntoBlank(blank(), { a: 5, nest: { b: 9 }, list: [7] }).state);
    expect(core.state).toEqual({ a: 5, nest: { b: 9, c: "x" }, list: [7], colour: "pink" });
  });

  test("a nested unknown key is named by its pointer", () => {
    const { core } = rig();
    core.loadDesign(JSON.stringify({ state: { nest: { zombie: 2 } } }));
    expect(core.log).toEqual(["dropped /nest/zombie: not a setting of this design"]);
  });

  test("a design of another app, bad json and a non-object are refused without a throw", () => {
    const { core } = rig();
    core.set("a", 3);
    expect(core.loadDesign(JSON.stringify({ app: "toggle", v: 1, state: { a: 9 } }))).toBe(false);
    expect(core.error).toBe("not a test design: app is toggle");
    expect(core.loadDesign("{")).toBe(false);
    expect(core.loadDesign("[1]")).toBe(false);
    expect(core.state.a).toBe(3);
  });

  test("migrate runs before the merge, and a NaN after it is logged as a build error", () => {
    const { core } = rig(undefined, { migrate: (d) => ({ state: { a: (d as { old: number }).old } }) });
    expect(core.loadDesign(JSON.stringify({ old: 4 }))).toBe(true);
    expect(core.state.a).toBe(4);
    const nan = rig(undefined, { migrate: () => ({ state: { a: Number.NaN } }) });
    expect(nan.core.loadDesign("{}")).toBe(false);
    expect(nan.core.log).toEqual(["build failed: not a number at /a"]);
  });

  test("designJson writes app, v, state in that order and round trips", () => {
    const { core } = rig();
    core.set("nest.b", 8);
    const j = core.designJson();
    expect(Object.keys(JSON.parse(j) as object)).toEqual(["app", "v", "state"]);
    const other = rig();
    other.core.loadDesign(j);
    expect(other.core.designJson()).toBe(j);
  });
});

describe("blank and presets", () => {
  test("reset is a full factory reset", () => {
    const { core } = rig();
    core.set("a", 9);
    core.set("nest.c", "y");
    core.reset();
    expect(core.state).toEqual(blank());
  });

  test("a preset applies to a fresh blank", () => {
    const { core } = rig();
    core.set("nest.c", "y");
    core.reset((s) => ({ ...s, a: 2 }));
    expect(core.state).toEqual({ ...blank(), a: 2 });
  });

  test("a preset over art asks once and a refusal keeps the art", () => {
    const asked: string[] = [];
    let answer = false;
    const { core } = rig(undefined, { hasArt: (s) => s.nest.c !== "x", confirm: (t) => (asked.push(t), answer) });
    core.set("nest.c", "art");
    expect(core.loadPreset((s) => s)).toBe(false);
    expect(asked).toEqual([PRESET_OVER_ART]);
    expect(core.state.nest.c).toBe("art");
    answer = true;
    expect(core.loadPreset((s) => s)).toBe(true);
    expect(asked.length).toBe(2);
    expect(core.state.nest.c).toBe("x");
    expect(core.loadPreset((s) => s)).toBe(true);
    expect(asked.length).toBe(2);
  });

  test("the preset question reads as the card wrote it", () => {
    expect(PRESET_OVER_ART).toBe("loading a preset replaces your art. replace it?");
  });
});

describe("slow build warning", () => {
  test("a build that takes 2600 ms yields one SLOW_BUILD naming the param set last; 2400 ms yields none", async () => {
    const slow = rig(async (s) => {
      vi.advanceTimersByTime(2600);
      return out(s);
    });
    slow.core.set("nest.b", 9);
    slow.core.commit();
    await vi.advanceTimersByTimeAsync(320);
    const text = "build took 2.6 s, over 2.5 s. lower nest.b or turn auto rebuild off";
    expect(slow.core.result?.warnings).toEqual([{ code: "SLOW_BUILD", text }]);
    expect(slow.core.log).toContain(text);

    const quick = rig(async (s) => {
      vi.advanceTimersByTime(2400);
      return out(s);
    });
    quick.core.commit();
    await vi.advanceTimersByTimeAsync(320);
    expect(quick.core.result?.warnings).toEqual([]);
  });

  test("BuildDecl.slowMs moves the bound", async () => {
    const r = rig(async (s) => {
      vi.advanceTimersByTime(2600);
      return out(s);
    }, { slowMs: 3000 });
    r.core.commit();
    await vi.advanceTimersByTimeAsync(320);
    expect(r.core.result?.warnings).toEqual([]);
  });
});
