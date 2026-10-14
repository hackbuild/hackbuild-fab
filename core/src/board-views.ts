// The kernel views a board check reads (M08-T07, M08-T08). The checks
// package compiles without Node, so the reparse runs here: the zip's
// members go to a temporary folder beside the record, and when the zip is
// the one a direct generator wrote, its gates.json and source/ geometry go
// with it so the vector and raster compares run too. The script's report
// comes back as data.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readEntries } from "@hackbuild/3mf";
import { sha256Hex } from "@hackbuild/spec";
import type { KernelViews, LandingInput, ReparseReport } from "@hackbuild/checks";
import { cmdError } from "./errors.js";

/** The reparse report of tools/py/board/reparse.py for one fab zip. */
export async function reparseZip(root: string, zip: Uint8Array, record: unknown, context?: string, raster = true): Promise<ReparseReport | undefined> {
  const entries = await readEntries(zip);
  const gerbers = Object.keys(entries).filter((n) => n.endsWith(".gbr") || n.endsWith(".drl"));
  if (gerbers.length === 0) return undefined;
  const work = mkdtempSync(path.join(tmpdir(), "hbf-reparse-"));
  try {
    const fab = path.join(work, "fab");
    mkdirSync(fab);
    for (const n of gerbers) writeFileSync(path.join(fab, path.basename(n)), entries[n]!);
    writeFileSync(path.join(work, "record.json"), JSON.stringify(record));
    if (context !== undefined) {
      if (existsSync(path.join(context, "gates.json"))) cpSync(path.join(context, "gates.json"), path.join(work, "gates.json"));
      if (existsSync(path.join(context, "source"))) cpSync(path.join(context, "source"), path.join(fab, "source"), { recursive: true });
    }
    const report = path.join(work, "report.json");
    const args = ["run", "--project", path.join(root, "tools", "py"), path.join(root, "tools", "py", "board", "reparse.py"), fab,
      "--record", path.join(work, "record.json"), "--json", report, ...(raster ? [] : ["--no-raster"])];
    const r = spawnSync("uv", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error !== undefined) {
      throw cmdError({ code: "E_KERNEL", path: "/artifact", got: "uv", expected: "the uv binary on PATH", hint: `uv did not start (${r.error.message}); the reparse runs through tools/py (D-140)`, record: "board-pcb" });
    }
    if (!existsSync(report)) {
      throw cmdError({ code: "E_KERNEL", path: "/artifact", got: (r.stderr ?? "").trim().split("\n").slice(-1)[0] ?? "", expected: "a reparse report", hint: "tools/py/board/reparse.py stopped before writing its report", record: "board-pcb" });
    }
    const out = JSON.parse(readFileSync(report, "utf8")) as { ok: boolean; fails: string[]; lines: string[]; worstSymdiff: number };
    return { ok: out.ok, fails: out.fails, lines: out.lines, worstSymdiff: out.worstSymdiff, detail: out };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/**
 * The lead landing inputs of a board (CHK-BRD-19): placements from the
 * generator's gates.json, model leads from the reference's models.json,
 * allowances from its allow.json; undefined when either source is absent.
 */
export function landingInput(context: string | undefined, designDir: string | undefined): LandingInput | undefined {
  if (context === undefined || designDir === undefined) return undefined;
  const gates = path.join(context, "gates.json");
  const models = path.join(designDir, "models.json");
  if (!existsSync(gates) || !existsSync(models)) return undefined;
  const placements = (JSON.parse(readFileSync(gates, "utf8")) as { placements?: LandingInput["placements"] }).placements;
  if (placements === undefined) return undefined;
  const allowFile = path.join(designDir, "allow.json");
  return {
    placements,
    models: (JSON.parse(readFileSync(models, "utf8")) as { models: LandingInput["models"] }).models,
    allow: existsSync(allowFile) ? (JSON.parse(readFileSync(allowFile, "utf8")) as LandingInput["allow"]) : {},
  };
}

/**
 * Board views rooted at the workspace. `context` is the folder a direct
 * generator wrote (.hbf/out/<design>), whose gates.json and source/ the
 * reparse reads beside the zip.
 */
export function boardViews(root: string, context?: string, designDir?: string): KernelViews & { readonly reparsed: Map<string, ReparseReport | undefined> } {
  // One reparse per zip and record within a run: parity reads the report for its golden after the check ran.
  const reparsed = new Map<string, ReparseReport | undefined>();
  return {
    reparsed,
    board: {
      landing: () => landingInput(context, designDir),
      reparse: async (zip, record) => {
        const key = `${sha256Hex(zip)}:${(record as { recordHash?: string }).recordHash ?? ""}`;
        if (!reparsed.has(key)) reparsed.set(key, await reparseZip(root, zip, record, context));
        return reparsed.get(key);
      },
    },
  };
}
