// The share decoder of M09-T04 with the chase package's options (D-167;
// M10-T03 step 5): a `#d=1.` link of the handoff template migrates through
// 1-to-2 and loads as schema 2, and an unprefixed PIP legacy save loads
// through designs/pip/migrate/legacy.ts. bindChase (M10-T06) passes the
// same shareOptions into decodeShare in the bench.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { shareOptions } from "@hackbuild/chase";
import type { Chase } from "@hackbuild/spec";
import { decodeShare, encodeShare } from "../../src/bench/share.js";
import { legacy } from "../../../../designs/pip/migrate/legacy.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const read = (...p: string[]): string => readFileSync(path.join(ROOT, ...p), "utf8");

describe("decodeShare with packages/chase migrate", () => {
  it("loads a #d=1. link of the handoff template as schema 2", async () => {
    const hash = await encodeShare(read("packages", "chase", "test", "fixtures", "v1", "_template.chase.json"), 1);
    expect(hash.startsWith("#d=1.")).toBe(true);
    const got = await decodeShare(hash, shareOptions());
    expect(got?.ok).toBe(true);
    if (got?.ok !== true) return;
    const c = got.design as Chase;
    expect([got.version, c.meta.chase, c.meta.machines, c.meta.license]).toEqual([1, 2, ["ffc5p"], "CC-BY-SA-4.0"]);
  });
  it("loads an unprefixed PIP legacy save through designs/pip/migrate/legacy.ts", async () => {
    const text = read("designs", "pip", "test", "fixtures", "legacy", "pip-stick-design.json");
    const prefixed = await encodeShare(text, 0);
    const hash = `#d=${prefixed.slice(prefixed.indexOf(".") + 1)}`;
    const got = await decodeShare(hash, shareOptions({ legacy }));
    expect(got).toMatchObject({ ok: true, version: "legacy", design: { app: "pip", legacy: { app: "pip-bench", v: 1 } } });
  });
  it("refuses an unprefixed link when the design reads no legacy saves", async () => {
    const prefixed = await encodeShare(read("designs", "pip", "test", "fixtures", "legacy", "pip-design.json"), 0);
    const got = await decodeShare(`#d=${prefixed.slice(prefixed.indexOf(".") + 1)}`, shareOptions());
    expect(got).toMatchObject({ ok: false, error: { code: "E_SCHEMA", record: "share-link/legacy" } });
  });
});
