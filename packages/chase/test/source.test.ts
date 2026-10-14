// The chase source reader (D-178): each CHASE_SOURCE_RULES rule refuses its
// case with E_SCHEMA and record chase-source/<rule>, the reader executes
// nothing, spans are byte offsets of each literal, and for every chase.ts
// in the repository the value the reader returns equals the module's export.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { CHASE_SOURCE_RULES, isThrownCommandError, type ChaseSourceRule } from "@hackbuild/spec";
import { readChaseSource } from "../src/source.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const HEAD = `import { defineChase, type ParamsOf } from "@hackbuild/spec";\n`;
const BODY = `meta: { id: "t", kind: "single", name: "T", version: 1, chase: 2 }, materials: [], params: [], build: { module: "./build.ts", fn: "build" }`;
const chaseOf = (inner: string, head = HEAD, tail = ""): string => `${head}export const chase = defineChase({ ${inner} });\n${tail}`;

function refusal(src: string): { rule: string; path: string } {
  try {
    readChaseSource(src, "t/chase.ts");
  } catch (e) {
    if (!isThrownCommandError(e)) throw e;
    expect(e.hbf.code).toBe("E_SCHEMA");
    return { rule: String(e.hbf.record).replace("chase-source/", ""), path: e.hbf.path ?? "" };
  }
  throw new Error("the reader accepted the source");
}

/** One refused source per rule; the reader must name that rule. */
const CASES: Readonly<Record<ChaseSourceRule, readonly string[]>> = {
  imports: [
    `import fs from "node:fs";\n${chaseOf(BODY)}`,
    `import "@hackbuild/spec";\n${chaseOf(BODY)}`,
    chaseOf(BODY, `import { defineChase } from "./evil";\n`),
    chaseOf(BODY, `import { defineChase, qualify } from "@hackbuild/spec";\n`),
    chaseOf(BODY, ""),
  ],
  export: [
    chaseOf(BODY, HEAD, `console.error("ran");\n`),
    chaseOf(BODY, HEAD, `export const other = 1;\n`),
    chaseOf(BODY, HEAD, `export function f() { return 1; }\n`),
    `${HEAD}export const chase = makeChase({ ${BODY} });\n`,
    `${HEAD}export const chase = defineChase({ ${BODY} });\nexport const chase = defineChase({ ${BODY} });\n`,
    `${HEAD}const x = 1;\n${chaseOf(BODY).slice(HEAD.length)}`,
  ],
  literal: [
    chaseOf(`${BODY}, note: \`a \${1} b\``),
    chaseOf(`${BODY}, note: ("x")`),
    chaseOf(`${BODY}, note: 10n`),
    chaseOf(`${BODY}, note: [1, , 2]`),
    chaseOf(`${BODY}, note: "x" as string`),
  ],
  "no-identifier": [
    chaseOf(`${BODY}, note: undefined`),
    chaseOf(`${BODY}, note: NaN`),
    chaseOf(`${BODY}, note: Infinity`),
    chaseOf(`${BODY}, note: process.env.HOME`),
    chaseOf(`${BODY}, note: require("node:fs")`),
    chaseOf(`${BODY}, note: new Date()`),
    chaseOf(`${BODY}, note: 1 + 2`),
    chaseOf(`${BODY}, note: true ? 1 : 2`),
  ],
  "no-spread": [
    chaseOf(`${BODY}, note: [...[1]]`),
    chaseOf(`${BODY}, extra: { ...{ a: 1 } }`),
  ],
  keys: [
    chaseOf(`${BODY}, ["note"]: 1`),
    chaseOf(`${BODY}, 1: 1`),
    chaseOf(`${BODY}, note`),
    chaseOf(`${BODY}, note() { return 1; }`),
    chaseOf(`${BODY}, get note() { return 1; }`),
    chaseOf(`${BODY}, note: 1, note: 2`),
    chaseOf(`${BODY}, __proto__: { polluted: 1 }`),
  ],
  finite: [chaseOf(`${BODY}, note: 1e999`)],
  size: [
    chaseOf(`${BODY}, note: "${"x".repeat(262144)}"`),
    chaseOf(`${BODY}, note: ${"[".repeat(40)}${"]".repeat(40)}`),
  ],
  id: [
    chaseOf(BODY.replace('id: "t"', 'id: "Keys-Flex"')),
    chaseOf(BODY.replace('id: "t"', 'id: "a b"')),
    chaseOf(BODY.replace('id: "t"', 'id: "a--b"')),
    chaseOf(BODY.replace('id: "t"', 'id: "-a"')),
    chaseOf(BODY.replace('id: "t"', 'id: "a_b"')),
    chaseOf(BODY.replace('id: "t"', 'id: "a\\nb"')),
    chaseOf(BODY.replace('id: "t"', 'id: "../x"')),
  ],
  "build-path": [
    chaseOf(BODY.replace("./build.ts", "../../../outside/escape")),
    chaseOf(BODY.replace("./build.ts", "/etc/passwd")),
    chaseOf(BODY.replace("./build.ts", "build")),
    chaseOf(BODY.replace("./build.ts", "./sub/../../x.ts")),
    chaseOf(BODY.replace("./build.ts", "./build")),
    chaseOf(BODY.replace("./build.ts", "./build.js")),
  ],
};

describe("chase source rules", () => {
  it("covers every rule in CHASE_SOURCE_RULES", () => {
    expect(Object.keys(CASES).sort()).toEqual([...CHASE_SOURCE_RULES].sort());
  });

  for (const rule of CHASE_SOURCE_RULES) {
    it(`refuses each ${rule} case with chase-source/${rule}`, () => {
      for (const src of CASES[rule]) expect(refusal(src).rule, src.slice(0, 200)).toBe(rule);
    });
  }

  it("names the JSON pointer of the offending value", () => {
    expect(refusal(chaseOf(`${BODY}, note: { a: [1, undefined] }`)).path).toBe("/note/a/1");
    expect(refusal(chaseOf(BODY.replace("./build.ts", "../escape"))).path).toBe("/build/module");
  });

  it("accepts comments, trailing commas, as const, template strings, negative numbers and type declarations", () => {
    const src = [
      "// header",
      HEAD,
      "/* block */",
      "export const chase = defineChase({",
      `  ${BODY},`,
      "  note: `plain`, list: [-1.5, 0x10, 1_000, 'q\\'s', \"\\u00e9\"] as const, // tail",
      "});",
      "export default chase;",
      "export type P = ParamsOf<typeof chase>",
      "interface Local { readonly a: number; b: { c: string } }",
      "type Alias = { a: 1; b: [2, 3] };",
    ].join("\n");
    const r = readChaseSource(src, "t/chase.ts");
    expect((r.chase as unknown as { note: string }).note).toBe("plain");
    expect((r.chase as unknown as { list: unknown[] }).list).toEqual([-1.5, 16, 1000, "q's", "\u00e9"]);
    expect(r.sourceHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives byte offsets: each span's bytes are the literal's source text", () => {
    const src = chaseOf(`${BODY}, label: "\u00e9t\u00e9", n: -2`);
    const r = readChaseSource(src, "t/chase.ts");
    const bytes = Buffer.from(src, "utf8");
    const text = (p: string): string => {
      const s = r.spans.find((x) => x.pointer === p)!;
      return bytes.subarray(s.start, s.end).toString("utf8");
    };
    expect(text("/label")).toBe("\"\u00e9t\u00e9\"");
    expect(text("/n")).toBe("-2");
    expect(text("/build/module")).toBe("\"./build.ts\"");
    expect(r.spans[0]?.pointer).toBe("");
    const starts = r.spans.map((s) => s.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});

/** Every directory under reference/ and designs/ holding a chase.ts. */
function chaseFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string, depth: number): void => {
    if (!existsSync(d) || depth > 3) return;
    for (const x of readdirSync(d).sort()) {
      const p = path.join(d, x);
      if (x === "node_modules" || x === "legacy" || x === "expected" || !statSync(p).isDirectory()) continue;
      if (existsSync(path.join(p, "chase.ts"))) out.push(path.join(p, "chase.ts"));
      walk(p, depth + 1);
    }
  };
  walk(path.join(ROOT, "reference"), 0);
  walk(path.join(ROOT, "designs"), 0);
  return out;
}

describe("the reader on the repository's chases", () => {
  const files = chaseFiles();

  it("finds the references and designs", () => {
    expect(files.map((f) => path.relative(ROOT, f))).toEqual(expect.arrayContaining([
      "designs/collar/chase.ts", "reference/exports/orca-3mf-roundtrip/chase.ts", "reference/keys/flex-pair/chase.ts",
    ]));
  });

  for (const file of chaseFiles()) {
    it(`${path.relative(ROOT, file)}: the reader's value equals the module's export`, async () => {
      const read = readChaseSource(readFileSync(file, "utf8"), path.relative(ROOT, file));
      const mod = (await import(pathToFileURL(file).href)) as { chase: unknown };
      expect(read.chase).toStrictEqual(mod.chase);
    });
  }
});
