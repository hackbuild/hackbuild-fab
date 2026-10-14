// catalog.find --fetch kicad (M08-T14 step 1, D-103): the one network path
// of the catalog. It lists the KiCad footprint mirror through
// tools/py/board/kicad_fetch.py (`list kicad-footprints <query>`, a
// blobless clone cached under <workspace>/.hbf/cache/git through its
// BOARD_FORGE_CACHE variable), fetches each matching
// .kicad_mod, and writes a cache row beside it in
// <workspace>/.hbf/cache/catalog/modules/<id>/: tier community, method
// listing, the clone's origin, the repo path and the commit as source.
// Nothing enters packages/catalog/data. The pads come from the file through
// the catalog's own KiCad resolver at load, so the row holds no number
// typed here. Every hit is fetched and parsed before any row is written: an
// unreadable commit, a footprint the resolver refuses, or two files folding
// to one row id stops the fetch with nothing written.
//
// kicad_fetch.py `search` spans eight repositories, vendor libraries among
// them; `--fetch kicad` names the KiCad libraries, so it lists the KiCad
// mirror alone (card defect, M08-T14).

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { kicadModPads } from "@hackbuild/catalog";
import { cmdError } from "./errors.js";

/** The mirror --fetch kicad lists; frozen at 2020-10 (kicad_fetch.py registry notes). */
export const KICAD_REPO = "kicad-footprints";
/** The variable kicad_fetch.py reads its clone folder (its CACHE) from. */
export const KICAD_CACHE_ENV = "BOARD_FORGE_CACHE";
/** The clone folder hbf hands kicad_fetch.py: inside the workspace, never the home cache. */
export const kicadCacheDir = (workspace: string): string => path.join(workspace, ".hbf", "cache", "git");
/** The blobless clone kicad_fetch.py keeps under that folder. */
const kicadClone = (cache: string): string => path.join(cache, KICAD_REPO);
/** Rows written per query, at most. */
export const FETCH_LIMIT = 20;

/** Where the footprints come from: the network route, or a recorded one in tests. */
export interface KicadSource {
  /** Paths in the mirror whose name holds the query, as kicad_fetch.py lists them. */
  list(query: string): readonly string[];
  /** One file's bytes. */
  get(file: string): Uint8Array;
  /** The mirror commit the files come from, 40 hex digits. */
  commit(): string;
  /** The remote the mirror was cloned from. */
  origin(): string;
}

/** kicad_fetch.py through uv; `get` fetches a blob on demand from GitHub. */
export function networkKicadSource(root: string): KicadSource {
  const script = path.join(root, "tools", "py", "board", "kicad_fetch.py");
  const cache = kicadCacheDir(root);
  const env = { ...process.env, [KICAD_CACHE_ENV]: cache };
  const run = (args: readonly string[]): string => {
    const r = spawnSync("uv", ["run", "--project", path.join(root, "tools", "py"), script, ...args], { cwd: root, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error !== undefined || r.status !== 0) {
      throw cmdError({ code: "E_KERNEL", path: "/fetch", got: (r.stderr ?? r.error?.message ?? "").trim().split("\n").slice(-1)[0] ?? "", expected: "kicad_fetch.py exit 0", hint: "kicad_fetch.py could not reach the KiCad mirror; check the network or drop --fetch to search offline", record: "board-pcb" });
    }
    return r.stdout;
  };
  return {
    list: (q) => run(["list", KICAD_REPO, q]).split("\n").map((l) => l.trim()).filter((l) => l !== ""),
    get: (file) => {
      const dir = mkdtempSync(path.join(tmpdir(), "hbf-kicad-"));
      try {
        const dest = path.join(dir, path.basename(file));
        run(["get", KICAD_REPO, file, dest]);
        return new Uint8Array(readFileSync(dest));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    commit: () => git(cache, ["rev-parse", "HEAD"], "the mirror commit"),
    origin: () => git(cache, ["remote", "get-url", "origin"], "the mirror origin"),
  };
}

/** One git read of the clone; a read that fails stops the fetch, so no row carries an unknown source. */
function git(cache: string, args: readonly string[], what: string): string {
  const r = spawnSync("git", ["-C", kicadClone(cache), ...args], { encoding: "utf8" });
  if (r.error !== undefined || r.status !== 0 || r.stdout.trim() === "") {
    throw cmdError({ code: "E_KERNEL", path: "/fetch", got: (r.stderr ?? r.error?.message ?? "").trim().split("\n").slice(-1)[0] ?? "", expected: what, hint: `git could not read ${what} from ${kicadClone(cache)}; nothing written`, record: "board-pcb" });
  }
  return r.stdout.trim();
}

/** The cache row id of a footprint: "kicad-" and its name, lowercased, other characters as hyphens. */
export function kicadRowId(stem: string): string {
  return `kicad-${stem.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

/**
 * Fetch the footprints whose file name holds the query and write their cache
 * rows. `date` is the fetch date the provenance carries (YYYY-MM-DD).
 * Returns the row ids written, in listing order.
 */
export function fetchKicadRows(workspace: string, query: string, src: KicadSource, date: string): readonly string[] {
  const q = query.toLowerCase();
  const hits = src.list(query).filter((f) => f.endsWith(".kicad_mod") && path.basename(f).toLowerCase().includes(q)).slice(0, FETCH_LIMIT);
  const commit = src.commit();
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw cmdError({ code: "E_KERNEL", path: "/fetch", got: commit, expected: "the 40 hex digit commit of the KiCad mirror", hint: "the mirror commit is unreadable, so no row could name its source; nothing written", record: "board-pcb" });
  }
  const origin = src.origin();
  // fetch and parse every hit first: a refused footprint throws here, before any write
  const rows = hits.map((file) => {
    const stem = path.basename(file, ".kicad_mod");
    const bytes = src.get(file);
    return { file, stem, id: kicadRowId(stem), bytes, count: kicadModPads(new TextDecoder("utf-8").decode(bytes), file).length };
  }).filter((r) => r.count > 0);
  const byId = new Map<string, string>();
  for (const r of rows) {
    const other = byId.get(r.id);
    if (other !== undefined) {
      throw cmdError({ code: "E_SCHEMA", path: "/query", got: [other, r.file], expected: "one footprint per cache row id", hint: `${other} and ${r.file} both fold to row id ${r.id}; narrow the query to one of them; nothing written`, record: "board-pcb" });
    }
    byId.set(r.id, r.file);
  }
  const ids: string[] = [];
  for (const { file, stem, id, bytes, count } of rows) {
    const dir = path.join(workspace, ".hbf", "cache", "catalog", "modules", id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${stem}.kicad_mod`), bytes);
    const row = {
      id, name: `${stem} (KiCad library footprint)`, kind: "other",
      note: "written by catalog.find --fetch kicad; a land pattern only, no body, from the KiCad v5 mirror frozen at 2020-10",
      fields: {
        pads: {
          from: { kind: "kicad", mod: `${stem}.kicad_mod`, count },
          unit: "mm",
          provenance: { tier: "community", method: "listing", date, source: `${origin} ${file} at ${commit}` },
        },
      },
    };
    writeFileSync(path.join(dir, "row.json"), `${JSON.stringify(row, null, 1)}\n`);
    ids.push(id);
  }
  return ids;
}
