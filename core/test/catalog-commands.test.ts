// M08-T14 steps 1 and 2: catalog.find offline and with --fetch kicad, and
// catalog.pins. The fetch reads a recorded source, so no test needs the
// network: the listing kicad_fetch.py printed on 2026-10-09
// (fixtures/kicad-fetch/list.txt) and the footprint bytes from the local
// blobless clone of the KiCad mirror (git show, offline): the workspace
// clone hbf now keeps, or the home clone an older run left; it skips when
// neither is present. The recorded network run is
// fab-knowledge/evidence/m08-close/FETCH-KICAD.txt.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { catalogFind } from "@hackbuild/catalog";
import { isThrownCommandError } from "@hackbuild/spec";
import { KICAD_CACHE_ENV, fetchKicadRows, kicadCacheDir, kicadRowId, type KicadSource } from "../src/catalog-fetch.js";
import { workspaceCatalog } from "../src/catalog-files.js";
import { json, ROOT } from "./hbf.js";

const CLONE = [path.join(kicadCacheDir(ROOT), "kicad-footprints"), path.join(homedir(), ".cache", "board-forge", "kicad-footprints")].find((d) => existsSync(d)) ?? "";
const LIST = readFileSync(path.join(ROOT, "core/test/fixtures/kicad-fetch/list.txt"), "utf8").split("\n").filter((l) => l !== "");
const recorded: KicadSource = {
  list: () => LIST,
  get: (file) => new Uint8Array(spawnSync("git", ["-C", CLONE, "show", `HEAD:${file}`]).stdout),
  commit: () => "7ebfa6b23cc292a56f751b7b5f4a0e12eeef69dd",
  origin: () => "https://github.com/KiCad/kicad-footprints.git",
};
/** A one-pad v5 footprint in the form kicad_fetch.py returns; `shape` trapezoid is one the catalog resolver refuses. */
const mod = (stem: string, shape = "rect"): Uint8Array => new TextEncoder().encode(`(module ${stem} (layer F.Cu) (pad 1 smd ${shape} (at 0 0) (size 1 1) (layers F.Cu)))\n`);
const synthetic = (files: Record<string, Uint8Array>, commit = "7ebfa6b23cc292a56f751b7b5f4a0e12eeef69dd"): KicadSource => ({
  list: () => Object.keys(files), get: (f) => files[f]!, commit: () => commit, origin: () => "https://github.com/KiCad/kicad-footprints.git",
});
function thrownCode(f: () => unknown): string {
  try { f(); } catch (e) { if (isThrownCommandError(e)) return e.hbf.code; throw e; }
  return "none";
}
const ws = mkdtempSync(path.join(tmpdir(), "hbf-catalog-"));
afterAll(() => rmSync(ws, { recursive: true, force: true }));

describe("catalog.find and catalog.pins", () => {
  it("supermini: esp32c3-supermini at tier vendor first", async () => {
    const { code, r } = await json("catalog.find", "supermini");
    expect(code).toBe(0);
    const hits = (r.result as { hits: { id: string; tier: string }[] }).hits;
    expect(hits[0]).toMatchObject({ id: "esp32c3-supermini", tier: "vendor" });
  });

  it("supermini --tier vendor: exactly one hit, esp32c3-supermini at tier vendor", async () => {
    const { code, r } = await json("catalog.find", "supermini", "--tier", "vendor");
    expect(code).toBe(0);
    const hits = (r.result as { hits: { id: string; tier: string }[] }).hits;
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ id: "esp32c3-supermini", tier: "vendor" });
  });

  it("kicad_fetch.py clones into the folder hbf names, inside the workspace", () => {
    expect(kicadCacheDir("/w")).toBe(path.join("/w", ".hbf", "cache", "git"));
    const probe = "import sys; sys.path.insert(0, 'tools/py/board'); import kicad_fetch; print(kicad_fetch.CACHE)";
    const r = spawnSync("uv", ["run", "--project", "tools/py", "python", "-c", probe], { cwd: ROOT, env: { ...process.env, [KICAD_CACHE_ENV]: kicadCacheDir(ws) }, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe(kicadCacheDir(ws));
  });

  it("catalog.pins esp32c3-supermini: 16 pins, GPIO21 boot activity names U0TXD", async () => {
    const { code, r } = await json("catalog.pins", "esp32c3-supermini");
    expect(code).toBe(0);
    const out = r.result as { pins: { name: string }[]; tier: string };
    expect(out.pins).toHaveLength(16);
    expect(JSON.stringify(r.result)).toContain("U0TXD");
  });

  it.skipIf(CLONE === "")("--fetch kicad writes community cache rows whose pads the catalog's own KiCad resolver parses", () => {
    cpSync(path.join(ROOT, "packages", "catalog", "data"), path.join(ws, "packages", "catalog", "data"), { recursive: true });
    const ids = fetchKicadRows(ws, "PinHeader_1x02_P2.54mm_Vertical", recorded, "2026-10-09");
    expect(ids).toEqual(LIST.map((f) => kicadRowId(path.basename(f, ".kicad_mod"))));
    const cat = workspaceCatalog(ws);
    const row = cat.rows.get("kicad-pinheader-1x02-p2-54mm-vertical")!;
    expect(row.tier).toBe("community");
    expect(row.provenance).toMatchObject({ method: "listing", date: "2026-10-09" });
    expect(row.provenance.source).toContain("Connector_PinHeader_2.54mm.pretty/PinHeader_1x02_P2.54mm_Vertical.kicad_mod at 7ebfa6b2");
    const pads = row.fields["pads"]!.value as { pad: string; x: number; y: number; drill?: number }[];
    // The KiCad v5 PinHeader_1x02: pads 1 and 2 on a 2.54 mm pitch with a 1.0 mm drill.
    expect(pads.map((p) => p.pad)).toEqual(["1", "2"]);
    expect(Math.abs(pads[1]!.y - pads[0]!.y)).toBeCloseTo(2.54, 6);
    expect(pads[0]!.drill).toBeCloseTo(1.0, 6);
    expect(catalogFind(cat, "pinheader 1x02", "community").map((h) => h.id)).toContain("kicad-pinheader-1x02-p2-54mm-vertical");
    expect(existsSync(path.join(ws, "packages", "catalog", "data", "modules", "kicad-pinheader-1x02-p2-54mm-vertical"))).toBe(false);
  });

  describe("--fetch kicad writes every row or none", () => {
    const rows = (w: string): string => path.join(w, ".hbf", "cache", "catalog", "modules");
    const fresh = (): string => mkdtempSync(path.join(ws, "fetch-"));

    it("an unreadable mirror commit: E_KERNEL, no row names an unknown source", () => {
      const w = fresh();
      expect(thrownCode(() => fetchKicadRows(w, "R_0603", synthetic({ "Resistor_SMD.pretty/R_0603.kicad_mod": mod("R_0603") }, "unknown"), "2026-10-11"))).toBe("E_KERNEL");
      expect(existsSync(rows(w))).toBe(false);
    });

    it("two files folding to one row id: E_SCHEMA, neither written", () => {
      const w = fresh();
      const src = synthetic({ "A.pretty/R_0603.kicad_mod": mod("R_0603"), "B.pretty/R-0603.kicad_mod": mod("R-0603") });
      expect(thrownCode(() => fetchKicadRows(w, "0603", src, "2026-10-11"))).toBe("E_SCHEMA");
      expect(existsSync(rows(w))).toBe(false);
    });

    it("a footprint the resolver refuses after one it reads: the fetch stops and the first row is not written", () => {
      const w = fresh();
      const src = synthetic({ "A.pretty/X_1.kicad_mod": mod("X_1"), "A.pretty/X_2.kicad_mod": mod("X_2", "trapezoid") });
      expect(thrownCode(() => fetchKicadRows(w, "X_", src, "2026-10-11"))).not.toBe("none");
      expect(existsSync(rows(w))).toBe(false);
    });

    it("the row source names the clone's origin, the file and the commit", () => {
      const w = fresh();
      expect(fetchKicadRows(w, "R_0603", synthetic({ "Resistor_SMD.pretty/R_0603.kicad_mod": mod("R_0603") }), "2026-10-11")).toEqual(["kicad-r-0603"]);
      const row = JSON.parse(readFileSync(path.join(rows(w), "kicad-r-0603", "row.json"), "utf8")) as { fields: { pads: { provenance: { source: string } } } };
      expect(row.fields.pads.provenance.source).toBe("https://github.com/KiCad/kicad-footprints.git Resistor_SMD.pretty/R_0603.kicad_mod at 7ebfa6b23cc292a56f751b7b5f4a0e12eeef69dd");
    });
  });
});
