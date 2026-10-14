// hbf doctor board section (M08-T01 step 6). The pins come from a temp
// workspace's packages/board/package.json and node_modules, written here,
// never from the code under test; a moved install fails, a blocked pin
// warns with its recorded reason, and a uv run that cannot start is
// reported not run.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { boardDoctor, doctor } from "../src/commands/doctor.js";

const temps: string[] = [];
afterAll(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });

function workspace(installed: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "hbf-doctor-board-"));
  temps.push(root);
  const put = (rel: string, v: unknown): void => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), typeof v === "string" ? v : JSON.stringify(v));
  };
  put("package.json", { name: "x", engines: { node: ">=0.0.0" }, overrides: { kicadts: { typescript: "7.0.2" }, leftpad: "1.0.0" } });
  put("packages/board/package.json", {
    dependencies: { "@hackbuild/spec": "0.1.0", kicadts: "0.0.58", "circuit-json": "0.0.525" },
    hbf: { pinsBlocked: { tscircuit: "0.0.2806" }, blockedBy: "engines node 24.x" },
  });
  put("packages/mesh/package.json", { dependencies: { "manifold-3d": "3.5.4" } });
  for (const [name, version] of Object.entries(installed)) put(`node_modules/${name}/package.json`, { name, version });
  put("tools/py/pyproject.toml", '[project]\ndependencies = [\n  "gerbonara==1.6.3",\n]\n');
  return root;
}

describe("board doctor", () => {
  it("lists every pin, skips workspace packages and reads overrides at both depths", () => {
    const b = boardDoctor(workspace({ kicadts: "0.0.58", "circuit-json": "0.0.525" }));
    expect(b.pins.map((p) => `${p.name}@${p.pin}:${p.installed ?? "absent"}`)).toEqual([
      "circuit-json@0.0.525:0.0.525", "kicadts@0.0.58:0.0.58", "tscircuit@0.0.2806:absent",
    ]);
    expect(b.pins.find((p) => p.name === "tscircuit")?.blocked).toBe("engines node 24.x");
    expect(b.overrides).toEqual(["kicadts > typescript 7.0.2", "leftpad 1.0.0"]);
  });

  it("an installed version off its pin fails; a blocked pin warns", () => {
    const root = workspace({ kicadts: "0.0.53", "circuit-json": "0.0.525" });
    const lines = doctor(root);
    expect(lines.find((l) => l.item === "board pins")?.status).toBe("fail");
    expect(lines.find((l) => l.item === "board pins")?.detail).toContain("kicadts 0.0.53 (pin 0.0.58)");
    expect(lines.find((l) => l.item === "board blocked")).toMatchObject({ status: "warn" });
  });

  it("every pin installed reads ok", () => {
    const lines = doctor(workspace({ kicadts: "0.0.58", "circuit-json": "0.0.525" }));
    expect(lines.find((l) => l.item === "board pins")?.status).toBe("ok");
  });
});
