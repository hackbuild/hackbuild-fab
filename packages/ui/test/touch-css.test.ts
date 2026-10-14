// @vitest-environment node
// G-52 and G-54 at 390 (M09 R-01, R-02): the browser gates are
// tools/smoke/targets.spec.ts and tools/smoke/gold/mobile.spec.ts. This
// test holds the two bench.css rules they measured on 2026-10-13, so a
// change that drops either fails here without a browser: the log toggle
// takes the 44 px touch floor beside the drive keys (it measured 48 x 17
// without it), and under 640 the drive pad sets its title beside the keys
// with the readout spanning below (pad share 0.21 of the 390 px stage with
// it, 0.27 without, measured).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/bench/bench.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the first @media block whose query equals `query`, whitespace ignored. */
function media(query: string): string {
  const flat = query.replace(/\s+/g, "");
  for (const m of css.matchAll(/@media([^{]+)\{/g)) {
    if (m[1]!.replace(/\s+/g, "") !== flat) continue;
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    while (depth > 0 && i < css.length) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") depth -= 1;
      i += 1;
    }
    return css.slice(start, i - 1);
  }
  throw new Error(`no @media ${query} in bench.css`);
}

/** Declarations of the rule whose selector list names `selector`. */
function rule(body: string, selector: string): string {
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1]!.split(",").map((s) => s.trim()).includes(selector)) return m[2]!;
  }
  return "";
}

describe("bench touch rules at 390", () => {
  it("the log toggle and the drive keys take the 44 px touch floor on a coarse pointer or under 640", () => {
    const body = media("(pointer:coarse),(max-width:640px)");
    for (const sel of [".hbf-pad-key", ".hbf-log-toggle"]) {
      const d = rule(body, sel);
      expect(d, sel).toMatch(/min-height:\s*var\(--hbf-touch\)/);
      expect(d, sel).toMatch(/min-width:\s*var\(--hbf-touch\)/);
    }
    expect(css).toMatch(/--hbf-touch:\s*44px/);
  });

  it("under 640 the pad title sits beside the keys and the readout spans the row below", () => {
    const body = media("(max-width:640px)");
    expect(rule(body, ".hbf-pad")).toMatch(/display:\s*grid/);
    expect(rule(body, ".hbf-pad")).toMatch(/grid-template-columns:\s*auto/);
    expect(rule(body, ".hbf-pad-read")).toMatch(/grid-column:\s*1\s*\/\s*-1/);
  });
});
