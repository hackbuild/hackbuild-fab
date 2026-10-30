// The one module that touches localStorage (D-123). Keys start `hbf.`; a
// missing store, a throwing accessor (private mode, blocked site data, a
// sandboxed frame) or a full quota reads as undefined and logs once per
// session, so a bench boots the same with storage on, off or throwing.

export const STORAGE_PREFIX = "hbf.";

interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

let warned = false;
let sink: (line: string) => void = (line) => globalThis.console?.warn(line);

/** Route the once-per-session storage line, for a bench log. Returns the previous sink. */
export function setStorageLog(fn: (line: string) => void): (line: string) => void {
  const prev = sink;
  sink = fn;
  return prev;
}

/** Forget that the session already logged, for tests and a fresh boot. */
export function resetStorageWarning(): void {
  warned = false;
}

function warn(e: unknown): void {
  if (warned) return;
  warned = true;
  sink(`storage unavailable, settings last this visit only: ${e instanceof Error ? e.message : String(e)}`);
}

function key(k: string): string {
  return k.startsWith(STORAGE_PREFIX) ? k : STORAGE_PREFIX + k;
}

function store(): Store {
  const s = (globalThis as { localStorage?: Store }).localStorage;
  if (s === undefined || s === null) throw new Error("no localStorage");
  return s;
}

export function get(k: string): string | undefined {
  try {
    return store().getItem(key(k)) ?? undefined;
  } catch (e) {
    warn(e);
    return undefined;
  }
}

/** True when the value was written. */
export function set(k: string, value: string): boolean {
  try {
    store().setItem(key(k), value);
    return true;
  } catch (e) {
    warn(e);
    return false;
  }
}

export function remove(k: string): void {
  try {
    store().removeItem(key(k));
  } catch (e) {
    warn(e);
  }
}
