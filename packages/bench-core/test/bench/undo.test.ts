// M09-T03 step 4: PIP HIST (bench/part2.js lines 31 to 43), 450 ms and 80
// deep, typed here from the source.

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createHistory } from "../../src/bench/undo.js";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test("a snapshot lands 450 ms after the last schedule, not at 449 ms", () => {
  let s = "a";
  const h = createHistory(() => s);
  h.schedule();
  vi.advanceTimersByTime(300);
  s = "b";
  h.schedule();
  vi.advanceTimersByTime(449);
  expect(h.size).toBe(0);
  vi.advanceTimersByTime(1);
  expect(h.size).toBe(1);
  expect(h.undo()).toBeUndefined();
});

test("identical snapshots are skipped", () => {
  const h = createHistory(() => "same");
  h.now();
  h.now();
  h.schedule();
  vi.advanceTimersByTime(450);
  expect(h.size).toBe(1);
});

test("81 snapshots keep 80, oldest dropped", () => {
  let n = 0;
  const h = createHistory(() => String(n));
  for (let i = 1; i <= 81; i++) {
    n = i;
    h.now();
  }
  expect(h.size).toBe(80);
  expect(h.index).toBe(79);
  for (let k = 0; k < 79; k++) n = Number(h.undo() ?? n);
  expect(h.undo()).toBeUndefined();
  expect(String(n)).toBe("2");
});

test("a snapshot after undo cuts the redo branch", () => {
  let s = "1";
  const h = createHistory(() => s);
  h.now();
  s = "2";
  h.now();
  s = h.undo() ?? s;
  expect(s).toBe("1");
  s = "3";
  h.now();
  expect(h.redo()).toBeUndefined();
  expect(h.size).toBe(2);
});
