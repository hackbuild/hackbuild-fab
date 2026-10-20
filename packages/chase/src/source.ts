// The chase source reader (D-178, spec/chase.ts CHASE_SOURCE_RULES). A
// chase.ts is data written in TypeScript syntax: one
// `export const chase = defineChase({...})` over a literal. This file
// tokenises and parses that form and never imports, evaluates or compiles
// it, so reading a chase someone else wrote runs none of their code. It has
// no dependency on the TypeScript compiler and no node or DOM API, so it
// runs the same in node and in a bake.
//
// Interim at M00: the derived chase schema, migrate and deep normalise
// (D-131) land with chase.validate at M10. Until then the reader checks the
// fields part.build reads (meta.id, materials, params, build) after the
// source rules. Chase.build.module is "./<file>.ts" (spec/chase.ts
// Chase.build): a "./" prefix, a ".ts" ending, no ".." segment and no
// absolute path, so the module stays inside the design directory.

import {
  CHASE_ID_PATTERN, CHASE_SOURCE_LIMITS, commandError, sha256Hex,
  type Chase, type ChaseSourceRead, type ChaseSourceRule, type ChaseSourceSpan, type CommandError, type Hash, type ThrownCommandError,
} from "@hackbuild/spec";

/** Modules a chase.ts may import from; the value import is defineChase only. */
export const CHASE_IMPORT_MODULES = ["@hackbuild/kernel/author", "@hackbuild/spec"] as const;

/**
 * What a source file holds: the exported constant, the define call that
 * wraps the literal, and for a bench the leading chase argument imported
 * from the chase.ts beside it. The chase and the bench are read by the one
 * parser, so neither is ever executed (D-178).
 */
interface SourceForm {
  readonly name: "chase" | "bench";
  readonly call: "defineChase" | "defineBench";
  /** The identifier passed before the literal, imported from one of localModules. */
  readonly lead?: "chase";
  readonly localModules: readonly string[];
}

const CHASE_FORM: SourceForm = { name: "chase", call: "defineChase", localModules: [] };
const BENCH_FORM: SourceForm = { name: "bench", call: "defineBench", lead: "chase", localModules: ["./chase", "./chase.ts", "./chase.js"] };

/** Object keys the reader refuses: assigning one would set a prototype instead of a key. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__"]);

type Kind = "ident" | "string" | "template" | "number" | "punct";

interface Token {
  readonly kind: Kind;
  /** Source text of the token. */
  readonly text: string;
  /** Cooked value: string contents for string and template tokens. */
  readonly value?: string;
  /** Template only: true when it holds a ${} substitution. */
  readonly subst?: boolean;
  /** Char offsets [start, end). */
  readonly start: number;
  readonly end: number;
  /** A line break precedes the token. */
  readonly nl: boolean;
}

const PUNCT3 = ["...", "===", "!==", "**=", "<<=", ">>=", ">>>"];
const PUNCT2 = ["=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "<<", ">>"];
const PUNCT1 = "{}[](),:;.=<>-+*/%?!&|^~@#";

const ID_START = /[A-Za-z_$]/;
const ID_PART = /[\w$]/;
const NUMBER = /^(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?)n?/;

class SourceError extends Error {
  constructor(readonly rule: ChaseSourceRule, readonly at: number, readonly pointer: string, readonly got: string, readonly expected: string, hint: string) {
    super(hint);
  }
}

/** UTF-8 byte offset of every char offset, so spans are byte offsets as ChaseSourceSpan states. */
export function byteOffsets(source: string): Uint32Array {
  const out = new Uint32Array(source.length + 1);
  let b = 0;
  for (let i = 0; i < source.length; i += 1) {
    out[i] = b;
    const c = source.charCodeAt(i);
    if (c < 0x80) b += 1;
    else if (c < 0x800) b += 2;
    else if (c >= 0xd800 && c <= 0xdbff) b += 4;
    else if (c >= 0xdc00 && c <= 0xdfff) b += 0;
    else b += 3;
  }
  out[source.length] = b;
  return out;
}

function cookEscape(src: string, i: number, at: number): { readonly ch: string; readonly next: number } {
  const c = src[i];
  const simple: Readonly<Record<string, string>> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0" };
  if (c === undefined) throw new SourceError("literal", at, "", "end of file", "a closed string", "close the string");
  if (c in simple && !(c === "0" && /\d/.test(src[i + 1] ?? ""))) return { ch: simple[c]!, next: i + 1 };
  if (c === "\n") return { ch: "", next: i + 1 };
  if (c === "\r") return { ch: "", next: src[i + 1] === "\n" ? i + 2 : i + 1 };
  if (c === "x") {
    const h = src.slice(i + 1, i + 3);
    if (!/^[0-9a-fA-F]{2}$/.test(h)) throw new SourceError("literal", at, "", `\\x${h}`, "two hex digits", "write \\x with two hex digits");
    return { ch: String.fromCharCode(parseInt(h, 16)), next: i + 3 };
  }
  if (c === "u") {
    if (src[i + 1] === "{") {
      const close = src.indexOf("}", i + 2);
      const h = close < 0 ? "" : src.slice(i + 2, close);
      if (!/^[0-9a-fA-F]{1,6}$/.test(h) || parseInt(h, 16) > 0x10ffff) throw new SourceError("literal", at, "", `\\u{${h}}`, "a code point", "write \\u{} with a code point");
      return { ch: String.fromCodePoint(parseInt(h, 16)), next: close + 1 };
    }
    const h = src.slice(i + 1, i + 5);
    if (!/^[0-9a-fA-F]{4}$/.test(h)) throw new SourceError("literal", at, "", `\\u${h}`, "four hex digits", "write \\u with four hex digits");
    return { ch: String.fromCharCode(parseInt(h, 16)), next: i + 5 };
  }
  if (/[1-9]/.test(c)) throw new SourceError("literal", at, "", `\\${c}`, "no octal escape", "remove the octal escape");
  return { ch: c, next: i + 1 };
}

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let nl = true;
  while (i < src.length) {
    const c = src[i]!;
    if (c === "\n" || c === "\r" || c === " " || c === " ") {
      nl = true;
      i += 1;
      continue;
    }
    if (c === " " || c === "\t" || c === "\v" || c === "\f" || c === "﻿" || c === " ") {
      i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n" && src[i] !== "\r") i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const close = src.indexOf("*/", i + 2);
      if (close < 0) throw new SourceError("literal", i, "", "/*", "a closed comment", "close the block comment");
      if (/[\n\r]/.test(src.slice(i, close))) nl = true;
      i = close + 2;
      continue;
    }
    const start = i;
    if (c === "\"" || c === "'") {
      let value = "";
      i += 1;
      for (;;) {
        const d = src[i];
        if (d === undefined || d === "\n" || d === "\r") throw new SourceError("literal", start, "", "an open string", "a closed string", "close the string on its line");
        if (d === c) { i += 1; break; }
        if (d === "\\") {
          const e = cookEscape(src, i + 1, i);
          value += e.ch;
          i = e.next;
          continue;
        }
        value += d;
        i += 1;
      }
      out.push({ kind: "string", text: src.slice(start, i), value, start, end: i, nl });
      nl = false;
      continue;
    }
    if (c === "`") {
      let value = "";
      let subst = false;
      i += 1;
      for (;;) {
        const d = src[i];
        if (d === undefined) throw new SourceError("literal", start, "", "an open template", "a closed template", "close the template");
        if (d === "`") { i += 1; break; }
        if (d === "\\") {
          const e = cookEscape(src, i + 1, i);
          value += e.ch;
          i = e.next;
          continue;
        }
        if (d === "$" && src[i + 1] === "{") {
          // Skip the substitution, braces balanced; the parser refuses the value.
          subst = true;
          let depth = 1;
          i += 2;
          while (i < src.length && depth > 0) {
            if (src[i] === "{") depth += 1;
            else if (src[i] === "}") depth -= 1;
            i += 1;
          }
          continue;
        }
        value += d === "\r" ? "\n" : d;
        i += d === "\r" && src[i + 1] === "\n" ? 2 : 1;
      }
      out.push({ kind: "template", text: src.slice(start, i), value, subst, start, end: i, nl });
      nl = false;
      continue;
    }
    if (/\d/.test(c) || (c === "." && /\d/.test(src[i + 1] ?? ""))) {
      const m = NUMBER.exec(src.slice(i));
      const text = m?.[0] ?? c;
      i += text.length;
      out.push({ kind: "number", text, start, end: i, nl });
      nl = false;
      continue;
    }
    if (ID_START.test(c)) {
      i += 1;
      while (i < src.length && ID_PART.test(src[i]!)) i += 1;
      out.push({ kind: "ident", text: src.slice(start, i), start, end: i, nl });
      nl = false;
      continue;
    }
    const p3 = src.slice(i, i + 3);
    const p2 = src.slice(i, i + 2);
    const text = PUNCT3.includes(p3) ? p3 : PUNCT2.includes(p2) ? p2 : PUNCT1.includes(c) ? c : undefined;
    if (text === undefined) throw new SourceError("literal", i, "", c, "ASCII source", `remove the character U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")} outside strings and comments`);
    i += text.length;
    out.push({ kind: "punct", text, start, end: i, nl });
    nl = false;
  }
  return out;
}

const escapePointer = (s: string): string => s.replace(/~/g, "~0").replace(/\//g, "~1");

/** Statement keywords that end a type alias written without a semicolon. */
const STATEMENT_START: ReadonlySet<string> = new Set(["export", "import", "interface", "type", "declare", "const", "let", "var", "function", "class"]);

class Parser {
  private i = 0;
  private chase: unknown;
  private chaseSeen = false;
  private defineChaseImported = false;
  readonly spans: { pointer: string; start: number; end: number }[] = [];

  constructor(private readonly src: string, private readonly toks: readonly Token[], private readonly form: SourceForm = CHASE_FORM) {}

  private peek(n = 0): Token | undefined {
    return this.toks[this.i + n];
  }

  private next(): Token | undefined {
    const t = this.toks[this.i];
    this.i += 1;
    return t;
  }

  private at(): number {
    return this.peek()?.start ?? this.src.length;
  }

  private is(text: string, n = 0): boolean {
    const t = this.peek(n);
    return t !== undefined && (t.kind === "punct" || t.kind === "ident") && t.text === text;
  }

  private expect(text: string, rule: ChaseSourceRule, hint: string): Token {
    const t = this.peek();
    if (t === undefined || t.text !== text || (t.kind !== "punct" && t.kind !== "ident")) {
      throw new SourceError(rule, this.at(), "", t?.text ?? "end of file", text, hint);
    }
    this.i += 1;
    return t;
  }

  private semicolon(): void {
    if (this.is(";")) this.i += 1;
  }

  parse(): unknown {
    while (this.peek() !== undefined) this.statement();
    const { name, call } = this.form;
    if (!this.chaseSeen) {
      throw new SourceError("export", this.src.length, "", `no ${name}`, `export const ${name} = ${call}({...})`, `export the ${name} as export const ${name} = ${call}({...})`);
    }
    if (!this.defineChaseImported) {
      throw new SourceError("imports", 0, "", "no import", `import { ${call} } from "${CHASE_IMPORT_MODULES[0]}"`, `import ${call} from the kernel author module or @hackbuild/spec`);
    }
    return this.chase;
  }

  private statement(): void {
    const t = this.peek()!;
    if (t.kind === "punct" && t.text === ";") {
      this.i += 1;
      return;
    }
    if (t.kind === "ident" && t.text === "import") return this.importDecl();
    if (t.kind === "ident" && t.text === "export") {
      const n = this.peek(1);
      if (n?.text === "const") return this.chaseDecl();
      if (n?.text === "default") {
        this.i += 2;
        const name = this.next();
        if (name?.kind !== "ident" || name.text !== this.form.name) {
          throw new SourceError("export", name?.start ?? this.src.length, "", name?.text ?? "end of file", `export default ${this.form.name}`, `export default only the ${this.form.name} constant`);
        }
        this.semicolon();
        return;
      }
      if (n?.text === "type" && this.peek(2)?.kind === "ident") {
        this.i += 1;
        return this.typeAlias();
      }
      if (n?.text === "interface") {
        this.i += 1;
        return this.interfaceDecl();
      }
      throw new SourceError("export", t.start, "", `export ${n?.text ?? ""}`.trim(), "export const chase, export default chase, or an exported type", "a chase.ts exports the chase and types only");
    }
    if (t.kind === "ident" && t.text === "type" && this.peek(1)?.kind === "ident") return this.typeAlias();
    if (t.kind === "ident" && t.text === "interface") return this.interfaceDecl();
    throw new SourceError("export", t.start, "", t.text, "an import, the chase export, or a type declaration", "move code out of chase.ts into build.ts; a chase declares and never computes");
  }

  private moduleName(): string {
    const m = this.next();
    if (m?.kind !== "string") throw new SourceError("imports", m?.start ?? this.src.length, "", m?.text ?? "end of file", "a module string", "import from a quoted module name");
    const allowed = [...CHASE_IMPORT_MODULES, ...this.form.localModules];
    if (!allowed.includes(m.value!)) {
      throw new SourceError("imports", m.start, "", m.value!, allowed.join(" or "), `import only from ${allowed.join(" or ")}`);
    }
    return m.value!;
  }

  private importDecl(): void {
    const start = this.next()!.start;
    const typeOnly = this.is("type") && (this.is("{", 1) || this.peek(1)?.kind === "ident" && !this.is("from", 1));
    if (typeOnly) this.i += 1;
    if (!this.is("{")) {
      throw new SourceError("imports", start, "", this.peek()?.text ?? "end of file", "a named import list", "import named bindings only: no side-effect, default or namespace import");
    }
    this.i += 1;
    const values: string[] = [];
    while (!this.is("}")) {
      let typed = typeOnly;
      if (this.is("type") && this.peek(1)?.kind === "ident" && !this.is(",", 1) && !this.is("}", 1) && !this.is("as", 1)) {
        typed = true;
        this.i += 1;
      }
      const name = this.next();
      if (name?.kind !== "ident") throw new SourceError("imports", name?.start ?? this.src.length, "", name?.text ?? "end of file", "an imported name", "list imported names");
      if (this.is("as")) {
        this.i += 1;
        const alias = this.next();
        if (alias?.kind !== "ident") throw new SourceError("imports", this.at(), "", alias?.text ?? "end of file", "an alias", "name the alias");
        if (!typed) throw new SourceError("imports", name.start, "", `${name.text} as ${alias.text}`, `${name.text} under its own name`, `import ${name.text} without renaming it`);
      }
      if (!typed) values.push(name.text);
      if (this.is(",")) this.i += 1;
      else if (!this.is("}")) throw new SourceError("imports", this.at(), "", this.peek()?.text ?? "end of file", ", or }", "separate imported names with commas");
    }
    this.i += 1;
    this.expect("from", "imports", "import { ... } from a module");
    const local = this.form.localModules.includes(this.moduleName());
    const want = local ? this.form.lead : this.form.call;
    for (const v of values) {
      if (v !== want) {
        throw new SourceError("imports", start, "", v, `${want ?? this.form.call}, or names marked type`, `import ${v} as a type (import { type ${v} }) or remove it; the only value import is ${want ?? this.form.call}`);
      }
      if (!local) this.defineChaseImported = true;
    }
    this.semicolon();
  }

  /** Skip `type Name<...> = ...;` as erased; ends at `;` or a new statement line at bracket depth 0. */
  private typeAlias(): void {
    this.i += 2;
    let depth = 0;
    for (;;) {
      const t = this.peek();
      if (t === undefined) return;
      if (depth === 0 && t.kind === "punct" && t.text === ";") {
        this.i += 1;
        return;
      }
      if (depth === 0 && t.nl && t.kind === "ident" && STATEMENT_START.has(t.text)) return;
      if (t.kind === "punct" && "([{".includes(t.text)) depth += 1;
      if (t.kind === "punct" && ")]}".includes(t.text)) depth -= 1;
      if (depth < 0) throw new SourceError("export", t.start, "", t.text, "balanced brackets", "close the brackets of the type declaration");
      this.i += 1;
    }
  }

  /** Skip `interface Name ... { ... }` as erased. */
  private interfaceDecl(): void {
    const start = this.next()!.start;
    while (this.peek() !== undefined && !this.is("{")) this.i += 1;
    if (this.peek() === undefined) throw new SourceError("export", start, "", "interface", "an interface body", "close the interface declaration");
    let depth = 0;
    do {
      const t = this.next()!;
      if (t.kind === "punct" && t.text === "{") depth += 1;
      if (t.kind === "punct" && t.text === "}") depth -= 1;
      if (this.peek() === undefined && depth > 0) throw new SourceError("export", start, "", "interface", "a closed body", "close the interface body");
    } while (depth > 0);
  }

  private chaseDecl(): void {
    const start = this.peek()!.start;
    const { name: want, call: fn, lead } = this.form;
    this.i += 2;
    const name = this.next();
    if (name?.kind !== "ident" || name.text !== want) {
      throw new SourceError("export", start, "", name?.text ?? "end of file", `export const ${want}`, `the one exported constant is named ${want}`);
    }
    if (this.chaseSeen) throw new SourceError("export", start, "", want, `one ${want} export`, `export the ${want} once`);
    if (this.is(":")) throw new SourceError("export", this.at(), "", ":", `export const ${want} = ${fn}(...)`, `drop the type annotation; ${fn} types the ${want}`);
    this.expect("=", "export", `assign the ${want} with =`);
    const call = this.next();
    if (call?.kind !== "ident" || call.text !== fn) {
      throw new SourceError("export", call?.start ?? this.src.length, "", call?.text ?? "end of file", `${fn}(`, `wrap the literal in ${fn}(...)`);
    }
    this.expect("(", "export", `call ${fn} with the ${want} literal`);
    if (lead !== undefined) {
      this.expect(lead, "export", `pass ${fn} the imported ${lead} first`);
      this.expect(",", "export", `pass ${fn} the ${lead}, then the literal`);
    }
    this.chase = this.value("", 1);
    if (this.is(",")) this.i += 1;
    this.expect(")", "export", "pass defineChase one literal");
    this.chaseSeen = true;
    this.semicolon();
  }

  private operatorCheck(pointer: string): void {
    const t = this.peek();
    if (t === undefined) return;
    if (t.kind === "punct" && [",", "]", "}", ")", ";"].includes(t.text)) return;
    throw new SourceError("no-identifier", t.start, pointer, t.text, "a literal value", "a chase holds literals only; compute in build.ts");
  }

  private value(pointer: string, depth: number): unknown {
    if (depth > CHASE_SOURCE_LIMITS.maxDepth) {
      throw new SourceError("size", this.at(), pointer, String(depth), `nesting at most ${CHASE_SOURCE_LIMITS.maxDepth} deep`, "flatten the chase");
    }
    const t = this.peek();
    if (t === undefined) throw new SourceError("literal", this.src.length, pointer, "end of file", "a literal value", "finish the literal");
    const span = { pointer, start: t.start, end: t.start };
    this.spans.push(span);
    let v: unknown;
    if (t.kind === "punct" && t.text === "-" && this.peek(1)?.kind === "number") {
      this.i += 1;
      v = -this.number(pointer);
    } else if (t.kind === "number") {
      v = this.number(pointer);
    } else if (t.kind === "string") {
      this.i += 1;
      v = t.value;
    } else if (t.kind === "template") {
      if (t.subst === true) throw new SourceError("literal", t.start, pointer, t.text, "a template with no substitution", "write the value out; a chase holds no ${} substitution");
      this.i += 1;
      v = t.value;
    } else if (t.kind === "ident" && (t.text === "true" || t.text === "false" || t.text === "null")) {
      this.i += 1;
      v = t.text === "true" ? true : t.text === "false" ? false : null;
    } else if (t.kind === "ident") {
      const what = this.is("(", 1) ? `call ${t.text}(...)` : t.text === "new" ? "new" : `identifier ${t.text}`;
      throw new SourceError("no-identifier", t.start, pointer, what, "a literal value", "write the value out; a chase names no identifier and calls nothing");
    } else if (t.kind === "punct" && t.text === "...") {
      throw new SourceError("no-spread", t.start, pointer, "...", "a literal value", "write each element out; a chase holds no spread");
    } else if (t.kind === "punct" && t.text === "[") {
      v = this.array(pointer, depth);
    } else if (t.kind === "punct" && t.text === "{") {
      v = this.object(pointer, depth);
    } else {
      throw new SourceError(t.kind === "punct" && t.text !== "(" ? "no-identifier" : "literal", t.start, pointer, t.text, "a literal value", "a chase holds string, number, boolean, null, array and object literals");
    }
    span.end = this.toks[this.i - 1]!.end;
    if (this.is("as") && this.is("const", 1)) this.i += 2;
    else if (this.is("as") || this.is("satisfies")) {
      throw new SourceError("literal", this.at(), pointer, this.peek()!.text, "as const or nothing", "drop the type assertion; only as const may follow a literal");
    }
    this.operatorCheck(pointer);
    return v;
  }

  private number(pointer: string): number {
    const t = this.next()!;
    if (t.text.endsWith("n")) throw new SourceError("literal", t.start, pointer, t.text, "a number", "write a number, not a bigint");
    const clean = t.text.replace(/_/g, "");
    const n = Number(clean);
    if (Number.isNaN(n)) throw new SourceError("literal", t.start, pointer, t.text, "a numeric literal", "write a decimal number");
    if (!Number.isFinite(n)) throw new SourceError("finite", t.start, pointer, t.text, "a finite number", "write a finite number");
    return n;
  }

  private array(pointer: string, depth: number): unknown[] {
    this.i += 1;
    const out: unknown[] = [];
    while (!this.is("]")) {
      if (this.peek() === undefined) throw new SourceError("literal", this.src.length, pointer, "end of file", "]", "close the array");
      if (this.is(",")) throw new SourceError("literal", this.at(), `${pointer}/${out.length}`, ",", "an element", "remove the empty array slot");
      out.push(this.value(`${pointer}/${out.length}`, depth + 1));
      if (this.is(",")) this.i += 1;
      else if (!this.is("]")) throw new SourceError("literal", this.at(), pointer, this.peek()?.text ?? "end of file", ", or ]", "separate elements with commas");
    }
    this.i += 1;
    return out;
  }

  private object(pointer: string, depth: number): Record<string, unknown> {
    this.i += 1;
    const out: Record<string, unknown> = {};
    while (!this.is("}")) {
      const k = this.peek();
      if (k === undefined) throw new SourceError("literal", this.src.length, pointer, "end of file", "}", "close the object");
      if (k.kind === "punct" && k.text === "...") throw new SourceError("no-spread", k.start, pointer, "...", "a key: value member", "write each member out; a chase holds no spread");
      if (k.kind === "punct" && k.text === "[") throw new SourceError("keys", k.start, pointer, "computed key", "an identifier or string key", "write the key out");
      if (k.kind === "number") throw new SourceError("keys", k.start, pointer, k.text, "an identifier or string key", "quote the numeric key");
      if (k.kind !== "ident" && k.kind !== "string") throw new SourceError("keys", k.start, pointer, k.text, "an identifier or string key", "write key: value");
      const key = k.kind === "string" ? k.value! : k.text;
      const after = this.peek(1);
      if (after === undefined) throw new SourceError("literal", this.src.length, pointer, "end of file", "}", "close the object");
      if (after.kind === "punct" && (after.text === "," || after.text === "}")) {
        throw new SourceError("keys", k.start, `${pointer}/${escapePointer(key)}`, key, "key: value", `write ${key}: <value>; a chase holds no shorthand member`);
      }
      if (after.kind === "punct" && (after.text === "(" || after.text === "<")) {
        throw new SourceError("keys", k.start, `${pointer}/${escapePointer(key)}`, `method ${key}`, "key: value", "a chase holds no method; compute in build.ts");
      }
      if (k.kind === "ident" && (key === "get" || key === "set" || key === "async") && (after.kind === "ident" || after.kind === "string")) {
        throw new SourceError("keys", k.start, pointer, `${key} ${after.text}`, "key: value", "a chase holds no getter, setter or method");
      }
      if (after.kind === "punct" && after.text === "?" ) {
        throw new SourceError("keys", k.start, `${pointer}/${escapePointer(key)}`, `${key}?`, "key: value", "write key: value");
      }
      this.i += 1;
      this.expect(":", "keys", "write key: value");
      const p = `${pointer}/${escapePointer(key)}`;
      if (FORBIDDEN_KEYS.has(key)) throw new SourceError("keys", k.start, p, key, "a key other than __proto__", "rename the key; __proto__ sets a prototype");
      if (Object.prototype.hasOwnProperty.call(out, key)) throw new SourceError("keys", k.start, p, key, "each key once", `remove the second ${key}`);
      out[key] = this.value(p, depth + 1);
      if (this.is(",")) this.i += 1;
      else if (!this.is("}")) throw new SourceError("literal", this.at(), pointer, this.peek()?.text ?? "end of file", ", or }", "separate members with commas");
    }
    this.i += 1;
    return out;
  }
}

function lineCol(src: string, at: number): string {
  const before = src.slice(0, at);
  const line = before.split("\n").length;
  return `${line}:${at - before.lastIndexOf("\n")}`;
}

const thrown: (hbf: CommandError) => ThrownCommandError = commandError;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * build-path: a relative path starting "./" and ending ".ts", with no ".."
 * segment, no backslash and no absolute form, so it resolves inside the
 * design directory (spec/chase.ts Chase.build). The parent checks the
 * resolved realpath again (symlinks).
 */
export function buildPathProblem(module: string): string | undefined {
  if (!module.startsWith("./")) return "start the module path with ./";
  if (module.includes("\\")) return "use / in the module path";
  if (module.split("/").some((s) => s === ".." || s === "")) return "remove .. and empty segments from the module path";
  if (/\.[cm]?js$/.test(module)) return "point the module at the .ts source";
  if (!module.endsWith(".ts")) return "end the module path in .ts, as in ./build.ts";
  return undefined;
}

/** The fields part.build reads, until the derived chase schema lands (M10, D-131). */
function shapeProblem(c: unknown): { readonly path: string; readonly expected: string } | undefined {
  if (!isRecord(c)) return { path: "/", expected: "an object" };
  const meta = c["meta"];
  if (!isRecord(meta)) return { path: "/meta", expected: "an object" };
  if (typeof meta["id"] !== "string" || meta["id"] === "") return { path: "/meta/id", expected: "a chase id string" };
  if (!Array.isArray(c["materials"])) return { path: "/materials", expected: "an array of material slots" };
  if (!Array.isArray(c["params"])) return { path: "/params", expected: "an array of param groups" };
  const build = c["build"];
  if (!isRecord(build)) return { path: "/build", expected: "{ module, fn }" };
  if (typeof build["module"] !== "string") return { path: "/build/module", expected: "a module path string" };
  if (typeof build["fn"] !== "string" || build["fn"] === "") return { path: "/build/fn", expected: "an exported function name" };
  return undefined;
}

/**
 * Read a chase.ts source as data (spec/chase.ts ReadChaseSource). A breach
 * of CHASE_SOURCE_RULES throws a CommandError E_SCHEMA with record
 * "chase-source/<rule>" and the JSON pointer of the offending value.
 */
export function readChaseSource(source: string, file: string): ChaseSourceRead {
  const bytes = byteOffsets(source);
  const size = bytes[source.length]!;
  const fail = (rule: ChaseSourceRule, at: number, pointer: string, got: unknown, expected: string, hint: string): never => {
    throw thrown({
      code: "E_SCHEMA", path: pointer === "" ? "/" : pointer, got, expected,
      hint: `${file}:${lineCol(source, at)} ${hint}`, record: `chase-source/${rule}`,
    });
  };
  if (size > CHASE_SOURCE_LIMITS.maxBytes) {
    fail("size", 0, "", size, `at most ${CHASE_SOURCE_LIMITS.maxBytes} bytes`, "split the chase; the source is over the size budget");
  }
  let chase: unknown;
  let charSpans: readonly ChaseSourceSpan[] = [];
  try {
    const p = new Parser(source, tokenize(source));
    chase = p.parse();
    charSpans = p.spans;
  } catch (e) {
    if (e instanceof SourceError) fail(e.rule, e.at, e.pointer, e.got, e.expected, e.message);
    throw e;
  }
  const spans = charSpans.map((s) => ({ pointer: s.pointer, start: bytes[s.start]!, end: bytes[s.end]! }));
  const shape = shapeProblem(chase);
  if (shape !== undefined) {
    throw thrown({ code: "E_SCHEMA", path: shape.path, expected: shape.expected, hint: `${file}: the chase is missing a field part.build reads`, record: "chase-source/literal" });
  }
  const id = ((chase as Record<string, unknown>)["meta"] as Record<string, unknown>)["id"] as string;
  if (!CHASE_ID_PATTERN.test(id)) {
    const span = charSpans.find((s) => s.pointer === "/meta/id");
    fail("id", span?.start ?? 0, "/meta/id", id, "a lowercase slug, letters and digits joined by single hyphens",
      "write meta.id as a lowercase slug such as keys-flex-pair");
  }
  const module = ((chase as Record<string, unknown>)["build"] as Record<string, unknown>)["module"] as string;
  const problem = buildPathProblem(module);
  if (problem !== undefined) {
    const span = charSpans.find((s) => s.pointer === "/build/module");
    fail("build-path", span?.start ?? 0, "/build/module", module, "./<file>.ts inside the design directory", problem);
  }
  return { chase: chase as Chase, spans, sourceHash: sha256Hex(source) as Hash };
}

/**
 * Read a bench.ts source as data: `export const bench = defineBench(chase,
 * {...})` over a literal, with chase imported from the chase.ts beside it.
 * The same parser and source rules as the chase apply, so validating a
 * bench runs none of its code. A breach throws E_SCHEMA with record
 * "bench-source/<rule>". The layout is returned unchecked; chase.validate
 * applies the kind rules to it.
 */
export function readBenchSource(source: string, file: string): { readonly bench: unknown; readonly spans: readonly ChaseSourceSpan[] } {
  const bytes = byteOffsets(source);
  const size = bytes[source.length]!;
  if (size > CHASE_SOURCE_LIMITS.maxBytes) {
    throw thrown({ code: "E_SCHEMA", path: "/", got: size, expected: `at most ${CHASE_SOURCE_LIMITS.maxBytes} bytes`, hint: `${file}: split the bench; the source is over the size budget`, record: "bench-source/size" });
  }
  try {
    const p = new Parser(source, tokenize(source), BENCH_FORM);
    const bench = p.parse();
    return { bench, spans: p.spans.map((s) => ({ pointer: s.pointer, start: bytes[s.start]!, end: bytes[s.end]! })) };
  } catch (e) {
    if (e instanceof SourceError) {
      throw thrown({
        code: "E_SCHEMA", path: e.pointer === "" ? "/" : e.pointer, got: e.got, expected: e.expected,
        hint: `${file}:${lineCol(source, e.at)} ${e.message}`, record: `bench-source/${e.rule}`,
      });
    }
    throw e;
  }
}
