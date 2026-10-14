// spec/test/errors.test.ts
// The error helpers of spec/errors.ts (D-064, D-182): commandError builds
// every ThrownCommandError with the message "<code> <path> <hint>", and
// didYouMean ranks E_REF candidates by edit distance, closest first, ties
// by name. The lint keeps them the one constructor and the one ranking in
// core and packages; packages/3mf keeps its own copies because it splits
// out standalone (D-027).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { commandError, didYouMean, editDistance, isThrownCommandError } from "../errors";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("commandError", () => {
  test("passes the guard and carries hbf unchanged", () => {
    const hbf = { code: "E_REF", path: "/fit", got: "PSLAP", didYouMean: ["PSLIP"], hint: "name a fit class" } as const;
    const e = commandError(hbf);
    expect(isThrownCommandError(e)).toBe(true);
    expect(e.hbf).toBe(hbf);
  });

  test("message is code, path and hint; no path leaves no gap", () => {
    expect(commandError({ code: "E_SCHEMA", path: "/a/b", hint: "set b" }).message).toBe("E_SCHEMA /a/b set b");
    expect(commandError({ code: "E_GATE", hint: "approve the export" }).message).toBe("E_GATE approve the export");
    expect(commandError({ code: "E_GATE", path: "", hint: "approve the export" }).message).toBe("E_GATE approve the export");
  });
});

describe("didYouMean", () => {
  test("editDistance is Levenshtein", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("abc", "abc")).toBe(0);
  });

  test("closest first, ties by name, at most n", () => {
    expect(didYouMean("PSLAP", ["PRESS", "PSNAP", "PSLID", "PSLIP"])).toEqual(["PSLIP", "PSNAP", "PSLID"]);
    expect(didYouMean("PTEG", ["ABS", "ASA", "TPU", "PLA", "PETG"])).toEqual(["PETG", "PLA", "TPU"]);
    expect(didYouMean("x", ["d", "c", "b", "a"], 2)).toEqual(["a", "b"]);
  });

  test("drops duplicates and got itself; a non-string got ranks against the empty string", () => {
    expect(didYouMean("ab", ["ab", "abc", "abc", "zz"])).toEqual(["abc", "zz"]);
    expect(didYouMean(undefined, ["PETG", "PLA", "ABS", "TPU"])).toEqual(["ABS", "PLA", "TPU"]);
  });
});

describe("one ThrownCommandError constructor and one ranking (D-064)", () => {
  // packages/3mf splits into hackbuild-3mf with its own contracts copy (D-027).
  const STANDALONE = "packages/3mf/";
  const sources = (): string[] => {
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === "dist") continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx|mts|js|mjs|vue)$/.test(name) && !name.endsWith(".d.ts")) out.push(relative(ROOT, p));
      }
    };
    const roots = ["core/src", "kernel/src", ...readdirSync(join(ROOT, "packages")).map((p) => `packages/${p}/src`)];
    for (const r of roots) {
      try {
        if (statSync(join(ROOT, r)).isDirectory()) walk(join(ROOT, r));
      } catch {
        // a package with no src yet (D-026 placeholder)
      }
    }
    return out.filter((f) => !f.startsWith(STANDALONE));
  };

  test("no hand-built ThrownCommandError: no Error assigned an hbf, no Error subclass holding one", () => {
    const files = sources();
    expect(files.length).toBeGreaterThan(50);
    const hits = files.filter((f) => {
      const src = readFileSync(join(ROOT, f), "utf8");
      return /Object\.assign\(\s*new Error\([^\n]*\{\s*hbf\s*\}/.test(src) || /extends Error\s*\{[^}]*\bhbf\b/.test(src);
    });
    expect(hits).toEqual([]);
  });

  test("no second editDistance", () => {
    const hits = sources().filter((f) => /function\s+editDistance\b/.test(readFileSync(join(ROOT, f), "utf8")));
    expect(hits).toEqual([]);
  });
});
