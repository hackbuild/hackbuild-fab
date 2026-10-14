// The single-use nonce ledger (M12-T04 step 2): <workspace>/.hbf/gate-used.jsonl
// under the lock file .hbf/gate-used.lock, taken with O_CREAT|O_EXCL. A
// stdio server and an --http server on one repo share it, so one state is
// spent once across both. A lock held past the 2 s budget refuses the
// nonce, which reads as replayed and writes nothing.

import { appendFileSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import type { NonceLedger } from "./gate.js";

/** Lock retry interval and budget, ms. */
const LOCK_RETRY_MS = 50;
const LOCK_BUDGET_MS = 2000;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export class FileNonceLedger implements NonceLedger {
  private readonly file: string;
  private readonly lock: string;

  constructor(workspace: string) {
    const dir = path.join(workspace, ".hbf");
    mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "gate-used.jsonl");
    this.lock = path.join(dir, "gate-used.lock");
  }

  consume(nonce: string, exp: number): boolean {
    const start = Date.now();
    let fd: number | undefined;
    while (fd === undefined) {
      try {
        fd = openSync(this.lock, "wx", 0o600);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        if (Date.now() - start > LOCK_BUDGET_MS) return false;
        sleepSync(LOCK_RETRY_MS);
      }
    }
    try {
      const used = existsSync(this.file)
        ? readFileSync(this.file, "utf8").split("\n").filter((l) => l.trim() !== "").some((l) => {
          try {
            return (JSON.parse(l) as { nonce?: unknown }).nonce === nonce;
          } catch {
            return false;
          }
        })
        : false;
      if (used) return false;
      appendFileSync(this.file, `${JSON.stringify({ nonce, exp })}\n`);
      const out = openSync(this.file, "r+");
      try {
        fsyncSync(out);
      } finally {
        closeSync(out);
      }
      return true;
    } finally {
      closeSync(fd);
      unlinkSync(this.lock);
    }
  }
}
