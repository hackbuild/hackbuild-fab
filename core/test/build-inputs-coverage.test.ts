// M04-T10 step 4 (D-051): the build hash covers exactly the ten BuildInputs
// fields and nothing else. The golden is reference/keys/click-spring-window
// expected/build.json, written by parity, so a build here that moves the
// hash or drops a field from BuildInputs fails against a file this test
// does not write. Each field changed alone moves the hash; the wall clock,
// the working directory, the time zone, the locale and an unrelated
// environment variable do not.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BuildInputs } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams, type Built } from "../src/commands/build.js";
import { hashOf } from "../src/jcs.js";
import { ROOT } from "./hbf.js";

const REF = "reference/keys/click-spring-window";
const golden = JSON.parse(readFileSync(path.join(ROOT, REF, "expected", "build.json"), "utf8")) as {
  readonly buildHash: string;
  readonly inputs: BuildInputs;
};

/** The ten BuildInputs fields, in the order D-051 lists them. */
const D051_FIELDS = [
  "defHash", "paramsHash", "profileHash", "registryHash", "kernelVersion",
  "engines", "adapter", "seed", "sourceDateEpoch", "licences",
] as const;

/** One change per field, of the field's own type. */
const CHANGED: { readonly [K in (typeof D051_FIELDS)[number]]: (v: BuildInputs[K]) => BuildInputs[K] } = {
  defHash: (h) => flip(h),
  paramsHash: (h) => flip(h),
  profileHash: (h) => flip(h),
  registryHash: (h) => flip(h),
  kernelVersion: (v) => `${v}-next`,
  engines: (e) => ({ ...e, manifold: `${e.manifold}.1` }),
  adapter: (a) => `${a}.1`,
  seed: (s) => s + 1,
  sourceDateEpoch: (t) => t + 2,
  licences: (l) => ({ ...l, "manifold-3d": "MIT" }),
};

function flip<H extends string>(h: H): H {
  return `${h[0] === "0" ? "1" : "0"}${h.slice(1)}` as H;
}

async function build(opts: { readonly epoch?: number; readonly params?: Record<string, unknown> } = {}): Promise<Built> {
  const design = await loadDesign(REF, ROOT);
  return buildPart(design, resolveParams(design.chase, opts.params as never, undefined), opts.epoch === undefined ? {} : { epoch: opts.epoch });
}

const saved = { cwd: process.cwd(), env: { ...process.env } };

afterEach(() => {
  vi.useRealTimers();
  process.chdir(saved.cwd);
  for (const k of Object.keys(process.env)) if (!(k in saved.env)) delete process.env[k];
  Object.assign(process.env, saved.env);
});

describe("build-inputs-coverage", () => {
  it("the build hash is sha256 over the ten D-051 fields and equals the committed golden", async () => {
    const b = await build({ epoch: golden.inputs.sourceDateEpoch });
    expect(Object.keys(b.inputs).sort()).toEqual([...D051_FIELDS].sort());
    expect(b.inputs).toEqual(golden.inputs);
    expect(b.part.buildHash).toBe(golden.buildHash);
    expect(hashOf(b.inputs)).toBe(b.part.buildHash);
  }, 120_000);

  it("ten fields: each one changed alone moves the build hash", () => {
    const seen = new Set<string>([golden.buildHash]);
    for (const f of D051_FIELDS) {
      const moved = { ...golden.inputs, [f]: (CHANGED[f] as (v: unknown) => unknown)(golden.inputs[f]) };
      const h = hashOf(moved);
      expect(h, `changing ${f} must move the build hash`).not.toBe(golden.buildHash);
      seen.add(h);
    }
    expect(seen.size).toBe(D051_FIELDS.length + 1);
  });

  it("through a real build: SOURCE_DATE_EPOCH and a param each move the hash", async () => {
    process.env["SOURCE_DATE_EPOCH"] = String(golden.inputs.sourceDateEpoch);
    const atEnv = await build();
    expect(atEnv.part.buildHash).toBe(golden.buildHash);
    process.env["SOURCE_DATE_EPOCH"] = String(golden.inputs.sourceDateEpoch + 86400);
    const later = await build();
    expect(later.inputs.sourceDateEpoch).toBe(golden.inputs.sourceDateEpoch + 86400);
    expect(later.part.buildHash).not.toBe(golden.buildHash);
    const wider = await build({ epoch: golden.inputs.sourceDateEpoch, params: { l: 25 } });
    expect(wider.inputs.paramsHash).not.toBe(golden.inputs.paramsHash);
    expect(wider.part.buildHash).not.toBe(golden.buildHash);
  }, 120_000);

  it("wall clock, cwd, TZ, locale and an unrelated env variable leave the hash alone", async () => {
    const elsewhere = mkdtempSync(path.join(tmpdir(), "hbf-coverage-"));
    try {
      vi.useFakeTimers({ now: Date.UTC(2031, 6, 4, 12, 0, 0), toFake: ["Date"] });
      process.chdir(elsewhere);
      process.env["TZ"] = "Pacific/Chatham";
      process.env["LANG"] = "tr_TR.UTF-8";
      process.env["LC_ALL"] = "tr_TR.UTF-8";
      process.env["HBF_UNRELATED"] = "1";
      process.env["SOURCE_DATE_EPOCH"] = String(golden.inputs.sourceDateEpoch);
      expect(new Date().getUTCFullYear()).toBe(2031);
      const b = await build();
      expect(b.part.buildHash).toBe(golden.buildHash);
      expect(b.part.bodies.map((x) => x.mesh.hash).sort()).toEqual(Object.values((golden as unknown as { meshHashes: Record<string, string> }).meshHashes).sort());
    } finally {
      process.chdir(saved.cwd);
      rmSync(elsewhere, { recursive: true, force: true });
    }
  }, 120_000);
});
