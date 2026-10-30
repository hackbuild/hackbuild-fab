// M09-T04 step 3 and 4 (D-166, D-167): the share link round trips, and each
// refusal boots blank with the rule logged and zero loadDesign calls. The
// PIP example design is rebuilt from the committed legacy layout.js
// (designs/pip/legacy/src/layout.js, `LAYOUT.defaults()` and PIP's
// designJson at bench/part2.js line 187); its 2971 B is the plan's number
// measured from the legacy bench on 2026-10-04.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import { createBenchCore } from "../../src/bench/core.js";
import { admitDesign, currentOnly, decodeShare, encodeShare, openShare, SHARE_REFUSED, type AdmitOptions, type ShareTarget } from "../../src/bench/share.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const CHASE = 2;
// 1 MB inflated, D-166; typed from the decision, never read from the module.
const CAP = 1_048_576;
const FC_RUNS = Number(process.env["FC_RUNS"] ?? 100);
const SEED = Number(process.env["FC_SEED"] ?? 20261011);

function pipExample(): string {
  const ctx: Record<string, unknown> = {};
  ctx["globalThis"] = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(ROOT, "designs/pip/legacy/src/layout.js"), "utf8"), ctx);
  const H = ctx["PIP"] as { LAYOUT: { defaults(): unknown } };
  return JSON.stringify({ app: "pip-bench", v: 1, state: H.LAYOUT.defaults() }, null, 1);
}

const pass: AdmitOptions = { migrate: currentOnly(CHASE), validate: () => null };

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

function spyTarget(): ShareTarget & { loads: string[]; resets: number; lines: string[] } {
  const t = {
    loads: [] as string[],
    resets: 0,
    lines: [] as string[],
    loadDesign(j: string) {
      t.loads.push(j);
      return true;
    },
    reset() {
      t.resets += 1;
    },
    appendLog(l: string) {
      t.lines.push(l);
    },
  };
  return t;
}

describe("round trip", () => {
  test("the PIP example design, 2971 B, round trips and its encoded length is recorded", async () => {
    const j = pipExample();
    expect(Buffer.byteLength(j)).toBe(2971);
    const hash = await encodeShare(j, CHASE);
    expect(hash.startsWith("#d=2.")).toBe(true);
    const got = await decodeShare(hash, pass);
    expect(got?.ok && got.text).toBe(j);
    process.stdout.write(`share link length, PIP example design (2971 B json): ${hash.length} characters, computed\n`);
  });

  test("the flex-pair default design round trips and its encoded length is recorded", async (ctx) => {
    const buildJs = path.join(ROOT, "core/dist/commands/build.js");
    let defaultsOf: ((c: unknown) => unknown) | undefined;
    try {
      ({ defaultsOf } = (await import(pathToFileURL(buildJs).href)) as { defaultsOf: (c: unknown) => unknown });
    } catch {
      ctx.skip("core dist not built; run tsc -b core first");
    }
    const { chase } = (await import(pathToFileURL(path.join(ROOT, "reference/keys/flex-pair/chase.ts")).href)) as { chase: { meta: { id: string; version: number; chase: number } } };
    expect(chase.meta.chase).toBe(CHASE);
    const j = JSON.stringify({ app: chase.meta.id, v: chase.meta.version, state: defaultsOf?.(chase) }, null, 1);
    const hash = await encodeShare(j, chase.meta.chase);
    const got = await decodeShare(hash, pass);
    expect(got?.ok && got.text).toBe(j);
    process.stdout.write(`share link length, flex-pair default design (${Buffer.byteLength(j)} B json): ${hash.length} characters, computed\n`);
  });

  test(`100 generated json documents round trip (seed ${SEED})`, async () => {
    await fc.assert(
      fc.asyncProperty(fc.jsonValue(), async (v) => {
        const j = JSON.stringify(v);
        const got = await decodeShare(await encodeShare(j, CHASE), pass);
        return got !== null && got.ok && got.text === j;
      }),
      { seed: SEED, numRuns: FC_RUNS },
    );
  });

  test("openShare loads the design through loadDesign and the bench state matches", async () => {
    const make = () => createBenchCore({ app: "pip-bench", v: 1, blank: () => (JSON.parse(pipExample()) as { state: unknown }).state, build: async () => ({ part: 0, report: 0, buildHash: "h" }) });
    const a = make();
    a.set("seg", 41);
    const hash = await encodeShare(a.designJson(), CHASE);
    const b = make();
    expect(await openShare(b, hash, pass)).toBe(true);
    expect(b.designJson()).toBe(a.designJson());
    a.dispose();
    b.dispose();
  });

  test("a hash without d= is no design", async () => {
    expect(await decodeShare("", pass)).toBeNull();
    expect(await decodeShare("#step=2", pass)).toBeNull();
    const t = spyTarget();
    expect(await openShare(t, "#", pass)).toBe(false);
    expect(t.resets + t.lines.length).toBe(0);
  });
});

describe("refusals boot blank with the rule logged and zero loadDesign calls", () => {
  async function refused(hash: string, opts: AdmitOptions, rule: string): Promise<void> {
    const t = spyTarget();
    expect(await openShare(t, hash, opts)).toBe(false);
    expect(t.loads).toEqual([]);
    expect(t.resets).toBe(1);
    expect(t.lines.length).toBe(1);
    expect(t.lines[0]).toContain(SHARE_REFUSED);
    expect(t.lines[0]).toContain(`share-link/${rule}`);
  }

  test("a payload inflating past 1 MB", async () => {
    const big = new Uint8Array(CAP + 1).fill(0x20);
    const hash = `#d=2.${base64url(await deflate(big))}`;
    expect(hash.length).toBeLessThan(4096);
    await refused(hash, pass, "oversize");
  });

  test("a payload of exactly 1 MB passes the cap", async () => {
    const doc = `"${"a".repeat(CAP - 2)}"`;
    const got = await decodeShare(`#d=2.${base64url(await deflate(new TextEncoder().encode(doc)))}`, pass);
    expect(got?.ok).toBe(true);
  });

  test("a version above the current meta.chase", async () => {
    await refused(await encodeShare("{}", CHASE + 1), pass, "migrate");
  });

  test("valid json that fails validate", async () => {
    const opts: AdmitOptions = { migrate: currentOnly(CHASE), validate: (d) => ((d as { app?: string }).app === "pip-bench" ? null : "app is not pip-bench") };
    await refused(await encodeShare(JSON.stringify({ app: "toggle" }), CHASE), opts, "validate");
  });

  test("invalid base64url, a non-numeric version and a payload that is not deflate", async () => {
    await refused("#d=2.ab$c", pass, "base64url");
    await refused("#d=two.abcd", pass, "version");
    await refused(`#d=2.${base64url(new Uint8Array([0xff, 0xff, 0xff, 0xff]))}`, pass, "inflate");
  });

  test("an unprefixed payload goes to the legacy reader, or is refused without one", async () => {
    const legacyHash = (await encodeShare('{"app":"pip-bench"}', CHASE)).replace("#d=2.", "#d=");
    await refused(legacyHash, pass, "legacy");
    const seen: unknown[] = [];
    const got = await decodeShare(legacyHash, { ...pass, legacy: (d) => (seen.push(d), { upgraded: true }) });
    expect(got?.ok && got.version).toBe("legacy");
    expect(got?.ok && got.design).toEqual({ upgraded: true });
    expect(seen).toEqual([{ app: "pip-bench" }]);
  });

  test("loadDesign refusing the admitted design still boots blank", async () => {
    const t = spyTarget();
    t.loadDesign = (j) => (t.loads.push(j), false);
    expect(await openShare(t, await encodeShare("{}", CHASE), pass)).toBe(false);
    expect(t.resets).toBe(1);
  });
});

describe("drop and file picker", () => {
  test("admitDesign takes the same cap and validate", () => {
    expect(admitDesign("{}", pass).ok).toBe(true);
    const over = admitDesign(" ".repeat(CAP + 1), pass);
    expect(!over.ok && over.error.record).toBe("share-link/oversize");
    const bad = admitDesign("{}", { validate: () => "no state" });
    expect(!bad.ok && bad.error.code).toBe("E_SCHEMA");
  });
});
