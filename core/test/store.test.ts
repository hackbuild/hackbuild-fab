// The content-addressed store (D-050, M00-T13 step 5): a build written by
// part.build reads back by hbf://build/<hash> with its meshes; an unknown
// uri is E_HANDLE; a collected build is E_HANDLE naming the chase it came
// from, with the rebuild call in next. StoreHandle.put keeps the D-050
// file form per kind, so whatever put returns, has and get read back; the
// static hbf://check/<id> resolves from the check seed.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { build as build3mf } from "@hackbuild/3mf";
import { encodeHbfm, meshHash, type MeshData } from "@hackbuild/mesh";
import { canonicalize, isThrownCommandError, sha256Hex, type HbfUri } from "@hackbuild/spec";
import { hashOf } from "../src/jcs.js";
import { Store, parseUri } from "../src/store.js";
import { legalText } from "../src/text.js";
import { REF, ROOT, json } from "./hbf.js";

describe("store and hbf:// uris", () => {
  it("part.build stores the build and its meshes under .hbf/store keyed by hash", async () => {
    const { code, r } = await json("part.build", REF);
    expect(code).toBe(0);
    const store = new Store(ROOT);
    const rec = store.build(`hbf://build/${r.buildHash}`);
    expect(rec.buildHash).toBe(r.buildHash);
    expect(rec.chase).toBe("keys-flex-pair");
    expect(rec.target).toBe(REF);
    for (const b of rec.part.bodies) expect(meshHash(store.mesh(b.mesh.hash))).toBe(b.mesh.hash);
    for (const dir of ["builds", "meshes", "reports"]) expect(existsSync(path.join(ROOT, ".hbf", "store", dir))).toBe(true);
  }, 60_000);

  it("part.inspect reads a stored build; an unknown uri is E_HANDLE, exit 2", async () => {
    const b = await json("part.build", REF);
    const ok = await json("part.inspect", `hbf://build/${b.r.buildHash}`);
    expect(ok.code).toBe(0);
    const bodies = ok.r.result?.["bodies"] as { id: string; mesh: { hash: string; bbox: unknown; volumeMm3: number } }[];
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies[0]!.mesh.hash).toMatch(/^[0-9a-f]{64}$/);
    const bad = await json("part.inspect", "hbf://build/0000");
    expect(bad.code).toBe(2);
    expect(bad.r.errors[0]?.code).toBe("E_HANDLE");
  }, 60_000);

  it("a collected build is E_HANDLE naming its chase, with part.build in next", async () => {
    const b = await json("part.build", REF);
    const store = new Store(ROOT);
    // A record of its own under a fresh hash, so the shared flex-pair build other test files read is never collected.
    const rec = store.build(`hbf://build/${b.r.buildHash}`);
    const inputs = { ...rec.inputs, seed: Number.parseInt(randomUUID().slice(0, 8), 16) };
    const h = sha256Hex(canonicalize(inputs));
    await store.put("build", new TextEncoder().encode(JSON.stringify({ ...rec, buildHash: h, inputs })));
    rmSync(path.join(store.root, "builds", `${h}.json`));
    const gone = await json("part.inspect", `hbf://build/${h}`);
    expect(gone.code).toBe(2);
    expect(gone.r.errors[0]).toMatchObject({ code: "E_HANDLE", chase: "keys-flex-pair" });
    expect(gone.r.next[0]).toMatchObject({ command: "part.build", args: { chase: "keys-flex-pair" } });
  }, 60_000);

  it("check.run takes a build uri and stores its report", async () => {
    const b = await json("part.build", REF);
    const c = await json("check.run", `hbf://build/${b.r.buildHash}`, "--only", "CHK-PRT-01,CHK-PRT-03");
    expect(c.code).toBe(0);
    expect(c.r.buildHash).toBe(b.r.buildHash);
    const ids = (c.r.result?.["results"] as { id: string; verdict: string }[]).map((x) => `${x.id} ${x.verdict}`).sort();
    expect(ids).toEqual(["CHK-PRT-01 pass", "CHK-PRT-03 pass"]);
    const report = String(c.r.result?.["report"]);
    expect(await new Store(ROOT).has(report as `hbf://report/${string}`)).toBe(true);
  }, 60_000);

  it("parseUri refuses a non-hbf uri with E_HANDLE", () => {
    expect(() => parseUri("http://example/x")).toThrow();
    expect(parseUri("hbf://check/CHK-PRT-01")).toEqual({ kind: "check", id: "CHK-PRT-01" });
  });

  it("a part uri parses to its build hash and part id (M04-T08 step 3)", () => {
    const h = "a".repeat(64);
    expect(parseUri(`hbf://build/${h}/part/pad`)).toEqual({ kind: "build", id: h, part: "pad" });
    expect(errOf(() => parseUri(`hbf://nope/${h}`))).toMatchObject({ code: "E_HANDLE" });
  });
});

/** The CommandError a call throws, or undefined. */
function errOf(f: () => unknown): { code: string; hint: string; expected?: string; didYouMean?: string[] } | undefined {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf as never;
    throw e;
  }
  return undefined;
}

async function rejectionOf(p: Promise<unknown>): Promise<{ code: string; hint: string; path?: string; didYouMean?: string[] } | undefined> {
  try {
    await p;
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf as never;
    throw e;
  }
  return undefined;
}

const tetra: MeshData = {
  positions: Float64Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
  triangles: Uint32Array.from([0, 2, 1, 0, 1, 3, 1, 2, 3, 0, 3, 2]),
};

describe("StoreHandle.put keeps the D-050 layout (put then has then get)", () => {
  const made: string[] = [];
  afterAll(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });
  const scratch = (): Store => {
    const dir = mkdtempSync(path.join(tmpdir(), "hbf-store-"));
    made.push(dir);
    return new Store(dir);
  };
  const utf8 = (v: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(v));
  const files = (s: Store, dir: string): string[] => readdirSync(path.join(s.root, dir));

  it("a put build is builds/<buildHash>.json and reads back by its uri", async () => {
    const s = scratch();
    // buildHash is sha256 over the record's inputs (D-051); get refuses a record whose inputs do not hash to it.
    const rec = { format: "hbf-build-1", buildHash: sha256Hex(canonicalize({})), chase: "keys-flex-pair", target: REF, values: {}, inputs: {}, part: { bodies: [] }, slots: [] };
    const uri = await s.put("build", utf8(rec));
    expect(uri).toBe(`hbf://build/${rec.buildHash}`);
    expect(files(s, "builds")).toEqual([`${rec.buildHash}.json`]);
    expect(await s.has(uri)).toBe(true);
    expect(await s.get(uri)).toEqual(rec);
    expect(s.originOf(rec.buildHash)).toBe("keys-flex-pair");
    expect(await rejectionOf(s.put("build", utf8({ ...rec, format: "x" })))).toMatchObject({ code: "E_SCHEMA", path: "/format" });
    expect(await rejectionOf(s.put("build", new Uint8Array([1, 2, 3])))).toMatchObject({ code: "E_SCHEMA" });
  });

  it("a put mesh is meshes/<meshHash>.hbfm, not the sha256 of the bytes", async () => {
    const s = scratch();
    const bytes = encodeHbfm(tetra);
    const uri = await s.put("mesh", bytes);
    expect(uri).toBe(`hbf://mesh/${meshHash(tetra)}`);
    expect(files(s, "meshes")).toEqual([`${meshHash(tetra)}.hbfm`]);
    expect(await s.has(uri)).toBe(true);
    expect(meshHash(await s.get(uri) as MeshData)).toBe(meshHash(tetra));
    expect(await rejectionOf(s.put("mesh", new Uint8Array([9, 9, 9])))).toMatchObject({ code: "E_SCHEMA" });
  });

  it("a put report is reports/<reportHash>.json, the same uri putReport gives", async () => {
    const s = scratch();
    const row = { version: "1.0.0", verdict: "pass", severity: "block", measured: true, legal: { kind: "boolean", must: true }, constraint: "c" };
    const findings = [{ id: "CHK-PRT-03", target: { level: "body", part: "p", body: "b" }, ...row }, { id: "CHK-PRT-01", target: { level: "body", part: "p", body: "a" }, ...row }] as never[];
    const direct = s.putReport({ "CHK-PRT-01": "1.0.0", "CHK-PRT-03": "1.0.0" }, findings);
    const uri = await s.put("report", utf8(findings));
    expect(uri).toBe(direct);
    expect(await s.put("report", utf8(await s.get(uri)))).toBe(direct);
    expect(await s.has(uri)).toBe(true);
    expect(files(s, "reports")).toEqual([`${uri.slice("hbf://report/".length)}.json`]);
    expect(await rejectionOf(s.put("report", utf8({ nope: 1 })))).toMatchObject({ code: "E_SCHEMA" });
  });

  it("a put artifact keeps its extension: png by sha256, 3mf by the D-052 artifactHash", async () => {
    const s = scratch();
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const pngUri = await s.put("artifact", png);
    expect(pngUri).toBe(`hbf://artifact/${sha256Hex(png)}`);
    expect(await s.get(pngUri)).toEqual(png);
    const b = build3mf({
      title: "coin", chase: "collar-coin", buildHash: "b".repeat(64), sourceDateEpoch: 1791072000,
      filaments: [{ color: "#1a1a1a", type: "PETG" }],
      objects: [{ name: "coin", parts: [{ name: "body", slot: 1, positions: Float64Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]), indices: Uint32Array.from([0, 2, 1, 0, 1, 3, 1, 2, 3, 0, 3, 2]) }] }],
    });
    if (!("zip" in b)) throw new Error("the writer refused the coin");
    const zip = await b.zip();
    const zipUri = await s.put("artifact", zip);
    expect(zipUri).toBe(`hbf://artifact/${b.artifactHash}`);
    expect(await s.has(zipUri)).toBe(true);
    expect(await s.get(zipUri)).toEqual(zip);
    expect(files(s, "artifacts").sort()).toEqual([`${b.artifactHash}.3mf`, `${sha256Hex(png)}.png`].sort());
    expect(await rejectionOf(s.put("artifact", new Uint8Array([0, 1, 2])))).toMatchObject({ code: "E_SCHEMA" });
  });

  it("has and get agree: a stray file outside the kind's form is neither had nor read", async () => {
    const s = scratch();
    const h = "d".repeat(64);
    const uri = `hbf://build/${h}` as HbfUri;
    await s.put("artifact", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    mkdirSync(path.join(s.root, "builds"), { recursive: true });
    writeFileSync(path.join(s.root, "builds", `${h}.bin`), "x");
    expect(await s.has(uri)).toBe(false);
    expect(await rejectionOf(s.get(uri))).toMatchObject({ code: "E_HANDLE" });
  });
});

describe("hbf://check/<id> resolves from the check seed", () => {
  it("get returns the seed record; has agrees", async () => {
    const s = new Store(ROOT);
    const uri = "hbf://check/CHK-PRT-01" as HbfUri;
    expect(await s.has(uri)).toBe(true);
    expect(await s.get(uri)).toMatchObject({ kind: "check", id: "CHK-PRT-01", uri });
  });

  it("an unknown check id is E_HANDLE with near uris and a check hint, not the build hint", async () => {
    const s = new Store(ROOT);
    const uri = "hbf://check/CHK-PRT-0" as HbfUri;
    expect(await s.has(uri)).toBe(false);
    const e = await rejectionOf(s.get(uri));
    expect(e).toMatchObject({ code: "E_HANDLE" });
    expect(e?.didYouMean?.[0]).toMatch(/^hbf:\/\/check\/CHK-PRT-0\d$/);
    expect(e?.hint).not.toContain("part.build");
  });
});

describe("hashed values and open interval ends (D-206, D-225, CHECKS.md 7.1)", () => {
  it("the stored CHK-NET-02 report writes the open end as null and hashes", async () => {
    const b = await json("part.build", REF);
    const c = await json("check.run", `hbf://build/${b.r.buildHash}`, "--only", "CHK-NET-02");
    expect(c.code).toBe(0);
    const report = String(c.r.result?.["report"]);
    const file = path.join(ROOT, ".hbf", "store", "reports", `${report.slice("hbf://report/".length)}.json`);
    const text = readFileSync(file, "utf8");
    expect(text).not.toContain("Infinity");
    expect(text).toContain('"hi":null');
  }, 60_000);

  it("hashOf refuses NaN and Infinity with E_PARAM_MISSING at the value pointer", () => {
    for (const [v, at] of [[{ legal: { hi: Infinity } }, "/legal/hi"], [{ a: [0, NaN] }, "/a/1"]] as const) {
      let thrown: unknown;
      try {
        hashOf(v);
      } catch (e) {
        thrown = e;
      }
      expect(isThrownCommandError(thrown) ? [thrown.hbf.code, thrown.hbf.path] : thrown).toEqual(["E_PARAM_MISSING", at]);
    }
    expect(hashOf({ hi: null, lo: 0.6 })).toBe(hashOf({ lo: 0.6, hi: null }));
  });

  it("an open interval end prints as at least or at most", () => {
    expect(legalText({ kind: "interval", lo: 0.6, hi: null, unit: "mm", nearest: 0.75 })).toBe("at least 0.60 mm, nearest 0.75");
    expect(legalText({ kind: "interval", lo: null, hi: 2, unit: "mm", nearest: 2 })).toBe("at most 2 mm, nearest 2");
    expect(legalText({ kind: "interval", lo: 0, hi: 2, unit: "mm", nearest: 1 })).toBe("0 to 2 mm, nearest 1");
  });
});
