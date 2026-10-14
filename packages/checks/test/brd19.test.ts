// M08-T09 CHK-BRD-19 lead landing on SHUNT R1. Every input comes from a
// committed file the check does not write: the parts, pads and placements
// from reference/boards/shunt-art/board.json, the model leads from
// models.json (wrl.py through tools/py/board/model_leads.py, equal to the
// leads SHUNT build_sim.py inlined into packages/board/seed/fixtures/
// shunt-r1-sim.html), the allowance from allow.json. The expected counts
// are check3d_shunt.mjs's recorded output (M08 card, M-1-T10): 55 landings
// at 0.000 mm, 4 within the declared allowance, 3 declared stand-ins, 28
// parts, 10 real models.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Assembly, BoardRecord, CheckResult, KernelId, Part } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, registerChecks, runRegistry, type LandingInput } from "../src/index";

const ROOT = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");
const seed = JSON.parse(read("packages/checks/seed/checks.seed.json")) as unknown;
const def = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).find((d) => d.id === "CHK-BRD-19")!;

interface Pad { n: string; x: number; y: number; w: number; h: number; drill: number | null; thru: boolean }
interface BPart { ref: string; x: number; y: number; rot: number; model: string; stand_in: boolean; bw0: number; bh0: number; cx: number; cy: number; pads: Pad[] }
const board = JSON.parse(read("reference/boards/shunt-art/board.json")) as { parts: BPart[] };
const models = (JSON.parse(read("reference/boards/shunt-art/models.json")) as { models: LandingInput["models"] }).models;
const allow = JSON.parse(read("reference/boards/shunt-art/allow.json")) as LandingInput["allow"];

function recordOf(parts: readonly BPart[]): BoardRecord {
  return {
    parts: parts.map((p) => ({ ref: p.ref, body: { w: p.bw0, h: p.bh0, z: 0 }, x: p.cx, y: p.cy, ...(p.stand_in ? { model: { standIn: true, reason: "stand-in" } } : { model: { uri: p.model, standIn: false } }) })),
    pads: parts.flatMap((p) => p.pads.map((q) => ({ ref: p.ref, pin: q.n, x: q.x, y: q.y, through: q.thru }))),
  } as unknown as BoardRecord;
}

async function run(parts: readonly BPart[], landing: LandingInput): Promise<CheckResult> {
  const part = { id: "shunt-art", board: recordOf(parts) } as unknown as Part;
  const assembly = { id: "shunt-art", parts: [part] } as unknown as Assembly;
  const out = await runRegistry([def], {
    kernels: new Set<KernelId>(["board", "profile"]), targets: { assemblies: [assembly] },
    views: { board: { landing: () => landing } },
    ctx: { profile: createProfileLookup(loadProfile()), machine: "", whitelist: new Map() },
  });
  return out.results[0]!;
}

const placements = (parts: readonly BPart[]): LandingInput["placements"] =>
  Object.fromEntries(parts.map((p) => [p.ref, { x: p.x, y: p.y, rot: p.rot, model: p.model }]));

describe("CHK-BRD-19 on SHUNT R1", () => {
  test("55 landings at 0.000 mm, 4 within the allowance, 3 stand-ins, 28 parts, 10 real models", async () => {
    const r = await run(board.parts, { placements: placements(board.parts), models, allow });
    expect(r.verdict).toBe("pass");
    expect(r.constraint).toBe("lead landings 55 at 0.000 mm, 4 within the declared allowance, 3 declared stand-ins, 28 parts, 10 real models");
  });

  test("a through-hole part rotated by 90 degrees fails naming the part and the landing distance", async () => {
    const rotated = board.parts.map((p) => (p.ref === "U1" ? { ...p, rot: 90 } : p));
    const r = await run(rotated, { placements: placements(rotated), models, allow });
    expect(r.verdict).toBe("fail");
    expect(r.constraint).toMatch(/^U1: lead lands \d+\.\d{3} mm from the nearest through pad/);
    expect(Number(r.measured)).toBeGreaterThan(0.01);
  });

  test("without the declared allowance SW2's formed leads fail, worst 0.112 mm", async () => {
    // allow.json: leads formed at x -0.088 and 6.388 against pads at 0 and 6.5
    const r = await run(board.parts, { placements: placements(board.parts), models, allow: {} });
    expect(r.verdict).toBe("fail");
    expect(r.constraint).toMatch(/^SW2: lead lands 0\.088 mm from the nearest through pad/);
    expect(Number(r.measured)).toBeCloseTo(0.112, 3);
  });

  test("a header missing one through pad fails on the lead count", async () => {
    const short = board.parts.map((p) => (p.ref === "J3" ? { ...p, pads: p.pads.slice(1) } : p));
    const r = await run(short, { placements: placements(short), models, allow });
    expect(r.verdict).toBe("fail");
    expect(r.constraint).toMatch(/^J3: model recovered 15 leads, the record holds 14 through pads/);
  });

  test("a part with no model that is not a declared stand-in fails", async () => {
    const r = await run(board.parts, { placements: placements(board.parts), models: Object.fromEntries(Object.entries(models).filter(([k]) => k !== "LED_D5.0mm")), allow });
    expect(r.verdict).toBe("fail");
    expect(r.constraint).toMatch(/^D1: no model and not declared a stand-in/);
  });
});
