// M03-T01 step 3 (D-156): every legacy source the M03 card lists carries a
// sha256 in the card and a lineage.json row with that sha256, and the inlay
// subjects the card names each have a canonical row. The hygiene recipe
// table in the package README equals the inlay.hygiene-* rows.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { planCard } from "../../../tools/test-support/plan-root.js";
import { sourcePath } from "../../../tools/test-support/originals-root.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));

interface Row {
  id: string;
  kind: "canonical" | "copy";
  source: string;
  sha256: string;
  fixes: string[];
  dest: string | null;
}

const rows = JSON.parse(readFileSync(root + "lineage.json", "utf8")) as Row[];
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
const subject = (r: Row): string => r.id.split("/")[0] ?? "";
const HEX = /\b[0-9a-f]{64}\b/g;

function table(md: string, heading: string): string[][] {
  const at = md.indexOf(heading);
  if (at < 0) throw new Error(`no section ${heading}`);
  const body = md.slice(at + heading.length, md.indexOf("\n## ", at + heading.length));
  const lines = body.split("\n").filter((l) => l.startsWith("|"));
  return lines.slice(2).map((l) => l.slice(1, -1).split("|").map((c) => c.trim()));
}

const card = planCard("M03-inlay.md");
const legacy = table(card, "## Legacy sources and their hashes");

describe("M03 legacy sources (card table against lineage.json)", () => {
  test("the table lists at least the 16 sources the card wrote on 2026-10-04 and none awaits a hash", () => {
    expect(legacy.length).toBeGreaterThanOrEqual(16);
    for (const c of legacy) expect(c[3], c[0]).not.toMatch(/recorded by/);
  });

  test("every hash in the table is the sha256 of a lineage row", () => {
    let n = 0;
    for (const c of legacy) {
      for (const h of (c[3] ?? "").match(HEX) ?? []) {
        n++;
        expect(rows.some((r) => r.sha256 === h), `${c[0]} ${h}`).toBe(true);
      }
    }
    // 15 hashed rows, the KNUCKLE row with two (zip and part6.js), computed.
    expect(n).toBeGreaterThanOrEqual(16);
  });

  test("every table hash equals the file on disk when the file is on this machine", (ctx) => {
    let checked = 0;
    for (const c of legacy) {
      const hashes = (c[3] ?? "").match(HEX) ?? [];
      if (hashes.length === 0) continue;
      const path = sourcePath((c[2] ?? "").replace(/ lines \d+ to \d+$/, "").replace(/, member \S+$/, ""));
      if (!existsSync(path)) continue;
      expect(sha(path), c[0]).toBe(hashes[0]);
      checked++;
    }
    if (checked === 0) ctx.skip();
  });
});

// The subjects M03-T01 "Files to create" names, with the file each canonical
// row starts from. COLLAR and SPRUE compose start from the bench rows: a
// byte-equal harvest copy sits under each bench subject, and
// tools/test/lineage.test.mjs refuses that file as canonical elsewhere.
const SUBJECTS: [string, RegExp][] = [
  ["collar.bench", /\/collar\.html$/],
  ["sprue.bench", /\/sprue\.html$/],
  ["inlay.hygiene-print-forge", /rastermesh\.js$/],
  ["inlay.intake-homography", /badge-replicator\/src\/lib\/homography\.ts$/],
  ["inlay.intake-stack", /badge-replicator\/src\/lib\/stack\.ts$/],
  ["inlay.intake-knockout", /badge-replicator\/src\/lib\/knockout\.ts$/],
  ["inlay.face-editor", /\/knuckle\/files\/src\/part6\.js$/],
];

describe("inlay lineage subjects", () => {
  test.each(SUBJECTS)("%s has one canonical row from the named file", (s, file) => {
    const canon = rows.filter((r) => subject(r) === s && r.kind === "canonical");
    expect(canon).toHaveLength(1);
    expect(canon[0]?.source).toMatch(file);
  });

  test("the face editor starts from the part6.js the card hashes", () => {
    const row = legacy.find((c) => c[0] === "KNUCKLE face editor");
    const part6 = /part6\.js ([0-9a-f]{64})/.exec(row?.[3] ?? "")?.[1];
    const canon = rows.find((r) => subject(r) === "inlay.face-editor" && r.kind === "canonical");
    expect(part6).toBeDefined();
    expect(canon?.sha256).toBe(part6);
  });

  test("COLLAR compose carries the pipe split and runGap fix, COLLAR hygiene the 0.35 despeckle", () => {
    const fix = (id: string): string => rows.find((r) => r.id === id)?.fixes.join(" ") ?? "";
    expect(fix("collar.bench/collar-7")).toMatch(/pipe split.*runGap.*collar\.html:1010/);
    expect(fix("collar.bench/collar-7")).toMatch(/0\.35.*collar\.html:1161/);
  });
});

describe("README hygiene recipes equal lineage.json", () => {
  const readme = readFileSync(root + "packages/inlay/README.md", "utf8");
  const recipes = table(readme, "## Hygiene recipes");

  test("three recipes, each starting from a canonical row with the sha256 the README states", () => {
    expect(recipes.map((c) => c[0])).toEqual(["collar-v5", "print-forge", "sprue"]);
    for (const c of recipes) {
      const r = rows.find((x) => x.id === c[1]);
      expect(r?.kind, c[1]).toBe("canonical");
      expect(r?.sha256, c[1]).toBe(c[2]);
    }
  });

  test("the print-forge recipe subject lists the hbf seed copy the M03-T05 card reads", () => {
    const seed = rows.find((r) => r.source.endsWith("/handoff/hbf/seed/mesh/rastermesh.js") && subject(r) === "inlay.hygiene-print-forge");
    expect(seed?.kind).toBe("copy");
  });

  test("the three recipes start from three different files", () => {
    expect(new Set(recipes.map((c) => c[2])).size).toBe(3);
  });
});
