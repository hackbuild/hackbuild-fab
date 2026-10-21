// hbf capabilities (R1-designs-reach-15) through the CLI on this workspace.
// The expectations come from the sources the command reads, walked here
// on their own: the registered COMMANDS, the reference folders on disk,
// designs/*/chase.ts, and the headings of knowledge/designs/INDEX.md and
// MECHANISMS.md read with a plain line scan.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Capabilities } from "../src/commands/capabilities.js";
import { COMMANDS } from "../src/registry.js";
import { ROOT, hbf } from "./hbf.js";

async function caps(...extra: string[]): Promise<{ code: number; c: Capabilities }> {
  const { code, out } = await hbf(["capabilities", ...extra, "--json"]);
  return { code, c: JSON.parse(out) as Capabilities };
}

const dirs = (p: string): string[] => readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);

describe("hbf capabilities (R1-designs-reach-15)", () => {
  it("lists every registered command exactly once", async () => {
    const { code, c } = await caps();
    expect(code).toBe(0);
    const listed = c.functions.flatMap((f) => f.commands.map((x) => x.name));
    expect(COMMANDS.length).toBeGreaterThan(0);
    for (const def of COMMANDS) expect(listed.filter((n) => n === def.name), def.name).toHaveLength(1);
    expect(listed).toHaveLength(COMMANDS.length);
    expect(c.functions.find((f) => f.function === "read")?.commands.map((x) => x.name)).toContain("circuit.solve");
  });

  it("places designs/collar under face, with its record, and every design with a chase.ts somewhere", async () => {
    const { c } = await caps();
    const face = c.functions.find((f) => f.function === "face");
    expect(face?.designs.find((d) => d.id === "collar")).toEqual({ id: "collar", path: "designs/collar", family: "coins-inlay", record: "knowledge/designs/collar.md" });
    const onDisk = dirs(path.join(ROOT, "designs")).filter((d) => existsSync(path.join(ROOT, "designs", d, "chase.ts"))).map((d) => `designs/${d}`).sort();
    expect(onDisk).toContain("designs/collar");
    expect(c.functions.flatMap((f) => f.designs.map((d) => d.path)).sort()).toEqual(onDisk);
    expect(c.unplaced).toEqual([]);
  });

  it("lists every reference folder with a README once, with its covers line", async () => {
    const { c } = await caps();
    const base = path.join(ROOT, "reference");
    const onDisk = dirs(base).filter((a) => a !== "node_modules").flatMap((a) => dirs(path.join(base, a))
      .filter((id) => !id.startsWith("_") && existsSync(path.join(base, a, id, "README.md"))).map((id) => `reference/${a}/${id}`)).sort();
    const listed = c.functions.flatMap((f) => f.references);
    expect(listed.map((r) => r.path).sort()).toEqual(onDisk);
    const collar = listed.find((r) => r.path === "reference/cosmetic/coin-inlay");
    expect(collar?.covers).toContain("CHK-INL-01");
  });

  it("anchors every MECHANISMS.md section and INDEX.md family once", async () => {
    const { c } = await caps();
    const mech = readFileSync(path.join(ROOT, "knowledge/designs/MECHANISMS.md"), "utf8").split("\n").filter((l) => /^## \d+\. /.test(l));
    const anchors = c.functions.flatMap((f) => f.knowledge);
    expect(anchors.filter((k) => k.file.endsWith("MECHANISMS.md"))).toHaveLength(mech.length);
    expect(c.functions.find((f) => f.function === "key")?.knowledge.map((k) => k.anchor))
      .toContain("knowledge/designs/MECHANISMS.md#1-buttons-and-keys-the-spring-buttons-and-their-kin");
    const index = readFileSync(path.join(ROOT, "knowledge/designs/INDEX.md"), "utf8").split("\n");
    const families = index.flatMap((l, i) => (/^## /.test(l) && index.slice(i + 1).find((x) => /^## |^\| \*\*/.test(x))?.startsWith("| **") === true ? [l.slice(3)] : []));
    expect(families).toContain("coins-inlay");
    expect(anchors.filter((k) => k.file.endsWith("INDEX.md")).map((k) => k.heading).sort()).toEqual([...families].sort());
  });

  it("computes every count from its list, and the totals from the rows", async () => {
    const { c } = await caps();
    const keys = ["commands", "archetypes", "references", "designs", "knowledge", "slicers"] as const;
    for (const f of c.functions) for (const k of keys) expect(f.counts[k], `${f.function} ${k}`).toBe(f[k].length);
    for (const k of keys) expect(c.counts[k], k).toBe(c.functions.reduce((n, f) => n + f[k].length, 0));
    const slice = c.functions.find((f) => f.function === "slice");
    expect(slice?.slicers).toEqual([]);
    expect(slice?.notes.join(" ")).toMatch(/no slicer probe/);
  });

  it("--function keeps one row; an unknown function is E_REF with a suggestion", async () => {
    const { code, c } = await caps("--function", "face");
    expect(code).toBe(0);
    expect(c.functions.map((f) => f.function)).toEqual(["face"]);
    expect(c.counts.designs).toBe(c.functions[0]!.designs.length);
    const bad = await hbf(["capabilities", "--function", "fase", "--json"]);
    expect(bad.code).not.toBe(0);
    const r = JSON.parse(bad.out) as { errors: { code: string; didYouMean?: string[] }[] };
    expect(r.errors[0]?.code).toBe("E_REF");
    expect(r.errors[0]?.didYouMean).toContain("face");
  });

  it("prints a text mirror with one head line per function", async () => {
    const { code, out } = await hbf(["capabilities"]);
    expect(code).toBe(0);
    expect(out).toMatch(/^face\s+make a coin, tag or face {2}commands \d+, archetypes \d+/m);
    expect(out).toContain("designs/collar");
  });
});
