// Store integrity and reportHash (M04-T08 steps 1, 2 and 4). A stored
// object that fails its hash is refused with E_HANDLE and the hint "store
// object failed its hash; rebuild <chase>", never read. reportHash is
// recomputed here from its definition, sha256 over the RFC 8785 form of
// {checks, findings} with findings sorted by id then target and cut to
// id, version, verdict, target, measured and legal, so the test does not
// trust the function it checks. The committed report goldens pin it.

import { randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalize, isThrownCommandError, sha256Hex, type CheckResult, type HbfUri } from "@hackbuild/spec";
import { encodeHbfm, meshHash, type MeshData } from "@hackbuild/mesh";
import { reportHash, reportHashInput } from "@hackbuild/checks";
import { Store } from "../src/store.js";
import { storeBuild } from "../src/load-build.js";
import { buildPart, loadDesign, resolveParams, type Built } from "../src/commands/build.js";
import { REF, ROOT, json } from "./hbf.js";

/** reportHash by its definition, written out independently of packages/checks. */
// The reportHash definition (ARCHITECTURE.md 8, D-243), written here apart from packages/checks:
// findings sorted by id, then canonical target, then the canonical hashed finding.
function expectedHash(checks: Record<string, string>, results: readonly CheckResult[]): string {
  const findings = results.map(({ id, version, verdict, target, measured, legal }) => ({ id, version, verdict, target, measured, legal }));
  const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  findings.sort((a, b) => cmp(a.id, b.id) || cmp(canonicalize(a.target), canonicalize(b.target)) || cmp(canonicalize(a), canonicalize(b)));
  return sha256Hex(canonicalize({ checks, findings }));
}

/** Flip one byte of a file in place. */
function flip(file: string, at: (len: number) => number): void {
  const bytes = readFileSync(file);
  const i = at(bytes.length);
  bytes[i] = bytes[i]! ^ 0x01;
  writeFileSync(file, bytes);
}

async function rejection(p: Promise<unknown> | (() => unknown)): Promise<{ code: string; hint: string; chase?: string } | undefined> {
  try {
    await (typeof p === "function" ? p() : p);
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf as never;
    throw e;
  }
  return undefined;
}

const HINT = /^store object failed its hash; rebuild /;

let buildHash = "";
let results: CheckResult[] = [];
let built: Built;

beforeAll(async () => {
  const b = await json("part.build", REF);
  buildHash = b.r.buildHash!;
  const c = await json("check.run", REF);
  results = c.r.result?.["results"] as CheckResult[];
  const design = await loadDesign(path.join(ROOT, REF), ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
}, 120_000);

describe("reportHash", () => {
  it("equals its definition and the committed golden of every reference", () => {
    const refs = ["keys/flex-pair", "keys/click-spring-window", "cosmetic/coin-inlay", "electrical/trace-width-budget", "exports/orca-3mf-roundtrip", "fit/ogee16-r16p"];
    for (const ref of refs) {
      const g = JSON.parse(readFileSync(path.join(ROOT, "reference", ref, "expected", "report.json"), "utf8")) as { checks: Record<string, string>; findings: CheckResult[]; reportHash: string };
      expect(Object.keys(g.checks).length, ref).toBeGreaterThan(0);
      expect(expectedHash(g.checks, g.findings), ref).toBe(g.reportHash);
      expect(reportHash(reportHashInput(g.checks, g.findings)), ref).toBe(g.reportHash);
    }
  });

  it("two check.run calls on one build print the same reportHash, the one its definition gives", async () => {
    const a = await json("check.run", REF);
    const b = await json("check.run", REF);
    expect([a.r.buildHash, b.r.buildHash]).toEqual([buildHash, buildHash]);
    expect(a.r.result?.["report"]).toBe(b.r.result?.["report"]);
    const stored = new Store(ROOT).report(String(a.r.result?.["report"]).slice("hbf://report/".length));
    expect(`hbf://report/${expectedHash({ ...stored.checks }, a.r.result?.["results"] as CheckResult[])}`).toBe(a.r.result?.["report"]);
  }, 120_000);

  it("ignores result order, constraint text and extras; a version bump or a skip turning into a run moves it", () => {
    const checks = Object.fromEntries(results.map((r) => [r.id as string, r.version]));
    const base = reportHash(reportHashInput(checks, results));
    expect(reportHash(reportHashInput(checks, [...results].reverse()))).toBe(base);
    expect(reportHash(reportHashInput(checks, results.map((r) => ({ ...r, constraint: "x", extra: { wallMs: 9 } }) as CheckResult)))).toBe(base);
    const bumped = { ...checks, [results[0]!.id]: "99.0.0" };
    expect(reportHash(reportHashInput(bumped, results))).not.toBe(base);
    const skip = results.findIndex((r) => r.verdict === "skip");
    expect(skip, "the flex-pair run carries a skip").toBeGreaterThanOrEqual(0);
    const ran = results.map((r, i) => (i === skip ? ({ ...r, verdict: "pass" }) as CheckResult : r));
    expect(reportHash(reportHashInput(checks, ran))).not.toBe(base);
    expect(reportHash(reportHashInput(checks, results.slice(1)))).not.toBe(base);
  });
});

describe("a damaged store object is refused, not read", () => {
  it("flipping one byte of a stored report makes part.inspect of its uri exit 2 with E_HANDLE naming the chase", async () => {
    const store = new Store(ROOT);
    // A report of its own, so no other test reads the damaged file.
    const checks = { ...Object.fromEntries(results.map((r) => [r.id as string, r.version])), [`CHK-T08-${randomUUID()}`]: "0.0.0" };
    const uri = store.putReport(checks, results, { chase: "keys-flex-pair", target: REF });
    const intact = await json("part.inspect", uri);
    expect(intact.code).toBe(2);
    expect(intact.r.errors[0]?.hint).not.toMatch(HINT);
    const file = path.join(store.root, "reports", `${uri.slice("hbf://report/".length)}.json`);
    flip(file, (n) => Math.floor(n / 2));
    const bad = await json("part.inspect", uri);
    expect(bad.code).toBe(2);
    expect(bad.r.errors[0]).toMatchObject({ code: "E_HANDLE", chase: "keys-flex-pair" });
    expect(bad.r.errors[0]?.hint).toBe("store object failed its hash; rebuild keys-flex-pair");
    const ex = await json("explain", uri);
    expect([ex.code, ex.r.errors[0]?.code]).toEqual([2, "E_HANDLE"]);
    rmSync(file);
  }, 60_000);

  describe("each kind in a scratch store", () => {
    const made: string[] = [];
    afterAll(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });
    const scratch = (): Store => {
      const dir = mkdtempSync(path.join(tmpdir(), "hbf-integrity-"));
      made.push(dir);
      return new Store(dir);
    };
    const only = (s: Store, dir: string): string => path.join(s.root, dir, readdirSync(path.join(s.root, dir))[0]!);

    it("a build: a flipped byte, or a record whose inputs do not hash to its name, is refused", async () => {
      const s = scratch();
      const rec = storeBuild(s, built);
      const uri = `hbf://build/${rec.buildHash}`;
      expect(s.build(uri).buildHash).toBe(buildHash);
      for (const b of s.build(uri).part.bodies) expect(meshHash(s.mesh(b.mesh.hash))).toBe(b.mesh.hash);
      flip(only(s, "builds"), (n) => n - 10);
      expect(await rejection(() => s.build(uri))).toMatchObject({ code: "E_HANDLE", chase: "keys-flex-pair", hint: "store object failed its hash; rebuild keys-flex-pair" });
      const forged = { ...rec, inputs: { ...rec.inputs, seed: 1 } };
      const furi = await s.put("build", new TextEncoder().encode(JSON.stringify(forged)));
      expect(await rejection(() => s.build(furi))).toMatchObject({ code: "E_HANDLE", hint: "store object failed its hash; rebuild keys-flex-pair" });
    });

    it("a mesh whose indices changed is refused", async () => {
      const s = scratch();
      const tetra: MeshData = {
        positions: Float64Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
        triangles: Uint32Array.from([0, 2, 1, 0, 1, 3, 1, 2, 3, 0, 3, 2]),
      };
      const uri = await s.put("mesh", encodeHbfm(tetra));
      expect(meshHash(await s.get(uri) as MeshData)).toBe(meshHash(tetra));
      // The last uint32 index, 2, becomes 3: the same vertices, another triangle.
      flip(only(s, "meshes"), (n) => n - 4);
      expect(await rejection(s.get(uri))).toMatchObject({ code: "E_HANDLE", hint: HINT });
    });

    it("an artifact is refused when its bytes no longer hash to its name", async () => {
      const s = scratch();
      const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
      const uri = await s.put("artifact", png) as HbfUri;
      expect(await s.get(uri)).toEqual(png);
      flip(only(s, "artifacts"), (n) => n - 1);
      expect(await rejection(s.get(uri))).toMatchObject({ code: "E_HANDLE", hint: "store object failed its hash; rebuild the design that wrote it" });
    });

    it("writes leave no temp file behind", async () => {
      const s = scratch();
      s.putReport({ "CHK-PRT-01": "1.0.0" }, results.filter((r) => r.id === "CHK-PRT-01"));
      expect(readdirSync(path.join(s.root, "reports")).every((f) => f.endsWith(".json"))).toBe(true);
    });
  });
});
