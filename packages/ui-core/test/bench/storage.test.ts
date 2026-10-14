// M09-T04 steps 1 and 2: storage with localStorage present, missing and
// throwing, and the welcome memory on top of it (D-123, D-125).

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { get, remove, resetStorageWarning, set, setStorageLog } from "../../src/bench/storage.js";
import { createWelcome, welcomeKey, welcomeStarts } from "../../src/bench/welcome.js";

const G = globalThis as { localStorage?: unknown };
let lines: string[] = [];
let prevSink: (line: string) => void;

function memoryStore(): Map<string, string> {
  const m = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => ({
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    }),
  });
  return m;
}

function throwingStore(): void {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => {
      throw new Error("SecurityError: access denied");
    },
  });
}

beforeEach(() => {
  lines = [];
  prevSink = setStorageLog((l) => lines.push(l));
  resetStorageWarning();
});
afterEach(() => {
  setStorageLog(prevSink);
  delete G.localStorage;
});

describe("storage", () => {
  test("keys carry the hbf. prefix and round trip", () => {
    const m = memoryStore();
    expect(set("pip.welcome", "dismissed")).toBe(true);
    expect([...m.keys()]).toEqual(["hbf.pip.welcome"]);
    expect(get("pip.welcome")).toBe("dismissed");
    expect(get("hbf.pip.welcome")).toBe("dismissed");
    remove("pip.welcome");
    expect(get("pip.welcome")).toBeUndefined();
    expect(lines).toEqual([]);
  });

  test("a throwing accessor reads undefined, writes false, and logs once per session", () => {
    throwingStore();
    expect(get("a")).toBeUndefined();
    expect(set("a", "1")).toBe(false);
    remove("a");
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^storage unavailable/);
  });

  test("a missing localStorage reads undefined and logs once", () => {
    expect(get("a")).toBeUndefined();
    expect(get("b")).toBeUndefined();
    expect(lines.length).toBe(1);
  });

  test("a full quota on write returns false", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => ({ getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem: () => undefined }),
    });
    expect(set("a", "1")).toBe(false);
    expect(lines.length).toBe(1);
  });
});

describe("welcome memory", () => {
  test("first boot shows it; dismiss writes the key; the next boot hides it; Guide reopens without clearing", () => {
    const m = memoryStore();
    const opened: boolean[] = [];
    const w = createWelcome("keys-flex-pair", (o) => opened.push(o));
    expect(w.open).toBe(true);
    w.dismiss();
    expect(w.open).toBe(false);
    expect(m.get("hbf.keys-flex-pair.welcome")).toBe("dismissed");
    const next = createWelcome("keys-flex-pair");
    expect(next.open).toBe(false);
    next.reopen();
    expect(next.open).toBe(true);
    expect(m.get(welcomeKey("keys-flex-pair"))).toBe("dismissed");
    expect(createWelcome("keys-flex-pair").open).toBe(false);
    expect(opened).toEqual([false]);
  });

  test("with storage throwing the welcome shows and dismiss still closes it", () => {
    throwingStore();
    const w = createWelcome("pip");
    expect(w.open).toBe(true);
    w.dismiss();
    expect(w.open).toBe(false);
    expect(createWelcome("pip").open).toBe(true);
  });

  test("starts are blank first and primary, then presets in order", () => {
    const s = welcomeStarts([{ id: "one", label: "one key" }, { id: "two", label: "two keys" }]);
    expect(s.map((x) => x.id)).toEqual(["blank", "one", "two"]);
    expect(s.filter((x) => x.primary).map((x) => x.id)).toEqual(["blank"]);
  });
});
