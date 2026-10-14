// Seed origins against the registry of record, CHECKS.md section 6 (the
// origin column) and the dated rows of section 7.7. Expected values are
// parsed from the plan text here; nothing is read from the code under test.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const ROOT = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");

interface Row { id: string; version: string; origin: { project: string; date: string } }
const seed = JSON.parse(read("packages/checks/seed/checks.seed.json")) as { checks: Row[] };
const byId = new Map(seed.checks.map((r) => [r.id, r]));
const md = read("docs/plan/CHECKS.md");
const s6 = md.split(/^## 6\. /m)[1]!.split(/^## 7\. /m)[0]!;
const s77 = md.split(/^### 7\.7 /m)[1]!.split(/^### 7\.8 /m)[0]!;
const cells = (line: string): string[] => line.split("|").slice(1, -1).map((c) => c.trim());

/** "CHK-KEY-01 to -06, CHK-NET-11, -12" as ids; a bare "-NN" keeps the family of the id before it. */
function expand(list: string): string[] {
  const out: string[] = [];
  let family = "";
  for (const part of list.split(",").map((p) => p.trim())) {
    const m = /^(?:(CHK-[A-Z0-9]+)-)?-?(\d\d)(?: to -(\d\d))?$/.exec(part);
    if (m === null) throw new Error(`7.7 check list part not understood: ${part}`);
    if (m[1] !== undefined) family = m[1];
    for (let n = Number(m[2]); n <= Number(m[3] ?? m[2]); n++) out.push(`${family}-${String(n).padStart(2, "0")}`);
  }
  return out;
}

/** The 7.7 rows: checks, change text, bump. */
const S77 = s77.split("\n").filter((l) => /^\| CHK-/.test(l)).map((l) => {
  const c = cells(l);
  return { ids: expand(c[0]!), change: c[1]!, bump: c[2]! };
});

const firstWord = (s: string): string => s.split(/\s+/)[0]!.replace(/[,;:]$/, "");

describe("seed origins against CHECKS.md", () => {
  test("the design of every seeded origin is the design section 6 names first", () => {
    const rows = s6.split("\n").filter((l) => /^\| CHK-/.test(l)).map(cells);
    expect(rows.length).toBeGreaterThan(80);
    for (const c of rows) {
      const r = byId.get(c[0]!);
      expect(r, c[0]).toBeDefined();
      expect(firstWord(r!.origin.project), c[0]).toBe(firstWord(c[c.length - 1]!));
    }
  });

  test("the HAFT to PIP row of 7.7 is applied: PIP, never HAFT, version past 1.0.0", () => {
    const row = S77.find((r) => /HAFT to PIP/.test(r.change))!;
    expect(row.ids.length).toBe(10);
    for (const id of row.ids) {
      const r = byId.get(id)!;
      expect(r.origin.project, id).toMatch(/^PIP /);
      expect(r.origin.project, id).not.toMatch(/HAFT/);
      expect(r.version, id).not.toBe("1.0.0");
    }
  });

  test("each dated 7.7 row carries its date into the seed", () => {
    const dated = S77.flatMap((r) => {
      const to = /date 20\d\d-\d\d becomes (20\d\d-\d\d-\d\d)|dated (20\d\d-\d\d-\d\d)|becomes [A-Z]+ R\d+ (20\d\d-\d\d-\d\d)/.exec(r.change);
      return to === null ? [] : r.ids.map((id) => [id, to[1] ?? to[2] ?? to[3]!] as const);
    });
    expect(dated.map(([id]) => id).sort()).toEqual(["CHK-ASM-01", "CHK-NET-06", "CHK-PRT-08", "CHK-SHP-01", "CHK-SHP-03"]);
    for (const [id, date] of dated) {
      const r = byId.get(id)!;
      expect(r.origin.date, id).toBe(date);
      expect(r.origin.project.endsWith(` ${date}`), id).toBe(true);
      expect(r.version, id).not.toBe("1.0.0");
    }
  });

  test("CHK-NET-06 moves to TANG R5, the design with the source impedance text", () => {
    const row = S77.find((r) => r.ids.includes("CHK-NET-06"))!;
    const to = /becomes ([A-Z]+ R\d+ 20\d\d-\d\d-\d\d)/.exec(row.change)![1]!;
    expect(byId.get("CHK-NET-06")!.origin.project).toBe(to);
  });
});
