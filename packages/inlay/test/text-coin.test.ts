// OK-01: initials on cosmetic/coin-inlay through the node text route. Ms.
// Okafor's class coin (30 mm, 2.88 mm, the mark at 20 mm, the ring from 11
// to 13 mm) is built through the hbf CLI with three sets of initials: each
// builds with no failing check, puts its letters on the back in slot 2,
// leaves the front equal to the coin without them, and passes the export
// dry run (the gate is not opened). The empty default keeps the art
// address of the committed goldens, so no body moved. Art wider than the
// blank is refused instead of standing beside the coin.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CheckResult, Part } from "@hackbuild/spec";
import { artFaces, artOf, type InlayDecl } from "../src/kind.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const REF = "reference/cosmetic/coin-inlay";
const EPOCH = "315532800";
const CLASS_COIN = { dia: 30, thk: 2.88, markSpan: 20, ringIn: 11, ringOut: 13, textSize: 8 };

function hbf(args: readonly string[]): { status: number | null; json: Record<string, unknown> } {
  const r = spawnSync(process.execPath, [join(ROOT, "core/bin/hbf.mjs"), ...args, "--json"], {
    cwd: ROOT, encoding: "utf8", timeout: 300_000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SOURCE_DATE_EPOCH: EPOCH },
  });
  if (r.stdout.trim() === "") throw new Error(`hbf ${args.join(" ")} printed nothing: ${r.stderr}`);
  return { status: r.status, json: JSON.parse(r.stdout) as Record<string, unknown> };
}

function inlayOf(params: Record<string, unknown>): { status: number | null; json: Record<string, unknown>; f: InlayDecl } {
  const r = hbf(["part.build", REF, "--detail", "full", "--params", JSON.stringify(params)]);
  const ir = (r.json["result"] as { ir: Part }).ir;
  return { ...r, f: ir.features.find((x) => x.kind === "inlay") as InlayDecl };
}

const cellsOf = (labels: Uint8Array, slot: number): number => labels.reduce((n, s) => n + (s === slot ? 1 : 0), 0);
const failsOf = (json: Record<string, unknown>): string[] => (json["findings"] as CheckResult[]).filter((r) => r.verdict === "fail").map((r) => r.id);

describe("initials on the coin-inlay back face", () => {
  it("the empty default declares the art of the committed goldens", () => {
    const report = JSON.parse(readFileSync(join(ROOT, REF, "expected", "report.json"), "utf8")) as { findings: CheckResult[] };
    const uri = report.findings.find((r) => r.id === "CHK-INL-04")?.extra?.["art"];
    const { f } = inlayOf({});
    expect(f.layers.bed.map((L) => L.kind)).toEqual(["ring"]);
    expect(f.art).toBe(uri);
  }, 300_000);

  it("three class coins, each with its own initials, build with no failing check", () => {
    const plain = inlayOf(CLASS_COIN);
    expect(plain.status).toBe(0);
    const plainFaces = artFaces(artOf(plain.f));
    expect(cellsOf(plainFaces.bed.art.labels, 2)).toBe(0);
    const seen = new Set<string>();
    for (const initials of ["AB", "JMK", "LT"]) {
      const r = inlayOf({ ...CLASS_COIN, initials });
      expect(r.status, initials).toBe(0);
      expect(failsOf(r.json), initials).toEqual([]);
      const faces = artFaces(artOf(r.f));
      expect(cellsOf(faces.bed.art.labels, 2), initials).toBeGreaterThan(500);
      expect([...faces.top.art.labels]).toEqual([...plainFaces.top.art.labels]);
      seen.add(r.f.art);
    }
    expect(seen.size).toBe(3);
  }, 600_000);

  it("export.run --dry-run stops at the gate with no failing check", () => {
    const r = hbf(["export.run", REF, "--kind", "3mf", "--machine", "ffc5p", "--dry-run", "--params", JSON.stringify({ ...CLASS_COIN, initials: "JMK" })]);
    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ stage: "gate", errors: [] });
    expect(failsOf(r.json)).toEqual([]);
  }, 300_000);

  it("initials wider than the blank are E_SCHEMA, not a loose body", () => {
    const r = hbf(["part.build", REF, "--params", JSON.stringify({ ...CLASS_COIN, initials: "WWWWWW", textSize: 20 })]);
    expect(r.status).not.toBe(0);
    const errors = r.json["errors"] as { code: string; path: string }[];
    expect(errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/features/inlay.pink/layers/bed" });
  }, 300_000);
});
