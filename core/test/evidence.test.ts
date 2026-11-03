// hbf evidence add and list (R1-engine-26) through the CLI. Each case runs
// in a throwaway workspace under .hbf/ (gitignored) holding one design,
// press-demo: the click-spring-window reference chase with the access
// switch press-force claim added, band 1.2 to 1.8 N. The verdicts come from
// packages/checks checkClaim on a test peak of 1.55 N (computed), fed the
// rows the CLI wrote; the file hash is compared with what shasum -a 256
// prints, an independent tool. The reference cases copy the real
// reference/keys/flex-pair chase into a throwaway reference/keys/ and read
// the real chases of the print targets in place; nothing writes to the tree.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { checkClaim, checkClaims, claimFn, claimFinding, parseEvidence, type EvidenceRow } from "@hackbuild/checks";
import { readChaseSource } from "@hackbuild/chase";
import type { ClaimDecl, Metric } from "@hackbuild/spec";
import { main } from "../src/main.js";
import type { GateStreams } from "../src/tty-gate.js";
import { ROOT, json } from "./hbf.js";

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

/** A workspace dir with reference/keys/flex-pair holding the real chase, and designs/press-demo beside it. */
function refWorkspace(): string {
  const top = workspace();
  const dir = path.join(top, "reference", "keys", "flex-pair");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "chase.ts"), readFileSync(path.join(ROOT, "reference/keys/flex-pair/chase.ts"), "utf8"));
  return top;
}

const FLEX_LOG = "reference/keys/flex-pair/evidence/evidence.jsonl";

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

describe("hbf evidence on a reference (reference/<area>/<id>)", () => {
  const KEY_TRAVEL = (): ClaimDecl => {
    const text = readFileSync(path.join(ROOT, "reference/keys/flex-pair/chase.ts"), "utf8");
    const decl = (readChaseSource(text, "reference/keys/flex-pair/chase.ts").chase as { claims?: readonly ClaimDecl[] }).claims?.[0];
    expect(decl?.id).toBe("key1-travel");
    return decl!;
  };
  const PRINTED: Metric = { id: "keys.1.printedTravel", value: 1.92, unit: "mm", note: "test", gate: "informational", qualifier: "computed", basis: null };

  it("adds by path and lists by path, id and area/id, rows in <dir>/evidence/evidence.jsonl", async () => {
    const top = refWorkspace();
    const add = await run(top, ["evidence", "add", "reference/keys/flex-pair", "--claim", "key1-travel", "--value", "1.9", "--unit", "mm", "--json"]);
    expect(add.code, add.out).toBe(0);
    const res = JSON.parse(add.out) as { design: string; log: string; row: EvidenceRow };
    expect([res.design, res.log]).toEqual(["reference/keys/flex-pair", FLEX_LOG]);
    expect(res.row).toMatchObject({ claim: "key1-travel", kind: "caliper", value: 1.9, unit: "mm", qualifier: "measured", who: "agent" });
    expect(parseEvidence(readFileSync(path.join(top, FLEX_LOG), "utf8"))).toEqual([res.row]);
    const byId = await run(top, ["evidence", "add", "flex-pair", "--claim", "key1-travel", "--note", "key bottoms out early", "--direction", "low", "--json"], true);
    expect(byId.code, byId.out).toBe(0);
    expect((JSON.parse(byId.out) as { log: string }).log).toBe(FLEX_LOG);
    for (const arg of ["reference/keys/flex-pair", "flex-pair", "keys/flex-pair"]) {
      const list = JSON.parse((await run(top, ["evidence", "list", arg, "--json"])).out) as { design: string; rows: EvidenceRow[] };
      expect(list.design).toBe("reference/keys/flex-pair");
      expect(list.rows.map((r) => [r.kind, r.who])).toEqual([["caliper", "agent"], ["note", "person"]]);
    }
    expect((await run(top, ["evidence", "list", "flex-pair"])).out).toMatch(/^reference\/keys\/flex-pair {2}2 evidence rows\n/);
    expect(() => readFileSync(path.join(top, "designs/press-demo/evidence/evidence.jsonl"))).toThrow(/ENOENT/);
  });

  it("a reference row reaches CHK-CLAIM-01 as it does for a design: measured replaces computed and a direction warns", async () => {
    const top = refWorkspace();
    const decl = KEY_TRAVEL();
    const rowsOf = (): EvidenceRow[] => parseEvidence(readFileSync(path.join(top, FLEX_LOG), "utf8"));
    expect(checkClaim(decl, [PRINTED], { rows: [] }).verdict).toBe("pass");
    await run(top, ["evidence", "add", "flex-pair", "--claim", "key1-travel", "--note", "stiff and short", "--direction", "low"]);
    const felt = checkClaim(decl, [PRINTED], { rows: rowsOf() });
    expect([felt.verdict, felt.qualification.qualifier]).toEqual(["warn", "computed"]);
    await run(top, ["evidence", "add", "flex-pair", "--claim", "key1-travel", "--value", "2.3", "--unit", "mm"]);
    const high = checkClaim(decl, [PRINTED], { rows: rowsOf() });
    expect([high.verdict, high.value, high.qualification.qualifier]).toEqual(["fail", 2.3, "measured"]);
    await run(top, ["evidence", "add", "flex-pair", "--claim", "key1-travel", "--value", "0.19", "--unit", "cm"]);
    const cm = checkClaim(decl, [PRINTED], { rows: rowsOf() });
    expect([cm.verdict, cm.qualification.qualifier]).toEqual(["pass", "measured"]);
    expect(cm.value).toBeCloseTo(1.9, 12);
  });

  it("didYouMean runs over designs and references, by id and by path, from the workspace the cwd sits in", async () => {
    const err = async (arg: string) => (JSON.parse((await run(ROOT, ["evidence", "list", arg, "--json"])).out) as { errors: { code: string; path: string; didYouMean: string[] }[] }).errors[0]!;
    const ref = await err("flex-pairr");
    expect([ref.code, ref.path, ref.didYouMean[0]]).toEqual(["E_REF", "/design", "flex-pair"]);
    expect((await err("bailx")).didYouMean[0]).toBe("bail");
    expect((await err("reference/keys/flex-pairr")).didYouMean[0]).toBe("reference/keys/flex-pair");
    expect((await err("designs/bailx")).didYouMean[0]).toBe("designs/bail");
  });

  it("refuses a chase directory that is neither designs/<id> nor reference/<area>/<id>, and an id found twice", async () => {
    const top = refWorkspace();
    mkdirSync(path.join(top, "scratch", "x"), { recursive: true });
    writeFileSync(path.join(top, "scratch", "x", "chase.ts"), "");
    const stray = JSON.parse((await run(top, ["evidence", "list", "scratch/x", "--json"])).out) as { errors: { code: string; path: string }[] };
    expect(stray.errors[0]).toMatchObject({ code: "E_REF", path: "/design" });
    mkdirSync(path.join(top, "designs", "flex-pair"), { recursive: true });
    writeFileSync(path.join(top, "designs", "flex-pair", "chase.ts"), "");
    const twice = JSON.parse((await run(top, ["evidence", "list", "flex-pair", "--json"])).out) as { errors: { code: string; didYouMean: string[]; hint: string }[] };
    expect(twice.errors[0]).toMatchObject({ code: "E_REF" });
    expect(twice.errors[0]!.didYouMean).toEqual(["designs/flex-pair", "reference/keys/flex-pair"]);
    expect(twice.errors[0]!.hint).toMatch(/give the path/);
    const byPath = JSON.parse((await run(top, ["evidence", "list", "reference/keys/flex-pair", "--json"])).out) as { design: string };
    expect(byPath.design).toBe("reference/keys/flex-pair");
  });

  it("the real print targets resolve by path and id, and an unknown claim lists the claims they declare", async () => {
    for (const dir of ["reference/keys/flex-pair", "reference/keys/access-switch"]) {
      const byPath = JSON.parse((await run(ROOT, ["evidence", "list", dir, "--json"])).out) as { design: string; rows: unknown[] };
      const byId = JSON.parse((await run(ROOT, ["evidence", "list", path.basename(dir), "--json"])).out) as { design: string; rows: unknown[] };
      expect(byPath.design).toBe(dir);
      expect(byId).toEqual(byPath);
    }
    const typo = async (dir: string, claim: string) => JSON.parse((await run(ROOT, ["evidence", "add", dir, "--claim", claim, "--note", "x", "--json"])).out).errors[0] as { code: string; path: string; didYouMean: string[] };
    expect(await typo("reference/keys/flex-pair", "key1-travelx")).toMatchObject({ code: "E_REF", path: "/claim", didYouMean: ["key1-travel"] });
    expect(await typo("reference/keys/access-switch", "press.peek")).toMatchObject({ code: "E_REF", path: "/claim", didYouMean: ["press.peak"] });
  });

  it("the claims the print targets declare name registered functions in their unit and hold on the default build (computed)", async () => {
    for (const [dir, ids] of [["reference/keys/flex-pair", ["key1-travel"]], ["reference/keys/access-switch", ["press.peak"]]] as const) {
      const claims = (readChaseSource(readFileSync(path.join(ROOT, dir, "chase.ts"), "utf8"), `${dir}/chase.ts`).chase as { claims?: readonly ClaimDecl[] }).claims ?? [];
      expect(claims.map((c) => c.id)).toEqual(ids);
      for (const c of claims) {
        expect(claimFn(c.fn).unit, c.id).toBe(c.want.unit);
        expect(c.want.lo <= c.want.nominal && c.want.nominal <= c.want.hi, c.id).toBe(true);
        expect(c.why.trim(), c.id).not.toBe("");
      }
      const built = await json("part.build", dir);
      expect(built.code, dir).toBe(0);
      const metrics = (built.r.result as { metrics: Metric[] }).metrics;
      for (const r of checkClaims(claims, metrics)) expect([dir, r.id, r.verdict, r.evidence.length]).toEqual([dir, r.id, "pass", 0]);
    }
  }, 240_000);
});
