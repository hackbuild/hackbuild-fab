// The reference cosmetic/art-layers (plan v11 section 4.3 step a): one plate
// carrying every layer kind BAIL adds to the inlay kind, in two art slots,
// with CHK-INL-01 to 04 passing. The art is held in two forms: build.ts
// writes the painter layers as data (a build.ts may import only spec), and
// this file writes the same art as an art document (spec/art.ts), lowers it
// (src/art-lower.ts) and requires the two equal. The reference is built
// and its goldens rerun through the hbf CLI at SOURCE_DATE_EPOCH 315532800,
// as checks.test.ts does for coin-inlay (inlay may not import core).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { ART_SHAPES, artDocumentIssues, artDocumentUri, artLayer, emptyArtDocument, type ArtDocument, type ArtLayer, type CheckResult, type Part } from "@hackbuild/spec";
import { lowerArtDocument } from "../src/art-lower.js";
import { INLAY_CHECK_IDS, artFaces, artOf, type InlayDecl } from "../src/kind.js";

const ROOT = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const REF = "reference/cosmetic/art-layers";
const EPOCH = "315532800";

function hbf(args: readonly string[]): { status: number | null; json: Record<string, unknown> } {
  const r = spawnSync(process.execPath, [path.join(ROOT, "core/bin/hbf.mjs"), ...args, "--json"], {
    cwd: ROOT, encoding: "utf8", timeout: 300_000, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, SOURCE_DATE_EPOCH: EPOCH },
  });
  if (r.stdout.trim() === "") throw new Error(`hbf ${args.join(" ")} printed nothing: ${r.stderr}`);
  return { status: r.status, json: JSON.parse(r.stdout) as Record<string, unknown> };
}

const golden = (file: string): Record<string, unknown> => JSON.parse(readFileSync(path.join(ROOT, REF, "expected", file), "utf8")) as Record<string, unknown>;

// ---- the art as a document, at the chase defaults: plate 100 by 64, shapes 14, stroke 1.2, seed 7 ----

const S = 14, T = 1.2;
const cx = (c: number): number => -50 + 2 + 16 * (c + 0.5);
const ROW = [20, 0, -20] as const;
const PINK = 2, CREAM = 3;

type Shape = Extract<ArtLayer, { kind: "shape" }>["shape"];
let n = 0;
const id = (): string => `L${++n}`;
const shape = (name: Shape, col: number, row: number, slot: number): ArtLayer => artLayer("shape", id(), {
  shape: name, w: name === "saguaro" ? 0.86 * S : S, h: name === "ellipse" ? 0.7 * S : name === "arrow" ? 0.55 * S : S,
  t: name === "grid" ? 0.8 : name === "sun" ? 1.4 : T, n: name === "steps" || name === "zigzag" ? 3 : 4, dx: cx(col), dy: ROW[row]!, slot,
});
const text = (over: Partial<Extract<ArtLayer, { kind: "text" }>>): ArtLayer => artLayer("text", id(), { font: "plexb", ...over });

function document(): ArtDocument {
  n = 0;
  const row1: Shape[] = ["ring", "rect", "ellipse", "frame", "diamond", "chevrons"];
  const row2: Shape[] = ["grid", "sun", "saguaro", "mesa", "zigzag", "steps"];
  return {
    ...emptyArtDocument(),
    faces: {
      front: [
        ...row1.map((s, c) => shape(s, c, 0, c % 2 === 0 ? PINK : CREAM)),
        ...row2.map((s, c) => shape(s, c, 1, c % 2 === 0 ? CREAM : PINK)),
        shape("arrow", 0, 2, PINK),
        artLayer("scope", id(), { a: 3, b: 2, phase: 90, w: S, h: 0.86 * S, t: 0.8, dx: cx(1), dy: ROW[2], slot: CREAM }),
        artLayer("circuit", id(), { seed: 7, w: S, h: S, pitch: 2.4, tw: 0.8, pad: 2.2, drill: 0.7, density: 1, clip: "ellipse", dx: cx(2), dy: ROW[2], slot: PINK, slot2: CREAM }),
        artLayer("logo", id(), { brand: "hb", w: S, dx: cx(3), dy: ROW[2], slot: CREAM, slot2: PINK }),
        text({ text: "hack|.build", size: 4, splitGap: 0.6, ls: 0.3, dx: (cx(4) + cx(5)) / 2, dy: ROW[2], slot: PINK, slot2: CREAM }),
      ],
      back: [
        text({ text: "MAKE THINGS", size: 5, arc: 24, ls: 0.6, slot: PINK }),
        text({ text: "BREAK THINGS", size: 5, arc: -24, ls: 0.6, slot: CREAM }),
        text({ text: "REPEAT", size: 6, splitGap: 0, ls: 0.5, dy: 6, slot: PINK }),
        { ...shape("arrow", 0, 2, CREAM), dx: 0, dy: -6, w: 1.6 * S } as ArtLayer,
      ],
    },
  };
}

let ir: Part;
beforeAll(() => {
  const b = hbf(["part.build", REF, "--detail", "full"]);
  expect(b.status).toBe(0);
  ir = (b.json["result"] as { ir: Part }).ir;
}, 300_000);
const inlays = (): InlayDecl[] => ir.features.filter((f): f is InlayDecl => f.kind === "inlay");

describe("reference cosmetic/art-layers", () => {
  test("the README covers feature:inlay and CHK-INL-01 to 04", () => {
    const readme = readFileSync(path.join(ROOT, REF, "README.md"), "utf8");
    expect(readme).toContain("covers: ['feature:inlay', 'CHK-INL-01', 'CHK-INL-02', 'CHK-INL-03', 'CHK-INL-04']");
  });

  test("the art document is valid and the lowered layers are the layers build.ts declares, on both faces", () => {
    const doc = document();
    expect(artDocumentIssues(doc)).toEqual([]);
    expect(artDocumentUri(doc)).toMatch(/^hbf:\/\/art\/[0-9a-f]{64}$/);
    const { front, back } = lowerArtDocument(doc);
    const [pink, cream] = inlays();
    for (const f of [pink!, cream!]) {
      expect(f.layers.top).toEqual(front);
      expect(f.layers.bed).toEqual(back);
    }
  });

  test("every layer kind the painters take is on the plate: all 13 shapes, scope, circuit, logo, and text straight and on an arc with letter spacing", () => {
    const { front, back } = lowerArtDocument(document());
    const all = [...front, ...back];
    expect(new Set(all.map((L) => L.kind))).toEqual(new Set(["shape", "scope", "circuit", "logo", "text"]));
    expect(new Set(all.flatMap((L) => (L.kind === "shape" ? [L.shape] : [])))).toEqual(new Set(ART_SHAPES));
    const texts = all.flatMap((L) => (L.kind === "text" ? [L] : []));
    expect(new Set(texts.map((t) => t.mode))).toEqual(new Set(["straight", "arc"]));
    expect(texts.every((t) => t.ls !== undefined && t.ls > 0)).toBe(true);
    expect(texts.filter((t) => t.mode === "arc").map((t) => t.flip)).toEqual([false, true]);
  });

  test("two art slots, pink and cream, each painted on both faces, and the body is slot 1", () => {
    expect(ir.bodies.map((b) => [b.id, b.slot, b.role])).toEqual([["plate", 1, "body"], ["inlay.pink", 2, "art"], ["inlay.cream", 3, "art"]]);
    const faces = artFaces(artOf(inlays()[0]!));
    for (const side of ["top", "bed"] as const) {
      for (const slot of [PINK, CREAM]) expect(faces[side].art.labels.includes(slot), `${side} slot ${slot}`).toBe(true);
      expect([...new Set(faces[side].art.labels)].sort()).toEqual([0, PINK, CREAM]);
    }
  });

  test("a circuit's drills leave the host in the pad slot: label 0 inside the circuit's pads", () => {
    const f = inlays()[0]!;
    const g = artFaces(artOf(f)).top.art;
    const c = f.layers.top.find((L) => L.kind === "circuit")!;
    if (c.kind !== "circuit") throw new Error("circuit expected");
    let host = 0, pad = 0;
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
      const x = (i + 0.5 - g.w / 2) / g.res - c.dx, y = (j + 0.5 - g.h / 2) / g.res - c.dy;
      if (Math.abs(x) > c.w / 2 || Math.abs(y) > c.h / 2) continue;
      const v = g.labels[j * g.w + i];
      if (v === 0) host++; else if (v === c.slot2) pad++;
    }
    expect(host).toBeGreaterThan(pad);
    expect(pad).toBeGreaterThan(100);
  });

  test("the report golden holds CHK-INL-01 to 04, every one pass, and CHK-INL-03 reads 1.2 mm", () => {
    const findings = golden("report.json")["findings"] as CheckResult[];
    const inl = findings.filter((r) => r.id.startsWith("CHK-INL-"));
    expect([...new Set(inl.map((r) => r.id))].sort()).toEqual([...INLAY_CHECK_IDS]);
    expect(inl.map((r) => r.verdict)).toEqual(inl.map(() => "pass"));
    expect(inl.filter((r) => r.id === "CHK-INL-03").map((r) => r.measured)).toEqual([1.2, 1.2]);
    expect(inl.find((r) => r.id === "CHK-INL-04")).toMatchObject({ measured: true, extra: { mirrorDistinct: "yes" } });
    expect(findings.filter((r) => r.verdict === "fail")).toEqual([]);
  });

  test("the edit: depth 1.2 to 0.72 fails CHK-INL-03 on both features, with a fix to 1.2", () => {
    const edit = golden("edit.json");
    expect(edit).toMatchObject({ pointer: "/depth", from: 1.2, to: 0.72 });
    const verdicts = (edit["expect"] as { verdicts: { id: string; to: string; fix: { set: number } }[] }).verdicts;
    expect(verdicts.map((v) => [v.id, v.to, v.fix.set])).toEqual([["CHK-INL-03", "fail", 1.2], ["CHK-INL-03", "fail", 1.2]]);
  });

  test("hbf parity exits 0 against the committed goldens", () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, "core/bin/hbf.mjs"), "parity", REF], {
      cwd: ROOT, encoding: "utf8", timeout: 300_000, env: { ...process.env, SOURCE_DATE_EPOCH: EPOCH },
    });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/equal\s+build\.json[\s\S]*equal\s+report\.json[\s\S]*equal\s+edit\.json[\s\S]*equal\s+artifacts\.json/);
  }, 300_000);
});
