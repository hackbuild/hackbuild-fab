// The error contract on the CLI (D-064, D-182, M00-T13 steps 2 and 4):
// E_SCHEMA with a pointer, got, expected and hint; E_REF with up to three
// didYouMean; exit codes from the spec/errors.ts tables, which this test
// imports and never copies. Exits 0, 1, 2 and 3 are exercised end to end.

import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { afterAll, describe, expect, it } from "vitest";
import { ERROR_CODES, ERROR_TRANSPORT, VERDICT_TRANSPORT } from "@hackbuild/spec";
import { didYouMean, exitOf } from "../src/errors.js";
import { export3mf, buildPart, loadDesign, resolveParams } from "../src/commands/build.js";
import { REF, ROOT, hbf, json } from "./hbf.js";

const tmp = mkdtempSync(path.join(tmpdir(), "hbf-errors-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("exit codes come from spec/errors.ts", () => {
  it("maps every error code and verdict through the transport tables", () => {
    for (const code of ERROR_CODES) expect(exitOf({ verdict: "fail", errors: [{ code, hint: "h" }] })).toBe(ERROR_TRANSPORT[code].exit);
    for (const v of ["pass", "warn", "fail", "skip"] as const) expect(exitOf({ verdict: v, errors: [] })).toBe(VERDICT_TRANSPORT[v].exit);
  });

  it("didYouMean returns at most three, closest first", () => {
    expect(didYouMean("CHK-3MF-6", ["CHK-3MF-06", "CHK-NET-02", "CHK-3MF-07", "CHK-PRT-01"])[0]).toBe("CHK-3MF-06");
    expect(didYouMean("x", ["a", "b", "c", "d"]).length).toBe(3);
  });
});

describe("E_SCHEMA and E_REF on the CLI", () => {
  it("a group-qualified param of the wrong type is E_SCHEMA at its pointer, exit 2", async () => {
    const { code, r } = await json("part.build", REF, "--params", '{"wire":{"w":"wide"}}');
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/wire/w", got: "wide" });
    expect(r.errors[0]?.expected).toMatch(/number/);
    expect(r.errors[0]?.hint.length).toBeGreaterThan(0);
  }, 60_000);

  it("an unknown param is E_SCHEMA with didYouMean; an unknown pointer is E_REF", async () => {
    const a = await json("part.build", REF, "--params", '{"wdth": 1}');
    expect(a.code).toBe(2);
    expect(a.r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/wdth" });
    const b = await json("part.build", REF, "--params", '{"/keys/3/gap": 1.5}');
    expect(b.code).toBe(2);
    expect(b.r.errors[0]?.code).toBe("E_REF");
  }, 60_000);

  it("a schema failure on the input names the field", async () => {
    const { code, r } = await json("view.render", REF, "--mode", "iso", "--size", "9x9");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/size/0" });
  });

  it("explain CHK-3MF-6 is E_REF with CHK-3MF-06 in didYouMean", async () => {
    const { code, r } = await json("explain", "CHK-3MF-6");
    expect(code).toBe(2);
    expect(r.errors[0]?.code).toBe("E_REF");
    expect(r.errors[0]?.didYouMean).toContain("CHK-3MF-06");
    expect(r.errors[0]!.didYouMean!.length).toBeLessThanOrEqual(3);
  });

  it("an unknown command and an unknown flag are refused with suggestions", async () => {
    const a = await json("part.bild", REF);
    expect(a.code).toBe(2);
    expect(a.r.errors[0]).toMatchObject({ code: "E_REF", didYouMean: expect.arrayContaining(["part.build"]) });
    const b = await json("part.build", REF, "--detial", "full");
    expect(b.code).toBe(2);
    expect(b.r.errors[0]?.didYouMean).toContain("--detail");
  });

  it("explain prints a check record and an error code meaning, exit 0", async () => {
    const c = await hbf(["explain", "CHK-3MF-06"]);
    expect(c.code).toBe(0);
    expect(c.out).toMatch(/^CHK-3MF-06 /);
    expect(c.out).toContain("hbf://check/CHK-3MF-06");
    const e = await hbf(["explain", "E_GATE_UNAVAILABLE"]);
    expect(e.code).toBe(0);
    expect(e.out).toContain(`exit ${ERROR_TRANSPORT.E_GATE_UNAVAILABLE.exit}`);
  });
});

describe("exit 1 on a check fail", () => {
  it("check.run --artifact on a package whose components point at the root model fails CHK-3MF-06", async () => {
    const design = await loadDesign(path.join(ROOT, REF), ROOT);
    const pkg = await export3mf(await buildPart(design, resolveParams(design.chase, undefined, undefined)));
    const zip = await JSZip.loadAsync(pkg.bytes);
    const rels = "3D/_rels/3dmodel.model.rels";
    const root = await zip.file("3D/3dmodel.model")!.async("string");
    const sub = Object.keys(zip.files).find((f) => /^3D\/Objects\/.+\.model$/.test(f));
    const broken = sub === undefined
      ? root.replace(/<component /g, '<component p:path="/3D/3dmodel.model" ')
      : root.replaceAll(`/${sub}`, "/3D/3dmodel.model");
    zip.file("3D/3dmodel.model", broken);
    if (zip.file(rels) === null) zip.file(rels, "");
    const file = path.join(tmp, "self-reference.3mf");
    writeFileSync(file, await zip.generateAsync({ type: "uint8array" }));
    const { code, r } = await json("check.run", "--artifact", file);
    expect(code).toBe(1);
    expect(r.findings.find((f) => f.id === "CHK-3MF-06")?.verdict).toBe("fail");
  }, 60_000);

  // The corpus copy is tracked in tools/corpus (M00-T10); a checkout without it fails here (D-153).
  const cask = path.join(ROOT, "tools", "corpus", "3mf", "known-bad", "cask-empty-plate.3mf");
  it("the CASK empty-plate original fails CHK-3MF-06", async () => {
    expect(existsSync(cask), `${cask} is tracked`).toBe(true);
    const { code, r } = await json("check.run", "--artifact", cask);
    expect(code).toBe(1);
    expect(r.findings.find((f) => f.id === "CHK-3MF-06")?.verdict).toBe("fail");
  }, 60_000);
});
