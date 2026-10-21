// M03-T07: the opacity floor is profile data with provenance and the
// classifier is code. Expected luminances are the card's table (computed on
// 2026-10-04 from the WCAG 2 formula); the floors are checked against the
// card's acceptance rows and against print-reality.md read from disk, never
// against the data file the port reads.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { sourcePath } from "../../../tools/test-support/originals-root.js";
import { fileURLToPath } from "node:url";
import { PROFILE_DATA, createProfileLookup, loadProfile, tablesFromData } from "@hackbuild/profile";
import { isThrownCommandError, type Constant, type ProfileLookup } from "@hackbuild/spec";
import { describe, expect, test } from "vitest";
import {
  OPACITY_DARK_OVER_LIGHT_ID, OPACITY_LIGHT_OVER_DARK_ID, opacityFloor, relLuminance,
} from "../src/opacity.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const lookup = (): ReturnType<typeof createProfileLookup> => createProfileLookup(loadProfile());
const codeOf = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return isThrownCommandError(e) ? e.hbf.code : `not a command error: ${String(e)}`; }
  return undefined;
};

const LAYER = 0.24;
const CREAM = "#F5F0E6";
const INK = "#1A1A1A";
const PINK = "#FE0386";

describe("relative luminance (card table, computed)", () => {
  test.each([
    ["#1A1A1A", 0.0103], ["#F5F0E6", 0.8745], ["#FE0386", 0.2286],
    ["#FFFFFF", 1.0], ["#000000", 0.0], ["#2B6CB0", 0.1437],
  ])("%s reads %d", (hex, want) => {
    expect(relLuminance(hex)).toBeCloseTo(want, 4);
  });

  test("short hex and a missing # read as the long form; a bad colour is E_SCHEMA", () => {
    expect(relLuminance("fff")).toBe(relLuminance("#FFFFFF"));
    expect(codeOf(() => relLuminance("#12345"))).toBe("E_SCHEMA");
  });
});

describe("opacityFloor, card acceptance", () => {
  test("COLLAR cream #F5F0E6 over black #1A1A1A: light over dark, floor 1.2 (inferred)", () => {
    const f = opacityFloor(CREAM, INK, LAYER, lookup());
    expect([f.rule, f.floor, f.constant, f.qualification]).toEqual([
      "light-over-dark", 1.2, OPACITY_LIGHT_OVER_DARK_ID, { qualifier: "inferred", basis: "inferred" },
    ]);
  });

  test("COLLAR pink #FE0386 over black #1A1A1A: light over dark, floor 1.2, at any layer height", () => {
    for (const layer of [0.12, 0.2, 0.24, 0.28]) {
      const f = opacityFloor(PINK, INK, layer, lookup());
      expect([f.rule, f.floor]).toEqual(["light-over-dark", 1.2]);
    }
  });

  test("SPRUE black #000000 in white #FFFFFF at layer 0.24: dark over light, floor 0.48 (computed)", () => {
    const f = opacityFloor("#000000", "#FFFFFF", LAYER, lookup());
    expect([f.rule, f.floor, f.constant, f.qualification]).toEqual([
      "dark-over-light", 0.48, OPACITY_DARK_OVER_LIGHT_ID, { qualifier: "computed", basis: "inferred" },
    ]);
  });

  test("dark over light scales with the layer: 0.40 at 0.20 (computed)", () => {
    expect(opacityFloor(INK, CREAM, 0.2, lookup()).floor).toBeCloseTo(0.4, 12);
  });

  test("equal luminance takes the dark over light floor (the inlay must exceed the colour under it)", () => {
    expect(opacityFloor(INK, INK, LAYER, lookup()).rule).toBe("dark-over-light");
    expect(opacityFloor("#FFFFFF", "#ffffff", LAYER, lookup()).floor).toBeCloseTo(0.48, 12);
  });

  test("pink over cream is dark over light; cream over pink is light over dark", () => {
    expect(opacityFloor(PINK, CREAM, LAYER, lookup()).rule).toBe("dark-over-light");
    expect(opacityFloor(CREAM, PINK, LAYER, lookup()).rule).toBe("light-over-dark");
  });

  test("the bound is a profile floor on the depth with the numbers that set it", () => {
    const light = opacityFloor(CREAM, INK, LAYER, lookup()).bound;
    expect(light).toMatchObject({ value: 1.2, side: "lo", kernel: "profile", source: OPACITY_LIGHT_OVER_DARK_ID, qualifier: "inferred", basis: "inferred" });
    expect(light.reason).toBe("light over dark: inlay #F5F0E6 luminance 0.8745 over #1A1A1A 0.0103 (computed), floor 1.20 mm (inferred)");
    const dark = opacityFloor("#000000", "#FFFFFF", LAYER, lookup()).bound;
    expect(dark).toMatchObject({ value: 0.48, side: "lo", kernel: "profile", source: OPACITY_DARK_OVER_LIGHT_ID, qualifier: "computed", basis: "inferred" });
    expect(dark.reason).toBe("dark over light: inlay #000000 luminance 0.0000 over #FFFFFF 1.0000 (computed), floor 2 layers x 0.24 mm = 0.48 mm (computed)");
  });

  test("a layer height of 0 or below is E_SCHEMA", () => {
    expect(codeOf(() => opacityFloor(INK, CREAM, 0, lookup()))).toBe("E_SCHEMA");
    expect(codeOf(() => opacityFloor(INK, CREAM, Number.NaN, lookup()))).toBe("E_SCHEMA");
  });
});

describe("profile rows (M00 ProfileLookup)", () => {
  test("both rows read back with tier inferred, method failure, machine ffc5p at layer 0.24", () => {
    const p = lookup();
    const rows = [p.constant(OPACITY_LIGHT_OVER_DARK_ID), p.constant(OPACITY_DARK_OVER_LIGHT_ID)];
    expect(rows.map((c) => [c.id, c.value, c.unit, c.provenance.tier, c.provenance.method, c.provenance.machine, c.provenance.conditions?.layer])).toEqual([
      [OPACITY_LIGHT_OVER_DARK_ID, 1.2, "mm", "inferred", "failure", "ffc5p", 0.24],
      [OPACITY_DARK_OVER_LIGHT_ID, 2, "layers", "inferred", "failure", "ffc5p", 0.24],
    ]);
    for (const c of rows) expect(c.provenance.source).toMatch(/print-reality\.md line/);
  });

  test("a floor records exactly the row it read, so profileHash covers it", () => {
    const light = lookup();
    opacityFloor(PINK, INK, LAYER, light);
    expect(light.reads()).toEqual([{ table: "constant", id: OPACITY_LIGHT_OVER_DARK_ID }]);
    const dark = lookup();
    opacityFloor("#000000", "#FFFFFF", LAYER, dark);
    expect(dark.reads()).toEqual([{ table: "constant", id: OPACITY_DARK_OVER_LIGHT_ID }]);
    expect(light.profileHash()).not.toBe(dark.profileHash());
  });

  test("the rows load from data/opacity.json: without it both ids are E_REF", () => {
    const p = createProfileLookup(tablesFromData({ ...PROFILE_DATA, opacity: undefined }));
    expect(codeOf(() => p.constant(OPACITY_LIGHT_OVER_DARK_ID))).toBe("E_REF");
    expect(codeOf(() => p.constant(OPACITY_DARK_OVER_LIGHT_ID))).toBe("E_REF");
  });

  test("an opacity id also listed in constants.json, or an opacity file without rows, is E_SCHEMA", () => {
    const base = PROFILE_DATA.constants as { constants: unknown[] };
    const op = PROFILE_DATA.opacity as { constants: unknown[] };
    const twice = { ...base, constants: [...base.constants, op.constants[0]] };
    expect(codeOf(() => tablesFromData({ ...PROFILE_DATA, constants: twice }))).toBe("E_SCHEMA");
    expect(codeOf(() => tablesFromData({ ...PROFILE_DATA, opacity: { constants: {} } }))).toBe("E_SCHEMA");
  });

  test("a row in the wrong unit is E_SCHEMA, never a floor", () => {
    const real = lookup();
    const swap = (id: string, edit: Partial<Constant>): Pick<ProfileLookup, "constant"> => ({
      constant: (x: string) => (x === id ? { ...real.constant(x), ...edit } : real.constant(x)),
    });
    expect(codeOf(() => opacityFloor(CREAM, INK, LAYER, swap(OPACITY_LIGHT_OVER_DARK_ID, { unit: "layers" })))).toBe("E_SCHEMA");
    expect(codeOf(() => opacityFloor(INK, CREAM, LAYER, swap(OPACITY_DARK_OVER_LIGHT_ID, { unit: "mm" })))).toBe("E_SCHEMA");
    expect(codeOf(() => opacityFloor(INK, CREAM, LAYER, swap(OPACITY_DARK_OVER_LIGHT_ID, { value: 0 })))).toBe("E_SCHEMA");
  });
});

describe("independent sources", () => {
  const lineage = JSON.parse(readFileSync(root + "lineage.json", "utf8")) as { id: string; kind: string; source: string; sha256: string; dest: string | null }[];
  const canon = lineage.find((r) => r.id.startsWith("knowledge.print-reality/") && r.kind === "canonical");

  test("print-reality.md, at the canonical sha256, states 1.2 mm light over dark and two layers (0.48 at 0.24) dark over light", (ctx) => {
    if (canon === undefined) return ctx.skip();
    const src = sourcePath(canon.source);
    if (!existsSync(src)) return ctx.skip();
    const buf = readFileSync(src);
    expect(createHash("sha256").update(buf).digest("hex")).toBe(canon.sha256);
    const lines = buf.toString("utf8").split("\n");
    // Card cites lines 22 and 23 to 26 (1-based).
    expect(lines[19]).toMatch(/at 0\.24 mm layers/);
    const dark = /dark over light hides in (\w+) layers \(([\d.]+) mm\)/.exec(lines[21] ?? "");
    const light = /light over dark needs about ([\d.]+) mm/.exec(lines[22] ?? "");
    expect(dark?.[1]).toBe("two");
    expect(light).not.toBeNull();
    const p = lookup();
    expect(p.constant(OPACITY_DARK_OVER_LIGHT_ID).value).toBe(2);
    expect(opacityFloor("#000000", "#FFFFFF", 0.24, p).floor).toBeCloseTo(Number(dark?.[2]), 12);
    expect(opacityFloor(CREAM, INK, 0.24, p).floor).toBe(Number(light?.[1]));
  });

  test("lineage carries a row from the canonical print-reality.md for each file the port wrote", () => {
    for (const dest of ["packages/profile/data/opacity.json", "packages/inlay/src/opacity.ts"]) {
      const r = lineage.find((x) => x.dest === dest);
      expect(r?.id, dest).toMatch(/^knowledge\.print-reality\//);
      expect(r?.sha256, dest).toBe(canon?.sha256);
    }
  });
});
