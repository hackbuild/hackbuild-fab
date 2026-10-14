// M07-T14: nest.pack, motion.run and the sheet and plate exports through
// the CLI, in process. Expected values come from sources this code did not
// write: the committed goldens of reference/sheet/slug-sheets and
// reference/sheet/ogee16-r16p-plates (layoutHash, sheet counts), the DXF
// and SVG files nest's own test holds byte for byte
// (packages/nest/test/out), the M07-T01 motion records, the M07-T04
// fixture and the card's acceptance numbers. The gate runs on injected
// streams: isTTY false is a pipe, true with y on input is a person.

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import type { CheckResult, CommandResult } from "@hackbuild/spec";
import { COMMAND_GROUP } from "@hackbuild/spec";
import { CLI_FORM, COMMANDS } from "../src/registry.js";
import { EXPORT_KINDS } from "../src/commands/export-run.js";
import type { GateStreams } from "../src/tty-gate.js";
import { ROOT, hbf } from "./hbf.js";

/** The SLUG page's baked outline names, read by the scene from the pinned page (loaded by path, as core loads scenes). */
const SCENE = pathToFileURL(path.join(ROOT, "packages", "nest", "scenes", "slug-sheets.ts")).href;
const slugIds = async (): Promise<string[]> => Object.keys(((await import(SCENE)) as { slugPage(): { OUTLINES: Record<string, unknown> } }).slugPage().OUTLINES);

const tmp = mkdtempSync(path.join(tmpdir(), "hbf-m07-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const read = (rel: string): string => readFileSync(path.join(ROOT, rel), "utf8");
const golden = <T>(rel: string): T => JSON.parse(read(rel)) as T;

type R = Omit<CommandResult<Record<string, unknown>>, "result" | "errors"> & {
  result: Record<string, unknown>;
  errors: { code: string; path?: string; personRuns?: string; didYouMean?: string[] }[];
};

/** Gate streams: a pipe (tty false), or a terminal answering `answer`. */
function streams(tty: boolean, answer = ""): GateStreams & { said: () => string } {
  const input = Object.assign(new PassThrough(), { isTTY: tty });
  const output = Object.assign(new PassThrough(), { isTTY: tty });
  let said = "";
  output.on("data", (b: Buffer) => { said += b.toString(); });
  if (answer !== "") input.end(answer);
  return { input, output, said: () => said };
}

async function run(argv: readonly string[], gate: GateStreams = streams(false)): Promise<{ code: number; r: R }> {
  const { code, out } = await hbf([...argv, "--json"], { gate });
  return { code, r: JSON.parse(out) as R };
}

const findings = (r: R, id: string): CheckResult[] => r.findings.filter((f) => f.id === id);

describe("registration (M07-T14 steps 1 to 3)", () => {
  it("nest.pack is in group make and motion.run in group prove, each with a CLI form", () => {
    expect(COMMANDS.find((c) => c.name === "nest.pack")?.group).toBe(COMMAND_GROUP["nest.pack"]);
    expect(COMMAND_GROUP["nest.pack"]).toBe("make");
    expect(COMMANDS.find((c) => c.name === "motion.run")?.group).toBe(COMMAND_GROUP["motion.run"]);
    expect(COMMAND_GROUP["motion.run"]).toBe("prove");
    expect(COMMANDS.find((c) => c.name === "nest.pack")?.writes).toBe("nothing");
    expect(CLI_FORM["motion.run"]?.rest).toBe("args");
    expect(CLI_FORM["nest.pack"]?.flags["kerf-mode"]?.field).toBe("kerfMode");
  });

  // The board and wiring exporters (M08) register in the same list; this
  // test holds the sheet pair and 3mf, once each.
  it("export.run registers dxf and svg-cut beside 3mf", () => {
    expect(EXPORT_KINDS).toEqual(expect.arrayContaining(["3mf", "dxf", "svg-cut"]));
    expect(new Set(EXPORT_KINDS).size).toBe(EXPORT_KINDS.length);
  });
});

describe("nest.pack (computed)", () => {
  it("slug-sheets in legacy-shelf mode: exit 0, 10 sheets, the reference layoutHash, every CHK-SHT finding passing", async () => {
    const want = golden<{ legacyShelf: { sheets: number; layoutHash: string; perSheet: { name: string }[] } }>("reference/sheet/slug-sheets/expected/layout.json").legacyShelf;
    const { code, r } = await run(["nest.pack", "--scene", "slug-sheets", "--mode", "legacy-shelf"]);
    expect(code).toBe(0);
    const layout = r.result["layout"] as { sheets: number; layoutHash: string };
    expect(layout.sheets).toBe(10);
    expect(layout.sheets).toBe(want.sheets);
    expect(layout.layoutHash).toBe(want.layoutHash);
    expect(r.result["names"]).toEqual(want.perSheet.map((s) => s.name));
    expect(r.counts.fail).toBe(0);
    expect(r.counts.pass).toBeGreaterThan(0);
  });

  it("severed-deck: exit 1, CHK-SHT-01 fails on the deck (extra.pieces 2, legal one connected profile), nothing placed", async () => {
    const { code, r } = await run(["nest.pack", "--scene", "severed-deck"]);
    expect(code).toBe(1);
    expect(r.verdict).toBe("fail");
    const [f, ...rest] = findings(r, "CHK-SHT-01").filter((x) => x.verdict === "fail");
    expect(rest).toEqual([]);
    expect(f).toMatchObject({ severity: "block", measured: false, legal: { kind: "boolean", must: true }, extra: { pieces: 2 }, target: { level: "sheet", sheet: "severed-deck-unplaced", part: "deck" } });
    expect(f!.constraint).toContain("2 pieces, legal 1");
    expect(r.result["layout"]).toBeNull();
    expect(r.result["refused"]).toEqual(["deck"]);
  });

  it("an unknown scene is E_REF, exit 2, with a didYouMean list", async () => {
    const { code, r } = await run(["nest.pack", "--scene", "slug-sheet"]);
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/scene" });
    expect(r.errors[0]!.didYouMean).toContain("slug-sheets");
    const nope = await run(["nest.pack", "--scene", "nope"]);
    expect(nope.code).toBe(2);
    expect(nope.r.errors[0]?.code).toBe("E_REF");
    expect(Array.isArray(nope.r.errors[0]?.didYouMean)).toBe(true);
  });

  it("--build is E_REF until M10 and nothing named is E_PARAM_MISSING, both exit 2", async () => {
    expect((await run(["nest.pack", "--build", "reference/keys/flex-pair"])).r.errors[0]).toMatchObject({ code: "E_REF", path: "/build" });
    const none = await run(["nest.pack"]);
    expect(none.code).toBe(2);
    expect(none.r.errors[0]?.code).toBe("E_PARAM_MISSING");
  });

  it("the 46 SLUG outlines in kerf mode outline on sheet600 (kerf null): exit 2, E_PARAM_MISSING naming the row, the two next calls", async () => {
    const ids = await slugIds();
    expect(ids).toHaveLength(golden<{ result: { connectivity: { parts: number } } }>("packages/nest/records/slug-legacy.json").result.connectivity.parts);
    const { code, r } = await run(["nest.pack", "--parts", ids.join(","), "--sheet", "600,400", "--machine", "sheet600", "--kerf-mode", "outline"]);
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_PARAM_MISSING", path: "hbf://profile/machine/sheet600#/kerf" });
    expect(r.next).toHaveLength(2);
    expect(r.next[0]).toMatchObject({ command: "nest.pack", args: { kerfMode: "none", machine: "sheet600" } });
    expect(r.next[1]).toMatchObject({ command: "knowledge.search", args: { query: "kerf coupon" } });
  });

  it("the same call in kerf mode none: exit 0, one copy of each of the 46 placed", async () => {
    const ids = await slugIds();
    const { code, r } = await run(["nest.pack", "--parts", ids.join(","), "--sheet", "600,400", "--machine", "sheet600", "--kerf-mode", "none"]);
    expect(code).toBe(0);
    const layout = r.result["layout"] as { placements: unknown[]; oversize: string[] };
    expect(layout.placements).toHaveLength(46);
    expect(layout.oversize).toEqual([]);
  });

  it("an unknown part is E_REF with didYouMean", async () => {
    const { code, r } = await run(["nest.pack", "--parts", "pinon", "--sheet", "600,400"]);
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/parts/0" });
    expect(r.errors[0]!.didYouMean).toContain("pinion");
  });

  it("ogee16-r16p-plates: the knob bill packs as the reference does (sheets, placements and layoutHash of expected/layout.json)", async () => {
    const want = golden<{ knobs: { gap4: { sheets: number; pieces: number; layoutHash: string } } }>("reference/sheet/ogee16-r16p-plates/expected/layout.json").knobs.gap4;
    const { code, r } = await run(["nest.pack", "--scene", "ogee16-r16p-plates"]);
    expect(code).toBe(0);
    const layout = r.result["layout"] as { sheets: number; placements: unknown[]; layoutHash: string };
    expect([layout.sheets, layout.placements.length, layout.layoutHash]).toEqual([want.sheets, want.pieces, want.layoutHash]);
  }, 300_000);

  it("ogee16-r16p-plates --machine names the bed printer: the result carries it, a sheet machine is refused (M07 audit)", async () => {
    const own = await run(["nest.pack", "--scene", "ogee16-r16p-plates"]);
    const other = own.r.result["machine"] === "ffc5p" ? "centauri" : "ffc5p";
    const { code, r } = await run(["nest.pack", "--scene", "ogee16-r16p-plates", "--machine", other]);
    expect(code).toBe(0);
    expect(r.result["machine"]).toBe(other);
    const laser = await run(["nest.pack", "--scene", "ogee16-r16p-plates", "--machine", "laser1220"]);
    expect(laser.code).not.toBe(0);
  }, 300_000);
});

describe("motion.run (computed)", () => {
  it("--expect none: ogee.clear passes with nothing latched, ogee.checker fails naming its 8 cells as extra (M07 audit)", async () => {
    const clear = await run(["motion.run", "--program", "ogee.clear", "--expect", "none"]);
    expect(clear.code).toBe(0);
    expect(clear.r.verdict).toBe("pass");
    expect(clear.r.result["expectation"]).toMatchObject({ pass: true, declared: [], measured: [] });
    const checker = await run(["motion.run", "--program", "ogee.checker", "--expect", "none"]);
    expect(checker.code).toBe(1);
    expect(checker.r.result["expectation"]).toMatchObject({ pass: false, declared: [], missing: [] });
    expect((checker.r.result["expectation"] as { extra: string[] }).extra).toHaveLength(8);
  });

  it("slug.vend --k 3: exit 0, the rotor at 12227 half steps after three vends of 4076, 4076, 4075", async () => {
    const { code, r } = await run(["motion.run", "--program", "slug.vend", "--k", "3"]);
    expect(code).toBe(0);
    expect((r.result["states"] as { rotor: number }[]).map((s) => s.rotor)).toEqual([4076, 8152, 12227]);
    expect((r.result["end"] as { rotor: number }).rotor).toBe(12227);
  });

  it("ogee.checker: exit 0, the 8 cells of the kin.py record latched, nothing declared so skip", async () => {
    const rec = golden<{ result: { programs: { checker: { matrix: number[][] } } } }>("packages/motion/records/ogee16-kin.json");
    const cells = rec.result.programs.checker.matrix.flatMap((row, i) => row.flatMap((v, j) => (v === 1 ? [`${i},${j}`] : [])));
    const { code, r } = await run(["motion.run", "--program", "ogee.checker"]);
    expect(code).toBe(0);
    expect(r.verdict).toBe("skip");
    expect(r.result["latched"]).toEqual(cells);
  });

  it("ogee.checker --expect all: exit 1 with the measured and declared sets", async () => {
    const { code, r } = await run(["motion.run", "--program", "ogee.checker", "--expect", "all"]);
    expect(code).toBe(1);
    const e = r.result["expectation"] as { pass: boolean; measured: string[]; declared: string[]; missing: string[] };
    expect(e.pass).toBe(false);
    expect([e.measured.length, e.declared.length, e.missing.length]).toEqual([8, 16, 8]);
    const ok = await run(["motion.run", "--program", "ogee.checker", "--expect", "checker"]);
    expect([ok.code, ok.r.verdict]).toEqual([0, "pass"]);
  });

  it("--audit runs CHK-MOT-04, 05 and 06 on the machine; each passes on OGEE16 R16", async () => {
    const { code, r } = await run(["motion.run", "--program", "ogee.setPixel", "--i", "1", "--j", "2", "--audit"]);
    expect(code).toBe(0);
    expect(r.counts).toMatchObject({ pass: 3, fail: 0 });
    expect(r.result["latched"]).toEqual(["1,2"]);
  });

  it("a planner program returns PlanResult: the DETENT square of the record, feed bound", async () => {
    const rec = golden<{ result: { points: number; params: { side: number; sample: number } } }>("packages/motion/records/detent-plan.json").result;
    const { code, r } = await run(["motion.run", "--program", "detent.square", "--side", String(rec.params.side), "--sample", String(rec.params.sample)]);
    expect(code).toBe(0);
    expect(r.result["space"]).toBe("steps");
    expect((r.result["points"] as unknown[]).length).toBe(rec.points);
    expect(r.result["binding"]).toBe("feed");
  });

  it("input errors exit 2: an unknown program, a missing arg, an arg the program does not read", async () => {
    const a = await run(["motion.run", "--program", "ogee.chekcer"]);
    expect([a.code, a.r.errors[0]?.code]).toEqual([2, "E_REF"]);
    expect(a.r.errors[0]!.didYouMean).toContain("ogee.checker");
    const b = await run(["motion.run", "--program", "slug.vend"]);
    expect([b.code, b.r.errors[0]?.code]).toEqual([2, "E_PARAM_MISSING"]);
    const c = await run(["motion.run", "--program", "slug.vend", "--k", "1", "--row", "2"]);
    expect([c.code, c.r.errors[0]?.code]).toEqual([2, "E_SCHEMA"]);
  });
});

describe("export.run on a nest scene (D-109)", () => {
  it("slug-sheets dxf without a TTY: exit 3, E_GATE_UNAVAILABLE naming the line a person runs, nothing written", async () => {
    const out = path.join(tmp, "none");
    const gate = streams(false);
    const { code, r } = await hbf(["export.run", "--scene", "slug-sheets", "--kind", "dxf", "--out", out, "--json"], { gate }).then((x) => ({ code: x.code, r: JSON.parse(x.out) as R }));
    expect(code).toBe(3);
    expect(r.errors[0]?.code).toBe("E_GATE_UNAVAILABLE");
    expect(r.errors[0]?.personRuns).toContain("npx --no-install hbf export.run --scene slug-sheets --kind dxf");
    expect(gate.said()).toBe("");
    expect(existsSync(out)).toBe(false);
  });

  it("approved at a terminal: the ten sheets written as the nest writer's committed bytes, named per PACKAGES.md 8.2", async () => {
    const out = path.join(tmp, "slug");
    const gate = streams(true, "y\n");
    const { code, r } = await run(["export.run", "--scene", "slug-sheets", "--kind", "dxf", "--out", out], gate);
    expect(code).toBe(0);
    expect(gate.said()).toContain("this approval does not identify who approved.");
    expect(r.counts.fail).toBe(0);
    expect(findings(r, "CHK-SHT-03")).toEqual([]);
    const names = readdirSync(out).sort();
    const want = [...Array.from({ length: 9 }, (_, i) => `slug-ply-sheet${i + 1}`), "slug-acrylic-sheet1"];
    expect(names).toEqual(want.map((n) => `x01_${n}_3.0mm-${n.includes("acrylic") ? "acrylic3" : "ply3"}.dxf`).sort());
    for (const n of want) {
      const file = names.find((x) => x.includes(`_${n}_`))!;
      expect(readFileSync(path.join(out, file), "utf8"), n).toBe(read(`packages/nest/test/out/${n}.dxf`));
    }
    expect(r.artifacts).toHaveLength(10);
  });

  it("svg-cut writes the SVG twins, the committed bytes", async () => {
    const out = path.join(tmp, "svg");
    const { code } = await run(["export.run", "--scene", "slug-sheets", "--kind", "svg-cut", "--out", out], streams(true, "y\n"));
    expect(code).toBe(0);
    const file = readdirSync(out).find((n) => n.includes("_slug-ply-sheet4_"))!;
    expect(file).toBe("x01_slug-ply-sheet4_3.0mm-ply3.svg");
    expect(readFileSync(path.join(out, file), "utf8")).toBe(read("packages/nest/test/out/slug-ply-sheet4.svg"));
  });

  it("a dry run reports CHK-SHT-01, 02, 03 and 07 for every sheet and writes nothing", async () => {
    const { code, r } = await run(["export.run", "--scene", "slug-sheets", "--kind", "dxf", "--dry-run"]);
    expect(code).toBe(0);
    expect(r.stage).toBe("gate");
    expect(r.counts.fail).toBe(0);
    expect((r.result["files"] as string[]).length).toBe(10);
  });

  it("a severed deck fails its checks and never reaches the prompt: exit 1", async () => {
    const gate = streams(true, "y\n");
    const { code, r } = await run(["export.run", "--scene", "severed-deck", "--kind", "dxf", "--out", path.join(tmp, "deck")], gate);
    expect(code).toBe(1);
    expect(findings(r, "CHK-SHT-01")[0]).toMatchObject({ verdict: "fail", extra: { pieces: 2 } });
    expect(gate.said()).toBe("");
    expect(existsSync(path.join(tmp, "deck"))).toBe(false);
  });

  it("a kind the scene cannot take is E_SCHEMA; a kind hbf does not register is E_REF", async () => {
    expect((await run(["export.run", "--scene", "slug-sheets", "--kind", "3mf"])).r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/kind" });
    const bad = await run(["export.run", "--scene", "slug-sheets", "--kind", "dfx"]);
    expect(bad.r.errors[0]).toMatchObject({ code: "E_REF", path: "/kind" });
    expect(bad.r.errors[0]!.didYouMean).toContain("dxf");
  });

  it("a chase cannot export a sheet kind before M10: E_SCHEMA", async () => {
    expect((await run(["export.run", "reference/keys/flex-pair", "--kind", "dxf"])).r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/kind" });
  });
});
