// spec/test/surface.test.ts
// Runtime twin of fixtures/surface.ts. Runs under vitest 5.0.3 from the repo
// root (npx vitest run spec/test); excluded from spec/tsconfig.json because
// spec declares no types. Raising a count edits five files in one commit:
// spec/commands.ts, spec/fixtures/surface.ts, spec/test/surface.test.ts,
// core/test/surface.test.ts and docs/explanation/command-surface.md.
// Version 4, 2026-10-04. Carries D-106, D-107, D-161, D-177, D-193.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  CLI_ONLY, CLI_ONLY_FIELDS, COMMAND_GROUP, COMMAND_NAMES, GROUPS, MCP_TOOLS, MCP_TOOL_NAMES, TOOL_NAME_PATTERN, TOOLSET_PROFILES,
} from "../commands";
import { CONSEQUENTIAL_CAPABILITIES } from "../capabilities";
import { ERROR_CODES, ERROR_TRANSPORT, EXIT_CODES, VERDICT_TRANSPORT } from "../errors";
import { EXPORT_ALIASES } from "../hook";
import { FEATURE_KINDS, FEATURE_KIND_ADMISSION, FEATURE_KIND_ALIASES, KIND_MILESTONES, MOVED_FEATURE_KINDS } from "../features";

describe("command surface", () => {
  test("CommandName has 31 members in six groups; draft (R1-engine-24) is the 31st, in make, CLI only", () => {
    expect(COMMAND_NAMES).toHaveLength(31);
    expect(new Set(COMMAND_NAMES).size).toBe(31);
    for (const n of COMMAND_NAMES) expect(GROUPS).toContain(COMMAND_GROUP[n]);
    const perGroup = Object.fromEntries(GROUPS.map((g) => [g, COMMAND_NAMES.filter((n) => COMMAND_GROUP[n] === g).length]));
    expect(perGroup).toEqual({ query: 8, author: 5, build: 4, prove: 7, look: 3, make: 4 });
    expect(CLI_ONLY).toContain("draft");
  });

  test("McpToolName has 19 members, legal for the Claude API, in fixed order", () => {
    expect(MCP_TOOL_NAMES).toHaveLength(19);
    expect(new Set(MCP_TOOL_NAMES).size).toBe(19);
    for (const n of MCP_TOOL_NAMES) {
      expect(n).toMatch(TOOL_NAME_PATTERN);
      expect(n).not.toContain(".");
    }
    expect(MCP_TOOLS.map((t) => t.name)).toEqual([...MCP_TOOL_NAMES]);
  });

  test("every command is covered by exactly one MCP tool or is CLI-only", () => {
    const covered: string[] = MCP_TOOLS.flatMap((t) => [...t.covers]);
    for (const n of COMMAND_NAMES) {
      const hits = covered.filter((c) => c === n).length;
      const cliOnly = (CLI_ONLY as readonly string[]).includes(n);
      expect(cliOnly ? hits === 0 : hits === 1).toBe(true);
    }
  });

  test("toolset profiles hold 19, 10 and 6 tools", () => {
    expect(TOOLSET_PROFILES.all).toHaveLength(19);
    expect(TOOLSET_PROFILES["query,prove"]).toHaveLength(10);
    expect(TOOLSET_PROFILES.sweep).toHaveLength(6);
  });

  test("only export_run is gated and destructive", () => {
    const gated = MCP_TOOLS.filter((t) => t.gated).map((t) => t.name);
    const destructive = MCP_TOOLS.filter((t) => t.annotations.destructiveHint).map((t) => t.name);
    expect(gated).toEqual(["export_run"]);
    expect(destructive).toEqual(["export_run"]);
  });

  test("no MCP tool reaches the network, so every network input field is CLI only (standard rule 10)", () => {
    // Independent source: the command specs' CLI schemas, where a field
    // that needs the network says so in its describe() text. Each such field
    // must be listed in CLI_ONLY_FIELDS, which McpToolIO omits
    // (fixtures/surface.ts proves the omission at compile time; tsc -b runs
    // before every test).
    const defs = new URL("../../packages/commands/src/defs/", import.meta.url);
    const network: Record<string, string[]> = {};
    for (const file of readdirSync(defs).filter((f) => f.endsWith(".ts") && f !== "index.ts")) {
      const block = readFileSync(new URL(file, defs), "utf8");
      const name = /\bspec: CommandSpec<"([a-z.]+)">/.exec(block)?.[1];
      expect(name, `${file} declares spec: CommandSpec<name>`).toBeDefined();
      if (name === undefined) continue;
      for (const m of block.matchAll(/^\s+(\w+): z\..*\.describe\("[^"]*\bnetwork\b[^"]*"\)/gm)) (network[name] ??= []).push(m[1] as string);
    }
    expect(network).toEqual({ "catalog.find": ["fetch"] });
    const cliOnly: Record<string, readonly string[]> = CLI_ONLY_FIELDS;
    expect(Object.fromEntries(Object.entries(cliOnly).map(([k, v]) => [k, [...v]]))).toEqual(network);
    for (const t of MCP_TOOLS) expect(t.annotations.openWorldHint).toBe(false);
  });

  test("no MCP tool declares a consequential capability (D-161)", () => {
    const consequential: readonly string[] = CONSEQUENTIAL_CAPABILITIES;
    for (const t of MCP_TOOLS) {
      const req: readonly string[] = "requires" in t ? t.requires : [];
      expect(req.filter((c) => consequential.includes(c))).toEqual([]);
    }
  });
});

describe("errors and exits", () => {
  test("twelve error codes, each mapped to a transport", () => {
    expect(ERROR_CODES).toHaveLength(12);
    for (const c of ERROR_CODES) expect(ERROR_TRANSPORT[c]).toBeDefined();
  });

  test("exit codes are fixed", () => {
    expect(EXIT_CODES).toEqual({ pass: 0, fail: 1, input: 2, gateUnavailable: 3, provenance: 4, repeat: 5, internal: 70 });
    expect(ERROR_TRANSPORT.E_PROVENANCE.exit).toBe(4);
    expect(ERROR_TRANSPORT.E_GATE_UNAVAILABLE.exit).toBe(3);
    expect(ERROR_TRANSPORT.E_REPEAT.exit).toBe(5);
    expect(ERROR_TRANSPORT.E_GATE.exit).toBe(3);
    expect(ERROR_TRANSPORT.E_GATE.http).toBe(403);
    expect(ERROR_TRANSPORT.E_KERNEL.exit).toBe(1);
    expect(ERROR_TRANSPORT.E_KERNEL.http).toBe(200);
    expect(ERROR_TRANSPORT.E_PARAM_MISSING.exit).toBe(2);
    expect(ERROR_TRANSPORT.E_DRAFT).toEqual({ exit: 2, http: 409, isError: true });
  });

  test("an empty interval is an answer, not a tool error", () => {
    expect(ERROR_TRANSPORT.E_UNSAT).toEqual({ exit: 1, http: 200, isError: false });
  });

  test("every verdict maps, skip exits 0", () => {
    expect(Object.keys(VERDICT_TRANSPORT).sort()).toEqual(["fail", "pass", "skip", "warn"]);
    expect(VERDICT_TRANSPORT.skip).toEqual({ exit: 0, http: 200, isError: false });
  });
});

describe("vocabularies", () => {
  test("30 feature kinds, aliases resolve into the union, moved kinds stay out", () => {
    expect(FEATURE_KINDS).toHaveLength(30);
    for (const target of Object.values(FEATURE_KIND_ALIASES)) expect(FEATURE_KINDS).toContain(target);
    for (const moved of Object.keys(MOVED_FEATURE_KINDS)) expect(FEATURE_KINDS as readonly string[]).not.toContain(moved);
  });

  test("every feature kind has one admitting milestone (D-177)", () => {
    expect(Object.keys(FEATURE_KIND_ADMISSION).sort()).toEqual([...FEATURE_KINDS].sort());
    for (const m of Object.values(FEATURE_KIND_ADMISSION)) expect(KIND_MILESTONES).toContain(m);
  });

  test("export aliases", () => {
    expect(EXPORT_ALIASES).toEqual({ "print-card": "card", design: "json", stlzip: "stl" });
  });
});
