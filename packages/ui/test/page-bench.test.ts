// pageBench (D-264): a fab bake's page build becomes the bench build and
// the 3mf, stl and card writers. The build's report carries the page
// build's checks and metrics with triangle count and size computed from
// its meshes; a writer whose package checks hold a blocking fail refuses
// with the export gate's line and writes nothing.

import { describe, expect, it } from "vitest";
import type { CheckResult, Part } from "@hackbuild/spec";
import { pageBench, pageOf, type PageBuildLike } from "../src/bench/entry.js";

const fail = (id: string, severity: CheckResult["severity"]): CheckResult => ({
  id, version: "1", severity, verdict: "fail", target: { level: "part", part: "p" }, measured: 1, legal: { kind: "none" }, constraint: "c", origin: `hbf://check/${id}`,
} as unknown as CheckResult);

function fake(packageResults: readonly CheckResult[]): PageBuildLike & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    facts: { name: "flex-pair" },
    build: async () => ({
      buildHash: "h1", part: { id: "p", bodies: [] } as unknown as Part, metrics: [], results: [], warnings: [],
      meshes: { pad: { positions: [0, 0, 0, 10, 0, 0, 0, 4, 2], triangles: [0, 1, 2] } },
    }),
    exportFile: async (kind, hash) => {
      asked.push(`${kind} ${hash}`);
      return { name: `flex-pair.${kind}`, media: "model/3mf", bytes: new Uint8Array([1, 2, 3]), results: packageResults };
    },
  };
}

describe("pageBench", () => {
  it("builds through the page build and sizes the meshes", async () => {
    const { build } = pageBench(fake([]));
    const out = await build!({});
    expect(out.buildHash).toBe("h1");
    expect(out.report.tris).toBe(1);
    expect(out.report.dims).toEqual([10, 4, 2]);
  });

  it("writes 3mf, stl and card from the build the export runs on", async () => {
    const page = fake([]);
    const { writers } = pageBench(page);
    expect(Object.keys(writers ?? {}).sort()).toEqual(["3mf", "card", "stl"]);
    expect(writers?.["3mf"]?.file).toBe("flex-pair.3mf");
    const r = { buildHash: "h1" } as Parameters<NonNullable<typeof writers>[string]["write"]>[0];
    const got = await writers!["3mf"]!.write(r);
    expect(got.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(page.asked).toEqual(["3mf h1"]);
  });

  it("refuses a package with a blocking fail and passes a warn-only fail", async () => {
    const r = { buildHash: "h1" } as Parameters<NonNullable<ReturnType<typeof pageBench>["writers"]>[string]["write"]>[0];
    const blocked = pageBench(fake([fail("CHK-3MF-07", "block")])).writers!["3mf"]!;
    await expect(blocked.write(r)).rejects.toThrow("3mf export refused: CHK-3MF-07 failed. fix the finding, then export.");
    const warned = pageBench(fake([fail("CHK-3MF-06", "warn")])).writers!["3mf"]!;
    await expect(warned.write(r)).resolves.toMatchObject({ bytes: new Uint8Array([1, 2, 3]) });
  });

  it("gives nothing when the page carries no build", () => {
    expect(pageBench(pageOf("HbfAbsentBuild"))).toEqual({});
  });
});
