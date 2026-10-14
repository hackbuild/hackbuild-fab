// DOCS.md section 1 (D-008): every reference README carries "What is
// verified, and what is not". This test reads each README beside the
// committed goldens it describes and fails when the block is missing, when
// its parity line names a build other than the one expected/build.json
// pins (a golden re-accepted without the README rerun), or when a figure
// the simulation computed is called measured. Every value compared here
// comes from a committed golden, a committed fixture or build.ts, never
// from this run.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF = path.resolve(HERE, "..");
const ROOT = path.resolve(REF, "..");

/** reference/<group>/<name> for every directory holding a chase.ts. */
const REFERENCES: string[] = readdirSync(REF, { withFileTypes: true })
  .filter((g) => g.isDirectory() && g.name !== "test")
  .flatMap((g) => readdirSync(path.join(REF, g.name), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(REF, g.name, d.name, "chase.ts")))
    .map((d) => `reference/${g.name}/${d.name}`))
  .sort();

const readme = (ref: string): string => readFileSync(path.join(ROOT, ref, "README.md"), "utf8");

/** The text under a heading up to the next heading of the same or a higher level. */
function section(text: string, heading: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return "";
  const level = heading.indexOf(" ");
  const end = lines.findIndex((l, i) => i > start && /^#+ /.test(l) && l.indexOf(" ") <= level);
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

/** The short form hbf parity prints: first six and last two hex digits of buildHash. */
function shortBuild(ref: string): string {
  const build = JSON.parse(readFileSync(path.join(ROOT, ref, "expected", "build.json"), "utf8")) as { buildHash: string };
  return `${build.buildHash.slice(0, 6)}..${build.buildHash.slice(-2)}`;
}

const SUBHEADS = ["### Verified on this machine", "### Measured on a printed body", "### Checked by machine", "### Not verified"] as const;

/** reference/<group>/<name> for every directory holding a committed expected/build.json golden. */
const GOLDENED: string[] = readdirSync(REF, { withFileTypes: true })
  .filter((g) => g.isDirectory() && g.name !== "test")
  .flatMap((g) => readdirSync(path.join(REF, g.name), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(REF, g.name, d.name, "expected", "build.json")))
    .map((d) => `reference/${g.name}/${d.name}`))
  .sort();

test("the walk finds every reference with a chase.ts, the set the committed build goldens name", () => {
  expect(REFERENCES.length).toBeGreaterThan(0);
  expect(REFERENCES).toEqual(GOLDENED);
});

describe.each(REFERENCES)("%s README", (ref) => {
  test("carries the verified block with its four lists in order", () => {
    const block = section(readme(ref), "## What is verified, and what is not");
    expect(block, "no '## What is verified, and what is not'").not.toBe("");
    const heads = block.split("\n").filter((l) => l.startsWith("### "));
    const at = SUBHEADS.map((s) => heads.findIndex((h) => h.startsWith(s)));
    expect(at.every((i) => i >= 0), `subheads found: ${heads.join(" | ")}`).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  test("the parity line names the build the committed goldens pin", () => {
    const verified = section(readme(ref), "### Verified on this machine").replace(/\s+/g, " ");
    expect(verified).toContain(`hbf parity ${ref}`);
    expect(verified).toContain(`build ${shortBuild(ref)}`);
  });
});

describe("keys flex-pair simulated block", () => {
  const text = readme("reference/keys/flex-pair");
  const card = /out\/flex-pair-two\.3mf, (\d+) bytes, sha256 ([0-9a-f]{64})/.exec(text);
  const sim = section(text, "### Simulated: virtual exit B, nothing printed").replace(/\s+/g, " ");

  /** The simulated block's top-level bullets, each joined to one line. */
  const bullets = sim.split(/ (?=- )/).filter((b) => b.startsWith("- "));
  const slice = bullets.find((b) => b.startsWith("- Slice:")) ?? "";
  const reruns = bullets.filter((b) => /^- Reruns? \d{4}-\d\d-\d\d/.test(b));
  const dateOf = (b: string): string => /^- Reruns? (\d{4}-\d\d-\d\d)/.exec(b)![1]!;

  test("the newest rerun's writer 3MF is the print card's file, and the match is computed", () => {
    expect(card).not.toBeNull();
    const [, bytes, sha] = card!;
    const short = `${sha!.slice(0, 8)}...${sha!.slice(-4)}`;
    expect(reruns.length).toBeGreaterThanOrEqual(2);
    const newest = reruns[reruns.length - 1]!;
    expect(newest).toContain(`writer 3MF ${bytes} bytes, sha256 ${short}`);
    expect(sim).not.toMatch(/equal to the print card \(measured\)/);
  });

  test("the reruns run in date order", () => {
    const dates = reruns.map(dateOf);
    expect(dates).toEqual([...dates].sort());
  });

  test("the slice bullet is the 2026-10-07 run on the D-236 file, its figures from that run only", () => {
    // D-236 in DECISIONS.md names the print card file before and after the pad top fix.
    const decisions = readFileSync(path.join(ROOT, "docs/plan/DECISIONS.md"), "utf8");
    const d236 = /the print card file (\d+) bytes, sha256 ([0-9a-f.]+) becomes (\d+) bytes, sha256 ([0-9a-f.]+)/.exec(
      section(decisions, "### D-236 The flex-pair pad top keeps PIP's bezel term"));
    expect(d236).not.toBeNull();
    const [, beforeBytes, beforeSha, afterBytes, afterSha] = d236!;
    expect(slice).toContain(`${afterBytes} bytes, sha256 ${afterSha}`);
    expect(slice).toContain(`${beforeBytes} bytes, sha256 ${beforeSha}`);
    expect(slice).toMatch(/equal to the print card of 2026-10-07 \(computed in process\)/);
    expect(slice).toMatch(/exit 0, 3415 ms wall \(measured\), 46 layers/);
    const dates = [...slice.matchAll(/\d{4}-\d\d-\d\d/g)].map((m) => m[0]);
    expect(dates.every((d) => d === "2026-10-07"), `dates in the slice bullet: ${dates.join(", ")}`).toBe(true);
    expect(slice).not.toMatch(/\brerun\b/i);
  });

  test("the reruns and the analyzer's missing areas are recorded as computed", () => {
    expect(sim).toMatch(/Reruns 2026-10-08 \(M04-T15, M04 verifier, M04 fixer\)/);
    expect(sim).toMatch(/G-code 686412 bytes each time, sha256 differing by run only in its generated-at line \(computed\)/);
    expect(sim).toMatch(/missing areas \(at least 0\.02 mm2 after a 0\.10 mm opening\): 78 \(computed\)/);
    expect(sim).toMatch(/layers 41 to 44, up to 1\.538 mm2 at layer 41 \(computed\)/);
  });
});

describe.each(REFERENCES)("%s measured block", (ref) => {
  test("never calls a model or simulation figure measured", () => {
    const measured = section(readme(ref), "### Measured on a printed body").replace(/\s+/g, " ");
    expect(measured).not.toMatch(/\bmeasured on (?:the |a |PIP's )?(?:model|simulation)\b/i);
    expect(measured).not.toMatch(/\bmodel numbers, measured\b/i);
  });
});

describe("keys click-spring-window and CHK-KEY-04", () => {
  const dir = path.join(ROOT, "reference/keys/click-spring-window");
  const text = readme("reference/keys/click-spring-window").replace(/\s+/g, " ");
  const fixtureDir = "packages/checks/test/fixtures/CHK-KEY-04/fix-q-2.40";

  test("the README states no CHK-KEY-04 target while build.ts emits no feature", () => {
    const build = readFileSync(path.join(dir, "build.ts"), "utf8");
    expect(build).toMatch(/features: \[\]/);
    expect(text).not.toMatch(/registers at M04/);
    expect(text).toMatch(/emits no spring feature \(features: \[\] in build\.ts\), so check\.run finds no target here/);
  });

  test("the fixture the README cites holds the fix and drop it quotes", () => {
    const fx = JSON.parse(readFileSync(path.join(ROOT, fixtureDir, "expected.json"), "utf8")) as {
      fix: { param: string; set: number }; predicts: { verdict: string; drop: number };
    };
    expect(text).toContain(`${fixtureDir}/`);
    expect(text).toContain(`fix ${fx.fix.param} = ${fx.fix.set}, drop ${fx.predicts.drop}, ${fx.predicts.verdict}, computed`);
  });
});
