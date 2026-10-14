// M01-T05 constraints.query: the command, its exit codes and its text
// mirror. The dim-form cases run the fixture defs (fixtures/query-defs.ts)
// and expect text built here from the profile data files, read as JSON,
// never from what the command printed. The CLI cases run the defs core
// loads.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type CommandInput, type CommandResult, type Interval, type ParamEnvelope } from "@hackbuild/spec";
import { runConstraintsQuery } from "../src/commands/constraints-query.js";
import { errorResult, finish } from "../src/result.js";
import { exitOf } from "../src/errors.js";
import { hashOf } from "../src/jcs.js";
import type { CoreCtx } from "../src/registry.js";
import { renderResult } from "../src/text.js";
import { FLOOR_CONSTANT, LEN, W, fixtureRegistry } from "./fixtures/query-defs.js";
import { ROOT, hbf, json } from "./hbf.js";

type Input = CommandInput<"constraints.query">;

const data = (f: string): Record<string, unknown> => JSON.parse(readFileSync(path.join(ROOT, "packages", "profile", "data", f), "utf8")) as Record<string, unknown>;
const materials = data("materials.json")["materials"] as { id: string; resistivity: { direction: string; form: string; ohmCm: number; provenance: { tier: string } }[] }[];
const constants = data("constants.json")["constants"] as { id: string; value: number; provenance: { tier: string } }[];

/** The along, printed resistivity row of a material, from the data file. */
function rhoRow(material: string): { ohmCm: number; tier: string } {
  const r = materials.find((m) => m.id === material)!.resistivity.find((x) => x.direction === "along" && x.form === "printed")!;
  return { ohmCm: r.ohmCm, tier: r.provenance.tier };
}
const floorRow = constants.find((c) => c.id === FLOOR_CONSTANT)!;

const ctxFor = (input: Input): CoreCtx => ({ workspace: ROOT, cwd: ROOT, inputsHash: hashOf(input) } as unknown as CoreCtx);

/** Run the command on the fixture registry and return the finished result, its exit code and its text. */
async function run(input: Input, withNext = true): Promise<{ r: CommandResult<Interval | ParamEnvelope>; code: number; text: string }> {
  try {
    const r = finish(await runConstraintsQuery(input, ctxFor(input), fixtureRegistry({ withNext })));
    return { r, code: exitOf(r), text: renderResult("constraints.query", input.dim ?? "", r) };
  } catch (e) {
    if (!isThrownCommandError(e)) throw e;
    const r = errorResult(e.hbf, hashOf(input));
    return { r, code: exitOf(r), text: "" };
  }
}

const mm = (v: number): string => v.toFixed(2);

describe("dim form on the fixture defs", () => {
  const rho = rhoRow("cpla-protopasta");
  const L = 62;
  const cap = 20;

  test("a satisfiable query: legal, every bound with kernel and qualifier, the binds lines, exit 0", async () => {
    const R = 100;
    const w = (rho.ohmCm * L) / R;
    const { r, code, text } = await run({ dim: W, material: "cpla-protopasta", facts: { lenMm: L, budgetOhm: R, capMm: cap } });
    expect(code).toBe(0);
    expect(r.ok).toBe(true);
    const budgetLine = `floor ${mm(w)} mm  ${R} ohm budget at ${mm(L)} mm, ${rho.ohmCm} ohm cm (${rho.tier})  [circuit, computed from ${rho.tier}, CHK-NET-05]`;
    const capLine = `ceil  ${mm(cap)} mm  cap ${mm(cap)} mm  [mesh, computed]`;
    expect(text.split("\n")).toEqual([
      `PASS constraints.query ${W}   legal ${mm(w)} to ${mm(cap)} mm`,
      `  floor ${mm(floorRow.value)} mm  fingertip floor ${mm(floorRow.value)} mm  [profile, ${floorRow.provenance.tier}]`,
      `  ${budgetLine}`,
      `  ${capLine}`,
      `binds ${budgetLine}`,
      `binds ${capLine}`,
    ]);
    const iv = r.result as Interval;
    expect(iv.legal).toEqual([w, cap]);
    expect(r.errors).toEqual([]);
    expect(r.next).toEqual([]);
  });

  test("E_UNSAT: verdict fail, exit 1, the def's expected line and a next call on the dim that moves the floor", async () => {
    const R = 50;
    const input: Input = { dim: W, material: "cpla-protopasta", facts: { lenMm: L, budgetOhm: R, capMm: cap } };
    const { r, code, text } = await run(input);
    expect(code).toBe(1);
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe("fail");
    expect((r.result as Interval).legal).toBeNull();
    const need = Math.ceil((rho.ohmCm * L) / cap);
    expect(r.errors).toEqual([{
      code: "E_UNSAT", path: "/facts/budgetOhm", got: R,
      expected: `at least ${need} ohm at width ${mm(cap)}, length ${mm(L)}`,
      hint: "floors exceed ceilings; move the binding floor below the ceiling or raise the ceiling",
      record: "fixture/budget-floor",
    }]);
    expect(r.next).toEqual([{
      command: "constraints.query",
      args: { dim: LEN, material: "cpla-protopasta", machine: "ffc5p", facts: input.facts },
      why: `${LEN} moves the binding floor of ${W}`,
    }]);
    const lines = text.split("\n");
    expect(lines[0]).toBe(`FAIL constraints.query ${W}   legal none, floors exceed ceilings`);
    expect(lines.at(-1)).toBe(`next  hbf constraints.query ${LEN} --material cpla-protopasta --machine ffc5p --facts '${JSON.stringify(input.facts)}'`);
    expect(lines.some((l) => l.startsWith("E_UNSAT  ") && l.includes(`expected at least ${need} ohm`))).toBe(true);
  });

  test("the next call runs verbatim and answers its dim", async () => {
    const input: Input = { dim: W, material: "cpla-protopasta", facts: { lenMm: L, budgetOhm: 50, capMm: cap } };
    const { r } = await run(input);
    const next = r.next[0]!;
    const again = await run(next.args as Input);
    expect(again.code).toBe(0);
    expect((again.r.result as Interval).dim).toBe(LEN);
  });

  test("E_UNSAT whose next dim has no registered def: next is withheld", async () => {
    const { r, code } = await run({ dim: W, material: "cpla-protopasta", facts: { lenMm: L, budgetOhm: 50, capMm: cap } }, false);
    expect(code).toBe(1);
    expect(r.errors[0]!.code).toBe("E_UNSAT");
    expect(r.next).toEqual([]);
  });

  test("an inferred resistivity row prints its tier on the bound line", async () => {
    const pip = rhoRow("cpla");
    const { text } = await run({ dim: W, material: "cpla", facts: { lenMm: L, budgetOhm: 8000, capMm: cap } });
    expect(pip.tier).toBe("inferred");
    expect(text).toContain(`ohm cm (inferred)  [circuit, computed from inferred, CHK-NET-05]`);
  });

  test("E_UNSAT owned by a floor with no expectedFor: the ceiling prints rounded down at mm precision", async () => {
    // The row floor (fingertip.mm.lo) is above this cap; 9.8766 prints 9.88 rounded near and 9.87 as a ceiling.
    const capOff = 9.8766;
    expect(floorRow.value).toBeGreaterThan(capOff);
    const { r, code, text } = await run({ dim: W, material: "cpla-protopasta", facts: { lenMm: L, capMm: capOff } });
    expect(code).toBe(1);
    const down = (Math.floor(capOff * 100) / 100).toFixed(2);
    expect(r.errors).toEqual([{
      code: "E_UNSAT",
      expected: `a floor at most ${down} mm, the ceiling`,
      hint: "floors exceed ceilings; move the binding floor below the ceiling or raise the ceiling",
      record: "fixture/row-floor",
    }]);
    expect(text).toContain(`expected a floor at most ${down} mm, the ceiling`);
  });

  test("no budget: the profile row floor binds alone", async () => {
    const { r, text } = await run({ dim: W, material: "cpla-protopasta", facts: { lenMm: L, capMm: cap } });
    const iv = r.result as Interval;
    expect(iv.legal).toEqual([floorRow.value, cap]);
    expect(iv.lo.length).toBe(1);
    expect(text.split("\n")[0]).toBe(`PASS constraints.query ${W}   legal ${mm(floorRow.value)} to ${mm(cap)} mm`);
  });
});

describe("dim form errors and exit codes (spec/errors.ts ERROR_TRANSPORT)", () => {
  test("no material: E_PARAM_MISSING at /material, exit 2", async () => {
    const { r, code } = await run({ dim: W, facts: { lenMm: 62, capMm: 20 } });
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_PARAM_MISSING", path: "/material" });
  });

  test("a missing fact: E_PARAM_MISSING at its pointer, exit 2", async () => {
    const { r, code } = await run({ dim: W, material: "cpla-protopasta", facts: { lenMm: 62 } });
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_PARAM_MISSING", path: "/facts/capMm" });
  });

  test("an unknown material: E_REF at /material with didYouMean, exit 2", async () => {
    const { r, code } = await run({ dim: W, material: "cpla-protopast", facts: { lenMm: 62, capMm: 20 } });
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/material" });
    expect(r.errors[0]!.didYouMean).toContain("cpla-protopasta");
  });

  test("an unknown dim: E_REF at /dim with didYouMean over registered dims, exit 2", async () => {
    const { r, code } = await run({ dim: "fixture.widht", material: "cpla" });
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/dim", got: "fixture.widht" });
    expect(r.errors[0]!.didYouMean).toContain(W);
  });

  test("dim form with a param-form field: E_SCHEMA at that field, exit 2", async () => {
    const { r, code } = await run({ dim: W, material: "cpla", pointers: ["/w"] });
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/pointers" });
  });

  test("param form without a chase: E_PARAM_MISSING at /chase, exit 2", async () => {
    const { r, code } = await run({});
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_PARAM_MISSING", path: "/chase" });
  });
});

describe("the CLI (defs core loads)", () => {
  test("a misspelt dim exits 2 with E_REF", async () => {
    const { code, r } = await json("constraints.query", "conductor.widht");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/dim", got: "conductor.widht" });
  });

  test("--facts reads numbers, booleans and strings; a pair without = is E_SCHEMA at /facts", async () => {
    const bad = await json("constraints.query", "conductor.width", "--facts", "pathMm=62,flexes");
    expect(bad.code).toBe(2);
    expect(bad.r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/facts", got: "flexes" });
    // The inputsHash is the hash of the parsed input, so it proves how the pairs parsed.
    const ok = await json("constraints.query", "conductor.widht", "--material", "cpla", "--facts", "pathMm=62.0,flexes=true,mcu=rp2040");
    expect(ok.r.inputsHash).toBe(hashOf({ dim: "conductor.widht", material: "cpla", facts: { pathMm: 62, flexes: true, mcu: "rp2040" } }));
    // The json form a next line prints reads back to the same facts.
    const asJson = await json("constraints.query", "conductor.widht", "--material", "cpla", "--facts", JSON.stringify({ pathMm: 62, flexes: true, mcu: "rp2040" }));
    expect(asJson.r.inputsHash).toBe(ok.r.inputsHash);
  });

  test("--param repeats into pointers", async () => {
    const r = await json("constraints.query", "--chase", "reference/keys/flex-pair", "--param", "/w", "--param", "/nope");
    expect(r.r.inputsHash).toBe(hashOf({ chase: "reference/keys/flex-pair", pointers: ["/w", "/nope"] }));
    const env = r.r.result as unknown as ParamEnvelope;
    expect(env.unbound).toEqual([{ param: "/w", why: "no-feature" }, { param: "/nope", why: "not-a-param" }]);
  });

  test("param form: every pointer with a constraintDim answered or unbound, buildHash equal to part.build's", async () => {
    const q = await json("constraints.query", "--chase", "reference/keys/flex-pair");
    const b = await json("part.build", "reference/keys/flex-pair");
    expect(q.code).toBe(0);
    const env = q.r.result as unknown as ParamEnvelope;
    expect(env.buildHash).toBe(b.r.buildHash);
    expect(q.r.buildHash).toBe(b.r.buildHash);
    // flex-pair declares constraintDim on /keys/<i>/gap and /w, and its build.ts binds no feature yet.
    expect(env.unbound).toEqual([{ param: "/keys/0/gap", why: "no-feature" }, { param: "/w", why: "no-feature" }]);
    expect(env.params).toEqual({});
  });

  test("a pointer that names a field without a constraintDim is unbound no-constraint-dim", async () => {
    const r = await json("constraints.query", "--chase", "reference/keys/flex-pair", "--param", "/W");
    expect((r.r.result as unknown as ParamEnvelope).unbound).toEqual([{ param: "/W", why: "no-constraint-dim" }]);
  });

  test("the text mirror of the param form names the chase and build, then one line per pointer", async () => {
    const { out } = await hbf(["constraints.query", "--chase", "reference/keys/flex-pair"]);
    const lines = out.trimEnd().split("\n");
    expect(lines[0]).toMatch(/^PASS constraints\.query reference\/keys\/flex-pair build [0-9a-f]{6}\.\.[0-9a-f]{2}$/);
    expect(lines.slice(1)).toEqual(["/keys/0/gap  unbound  no-feature", "/w  unbound  no-feature"]);
  });
});
