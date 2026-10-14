// export.run carries the 3mf writer's warnings (PROFILE.md 8.1, D-187). The
// flex pair puts tpu95 in slot 3 (cones) and ctpu in slot 4 (caps); both
// take the Generic PETG @FF C5P preset column, so each raises
// PRESET_INFERRED. The result lists both and the gate prompt names the
// slots before the person answers. Counts stay tied to the check registry.

import { PassThrough } from "node:stream";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import type { BuildWarning, CommandResult } from "@hackbuild/spec";
import { main } from "../src/main.js";
import { gatePrompt, type GateStreams } from "../src/tty-gate.js";
import { inferredSlotNotes } from "../src/commands/export-run.js";
import { mergeWarnings } from "../src/commands/build.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REF = "reference/keys/flex-pair";
const tmp = mkdtempSync(path.join(tmpdir(), "hbf-export-warn-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

interface Out { readonly artifacts: readonly string[]; readonly warnings: readonly BuildWarning[] }

async function run(argv: readonly string[], gate?: GateStreams): Promise<{ code: number; out: string }> {
  let out = "";
  const code = await main(argv, ROOT, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; }, ...(gate === undefined ? {} : { gate }) });
  return { code, out };
}

const inferred = (ws: readonly BuildWarning[]): BuildWarning[] => ws.filter((w) => w.code === "PRESET_INFERRED");

describe("export.run writer warnings on the flex pair", () => {
  it("preset two dry run lists PRESET_INFERRED for slots 3 and 4 and leaves counts to the checks", async () => {
    const { code, out } = await run(["export.run", REF, "--kind", "3mf", "--preset", "two", "--dry-run", "--json"]);
    expect(code).toBe(0);
    const r = JSON.parse(out) as CommandResult<Out>;
    expect(inferred(r.result!.warnings).map((w) => w.param)).toEqual(["/filaments/2/type", "/filaments/3/type"]);
    expect(r.findings.some((f) => f.id.includes("PRESET"))).toBe(false);
    expect(r.counts.warn).toBe(r.findings.filter((f) => f.verdict === "warn").length);
  });

  it("the human output prints each warning", async () => {
    const { out } = await run(["export.run", REF, "--kind", "3mf", "--preset", "two", "--dry-run"]);
    expect(out.match(/^warn {2}PRESET_INFERRED {2}/gm)?.length).toBe(2);
  });

  it("the gate prompt names slots 3 and 4 before the answer, and n writes nothing", async () => {
    const input = Object.assign(new PassThrough(), { isTTY: true });
    const output = Object.assign(new PassThrough(), { isTTY: true });
    let shown = "";
    output.on("data", (b: Buffer) => { shown += b.toString("utf8"); });
    input.end("n\n");
    const { code } = await run(["export.run", REF, "--kind", "3mf", "--preset", "two", "--out", path.join(tmp, "n.3mf"), "--json"], { input, output });
    expect(code).not.toBe(0);
    expect(shown).toContain("slots 3, 4 tpu values inferred from Generic PETG @FF C5P; they may not reach the slice.");
    expect(shown.indexOf("slots 3, 4")).toBeLessThan(shown.indexOf("[y/N]"));
  });
});

describe("warning merge and gate notes", () => {
  const tpu = (i: number): BuildWarning => ({ code: "PRESET_INFERRED", text: "TPU preset row inferred: same text", param: `/filaments/${i}/type` });

  it("keeps two warnings that differ only by param, drops an exact repeat", () => {
    expect(mergeWarnings([tpu(2), tpu(3)], [tpu(2)])).toEqual([tpu(2), tpu(3)]);
  });

  it("names one slot, several slots, or none", () => {
    expect(inferredSlotNotes([tpu(2)])).toEqual(["slot 3 tpu values inferred from Generic PETG @FF C5P; they may not reach the slice"]);
    expect(inferredSlotNotes([tpu(3), tpu(2)])[0]).toMatch(/^slots 3, 4 /);
    expect(inferredSlotNotes([{ code: "INSET", text: "x" }])).toEqual([]);
  });

  it("gatePrompt without notes is the prompt it was", () => {
    const o = { kind: "3mf", machine: "ffc5p", chase: "c", buildHash: "abcdef0123", fail: 0, warn: 1, path: "out/x.3mf" };
    expect(gatePrompt(o)).toBe("export 3mf for ffc5p from c, build abcdef..23, 0 fail, 1 warn. writes out/x.3mf. this approval does not identify who approved. [y/N] ");
    expect(gatePrompt({ ...o, notes: ["slot 3 note"] })).toContain("1 warn. slot 3 note. writes out/x.3mf.");
  });
});
