// Schema 1 to 2 (M10-T03 steps 1 and 2): the handoff template migrates,
// validates with 0 errors, reports license filled CC-BY-SA-4.0 and
// machines ["ffc5p"], moves its layout to the bench and drops its check
// selector, and a second migration is a no-op.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadProfile } from "@hackbuild/profile";
import { isThrownCommandError, type Chase, type CommandError } from "@hackbuild/spec";
import { migrateChase, resolveRefs, validateChase, type ChaseRegistries } from "@hackbuild/chase";
import { ROOT } from "./helpers.js";

const TEMPLATE = path.join(ROOT, "packages", "chase", "test", "fixtures", "v1", "_template.chase.json");
const template = (): Record<string, unknown> => JSON.parse(readFileSync(TEMPLATE, "utf8")) as Record<string, unknown>;

const profile = loadProfile();
/** Every registry this package can reach; exporters are core's, so core/test/chase-migrate.test.ts resolves those. */
const reg: ChaseRegistries = {
  checks: (JSON.parse(readFileSync(path.join(ROOT, "packages", "checks", "seed", "checks.seed.json"), "utf8")) as { checks: { id: string }[] }).checks.map((r) => ({ id: r.id })),
  exporters: ["3mf"],
  constraintDims: [],
  machines: profile.machines.map((m) => m.id),
  materials: profile.materials.map((m) => m.id),
};

function refusal(f: () => unknown): CommandError {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("accepted");
}

describe("the handoff template, schema 1", () => {
  const input = template();
  const { chase, report } = migrateChase(input);
  const c = chase as Chase;

  it("migrates to schema 2 and validates with 0 errors", () => {
    expect([report.from, report.to, c.meta.chase]).toEqual([1, 2, 2]);
    expect(validateChase(c)).toEqual([]);
    expect(resolveRefs(c, reg)).toEqual([]);
  });
  it("sets machines to [\"ffc5p\"] and reports license filled with CC-BY-SA-4.0", () => {
    expect(c.meta.machines).toEqual(["ffc5p"]);
    expect(c.meta.license).toBe("CC-BY-SA-4.0");
    expect(report.lines.find((l) => l.pointer === "/meta/license")).toMatchObject({ change: "filled", to: "CC-BY-SA-4.0" });
    expect(report.lines.find((l) => l.pointer === "/meta/machine")).toMatchObject({ change: "converted", from: "ffc5p", to: ["ffc5p"] });
  });
  it("reports every change as a line", () => {
    expect(report.lines.map((l) => `${l.change} ${l.pointer}`)).toEqual([
      "converted /meta/machine",
      "moved /meta/shell",
      "moved /views",
      "moved /rail",
      "moved /status",
      "dropped /checks",
      "dropped /exports/0/gated",
      "filled /params/0/fields/0/label",
      "converted /build/module",
      "filled /meta/license",
      "set /meta/chase",
    ]);
    expect(Object.keys(report.bench).sort()).toEqual(["rail", "shell", "status", "views"]);
    expect(c.params[0]!.fields[0]!.label).toBe("d");
    expect(c.build.module).toBe("./build.ts");
    expect("checks" in c).toBe(false);
    expect(c.exports).toEqual([{ kind: "3mf", machine: "ffc5p" }]);
  });
  it("leaves its input untouched", () => {
    expect(input).toEqual(template());
  });
  it("is idempotent: a second migration returns the document unchanged", () => {
    const again = migrateChase(c);
    expect(again.chase).toBe(c);
    expect(again.report.lines).toEqual([]);
    expect([again.report.from, again.report.to]).toEqual([2, 2]);
  });
});

describe("1-to-2 conversions", () => {
  it("converts string enum options, export aliases, and gives a board design CERN-OHL-W-2.0", () => {
    const t = template();
    const meta = t["meta"] as Record<string, unknown>;
    delete meta["license"];
    t["params"] = [{ id: "main", label: "MAIN", fields: [
      { id: "pads", type: "enum", label: "leads", options: ["clip", "cup"], default: "clip" },
      { id: "keys", type: "list", min: 1, max: 2, item: [{ id: "lead", type: "enum", options: ["a"], default: "a" }] },
    ] }];
    t["exports"] = [{ kind: "print-card" }, { kind: "gerbers", gated: true }, { kind: "stlzip" }, { kind: "design" }];
    const { chase, report } = migrateChase(t);
    const c = chase as Chase;
    expect(c.params[0]!.fields[0]).toMatchObject({ options: [{ value: "clip", label: "clip" }, { value: "cup", label: "cup" }] });
    expect(c.params[0]!.fields[1]).toMatchObject({ label: "keys", item: [{ label: "lead", options: [{ value: "a", label: "a" }] }] });
    expect(c.exports.map((e) => e.kind)).toEqual(["card", "gerbers", "stl", "json"]);
    expect(c.meta.license).toBe("CERN-OHL-W-2.0");
    expect(validateChase(c)).toEqual([]);
    expect(report.lines.filter((l) => l.change === "converted").map((l) => l.pointer)).toEqual([
      "/meta/machine", "/exports/0/kind", "/exports/2/kind", "/exports/3/kind",
      "/params/0/fields/0/options", "/params/0/fields/1/item/0/options", "/build/module",
    ]);
  });
  it("keeps a license the document states", () => {
    const t = template();
    (t["meta"] as Record<string, unknown>)["license"] = "MIT";
    expect((migrateChase(t).chase as Chase).meta.license).toBe("MIT");
  });
  it("refuses a schema newer than this build, and a document with no schema version", () => {
    const t = template();
    (t["meta"] as Record<string, unknown>)["chase"] = 3;
    expect([refusal(() => migrateChase(t)).code, refusal(() => migrateChase(t)).path]).toEqual(["E_SCHEMA", "/meta/chase"]);
    delete (t["meta"] as Record<string, unknown>)["chase"];
    expect(refusal(() => migrateChase(t)).code).toBe("E_SCHEMA");
  });
});
