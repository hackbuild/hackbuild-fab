// The project graph (M04-T09, D-050, D-051): items and the links that say
// what each item was made from, with the hash its source had when the link
// was written. spec/checks.ts holds a narrower ProjectGraph (links with a
// rel and no hash, stale as bare ids) that check targets and the
// project.graph output read; these types carry the hash at link time and
// the reason, and move to spec/ in the PR that follows M04 (card step 1).
// The rule is the DETENT stale-sim check (sources/benches/benches-machines.md
// line 155: recompute the pack stamp and compare it with MESHSTAMP) and the
// PIP "mesh stale" chip (sources/latest/haft-toggle.md lines 79 to 83, 388):
// staleness is a hash compared, never a timestamp.

import { canonicalize, sha256Hex } from "@hackbuild/spec";

export type ItemKind =
  | "chase" | "buildScript" | "params" | "profileRow" | "checkDef" | "constraintDef" | "featureKind"
  | "build" | "mesh" | "report" | "artifact" | "legacy" | "oracleRecord" | "golden" | "bake";

export type LinkKind = "reads" | "produced" | "checked" | "exported" | "baked" | "recordOf" | "expects";

export const ITEM_KINDS: readonly ItemKind[] = [
  "chase", "buildScript", "params", "profileRow", "checkDef", "constraintDef", "featureKind",
  "build", "mesh", "report", "artifact", "legacy", "oracleRecord", "golden", "bake",
];

export interface Item { id: string; kind: ItemKind; uri: string; hash: string }

/** A link from a dependent item to the item it was made from, with the hash seen at the time. */
export interface Link { from: string; to: string; kind: LinkKind; hashAtLink: string }

export interface StaleEntry { id: string; because: string[] }

export interface ProjectGraph { items: Item[]; links: Link[]; stale: StaleEntry[] }

/**
 * One line of .hbf/graph.jsonl: an item as it was made and every link it
 * was made from. A later line for the same item id replaces the earlier
 * one, so a rebuild drops a read the new build no longer makes.
 */
export interface MadeLine { item: Item; links: Link[] }

/** Item ids are `<kind>:<key>`, so the kind of a link target is known before the item is found. */
export function itemId(kind: ItemKind, key: string): string {
  return `${kind}:${key}`;
}

/** The kind and key of an item id, or undefined for an id outside the grammar. */
export function parseItemId(id: string): { kind: ItemKind; key: string } | undefined {
  const at = id.indexOf(":");
  if (at < 1) return undefined;
  const kind = ITEM_KINDS.find((k) => k === id.slice(0, at));
  return kind === undefined ? undefined : { kind, key: id.slice(at + 1) };
}

/** sha256 over RFC 8785 canonical JSON, the one canonicalizer (spec/jcs.ts, D-206). */
export function hashValue(value: unknown): string {
  return sha256Hex(canonicalize(value));
}

/**
 * A profile row's item hash: the canonical {table, id, row}, the unit
 * profileHash covers (packages/profile ProfileReadRow, D-051), so a row
 * moves its item exactly when it would move a build that read it.
 */
export function profileRowHash(table: string, id: string, row: unknown): string {
  return hashValue({ table, id, row });
}

/** A CheckDef, ConstraintDef or feature kind by id plus version (card step 4). */
export function defHash(id: string, version: string): string {
  return hashValue({ id, version });
}

/** The newest line per item id, in first-seen order of the ids. */
export function foldLines(lines: readonly MadeLine[]): MadeLine[] {
  const last = new Map<string, MadeLine>();
  for (const l of lines) {
    last.delete(l.item.id);
    last.set(l.item.id, l);
  }
  return [...last.values()];
}

/** File text of graph lines, one JSON object per line. */
export function encodeLines(lines: readonly MadeLine[]): string {
  return lines.map((l) => `${canonicalize(l)}\n`).join("");
}

const isMadeLine = (v: unknown): v is MadeLine => {
  if (typeof v !== "object" || v === null) return false;
  const { item, links } = v as { item?: Partial<Item>; links?: unknown };
  return typeof item?.id === "string" && typeof item.hash === "string" && Array.isArray(links)
    && links.every((l) => typeof (l as Partial<Link>).to === "string" && typeof (l as Partial<Link>).hashAtLink === "string");
};

/** Lines of graph.jsonl; a torn last line from a killed writer is dropped, since the graph rebuilds from the store. */
export function decodeLines(text: string): MadeLine[] {
  const out: MadeLine[] = [];
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") continue;
    let v: unknown;
    try {
      v = JSON.parse(raw);
    } catch {
      continue;
    }
    if (isMadeLine(v)) out.push(v);
  }
  return out;
}
