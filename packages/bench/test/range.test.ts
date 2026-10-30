// The 44 px range (M09-T14 acceptance, UI.md section 11, G-54): in the
// hackbuild-ui stylesheet a bake inlines, `.hb-range` is 44 px tall inside
// the coarse-pointer media block and inside the under-820 px block. The
// sheet is read from the installed package, the bytes tools/bake inlines
// and tools/bake/ui-css.lock.json pins.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const SHEET = require.resolve("@virgilvox/hackbuild-ui/styles.css");

interface Block {
  query: string;
  body: string;
}

/** Top-level @media blocks with their bodies, braces balanced. */
export function mediaBlocks(css: string): Block[] {
  const out: Block[] = [];
  const re = /@media\s*([^{]+)\{/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < css.length && depth > 0; i += 1) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") depth -= 1;
    }
    out.push({ query: (m[1] ?? "").replace(/\s+/g, ""), body: css.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

/** Height of `.hb-range` declared in a block body, px, or null. */
export function rangeHeight(body: string): number | null {
  for (const r of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selectors = (r[1] ?? "").split(",").map((s) => s.trim());
    if (!selectors.includes(".hb-range")) continue;
    const h = /(?:^|;)\s*height\s*:\s*(\d+(?:\.\d+)?)px/.exec(r[2] ?? "");
    if (h !== null) return Number(h[1]);
  }
  return null;
}

describe("range target height", () => {
  const css = readFileSync(SHEET, "utf8");
  const blocks = mediaBlocks(css);

  it("is 44 px inside the coarse-pointer media block", () => {
    const coarse = blocks.filter((b) => b.query.includes("(pointer:coarse)") && rangeHeight(b.body) !== null);
    expect(coarse.length).toBeGreaterThan(0);
    expect(coarse.map((b) => rangeHeight(b.body))).toEqual(coarse.map(() => 44));
  });

  it("is 44 px inside the under-820 px media block", () => {
    const narrow = blocks.filter((b) => b.query.includes("(max-width:820px)") && rangeHeight(b.body) !== null);
    expect(narrow.length).toBeGreaterThan(0);
    expect(narrow.map((b) => rangeHeight(b.body))).toEqual(narrow.map(() => 44));
  });

  it("reads a mutated sheet as a failure", () => {
    const bad = css.replace(/(\.hb-range,[^{]*\{\s*height:)44px/, "$136px");
    expect(bad).not.toBe(css);
    const b = mediaBlocks(bad).find((x) => x.query.includes("(pointer:coarse)") && rangeHeight(x.body) !== null);
    expect(b === undefined ? null : rangeHeight(b.body)).toBe(36);
  });
});
