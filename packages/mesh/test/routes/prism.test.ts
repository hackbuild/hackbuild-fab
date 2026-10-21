// M00-T05 step 3 and step 8 prism parity: the prism route against BOSS
// Mesh.prism on the five BOSS fixtures recorded by
// tools/legacy/boss-prism-dump.cjs in tools/corpus/mesh/boss-prism.json.
// Every volume matches within 1e-6 relative (computed) and both audits
// report 0 bad edges.

import { existsSync, readFileSync } from "node:fs";
import { sourcePath } from "../../../../tools/test-support/originals-root.js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Ring } from "@hackbuild/spec";
import { ATTEMPTS, loadGeom, type Geom } from "@hackbuild/geom";
import { PRISM_RETRIES, audit, cleanRing, isWatertight, liveCount, prismMesh, signedVolume } from "../../src/index.js";

interface Polygon {
  readonly outline: Ring[];
  readonly volume: number;
  readonly auditIndexed: { readonly ok: boolean; readonly bad: number };
  readonly auditMerged: { readonly ok: boolean; readonly bad: number };
  readonly warnings: string[];
}
interface Corpus {
  readonly fixtures: { readonly name: string; readonly z: [number, number]; readonly polygons: Polygon[] }[];
}

const corpus = JSON.parse(readFileSync(new URL("../../../../tools/corpus/mesh/boss-prism.json", import.meta.url), "utf8")) as Corpus;

let geom: Geom;
beforeAll(async () => {
  geom = await loadGeom();
});

describe("prism route against BOSS Mesh.prism", () => {
  it("covers the five BOSS fixtures", () => {
    expect(corpus.fixtures.map((f) => f.name)).toEqual(["rect", "rrect", "ring2", "stroke", "circle-hole"]);
  });

  for (const f of corpus.fixtures) {
    it(`${f.name}: volume within 1e-6 relative of BOSS, both audits 0 bad edges`, () => {
      f.polygons.forEach((p, i) => {
        const r = prismMesh(geom, p.outline, f.z, `/fixtures/${f.name}/${i}`);
        const v = signedVolume(r.mesh);
        const rel = Math.abs(v - p.volume) / p.volume;
        const a = audit(r.mesh);
        console.log(`${f.name}[${i}] route ${v.toFixed(9)} mm3, BOSS ${p.volume.toFixed(9)} mm3, relative ${rel.toExponential(2)} (computed), retries ${r.retries}, shells ${r.shells.length}`);
        expect(rel).toBeLessThanOrEqual(1e-6);
        expect(p.auditIndexed.bad).toBe(0);
        expect(p.auditMerged.bad).toBe(0);
        expect(a.openEdgesRaw).toBe(0);
        expect(a.openEdges).toBe(0);
        expect(a.ok).toBe(true);
        expect(isWatertight(r.mesh)).toBe(true);
        expect(r.warnings).toEqual([]);
      });
    });
  }
});

interface LineageRow {
  readonly id: string;
  readonly kind: string;
  readonly source: string;
  readonly dest: string | null;
}
const lineage = JSON.parse(readFileSync(new URL("../../../../lineage.json", import.meta.url), "utf8")) as LineageRow[];

describe("prism route follows its canonical lineage row (D-156)", () => {
  const rows = lineage.filter((r) => r.id.startsWith("mesh.prism/"));
  const canonical = rows.filter((r) => r.kind === "canonical");

  it("has one canonical row and it lands in prism.ts", () => {
    expect(canonical).toHaveLength(1);
    expect(canonical[0]!.dest).toBe("packages/mesh/src/routes/prism.ts");
  });

  it("canonical is the copy with the most cap tries among the mesh.prism and blocks.kernel files on disk", () => {
    const tries = (file: string): number => {
      const m = /for \(tries = 0; tries < (\d+) && !ok; tries\+\+\)/.exec(readFileSync(file, "utf8"));
      return m ? Number(m[1]) : -1;
    };
    const files = lineage
      .filter((r) => (r.id.startsWith("mesh.prism/") || r.id.startsWith("blocks.kernel/")) && r.source.endsWith(".js") && existsSync(sourcePath(r.source)))
      .map((r) => sourcePath(r.source));
    const canon = sourcePath(canonical[0]!.source);
    if (!existsSync(canon)) return;
    const best = Math.max(...files.map(tries));
    expect(tries(canon)).toBe(best);
  });

  it("ATTEMPTS and PRISM_RETRIES equal the canonical _prismPoly try count", () => {
    expect(PRISM_RETRIES).toBe(ATTEMPTS - 1);
    const src = sourcePath(canonical[0]!.source);
    if (!existsSync(src)) return;
    const text = readFileSync(src, "utf8");
    const loop = /for \(tries = 0; tries < (\d+) && !ok; tries\+\+\)/.exec(text);
    const last = /\(t\.zero \|\| !t\.complete\) && tries < (\d+)\) continue;/.exec(text);
    expect(loop, `${src} has no _prismPoly try loop`).not.toBeNull();
    expect(Number(loop![1])).toBe(ATTEMPTS);
    expect(Number(last![1])).toBe(PRISM_RETRIES);
  });
});

describe("prism route rules", () => {
  it("keeps every z on the grid exactly (exact Z)", () => {
    const r = prismMesh(geom, [[[0, 0], [5, 0], [5, 5], [0, 5]]], [0.25, 2.41]);
    const zs = new Set<number>();
    for (let i = 2; i < r.mesh.positions.length; i += 3) zs.add(r.mesh.positions[i]!);
    expect([...zs].sort((a, b) => a - b)).toEqual([0.25, 2.41015625]);
  });

  it("cuts a hole drawn the same way round as its outer ring", () => {
    const outer: Ring = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const hole: Ring = [[3, 3], [7, 3], [7, 7], [3, 7]];
    const r = prismMesh(geom, [outer, hole], [0, 1]);
    expect(signedVolume(r.mesh)).toBe(84);
    expect(audit(r.mesh).ok).toBe(true);
  });

  it("makes one closed shell per outline component and drops none", () => {
    // two squares joined by a corner: CrossSection keeps them as two outlines
    const bow: Ring = [[0, 0], [2, 0], [2, 2], [4, 2], [4, 4], [2, 4], [2, 2], [0, 2]];
    const r = prismMesh(geom, [bow], [0, 1]);
    expect(r.shells.length).toBe(2);
    expect(signedVolume(r.mesh)).toBe(8);
    for (const s of r.shells) expect(audit(s).ok).toBe(true);
  });

  it("strips collinear midpoints as BOSS cleanRing does", () => {
    expect(cleanRing([[0, 0], [1, 0], [2, 0], [2, 2], [0, 2], [0, 0]])).toEqual([[0, 0], [2, 0], [2, 2], [0, 2]]);
  });

  it("refuses an outline with no area with E_SCHEMA", () => {
    let code = "";
    try {
      prismMesh(geom, [[[0, 0], [1, 0], [2, 0]]], [0, 1]);
    } catch (e) {
      code = (e as { hbf?: { code: string } }).hbf?.code ?? "";
    }
    expect(code).toBe("E_SCHEMA");
  });

  it("leaves no live wasm object", () => {
    expect(liveCount()).toBe(0);
  });
});
