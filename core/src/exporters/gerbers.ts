// Exporter binding gerbers (M08-T14 step 3, M08-T07 step 8): the fab zip
// the direct generator wrote, Gerber layers and Excellon, with
// gerber-front.png and gerber-back.png drawn from the parsed gerber objects
// only (tools/py/board/render_parsed.py), so the person who approves sees
// what the fab will image. A fabrication exporter: provenance gate, board
// checks, the person, then CHK-BRD-01 reads the written zip back.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readEntries } from "@hackbuild/3mf";
import { fabZip, type BoardBuilt } from "../board.js";
import { cmdError } from "../errors.js";
import type { BoardExporter, BoardFile } from "./board-exporter.js";

/** The parsed-gerber pictures render_parsed.py writes. */
export const GERBER_PNGS = ["gerber-front.png", "gerber-back.png"] as const;

/** Render the zip's layers from their parsed objects into dir; returns the two PNG paths. */
export async function renderParsed(root: string, zip: Uint8Array, dir: string): Promise<string[]> {
  const fab = path.join(dir, "fab");
  rmSync(fab, { recursive: true, force: true });
  mkdirSync(fab, { recursive: true });
  const entries = await readEntries(zip);
  for (const [n, b] of Object.entries(entries)) if (n.endsWith(".gbr") || n.endsWith(".drl")) writeFileSync(path.join(fab, path.basename(n)), b);
  const r = spawnSync("uv", ["run", "--project", path.join(root, "tools", "py"), path.join(root, "tools", "py", "board", "render_parsed.py"), fab, "--out", dir], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  rmSync(fab, { recursive: true, force: true });
  const out = GERBER_PNGS.map((n) => path.join(dir, n));
  if (r.status !== 0 || !out.every((p) => existsSync(p))) {
    throw cmdError({ code: "E_KERNEL", path: "/kind", got: (r.stderr ?? "").trim().split("\n").slice(-1)[0] ?? `exit ${String(r.status)}`, expected: "gerber-front.png and gerber-back.png", hint: "tools/py/board/render_parsed.py did not draw the parsed layers; run it on the fab folder to see why", record: "board-pcb" });
  }
  return out;
}

export const gerbersExporter: BoardExporter = {
  id: "gerbers", version: "1.0.0", fabrication: true, processes: ["pcb"], mediaType: "application/zip", ext: "zip",
  postWrite: ["CHK-BRD-01"],
  files: (built: BoardBuilt) => {
    const zip = fabZip(built.files);
    if (zip === undefined) throw cmdError({ code: "E_KERNEL", path: "/kind", got: "gerbers", expected: "a fab zip from the generator", hint: `${built.design.chase.meta.id}: the generator wrote no .zip`, record: "board-pcb" });
    const render = path.join(built.outDir, "render");
    const pngs: BoardFile[] = GERBER_PNGS.filter((n) => existsSync(path.join(render, n)))
      .map((n) => ({ name: n, bytes: new Uint8Array(readFileSync(path.join(render, n))), kind: "png", mediaType: "image/png" }));
    return [{ name: zip.name, bytes: zip.bytes, kind: "gerbers", mediaType: "application/zip" }, ...pngs];
  },
};
