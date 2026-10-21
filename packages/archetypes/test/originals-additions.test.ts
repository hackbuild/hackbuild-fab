// M06-T14 originals canon additions, archetypes side: every row of the
// card's table that names this registry resolves by id with the family
// CANONS.md 11.3 gives it, refuses with its status and reason, names its
// promotion card, and pins every original it names: the file exists under
// originals/, its bytes hash to the sha256 the def states, and lineage.json
// holds that sha256, the first original under a canonical row. The rows and
// families are parsed from the card and CANONS.md, never from the defs. A
// row records no legacy numbers at M06-T14, and its def says why.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { archetypes } from "@hackbuild/archetypes";
import { ORIGINALS_OF_RECORD, originalPath } from "../../../tools/test-support/originals-root.js";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const ORIG = originalPath("");
const sha = (p: string): string => createHash("sha256").update(readFileSync(p)).digest("hex");
interface LineageRow { id: string; kind: "canonical" | "copy"; source: string; sha256: string }
const lineage = JSON.parse(read("lineage.json")) as LineageRow[];

/** The M06-T14 table rows of the card, parsed from the card itself: id, family, registry, promotion column. */
function cardRows(): { id: string; family: string; registry: string; promoted: string }[] {
  const card = read("docs/plan/milestones/M06-canons.md");
  const sec = card.slice(card.indexOf("## M06-T14"), card.indexOf("## M06-T13"));
  return sec.split("\n").filter((l) => l.startsWith("| `")).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .map((c) => ({ id: c[0]!.replace(/`/g, "").replace(" (update)", "").replace(" options", ""), family: c[1]!, registry: c[2]!, promoted: c[6]! }));
}

/** CANONS.md 11.3 families by id: the entry tables of record. */
function canonsFamilies(): Map<string, string> {
  const text = read("docs/plan/CANONS.md");
  const sec = text.slice(text.indexOf("### 11.3"), text.indexOf("### 11.4"));
  const out = new Map<string, string>();
  for (const l of sec.split("\n").filter((x) => /^\| [a-z0-9]/.test(x) && !x.startsWith("| id "))) {
    const c = l.split("|").map((x) => x.trim());
    out.set(c[1]!, c[2]!.replace(/\s*\(.*\)\s*$/, ""));
  }
  return out;
}

const rows = cardRows().filter((r) => r.registry === "archetypes");
const families = canonsFamilies();

describe("originals canon additions, mechanisms (M06-T14)", () => {
  test("the card names this registry's rows", () => {
    expect(rows.length).toBeGreaterThan(50);
  });

  test("every row resolves by id, with the family CANONS.md 11.3 gives it", () => {
    for (const r of rows) {
      const e = archetypes.get(r.id);
      expect(e, `${r.id} is not registered`).toBeDefined();
      const fam = families.get(r.id);
      const mapped = fam === undefined ? undefined : ({ "archetype printed": "printed", "design rule": "design-rule", "read model": "read-model" } as Record<string, string>)[fam] ?? fam;
      if (mapped !== undefined && e!.def.status !== "proven") expect(e!.def.family, r.id).toBe(mapped);
    }
  });

  test("every row that is not typed refuses with archetype <id> is <status>: <reason>, and the reason names the promotion card", () => {
    for (const r of rows) {
      const def = archetypes.resolve(r.id).def;
      if (def.status === "proven") continue;
      let hint = "";
      try { def.derive({}, undefined as never); } catch (e) { if (isThrownCommandError(e)) hint = e.hbf.hint; }
      expect(hint, r.id).toBe(`archetype ${r.id} is ${def.status}: ${def.statusReason}`);
      // An (update) row edits an entry an earlier card registered; that entry keeps its own reason and promotion card.
      if (!def.provenance.includes("M06-T14")) continue;
      const cards = r.promoted.match(/M\d\d(?:-T\d\d)?/g) ?? [];
      for (const c of cards) expect(def.statusReason, `${r.id} names ${c}`).toContain(c);
    }
  });

  test("every original is pinned: the file exists, its bytes hash to the def's sha256, lineage.json holds it, the first under a canonical row", () => {
    for (const r of rows) {
      const originals = archetypes.resolve(r.id).def.original ?? [];
      expect(originals.length, `${r.id} names no original`).toBeGreaterThan(0);
      originals.forEach((o, i) => {
        const path = `${ORIG}${o.slug}/${o.file}`;
        expect(existsSync(path), `${r.id} ${path}`).toBe(true);
        expect(sha(path), `${r.id} ${o.file}`).toBe(o.sha256);
        const rs = lineage.filter((x) => x.source === `${ORIGINALS_OF_RECORD}${o.slug}/${o.file}`);
        expect(rs.length, `${r.id} ${path} has no lineage row`).toBeGreaterThan(0);
        for (const x of rs) expect(x.sha256, x.id).toBe(o.sha256);
        // BOSS is the source of the touch brick, a copy of the BLOCKS parts subject (the BLOCKS rename broke it).
        if (i === 0 && r.id !== "blocks-touch-brick") expect(rs.some((x) => x.kind === "canonical"), `${r.id} first original ${path}`).toBe(true);
      });
    }
  });

  test("a row that says no port regenerates its original cites lines no src file names as its port", () => {
    const srcDir = new URL("packages/archetypes/src/", root);
    const files = (readdirSync(srcDir, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts") && !f.startsWith("defs/"));
    const text = files.map((f) => readFileSync(new URL(f, srcDir), "utf8")).join("\n");
    let checked = 0;
    for (const r of rows) {
      const def = archetypes.resolve(r.id).def;
      if (def.status === "proven" || !(def.statusReason ?? "").includes("no port regenerates")) continue;
      for (const o of def.original ?? []) {
        const base = o.file.split("/").at(-1)!.replace(/[.]/g, "\\.");
        const cited = new RegExp(`${base}[^\\n]{0,40}\\(lines ${o.lines}\\)`).exec(text);
        expect(cited?.[0], `${r.id}: says no port regenerates ${o.file} lines ${o.lines}, but src cites them`).toBeUndefined();
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  test("the originals rows record no legacy numbers of their own; each def says no number is recorded or names the record and parity test that hold its port", () => {
    for (const r of rows) {
      const def = archetypes.resolve(r.id).def;
      if (def.status === "proven") continue;
      expect(existsSync(new URL(`packages/archetypes/test/legacy/${r.id}.json`, root)), r.id).toBe(false);
      if (!def.provenance.includes("M06-T14")) continue;
      const held = /test\/legacy\/([a-z0-9-]+\.json)/.exec(def.statusReason ?? "");
      if (held === null) { expect(def.statusReason, r.id).toContain("no number is recorded"); continue; }
      // A reason that names a record names the parity test reading it and the source file that test's port carries.
      const parity = /test\/([a-z0-9-]+\.parity\.test\.ts)/.exec(def.statusReason ?? "")?.[1];
      expect(parity, `${r.id} names a record and no parity test`).toBeDefined();
      const body = readFileSync(new URL(`packages/archetypes/test/${parity}`, root), "utf8");
      expect(body, `${r.id}: ${parity} reads ${held[1]}`).toContain(`legacy/${held[1]}`);
      const port = /src\/([a-z0-9/-]+\.ts) physics ports [^ ]+?\/([a-z0-9]+\.js) lines (\d+) to (\d+)/.exec(def.statusReason ?? "");
      expect(port, `${r.id} names the port and the lines`).not.toBeNull();
      const src = readFileSync(new URL(`packages/archetypes/src/${port![1]}`, root), "utf8");
      expect(src, `${r.id}: ${port![1]} cites ${port![2]} lines ${port![3]} to ${port![4]}`).toContain(`${port![2]} physics (lines ${port![3]} to ${port![4]})`);
    }
  });
});
