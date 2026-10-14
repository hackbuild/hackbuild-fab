// The status line of the sim commands (M02 report, T11 defect): it printed
// 0 fail 0 warn 0 pass 0 skip while the body reported a verdict. The
// expected lines are the committed golden goldens/sim-status.json, written
// from each scene's oracle or record, never from what the command printed.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hbf, ROOT } from "./hbf.js";

interface Case { argv: string[]; exit: number; status: string }
const golden = JSON.parse(readFileSync(path.join(ROOT, "core", "test", "goldens", "sim-status.json"), "utf8")) as { cases: Case[] };

describe("sim status line", () => {
  it.each(golden.cases.map((c) => [c.argv.join(" "), c] as const))("%s", async (_name, c) => {
    const { code, out } = await hbf(c.argv);
    expect(code).toBe(c.exit);
    expect(out.split("\n")[0]).toBe(c.status);
  }, 120_000);
});
