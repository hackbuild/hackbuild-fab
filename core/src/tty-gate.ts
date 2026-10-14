// The CLI export gate (D-109, AGENT-SURFACE.md 6.5). A fabrication export
// asks once on an interactive terminal; without a TTY on both stdin and
// stdout it never asks and returns unavailable, so scripts and pipelines
// cannot export by accident. There is no flag and no environment variable
// that answers for a person. `script -q` gives any process a TTY; the gate
// is no defence against an actor holding the user's shell (6.5 table).
//
// For the process streams the answer is fd 0 and fd 1 as isatty(3) saw
// them when this module loaded, before any command ran or any design
// loaded. stdin.isTTY and stdout.isTTY are writable properties, so code
// that runs later in this process cannot turn a pipe into a terminal.

import { createInterface } from "node:readline";
import { isatty } from "node:tty";
import { oneLine } from "./text/safe.js";

/** The streams the gate reads and writes; process.stdin and process.stdout by default. */
export interface GateStreams {
  readonly input: NodeJS.ReadableStream & { readonly isTTY?: boolean };
  readonly output: NodeJS.WritableStream & { readonly isTTY?: boolean };
}

export type GateAnswer = "approved" | "declined" | "unavailable";

/** fd 0 and fd 1 are both terminals, read once at module load. */
const STARTUP_TTY = isatty(0) && isatty(1);

/** The process's own streams, the default of askGate. */
export const PROCESS_STREAMS: GateStreams = { input: process.stdin, output: process.stdout };

/**
 * True when both stdin and stdout are terminals. For the process streams
 * this is the startup isatty value; injected streams (tests) answer by
 * their isTTY.
 */
export function interactive(s: GateStreams): boolean {
  if (s.input === process.stdin && s.output === process.stdout) return STARTUP_TTY;
  return s.input.isTTY === true && s.output.isTTY === true;
}

/**
 * The one prompt: what is written, from which build, any note the person
 * reads before answering (an inferred TPU slot, PROFILE.md 8.1), and that
 * approval names nobody.
 */
export function gatePrompt(o: {
  readonly kind: string; readonly machine: string; readonly chase: string; readonly buildHash: string;
  readonly fail: number; readonly warn: number; readonly path: string; readonly notes?: readonly string[];
}): string {
  // Every string is written through oneLine: a chase id or path that carries ESC or CR cannot redraw the line.
  const h = oneLine(`${o.buildHash.slice(0, 6)}..${o.buildHash.slice(-2)}`);
  const notes = (o.notes ?? []).map((n) => ` ${oneLine(n)}.`).join("");
  return `export ${oneLine(o.kind)} for ${oneLine(o.machine)} from ${oneLine(o.chase)}, build ${h}, ${o.fail} fail, ${o.warn} warn.${notes} writes ${oneLine(o.path)}. this approval does not identify who approved. [y/N] `;
}

/** Ask once. Only y or yes approves; anything else, end of input included, declines. */
export async function askGate(prompt: string, s: GateStreams = PROCESS_STREAMS): Promise<GateAnswer> {
  if (!interactive(s)) return "unavailable";
  const rl = createInterface({ input: s.input, output: s.output, terminal: false });
  try {
    s.output.write(prompt);
    const line = await new Promise<string | undefined>((resolve) => {
      rl.once("line", (l) => resolve(l));
      rl.once("close", () => resolve(undefined));
    });
    return line !== undefined && /^\s*(y|yes)\s*$/i.test(line) ? "approved" : "declined";
  } finally {
    rl.close();
  }
}
