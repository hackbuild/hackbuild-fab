// M08-T14 step 4: export.run on board designs. The order is build, the
// provenance gate, the board checks, the TTY gate, the write, then the
// written files read back. SPINDLE R1 reads inferred hand pads (its parts
// audit, reference/boards/spindle-r1/parts.audit.json), so its gerbers stop
// at E_PROVENANCE, exit 4, without a prompt or a stdin read. The pair
// fixture (core/test/fixtures/boards/pair) reads only community rows and
// passes every board check, so it reaches the gate: no TTY is
// E_GATE_UNAVAILABLE naming the line, y under `script` writes the zip and
// the two parsed-gerber PNGs, n writes nothing, and a reparse that fails
// after the write removes what was written. The pair-short fixture adds one
// net A track across the net B trace: CHK-BRD-21 fails at the check stage,
// exit 1, before the gate. The pair-noreads fixture records no catalog
// read, so the gate refuses each placed part, exit 4. dryRun on kicad and wiring writes nothing.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import type { CommandInput } from "@hackbuild/spec";
import type { KernelViews } from "@hackbuild/checks";
import { loadDesign } from "../src/commands/build.js";
import { runBoardExport } from "../src/exporters/board-export.js";
import { boardExporter } from "../src/exporters/board-exporters.js";
import { boardViews } from "../src/board-views.js";
import { Store } from "../src/store.js";
import type { CoreCtx } from "../src/registry.js";
import type { GateStreams } from "../src/tty-gate.js";
import { BIN, ROOT } from "./hbf.js";

process.env["SOURCE_DATE_EPOCH"] = "315532800";
const PAIR = "core/test/fixtures/boards/pair";
const PAIR_SHORT = "core/test/fixtures/boards/pair-short";
const PAIR_NOREADS = "core/test/fixtures/boards/pair-noreads";
const PROMPT_TAIL = "this approval does not identify who approved.";
const tmp = mkdtempSync(path.join(tmpdir(), "hbf-board-export-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function scriptArgv(cmd: string): string[] | undefined {
  if (process.platform === "linux") return ["script", "-qec", cmd, "/dev/null"];
  if (process.platform === "darwin") return ["script", "-q", "/dev/null", "sh", "-c", cmd];
  return undefined;
}
const SUPPORTED = scriptArgv("true") !== undefined;
const sh = (s: string): string => `'${s.replace(/'/g, "'\\''")}'`;
function underTty(args: readonly string[], answer: string): { exit: number; out: string } {
  const cmd = `${sh(process.execPath)} ${sh(BIN)} ${args.map(sh).join(" ")}; echo "HBF-EXIT:$?"`;
  const argv = scriptArgv(cmd)!;
  const r = spawnSync(argv[0]!, argv.slice(1), { cwd: ROOT, input: answer, encoding: "utf8", timeout: 300_000 });
  const out = `${r.stdout}${r.stderr}`;
  const m = /HBF-EXIT:(\d+)/.exec(out);
  return { exit: m === null ? -1 : Number(m[1]), out };
}
const piped = (args: readonly string[]) => spawnSync(process.execPath, [BIN, ...args, "--json"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 300_000 });

describe("export.run on boards without a terminal", () => {
  it("SPINDLE R1 gerbers: E_PROVENANCE, exit 4, one error per inferred read, no prompt", () => {
    const r = piped(["export.run", "reference/boards/spindle-r1", "--kind", "gerbers"]);
    expect(r.status).toBe(4);
    expect(r.stdout).not.toContain(PROMPT_TAIL);
    const res = JSON.parse(r.stdout) as { errors: { code: string; path: string; record: string }[]; findings: unknown[] };
    expect(new Set(res.errors.map((e) => e.code))).toEqual(new Set(["E_PROVENANCE"]));
    expect(res.errors.map((e) => e.path)).toContain("/catalog/esp32c3-supermini/U1.pads");
    expect(res.errors.every((e) => e.record === "CHK-BRD-06")).toBe(true);
    expect(res.findings).toEqual([]);
  }, 300_000);

  it("the pair-noreads fixture gerbers: E_PROVENANCE at /parts/J1 and /parts/J2, exit 4, no check, nothing written", () => {
    const out = path.join(tmp, "noreads");
    const r = piped(["export.run", PAIR_NOREADS, "--kind", "gerbers", "--out", out]);
    expect(r.status).toBe(4);
    expect(r.stdout).not.toContain(PROMPT_TAIL);
    const res = JSON.parse(r.stdout) as { stage: string; errors: { code: string; path: string; record: string }[]; findings: unknown[] };
    expect(res.stage).toBe("gate");
    expect(res.errors.map((e) => [e.code, e.path])).toEqual([["E_PROVENANCE", "/parts/J1"], ["E_PROVENANCE", "/parts/J2"]]);
    expect(res.findings).toEqual([]);
    expect(existsSync(out)).toBe(false);
  }, 300_000);

  it("the pair fixture gerbers: every check passes, then E_GATE_UNAVAILABLE, exit 3, naming the line, nothing written", () => {
    const out = path.join(tmp, "unavailable");
    const r = piped(["export.run", PAIR, "--kind", "gerbers", "--out", out]);
    expect(r.status).toBe(3);
    const res = JSON.parse(r.stdout) as { errors: { code: string; personRuns?: string }[] };
    expect(res.errors[0]?.code).toBe("E_GATE_UNAVAILABLE");
    expect(res.errors[0]?.personRuns).toBe(`npx --no-install hbf export.run ${PAIR} --kind gerbers --out ${out}`);
    expect(existsSync(out)).toBe(false);
  }, 300_000);

  it("the pair-short fixture gerbers: CHK-BRD-21 fails at the check stage, exit 1, no gate, nothing written", () => {
    const out = path.join(tmp, "short");
    const r = piped(["export.run", PAIR_SHORT, "--kind", "gerbers", "--out", out]);
    expect(r.status).toBe(1);
    expect(r.stdout).not.toContain(PROMPT_TAIL);
    const res = JSON.parse(r.stdout) as { verdict: string; stage: string; errors: { code: string }[]; findings: { id: string; verdict: string }[] };
    expect(res.verdict).toBe("fail");
    expect(res.stage).toBe("check");
    expect(res.findings.some((f) => f.id === "CHK-BRD-21" && f.verdict === "fail")).toBe(true);
    expect(res.errors.map((e) => e.code)).not.toContain("E_GATE_UNAVAILABLE");
    expect(existsSync(out)).toBe(false);
  }, 300_000);

  it("--dry-run writes nothing on kicad and wiring, exit 0", () => {
    const k = path.join(tmp, "kicad-dry");
    const rk = piped(["export.run", "reference/boards/spindle-r1", "--kind", "kicad", "--dry-run", "--out", k]);
    expect(rk.status).toBe(0);
    expect(JSON.parse(rk.stdout).artifacts).toEqual([]);
    expect(existsSync(k)).toBe(false);
    const w = path.join(tmp, "wiring-dry", "w.svg");
    const rw = piped(["export.run", "reference/boards/wiring-supermini", "--kind", "wiring", "--dry-run", "--out", w]);
    expect(rw.status).toBe(0);
    expect(JSON.parse(rw.stdout).artifacts).toEqual([]);
    expect(existsSync(path.dirname(w))).toBe(false);
  }, 300_000);

  it("kicad is no fabrication export: SPINDLE R1 writes and reads back with no gate and no provenance stop", () => {
    const out = path.join(tmp, "kicad");
    const r = piped(["export.run", "reference/boards/spindle-r1", "--kind", "kicad", "--out", out]);
    expect(r.status).toBe(0);
    expect(readdirSync(out)).toEqual(["spindle-r1.kicad_pcb"]);
  }, 300_000);

  it("wiring through the CLI (M08-T13 acceptance 2): one SVG artifact, no gate; a board kind on a wiring design is refused", () => {
    const out = path.join(tmp, "wiring");
    const r = piped(["export.run", "reference/boards/wiring-supermini", "--kind", "wiring", "--out", path.join(out, "w.svg")]);
    expect(r.status).toBe(0);
    const res = JSON.parse(r.stdout) as { artifacts: { kind: string; mediaType: string }[] };
    expect(res.artifacts.map((a) => [a.kind, a.mediaType])).toEqual([["wiring", "image/svg+xml"]]);
    expect(piped(["export.run", "reference/boards/wiring-supermini", "--kind", "gerbers"]).status).toBe(2);
  }, 300_000);

  it("circuit-json is registered and names the card that lands its writer", () => {
    const r = piped(["export.run", "reference/boards/spindle-r1", "--kind", "circuit-json"]);
    expect(r.status).toBe(2);
    expect(JSON.parse(r.stdout).errors[0].hint).toContain("M08-T11");
  }, 120_000);
});

describe.skipIf(!SUPPORTED)("export.run on the pair fixture at a terminal", () => {
  it("y writes the zip and the two parsed-gerber PNGs the prompt named", () => {
    const out = path.join(tmp, "yes");
    const r = underTty(["export.run", PAIR, "--kind", "gerbers", "--out", out], "y\n");
    expect(r.out).toContain(PROMPT_TAIL);
    expect(r.out).toContain("gerber-front.png and");
    expect(r.exit).toBe(0);
    expect(readdirSync(out).sort()).toEqual(["gerber-back.png", "gerber-front.png", "pair-gerbers.zip"]);
  }, 300_000);

  it("n is E_GATE, exit 3, and writes nothing", () => {
    const out = path.join(tmp, "no");
    const r = underTty(["export.run", PAIR, "--kind", "gerbers", "--out", out], "n\n");
    expect(r.out).toContain(PROMPT_TAIL);
    expect(r.exit).toBe(3);
    expect(existsSync(out)).toBe(false);
  }, 300_000);
});

describe("the post-write read-back", () => {
  it("a zip whose reparse fails after the write is removed, exit 1 with the CHK-BRD-01 finding", async () => {
    const design = await loadDesign(PAIR, ROOT);
    const out = path.join(tmp, "postwrite");
    const input = { pressed: false };
    const gate: GateStreams = (() => {
      const i = new PassThrough() as PassThrough & { isTTY: boolean };
      const o = new PassThrough() as PassThrough & { isTTY: boolean };
      i.isTTY = true; o.isTTY = true;
      // answer after askGate has its line listener in place
      o.on("data", () => { if (!input.pressed) { input.pressed = true; setTimeout(() => i.write("y\n"), 20); } });
      return { input: i, output: o };
    })();
    const real = boardViews(ROOT, path.join(ROOT, ".hbf", "out", "pair"), design.dir);
    let calls = 0;
    // The first reparse is the pre-gate check on the build's zip; the second reads the written zip back and fails.
    const views: KernelViews = { ...real, board: { ...real.board, reparse: async (zip, record) => (++calls === 1 ? real.board!.reparse!(zip, record) : { ok: false, fails: ["written zip differs from its source"], lines: [], worstSymdiff: 1 }) } };
    const ctx = {
      workspace: ROOT, cwd: ROOT, branch: "", store: new Store(ROOT), transport: "cli", clientCaps: { elicitation: false, tasks: false },
      signal: { aborted: false, throwIfAborted: () => undefined }, inputsHash: "0".repeat(64), gate, cli: { out },
    } as unknown as CoreCtx;
    const r = await runBoardExport(design, { chase: PAIR, kind: "gerbers" } as CommandInput<"export.run">, ctx, boardExporter("gerbers")!, views);
    expect(calls).toBe(2);
    expect(r.verdict).toBe("fail");
    expect(r.findings.some((f) => f.id === "CHK-BRD-01" && f.verdict === "fail")).toBe(true);
    expect(readdirSync(out)).toEqual([]);
  }, 300_000);
});
