// The lint-voice rules exist once (D-004). CHK-LNT-01 and -02 read them
// through the package subpath @hackbuild/checks/voice, by a literal
// specifier, and no src file of this package reaches outside it through a
// computed import or a URL climbing out of the package. tools/lint-voice.mjs
// reads the same subpath (2026-10-08): the identity test holds that, and the
// hit comparison stays so a tool that copies the rules again fails.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import * as rules from "@hackbuild/checks/voice";
import { check as lnt01 } from "../src/defs/lnt/CHK-LNT-01.js";

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(PKG, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir).sort()) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.[cm]?[jt]s$/.test(n)) out.push(p);
  }
  return out;
}

/** Source with // and block comments blanked; quoted strings kept whole. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

describe("the voice rules are read by a literal specifier from inside the package", () => {
  test("no src file imports by a computed specifier", () => {
    const bad: string[] = [];
    for (const f of walk(path.join(PKG, "src"))) {
      for (const m of code(readFileSync(f, "utf8")).matchAll(/\bimport\s*\(\s*([^)]*)\)/g)) {
        if (!/^(["'])[^"'`$]+\1$/.test(m[1]!.trim())) bad.push(`${path.relative(ROOT, f)}: import(${m[1]!.trim()})`);
      }
    }
    expect(bad).toEqual([]);
  });

  test("no src file builds a URL that climbs out of the package", () => {
    const bad: string[] = [];
    for (const f of walk(path.join(PKG, "src"))) {
      for (const m of code(readFileSync(f, "utf8")).matchAll(/new URL\(\s*(["'`])((?:\.\.\/)+)[^"'`]*\1/g)) {
        const to = path.resolve(path.dirname(f), m[2]!);
        if (!(to + path.sep).startsWith(PKG + path.sep)) bad.push(`${path.relative(ROOT, f)}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test("CHK-LNT-01 runs the package rules: a planted dash fails, its absence passes", () => {
    const dash = String.fromCodePoint(0x2014);
    const lnt = lnt01.run as unknown as (t: unknown, ctx: unknown) => readonly { readonly verdict: string }[];
    const run = (text: string): string => lnt({ level: "source", source: { path: "notes/a.md", text } }, undefined)[0]!.verdict;
    expect(run(`a ${dash} b`)).toBe("fail");
    expect(run("a, b")).toBe("pass");
  });
});

describe("tools/lint-voice.mjs and the package rules agree", () => {
  type Hit = { readonly rule: string; readonly line: number; readonly col: number; readonly severity: string; readonly text: string };
  type Tool = { readonly lintText: (p: string, t: string, k?: string | null) => readonly Hit[]; readonly [k: string]: unknown };
  const toolUrl = pathToFileURL(path.join(ROOT, "tools", "lint-voice.mjs")).href;
  // Banned text is built at run time, so this file passes the rules it plants.
  const cp = String.fromCodePoint;
  const bang = String.fromCharCode(33);
  const [w0, w1] = [rules.MARKETING[0]!, rules.MARKETING[2]!];
  const planted = [
    `a ${cp(0x2013)} b and ${cp(0x2212)}1 and ${"\\u"}2014 and ${"&"}mdash;`,
    `glyph ${cp(0x2728)} and ${cp(0x1f600)} and ${cp(0x2713)}`,
    `${rules.OPENERS[0]} start. ${rules.OPENERS[2]} do it. a ${w0} and ${w1} tool to ${rules.FILLER[2]}`,
    "it is not a toy, it is a tool. not only this",
    `color #${rules.BRAND_HEX[0]} and done${bang}`,
    `{"title": "go${bang}", "x": "y${bang}"}`,
  ].join("\n");
  const texts: readonly (readonly [string, string, string | null])[] = [
    ...["notes/a.md", "src/a.ts", "src/a.test.ts", "data/a.json", "a.txt", ".githooks/pre-commit", "noext"].map((p) => [p, planted, null] as const),
    ...["commit", "text", "dom"].map((k) => ["<stdin>", planted, k] as const),
    ["RULES.md", readFileSync(path.join(ROOT, "RULES.md"), "utf8"), null],
    ["docs/plan/CHECKS.md", readFileSync(path.join(ROOT, "docs", "plan", "CHECKS.md"), "utf8"), null],
  ];

  test("the same hits on every text, file kind and stdin kind", async () => {
    const tool = (await import(toolUrl)) as Tool;
    for (const [p, t, k] of texts) expect(rules.lintText(p, t, k), `${p} ${String(k)}`).toEqual(tool.lintText(p, t, k));
    expect(rules.lintText("notes/a.md", planted).length).toBeGreaterThan(10);
  });

  test("the same word lists and rule names", async () => {
    const tool = (await import(toolUrl)) as Tool;
    for (const k of ["MARKETING", "FILLER", "OPENERS", "BRAND_HEX", "JSON_MESSAGE_KEYS", "CHAR_RULES", "WORD_RULES", "ALLOWABLE_RULES", "KINDS"] as const) {
      expect(rules[k], k).toEqual(tool[k]);
    }
  });

  test("the tool reads the package module: its lintText and maskMarkdown are these functions", async () => {
    const tool = (await import(toolUrl)) as Tool;
    expect(tool.lintText).toBe(rules.lintText);
    expect(tool["maskMarkdown"]).toBe(rules.maskMarkdown);
  });
});
