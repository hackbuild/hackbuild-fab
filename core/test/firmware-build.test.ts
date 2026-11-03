// hbf firmware.build (build mode, D-667): compile a sketch with arduino-cli,
// found through registry/runners.json, into a temporary folder; nothing is
// uploaded. The live cases need arduino-cli and the rp2040 core and skip
// without them.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CommandResult } from "@hackbuild/spec";
import { main } from "../src/main.js";
import { ROOT } from "./hbf.js";

type Built = { status: string; reason: string; runner: string; images: { path: string; bytes: number }[]; sections: { name: string; size: number }[] };

const hasRp2040 = ((): boolean => {
  try {
    return execFileSync("arduino-cli", ["core", "list"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).includes("rp2040:rp2040");
  } catch {
    return false;
  }
})();

async function build(...argv: string[]): Promise<{ code: number; r: CommandResult<Built> }> {
  let out = "";
  const code = await main(["firmware.build", ...argv, "--json"], ROOT, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; } });
  return { code, r: JSON.parse(out) as CommandResult<Built> };
}

describe("hbf firmware.build", () => {
  it("refuses a folder with no sketch of its name as E_REF", async () => {
    const { code, r } = await build("designs/bail", "--fqbn", "rp2040:rp2040:rpipico");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/sketch" });
  });

  it.skipIf(!hasRp2040)("builds the exit B probe for a Pico into a temporary folder, a uf2 among the images", async () => {
    const { r } = await build("tools/skeleton/flexpair_probe", "--fqbn", "rp2040:rp2040:rpipico");
    expect(r.result!.status).toBe("built");
    expect(r.result!.runner).toMatch(/^arduino-cli /);
    const uf2 = r.result!.images.find((i) => i.path.endsWith(".uf2"));
    expect(uf2?.bytes).toBeGreaterThan(0);
    expect(existsSync(uf2!.path)).toBe(true);
    expect(r.result!.sections.find((s) => s.name === "text")?.size).toBeGreaterThan(0);
  }, 600_000);

  it.skipIf(!hasRp2040)("fails a board whose platform is not installed with arduino-cli's reason", async () => {
    const { r } = await build("tools/skeleton/flexpair_probe", "--fqbn", "nope:nope:nope");
    expect(r.result!.status).toBe("failed");
    expect(r.result!.reason).toMatch(/not found|not installed/);
  }, 120_000);
});
