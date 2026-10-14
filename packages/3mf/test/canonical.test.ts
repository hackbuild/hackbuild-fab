// One canonical JSON for every hash a package computes (D-051, D-206).
// profileHash (profile), partContentHashOf (mesh) and the chase record of
// the writer (3mf) each go through spec/jcs.ts canonicalize. The inputs
// below are the shapes three earlier package copies disagreed on: an
// undefined array slot, an undefined member, -0, a typed array and a
// non-finite number. Each path must give the spec bytes or the spec error.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { CanonicalizeError, canonicalize, isThrownCommandError, sha256Hex, type Vec3 } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { partContentHashOf, type UnhashedPart } from "@hackbuild/mesh";
import { build, type BuildConfig } from "../src/index.js";
import { box, EPOCH } from "./cube.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** The shapes the earlier copies split on, all legal for spec canonicalize. */
const EDGE = { slot: [1, undefined], gone: undefined, neg: -0, run: Float64Array.of(1.5, 2) };
const EDGE_JSON = '{"neg":0,"run":[1.5,2],"slot":[1,null]}';

describe("spec canonicalize on the edge shapes", () => {
  it("writes the one form", () => {
    expect(canonicalize(EDGE)).toBe(EDGE_JSON);
    expect(canonicalize([1, undefined])).toBe("[1,null]");
    expect(canonicalize(undefined)).toBe("null");
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => canonicalize({ a: bad })).toThrow(CanonicalizeError);
    }
  });
});

describe("profileHash goes through spec canonicalize (profile)", () => {
  const tables = loadProfile();
  const base = tables.materials[0]!;
  const withExtra = (extra: unknown) => {
    const row = { ...base, extra } as typeof base;
    return createProfileLookup({ ...tables, materials: [row, ...tables.materials.slice(1)] });
  };

  it("hashes the edge shapes to the spec bytes", () => {
    const p = withExtra(EDGE);
    p.material(base.id);
    const text = canonicalize(p.readSet());
    expect(text).toContain(`"extra":${EDGE_JSON}`);
    expect(p.profileHash()).toBe(sha256Hex(text));
  });

  it("refuses a non-finite number as E_SCHEMA at its pointer", () => {
    const p = withExtra({ bad: Number.POSITIVE_INFINITY });
    p.material(base.id);
    let thrown: unknown;
    try {
      p.profileHash();
    } catch (e) {
      thrown = e;
    }
    expect(isThrownCommandError(thrown)).toBe(true);
    if (!isThrownCommandError(thrown)) return;
    expect([thrown.hbf.code, thrown.hbf.path]).toEqual(["E_SCHEMA", "/0/row/extra/bad"]);
  });
});

describe("partContentHashOf goes through spec canonicalize (mesh)", () => {
  const part = (metrics: unknown): UnhashedPart => ({
    id: "p", name: "p",
    bodies: [{ id: "b", role: "solid", slot: 1, material: "petg", mesh: { hash: "m".repeat(64) } }],
    solid: { hash: "s".repeat(64) },
    metrics, warnings: [],
  }) as unknown as UnhashedPart;
  const at: Vec3 = [0, -0, 1];

  it("hashes the edge shapes to the spec bytes", () => {
    const doc = {
      id: "p",
      bodies: [{ id: "b", role: "solid", slot: 1, material: "petg", mesh: "m".repeat(64) }],
      solid: "s".repeat(64), itemTransform: at, metrics: [EDGE], warnings: [],
    };
    expect(partContentHashOf(part([EDGE]), at)).toBe(sha256Hex(canonicalize(doc)));
  });

  it("raises the spec error for a non-finite metric", () => {
    expect(() => partContentHashOf(part([{ value: Number.NaN }]), at)).toThrow(CanonicalizeError);
  });
});

describe("the chase record goes through spec canonicalize (3mf)", () => {
  it("writes Metadata/hackbuild_chase.json as canonicalize({chase, buildHash})", () => {
    const chase = 'kéy "x" \\';
    const cfg: BuildConfig = {
      title: "t", target: "core", chase, buildHash: "c".repeat(64), sourceDateEpoch: EPOCH,
      filaments: [{ color: "#1a1a1a", type: "PETG" }],
      objects: [{ name: "t", parts: [box("t", 1, [0, 0, 0], [5, 5, 1])] }],
    };
    const b = build(cfg);
    if (!b.ok) throw new Error("completeness failed");
    const text = b.entries["Metadata/hackbuild_chase.json"]!;
    expect(text).toBe(canonicalize({ chase, buildHash: "c".repeat(64) }));
    expect(JSON.parse(text)).toEqual({ chase, buildHash: "c".repeat(64) });
  });
});

describe("no package defines its own canonical JSON (D-206)", () => {
  // A key emitted as `${JSON.stringify(k)}:` is a hand-rolled object
  // serializer; spec/jcs.ts is the only one.
  const SERIALIZER = /\$\{JSON\.stringify\([^)]*\)\}:|\b(?:function|const|let)\s+(?:canonical(?:Json|JSON|ize)|stableStringify|jcs[A-Za-z]*)\b/;

  it("finds none in packages/*/src", () => {
    const out: string[] = [];
    const walk = (d: string): void => {
      for (const name of readdirSync(d)) {
        if (name === "node_modules" || name === "dist") continue;
        const p = join(d, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(?:ts|tsx|mts|js|mjs|vue)$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
      }
    };
    for (const pkg of readdirSync(join(ROOT, "packages"))) {
      const src = join(ROOT, "packages", pkg, "src");
      try {
        if (statSync(src).isDirectory()) walk(src);
      } catch {
        // a package with no src yet (D-026 placeholder)
      }
    }
    expect(out.length).toBeGreaterThan(50);
    expect(SERIALIZER.test("return `{${keys.map((k) => `${JSON.stringify(k)}:${f(o[k])}`)}}`;")).toBe(true);
    expect(out.filter((f) => SERIALIZER.test(readFileSync(f, "utf8"))).map((f) => relative(ROOT, f))).toEqual([]);
  });
});

describe("the hackbuild-3mf split keeps spec/jcs.ts whole (D-206)", () => {
  // The split carries no @hackbuild/spec, so tools/import-from-fab.sh copies
  // spec/jcs.ts to js/src/jcs.ts. A hand edit on either side moves every hash
  // the split writes; this holds the copy to the spec bytes and outputs. The
  // split is a sibling working tree (M00-T15); without it there is no copy.
  const SPEC = join(ROOT, "spec", "jcs.ts");
  const SPLIT = resolve(ROOT, "..", "hackbuild-3mf", "js", "src", "jcs.ts");
  const present = existsSync(SPLIT);

  it.skipIf(!present)("is byte for byte the spec file", () => {
    expect(readFileSync(SPLIT, "utf8")).toBe(readFileSync(SPEC, "utf8"));
  });

  it.skipIf(!present)("writes the spec bytes and errors on the edge shapes", async () => {
    const split = (await import(pathToFileURL(SPLIT).href)) as typeof import("@hackbuild/spec");
    const inputs: unknown[] = [[1, undefined], undefined, EDGE, Float64Array.of(1, 2), { a: -0, b: [undefined], c: undefined }, "k\u00e9y \ud800"];
    for (const v of inputs) {
      expect(split.canonicalize(v)).toBe(canonicalize(v));
      expect(split.sha256Hex(split.canonicalize(v))).toBe(sha256Hex(canonicalize(v)));
    }
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1n]) {
      let a: unknown;
      let b: unknown;
      try { split.canonicalize({ x: [bad] }); } catch (e) { a = e; }
      try { canonicalize({ x: [bad] }); } catch (e) { b = e; }
      expect(a).toBeInstanceOf(split.CanonicalizeError);
      expect(b).toBeInstanceOf(CanonicalizeError);
      expect([(a as CanonicalizeError).path, (a as CanonicalizeError).got]).toEqual([(b as CanonicalizeError).path, (b as CanonicalizeError).got]);
    }
  });
});
