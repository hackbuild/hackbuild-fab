// Test helpers: run the CLI in process with captured output, and the
// workspace paths the core tests read.

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CommandResult } from "@hackbuild/spec";
import { main, type Io } from "../src/main.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const REF = "reference/keys/flex-pair";
export const BIN = path.join(ROOT, "core", "bin", "hbf.mjs");

export async function hbf(argv: readonly string[], io: Partial<Io> = {}): Promise<{ code: number; out: string }> {
  let out = "";
  const code = await main(argv, ROOT, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; }, ...io });
  return { code, out };
}

export async function json(...argv: string[]): Promise<{ code: number; r: CommandResult<Record<string, unknown>> }> {
  const { code, out } = await hbf([...argv, "--json"]);
  return { code, r: JSON.parse(out) as CommandResult<Record<string, unknown>> };
}
