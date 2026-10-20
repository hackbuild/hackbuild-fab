// chase.patch over source text (M10-T05 step 2, D-115, spec/chase.ts
// ChaseSourceSpan). An anchor edit replaces text that must match exactly
// once, else E_STALE naming the match count and lines. A pointer edit
// replaces the literal the reader's span names for that pointer; a pointer
// ending "-" appends to an array with the indentation of its siblings.
// Bytes outside the edited span never change, so comments and layout
// survive. After each pointer edit the reader parses the text again, and a
// value tree other than the expected one is E_STALE. The patched text then
// goes through validation, and a patch that adds an error writes nothing.
// Each applied edit records its inverse, the edit that restores the text
// it replaced, for the patch log. Pure: the caller reads and writes files.

import { commandError, didYouMean, isThrownCommandError, type Chase, type CommandError, type PatchEdit } from "@hackbuild/spec";
import { byteOffsets, readChaseSource } from "./source.js";
import { validateDocument } from "./validate.js";

/** The edits the source writer applies: anchors and pointers. */
export type SourceEdit = Extract<PatchEdit, { readonly anchor: string } | { readonly pointer: string }>;

export interface PatchOptions {
  /**
   * Errors of a chase source; defaults to the reader and validateDocument
   * with no registries. The writer compares the errors before and after.
   */
  readonly validate?: (source: string) => readonly CommandError[];
  /**
   * A pointer naming an absent key of an existing object adds the member.
   * Off for edits a model writes (an absent key is E_REF with didYouMean);
   * arch.apply sets it to add chase.applied to a chase that has none.
   */
  readonly addMembers?: boolean;
}

export interface PatchPlan {
  /** The patched source text. */
  readonly source: string;
  /** Edits applied, count. */
  readonly edits: number;
  /** Edits that restore the source, in the order to apply them. */
  readonly inverse: readonly SourceEdit[];
  readonly before: Chase;
  readonly after: Chase;
}

export type PatchOutcome =
  | { readonly ok: true; readonly plan: PatchPlan }
  /** The patch adds these errors; nothing may be written. */
  | { readonly ok: false; readonly errors: readonly CommandError[] };

const IDENT = /^[A-Za-z_$][\w$]*$/;

const fail = (e: CommandError): never => {
  throw commandError(e);
};

const unescape = (t: string): string => t.replace(/~1/g, "/").replace(/~0/g, "~");
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every start offset of needle in text, overlapping matches counted. */
function matches(text: string, needle: string): number[] {
  const out: number[] = [];
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + 1)) out.push(i);
  return out;
}

const lineOf = (text: string, at: number): number => text.slice(0, at).split("\n").length;

/**
 * A literal for one value as chase.ts writes it: identifier keys bare,
 * strings double quoted, one line. Anything JSON cannot hold is E_SCHEMA.
 */
export function literal(v: unknown, at: string): string {
  if (v === null || typeof v === "boolean") return String(v);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) fail({ code: "E_SCHEMA", path: at, got: String(v), expected: "a finite number", hint: "set a finite number" });
    return Object.is(v, -0) ? "0" : String(v);
  }
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x, i) => literal(x, `${at}/${i}`)).join(", ")}]`;
  if (isRecord(v)) {
    const members = Object.entries(v).map(([k, x]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${literal(x, `${at}/${k}`)}`);
    return members.length === 0 ? "{}" : `{ ${members.join(", ")} }`;
  }
  return fail({ code: "E_SCHEMA", path: at, got: typeof v, expected: "a string, number, boolean, null, array or object", hint: "set a json value" });
}

/** The value at a pointer, undefined when it names nothing. */
function at(v: unknown, pointer: string): unknown {
  if (pointer === "") return v;
  let cur: unknown = v;
  for (const t of pointer.slice(1).split("/").map(unescape)) {
    if (Array.isArray(cur) && /^(0|[1-9]\d*)$/.test(t)) cur = cur[Number(t)];
    else if (isRecord(cur) && Object.prototype.hasOwnProperty.call(cur, t)) cur = cur[t];
    else return undefined;
  }
  return cur;
}

/** The value tree with the pointer set, appended ("-") or added; a copy. */
function setAt(v: unknown, pointer: string, value: unknown): unknown {
  const root: unknown = JSON.parse(JSON.stringify(v));
  const tokens = pointer.slice(1).split("/").map(unescape);
  const last = tokens.pop()!;
  const parent = at(root, tokens.length === 0 ? "" : `/${tokens.map((t) => t.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}`);
  if (Array.isArray(parent)) {
    if (last === "-") parent.push(value);
    else parent[Number(last)] = value;
  } else {
    (parent as Record<string, unknown>)[last] = value;
  }
  return root;
}

/** The smallest window [lo, hi) around [start, end) that occurs once in text. */
function uniqueWindow(text: string, start: number, end: number): [number, number] {
  let lo = start;
  let hi = end;
  for (let n = 0; ; n += 1) {
    const w = text.slice(lo, hi);
    if (w !== "" && matches(text, w).length === 1) return [lo, hi];
    if (lo === 0 && hi === text.length) return [lo, hi];
    if (n % 2 === 0 ? hi < text.length : lo === 0) hi = Math.min(text.length, hi + 1);
    else lo -= 1;
  }
}

/** An anchor edit that turns text[lo, hi) of `after` back into `was`. */
function anchorInverse(after: string, start: number, end: number, was: string): SourceEdit {
  const [lo, hi] = uniqueWindow(after, start, end);
  return { anchor: after.slice(lo, hi), replace: `${after.slice(lo, start)}${was}${after.slice(end, hi)}` };
}

interface CharSpan { readonly pointer: string; readonly start: number; readonly end: number }

/** The reader's byte spans as char offsets into text. */
function charSpans(text: string, spans: readonly { readonly pointer: string; readonly start: number; readonly end: number }[]): CharSpan[] {
  const bytes = byteOffsets(text);
  const char = new Map<number, number>();
  for (let i = bytes.length - 1; i >= 0; i -= 1) char.set(bytes[i]!, i);
  return spans.map((s) => ({ pointer: s.pointer, start: char.get(s.start)!, end: char.get(s.end)! }));
}

/** Text to insert after the last child of a container span, and where. */
function insertion(text: string, parent: CharSpan, children: readonly CharSpan[], item: string): { readonly pos: number; readonly add: string } {
  const last = children.reduce<CharSpan | undefined>((a, c) => (a === undefined || c.start > a.start ? c : a), undefined);
  if (last === undefined) return { pos: parent.end - 1, add: item };
  const lineStart = text.lastIndexOf("\n", last.start - 1) + 1;
  const indent = /^[ \t]*/.exec(text.slice(lineStart))![0];
  const multiline = text.slice(parent.start, last.start).includes("\n");
  let j = last.end;
  while (j < text.length && /[ \t]/.test(text[j]!)) j += 1;
  if (text[j] === ",") return { pos: j + 1, add: multiline ? `\n${indent}${item},` : ` ${item},` };
  return { pos: last.end, add: multiline ? `,\n${indent}${item}` : `, ${item}` };
}

/** Apply one pointer edit to text; returns the new text and the inverse. */
function pointerEdit(text: string, file: string, edit: { readonly pointer: string; readonly set: unknown }, i: number, addMembers: boolean): { readonly text: string; readonly inverse: SourceEdit } {
  const { pointer } = edit;
  if (pointer !== "" && !pointer.startsWith("/")) {
    fail({ code: "E_SCHEMA", path: `/edits/${i}/pointer`, got: pointer, expected: "a json pointer starting with /", hint: "write the pointer as /params/1/fields/0/default" });
  }
  const read = readChaseSource(text, file);
  const spans = charSpans(text, read.spans);
  const lit = literal(edit.set, `/edits/${i}/set`);
  const expected = setAt(read.chase, pointer, edit.set);
  let next: string;
  let inverse: SourceEdit;
  const span = spans.find((s) => s.pointer === pointer);
  if (span !== undefined) {
    next = `${text.slice(0, span.start)}${lit}${text.slice(span.end)}`;
    inverse = { pointer, set: at(read.chase, pointer) };
  } else {
    const cut = pointer.lastIndexOf("/");
    const parentPointer = pointer.slice(0, cut);
    const key = unescape(pointer.slice(cut + 1));
    const parentSpan = spans.find((s) => s.pointer === parentPointer);
    const parent = at(read.chase, parentPointer);
    const children = spans.filter((s) => s.pointer.startsWith(`${parentPointer}/`) && !s.pointer.slice(parentPointer.length + 1).includes("/"));
    let item: string | undefined;
    if (parentSpan !== undefined && Array.isArray(parent) && key === "-") item = lit;
    else if (parentSpan !== undefined && isRecord(parent) && addMembers && key !== "-") item = `${IDENT.test(key) ? key : JSON.stringify(key)}: ${lit}`;
    if (item === undefined || parentSpan === undefined) {
      return fail({
        code: "E_REF", path: `/edits/${i}/pointer`, got: pointer, expected: "a pointer to a value in the chase, or an array pointer ending /-",
        didYouMean: didYouMean(pointer, spans.map((s) => s.pointer)), hint: `${pointer} names no value in ${file}; point at a value the chase holds`,
      });
    }
    const { pos, add } = insertion(text, parentSpan, children, item);
    next = `${text.slice(0, pos)}${add}${text.slice(pos)}`;
    inverse = anchorInverse(next, pos, pos + add.length, "");
  }
  const reread = readChaseSource(next, file).chase;
  if (JSON.stringify(reread) !== JSON.stringify(expected)) {
    fail({ code: "E_STALE", path: `/edits/${i}/pointer`, got: pointer, expected: "the source to read back as the edited value", hint: `the edit at ${pointer} did not read back as set; write it as an anchor edit` });
  }
  return { text: next, inverse };
}

/** Apply one anchor edit to text; returns the new text and the inverse. */
function anchorEdit(text: string, edit: { readonly anchor: string; readonly replace: string }, i: number): { readonly text: string; readonly inverse: SourceEdit } {
  if (edit.anchor === "") fail({ code: "E_SCHEMA", path: `/edits/${i}/anchor`, got: "", expected: "a non-empty anchor", hint: "quote the text the edit replaces" });
  const hits = matches(text, edit.anchor);
  if (hits.length !== 1) {
    const lines = hits.map((h) => lineOf(text, h));
    fail({
      code: "E_STALE", path: `/edits/${i}/anchor`, got: hits.length, expected: "an anchor that matches exactly once",
      hint: `anchor matched ${hits.length} times${lines.length > 0 ? ` at lines ${lines.join(", ")}` : ""}; ${hits.length === 0 ? "read the file again and quote its current text" : "widen the anchor with nearby text until it matches once"}`,
    });
  }
  const pos = hits[0]!;
  const next = `${text.slice(0, pos)}${edit.replace}${text.slice(pos + edit.anchor.length)}`;
  return { text: next, inverse: anchorInverse(next, pos, pos + edit.replace.length, edit.anchor) };
}

/** Error identity for the before and after comparison: code, pointer and record. */
const key = (e: CommandError): string => `${e.code} ${e.path ?? ""} ${e.record ?? ""}`;

/** The default validation: the reader, then validateDocument with no registries. */
export function sourceErrors(source: string, file: string): readonly CommandError[] {
  try {
    return validateDocument({ chase: readChaseSource(source, file).chase }).errors;
  } catch (e) {
    if (isThrownCommandError(e)) return [e.hbf];
    throw e;
  }
}

/**
 * Apply edits to a chase.ts source in order. An edit that cannot apply
 * throws its CommandError (E_STALE, E_REF, E_SCHEMA). The result is not ok
 * when the patched source has an error the original did not; errors the
 * original already had do not block a patch, so a patch can fix one of two.
 */
export function patchChaseSource(source: string, file: string, edits: readonly PatchEdit[], opts: PatchOptions = {}): PatchOutcome {
  const validate = opts.validate ?? ((s: string) => sourceErrors(s, file));
  const before = readChaseSource(source, file).chase;
  let text = source;
  const inverse: SourceEdit[] = [];
  edits.forEach((e, i) => {
    let r: { readonly text: string; readonly inverse: SourceEdit };
    if ("anchor" in e) r = anchorEdit(text, e, i);
    else if ("pointer" in e) r = pointerEdit(text, file, e, i, opts.addMembers === true);
    else {
      return fail({
        code: "E_SCHEMA", path: `/edits/${i}`, got: Object.keys(e).join(", "), expected: "an anchor or pointer edit on chase.ts",
        hint: "replaceWhole edits build.ts only; write a param edit as a pointer into the chase",
      });
    }
    text = r.text;
    inverse.unshift(r.inverse);
  });
  const had = new Set(validate(source).map(key));
  const added = validate(text).filter((e) => !had.has(key(e)));
  if (added.length > 0) return { ok: false, errors: added };
  return { ok: true, plan: { source: text, edits: edits.length, inverse, before, after: readChaseSource(text, file).chase } };
}
