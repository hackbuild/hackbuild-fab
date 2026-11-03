// registry/runners.json (plan v11.2 section 5): every row holds the form,
// every runner runs as a separate process (D-043), the slicer rows are the
// ids the Orca-family driver knows, and the doctor lines grade a runner by
// presence and its measured version.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { loadRunners, runnerIssues, runnerLines, type RunnerRow } from "../src/runners.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const rows = loadRunners(ROOT);
const row = (id: string): RunnerRow => rows.find((r) => r.id === id) as RunnerRow;

describe("the runner manifest", () => {
  it("loads with every row in form and no id twice", () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.flatMap((r) => runnerIssues(r))).toEqual([]);
  });

  it("refuses a linked runner, a missing install line and a detect with neither app nor command", () => {
    const base = row("arduino-cli");
    expect(runnerIssues({ ...base, link: "library" as never }).join(" ")).toMatch(/separate process \(D-043\)/);
    expect(runnerIssues({ ...base, install: "" }).join(" ")).toMatch(/install is not a non-empty string/);
    expect(runnerIssues({ ...base, detect: {} }).join(" ")).toMatch(/exactly one of app or command/);
  });

  it("holds a slicer row for every id the Orca-family driver knows, and no other", async () => {
    const { SLICERS } = (await import(pathToFileURL(path.join(ROOT, "tools/slice/orca-family.mjs")).href)) as { SLICERS: Record<string, { app: string }> };
    const slicers = rows.filter((r) => r.kind === "slicer");
    expect(slicers.map((r) => r.id).sort()).toEqual(Object.keys(SLICERS).sort());
    for (const r of slicers) expect(SLICERS[r.id]?.app).toBe(r.detect.app);
  });
});

describe("the doctor lines", () => {
  const r = row("arduino-cli");
  const untested = { ...r, tested: null };
  it("say not run with the install line when the runner is absent", () => {
    const [l] = runnerLines([r], () => ({ present: false }));
    expect(l?.status).toBe("not run");
    expect(l?.detail).toContain(r.install);
  });
  it("say ok at the measured version and warn at another, an unread one or none on record", () => {
    const tested = r.tested?.version ?? "";
    expect(runnerLines([r], () => ({ present: true, at: "/x", version: tested }))[0]?.status).toBe("ok");
    expect(runnerLines([r], () => ({ present: true, at: "/x", version: "0.0.1" }))[0]?.status).toBe("warn");
    expect(runnerLines([r], () => ({ present: true, at: "/x" }))[0]?.status).toBe("warn");
    expect(runnerLines([untested], () => ({ present: true, at: "/x", version: "9" }))[0]?.status).toBe("warn");
  });
});
