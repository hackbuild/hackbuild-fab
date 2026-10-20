// catalog.find --fetch kicad|seeed (M08-T14 step 1, D-103, R1-designs-reach-04):
// the one network path of the catalog. It lists one footprint library
// through tools/py/board/kicad_fetch.py (`list <repo> <query>`, a blobless
// clone cached under <workspace>/.hbf/cache/git through its
// BOARD_FORGE_CACHE variable), fetches each matching .kicad_mod, and writes
// a cache row beside it in <workspace>/.hbf/cache/catalog/modules/<id>/:
// method listing, the tier of its source, the clone's origin, the repo path
// and the commit as source, and the library licence. Nothing enters
// packages/catalog/data. The pads come from the file through the catalog's
// own KiCad resolver at load, so the row holds no number typed here. Every
// hit is fetched and parsed before any row is written: an unreadable
// commit, a clone whose origin is not the library's, a footprint the
// resolver refuses, a row the catalog row loader refuses (a pad number
// listed twice, as the Seeed XIAO DIP footprints do), or two files folding
// to one row id stops the fetch with nothing written.
//
// Sources (fab-knowledge/plan-v5/parts-sources.md sections 2 to 4): kicad
// is the official library on gitlab, which replaced the GitHub mirror
// frozen at 2020-10; seeed is Seeed-Studio/OPL_Kicad_Library. Tiers on
// fetch (section 3): a footprint from the part maker's own library is
// vendor, so a seeed row is vendor only under the Seeed Studio product
// folders (XIAO, Wio) or a root XIAO file; the OPL_* folders hold other
// makers' parts drawn by Seeed Fusion and stay community, as every KiCad
// row does. kicad_fetch.py `search` spans every repository it knows; a
// fetch lists only the library it names.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Tier } from "@hackbuild/spec";
import { KICAD_RESOLVERS, kicadModPads, loadRow, type CatalogFiles } from "@hackbuild/catalog";
import { cmdError } from "./errors.js";

/** One footprint library a fetch can name: its kicad_fetch.py repo, remote, licence and tier rule. */
export interface FetchSource {
  /** The key of kicad_fetch.py REPOS, and the clone folder name. */
  readonly repo: string;
  /** The remote the clone must report; any other origin stops the fetch. */
  readonly origin: string;
  /** What the row name and note call the library. */
  readonly library: string;
  /** SPDX id; class commit: redistribution allowed with attribution (parts-sources.md section 3). */
  readonly licence: { readonly id: string; readonly class: "commit" };
  /** The tier of a footprint at this repo path. */
  tier(file: string): Tier;
}

/** The libraries --fetch names, one implementation of each (parts-sources.md section 4 items 1 and 2). */
export const FETCH_SOURCES = {
  kicad: {
    repo: "kicad-gitlab", origin: "https://gitlab.com/kicad/libraries/kicad-footprints.git", library: "KiCad library",
    licence: { id: "CC-BY-SA-4.0", class: "commit" }, tier: () => "community",
  },
  seeed: {
    repo: "seeed", origin: "https://github.com/Seeed-Studio/OPL_Kicad_Library.git", library: "Seeed OPL KiCad library",
    licence: { id: "CC-BY-SA-4.0", class: "commit" },
    tier: (file) => (/^Seeed Studio [^/]/.test(file) || /^XIAO[^/]*$/.test(file) ? "vendor" : "community"),
  },
} as const satisfies Record<string, FetchSource>;
export type FetchSourceId = keyof typeof FETCH_SOURCES;

/** The variable kicad_fetch.py reads its clone folder (its CACHE) from. */
export const KICAD_CACHE_ENV = "BOARD_FORGE_CACHE";
/** The clone folder hbf hands kicad_fetch.py: inside the workspace, never the home cache. */
export const kicadCacheDir = (workspace: string): string => path.join(workspace, ".hbf", "cache", "git");
/** Rows written per query, at most. */
export const FETCH_LIMIT = 20;

/** Where the footprints come from: the network route, or a recorded one in tests. */
export interface KicadSource {
  /** Paths in the library whose name holds the query, as kicad_fetch.py lists them. */
  list(query: string): readonly string[];
  /** One file's bytes. */
  get(file: string): Uint8Array;
  /** The library commit the files come from, 40 hex digits. */
  commit(): string;
  /** The remote the library was cloned from. */
  origin(): string;
}

/** kicad_fetch.py through uv; `get` fetches a blob on demand from the library's remote. */
export function networkKicadSource(root: string, source: FetchSourceId = "kicad"): KicadSource {
  const { repo, origin } = FETCH_SOURCES[source];
  const script = path.join(root, "tools", "py", "board", "kicad_fetch.py");
  const clone = path.join(kicadCacheDir(root), repo);
  const env = { ...process.env, [KICAD_CACHE_ENV]: kicadCacheDir(root) };
  const run = (args: readonly string[]): string => {
    const r = spawnSync("uv", ["run", "--project", path.join(root, "tools", "py"), script, ...args], { cwd: root, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error !== undefined || r.status !== 0) {
      throw cmdError({ code: "E_KERNEL", path: "/fetch", got: (r.stderr ?? r.error?.message ?? "").trim().split("\n").slice(-1)[0] ?? "", expected: "kicad_fetch.py exit 0", hint: `kicad_fetch.py could not reach ${origin}; some sandboxes cannot reach gitlab.com or github.com, so check the network or drop --fetch to search offline`, record: "board-pcb" });
    }
    return r.stdout;
  };
  return {
    list: (q) => run(["list", repo, q]).split("\n").map((l) => l.trim()).filter((l) => l !== ""),
    get: (file) => {
      const dir = mkdtempSync(path.join(tmpdir(), "hbf-kicad-"));
      try {
        const dest = path.join(dir, path.basename(file));
        run(["get", repo, file, dest]);
        return new Uint8Array(readFileSync(dest));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    commit: () => git(clone, ["rev-parse", "HEAD"], "the library commit"),
    origin: () => git(clone, ["remote", "get-url", "origin"], "the library origin"),
  };
}

/** One git read of the clone; a read that fails stops the fetch, so no row carries an unknown source. */
function git(clone: string, args: readonly string[], what: string): string {
  const r = spawnSync("git", ["-C", clone, ...args], { encoding: "utf8" });
  if (r.error !== undefined || r.status !== 0 || r.stdout.trim() === "") {
    throw cmdError({ code: "E_KERNEL", path: "/fetch", got: (r.stderr ?? r.error?.message ?? "").trim().split("\n").slice(-1)[0] ?? "", expected: what, hint: `git could not read ${what} from ${clone}; nothing written`, record: "board-pcb" });
  }
  return r.stdout.trim();
}

/** The cache row id of a footprint: the source id, a hyphen and its name, lowercased, other characters as hyphens. */
export function fetchRowId(source: FetchSourceId, stem: string): string {
  return `${source}-${stem.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

/** The cache row id of a KiCad library footprint. */
export const kicadRowId = (stem: string): string => fetchRowId("kicad", stem);

/**
 * Fetch the footprints of one library whose file name holds the query and
 * write their cache rows. `date` is the fetch date the provenance carries
 * (YYYY-MM-DD). Returns the row ids written, in listing order.
 */
export function fetchKicadRows(workspace: string, query: string, src: KicadSource, date: string, source: FetchSourceId = "kicad"): readonly string[] {
  const lib = FETCH_SOURCES[source];
  const q = query.toLowerCase();
  const hits = src.list(query).filter((f) => f.endsWith(".kicad_mod") && path.basename(f).toLowerCase().includes(q)).slice(0, FETCH_LIMIT);
  const commit = src.commit();
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw cmdError({ code: "E_KERNEL", path: "/fetch", got: commit, expected: `the 40 hex digit commit of the ${lib.library}`, hint: "the library commit is unreadable, so no row could name its source; nothing written", record: "board-pcb" });
  }
  const origin = src.origin();
  if (origin !== lib.origin) {
    throw cmdError({ code: "E_KERNEL", path: "/fetch", got: origin, expected: lib.origin, hint: `the ${lib.repo} clone points at another remote, so its rows would name the wrong source; delete .hbf/cache/git/${lib.repo} and fetch again; nothing written`, record: "board-pcb" });
  }
  // fetch and parse every hit first: a refused footprint throws here, before any write
  const rows = hits.map((file) => {
    const stem = path.basename(file, ".kicad_mod");
    const bytes = src.get(file);
    return { file, stem, id: fetchRowId(source, stem), bytes, count: kicadModPads(new TextDecoder("utf-8").decode(bytes), file).length };
  }).filter((r) => r.count > 0);
  const byId = new Map<string, string>();
  for (const r of rows) {
    const other = byId.get(r.id);
    if (other !== undefined) {
      throw cmdError({ code: "E_SCHEMA", path: "/query", got: [other, r.file], expected: "one footprint per cache row id", hint: `${other} and ${r.file} both fold to row id ${r.id}; narrow the query to one of them; nothing written`, record: "board-pcb" });
    }
    byId.set(r.id, r.file);
  }
  // every row goes through the catalog's own row loader before any write, so
  // the cache never holds a row that would stop every later catalog read
  const written = rows.map(({ file, stem, id, bytes, count }) => {
    const row = {
      id, name: `${stem} (${lib.library} footprint)`, kind: "other",
      note: `written by catalog.find --fetch ${source}; a land pattern only, no body, from the ${lib.library}`,
      licence: { ...lib.licence },
      fields: {
        pads: {
          from: { kind: "kicad", mod: `${stem}.kicad_mod`, count },
          unit: "mm",
          provenance: { tier: lib.tier(file), method: "listing", date, source: `${origin} ${file} at ${commit}` },
        },
      },
    };
    const text = `${JSON.stringify(row, null, 1)}\n`;
    const files: CatalogFiles = new Map([[`modules/${id}/row.json`, new TextEncoder().encode(text)], [`modules/${id}/${stem}.kicad_mod`, bytes]]);
    loadRow(`modules/${id}/row.json`, files, { resolvers: KICAD_RESOLVERS });
    return { id, stem, bytes, text };
  });
  const ids: string[] = [];
  for (const { id, stem, bytes, text } of written) {
    const dir = path.join(workspace, ".hbf", "cache", "catalog", "modules", id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${stem}.kicad_mod`), bytes);
    writeFileSync(path.join(dir, "row.json"), text);
    ids.push(id);
  }
  return ids;
}
