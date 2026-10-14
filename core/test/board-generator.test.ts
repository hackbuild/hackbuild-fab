// A direct board generator is design code (D-201). On darwin core runs it
// under sandbox-exec (core/src/board.ts runGenerator): a gen.py that opens a
// socket, writes outside the fresh folder of its run, or starts a program
// other than the tools/py interpreter stops with E_KERNEL record
// build-sandbox/generator, and the outside write never lands. Elsewhere the
// generator runs unconfined and this file is not run.

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { runGenerator } from "../src/board.js";
import { ROOT } from "./hbf.js";

const tmp = mkdtempSync(path.join(tmpdir(), "hbf-generator-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** A generator in its own folder, and a fresh run folder for it; the run writes <box>/run. */
function setup(name: string, body: string): { readonly gen: string; readonly box: string; readonly outside: string } {
  const dir = path.join(tmp, name);
  mkdirSync(path.join(dir, "box"), { recursive: true });
  const outside = path.join(dir, "escape.txt");
  writeFileSync(path.join(dir, "gen.py"), `import os, socket, subprocess, sys\nOUT = sys.argv[sys.argv.index("--out") + 1]\nOUTSIDE = ${JSON.stringify(outside)}\n${body}\n`);
  return { gen: path.join(dir, "gen.py"), box: path.join(dir, "box"), outside };
}

function stop(name: string, body: string): { readonly code: string; readonly record?: string | undefined; readonly outside: string } {
  const s = setup(name, body);
  try {
    runGenerator(ROOT, s.gen, path.join(s.box, "run"), 315532800, "uv", s.box);
  } catch (e) {
    if (isThrownCommandError(e)) return { code: e.hbf.code, record: e.hbf.record, outside: s.outside };
    throw e;
  }
  return { code: "none", outside: s.outside };
}

describe.skipIf(process.platform !== "darwin")("the generator confinement", () => {
  it("a write outside the run folder: E_KERNEL build-sandbox/generator, the file never lands", () => {
    const r = stop("write", "open(OUTSIDE, \"w\").write(\"x\")");
    expect([r.code, r.record]).toEqual(["E_KERNEL", "build-sandbox/generator"]);
    expect(existsSync(r.outside)).toBe(false);
  }, 120_000);

  it("a socket: E_KERNEL build-sandbox/generator", () => {
    const r = stop("socket", "socket.create_connection((\"127.0.0.1\", 9), timeout=2)");
    expect([r.code, r.record]).toEqual(["E_KERNEL", "build-sandbox/generator"]);
  }, 120_000);

  it("a child program: E_KERNEL build-sandbox/generator", () => {
    const r = stop("child", "subprocess.run([\"/usr/bin/touch\", OUTSIDE], check=True)");
    expect([r.code, r.record]).toEqual(["E_KERNEL", "build-sandbox/generator"]);
    expect(existsSync(r.outside)).toBe(false);
  }, 120_000);

  it("a write inside --out is allowed: a generator that writes no record is the ordinary E_KERNEL of board-pcb", () => {
    const r = stop("inside", "os.makedirs(OUT)\nopen(os.path.join(OUT, \"note.txt\"), \"w\").write(\"x\")");
    expect([r.code, r.record]).toEqual(["E_KERNEL", "board-pcb"]);
  }, 120_000);
});
