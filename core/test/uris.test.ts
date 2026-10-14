// Every hbf:// uri of the M04-T08 addressing table resolves for the keys
// flex-pair reference build through `hbf explain <uri>` (AGENT-SURFACE.md
// 5.1), and an unknown id in each namespace is E_HANDLE, exit 2, with near
// uris where the namespace is static. Expected values come from sources the
// resolver does not write: the committed goldens under expected/, the check
// seed, the profile data files, the knowledge files and the coin-inlay
// README's covers line. A collected build names its chase, and next holds
// part.build for it (D-050).

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { canonicalize, sha256Hex, type BuildInputs, type CommandResult } from "@hackbuild/spec";
import { Store, type BuildRecord } from "../src/store.js";
import { REF, ROOT, json } from "./hbf.js";

const readJson = (rel: string): unknown => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
const GOLDEN = readJson(`${REF}/expected/build.json`) as { buildHash: string; inputs: BuildInputs; meshHashes: Record<string, string> | string[] };
const goldenMeshes = (): string[] => (Array.isArray(GOLDEN.meshHashes) ? GOLDEN.meshHashes : Object.values(GOLDEN.meshHashes));

type Resolved = { uri: string; namespace: string; value: Record<string, unknown> };

async function resolve(uri: string): Promise<Resolved> {
  const { code, r } = await json("explain", uri);
  if (code !== 0) throw new Error(`explain ${uri} exited ${code}: ${JSON.stringify((r as CommandResult<unknown>).errors)}`);
  return r as unknown as Resolved;
}

async function refused(uri: string): Promise<{ code: number; e: NonNullable<CommandResult<unknown>["errors"][number]>; next: CommandResult<unknown>["next"] }> {
  const { code, r } = await json("explain", uri);
  return { code, e: r.errors[0]!, next: r.next };
}

let buildHash = "";
let report = "";
let partId = "";

beforeAll(async () => {
  const b = await json("part.build", REF);
  expect(b.code).toBe(0);
  buildHash = b.r.buildHash!;
  const c = await json("check.run", `hbf://build/${buildHash}`);
  report = String(c.r.result?.["report"]);
  partId = (new Store(ROOT).build(`hbf://build/${buildHash}`)).part.id;
}, 120_000);

describe("every row of the addressing table resolves for the flex-pair build", () => {
  it("hbf://build/<h> is the record of the golden build: same buildHash, same BuildInputs", async () => {
    expect(buildHash).toBe(GOLDEN.buildHash);
    const r = await resolve(`hbf://build/${buildHash}`);
    expect(r.namespace).toBe("build");
    expect(r.value["buildHash"]).toBe(GOLDEN.buildHash);
    expect(r.value["inputs"]).toEqual(GOLDEN.inputs);
    expect(r.value["contentHash"]).toBeUndefined();
  });

  it("hbf://build/<h>/part/<partId> is that build's part, its body meshes the golden mesh hashes", async () => {
    const r = await resolve(`hbf://build/${buildHash}/part/${partId}`);
    expect(r.value["build"]).toBe(`hbf://build/${GOLDEN.buildHash}`);
    expect(r.value["chase"]).toBe("keys-flex-pair");
    const part = r.value["part"] as { id: string; buildHash: string; bodies: { mesh: { hash: string } }[] };
    expect(part.id).toBe(partId);
    expect(part.buildHash).toBe(GOLDEN.buildHash);
    expect(part.bodies.length).toBeGreaterThan(0);
    for (const b of part.bodies) expect(goldenMeshes()).toContain(b.mesh.hash);
  });

  it("hbf://mesh/<h> and hbf://report/<h> resolve; the report holds the run's checks and findings", async () => {
    const mesh = goldenMeshes()[0]!;
    expect((await resolve(`hbf://mesh/${mesh}`)).value["meshHash"]).toBe(mesh);
    const r = await resolve(report);
    expect(r.value["reportHash"]).toBe(report.slice("hbf://report/".length));
    const findings = r.value["findings"] as { id: string }[];
    for (const f of findings) expect(Object.keys(r.value["checks"] as object)).toContain(f.id);
  });

  it("hbf://check/<id> is the seeded row", async () => {
    const seed = (readJson("packages/checks/seed/checks.seed.json") as { checks: { id: string; version: string; title: string; severity: string }[] }).checks;
    const row = seed.find((c) => c.id === "CHK-PRT-01")!;
    const r = await resolve("hbf://check/CHK-PRT-01");
    expect(r.value).toMatchObject({ id: row.id, version: row.version, title: row.title, severity: row.severity });
  });

  it("hbf://feature-kind/<kind> serves schema, stages, checks, fit and references for every kind the build declares", async () => {
    const rec = new Store(ROOT).build(`hbf://build/${buildHash}`) as BuildRecord;
    const kinds = [...new Set(rec.part.features.map((f) => f.kind as string))];
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      const v = (await resolve(`hbf://feature-kind/${kind}`)).value as { kind: string; schema: { vendor: string }; stages: string[]; checks: string[]; fit: string; reference: string[] };
      expect(v.kind).toBe(kind);
      expect(v.schema.vendor.length).toBeGreaterThan(0);
      expect(v.checks.length).toBeGreaterThan(0);
      expect(["none", "per-feature"]).toContain(v.fit);
      // Only chamfer and round may emit stage 2 (D-047); none of the flex-pair kinds is either.
      expect(v.stages).not.toContain("preUnionCutters");
      expect(v.stages).toContain("postUnionCutters");
      for (const ref of v.reference) expect(existsSync(path.join(ROOT, "reference", ref)), `${kind} reference ${ref}`).toBe(true);
    }
  });

  it("hbf://feature-kind/inlay carries the checks its reference README says it covers", async () => {
    const readme = readFileSync(path.join(ROOT, "reference/cosmetic/coin-inlay/README.md"), "utf8");
    const covers = /^covers: \[(.*)\]$/m.exec(readme)![1]!.split(",").map((s) => s.trim().replace(/'/g, "")).filter((s) => s.startsWith("CHK-"));
    const v = (await resolve("hbf://feature-kind/inlay")).value as { checks: string[]; reference: string[]; fit: string };
    expect([...v.checks].sort()).toEqual(covers.sort());
    expect(v.reference).toEqual(["cosmetic/coin-inlay"]);
    expect(v.fit).toBe("none");
  });

  it("hbf://profile/<table>/<id> is the data file row with provenance, at the profileHash of that one read", async () => {
    const cases = [
      ["material", "petg", (readJson("packages/profile/data/materials.json") as { materials: { id: string }[] }).materials.find((m) => m.id === "petg")],
      ["machine", "ffc5p", (readJson("packages/profile/data/machines.json") as { machines: { id: string }[] }).machines.find((m) => m.id === "ffc5p")],
      ["fit", "SLIDE", (readJson("packages/profile/data/fits.json") as { fits: { class: string }[] }).fits.find((f) => f.class === "SLIDE")],
    ] as const;
    for (const [table, id, fileRow] of cases) {
      expect(fileRow, `${table} ${id} in the data file`).toBeDefined();
      const v = (await resolve(`hbf://profile/${table}/${id}`)).value as { row: Record<string, unknown>; provenance: { tier: string }; profileHash: string };
      expect(v.row).toMatchObject(fileRow as Record<string, unknown>);
      expect(v.provenance).toEqual((fileRow as unknown as { provenance: unknown }).provenance);
      expect(typeof v.provenance.tier).toBe("string");
      // profileHash is sha256 over the canonical read set (D-051), here one row.
      expect(v.profileHash).toBe(sha256Hex(canonicalize([{ table, id, row: v.row }])));
    }
  });

  it("hbf://knowledge/<record> is the file's text", async () => {
    const v = (await resolve("hbf://knowledge/kernels/verification")).value;
    expect(v["text"]).toBe(readFileSync(path.join(ROOT, "knowledge/kernels/verification.md"), "utf8"));
    expect(v["path"]).toBe("knowledge/kernels/verification.md");
  });

  // Other test files build the flex pair with other params in the same store, so the newest build and report lines may be theirs.
  it("hbf://project/graph is the project graph, holding the flex-pair build and report the store wrote (M04-T09)", async () => {
    const r = await resolve("hbf://project/graph");
    expect(r.namespace).toBe("project");
    const items = r.value["items"] as { id: string; hash: string; uri: string }[];
    expect(items.find((i) => i.id === `build:${REF}`)?.uri).toMatch(/^hbf:\/\/build\/[0-9a-f]{64}$/);
    expect(items.find((i) => i.id === `report:${REF}`)?.uri).toMatch(/^hbf:\/\/report\/[0-9a-f]{64}$/);
    expect(Array.isArray(r.value["stale"])).toBe(true);
  });
});

describe("an unknown id in each namespace is E_HANDLE, exit 2", () => {
  it("static namespaces carry near uris in didYouMean", async () => {
    const cases: readonly [string, string][] = [
      ["hbf://check/CHK-PRT-0", "hbf://check/CHK-PRT-01"],
      ["hbf://feature-kind/pockt", "hbf://feature-kind/pocket"],
      ["hbf://profile/material/petgg", "hbf://profile/material/petg"],
      ["hbf://profile/machine/ffc5", "hbf://profile/machine/ffc5p"],
      ["hbf://profile/fit/SLID", "hbf://profile/fit/SLIDE"],
      ["hbf://knowledge/kernels/verificaton", "hbf://knowledge/kernels/verification"],
    ];
    for (const [uri, near] of cases) {
      const { code, e } = await refused(uri);
      expect([code, e.code], uri).toEqual([2, "E_HANDLE"]);
      expect(e.didYouMean, uri).toContain(near);
    }
  });

  it("an unknown part of a stored build names the part it holds", async () => {
    const { code, e } = await refused(`hbf://build/${buildHash}/part/nope`);
    expect([code, e.code]).toEqual([2, "E_HANDLE"]);
    expect(e.didYouMean).toEqual([`hbf://build/${buildHash}/part/${partId}`]);
  });

  it("store hashes the store never held are E_HANDLE with no near ids", async () => {
    for (const ns of ["build", "mesh", "report", "artifact"]) {
      const { code, e } = await refused(`hbf://${ns}/${"0".repeat(64)}`);
      expect([code, e.code], ns).toEqual([2, "E_HANDLE"]);
      expect(e.didYouMean, ns).toBeUndefined();
    }
  });

  it("a collected build is E_HANDLE with chase set and part.build for that chase in next", async () => {
    const store = new Store(ROOT);
    // A record of its own, so no other test's build is collected under it.
    const inputs = { ...GOLDEN.inputs, seed: Number.parseInt(randomUUID().slice(0, 8), 16) };
    const h = sha256Hex(canonicalize(inputs));
    const rec = { ...(store.build(`hbf://build/${buildHash}`) as BuildRecord), buildHash: h, inputs };
    const uri = await store.put("build", new TextEncoder().encode(JSON.stringify(rec)));
    expect((await resolve(uri)).value["buildHash"]).toBe(h);
    rmSync(path.join(store.root, "builds", `${h}.json`));
    for (const argv of [["explain", uri], ["part.inspect", uri]]) {
      const { code, r } = await json(...argv);
      expect(code, argv[0]).toBe(2);
      expect(r.errors[0], argv[0]).toMatchObject({ code: "E_HANDLE", chase: "keys-flex-pair" });
      expect(r.next[0], argv[0]).toMatchObject({ command: "part.build", args: { chase: "keys-flex-pair" } });
    }
  });
});
