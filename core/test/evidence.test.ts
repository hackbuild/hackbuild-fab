// hbf evidence add and list (R1-engine-26) through the CLI. Each case runs
// in a throwaway workspace under .hbf/ (gitignored) holding one design,
// press-demo: the click-spring-window reference chase with the access
// switch press-force claim added, band 1.2 to 1.8 N. The verdicts come from
// packages/checks checkClaim on a test peak of 1.55 N (computed), fed the
// rows the CLI wrote; the file hash is compared with what shasum -a 256
// prints, an independent tool.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { checkClaim, claimFinding, parseEvidence, type EvidenceRow } from "@hackbuild/checks";
import type { ClaimDecl, Metric } from "@hackbuild/spec";
import { main } from "../src/main.js";
import type { GateStreams } from "../src/tty-gate.js";
import { ROOT } from "./hbf.js";

const PRESS: ClaimDecl = { id: "press-force", fn: "spring.peak", want: { nominal: 1.47, lo: 1.2, hi: 1.8, unit: "N" }, why: "access switch: 150 g press" };
const PEAK: Metric = { id: "spring.peakN", value: 1.55, unit: "N", note: "test peak", gate: "CHK-CLAIM-01", qualifier: "computed", basis: "vendor" };

const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

/** A workspace dir with designs/press-demo whose chase declares press-force. */
function workspace(): string {
  mkdirSync(path.join(ROOT, ".hbf"), { recursive: true });
  const top = mkdtempSync(path.join(ROOT, ".hbf", "evidence-test-"));
  made.push(top);
  const src = readFileSync(path.join(ROOT, "reference/keys/click-spring-window/chase.ts"), "utf8");
  const claim = `  claims: [{ id: "press-force", fn: "spring.peak", want: { nominal: 1.47, lo: 1.2, hi: 1.8, unit: "N" }, why: "access switch: 150 g press" }],\n  assertions: [],`;
  const chase = src.replace("  assertions: [],", claim);
  expect(chase).not.toBe(src);
  mkdirSync(path.join(top, "designs", "press-demo"), { recursive: true });
  writeFileSync(path.join(top, "designs", "press-demo", "chase.ts"), chase);
  return top;
}

function streams(tty: boolean): GateStreams {
  return { input: Object.assign(new PassThrough(), { isTTY: tty }), output: Object.assign(new PassThrough(), { isTTY: tty }) };
}

async function run(cwd: string, argv: readonly string[], tty = false): Promise<{ code: number; out: string }> {
  let out = "";
  const code = await main(argv, cwd, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; }, gate: streams(tty) });
  return { code, out };
}

const rowsOf = (top: string): EvidenceRow[] => parseEvidence(readFileSync(path.join(top, "designs/press-demo/evidence/evidence.jsonl"), "utf8"));
const verdict = (rows: readonly EvidenceRow[]) => {
  const r = checkClaim(PRESS, [PEAK], { rows });
  return claimFinding({ level: "part", partId: "spring" } as never, PRESS, r, rows);
};

describe("hbf evidence add (R1-engine-26)", () => {
  it("--value 2.1 --unit N on press-force appends a measured row and turns CHK-CLAIM-01 to fail as measured", async () => {
    const top = workspace();
    expect(verdict([]).verdict).toBe("pass");
    const { code, out } = await run(top, ["evidence", "add", "press-demo", "--claim", "press-force", "--value", "2.1", "--unit", "N", "--json"]);
    expect(code, out).toBe(0);
    const res = JSON.parse(out) as { log: string; row: EvidenceRow };
    expect(res.log).toBe("designs/press-demo/evidence/evidence.jsonl");
    expect(res.row).toMatchObject({ claim: "press-force", kind: "coupon", value: 2.1, unit: "N", qualifier: "measured", who: "agent" });
    const rows = rowsOf(top);
    expect(rows).toEqual([res.row]);
    const f = verdict(rows);
    expect([f.verdict, f.measured, f.extra?.["qualifier"]]).toEqual(["fail", 2.1, "measured"]);
  });

  it("--note \"too stiff\" --direction high gives warn with no number; a terminal add is the person's", async () => {
    const top = workspace();
    const { code, out } = await run(top, ["evidence", "add", "press-demo", "--claim", "press-force", "--note", "too stiff", "--direction", "high", "--json"], true);
    expect(code, out).toBe(0);
    const rows = rowsOf(top);
    expect(rows[0]).toMatchObject({ kind: "note", note: "too stiff", direction: "high", qualifier: "none", who: "person" });
    expect(rows[0]!.value).toBeUndefined();
    const f = verdict(rows);
    expect([f.verdict, f.extra?.["qualifier"]]).toEqual(["warn", "computed"]);
    expect(f.constraint).not.toMatch(/\d/);
  });

  it("--value 150 --unit g passes as measured at 1.471 N (g to N by standard gravity)", async () => {
    const top = workspace();
    expect((await run(top, ["evidence", "add", "press-demo", "--claim", "press-force", "--value", "150", "--unit", "g"])).code).toBe(0);
    const f = verdict(rowsOf(top));
    expect([f.verdict, f.extra?.["qualifier"]]).toEqual(["pass", "measured"]);
    expect(f.measured as number).toBeCloseTo(0.15 * 9.80665, 9);
  });

  it("--file stores the bytes under evidence/files and the sha256 shasum -a 256 prints", async () => {
    const top = workspace();
    const photo = path.join(top, "shot.jpg");
    writeFileSync(photo, Buffer.from("not a real jpeg, test bytes 0123456789"));
    const { code, out } = await run(top, ["evidence", "add", "designs/press-demo", "--claim", "press-force", "--file", "shot.jpg", "--json"]);
    expect(code, out).toBe(0);
    const row = (JSON.parse(out) as { row: EvidenceRow }).row;
    const shasum = execFileSync("shasum", ["-a", "256", photo], { encoding: "utf8" }).split(" ")[0];
    expect(row.kind).toBe("photo");
    expect(row.file?.sha256).toBe(shasum);
    const stored = path.join(top, "designs/press-demo", row.file!.path);
    expect(execFileSync("shasum", ["-a", "256", stored], { encoding: "utf8" }).split(" ")[0]).toBe(shasum);
    expect(verdict(rowsOf(top)).verdict).toBe("pass");
  });

  it("refuses an unknown claim with E_REF and didYouMean, a reading in a length unit, and two forms at once", async () => {
    const top = workspace();
    const bad = await run(top, ["evidence", "add", "press-demo", "--claim", "press-forse", "--note", "x", "--json"]);
    expect(bad.code).toBe(2);
    expect(JSON.parse(bad.out).errors[0]).toMatchObject({ code: "E_REF", path: "/claim", didYouMean: ["press-force"] });
    const unit = await run(top, ["evidence", "add", "press-demo", "--claim", "press-force", "--value", "2", "--unit", "mm", "--json"]);
    expect(JSON.parse(unit.out).errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/unit" });
    const two = await run(top, ["evidence", "add", "press-demo", "--claim", "press-force", "--value", "2", "--unit", "N", "--note", "x", "--json"]);
    expect(JSON.parse(two.out).errors[0]).toMatchObject({ code: "E_SCHEMA" });
    const none = await run(top, ["evidence", "add", "no-such-design", "--claim", "press-force", "--note", "x", "--json"]);
    expect(JSON.parse(none.out).errors[0]).toMatchObject({ code: "E_REF", path: "/design" });
    expect(() => readFileSync(path.join(top, "designs/press-demo/evidence/evidence.jsonl"))).toThrow(/ENOENT/);
  });

  it("hbf evidence list prints every row in file order and filters by claim", async () => {
    const top = workspace();
    await run(top, ["evidence", "add", "press-demo", "--claim", "press-force", "--note", "too stiff", "--direction", "high"]);
    await run(top, ["evidence", "add", "press-demo", "--claim", "press-force", "--value", "1.6", "--unit", "N"]);
    const { code, out } = await run(top, ["evidence", "list", "press-demo", "--json"]);
    expect(code).toBe(0);
    const list = JSON.parse(out) as { design: string; rows: EvidenceRow[] };
    expect(list.design).toBe("designs/press-demo");
    expect(list.rows.map((r) => r.kind)).toEqual(["note", "coupon"]);
    expect((JSON.parse((await run(top, ["evidence", "list", "press-demo", "--claim", "other", "--json"])).out) as { rows: unknown[] }).rows).toEqual([]);
    const text = (await run(top, ["evidence", "list", "press-demo"])).out;
    expect(text).toMatch(/^designs\/press-demo {2}2 evidence rows\n/);
    expect(text).toContain("1.6 N measured");
  });
});
