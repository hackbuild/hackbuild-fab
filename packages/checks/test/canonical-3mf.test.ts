// One canonical JSON for every hash a package computes (D-051, D-206).
// profileHash (profile), partContentHashOf (mesh) and the vendored 3MF
// writer's canonicalize (3mf) each give spec/jcs.ts bytes. Moved from
// packages/3mf/test/canonical.test.ts (R1-engine-03): packages/3mf imports
// no workspace package, so the cross-package checks live here; the chase
// record test stays in packages/3mf/test/chase-record.test.ts. The inputs
// below are the shapes three earlier package copies disagreed on: an
// undefined array slot, an undefined member, -0, a typed array and a
// non-finite number. Each path must give the spec bytes or the spec error.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CanonicalizeError, canonicalize, isThrownCommandError, sha256Hex, type Vec3 } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { partContentHashOf, type UnhashedPart } from "@hackbuild/mesh";
import * as vendored from "@hackbuild/3mf";

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

describe("the vendored hackbuild-3mf canonicalizes as spec/jcs.ts (D-206)", () => {
  // hackbuild-3mf carries no @hackbuild/spec, so its js/src/jcs.ts is a copy
  // of spec/jcs.ts, built into the tgz under tools/vendor that
  // packages/3mf re-exports (R1-engine-03). A hand edit on either side moves
  // every hash the writer computes; this holds the vendored build to the spec
  // bytes, hashes and errors.
  it("writes the spec bytes and errors on the edge shapes", () => {
    const inputs: unknown[] = [[1, undefined], undefined, EDGE, Float64Array.of(1, 2), { a: -0, b: [undefined], c: undefined }, "k\u00e9y \ud800"];
    for (const v of inputs) {
      expect(vendored.canonicalize(v)).toBe(canonicalize(v));
      expect(vendored.sha256Hex(vendored.canonicalize(v))).toBe(sha256Hex(canonicalize(v)));
    }
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1n]) {
      let a: unknown;
      let b: unknown;
      try { vendored.canonicalize({ x: [bad] }); } catch (e) { a = e; }
      try { canonicalize({ x: [bad] }); } catch (e) { b = e; }
      expect(a).toBeInstanceOf(vendored.CanonicalizeError);
      expect(b).toBeInstanceOf(CanonicalizeError);
      expect([(a as CanonicalizeError).path, (a as CanonicalizeError).got]).toEqual([(b as CanonicalizeError).path, (b as CanonicalizeError).got]);
    }
  });
});
