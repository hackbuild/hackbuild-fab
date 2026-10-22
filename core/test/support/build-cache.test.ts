// The run's build store keys a build by every input it reads
// (support/build-cache.ts, R1-speed-01). A stub stands in for buildPart and
// counts its calls, so a hit and a miss are seen without building; the
// design and its profile tables are the keys flex-pair reference's own.

import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Built, Design, Values } from "../../src/commands/build.js";
import { loadDesign, resolveParams } from "../../src/commands/build.js";
import { REF, ROOT } from "../hbf.js";
import { STORE_ENV, TOOLCHAIN_ENV, buildKey, cachedBuildPart } from "./build-cache.js";

const tmps: string[] = [];
const tmp = (): string => {
  const d = mkdtempSync(path.join(tmpdir(), "hbf-build-cache-"));
  tmps.push(d);
  return d;
};
afterAll(() => {
  for (const d of tmps) rmSync(d, { recursive: true, force: true });
});

/** A buildPart that counts its calls and returns the call number as the part id. */
function stub(): { readonly build: (d: Design, v: Values) => Promise<Built>; readonly calls: () => number } {
  let n = 0;
  return {
    build: async (d, v) => ({ design: d, values: v, part: { id: `call ${++n}` } }) as unknown as Built,
    calls: () => n,
  };
}

/** The first number found in a row, at any depth, moved by 0.01: one profile row edited. */
function bump(row: unknown): void {
  const walk = (x: unknown): boolean => {
    if (typeof x !== "object" || x === null) return false;
    const o = x as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      if (typeof o[k] === "number") {
        o[k] = o[k] + 0.01;
        return true;
      }
      if (walk(o[k])) return true;
    }
    return false;
  };
  if (!walk(row)) throw new Error(`no number in ${JSON.stringify(row).slice(0, 80)}`);
}

describe("the run's build store", () => {
  let design: Design;
  let values: Values;
  beforeAll(async () => {
    design = await loadDesign(REF, ROOT);
    values = resolveParams(design.chase, undefined, undefined);
  });
  const env = (): Record<string, string> => ({ [STORE_ENV]: tmp(), [TOOLCHAIN_ENV]: "toolchain-a" });

  it("a second build of one key reads the store and keeps the caller's design", async () => {
    const s = stub();
    const build = cachedBuildPart(s.build, env());
    const a = await build(design, values);
    const b = await build({ ...design }, values);
    expect(s.calls()).toBe(1);
    expect(b.part.id).toBe(a.part.id);
    expect(b.design).not.toBe(a.design);
  });

  it("one profile row edited in a copy of the tables is a miss; an equal copy is a hit", async () => {
    const s = stub();
    const build = cachedBuildPart(s.build, env());
    await build(design, values);
    const same = structuredClone(design.ws.tables);
    await build({ ...design, ws: { ...design.ws, tables: same } }, values);
    expect(s.calls(), "an equal copy of the tables").toBe(1);
    const edited = structuredClone(design.ws.tables);
    bump(edited.materials[0]);
    const c = await build({ ...design, ws: { ...design.ws, tables: edited } }, values);
    expect(s.calls(), "one row edited").toBe(2);
    expect(c.part.id).toBe("call 2");
  });

  it("values, epoch, toolchain, defHash and a file in the design directory each move the key", () => {
    const key = buildKey(design, values, 315532800, "toolchain-a");
    expect(buildKey(design, values, 315532800, "toolchain-a")).toBe(key);
    expect(buildKey(design, { ...values, extra: 1 }, 315532800, "toolchain-a")).not.toBe(key);
    expect(buildKey(design, values, 315532801, "toolchain-a")).not.toBe(key);
    expect(buildKey(design, values, 315532800, "toolchain-b")).not.toBe(key);
    expect(buildKey({ ...design, defHash: "0".repeat(64) } as Design, values, 315532800, "toolchain-a")).not.toBe(key);
    const copy = tmp();
    cpSync(design.dir, copy, { recursive: true });
    const moved = { ...design, dir: copy } as Design;
    expect(buildKey(moved, values, 315532800, "toolchain-a"), "the same files elsewhere").toBe(key);
    writeFileSync(path.join(copy, "art.svg"), "<svg/>");
    expect(buildKey(moved, values, 315532800, "toolchain-a")).not.toBe(key);
  });

  it("sandbox options, an accept run and a run with no store build every time", async () => {
    for (const [e, opts] of [
      [env(), { sandbox: {} }],
      [{ ...env(), HBF_ACCEPT_METRICS: "1" }, {}],
      [{ ...env(), HBF_ACCEPT_GRAPH: "1" }, {}],
      [{ [TOOLCHAIN_ENV]: "toolchain-a" }, {}],
    ] as const) {
      const s = stub();
      const build = cachedBuildPart(s.build, e);
      await build(design, values, opts);
      await build(design, values, opts);
      expect(s.calls(), JSON.stringify(e)).toBe(2);
    }
  });
});
