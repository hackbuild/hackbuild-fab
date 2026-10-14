// M05-T11 acceptance on the committed chase and goldens. The chase's
// generated blocks must equal what the generator computes now from the
// M05-T11 fixture, the M05-T08 route fixture and profile; the golden's
// reads must equal the card's table and PIP's own bench rows (the fixture
// PIP b137deb computed), never figures from the code under test.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { readChaseSource } from "@hackbuild/chase";
import type { CheckResult, ReadOutputs } from "@hackbuild/spec";
import { sceneDrive } from "../../../../packages/copper/scripts/pip-drive-scene.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, "..");
const ROOT = path.resolve(DIR, "..", "..", "..");
const read = (p: string): string => readFileSync(path.join(ROOT, p), "utf8");
const { chase } = readChaseSource(readFileSync(path.join(DIR, "chase.ts"), "utf8"), "reference/electrical/pip-drive/chase.ts");
const solve = JSON.parse(readFileSync(path.join(DIR, "expected", "query-solve.json"), "utf8")) as {
  verdict: string;
  result: {
    reads: ReadOutputs[]; lines: string[]; results: CheckResult[];
    drive: { net: string; totalOhm: number; contactTier: string | null; q: { qualifier: string; basis: string | null } }[];
    points: { net: string; qualifier: string; pressed: { state: string }[] }[];
  };
};
const ELEC = JSON.parse(read("packages/circuit/test/fixtures/pip-b137deb-elec.json")) as {
  keys: { id: string; pin: string; type: string; bench: { R: number; C: number; tauUs: number } }[];
};
const CARD = read("docs/plan/milestones/M05-circuit-copper.md");
const T11 = CARD.slice(CARD.indexOf("## M05-T11"), CARD.indexOf("## M05-T12"));
const CARD_ROWS = T11.split("\n").filter((l) => /^\| [A-Z]+ \| GP\d+ \|/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

describe("pip-drive chase", () => {
  test("hookup and scene.drive are what the generator computes now", { timeout: 120_000 }, () => {
    const want = sceneDrive() as { hookup: unknown; drive: unknown };
    expect(chase.hookup).toEqual(want.hookup);
    expect(chase.scene?.drive).toEqual(want.drive);
  });

  test("every key reads at its PIP pin, keys high at 3500 us, touch low at 1500 us", () => {
    expect((chase.hookup ?? []).map((h) => [h.port, h.pin])).toEqual(ELEC.keys.map((k) => [`port.${k.id}`, k.pin]));
    for (const h of chase.hookup ?? []) {
      const touch = ELEC.keys.find((k) => `port.${k.id}` === h.port)!.type === "touch";
      expect(h.read).toEqual(touch
        ? { model: "charge-release", drive: "low", driveUs: 30, waitUs: 1500, waitSource: "default" }
        : { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" });
    }
  });
});

describe("query-solve.json holds the M05-T11 card", () => {
  test.each(CARD_ROWS.map((r) => [r[0]!, r] as const))("%s: R within 1 ohm of the card and the bench, C and tau to the card's places", (id, row) => {
    const k = solve.result.drive.find((d) => d.net === id)!;
    const r = solve.result.reads.find((x) => x.net === id)!;
    const pip = ELEC.keys.find((x) => x.id === id)!;
    expect(Math.abs(k.totalOhm - Number(row[3]))).toBeLessThanOrEqual(1);
    expect(Math.abs(k.totalOhm - pip.bench.R)).toBeLessThanOrEqual(1);
    expect(r.cPf.toFixed(3)).toBe(row[4]);
    expect(r.tauUs.toFixed(3)).toBe(/^[\d.]+/.exec(row[5]!)![0]);
    expect(Math.abs(r.tauUs - pip.bench.tauUs)).toBeLessThanOrEqual(0.001);
    expect(k.q).toEqual({ qualifier: "computed", basis: "inferred" });
    expect(r.qualifier).toBe("computed");
    expect(r.wait.emit.qualifier).toBe("inferred");
  });

  test("the summary line: key paths 1.50 to 1.72, touch 0.91 to 0.93 Mohm, LEFT the slowest key", () => {
    expect(solve.result.lines).toContain(
      "key paths 1.50 to 1.72 Mohm, touch paths 0.91 to 0.93 Mohm without the skin, slowest key LEFT tau 15.694 us, settle 78.469 us (computed)",
    );
  });

  test("every key read carries pip.ino's 200 us as the shipped wait, unknown; touch reads none", () => {
    for (const r of solve.result.reads) {
      const touch = ELEC.keys.find((k) => k.id === r.net)!.type === "touch";
      if (touch) expect(r.wait.firmwareShipped).toBeUndefined();
      else expect(r.wait.firmwareShipped).toEqual({ value: 200, unit: "us", source: "pip-controller firmware/pip/pip.ino:20 (D-080)", qualifier: "unknown", basis: null });
    }
  });

  test("nothing in the golden is called measured, and every press settles inside its wait", () => {
    const text = JSON.stringify(solve);
    expect(text).not.toMatch(/"qualifier":"measured"/);
    expect(solve.result.reads.every((r) => r.ok)).toBe(true);
    expect(solve.result.points.map((p) => p.pressed[0]!.state)).toEqual(ELEC.keys.map((k) => (k.type === "touch" ? "HIGH" : "LOW")));
    // CHK-NET-05 gates pullup reads only; a charge-release port is CHK-NET-29's (M05-T19).
    expect(solve.result.results.filter((r) => r.id === "CHK-NET-05").every((r) => r.verdict === "skip")).toBe(true);
  });
});
