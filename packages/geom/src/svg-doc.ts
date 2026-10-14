// The SVG document sanitiser (D-166, D-240): every SVG document from
// outside the opened workspace passes here before anything parses it. A
// DOCTYPE is refused (it can declare entities); script and foreignObject
// elements are dropped with everything inside them; every on* attribute
// and every href or xlink:href whose value does not start with "#" is
// dropped. Comments, the XML declaration and all other markup pass through
// unchanged, so the path data a kernel reads is byte for byte what the
// file holds. A tag left open at the end of the text is refused, since the
// rest of the document cannot be read as markup.
//
// The first caller is the KEYWAY family's mark (M05-T14); the M09 drop and
// picker read through the same function (D-240).

import { commandError } from "@hackbuild/spec";

/** Element names dropped with their content, compared without a namespace prefix, any case. */
export const SVG_DROPPED_ELEMENTS = ["script", "foreignobject"] as const;

function refuse(rule: string, got: unknown, hint: string): Error {
  return commandError({ code: "E_SCHEMA", path: "/svg", got, expected: "an SVG document without a DOCTYPE, every tag closed", record: `svg-intake/${rule}`, hint });
}

const ATTR = /([^\s=/>]+)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g;

const localName = (name: string): string => {
  const i = name.indexOf(":");
  return (i >= 0 ? name.slice(i + 1) : name).toLowerCase();
};

const unquote = (v: string): string => {
  const t = v.replace(/^\s*=\s*/, "");
  return t.startsWith('"') || t.startsWith("'") ? t.slice(1, -1) : t;
};

/** Keep an attribute unless it is an event handler or a link that leaves the file. */
function keepAttr(name: string, value: string | undefined): boolean {
  const n = name.toLowerCase();
  if (n.startsWith("on")) return false;
  if (localName(n) === "href") return value !== undefined && unquote(value).trimStart().startsWith("#");
  return true;
}

/** Rebuild a start or empty tag with the attributes that stay. */
function cleanTag(body: string, selfClosing: boolean): string {
  const m = /^([^\s/>]+)([\s\S]*)$/.exec(body)!;
  const name = m[1]!;
  const rest = m[2]!;
  const kept: string[] = [];
  for (const a of rest.matchAll(ATTR)) {
    const attrName = a[1]!;
    if (attrName === "/") continue;
    if (keepAttr(attrName, a[2])) kept.push(a[2] === undefined ? attrName : `${attrName}${a[2]}`);
  }
  return `<${name}${kept.length > 0 ? ` ${kept.join(" ")}` : ""}${selfClosing ? "/" : ""}>`;
}

/** The sanitised document text. */
export function sanitiseSvgDocument(text: string): string {
  let out = "";
  let i = 0;
  // Depth inside a dropped element; while above zero nothing is written.
  let drop = 0;
  const n = text.length;
  while (i < n) {
    const lt = text.indexOf("<", i);
    if (lt < 0) {
      if (drop === 0) out += text.slice(i);
      break;
    }
    if (drop === 0) out += text.slice(i, lt);
    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      if (end < 0) throw refuse("unclosed", "<!--", "close the comment or remove it");
      if (drop === 0) out += text.slice(lt, end + 3);
      i = end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt + 9);
      if (end < 0) throw refuse("unclosed", "<![CDATA[", "close the CDATA section or remove it");
      if (drop === 0) out += text.slice(lt, end + 3);
      i = end + 3;
      continue;
    }
    if (text.startsWith("<!", lt)) {
      const head = text.slice(lt, lt + 16).replace(/\s+/g, " ");
      throw refuse(/^<!doctype/i.test(head) ? "doctype" : "declaration", head, "remove the DOCTYPE and any entity declaration; an SVG document needs neither");
    }
    if (text.startsWith("<?", lt)) {
      const end = text.indexOf("?>", lt + 2);
      if (end < 0) throw refuse("unclosed", "<?", "close the processing instruction or remove it");
      if (drop === 0) out += text.slice(lt, end + 2);
      i = end + 2;
      continue;
    }
    // A tag: find its end outside quoted attribute values.
    let j = lt + 1;
    let quote = "";
    for (; j < n; j++) {
      const c = text[j]!;
      if (quote !== "") {
        if (c === quote) quote = "";
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (j >= n) throw refuse("unclosed", text.slice(lt, lt + 16), "close every tag with >");
    const raw = text.slice(lt + 1, j);
    i = j + 1;
    if (raw.startsWith("/")) {
      const name = localName(raw.slice(1).trim());
      if ((SVG_DROPPED_ELEMENTS as readonly string[]).includes(name)) {
        if (drop > 0) drop--;
        continue;
      }
      if (drop === 0) out += `<${raw}>`;
      continue;
    }
    const selfClosing = raw.trimEnd().endsWith("/");
    const body = selfClosing ? raw.trimEnd().slice(0, -1) : raw;
    const rawName = /^[^\s/>]*/.exec(body)![0];
    if (rawName === "") throw refuse("malformed", `<${raw.slice(0, 16)}>`, "give every tag a name right after <");
    const name = localName(rawName);
    if ((SVG_DROPPED_ELEMENTS as readonly string[]).includes(name)) {
      if (!selfClosing) drop++;
      continue;
    }
    if (drop > 0) continue;
    out += cleanTag(body, selfClosing);
  }
  return out;
}
