// A refused build, read against the chase (D-643, R1-fix-26). The core keeps
// the last good model when a build throws; this file names what the person
// sees beside it: the stale line the shell shows, the one log line a refused
// range end writes, and the reason the export gate stays closed. The fields
// a refusal names are the ones whose value differs from the last good build.

import type { ParamField, ParamGroup } from "@hackbuild/spec";

/** The build the core refused: the state it read and the state of the model still drawn. */
export interface BuildRefusal<S = unknown> {
  /** rev the refused build read. */
  readonly rev: number;
  /** The CommandError code the build threw, E_KERNEL and kin; null when the throw carried none. */
  readonly code: string | null;
  /** The refusal's hint, without the code and path. */
  readonly message: string;
  /** The state the refused build read. */
  readonly state: S;
  /** The state of the last good build, the model still drawn; null when none has built. */
  readonly good: S | null;
}

/** One field the refused state changed from the last good build. */
export interface RefusedChange {
  /** Dotted path, the field id at the top level: minGap, keys.0.gap. */
  readonly path: string;
  readonly value: unknown;
  /** The field's declared range; null for a field without one. */
  readonly range: readonly [number, number] | null;
  /** The value sits on an end of its range. */
  readonly end: boolean;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);

/** The code and hint of a thrown build: a CommandError's `hbf`, else a leading E_ token of the message. */
export function refusalOf(e: unknown): { code: string | null; message: string } {
  const hbf = isObj(e) && isObj(e["hbf"]) ? e["hbf"] : null;
  if (hbf !== null && typeof hbf["code"] === "string") {
    return { code: hbf["code"], message: typeof hbf["hint"] === "string" ? hbf["hint"] : String((e as Error).message) };
  }
  const text = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e) ?? String(e);
  const m = /^(E_[A-Z_]+)(?: \/\S*)? (.*)$/s.exec(text);
  return m === null ? { code: null, message: text } : { code: m[1] as string, message: m[2] as string };
}

function walk(fields: readonly ParamField[], now: unknown, was: unknown, at: string, out: RefusedChange[]): void {
  if (!isObj(now)) return;
  const before = isObj(was) ? was : {};
  for (const f of fields) {
    const path = at === "" ? f.id : `${at}.${f.id}`;
    const v = now[f.id];
    if (f.type === "list" && Array.isArray(v)) {
      const w = before[f.id];
      v.forEach((item, i) => walk(f.item, item, Array.isArray(w) ? w[i] : undefined, `${path}.${i}`, out));
      continue;
    }
    if (JSON.stringify(v) === JSON.stringify(before[f.id])) continue;
    const range = "range" in f ? f.range : null;
    out.push({ path, value: v, range, end: range !== null && (v === range[0] || v === range[1]) });
  }
}

/** The fields the refused state changed from the last good build, in declaration order; none when nothing built. */
export function refusedChanges(groups: readonly ParamGroup[], r: BuildRefusal): RefusedChange[] {
  if (r.good === null) return [];
  const out: RefusedChange[] = [];
  walk(groups.flatMap((g) => g.fields), r.state, r.good, "", out);
  return out;
}

const said = (r: BuildRefusal): string => (r.code === null ? r.message : `${r.code}, ${r.message}`);
const named = (c: RefusedChange): string => `${c.path} ${String(c.value)}`;

/** The stale line the shell shows: what refused, why, and that the model on screen is the last good one. */
export function refusalLine(groups: readonly ParamGroup[], r: BuildRefusal): string {
  const changes = refusedChanges(groups, r);
  const at = changes.length === 0 ? "" : ` at ${changes.map(named).join(", ")}`;
  const tail = r.good === null ? "nothing has built yet, so the stage is empty" : "showing the last good model";
  return `build refused${at}: ${said(r)}. ${tail}`;
}

/** The one log line a refusal at a range end writes, naming field, value and range; null when no changed field sits on an end. */
export function rangeEndLine(groups: readonly ParamGroup[], r: BuildRefusal): string | null {
  const parts = refusedChanges(groups, r).flatMap((c) => (c.end && c.range !== null ? [`${named(c)} (range ${c.range[0]} to ${c.range[1]})`] : []));
  if (parts.length === 0) return null;
  return `build refused at the range end ${parts.join(", ")}: ${said(r)}. the last good model stays drawn`;
}

/** Why the export gate stays closed while the current rev refused to build. */
export function exportClosedLine(groups: readonly ParamGroup[], r: BuildRefusal): string {
  const changes = refusedChanges(groups, r);
  const what = changes.length === 0 ? "the params" : changes.map((c) => c.path).join(", ");
  return `export closed: the last build refused. change ${what} until it builds, then export.`;
}
