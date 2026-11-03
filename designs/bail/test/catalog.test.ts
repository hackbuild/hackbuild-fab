// designs/bail: the chase carries the numbers of its hardware rows as param
// defaults, and build.ts carries the kit tip numbers, because a build reads
// params only. This holds each copy equal to the catalog row it names
// (packages/catalog/data/connectors/bail-*.json), so a corrected row fails
// here until the copy follows. bail-back-flap has no param default: no
// preset or default reads it (README, "Hardware").

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { BuildWarning, PartDraft } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { loadGeom } from "@hackbuild/geom";
import { makeAuthor, resolveParams } from "@hackbuild/pipeline";
import { build } from "../build";
import { chase, type BailParams } from "../chase";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const ROWS = path.join(ROOT, "packages", "catalog", "data", "connectors");

interface Row {
  readonly id: string;
  readonly fields: Record<string, { readonly value: number; readonly unit: string; readonly provenance: { readonly tier: string } }>;
}
const row = (id: string): Row => JSON.parse(readFileSync(path.join(ROWS, `${id}.json`), "utf8")) as Row;
const dim = (r: Row, key: string): number => {
  const f = r.fields[`dims.${key}`];
  if (f === undefined) throw new Error(`${r.id} has no dims.${key}`);
  return f.value;
};
interface Field { readonly id: string; readonly default?: unknown; readonly help?: string }
const fields: readonly Field[] = chase.params.flatMap((g) => g.fields as readonly Field[]);
const fallback = (id: string): unknown => {
  const f = fields.find((x) => x.id === id);
  if (f === undefined || f.default === undefined) throw new Error(`no default for ${id}`);
  return f.default;
};

describe("the chase defaults equal the catalog rows they copy", () => {
  const cord = row("bail-cord-saintrygo4"), clip = row("bail-back-uclip");

  test("cord is the cord row diameter", () => {
    expect(fallback("cord")).toBe(dim(cord, "diameter"));
  });

  test("hwW, hwL, plateT and hole are the U slide clip row", () => {
    expect(fallback("hwW")).toBe(dim(clip, "width"));
    expect(fallback("hwL")).toBe(dim(clip, "length"));
    expect(fallback("plateT")).toBe(dim(clip, "plateT"));
    expect(fallback("hole")).toBe(dim(clip, "hole"));
  });

  test("the kit tip numbers in build.ts equal bail-tips-kit32", async () => {
    const kit = row("bail-tips-kit32");
    const warnings: BuildWarning[] = [];
    const values = resolveParams(chase, undefined, "custom") as unknown as BailParams;
    (await build(values, makeAuthor(chase, createProfileLookup(loadProfile()), warnings, [], await loadGeom()))) as PartDraft;
    const text = warnings.find((w) => w.code === "KIT_TIPS")?.text ?? "";
    const m = /catalog row (\S+) \(([\d.]+) x ([\d.]+) mm, ([\d.]+) mm bore/.exec(text);
    expect(m, text).not.toBeNull();
    expect(m?.[1]).toBe(kit.id);
    expect(Number(m?.[2])).toBe(dim(kit, "length"));
    expect(Number(m?.[3])).toBe(dim(kit, "diameter"));
    expect(Number(m?.[4])).toBe(dim(kit, "bore"));
    // The refusal threshold is the row bore plus 0.05 mm (bail.html line 1977): the text names it.
    expect(text).toContain(`legal to ${dim(kit, "bore") + 0.05} mm`);
  });

  test("every row copied here is tier inferred, as the chase and the warnings say", () => {
    for (const id of ["bail-cord-saintrygo4", "bail-back-uclip", "bail-tips-kit32"]) {
      const r = row(id);
      for (const [key, f] of Object.entries(r.fields)) expect(f.provenance.tier, `${id} ${key}`).toBe("inferred");
    }
  });

  test("the help text of the copied fields names their rows", () => {
    const help = (id: string): string => fields.find((x) => x.id === id)?.help ?? "";
    expect(help("cord")).toContain("bail-cord-saintrygo4");
    expect(help("hwW")).toContain("bail-back-uclip");
    expect(help("tips")).toContain("bail-tips-kit32");
  });
});
