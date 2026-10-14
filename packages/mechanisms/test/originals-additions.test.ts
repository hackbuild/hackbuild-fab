// M06-T14 originals canon additions, mechanisms side: every row of the
// card's table that names this registry resolves by id with the family
// CANONS.md 11.3 gives it, refuses with its status and reason, names its
// promotion card, and pins every original it names: the file exists under
// originals/, its bytes hash to the sha256 the def states, and lineage.json
// holds that sha256, the first original under a canonical row. The rows and
// families are parsed from the card and CANONS.md, never from the defs. A
// legacy record names the command that produced it and equals the
// original's own drive output.

import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { ORIGINALS_OF_RECORD, originalPath } from "../../../tools/test-support/originals-root.js";
import { isThrownCommandError } from "@hackbuild/spec";
import { mechanisms } from "@hackbuild/mechanisms";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
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

const rows = cardRows().filter((r) => r.registry === "mechanisms");
const families = canonsFamilies();

describe("originals canon additions, mechanisms (M06-T14)", () => {
  test("the card names this registry's rows", () => {
    expect(rows.length).toBeGreaterThan(70);
  });

  test("every row resolves by id, with the family CANONS.md 11.3 gives it", () => {
    for (const r of rows) {
      const e = mechanisms.get(r.id);
      expect(e, `${r.id} is not registered`).toBeDefined();
      const fam = families.get(r.id);
      if (fam !== undefined) expect(e!.def.family, r.id).toBe(fam);
    }
  });

  test("every row that is not typed refuses with mechanism <id> is <status>: <reason>, and the reason names the promotion card", () => {
    for (const r of rows) {
      const def = mechanisms.resolve(r.id).def;
      if (def.status === "typed") continue;
      let hint = "";
      try { def.derive({}, undefined as never); } catch (e) { if (isThrownCommandError(e)) hint = e.hbf.hint; }
      expect(hint, r.id).toBe(`mechanism ${r.id} is ${def.status}: ${def.statusReason}`);
      // An (update) row edits an entry an earlier card registered; that entry keeps its own reason and promotion card.
      if (!def.provenance.includes("M06-T14")) continue;
      const cards = r.promoted.match(/M\d\d(?:-T\d\d)?/g) ?? [];
      for (const c of cards) expect(def.statusReason, `${r.id} names ${c}`).toContain(c);
    }
  });

  test("every original is pinned: the file exists, its bytes hash to the def's sha256, lineage.json holds it, the first under a canonical row", () => {
    for (const r of rows) {
      const originals = mechanisms.resolve(r.id).def.original ?? [];
      expect(originals.length, `${r.id} names no original`).toBeGreaterThan(0);
      originals.forEach((o, i) => {
        const path = `${ORIGINALS_OF_RECORD}${o.slug}/${o.file}`;
        const local = originalPath(`${o.slug}/${o.file}`);
        expect(existsSync(local), `${r.id} ${local}`).toBe(true);
        expect(sha(local), `${r.id} ${o.file}`).toBe(o.sha256);
        const rs = lineage.filter((x) => x.source === path);
        expect(rs.length, `${r.id} ${path} has no lineage row`).toBeGreaterThan(0);
        for (const x of rs) expect(x.sha256, x.id).toBe(o.sha256);
        if (i === 0) expect(rs.some((x) => x.kind === "canonical"), `${r.id} first original ${path}`).toBe(true);
      });
    }
  });

  test("a legacy record names its command and equals the original's own drive output", () => {
    const drive = JSON.parse(readFileSync(originalPath("knurl/drive/layout-defaults.json"), "utf8")) as { pick: Record<string, unknown> };
    for (const id of ["barbed-snap-tab-groove", "swept-complement-cut"]) {
      const rec = JSON.parse(read(`packages/mechanisms/test/legacy/${id}.json`)) as { command: string; source: { slug: string; file: string; sha256: string }; output: { file: string; sha256: string }; values: Record<string, unknown> };
      expect(rec.command, id).toMatch(/drive\/layout\.cjs/);
      expect(rec.source.sha256, id).toBe(mechanisms.resolve(id).def.original![0]!.sha256);
      expect(sha(originalPath(`knurl/${rec.output.file}`)), id).toBe(rec.output.sha256);
      for (const [k, v] of Object.entries(rec.values)) expect(v, `${id} ${k}`).toEqual(drive.pick[k]);
      expect(mechanisms.resolve(id).def.statusReason, id).toContain(`test/legacy/${id}.json`);
    }
  });
});
