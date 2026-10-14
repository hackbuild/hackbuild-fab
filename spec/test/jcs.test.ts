// spec/test/jcs.test.ts
// spec/jcs.ts against RFC 8785 (section 3.2.2 and 3.2.3 examples, Appendix B
// number vectors), the NIST FIPS 180-4 sha256 examples and node:crypto as
// an independent sha256, plus the lint that keeps it the one canonicalizer
// and sha256 of every tier (ARCHITECTURE.md 3, D-206).
// Version 1, 2026-10-05. Carries D-051, D-206.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { CanonicalizeError, canonicalize, sha256Hex, utf8Bytes } from "../jcs";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** The double whose IEEE 754 bits are the 16 hex digits. */
function fromBits(hex: string): number {
  const v = new DataView(new ArrayBuffer(8));
  v.setBigUint64(0, BigInt(`0x${hex}`));
  return v.getFloat64(0);
}

describe("canonicalize (RFC 8785)", () => {
  test("Appendix B number serialization", () => {
    const rows: readonly (readonly [string, string])[] = [
      ["0000000000000000", "0"],
      ["8000000000000000", "0"],
      ["0000000000000001", "5e-324"],
      ["8000000000000001", "-5e-324"],
      ["7fefffffffffffff", "1.7976931348623157e+308"],
      ["ffefffffffffffff", "-1.7976931348623157e+308"],
      ["4340000000000000", "9007199254740992"],
      ["c340000000000000", "-9007199254740992"],
      ["4430000000000000", "295147905179352830000"],
      ["44b52d02c7e14af5", "9.999999999999997e+22"],
      ["44b52d02c7e14af6", "1e+23"],
      ["44b52d02c7e14af7", "1.0000000000000001e+23"],
      ["444b1ae4d6e2ef4e", "999999999999999700000"],
      ["444b1ae4d6e2ef4f", "999999999999999900000"],
      ["444b1ae4d6e2ef50", "1e+21"],
      ["3eb0c6f7a0b5ed8c", "9.999999999999997e-7"],
      ["3eb0c6f7a0b5ed8d", "0.000001"],
      ["41b3de4355555553", "333333333.3333332"],
      ["41b3de4355555554", "333333333.33333325"],
      ["41b3de4355555555", "333333333.3333333"],
      ["41b3de4355555556", "333333333.3333334"],
      ["41b3de4355555557", "333333333.33333343"],
      ["becbf647612f3696", "-0.0000033333333333333333"],
      ["43143ff3c1cb0959", "1424953923781206.2"],
    ];
    for (const [bits, text] of rows) expect([bits, canonicalize(fromBits(bits))]).toEqual([bits, text]);
  });

  test("Appendix B NaN and Infinity have no form and throw", () => {
    for (const bits of ["7fffffffffffffff", "7ff0000000000000"]) {
      expect(() => canonicalize(fromBits(bits))).toThrow(CanonicalizeError);
    }
  });

  test("3.2.2 sample: literals, numbers and string escapes", () => {
    const input = {
      numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 0.000000000000000000000000001],
      string: "\u20ac$\u000f\u000aA'\u0042\u0022\u005c\\\"/",
      literals: [null, true, false],
    };
    expect(canonicalize(input)).toBe(
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"\u20ac$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}',
    );
  });

  test("3.2.3 sample: keys sort by UTF-16 code units (its surrogate pair key swapped for U+10437)", () => {
    const input = {
      "\u20ac": "Euro Sign",
      "\r": "Carriage Return",
      "\ufb33": "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "\ud801\udc37": "Deseret Small Letter Yee",
      "\u0080": "Control",
      "\u00f6": "Latin Small Letter O With Diaeresis",
    };
    expect(canonicalize(input)).toBe(
      '{"\\r":"Carriage Return","1":"One","\u0080":"Control","\u00f6":"Latin Small Letter O With Diaeresis",'
        + '"\u20ac":"Euro Sign","\ud801\udc37":"Deseret Small Letter Yee","\ufb33":"Hebrew Letter Dalet With Dagesh"}',
    );
  });

  test("-0 is written 0, nested and at the root", () => {
    expect(canonicalize(-0)).toBe("0");
    expect(canonicalize({ b: 1, a: [0.1, -0, "x"] })).toBe('{"a":[0.1,0,"x"],"b":1}');
  });

  test("NaN, Infinity, -Infinity and bigint throw with the JSON pointer of the value", () => {
    const cases: readonly (readonly [unknown, string, string])[] = [
      [{ legal: { hi: Infinity } }, "/legal/hi", "Infinity"],
      [{ a: [1, -Infinity] }, "/a/1", "-Infinity"],
      [{ "x/y~z": NaN }, "/x~1y~0z", "NaN"],
      [{ n: 3n }, "/n", "3n"],
      [NaN, "", "NaN"],
    ];
    for (const [value, path, got] of cases) {
      let thrown: unknown;
      try {
        canonicalize(value);
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(CanonicalizeError);
      expect([(thrown as CanonicalizeError).path, (thrown as CanonicalizeError).got]).toEqual([path, got]);
    }
  });

  test("an open interval end is null and canonicalizes", () => {
    expect(canonicalize({ kind: "interval", lo: 0.6, hi: null, unit: "mm", nearest: 0.75 }))
      .toBe('{"hi":null,"kind":"interval","lo":0.6,"nearest":0.75,"unit":"mm"}');
  });

  test("undefined members drop, undefined slots write null, typed arrays write their numbers", () => {
    expect(canonicalize({ a: undefined, b: [undefined, 1], c: () => 1 })).toBe('{"b":[null,1]}');
    expect(canonicalize(undefined)).toBe("null");
    expect(canonicalize({ p: Float64Array.of(1.5, -0), t: Uint32Array.of(2) })).toBe('{"p":[1.5,0],"t":[2]}');
  });

  test("agrees with JSON.stringify on sorted plain data", () => {
    const v = { z: "\u2028\u0000\u001f", y: [1e21, 1e-7, 123.456, -1], x: { b: false, a: null } };
    expect(canonicalize(v)).toBe(JSON.stringify({ x: { a: null, b: false }, y: v.y, z: v.z }));
  });
});

describe("sha256Hex (FIPS 180-4)", () => {
  test("NIST examples: empty string, abc, the 448-bit message, one million a", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex(new Uint8Array([0x61, 0x62, 0x63]))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))
      .toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
    expect(sha256Hex("a".repeat(1_000_000))).toBe("cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0");
  });

  test("equals node:crypto on every padding length and on UTF-8 text", () => {
    const node = (d: string | Uint8Array): string => createHash("sha256").update(d).digest("hex");
    for (let n = 0; n <= 130; n += 1) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 0xff);
      expect([n, sha256Hex(bytes)]).toEqual([n, node(bytes)]);
    }
    for (const text of [`mm \u00b5 ${"x".repeat(200)}`, "\u20ac\ud801\udc37\u0080", "lone \ud800 and \udc00 surrogates"]) {
      expect(sha256Hex(text)).toBe(node(text));
      expect(Array.from(utf8Bytes(text))).toEqual(Array.from(new TextEncoder().encode(text)));
    }
  });
});

describe("one canonicalizer and one sha256 (ARCHITECTURE.md 3, D-206)", () => {
  // Source files only: tests keep node:crypto as an independent check of
  // the pure implementation. core/src/gate.ts keeps node:crypto for the
  // HMAC of AGENT-SURFACE.md 6.
  const ALLOWED = new Set(["core/src/gate.ts"]);
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
    return out;
  };

  test("no createHash or crypto.subtle.digest in a source file outside core/src/gate.ts", () => {
    const files = sources();
    expect(files.length).toBeGreaterThan(50);
    const hits = files.filter((f) => !ALLOWED.has(f) && /\bcreateHash\b|\bsubtle\.digest\b/.test(readFileSync(join(ROOT, f), "utf8")));
    expect(hits).toEqual([]);
  });

  test("no sha256 round-constant table outside spec/jcs.ts", () => {
    // 0x428a2f98 is K[0] of FIPS 180-4; a second copy is a second sha256.
    const hits = sources().filter((f) => /0x428a2f98/i.test(readFileSync(join(ROOT, f), "utf8")));
    expect(hits).toEqual([]);
  });
});
