// M09-T11: BENCH over the bench core under fake timers. The alias table,
// the unknown kind message and the clamp line are typed here from
// spec/hook.ts prose and D-214, never read from the module under test, so
// a changed mapping or wording fails. Base64 is compared with node's own
// encoder over more than one 0x8000-byte slice (PIP part2.js line 425).

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { BenchHook, CheckResult, ParamGroup } from "@hackbuild/spec";
import { createBenchCore, type BenchCore, type BuildOutput } from "../../src/bench/core.js";
import { blockingChecks, clampState, createHook, installHook, type HookExport, type HookOptions } from "../../src/bench/hook.js";

interface S {
  w: number;
  shape: string;
  keys: { h: number }[];
}

const blank = (): S => ({ w: 20, shape: "round", keys: [{ h: 2 }] });

const GROUPS: readonly ParamGroup[] = [
  {
    id: "body",
    label: "body",
    fields: [
      { id: "w", label: "width", type: "mm", range: [12, 30], default: 20 },
      { id: "shape", label: "shape", type: "enum", options: [{ value: "round", label: "round" }, { value: "square", label: "square" }], default: "round" },
      { id: "keys", label: "keys", type: "list", min: 1, max: 2, item: [{ id: "h", label: "height", type: "mm", range: [1, 5], default: 2 }] },
    ],
  },
];

interface Report {
  results: CheckResult[];
}

let failNext = false;
let results: CheckResult[] = [];

function makeCore(): BenchCore<S, S, Report> {
  return createBenchCore<S, S, Report>({
    app: "test",
    v: 1,
    blank,
    build: async (s): Promise<BuildOutput<S, Report>> => {
      if (failNext) {
        failNext = false;
        throw new Error("forced throw");
      }
      return { part: s, report: { results }, buildHash: `h${s.w}` };
    },
  });
}

const written: string[] = [];
const exp = (kind: string, fabrication: boolean, write?: HookExport<S, Report>["write"]): HookExport<S, Report> => ({
  kind,
  fabrication,
  write: write ?? ((r) => {
    written.push(kind);
    return `${kind}:${r.part.w}`;
  }),
});

function hookOf(core: BenchCore<S, S, Report>, extra: Partial<HookOptions<S, Report>> = {}) {
  return createHook<S, S, Report>(core, {
    exports: [exp("json", false), exp("card", false), exp("stl", true), exp("3mf", true)],
    params: GROUPS,
    checks: (r) => r.report.results,
    ...extra,
  });
}

const fail = (id: string, severity: "block" | "warn" | "note", verdict: "fail" | "warn" = "fail"): CheckResult =>
  ({ id, verdict, severity }) as unknown as CheckResult;

const decode = (b64: string): string => Buffer.from(b64, "base64").toString("utf8");

beforeEach(() => {
  vi.useFakeTimers();
  failNext = false;
  results = [];
  written.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("installHook", () => {
  test("BENCH on globalThis answers every BenchHook member", async () => {
    const core = makeCore();
    const { hook, whenReady } = installHook(core, { exports: [exp("json", false)], verbs: { pull: () => 1 } });
    const g = (globalThis as unknown as { BENCH: BenchHook }).BENCH satisfies BenchHook;
    expect(g).toBe(hook);
    // Keyed by every member of the spec type: a new member fails tsc here.
    const kinds: { readonly [K in keyof Required<BenchHook>]: string } = {
      ready: "boolean", state: "object", model: "object", rev: "number", built: "number", busy: "boolean",
      buildHash: "object", error: "object", log: "object", settled: "function", loadDesign: "function",
      designJson: "function", ensureMesh: "function", commit: "function", drive: "function", release: "function",
      exportBytes: "function", verbs: "object",
    };
    for (const [k, t] of Object.entries(kinds)) expect(typeof (g as unknown as Record<string, unknown>)[k], k).toBe(t);
    await vi.runAllTimersAsync();
    await whenReady;
    expect(typeof g.buildHash).toBe("string");
    delete (globalThis as Record<string, unknown>)["BENCH"];
  });
});

describe("ready and settled", () => {
  test("ready turns true only after the first build settles, and built reads 0 before it", async () => {
    const core = makeCore();
    const { hook, whenReady } = hookOf(core);
    expect(hook.ready).toBe(false);
    expect(hook.built).toBe(0);
    expect(hook.model).toBeNull();
    await vi.runAllTimersAsync();
    await whenReady;
    expect(hook.ready).toBe(true);
    expect(hook.model).toEqual(blank());
    expect(hook.buildHash).toBe("h20");
  });

  test("ready waits on boot", async () => {
    let up: () => void = () => undefined;
    const core = makeCore();
    const { hook } = hookOf(core, { boot: new Promise<void>((r) => (up = r)) });
    await vi.advanceTimersByTimeAsync(1000);
    expect(hook.ready).toBe(false);
    up();
    await vi.runAllTimersAsync();
    expect(hook.ready).toBe(true);
  });

  test("settled resolves after a commit once the build ends, and not before", async () => {
    const core = makeCore();
    const { hook, whenReady } = hookOf(core);
    await vi.runAllTimersAsync();
    await whenReady;
    core.set("w", 25);
    hook.commit();
    expect(hook.busy).toBe(true);
    let done = false;
    const p = hook.settled(5000).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(300);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    await p;
    expect(done).toBe(true);
    expect(hook.built).toBe(hook.rev);
    expect(hook.buildHash).toBe("h25");
  });

  test("settled rejects with the timeout and what blocked it", async () => {
    const core = createBenchCore<S, S, Report>({ app: "t", v: 1, blank, build: () => new Promise(() => undefined) });
    const { hook } = hookOf(core);
    const p = hook.settled(1000);
    const seen = expect(p).rejects.toThrow("not settled after 1000 ms: not ready");
    await vi.advanceTimersByTimeAsync(1000);
    await seen;
  });

  test("a forced throw sets error and fails settled; a valid commit clears it (D-214)", async () => {
    const core = makeCore();
    const { hook, whenReady } = hookOf(core);
    await vi.runAllTimersAsync();
    await whenReady;
    failNext = true;
    core.set("w", 21);
    hook.commit();
    const seen = expect(hook.settled(5000)).rejects.toThrow("build failed: forced throw");
    await vi.advanceTimersByTimeAsync(400);
    await seen;
    expect(hook.error).toBe("forced throw");
    expect(hook.busy).toBe(false);
    expect(hook.model).toEqual({ ...blank(), w: 20 });
    core.set("w", 22);
    hook.commit();
    const ok = hook.settled(5000);
    await vi.advanceTimersByTimeAsync(400);
    await ok;
    expect(hook.error).toBeNull();
    expect(hook.buildHash).toBe("h22");
  });

  test("a first build that throws still turns ready, with error set", async () => {
    failNext = true;
    const core = makeCore();
    const { hook, whenReady } = hookOf(core);
    await vi.runAllTimersAsync();
    await whenReady;
    expect(hook.ready).toBe(true);
    expect(hook.error).toBe("forced throw");
  });
});

describe("core events", () => {
  test("a mirror taken on the built or error event reads building false (the shell pill)", async () => {
    const seen: string[] = [];
    let core: BenchCore<S, S, Report> | null = null;
    core = createBenchCore<S, S, Report>({
      app: "t", v: 1, blank,
      build: async (s) => {
        if (failNext) {
          failNext = false;
          throw new Error("forced throw");
        }
        return { part: s, report: { results }, buildHash: "h" };
      },
      onChange: (e) => {
        if (e === "built" || e === "error") seen.push(`${e} building=${String(core?.building)} busy=${String(core?.busy)}`);
      },
    });
    core.commit();
    await vi.runAllTimersAsync();
    failNext = true;
    core.commit();
    await vi.runAllTimersAsync();
    expect(seen).toEqual(["built building=false busy=false", "error building=false busy=false"]);
  });
});

describe("exportBytes", () => {
  test("aliases map print-card to card, design to json, stlzip to stl", async () => {
    const core = makeCore();
    const { hook } = hookOf(core);
    const ALIASES = { "print-card": "card", design: "json", stlzip: "stl" };
    for (const [alias, kind] of Object.entries(ALIASES)) {
      const p = hook.exportBytes(alias);
      await vi.runAllTimersAsync();
      expect(decode(await p)).toBe(`${kind}:20`);
    }
    expect(written).toEqual(["card", "json", "stl"]);
  });

  test("an unknown kind rejects with the spec message, never a TypeError", async () => {
    const { hook } = hookOf(makeCore());
    const p = hook.exportBytes("no-such-kind");
    await expect(p).rejects.toThrow(new Error("unknown export kind: no-such-kind"));
    await expect(hook.exportBytes("gerbers")).rejects.not.toBeInstanceOf(TypeError);
  });

  test("awaits the mesh of the current rev before writing", async () => {
    const core = makeCore();
    const { hook, whenReady } = hookOf(core);
    await vi.runAllTimersAsync();
    await whenReady;
    core.set("w", 28);
    hook.commit();
    const b64 = await hook.exportBytes("json");
    expect(decode(b64)).toBe("json:28");
  });

  test("base64 equals node's encoder over several 0x8000-byte slices", async () => {
    const bytes = new Uint8Array(0x8000 * 3 + 17).map((_, i) => (i * 31 + 7) & 0xff);
    const { hook } = hookOf(makeCore(), { exports: [exp("stl", false, () => bytes)] });
    const p = hook.exportBytes("stl");
    await vi.runAllTimersAsync();
    expect(await p).toBe(Buffer.from(bytes).toString("base64"));
  });

  test("a fabrication kind with a blocking fail refuses and names the check; free kinds and warn fails pass", async () => {
    results = [fail("CHK-KEY-01", "block"), fail("CHK-KEY-02", "warn")];
    const { hook } = hookOf(makeCore());
    const p = hook.exportBytes("3mf");
    const seen = expect(p).rejects.toThrow("3mf export refused: CHK-KEY-01 failed. fix the finding, then export.");
    await vi.runAllTimersAsync();
    await seen;
    expect(written).toEqual([]);
    const j = hook.exportBytes("json");
    await vi.runAllTimersAsync();
    expect(decode(await j)).toBe("json:20");
    results = [fail("CHK-KEY-02", "warn"), fail("CHK-KEY-03", "block", "warn")];
    // The gate reads the checks of the build the export writes, so the new results need a build.
    hook.commit();
    const s = hook.exportBytes("stlzip");
    await vi.runAllTimersAsync();
    expect(decode(await s)).toBe("stl:20");
  });

  test("pauses the viewer for the write and resumes after a throw", async () => {
    const calls: string[] = [];
    const { hook } = hookOf(makeCore(), {
      exports: [exp("card", false, () => {
        calls.push("write");
        throw new Error("card export is not in this bake yet");
      })],
      pause: () => {
        calls.push("pause");
        return () => calls.push("resume");
      },
    });
    const p = hook.exportBytes("print-card");
    const seen = expect(p).rejects.toThrow("card export is not in this bake yet");
    await vi.runAllTimersAsync();
    await seen;
    expect(calls).toEqual(["pause", "write", "resume"]);
  });
});

describe("blockingChecks", () => {
  test("only block-severity fails, each once, waived fails dropped", () => {
    const waived = { ...fail("CHK-C", "block"), waived: { reason: "owner" } } as unknown as CheckResult;
    expect(blockingChecks([fail("CHK-A", "block"), fail("CHK-A", "block"), fail("CHK-B", "warn"), fail("CHK-D", "note"), waived])).toEqual(["CHK-A"]);
  });
});

describe("state writes clamp (D-214)", () => {
  test("clampState lines name field, value and range", () => {
    const { state, lines } = clampState(GROUPS, { w: 40, shape: "hex", keys: [{ h: 0.5 }, { h: 2 }, { h: 3 }] });
    expect(state).toEqual({ w: 30, shape: "round", keys: [{ h: 1 }, { h: 2 }] });
    expect(lines).toEqual([
      "clamp w: 40 outside 12 to 30, set 30",
      'clamp shape: "hex" not one of round, square, set round',
      "clamp keys: 3 items outside 1 to 2, set 2",
      "clamp keys.0.h: 0.5 outside 1 to 5, set 1",
    ]);
  });

  test("in-range values and the input object are left alone", () => {
    const input = { w: 12, shape: "square", keys: [{ h: 5 }] };
    const { state, lines } = clampState(GROUPS, input);
    expect(lines).toEqual([]);
    expect(state).toEqual(input);
    clampState(GROUPS, { ...input, w: 99 });
    expect(input.w).toBe(12);
  });

  test("the state setter clamps, logs at once and rebuilds", async () => {
    const core = makeCore();
    const { hook, whenReady } = hookOf(core);
    await vi.runAllTimersAsync();
    await whenReady;
    const rev = hook.rev;
    hook.state = { w: 3, shape: "round", keys: [{ h: 2 }] };
    expect(hook.log).toContain("clamp w: 3 outside 12 to 30, set 12");
    expect(hook.rev).toBe(rev + 1);
    const p = hook.settled(5000);
    await vi.advanceTimersByTimeAsync(400);
    await p;
    expect((hook.state as S).w).toBe(12);
    expect(hook.buildHash).toBe("h12");
  });

  test("loadDesign clamps the state inside a design file and round trips designJson", async () => {
    const core = makeCore();
    const { hook, whenReady } = hookOf(core);
    await vi.runAllTimersAsync();
    await whenReady;
    hook.loadDesign(JSON.stringify({ app: "test", v: 1, state: { w: 31, shape: "square", keys: [{ h: 2 }] } }));
    expect(hook.log).toContain("clamp w: 31 outside 12 to 30, set 30");
    expect((hook.state as S).w).toBe(30);
    const before = hook.designJson();
    hook.loadDesign(before);
    expect(hook.designJson()).toBe(before);
  });

  test("text that is not a design sets error and leaves the design", async () => {
    const core = makeCore();
    const { hook, whenReady } = hookOf(core);
    await vi.runAllTimersAsync();
    await whenReady;
    const before = hook.designJson();
    hook.loadDesign("{not json");
    expect(hook.error).toMatch(/^not a design/);
    expect(hook.designJson()).toBe(before);
  });
});

describe("drive", () => {
  test("a bench without a pad rejects; release resolves", async () => {
    const { hook } = hookOf(makeCore());
    await expect(hook.drive("a", true)).rejects.toThrow("this bench declares no drive pad");
    await expect(hook.release()).resolves.toBeUndefined();
  });

  test("drive and release reach the injected pad", async () => {
    const seen: string[] = [];
    const { hook } = hookOf(makeCore(), {
      drive: async (t, v) => {
        seen.push(`${t}=${String(v)}`);
        return { target: t };
      },
      release: async (t) => void seen.push(`release ${t ?? "all"}`),
    });
    expect(await hook.drive("key1", true)).toEqual({ target: "key1" });
    await hook.release();
    expect(seen).toEqual(["key1=true", "release all"]);
  });
});
