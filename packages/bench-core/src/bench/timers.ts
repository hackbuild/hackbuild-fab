// Timers and the clock are read from globalThis at each call, never captured
// at import, so a test's fake timers and a page's real ones both apply.

export type TimerId = ReturnType<typeof setTimeout>;

export function later(fn: () => void, ms: number): TimerId {
  return globalThis.setTimeout(fn, ms);
}

export function cancel(id: TimerId | undefined): void {
  if (id !== undefined) globalThis.clearTimeout(id);
}

/** Milliseconds from Date.now, which fake timers advance with the timer queue. */
export function nowMs(): number {
  return Date.now();
}
