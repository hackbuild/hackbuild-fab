// Repo-side text printed by doctor, explain and parity goes through oneLine
// (core/src/text/safe.ts): a control or bidi character in a check page, a
// design name or a golden path prints escaped, so one line stays one line.
import { describe, expect, it } from "vitest";
import { renderDoctor } from "../src/commands/doctor.js";
import { renderExplained } from "../src/commands/explain.js";
import { safeLines } from "../src/text/safe.js";

const ESC = String.fromCharCode(27);
const RLO = String.fromCharCode(0x202e);

describe("renderers escape repo-side text", () => {
  it("doctor prints a detail with ESC and a carriage return on one escaped line", () => {
    const out = renderDoctor([{ item: "node", status: "ok", detail: `v22${ESC}[2J\rfake ok` }] as never);
    expect(out).not.toContain(ESC);
    expect(out).not.toContain("\r");
    expect(out).toContain("\\u001b[2J\\u000dfake ok");
    expect(out.split("\n")).toHaveLength(1);
  });

  it("explain escapes an error meaning and keeps its two lines", () => {
    const out = renderExplained({ kind: "error", id: "E_SCHEMA", meaning: `bad${RLO}gnp.exe`, exit: 2, http: 400 } as never);
    expect(out).not.toContain(RLO);
    expect(out).toContain("\\u202e");
    expect(out.split("\n")).toHaveLength(2);
  });

  it("safeLines keeps line feeds and escapes everything else", () => {
    expect(safeLines(`a${ESC}\nb\tc`)).toBe("a\\u001b\nb\\u0009c");
  });
});
