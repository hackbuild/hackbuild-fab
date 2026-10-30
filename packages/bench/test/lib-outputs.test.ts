import { describe, expect, it } from "vitest";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { allowedImports, builtOutputs, cdnPath, importSpecifiers, loadIife, pkgOf } from "../../../tools/test-support/lib-outputs.js";

const pkg = pkgOf("bench");
const KEYS = "createBench,BenchShell,useShell".split(",");

describe.skipIf(!builtOutputs(pkg))("bench library outputs (npm run build:lib)", () => {
  it("the iife defines the package global with its key exports", () => {
    const ctx = loadIife("bench");
    const g = vm.runInContext(pkg.global, ctx) as Record<string, unknown>;
    for (const k of KEYS) expect(g[k], k).toBeDefined();
  });

  it("the cdn file imports only the peers and the other published packages", () => {
    const found = importSpecifiers(readFileSync(cdnPath(pkg), "utf8"));
    const allowed = allowedImports("bench");
    for (const s of found) expect(allowed.some((a) => s === a || s.startsWith(a + "/")), s).toBe(true);
  });
});
