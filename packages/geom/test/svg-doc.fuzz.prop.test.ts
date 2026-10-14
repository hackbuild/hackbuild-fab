// D-166 and D-240 untrusted-input fuzz for the SVG document sanitiser
// (M05-T14, TESTING.md 4.2.1). Documents are assembled from clean markup
// and hostile fragments: script and foreignObject elements in any case and
// with a namespace prefix, nested or self closing; on* handlers; href and
// xlink:href to javascript:, data: and http: targets beside fragment links;
// DOCTYPE and ENTITY declarations; quoted ">" inside attribute values.
// Every case either sanitises or is refused with E_SCHEMA naming an
// svg-intake rule; any other throw fails. A sanitised document holds no
// script, no foreignObject, no handler and no href that leaves the
// document, keeps every path's d attribute, and sanitising it again
// changes nothing.
//
// Push runs FC_RUNS=100, nightly FC_RUNS=2000; the seed prints on failure.
// Replay: FC_SEED=<s> FC_PATH=<p> npx vitest run packages/geom/test/svg-doc.fuzz.prop.test.ts

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { isThrownCommandError } from "@hackbuild/spec";
import { sanitiseSvgDocument } from "../src/index.js";

const FC_RUNS = Number(process.env["FC_RUNS"] ?? 100);
const SEED = Number(process.env["FC_SEED"] ?? 20261008);
const PATH = process.env["FC_PATH"];
const params = (numRuns: number): fc.Parameters<unknown> => ({ seed: SEED, numRuns, ...(PATH !== undefined ? { path: PATH, endOnFailure: true } : {}) });

const caseOf = (s: string): fc.Arbitrary<string> => fc.constantFrom(s, s.toUpperCase(), s[0]!.toUpperCase() + s.slice(1));
const prefix = fc.constantFrom("", "svg:", "x:");
const d = fc.array(fc.tuple(fc.constantFrom("M", "L", "h", "v", "Q", "C"), fc.integer({ min: -500, max: 500 })), { minLength: 1, maxLength: 6 })
  .map((xs) => xs.map(([c, n]) => `${c}${n} ${n + 1}`).join(" ") + " Z");
const target = fc.constantFrom("javascript:alert(1)", "JavaScript:void(0)", " javascript:x", "data:text/html,x", "http://example.invalid/a.svg", "//example.invalid", "#ok", "#mark");
const handler = fc.tuple(caseOf("onload"), fc.constantFrom("alert(1)", "x>y", "'a'")).map(([n, v]) => `${n}="${v}"`);
const href = fc.tuple(fc.constantFrom("href", "xlink:href", "HREF"), target).map(([n, v]) => `${n}="${v}"`);
const safeAttr = fc.constantFrom('fill="#1a1a1a"', 'transform="translate(1,2)"', 'title="a > b"', "class='k'", 'opacity="0.5"');

const pathEl = fc.tuple(d, fc.array(fc.oneof(safeAttr, handler, href), { maxLength: 3 })).map(([dd, as]) => ({ text: `<path ${as.join(" ")} d="${dd}"/>`, d: dd }));
const dropped = fc.tuple(fc.constantFrom("script", "foreignObject"), prefix, fc.boolean(), fc.constantFrom("alert(1)", "<b>bold</b>", "", "<p onclick='x'>t</p>"))
  .chain(([n, p, self, inner]) => caseOf(n).map((nn) => (self ? `<${p}${nn} src="x.js"/>` : `<${p}${nn} type="t">${inner}</${p}${nn}>`)));
const link = fc.tuple(href, fc.array(handler, { maxLength: 1 })).map(([h, hs]) => `<a ${h} ${hs.join(" ")}><text>t</text></a>`);
const decl = fc.constantFrom('<!DOCTYPE svg [<!ENTITY x "y">]>', "<!doctype svg>", '<!ENTITY a "b">');

const doc = fc.tuple(
  fc.boolean(),
  fc.array(fc.oneof({ weight: 4, arbitrary: pathEl.map((p) => ({ text: p.text, d: p.d as string | undefined })) }, { weight: 2, arbitrary: dropped.map((t) => ({ text: t, d: undefined })) }, { weight: 2, arbitrary: link.map((t) => ({ text: t, d: undefined })) }, { weight: 1, arbitrary: fc.constant({ text: "<!-- note -->", d: undefined }) }), { maxLength: 8 }),
  fc.option(decl, { freq: 6 }),
  fc.array(handler, { maxLength: 2 }),
).map(([xml, parts, dec, rootHandlers]) => ({
  text: `${xml ? '<?xml version="1.0"?>\n' : ""}${dec ?? ""}<svg xmlns="http://www.w3.org/2000/svg" ${rootHandlers.join(" ")} viewBox="0 0 10 10">${parts.map((p) => p.text).join("\n")}</svg>`,
  ds: parts.flatMap((p) => (p.d === undefined ? [] : [p.d])),
  hasDecl: dec !== null,
}));

const TAG = /<\s*([^\s/>!?]+)([^>]*)>/g;

function hostile(out: string): string[] {
  const found: string[] = [];
  for (const m of out.matchAll(TAG)) {
    const name = m[1]!.toLowerCase().replace(/^.*:/, "");
    if (name === "script" || name === "foreignobject") found.push(`element ${m[1]}`);
    for (const a of m[2]!.matchAll(/([^\s=]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g)) {
      const an = a[1]!.toLowerCase();
      const v = a[2]!.replace(/^["']|["']$/g, "").trimStart();
      if (an.startsWith("on")) found.push(`handler ${a[1]}`);
      if (an.replace(/^.*:/, "") === "href" && !v.startsWith("#")) found.push(`href ${v}`);
    }
  }
  return found;
}

describe("SVG document sanitiser (D-166, D-240)", () => {
  it("leaves no script, foreignObject, handler or outbound href, keeps every path, and is idempotent", () => {
    fc.assert(
      fc.property(doc, (c) => {
        let out: string;
        try {
          out = sanitiseSvgDocument(c.text);
        } catch (e) {
          if (isThrownCommandError(e) && e.hbf.code === "E_SCHEMA" && /^svg-intake\//.test(e.hbf.record ?? "")) {
            expect(c.hasDecl, `refused a document with no declaration: ${e.hbf.record}`).toBe(true);
            return;
          }
          throw e;
        }
        expect(c.hasDecl, "a DOCTYPE or ENTITY declaration passed").toBe(false);
        expect(hostile(out)).toEqual([]);
        for (const dd of c.ds) expect(out).toContain(`d="${dd}"`);
        expect(sanitiseSvgDocument(out)).toBe(out);
      }),
      params(FC_RUNS),
    );
  });

  it("refuses a DOCTYPE, an ENTITY declaration and an unclosed tag with the rule named", () => {
    const rule = (t: string): string | undefined => {
      try {
        sanitiseSvgDocument(t);
        return undefined;
      } catch (e) {
        return isThrownCommandError(e) ? e.hbf.record : "other";
      }
    };
    expect(rule('<!DOCTYPE svg><svg/>')).toBe("svg-intake/doctype");
    expect(rule('<!ENTITY a "b"><svg/>')).toBe("svg-intake/declaration");
    expect(rule('<svg><path d="M0 0"')).toBe("svg-intake/unclosed");
    expect(rule("<svg>< script>x</script></svg>")).toBe("svg-intake/malformed");
  });

  it("drops what D-166 names and nothing else", () => {
    const t = '<svg onload="x()" viewBox="0 0 1 1"><script>alert(1)</script><SVG:Script/><foreignObject><p>x</p></foreignObject><a xlink:href="#k" href="javascript:x"><path d="M0 0 L1 1 Z" fill="#000" onclick="y"/></a></svg>';
    expect(sanitiseSvgDocument(t)).toBe('<svg viewBox="0 0 1 1"><a xlink:href="#k"><path d="M0 0 L1 1 Z" fill="#000"/></a></svg>');
  });
});
