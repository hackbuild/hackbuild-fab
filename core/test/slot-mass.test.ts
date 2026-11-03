// part.build parts[].slots: per filament slot, the summed body volume and its
// grams at the slot material's profile density, every figure computed, the
// density's tier carried beside it.

import { describe, expect, it } from "vitest";
import type { CommandResult, PartSummary } from "@hackbuild/spec";
import { main } from "../src/main.js";
import { ROOT } from "./hbf.js";

async function build(design: string): Promise<CommandResult<{ parts: PartSummary[]; ir: { bodies: { slot: number; mesh: { volumeMm3: number } }[] } }>> {
  let out = "";
  await main(["part.build", design, "--detail", "full", "--json"], ROOT, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; } });
  return JSON.parse(out) as CommandResult<{ parts: PartSummary[]; ir: { bodies: { slot: number; mesh: { volumeMm3: number } }[] } }>;
}

describe("part.build slot masses", () => {
  it("sum each slot's body volumes and weigh them at the profile density", async () => {
    const r = await build("designs/sprue");
    const slots = r.result!.parts[0]!.slots!;
    expect(slots.length).toBeGreaterThan(1);
    for (const s of slots) {
      const vol = r.result!.ir.bodies.filter((b) => b.slot === s.slot).reduce((n, b) => n + b.mesh.volumeMm3, 0);
      expect(s.volumeMm3).toBeCloseTo(vol, 2);
      expect(s.densityGcm3).toBeGreaterThan(0);
      expect(s.massG).toBeCloseTo((s.volumeMm3 / 1000) * s.densityGcm3!, 2);
      expect(typeof s.densityTier).toBe("string");
    }
  }, 120_000);
});
