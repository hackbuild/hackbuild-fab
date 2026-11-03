// designs/bail: the chase read the way every command reads it, and each of
// the 8 presets built through the hbf CLI (core/bin/hbf.mjs part.build: the
// sandbox, the stage runner and every registered check). A design may not
// import core (tools/tiers.json), so the build runs are the commands
// themselves. The draft numbers, the warnings and the catalog rows are held
// in draft.test.ts and catalog.test.ts.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { readChaseSource, validateDocument } from "@hackbuild/chase";
import { artDocumentUri } from "@hackbuild/spec";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DESIGN = "designs/bail";
const HBF = path.join(ROOT, "core", "bin", "hbf.mjs");
const read = (...p: string[]): string => readFileSync(path.join(ROOT, ...p), "utf8");
const { chase } = readChaseSource(read(DESIGN, "chase.ts"), `${DESIGN}/chase.ts`);
const PRESETS = ["heatsync", "hackbuild", "scope", "trace", "mesa", "concho", "monogram", "custom"] as const;

interface Finding { readonly id: string; readonly verdict: string; readonly measured?: unknown }
interface BuildOut {
  readonly ok: boolean;
  readonly findings: readonly Finding[];
  readonly errors: readonly { readonly code: string; readonly path?: string; readonly hint?: string }[];
  readonly result?: { readonly warnings: readonly { readonly code: string; readonly text: string }[]; readonly ir: { readonly bodies: readonly { readonly id: string }[] } };
}

function build(args: readonly string[]): BuildOut {
  const run = spawnSync(process.execPath, [HBF, "part.build", DESIGN, "--detail", "full", ...args, "--json"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, SOURCE_DATE_EPOCH: "315532800" }, maxBuffer: 1 << 28 });
  if (run.stdout === "") throw new Error(`part.build wrote nothing: ${run.stderr}`);
  return JSON.parse(run.stdout) as BuildOut;
}
const fails = (b: BuildOut): string[] => b.findings.filter((f) => f.verdict === "fail").map((f) => `${f.id} ${String(f.measured)}`);

describe("bail chase", () => {
  test("validates with 0 errors through packages/chase validate.ts", () => {
    const v = validateDocument({ chase, buildSource: read(DESIGN, "build.ts") });
    expect(v.errors).toEqual([]);
    expect(chase.meta).toMatchObject({ id: "bail", kind: "single", machines: ["ffc5p"] });
  });

  test("presets are values: each carries an art document addressed by its own uri, and the slot 4 material is TPU", () => {
    expect(PRESETS).toEqual(["heatsync", "hackbuild", "scope", "trace", "mesa", "concho", "monogram", "custom"]);
    expect(chase.materials.find((m) => m.slot === 4)?.material).toBe("tpu95");
    for (const pr of chase.presets ?? []) {
      const art = pr.params["art"] as { readonly uri: string; readonly doc: Parameters<typeof artDocumentUri>[0] };
      expect(art.uri, pr.id).toBe(artDocumentUri(art.doc));
    }
  });
});

describe("bail builds", () => {
  test.each(PRESETS)("preset %s builds with 0 failing checks", (id) => {
    const b = build(["--preset", id]);
    expect(b.errors).toEqual([]);
    expect(fails(b)).toEqual([]);
  }, 180000);
});
