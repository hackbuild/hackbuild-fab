// hbf slice (build mode, D-667): the command wraps tools/slice/slice.mjs and
// returns a CommandResult. It never opens the export gate. The 3MF stem of a
// design without a preset is "defaults", never "undefined". The live case
// needs the Flash Studio executable and is skipped without it. With analyze
// on (the default), print summarizes the G-code, every figure computed, and
// SLC-FOREIGN grades from the analysis instead of reporting not run.

import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CommandResult } from "@hackbuild/spec";
import { main } from "../src/main.js";
import { ROOT } from "./hbf.js";

const FLASH = "/Applications/Flash Studio.app";

type Sliced = { status: string; reason: string; outDir: string; gcode: unknown; profileChecks: { id: string; verdict: string }[]; print: { status: string; qualifier?: string; layers?: number; totalG?: number; report?: string } | null };

async function slice(...argv: string[]): Promise<{ code: number; r: CommandResult<Sliced> }> {
  let out = "";
  const code = await main(["slice", ...argv, "--json"], ROOT, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; } });
  return { code, r: JSON.parse(out) as CommandResult<Sliced> };
}

describe("hbf slice", () => {
  it("refuses a target that does not exist as E_REF", async () => {
    const { code, r } = await slice("designs/no-such-design");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/target" });
  });

  it.skipIf(!existsSync(FLASH))("names the 3mf of a design without a preset from defaults and reports a status", async () => {
    const { r } = await slice("reference/keys/flex-pair");
    expect(["sliced", "failed", "not run"]).toContain(r.result!.status);
    expect(r.errors).toEqual([]);
    const files = readdirSync(r.result!.outDir);
    expect(files).toContain("flex-pair-defaults.3mf");
    expect(files.some((f) => f.includes("undefined"))).toBe(false);
  }, 180_000);

  it.skipIf(!existsSync(FLASH))("summarizes the virtual print of sprue from its G-code and grades SLC-FOREIGN", async () => {
    const { r } = await slice("designs/sprue");
    expect(r.result!.status).toBe("sliced");
    const p = r.result!.print;
    expect(p?.status).toBe("analyzed");
    expect(p?.qualifier).toBe("computed");
    expect(p?.layers).toBeGreaterThan(0);
    expect(p?.totalG).toBeGreaterThan(0);
    expect(existsSync(p?.report ?? "")).toBe(true);
    expect(r.result!.profileChecks.find((c) => c.id === "SLC-FOREIGN")?.verdict).not.toBe("not run");
  }, 300_000);
});
