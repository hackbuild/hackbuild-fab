// R1-designs-reach-04: catalog.find --fetch names one of two footprint
// libraries, the KiCad library on gitlab and the Seeed OPL KiCad library
// (fab-knowledge/plan-v5/parts-sources.md sections 3 and 4). The fetch
// reads recorded sources, so no test needs the network. The Seeed paths
// are the folder names `git ls-tree` printed for
// Seeed-Studio/OPL_Kicad_Library at b0035c51 on 2026-10-20 (measured); the
// footprint bodies are one-pad stand-ins, not Seeed's files.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { catalogFind } from "@hackbuild/catalog";
import { isThrownCommandError } from "@hackbuild/spec";
import { FETCH_SOURCES, fetchKicadRows, type FetchSourceId, type KicadSource } from "../src/catalog-fetch.js";
import { workspaceCatalog } from "../src/catalog-files.js";
import { runCatalogFind } from "../src/commands/catalog.js";
import type { CoreCtx } from "../src/ctx.js";
import { json, ROOT } from "./hbf.js";

const SEEED_COMMIT = "b0035c51eb0348bb3e165fdb2f2765fa3d1d17bd";
const GITLAB_COMMIT = "f8440fa61a5690b48b325c891fdb99c0038a5a59";
const XIAO = "Seeed Studio XIAO Series Library/XIAO-14P-Add-On.kicad_mod";
const XIAO_ROOT = "XIAO-STM32C5-SMD.kicad_mod";
const OPL = "Seeed Fusion Component Libraries for KiCad/OPL_Switch.pretty/XIAO-like_SW.kicad_mod";
/** A one-pad v6+ footprint, the form both libraries ship. */
const mod = (stem: string): Uint8Array => new TextEncoder().encode(`(footprint "${stem}" (layer "F.Cu") (pad "1" thru_hole circle (at 0 0) (size 1.6 1.6) (drill 1) (layers "*.Cu")))\n`);
const recorded = (files: readonly string[], origin: string, commit: string): KicadSource => ({
  list: () => files, get: (f) => mod(path.basename(f, ".kicad_mod")), commit: () => commit, origin: () => origin,
});
function thrownCode(f: () => unknown): string {
  try { f(); } catch (e) { if (isThrownCommandError(e)) return e.hbf.code; throw e; }
  return "none";
}
interface RowJson { licence: { id: string; class: string }; note: string; fields: { pads: { provenance: { tier: string; source: string } } } }
const ws = mkdtempSync(path.join(tmpdir(), "hbf-fetch-src-"));
afterAll(() => rmSync(ws, { recursive: true, force: true }));
const fresh = (): string => mkdtempSync(path.join(ws, "w-"));
const rowOf = (w: string, id: string): RowJson => JSON.parse(readFileSync(path.join(w, ".hbf", "cache", "catalog", "modules", id, "row.json"), "utf8")) as RowJson;

describe("catalog.find --fetch sources", () => {
  it("each source names a kicad_fetch.py repo whose remote is the source origin; kicad is the gitlab library", () => {
    const probe = "import sys, json; sys.path.insert(0, 'tools/py/board'); import kicad_fetch; print(json.dumps({k: v[0] for k, v in kicad_fetch.REPOS.items()}))";
    const r = spawnSync("uv", ["run", "--project", "tools/py", "python", "-c", probe], { cwd: ROOT, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const repos = JSON.parse(r.stdout) as Record<string, string>;
    for (const id of Object.keys(FETCH_SOURCES) as FetchSourceId[]) expect(repos[FETCH_SOURCES[id].repo], id).toBe(FETCH_SOURCES[id].origin);
    expect(FETCH_SOURCES.kicad.origin).toBe("https://gitlab.com/kicad/libraries/kicad-footprints.git");
    expect(FETCH_SOURCES.seeed.origin).toBe("https://github.com/Seeed-Studio/OPL_Kicad_Library.git");
  });

  it("a seeed XIAO row lands tier vendor with origin, path, commit and the CC-BY-SA-4.0 licence", () => {
    const w = fresh();
    const ids = fetchKicadRows(w, "XIAO", recorded([XIAO, XIAO_ROOT], FETCH_SOURCES.seeed.origin, SEEED_COMMIT), "2026-10-20", "seeed");
    expect(ids).toEqual(["seeed-xiao-14p-add-on", "seeed-xiao-stm32c5-smd"]);
    for (const id of ids) {
      const row = rowOf(w, id);
      expect(row.fields.pads.provenance.tier).toBe("vendor");
      expect(row.licence).toEqual({ id: "CC-BY-SA-4.0", class: "commit" });
    }
    expect(rowOf(w, "seeed-xiao-14p-add-on").fields.pads.provenance.source).toBe(`https://github.com/Seeed-Studio/OPL_Kicad_Library.git ${XIAO} at ${SEEED_COMMIT}`);
    const cat = workspaceCatalog(w);
    expect(cat.rows.get("seeed-xiao-14p-add-on")?.tier).toBe("vendor");
    expect(catalogFind(cat, "xiao", "vendor").map((h) => h.id)).toContain("seeed-xiao-14p-add-on");
  });

  it("a seeed row under the OPL_* folders is another maker's part drawn by Seeed Fusion: tier community", () => {
    const w = fresh();
    expect(fetchKicadRows(w, "SW", recorded([OPL], FETCH_SOURCES.seeed.origin, SEEED_COMMIT), "2026-10-20", "seeed")).toEqual(["seeed-xiao-like-sw"]);
    expect(rowOf(w, "seeed-xiao-like-sw").fields.pads.provenance.tier).toBe("community");
  });

  it("a kicad row names the gitlab origin, tier community, licence recorded", () => {
    const w = fresh();
    const file = "Resistor_SMD.pretty/R_0603_1608Metric.kicad_mod";
    expect(fetchKicadRows(w, "R_0603", recorded([file], FETCH_SOURCES.kicad.origin, GITLAB_COMMIT), "2026-10-20")).toEqual(["kicad-r-0603-1608metric"]);
    const row = rowOf(w, "kicad-r-0603-1608metric");
    expect(row.fields.pads.provenance).toMatchObject({ tier: "community", source: `https://gitlab.com/kicad/libraries/kicad-footprints.git ${file} at ${GITLAB_COMMIT}` });
    expect(row.licence).toEqual({ id: "CC-BY-SA-4.0", class: "commit" });
    expect(row.note).not.toContain("2020-10");
  });

  it("a clone whose origin is not the library's: E_KERNEL, nothing written", () => {
    const w = fresh();
    const stale = recorded(["Resistor_SMD.pretty/R_0603.kicad_mod"], "https://github.com/KiCad/kicad-footprints.git", GITLAB_COMMIT);
    expect(thrownCode(() => fetchKicadRows(w, "R_0603", stale, "2026-10-20"))).toBe("E_KERNEL");
    expect(existsSync(path.join(w, ".hbf"))).toBe(false);
  });

  it("a footprint whose row the catalog loader refuses (pad 1 listed twice, the XIAO DIP form): refused, nothing written", () => {
    const w = fresh();
    const twice = new TextEncoder().encode('(footprint "XIAO-RP2040-DIP" (layer "F.Cu") (pad "1" thru_hole circle (at 0 0) (size 1.6 1.6) (drill 1) (layers "*.Cu")) (pad "1" smd rect (at 0 0) (size 2 1) (layers "F.Cu")))\n');
    const src: KicadSource = { list: () => ["Seeed Studio XIAO Series Library/XIAO-RP2040-DIP.kicad_mod"], get: () => twice, commit: () => SEEED_COMMIT, origin: () => FETCH_SOURCES.seeed.origin };
    expect(thrownCode(() => fetchKicadRows(w, "XIAO", src, "2026-10-20", "seeed"))).toBe("E_SCHEMA");
    expect(existsSync(path.join(w, ".hbf"))).toBe(false);
  });

  it("catalog.find with fetch seeed writes seeed rows and finds them", () => {
    const w = fresh();
    const ctx = { workspace: w, inputsHash: "test" } as unknown as CoreCtx;
    const out = runCatalogFind({ query: "XIAO-14P", fetch: "seeed" }, ctx, { kicad: recorded([XIAO], FETCH_SOURCES.seeed.origin, SEEED_COMMIT), date: "2026-10-20" });
    expect(out.result?.hits.map((h) => [h.id, h.tier])).toContainEqual(["seeed-xiao-14p-add-on", "vendor"]);
  });

  it("--fetch with a library it does not know is refused before any network call", async () => {
    const { code } = await json("catalog.find", "XIAO", "--fetch", "octopart");
    expect(code).not.toBe(0);
  });
});
