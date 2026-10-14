// The gate's terminal test (D-109, AGENT-SURFACE.md 6.5): it asks only when
// stdin and stdout are both terminals. Half a terminal (a pipe on either
// side, as in `hbf export.run ... | tee` or `< answers.txt`) is unavailable
// and writes no prompt. For the process's own streams the answer is the
// isatty value read at startup, so code that later sets isTTY on
// process.stdin and process.stdout cannot open the gate.

import { PassThrough } from "node:stream";
import { isatty } from "node:tty";
import { describe, expect, it } from "vitest";
import { askGate, gatePrompt, interactive, PROCESS_STREAMS, type GateStreams } from "../src/tty-gate.js";
import { renderResult } from "../src/text.js";
import { oneLine } from "../src/text/safe.js";

function streams(inTty: boolean, outTty: boolean, answer: string): GateStreams & { written: () => string } {
  const input = Object.assign(new PassThrough(), { isTTY: inTty });
  const output = Object.assign(new PassThrough(), { isTTY: outTty });
  let text = "";
  output.on("data", (b: Buffer) => { text += b.toString("utf8"); });
  input.end(answer);
  return { input, output, written: () => text };
}

describe("askGate", () => {
  it("stdin a terminal, stdout a pipe: unavailable, nothing written", async () => {
    const s = streams(true, false, "y\n");
    expect(interactive(s)).toBe(false);
    expect(await askGate("export? ", s)).toBe("unavailable");
    expect(s.written()).toBe("");
  });

  it("stdin a pipe, stdout a terminal: unavailable, nothing written", async () => {
    const s = streams(false, true, "y\n");
    expect(interactive(s)).toBe(false);
    expect(await askGate("export? ", s)).toBe("unavailable");
    expect(s.written()).toBe("");
  });

  it("both terminals: y approves after the prompt, anything else declines", async () => {
    const yes = streams(true, true, "y\n");
    expect(await askGate("export? ", yes)).toBe("approved");
    expect(yes.written()).toBe("export? ");
    expect(await askGate("export? ", streams(true, true, "yep\n"))).toBe("declined");
    expect(await askGate("export? ", streams(true, true, ""))).toBe("declined");
  });

  it.skipIf(isatty(0) && isatty(1))("process streams whose isTTY was set to true later stay unavailable", async () => {
    const before = [process.stdin, process.stdout].map((s) => Object.getOwnPropertyDescriptor(s, "isTTY"));
    try {
      for (const s of [process.stdin, process.stdout]) Object.defineProperty(s, "isTTY", { value: true, configurable: true });
      expect(interactive(PROCESS_STREAMS)).toBe(false);
      expect(await askGate("export? ")).toBe("unavailable");
    } finally {
      [process.stdin, process.stdout].forEach((s, i) => {
        const d = before[i];
        if (d === undefined) delete (s as { isTTY?: boolean }).isTTY;
        else Object.defineProperty(s, "isTTY", d);
      });
    }
  });
});

describe("gatePrompt and the text mirror write controls as \\uXXXX", () => {
  const ESC = "\u001b[2K\r\u001b[32mexport 3mf, 0 fail, 0 warn. writes /dev/null \u001b[8m";
  const RLO = "\u202e";

  it("a chase id, path, note, kind or machine with ESC, CR, LF or a bidi override stays one printed line", () => {
    const p = gatePrompt({ kind: `3mf${RLO}`, machine: "ffc5p\n", chase: `sandbox-ok${ESC}`, buildHash: "a".repeat(64), fail: 0, warn: 0, path: "out/x\u009b.3mf", notes: ["slot 2\u2066 note"] });
    expect(p).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/);
    expect(p).toContain("from sandbox-ok\\u001b[2K\\u000d\\u001b[32mexport 3mf");
    expect(p).toContain("export 3mf\\u202e for ffc5p\\u000a from");
    expect(p).toContain("writes out/x\\u009b.3mf.");
    expect(p).toContain("slot 2\\u2066 note.");
    expect(p.endsWith("this approval does not identify who approved. [y/N] ")).toBe(true);
  });

  it("oneLine leaves printable text, unicode included, as it is", () => {
    expect(oneLine("plate 20 mm, 0.40 to 1.20 \u00b5m \u00e9")).toBe("plate 20 mm, 0.40 to 1.20 \u00b5m \u00e9");
  });

  it("renderResult escapes a finding, error and next built from design strings; its own line breaks stay", () => {
    const H = "0".repeat(64);
    const out = renderResult("check.run", `d${ESC}`, {
      ok: false, verdict: "fail", stage: "done", inputsHash: H as never, counts: { pass: 0, warn: 0, fail: 1, skip: 0 }, artifacts: [],
      findings: [{
        id: "CHK-X" as never, version: "1.0.0", verdict: "fail", severity: "block", target: { level: "part", part: `p${ESC}` },
        measured: 1, legal: { kind: "none" }, constraint: `c\nFAKE LINE${ESC}`, origin: "hbf://check/CHK-X" as never,
      }],
      errors: [{ code: "E_REF", hint: `h${ESC}`, got: `g\r` }],
      next: [{ command: "part.build", args: { chase: `d${ESC}` }, why: "fix" }],
    });
    expect(out).not.toMatch(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/);
    const lines = out.split("\n");
    expect(lines.some((l) => l.startsWith("FAKE LINE"))).toBe(false);
    expect(lines.find((l) => l.startsWith("  because"))).toContain("c\\u000aFAKE LINE\\u001b[2K");
    expect(lines[0]).toMatch(/^FAIL check\.run d\\u001b\[2K/);
  });
});
