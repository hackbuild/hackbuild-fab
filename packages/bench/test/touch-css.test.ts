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

/** The bodies of every @media block whose query equals `query`, whitespace ignored, joined. */
function media(query: string): string {
  const flat = query.replace(/\s+/g, "");
  const out: string[] = [];
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
    out.push(css.slice(start, i - 1));
  }
  if (out.length === 0) throw new Error(`no @media ${query} in bench.css`);
  return out.join("\n");
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

  it("selects and bool switches take the 44 px floor under 640, the switch knob centred by token (G-54)", () => {
    const body = media("(pointer:coarse),(max-width:640px)");
    for (const sel of [".hbf-bench .hb-select", ".hbf-bench .hb-switch"]) {
      const d = rule(body, sel);
      expect(d, sel).toMatch(/min-height:\s*var\(--hbf-touch\)/);
      expect(d, sel).toMatch(/min-width:\s*var\(--hbf-touch\)/);
    }
    expect(rule(body, ".hbf-bench .hb-switch::after")).toMatch(/top:\s*calc\(50%\s*-\s*var\(--hbf-knob-half\)\)/);
  });

  it("a docked pad takes a row below the stage at full width (D-630)", () => {
    expect(rule(css, ".hbf-composer.is-pad-docked")).toMatch(/grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto/);
    expect(rule(css, ".hbf-pad-dock")).toMatch(/grid-column:\s*1\s*\/\s*-1/);
  });
});

describe("bench rules held without a browser, status strip and number boxes", () => {
  it("under 640 the chips join the strip's wrap and the row gap drops below the column gap, two rows at 390", () => {
    const body = media("(max-width:640px)");
    expect(rule(body, ".hbf-status-chips")).toMatch(/display:\s*contents/);
    expect(rule(body, ".hbf-bench .hb-statusbar")).toMatch(/gap:\s*var\(--hb-s1\)\s+var\(--hb-s3\)/);
  });

  it("under 480 the part size yields, and the mesh chip, build time and warning count are never hidden", () => {
    const body = media("(max-width:480px)");
    expect(rule(body, '.hbf-bench .hb-statusbar [data-hb="dims"]')).toMatch(/display:\s*none/);
    for (const hook of ["chip-mesh", "chip-warn", "build-ms", "chip-bed", "log-toggle", "legend-chips"]) expect(css, hook).not.toMatch(new RegExp(`\\[data-hb="${hook}"\\][^{]*\\{[^}]*display:\\s*none`));
  });

  it("the number box takes its width from the field's character count and hides the spin buttons", () => {
    expect(rule(css, ".hbf-row")).toMatch(/--hbf-num-w:\s*max\(var\(--hbf-prow-num\),\s*calc\(var\(--hbf-num-ch,\s*0\)\s*\*\s*var\(--hbf-prow-char\)/);
    expect(rule(css, ".hbf-bench .hb-prow-num.hb-input")).toMatch(/width:\s*var\(--hbf-num-w,/);
    expect(rule(css, ".hbf-bench .hb-prow-num.hb-input")).toMatch(/appearance:\s*textfield/);
    expect(css).toMatch(/::-webkit-inner-spin-button[^{]*\{[^}]*-webkit-appearance:\s*none/);
    expect(rule(css, ".hbf-band")).toMatch(/var\(--hbf-num-w,/);
  });

  it("under 820 the narrow rail lowers the column floor and leaves the box width to the character count", () => {
    const body = media("(max-width:820px)");
    expect(rule(body, ".hbf-bench .hb-rail")).toMatch(/--hbf-prow-num:\s*var\(--hbf-prow-num-narrow\)/);
    expect(body).not.toMatch(/\.hb-prow-num\.hb-input\{\s*width:/);
  });
});
