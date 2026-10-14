// M00-T05 step 3: the prism route retries a cap triangulation whose shell
// fails the audit, as BLOCKS _prismPoly does (kernel.js lines 241 and 265:
// the try loop runs while !ok and ok is auditIndexed of the whole shell).
// The audit is stubbed here so that a shell can be made to fail on demand;
// real shells from these outlines pass it on attempt 0.

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ATTEMPTS, loadGeom, triangulate, type Geom } from "@hackbuild/geom";
import { PRISM_RETRIES, prismMesh, signedVolume } from "../../src/index.js";

const stub = vi.hoisted(() => ({ reject: 0, calls: 0 }));

vi.mock("../../src/audit.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../src/audit.js")>();
  return {
    ...real,
    audit: (...args: Parameters<typeof real.audit>) => {
      const a = real.audit(...args);
      stub.calls += 1;
      return stub.calls <= stub.reject ? { ...a, ok: false } : a;
    },
  };
});

let geom: Geom;
beforeAll(async () => {
  geom = await loadGeom();
});
beforeEach(() => {
  stub.reject = 0;
  stub.calls = 0;
});

const square = [[[0, 0], [10, 0], [10, 10], [0, 10]]] as [number, number][][];

describe("geom triangulate acceptance predicate", () => {
  it("retries an attempt the caller rejects and returns the next one", () => {
    const seen: number[] = [];
    const t = triangulate({ outer: square[0]!, holes: [] }, (tried) => {
      seen.push(tried.attempt);
      return tried.attempt > 0;
    });
    expect(seen).toEqual([0, 1]);
    expect(t.attempt).toBe(1);
    expect(t.degenerate).toBe(0);
    expect(t.complete).toBe(true);
  });

  it("stops at ATTEMPTS and returns the last attempt when every one is rejected", () => {
    const t = triangulate({ outer: square[0]!, holes: [] }, () => false);
    expect(t.attempt).toBe(ATTEMPTS - 1);
  });
});

describe("prism route retries a shell that fails the audit", () => {
  it("takes attempt 1 when the attempt 0 shell fails, with no PRISM_NOT_MANIFOLD", () => {
    stub.reject = 1;
    const r = prismMesh(geom, square, [0, 1]);
    expect(r.retries).toBe(1);
    expect(r.warnings.map((w) => w.code)).toEqual(["PRISM_RETRY"]);
    expect(r.warnings[0]!.text).toBe(`cap triangulated on retry 1 of ${PRISM_RETRIES}: /`);
    expect(signedVolume(r.mesh)).toBe(100);
    // attempt 0 rejected, attempt 1 accepted, and its audit reused for the warning
    expect(stub.calls).toBe(2);
  });

  it("keeps the shell with PRISM_NOT_MANIFOLD after every retry fails", () => {
    stub.reject = Number.POSITIVE_INFINITY;
    const r = prismMesh(geom, square, [0, 1]);
    expect(r.retries).toBe(PRISM_RETRIES);
    expect(r.shells).toHaveLength(1);
    expect(r.warnings.map((w) => w.code)).toEqual(["PRISM_RETRY", "PRISM_NOT_MANIFOLD"]);
    // ATTEMPTS - 1 shells audited inside the loop, then the last one once more
    expect(stub.calls).toBe(ATTEMPTS);
  });

  it("audits each shell once when attempt 0 passes", () => {
    const r = prismMesh(geom, square, [0, 1]);
    expect(r.retries).toBe(0);
    expect(r.warnings).toEqual([]);
    expect(stub.calls).toBe(1);
  });
});
