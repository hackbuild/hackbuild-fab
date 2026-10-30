// A refused build keeps the last good model and says why (D-643, R1-fix-26).
// The flex-pair chase is bound over a stub build that throws the kernel's
// CommandError when the width sits at its range end, as TOGGLE's union
// refuses at minGap 0.8. Expected lines are typed from the brief's wording
// and the W range is read from reference/keys/flex-pair/chase.ts text, never
// from the module under test.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { commandError } from "@hackbuild/spec";
import { chase } from "../../../../reference/keys/flex-pair/chase.js";
import { bench } from "../../../../reference/keys/flex-pair/bench.js";
import { bindChase, type ChaseReport } from "../../src/chase/bind.js";
import { refusalOf } from "../../src/bench/refusal.js";
import type { ViewPart } from "@hackbuild/viewer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const W_RANGE = /\{ id: "W", [^}]*range: \[(\d+), (\d+)\]/.exec(readFileSync(path.join(ROOT, "reference", "keys", "flex-pair", "chase.ts"), "utf8"));

/** A one-triangle part whose x extent is the width, so a rebuilt model differs from the one before. */
const partOf = (w: number): ViewPart => ({
  part: { id: "flex-pair", bodies: [] },
  meshes: { body: { positions: [0, 0, 0, w, 0, 0, 0, 1, 0], triangles: [0, 1, 2] } },
} as unknown as ViewPart);

function bound() {
  const hi = Number(W_RANGE?.[2]);
  const b = bindChase<ChaseReport>({
    chase, bench, install: false,
    build: async (s) => {
      const w = s["W"] as number;
      if (w === hi) throw commandError({ code: "E_KERNEL", path: "/params", got: "union", expected: "a manifold union", hint: "union failed", record: "mesh-kernel" });
      return { part: partOf(w), report: { results: [] }, buildHash: `w${w}` };
    },
    writers: { "3mf": { file: "flex-pair.3mf", media: "model/3mf", write: async () => ({ bytes: "3mf" }) } },
  });
  return { b, hi, lo: Number(W_RANGE?.[1]) };
}

describe("a refused build keeps the last good model", () => {
  it("keeps the meshes, shows the stale line, closes export and logs the range end once", async () => {
    expect(W_RANGE, "W range in flex-pair chase.ts").not.toBeNull();
    const { b, hi, lo } = bound();
    await b.whenReady;
    const before = b.view().part;
    const model = b.hook.model;
    expect(before?.meshes["body"]?.positions[3]).toBe(60);
    const n0 = b.hook.log.length;

    b.hook.state = { ...(b.hook.state as Record<string, unknown>), W: hi };
    await expect(b.core.ensureMesh()).rejects.toThrow("union failed");

    expect(b.view().part).toBe(before);
    expect(b.hook.model).toBe(model);
    expect(b.hook.buildHash).toBe("w60");
    expect(b.refused()?.line).toBe(`build refused at W ${hi}: E_KERNEL, union failed. showing the last good model`);
    expect(b.refused()?.exportWhy).toBe("export closed: the last build refused. change W until it builds, then export.");
    await expect(b.hook.exportBytes("3mf")).rejects.toThrow("export closed: the last build refused. change W until it builds, then export.");
    const named = b.hook.log.slice(n0).filter((l) => l.includes(`W ${hi}`) && l.includes(`${lo} to ${hi}`));
    expect(named).toEqual([`build refused at the range end W ${hi} (range ${lo} to ${hi}): E_KERNEL, union failed. the last good model stays drawn`]);

    b.hook.state = { ...(b.hook.state as Record<string, unknown>), W: 70 };
    await b.core.ensureMesh();
    expect(b.refused()).toBeNull();
    expect(b.view().part?.meshes["body"]?.positions[3]).toBe(70);
    expect(atob(await b.hook.exportBytes("3mf"))).toBe("3mf");
  });

  it("a refusal before any good build names no field and says the stage is empty", async () => {
    const b = bindChase<ChaseReport>({ chase, bench, install: false, build: async () => { throw new Error("E_KERNEL /params union failed"); } });
    await b.whenReady;
    expect(b.view().part).toBeNull();
    expect(b.refused()?.line).toBe("build refused: E_KERNEL, union failed. nothing has built yet, so the stage is empty");
  });

  it("a message that ends in a period does not double it before the tail", async () => {
    const b = bindChase<ChaseReport>({ chase, bench, install: false, build: async () => { throw new Error("this bake carries no geometry build. the stage stays empty."); } });
    await b.whenReady;
    const line = b.refused()?.line ?? "";
    expect(line).toContain("the stage stays empty. nothing has built yet");
    expect(line).not.toContain("..");
  });

  it("reads the code from a CommandError and from a message, and none from a plain throw", () => {
    expect(refusalOf(commandError({ code: "E_KERNEL", path: "/x", hint: "union failed", record: "mesh-kernel" }))).toEqual({ code: "E_KERNEL", message: "union failed" });
    expect(refusalOf(new Error("E_PARAM_MISSING at /keys/0/gap: check it"))).toEqual({ code: "E_PARAM_MISSING", message: "at /keys/0/gap: check it" });
    expect(refusalOf(new Error("E_KERNEL /params union failed"))).toEqual({ code: "E_KERNEL", message: "union failed" });
    expect(refusalOf("boom")).toEqual({ code: null, message: "boom" });
  });
});
