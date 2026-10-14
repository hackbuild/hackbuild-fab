// The CLI export gate (D-109, M00-T13 step 9). The TTY path runs the built
// bin under `script`, argv by platform: util-linux on linux, BSD on darwin;
// any other platform skips and reports the gate as not run (D-153). y
// writes the file and exits 0; n is E_GATE, exit 3, nothing written; a
// failing build exits 1 and the prompt never appears; without a TTY the
// result is E_GATE_UNAVAILABLE, exit 3, naming the line a person runs. A
// design whose build.ts sets isTTY on stdin and stdout cannot open the
// gate for a piped `echo y | hbf export.run`.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { BIN, REF, ROOT } from "./hbf.js";

const PROMPT_TAIL = "this approval does not identify who approved.";
const tmp = mkdtempSync(path.join(tmpdir(), "hbf-gate-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** argv that runs `cmd` under a pseudo-terminal, or undefined where the gate test does not run. */
function scriptArgv(cmd: string): string[] | undefined {
  if (process.platform === "linux") return ["script", "-qec", cmd, "/dev/null"];
  if (process.platform === "darwin") return ["script", "-q", "/dev/null", "sh", "-c", cmd];
  return undefined;
}

const SUPPORTED = scriptArgv("true") !== undefined;
const sh = (s: string): string => `'${s.replace(/'/g, "'\\''")}'`;

/** Run the bin under a TTY with `answer` on stdin; the exit code travels in the output. */
function underTty(args: readonly string[], answer: string): { exit: number; out: string } {
  const cmd = `${sh(process.execPath)} ${sh(BIN)} ${args.map(sh).join(" ")}; echo "HBF-EXIT:$?"`;
  const argv = scriptArgv(cmd)!;
  const r = spawnSync(argv[0]!, argv.slice(1), { cwd: ROOT, input: answer, encoding: "utf8", timeout: 120_000 });
  const out = `${r.stdout}${r.stderr}`;
  const m = /HBF-EXIT:(\d+)/.exec(out);
  return { exit: m === null ? -1 : Number(m[1]), out };
}

describe("export gate on the CLI", () => {
  it("built bin exists (npm ci runs tsc -b through prepare)", () => {
    expect(existsSync(path.join(ROOT, "core", "dist", "cli.js"))).toBe(true);
  });

  it("without a TTY returns E_GATE_UNAVAILABLE, exit 3, with the person's line and nothing written", () => {
    const out = path.join(tmp, "none.3mf");
    const r = spawnSync(process.execPath, [BIN, "export.run", REF, "--kind", "3mf", "--machine", "ffc5p", "--out", out, "--json"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 120_000 });
    expect(r.status).toBe(3);
    const res = JSON.parse(r.stdout) as { errors: { code: string; personRuns?: string }[]; next: unknown[] };
    expect(res.errors[0]?.code).toBe("E_GATE_UNAVAILABLE");
    expect(res.errors[0]?.personRuns).toContain("hbf export.run reference/keys/flex-pair --kind 3mf --machine ffc5p");
    expect(res.next).toEqual([]);
    expect(existsSync(out)).toBe(false);
  }, 120_000);

  it("a build.ts that marks the streams as terminals does not open the gate to a pipe", () => {
    const out = path.join(tmp, "flip.3mf");
    const r = spawnSync(process.execPath, [BIN, "export.run", "core/test/fixtures/sandbox/tty-flip", "--kind", "3mf", "--out", out, "--json"], { cwd: ROOT, input: "y\n", stdio: ["pipe", "pipe", "pipe"], encoding: "utf8", timeout: 120_000 });
    expect(r.status).toBe(3);
    const res = JSON.parse(r.stdout) as { errors: { code: string }[] };
    expect(res.errors[0]?.code).toBe("E_GATE_UNAVAILABLE");
    expect(existsSync(out)).toBe(false);
  }, 120_000);

  it.skipIf(!SUPPORTED)("answer y writes the file and exits 0", () => {
    const out = path.join(tmp, "yes.3mf");
    const r = underTty(["export.run", REF, "--kind", "3mf", "--out", out], "y\n");
    expect(r.out).toContain(PROMPT_TAIL);
    expect(r.exit).toBe(0);
    expect(existsSync(out)).toBe(true);
  }, 120_000);

  it.skipIf(!SUPPORTED)("answer n is E_GATE, exit 3, and writes nothing", () => {
    const out = path.join(tmp, "no.3mf");
    const r = underTty(["export.run", REF, "--kind", "3mf", "--out", out], "n\n");
    expect(r.out).toContain(PROMPT_TAIL);
    expect(r.out).toContain("E_GATE");
    expect(r.exit).toBe(3);
    expect(existsSync(out)).toBe(false);
  }, 120_000);

  it.skipIf(!SUPPORTED)("a failing build exits 1 and the prompt never appears", () => {
    const out = path.join(tmp, "fail.3mf");
    const r = underTty(["export.run", REF, "--kind", "3mf", "--out", out, "--params", '{"/keys/0/gap": 1.0}'], "y\n");
    expect(r.exit).toBe(1);
    expect(r.out).toContain("CHK-KEY-01");
    expect(r.out).not.toContain(PROMPT_TAIL);
    expect(existsSync(out)).toBe(false);
  }, 120_000);
});
