// Undo history as JSON snapshots of the design state, ported from PIP
// bench/part2.js HIST (lines 31 to 43): a snapshot 450 ms after the last
// commit, an identical snapshot skipped, 80 deep with the oldest dropped,
// undo takes a pending snapshot first.

import { cancel, later, type TimerId } from "./timers.js";

/** Delay from the last commit to its snapshot, ms (PIP part2.js line 40). */
export const UNDO_SNAPSHOT_MS = 450;
/** Snapshots kept, count (PIP part2.js line 37). */
export const UNDO_DEPTH = 80;

export interface History {
  /** Snapshot after UNDO_SNAPSHOT_MS; a later call restarts the wait. */
  schedule(): void;
  /** Snapshot now, cancelling a pending one. */
  now(): void;
  /** Step back; returns the snapshot to load, or undefined at the oldest. */
  undo(): string | undefined;
  /** Step forward; returns the snapshot to load, or undefined at the newest. */
  redo(): string | undefined;
  /** Snapshots held, count. */
  readonly size: number;
  /** Index of the current snapshot. */
  readonly index: number;
  /** Drop every snapshot and any pending one. */
  clear(): void;
}

export function createHistory(read: () => string, depth = UNDO_DEPTH, delayMs = UNDO_SNAPSHOT_MS): History {
  let stack: string[] = [];
  let i = -1;
  let timer: TimerId | undefined;

  const now = (): void => {
    cancel(timer);
    timer = undefined;
    const s = read();
    if (stack[i] === s) return;
    stack = stack.slice(0, i + 1);
    stack.push(s);
    if (stack.length > depth) stack.shift();
    i = stack.length - 1;
  };

  return {
    schedule() {
      cancel(timer);
      timer = later(now, delayMs);
    },
    now,
    undo() {
      now();
      if (i <= 0) return undefined;
      i -= 1;
      return stack[i];
    },
    redo() {
      if (i >= stack.length - 1) return undefined;
      i += 1;
      return stack[i];
    },
    get size() {
      return stack.length;
    },
    get index() {
      return i;
    },
    clear() {
      cancel(timer);
      timer = undefined;
      stack = [];
      i = -1;
    },
  };
}
